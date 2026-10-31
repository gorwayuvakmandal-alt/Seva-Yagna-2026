-- Seva Yagna 2026: Run this full script in a new Supabase project's SQL Editor.
-- Do NOT expose a service-role / secret key to the browser.

create extension if not exists pgcrypto;

create table if not exists public.events (
  id text primary key,
  name text not null
);

create table if not exists public.sectors (
  id text primary key check (id in ('VD-1', 'VD-2', 'VD-3'))
);

create table if not exists public.mandals (
  id text primary key,
  sector_id text not null references public.sectors(id),
  name text not null,
  unique (sector_id, name),
  unique (id, sector_id)
);

create table if not exists public.app_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'volunteer')),
  display_name text not null default 'Volunteer'
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id),
  mandal_id text not null references public.mandals(id),
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  name_key text generated always as (lower(regexp_replace(btrim(full_name), '[[:space:]]+', ' ', 'g'))) stored,
  source text not null check (source in ('pre_registered', 'walk_in')),
  import_ref text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (id, event_id)
);
create unique index if not exists registration_import_unique
  on public.registrations(event_id, import_ref) where import_ref is not null;
create index if not exists registrations_lookup_idx on public.registrations(event_id, mandal_id, name_key);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id),
  registration_id uuid not null,
  marked_by uuid not null references auth.users(id),
  checked_in_at timestamptz not null default now(),
  constraint attendance_registration_event_fk foreign key (registration_id, event_id)
    references public.registrations(id, event_id),
  constraint attendance_event_registration_unique unique (event_id, registration_id)
);
create index if not exists attendance_checked_in_idx on public.attendance(event_id, checked_in_at desc);

-- A PDF might contain only aggregated registered counts, not the names.
-- Store that authoritative denominator separately so dashboard doesn't assume roster completeness.
create table if not exists public.registered_targets (
  event_id text not null references public.events(id),
  mandal_id text not null references public.mandals(id),
  registered_count integer not null check (registered_count >= 0),
  primary key (event_id, mandal_id)
);

insert into public.events(id, name) values ('seva-yagna-2026', 'Seva Yagna 2026') on conflict (id) do nothing;
insert into public.sectors(id) values ('VD-1'),('VD-2'),('VD-3') on conflict (id) do nothing;
insert into public.mandals(id,sector_id,name) values
 ('atladara','VD-1','Atladara'),
 ('niramay','VD-1','Niramay'),
 ('narayanwadi','VD-1','Narayanwadi'),
 ('pramukhswaminagar','VD-1','Pramukhswaminagar'),
 ('racecourse','VD-1','Racecourse'),
 ('samta','VD-1','Samta'),
 ('vadsar','VD-1','Vadsar'),
 ('danteshwar','VD-2','Danteshwar'),
 ('indrapuri','VD-2','Indrapuri'),
 ('makarpura','VD-2','Makarpura'),
 ('maneja','VD-2','Maneja'),
 ('manjalpur','VD-2','Manjalpur'),
 ('shiyabaug','VD-2','Shiyabaug'),
 ('tarsali','VD-2','Tarsali'),
 ('wadi','VD-2','Wadi'),
 ('chhani-gam','VD-3','Chhani Gam'),
 ('chhani-jakatnaka','VD-3','Chhani Jakatnaka'),
 ('gorwa','VD-3','Gorwa'),
 ('gotri','VD-3','Gotri'),
 ('karelibaug','VD-3','Karelibaug'),
 ('sama','VD-3','Sama'),
 ('sardarnagar','VD-3','Sardarnagar')
on conflict (id) do nothing;

-- RLS is intentionally deny-by-default. Volunteers can read only after an admin creates app_users membership.
alter table public.events enable row level security;
alter table public.sectors enable row level security;
alter table public.mandals enable row level security;
alter table public.app_users enable row level security;
alter table public.registrations enable row level security;
alter table public.attendance enable row level security;
alter table public.registered_targets enable row level security;

create policy "read self" on public.app_users for select to authenticated
 using (user_id = (select auth.uid()));
create policy "read events" on public.events for select to authenticated
 using (exists(select 1 from public.app_users u where u.user_id = (select auth.uid())));
create policy "read sectors" on public.sectors for select to authenticated
 using (exists(select 1 from public.app_users u where u.user_id = (select auth.uid())));
create policy "read mandals" on public.mandals for select to authenticated
 using (exists(select 1 from public.app_users u where u.user_id = (select auth.uid())));
create policy "read registrations" on public.registrations for select to authenticated
 using (exists(select 1 from public.app_users u where u.user_id = (select auth.uid())));
create policy "read attendance" on public.attendance for select to authenticated
 using (exists(select 1 from public.app_users u where u.user_id = (select auth.uid())));
create policy "read registered targets" on public.registered_targets for select to authenticated
 using (exists(select 1 from public.app_users u where u.user_id = (select auth.uid())));

-- Writes are done through the one atomic, authenticated function below.
-- Prevent direct writes from browser clients, even authenticated ones.
revoke all on public.registrations, public.attendance, public.registered_targets from anon, authenticated;
grant select on public.registrations, public.attendance, public.registered_targets to authenticated;
grant select on public.events, public.sectors, public.mandals, public.app_users to authenticated;

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
set search_path = ''
as $$
declare
  v_key text;
  v_reg_id uuid;
  v_attendance_id uuid;
  v_display_name text;
  v_matches integer;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.app_users u where u.user_id = (select auth.uid())
  ) then
    raise exception 'Not authorized';
  end if;
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
    -- Serialize simultaneous on-site check-ins for the same normalized name/Mandal.
    -- Distinct people with IDENTICAL names must be explicitly disambiguated by an admin.
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
      insert into public.registrations(event_id,mandal_id,full_name,source,created_by)
        values (p_event_id,p_mandal_id,btrim(p_full_name),'walk_in',(select auth.uid()))
        returning id, full_name into v_reg_id,v_display_name;
    end if;
  end if;

  insert into public.attendance(event_id,registration_id,marked_by)
    values (p_event_id,v_reg_id,(select auth.uid()))
    on conflict on constraint attendance_event_registration_unique do nothing
    returning id into v_attendance_id;

  if v_attendance_id is null then
    return jsonb_build_object('status','already_marked','name',v_display_name);
  end if;
  return jsonb_build_object('status','saved','name',v_display_name);
end;
$$;
revoke all on function public.check_in_yuvak(text,text,text,text,uuid) from public, anon;
grant execute on function public.check_in_yuvak(text,text,text,text,uuid) to authenticated;

-- Mandal dashboard uses an independently imported PDF target when available,
-- otherwise counts imported individual pre-registered records.
create or replace view public.mandal_dashboard with (security_invoker = true) as
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
  coalesce(a.present_total,0) as present_total,
  coalesce(a.registered_present,0) as registered_present,
  coalesce(a.walk_in_present,0) as walk_in_present,
  case when coalesce(t.registered_count,p.registered_count,0) > 0
    then round(coalesce(a.present_total,0)::numeric * 100 / coalesce(t.registered_count,p.registered_count,0),1)
    else 0::numeric end as attendance_pct
from public.events e cross join public.mandals m
left join public.registered_targets t on t.event_id = e.id and t.mandal_id = m.id
left join prereg p on p.event_id = e.id and p.mandal_id = m.id
left join attended a on a.event_id = e.id and a.mandal_id = m.id;

grant select on public.mandal_dashboard to authenticated;

-- CREATE VOLUNTEERS AFTER ADDING USERS UNDER Supabase > Authentication > Users.
-- Replace this UUID with the real Supabase Auth user ID:
-- insert into public.app_users(user_id,role,display_name)
-- values ('00000000-0000-0000-0000-000000000000','admin','Event Administrator');
-- 
-- Example PDF TOTAL for Gorwa (replace 45 with the REAL number):
-- insert into public.registered_targets(event_id,mandal_id,registered_count)
-- values ('seva-yagna-2026','gorwa',45)
-- on conflict (event_id,mandal_id) do update set registered_count = excluded.registered_count;
--
-- Example imported pre-registered PERSON (optional, if the PDF has person-level names):
-- insert into public.registrations(event_id,mandal_id,full_name,source,import_ref)
-- values ('seva-yagna-2026','gorwa','Example Yuvak','pre_registered','PDF-001');
