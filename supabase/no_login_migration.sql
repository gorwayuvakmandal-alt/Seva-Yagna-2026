-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/zmxavtuykytrvisotxwm/sql/new
-- This removes login requirements, enables anonymous check-ins, and makes the dashboard open.

-- 1. Make marked_by optional in attendance (since volunteers are not logged in)
alter table public.attendance alter column marked_by drop not null;

-- 2. Update check_in_yuvak function to allow public/anonymous execution
create or replace function public.check_in_yuvak(
  p_event_id text,
  p_sector_id text,
  p_mandal_id text,
  p_full_name text,
  p_registration_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_key text;
  v_reg_id uuid;
  v_attendance_id uuid;
  v_display_name text;
  v_matches integer;
begin
  if not exists (select 1 from public.events where id = p_event_id) then
    raise exception 'Invalid event';
  end if;

  if not exists (
    select 1 from public.mandals m where m.id = p_mandal_id and m.sector_id = p_sector_id
  ) then
    raise exception 'Invalid Xetra/Mandal combination';
  end if;

  if p_full_name is null or char_length(btrim(p_full_name)) not between 2 and 120 then
    raise exception 'Invalid Yuvak name';
  end if;

  v_key := lower(regexp_replace(btrim(p_full_name), '[[:space:]]+', ' ', 'g'));

  if p_registration_id is not null then
    select id, full_name into v_reg_id, v_display_name
      from public.registrations
      where id = p_registration_id and event_id = p_event_id and mandal_id = p_mandal_id;
    if v_reg_id is null then raise exception 'Selected registration does not belong to this Mandal'; end if;
  else
    perform pg_advisory_xact_lock(hashtext(p_event_id), hashtext(p_mandal_id || ':' || v_key));
    select count(*) into v_matches
      from public.registrations
      where event_id = p_event_id and mandal_id = p_mandal_id and name_key = v_key;
    if v_matches > 1 then
      raise exception 'Multiple records share this name; select the correct registration';
    elsif v_matches = 1 then
      select id, full_name into v_reg_id, v_display_name
        from public.registrations
        where event_id = p_event_id and mandal_id = p_mandal_id and name_key = v_key;
    else
      insert into public.registrations(event_id, mandal_id, full_name, source, created_by)
        values (p_event_id, p_mandal_id, btrim(p_full_name), 'walk_in', (select auth.uid()))
        returning id, full_name into v_reg_id, v_display_name;
    end if;
  end if;

  insert into public.attendance(event_id, registration_id, marked_by)
    values (p_event_id, v_reg_id, (select auth.uid()))
    on conflict on constraint attendance_event_registration_unique do nothing
    returning id into v_attendance_id;

  if v_attendance_id is null then
    return jsonb_build_object('status', 'already_marked', 'name', v_display_name);
  end if;

  return jsonb_build_object('status', 'saved', 'name', v_display_name);
end;
$$;

-- 3. Grant execute to public and anon
grant execute on function public.check_in_yuvak(text, text, text, text, uuid) to anon, authenticated, service_role;

-- 4. Recreate dashboard view to allow open access
create or replace view public.mandal_dashboard with (security_invoker = false) as
with prereg as (
  select event_id, mandal_id, count(*)::integer as registered_count
  from public.registrations
  where source = 'pre_registered'
  group by event_id, mandal_id
), attended as (
  select r.event_id, r.mandal_id,
    count(a.id)::integer as present_total,
    count(a.id) filter (where r.source = 'pre_registered')::integer as registered_present,
    count(a.id) filter (where r.source = 'walk_in')::integer as walk_in_present
  from public.registrations r
  join public.attendance a on a.registration_id = r.id and a.event_id = r.event_id
  group by r.event_id, r.mandal_id
)
select
  e.id as event_id,
  m.sector_id,
  m.id as mandal_id,
  m.name as mandal_name,
  coalesce(t.registered_count, p.registered_count, 0) as registered_total,
  coalesce(a.present_total, 0) as present_total,
  coalesce(a.registered_present, 0) as registered_present,
  coalesce(a.walk_in_present, 0) as walk_in_present,
  case when coalesce(t.registered_count, p.registered_count, 0) > 0
    then round(coalesce(a.present_total, 0)::numeric * 100 / coalesce(t.registered_count, p.registered_count, 0), 1)
    else 0::numeric end as attendance_pct
from public.events e cross join public.mandals m
left join public.registered_targets t on t.event_id = e.id and t.mandal_id = m.id
left join prereg p on p.event_id = e.id and p.mandal_id = m.id
left join attended a on a.event_id = e.id and a.mandal_id = m.id;

-- 5. Open select permissions for dashboard and registrations lookup
grant select on public.events, public.sectors, public.mandals, public.registrations, public.attendance, public.registered_targets, public.mandal_dashboard to anon, authenticated;

-- 6. Add open read policies for registrations lookup
drop policy if exists "allow anon read registrations" on public.registrations;
create policy "allow anon read registrations" on public.registrations for select to anon using (true);

drop policy if exists "allow anon read attendance" on public.attendance;
create policy "allow anon read attendance" on public.attendance for select to anon using (true);

drop policy if exists "allow anon read targets" on public.registered_targets;
create policy "allow anon read targets" on public.registered_targets for select to anon using (true);
