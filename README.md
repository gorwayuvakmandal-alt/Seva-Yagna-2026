# Seva Yagna 2026 — Yuvak Attendance Portal

A mobile-first Next.js App Router / Supabase starter with the exact VD-1, VD-2, VD-3 -> 22 Mandal mapping, authenticated volunteer check-ins, multi-device duplicate check-in prevention, and dashboard + CSV export.

## Setup (approximately 10 steps, one-time)

1. Install Node.js 20.9+ and open this folder in VS Code.
2. Run `npm install`.
3. Create a fresh Supabase project: https://supabase.com/dashboard.
4. Open **SQL Editor** in Supabase. Paste and run `supabase/schema.sql` ONCE. This creates the 22 Mandals, views, function, row-level security, etc.
5. Open **Project Settings / Connect** and copy **Project URL** and **Publishable key**.
6. Copy `.env.example` to `.env.local`; replace placeholders with your own Supabase values.
7. In Supabase **Authentication > Providers > Email**, disable public email signups. In **Authentication > Users**, create a user account (email + password) for each volunteer/admin. Admins should not share one password.
8. Use SQL Editor to authorize each user. Replace UUID with the real ID from Authentication > Users:
   ```sql
   insert into public.app_users(user_id,role,display_name)
   values ('REPLACE-WITH-USER-UUID','admin','Event Administrator');
   ```
   For another volunteer choose role `volunteer`.
9. Run `npm run dev`. Open http://localhost:3000, sign in, and try the Attendance and Dashboard routes.
10. To deploy, push to a Git repository, import it into Vercel, add the two `.env.local` values as Vercel environment variables, and deploy. Never put a Supabase secret/service-role key in frontend code.

## URL pages

- `/login` — volunteer login
- `/attendance` — dependent Xetra > Mandal selection, name matching, attendance; successful submission clears fields and focuses Xetra
- `/dashboard` — total, VD, Mandal counts and target percentages; refreshes every 10 seconds and exports CSV

## Business rules

- **3 Xetras / 22 Mandals**: 7 VD-1, 8 VD-2, 7 VD-3.
- **Shared attendance**: all users insert records in one Supabase PostgreSQL database.
- **Atomic submission**: an authenticated PostgreSQL function creates an on-site registration (if needed) and attendance in a single transaction.
- **Duplicates**: attendance has a UNIQUE `(event_id, registration_id)` constraint. Postgres `ON CONFLICT ... DO NOTHING` ensures even concurrent clicks can't add a second attendance for the same known person.
- **Matching**: when a volunteer types a name and selects a match, the specific registered record is marked. With no selected match, the function attempts to find exactly one normalized name in that Mandal, or creates an on-site registration. If multiple identical names exist, the volunteer MUST select the right record. Identical-name people with no preexisting distinct registration will need an admin-created separate record or a new unique identifier flow (recommended: per-person registration ID). Names alone are NOT a guaranteed unique identity.
- **Operator audit**: `attendance.marked_by` points to Supabase Auth user; `checked_in_at` is recorded in the database.
- **Single event**: code is presently configured for `seva-yagna-2026`. For a new event, add a new event and adjust the fixed EVENT_ID.

## PDF / roster import — IMPORTANT

The PDF referred to in the event requirements has NOT been provided with this starter. No registration totals or person-level rows have been invented.

There are **two legitimate import cases**:

### A. PDF contains Mandal-level total registrations only

Enter actual totals in `registered_targets` for each Mandal (Supabase Table Editor or SQL):

```sql
insert into public.registered_targets(event_id,mandal_id,registered_count)
values ('seva-yagna-2026','gorwa',45) -- EXAMPLE ONLY; replace 45
on conflict (event_id,mandal_id) do update
  set registered_count = excluded.registered_count;
```

This yields **Present / PDF-registered target x 100**. It does not establish which attendees were on the original roster, so the percentage is **attendance versus target**, not a verified registered-person turnout percentage. It may exceed 100% because walk-ins are included.

### B. PDF has a per-person registered Yuvak list

Convert it to a CSV with columns:

```
event_id,mandal_id,full_name,source,import_ref
seva-yagna-2026,gorwa,Example Yuvak,pre_registered,PDF-001
```

Import into `registrations` in Supabase Table Editor with `source=pre_registered`. `name_key` is generated automatically. For important distinctions (same full name/Mandal), give different `import_ref` values and make volunteers select the correct record during attendance. `import_ref` must be unique within each event.

If both an aggregate target and individual roster are available, the database uses the aggregate target as the denominator and preserves the individual roster for matching.

## Security and production limitations

- Only accounts placed in `app_users` by an administrator can read data or mark attendance.
- PostgreSQL RLS blocks unauthenticated data access; the write RPC checks membership server-side. Imported admin data is entered via Supabase SQL Editor or another **administrator-only** workflow, not the public browser.
- No open public signup. Enable HTTPS (Vercel does so for deployed domains).
- The dashboard uses 10-second polling: near-real-time, not a push subscription. Supabase Realtime is an optional future enhancement.
- This is an **MVP starter**, not a claim of a fully audited production launch. Test concurrent check-in from multiple devices, login/session refresh, RLS policies, data imports, backups, mobile focus behavior, and offline/network loss before event day.
- Corrections, merging records, edit audit logs, and person-ID disambiguation should be built as an admin-only module before high-volume production use.
- There is no offline queuing; ensure reliable network at registration desks. Volunteers should retry only after checking the result when a request times out.
- Avoid collecting unnecessary personal information; restrict who can export name-level data.

## SQL CSV export of attendance (admin-only in SQL Editor)

```sql
select s.id as xetra, m.name as mandal, r.full_name, r.source,
       a.checked_in_at, u.display_name as marked_by
from public.attendance a
join public.registrations r on r.id = a.registration_id
join public.mandals m on m.id = r.mandal_id
join public.sectors s on s.id = m.sector_id
left join public.app_users u on u.user_id = a.marked_by
where a.event_id = 'seva-yagna-2026'
order by a.checked_in_at desc;
```

## Docs

- Next.js: https://nextjs.org/docs/app
- Supabase SSR: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
