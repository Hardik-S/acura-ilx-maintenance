begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  preferences jsonb not null default '{}'::jsonb,
  force_password_change boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_preferences_object check (jsonb_typeof(preferences) = 'object')
);

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  granted_by uuid references public.profiles (id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, force_password_change)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    true
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.enforce_profile_preferences_update()
returns trigger
language plpgsql
as $$
declare
  jwt_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
begin
  if jwt_role = 'service_role' or auth.role() = 'service_role' then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if old.id = auth.uid()
     and new.id = old.id
     and new.email is not distinct from old.email
     and new.force_password_change is not distinct from old.force_password_change
     and new.created_at = old.created_at then
    return new;
  end if;

  raise exception 'Only display name and preferences may be updated by the profile owner.';
end;
$$;

create table if not exists public.vehicles (
  id text primary key,
  year integer not null check (year between 1900 and 2100),
  make text not null,
  model text not null,
  nickname text not null,
  odometer_unit text not null check (odometer_unit in ('UNKNOWN', 'MI', 'KM')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.import_batches (
  id text primary key,
  source_filename text not null,
  source_file_hash text not null unique,
  imported_at timestamptz not null default now(),
  status text not null check (status in ('SUCCESS', 'WARNING', 'FAILED')),
  summary text not null
);

create table if not exists public.source_rows (
  id text primary key,
  import_batch_id text not null references public.import_batches (id) on delete cascade,
  sheet_name text not null,
  row_number integer not null check (row_number > 0),
  row_type text not null check (row_type in ('MAINTENANCE_ITEM', 'TORQUE_SPEC')),
  raw_date text not null default '',
  raw_service_item text not null default '',
  raw_odometer text not null default '',
  raw_notes text not null default '',
  raw_torque_component text not null default '',
  raw_torque_spec text not null default '',
  carried_forward_date text not null default '',
  parsed_odometer integer,
  parse_warnings text[] not null default '{}'
);

create table if not exists public.service_events (
  id text primary key,
  vehicle_id text not null references public.vehicles (id) on delete cascade,
  service_date date not null,
  odometer integer not null check (odometer >= 0),
  summary text not null,
  source_batch_id text references public.import_batches (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_items (
  id text primary key,
  service_event_id text not null references public.service_events (id) on delete cascade,
  description text not null,
  notes text not null default '',
  sort_order integer not null default 0 check (sort_order >= 0),
  source_row_id text references public.source_rows (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.torque_specs (
  id text primary key,
  vehicle_id text not null references public.vehicles (id) on delete cascade,
  component text not null,
  spec text not null,
  notes text not null default '',
  source_row_id text references public.source_rows (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.codex_issue_requests (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references public.profiles (id) on delete cascade,
  submitted_by_email text not null,
  area text not null,
  request text not null,
  expected_outcome text not null,
  context text not null default '',
  urgency text not null default 'normal' check (urgency in ('low', 'normal', 'high')),
  status text not null default 'open' check (status in ('open', 'triaged', 'planned', 'closed')),
  github_issue_number integer,
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_user_roles_role on public.user_roles (role);
create index if not exists idx_service_events_vehicle_id on public.service_events (vehicle_id);
create index if not exists idx_service_items_event_id on public.service_items (service_event_id);
create index if not exists idx_torque_specs_vehicle_id on public.torque_specs (vehicle_id);
create index if not exists idx_source_rows_batch_id on public.source_rows (import_batch_id);
create index if not exists idx_codex_issue_requests_submitted_by on public.codex_issue_requests (submitted_by);
create index if not exists idx_codex_issue_requests_status on public.codex_issue_requests (status);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists enforce_profiles_update_scope on public.profiles;
create trigger enforce_profiles_update_scope
before update on public.profiles
for each row execute function public.enforce_profile_preferences_update();

drop trigger if exists set_vehicles_updated_at on public.vehicles;
create trigger set_vehicles_updated_at
before update on public.vehicles
for each row execute function public.set_updated_at();

drop trigger if exists set_service_events_updated_at on public.service_events;
create trigger set_service_events_updated_at
before update on public.service_events
for each row execute function public.set_updated_at();

drop trigger if exists set_service_items_updated_at on public.service_items;
create trigger set_service_items_updated_at
before update on public.service_items
for each row execute function public.set_updated_at();

drop trigger if exists set_torque_specs_updated_at on public.torque_specs;
create trigger set_torque_specs_updated_at
before update on public.torque_specs
for each row execute function public.set_updated_at();

drop trigger if exists set_codex_issue_requests_updated_at on public.codex_issue_requests;
create trigger set_codex_issue_requests_updated_at
before update on public.codex_issue_requests
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.vehicles enable row level security;
alter table public.import_batches enable row level security;
alter table public.source_rows enable row level security;
alter table public.service_events enable row level security;
alter table public.service_items enable row level security;
alter table public.torque_specs enable row level security;
alter table public.codex_issue_requests enable row level security;

alter table public.profiles force row level security;
alter table public.user_roles force row level security;
alter table public.vehicles force row level security;
alter table public.import_batches force row level security;
alter table public.source_rows force row level security;
alter table public.service_events force row level security;
alter table public.service_items force row level security;
alter table public.torque_specs force row level security;
alter table public.codex_issue_requests force row level security;

drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert_self_or_admin on public.profiles;
create policy profiles_insert_self_or_admin
on public.profiles
for insert
to authenticated
with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists user_roles_select_self_or_admin on public.user_roles;
create policy user_roles_select_self_or_admin
on public.user_roles
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists user_roles_admin_insert on public.user_roles;
create policy user_roles_admin_insert
on public.user_roles
for insert
to authenticated
with check (public.is_admin());

drop policy if exists user_roles_admin_update on public.user_roles;
create policy user_roles_admin_update
on public.user_roles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists user_roles_admin_delete on public.user_roles;
create policy user_roles_admin_delete
on public.user_roles
for delete
to authenticated
using (public.is_admin());

drop policy if exists vehicles_admin_only_all on public.vehicles;
create policy vehicles_admin_only_all
on public.vehicles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists import_batches_admin_only_all on public.import_batches;
create policy import_batches_admin_only_all
on public.import_batches
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists source_rows_admin_only_all on public.source_rows;
create policy source_rows_admin_only_all
on public.source_rows
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists service_events_admin_only_all on public.service_events;
create policy service_events_admin_only_all
on public.service_events
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists service_items_admin_only_all on public.service_items;
create policy service_items_admin_only_all
on public.service_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists torque_specs_admin_only_all on public.torque_specs;
create policy torque_specs_admin_only_all
on public.torque_specs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists issue_requests_select_own_or_admin on public.codex_issue_requests;
create policy issue_requests_select_own_or_admin
on public.codex_issue_requests
for select
to authenticated
using (submitted_by = auth.uid() or public.is_admin());

drop policy if exists issue_requests_insert_own on public.codex_issue_requests;
create policy issue_requests_insert_own
on public.codex_issue_requests
for insert
to authenticated
with check (submitted_by = auth.uid());

drop policy if exists issue_requests_admin_update on public.codex_issue_requests;
create policy issue_requests_admin_update
on public.codex_issue_requests
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists issue_requests_admin_delete on public.codex_issue_requests;
create policy issue_requests_admin_delete
on public.codex_issue_requests
for delete
to authenticated
using (public.is_admin());

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;
grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert, update, delete on public.import_batches to authenticated;
grant select, insert, update, delete on public.source_rows to authenticated;
grant select, insert, update, delete on public.service_events to authenticated;
grant select, insert, update, delete on public.service_items to authenticated;
grant select, insert, update, delete on public.torque_specs to authenticated;
grant select, insert, update, delete on public.codex_issue_requests to authenticated;

insert into public.vehicles (
  id, year, make, model, nickname, odometer_unit, created_at, updated_at
) values (
  'vehicle-2015-acura-ilx',
  2015,
  'Acura',
  'ILX',
  '2015 Acura ILX',
  'UNKNOWN',
  '2026-04-21T00:00:00.000Z',
  '2026-04-21T00:00:00.000Z'
)
on conflict (id) do nothing;

insert into public.import_batches (
  id, source_filename, source_file_hash, imported_at, status, summary
) values (
  'batch-2015-acura-ilx-maintenance-history',
  '2015 Acura ILX Maintenence History.xlsx',
  'sha256:inspected-2015-acura-ilx-maintenance-history-2026-04-21',
  '2026-04-21T00:00:00.000Z',
  'SUCCESS',
  'Initial seed imported from inspected workbook: 4 events, 8 items, 1 torque spec.'
)
on conflict (id) do nothing;

insert into public.source_rows (
  id, import_batch_id, sheet_name, row_number, row_type, raw_date, raw_service_item, raw_odometer,
  raw_notes, raw_torque_component, raw_torque_spec, carried_forward_date, parsed_odometer, parse_warnings
)
values
  ('source-row-2-maintenance', 'batch-2015-acura-ilx-maintenance-history', 'Sheet1', 2, 'MAINTENANCE_ITEM', '46055', 'Rear shock absorbers', '93700', 'Done by seller', '', '', '2026-02-02', 93700, '{}'),
  ('source-row-3-maintenance', 'batch-2015-acura-ilx-maintenance-history', 'Sheet1', 3, 'MAINTENANCE_ITEM', '', 'Rear stabilizer end links', '93700', 'Done by seller', '', '', '2026-02-02', 93700, '{}'),
  ('source-row-4-maintenance', 'batch-2015-acura-ilx-maintenance-history', 'Sheet1', 4, 'MAINTENANCE_ITEM', '', 'Exhaust flange', '93700', 'Done by seller, behind muffler', '', '', '2026-02-02', 93700, '{}'),
  ('source-row-5-maintenance', 'batch-2015-acura-ilx-maintenance-history', 'Sheet1', 5, 'MAINTENANCE_ITEM', '', 'Brake service', '93700', 'Done by seller', '', '', '2026-02-02', 93700, '{}'),
  ('source-row-6-maintenance', 'batch-2015-acura-ilx-maintenance-history', 'Sheet1', 6, 'MAINTENANCE_ITEM', '46115', 'Back up camera', '98154', 'OE went blurry, Amazon replacement ', '', '', '2026-04-03', 98154, '{}'),
  ('source-row-7-maintenance', 'batch-2015-acura-ilx-maintenance-history', 'Sheet1', 7, 'MAINTENANCE_ITEM', '46122', 'Engine air filter ', '98993', 'Fram', '', '', '2026-04-10', 98993, '{}'),
  ('source-row-8-maintenance', 'batch-2015-acura-ilx-maintenance-history', 'Sheet1', 8, 'MAINTENANCE_ITEM', '', 'Cabin air filter', '98993', 'Motomaster', '', '', '2026-04-10', 98993, '{}'),
  ('source-row-9-maintenance', 'batch-2015-acura-ilx-maintenance-history', 'Sheet1', 9, 'MAINTENANCE_ITEM', '46123', 'Spark plugs', '98995', 'NGK ILZKR7B11S', '', '', '2026-04-11', 98995, '{}'),
  ('source-row-2-torque', 'batch-2015-acura-ilx-maintenance-history', 'Sheet1', 2, 'TORQUE_SPEC', '', '', '', '', 'Spark Plugs', '18 ft-lbs', '', null, '{}')
on conflict (id) do nothing;

insert into public.service_events (
  id, vehicle_id, service_date, odometer, summary, source_batch_id, created_at, updated_at
)
values
  ('event-2026-02-02-93700', 'vehicle-2015-acura-ilx', '2026-02-02', 93700, 'Seller maintenance before purchase', 'batch-2015-acura-ilx-maintenance-history', '2026-04-21T00:00:00.000Z', '2026-04-21T00:00:00.000Z'),
  ('event-2026-04-03-98154', 'vehicle-2015-acura-ilx', '2026-04-03', 98154, 'Back up camera replacement', 'batch-2015-acura-ilx-maintenance-history', '2026-04-21T00:00:00.000Z', '2026-04-21T00:00:00.000Z'),
  ('event-2026-04-10-98993', 'vehicle-2015-acura-ilx', '2026-04-10', 98993, 'Air filters', 'batch-2015-acura-ilx-maintenance-history', '2026-04-21T00:00:00.000Z', '2026-04-21T00:00:00.000Z'),
  ('event-2026-04-11-98995', 'vehicle-2015-acura-ilx', '2026-04-11', 98995, 'Spark plugs', 'batch-2015-acura-ilx-maintenance-history', '2026-04-21T00:00:00.000Z', '2026-04-21T00:00:00.000Z')
on conflict (id) do nothing;

insert into public.service_items (
  id, service_event_id, description, notes, sort_order, source_row_id, created_at, updated_at
)
values
  ('item-row-2', 'event-2026-02-02-93700', 'Rear shock absorbers', 'Done by seller', 0, 'source-row-2-maintenance', '2026-04-21T00:00:00.000Z', '2026-04-21T00:00:00.000Z'),
  ('item-row-3', 'event-2026-02-02-93700', 'Rear stabilizer end links', 'Done by seller', 1, 'source-row-3-maintenance', '2026-04-21T00:00:00.000Z', '2026-04-21T00:00:00.000Z'),
  ('item-row-4', 'event-2026-02-02-93700', 'Exhaust flange', 'Done by seller, behind muffler', 2, 'source-row-4-maintenance', '2026-04-21T00:00:00.000Z', '2026-04-21T00:00:00.000Z'),
  ('item-row-5', 'event-2026-02-02-93700', 'Brake service', 'Done by seller', 3, 'source-row-5-maintenance', '2026-04-21T00:00:00.000Z', '2026-04-21T00:00:00.000Z'),
  ('item-row-6', 'event-2026-04-03-98154', 'Back up camera', 'OE went blurry, Amazon replacement', 0, 'source-row-6-maintenance', '2026-04-21T00:00:00.000Z', '2026-04-21T00:00:00.000Z'),
  ('item-row-7', 'event-2026-04-10-98993', 'Engine air filter', 'Fram', 0, 'source-row-7-maintenance', '2026-04-21T00:00:00.000Z', '2026-04-21T00:00:00.000Z'),
  ('item-row-8', 'event-2026-04-10-98993', 'Cabin air filter', 'Motomaster', 1, 'source-row-8-maintenance', '2026-04-21T00:00:00.000Z', '2026-04-21T00:00:00.000Z'),
  ('item-row-9', 'event-2026-04-11-98995', 'Spark plugs', 'NGK ILZKR7B11S', 0, 'source-row-9-maintenance', '2026-04-21T00:00:00.000Z', '2026-04-21T00:00:00.000Z')
on conflict (id) do nothing;

insert into public.torque_specs (
  id, vehicle_id, component, spec, notes, source_row_id, created_at, updated_at
)
values (
  'torque-spark-plugs',
  'vehicle-2015-acura-ilx',
  'Spark Plugs',
  '18 ft-lbs',
  '',
  'source-row-2-torque',
  '2026-04-21T00:00:00.000Z',
  '2026-04-21T00:00:00.000Z'
)
on conflict (id) do nothing;

commit;
