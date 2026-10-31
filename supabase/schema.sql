-- ==============================================================================
-- Seva Yagna 2026: Master Clean Schema (NO LOGIN / DUPLICATE NAMES ALLOWED)
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/bwziidianucpfxmwyxgo/sql/new
-- ==============================================================================

create extension if not exists pgcrypto;

-- 1. Core Tables
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

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id),
  mandal_id text not null references public.mandals(id),
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  name_key text generated always as (lower(regexp_replace(btrim(full_name), '[[:space:]]+', ' ', 'g'))) stored,
  source text not null check (source in ('pre_registered', 'walk_in')),
  import_ref text,
  created_at timestamptz not null default now(),
  unique (id, event_id)
);
create index if not exists registrations_lookup_idx on public.registrations(event_id, mandal_id, name_key);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id),
  registration_id uuid not null,
  checked_in_at timestamptz not null default now(),
  constraint attendance_registration_event_fk foreign key (registration_id, event_id) references public.registrations(id, event_id) on delete cascade
);
create index if not exists attendance_checked_in_idx on public.attendance(event_id, checked_in_at desc);

-- 2. DISABLE RLS ON ALL TABLES (completely unrestricted, no login needed)
alter table public.events disable row level security;
alter table public.sectors disable row level security;
alter table public.mandals disable row level security;
alter table public.registrations disable row level security;
alter table public.attendance disable row level security;

-- 3. Seed Sectors and 22 Mandals
insert into public.events(id, name) values ('seva-yagna-2026', 'Seva Yagna 2026') on conflict (id) do nothing;
insert into public.sectors(id) values ('VD-1'),('VD-2'),('VD-3') on conflict (id) do nothing;

insert into public.mandals(id, sector_id, name) values
  ('atladara', 'VD-1', 'Atladara'),
  ('niramay', 'VD-1', 'Niramay'),
  ('narayanwadi', 'VD-1', 'Narayanwadi'),
  ('pramukhswaminagar', 'VD-1', 'Pramukhswaminagar'),
  ('racecourse', 'VD-1', 'Racecourse'),
  ('samta', 'VD-1', 'Samta'),
  ('vadsar', 'VD-1', 'Vadsar'),
  ('danteshwar', 'VD-2', 'Danteshwar'),
  ('indrapuri', 'VD-2', 'Indrapuri'),
  ('makarpura', 'VD-2', 'Makarpura'),
  ('maneja', 'VD-2', 'Maneja'),
  ('manjalpur', 'VD-2', 'Manjalpur'),
  ('shiyabaug', 'VD-2', 'Shiyabaug'),
  ('tarsali', 'VD-2', 'Tarsali'),
  ('wadi', 'VD-2', 'Wadi'),
  ('chhani-gam', 'VD-3', 'Chhani Gam'),
  ('chhani-jakatnaka', 'VD-3', 'Chhani Jakatnaka'),
  ('gorwa', 'VD-3', 'Gorwa'),
  ('gotri', 'VD-3', 'Gotri'),
  ('karelibaug', 'VD-3', 'Karelibaug'),
  ('sama', 'VD-3', 'Sama'),
  ('sardarnagar', 'VD-3', 'Sardarnagar')
on conflict (id) do nothing;

-- 4. Check-in function (Allows duplicate names - every submission is recorded!)
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
  v_reg_id uuid;
  v_attendance_id uuid;
  v_display_name text := btrim(p_full_name);
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

  -- Always create a new registration so duplicate names are cleanly allowed
  insert into public.registrations(event_id, mandal_id, full_name, source)
    values (p_event_id, p_mandal_id, v_display_name, 'walk_in')
    returning id into v_reg_id;

  -- Record attendance for this Yuvak
  insert into public.attendance(event_id, registration_id)
    values (p_event_id, v_reg_id)
    returning id into v_attendance_id;

  return jsonb_build_object('status', 'saved', 'name', v_display_name);
end;
$$;

-- 5. Dashboard View
drop view if exists public.mandal_dashboard cascade;
create view public.mandal_dashboard as
with attended as (
  select r.event_id, r.mandal_id,
    count(a.id)::integer as present_total
  from public.registrations r
  join public.attendance a on a.registration_id = r.id and a.event_id = r.event_id
  group by r.event_id, r.mandal_id
)
select
  e.id as event_id,
  m.sector_id,
  m.id as mandal_id,
  m.name as mandal_name,
  coalesce(a.present_total, 0) as present_total
from public.events e cross join public.mandals m
left join attended a on a.event_id = e.id and a.mandal_id = m.id;

-- 6. Grants
grant usage on schema public to anon, authenticated;
grant select, insert, update on all tables in schema public to anon, authenticated;
grant select on public.mandal_dashboard to anon, authenticated;
grant execute on function public.check_in_yuvak(text, text, text, text, uuid) to anon, authenticated;
