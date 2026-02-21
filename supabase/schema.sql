create extension if not exists "pgcrypto";

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  token text not null,
  invite_type text not null check (invite_type in ('single', 'plusone')),
  primary_email text,
  primary_first_name text,
  primary_last_name text,
  expires_at timestamptz,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists invites_token_unique on public.invites (token);

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  invitation_group_id uuid not null,
  role text not null check (role in ('primary', 'plusone')),
  first_name text not null,
  last_name text not null,
  email text not null,
  attendance text not null check (attendance in ('yes', 'no')),
  cricket_attendance text not null check (cricket_attendance in ('yes', 'no')),
  dietary text,
  address_line_1 text,
  address_line_2 text,
  city text,
  postcode text,
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guests_primary_address_required
    check (
      role <> 'primary'
      or (address_line_1 is not null and city is not null and postcode is not null)
    )
);

create index if not exists guests_email_idx on public.guests (email);
create index if not exists guests_invitation_group_idx on public.guests (invitation_group_id);
create unique index if not exists guests_group_role_unique on public.guests (invitation_group_id, role);

alter table public.invites enable row level security;
alter table public.guests enable row level security;

create policy invites_read_token
  on public.invites
  for select
  using (true);

create policy invites_update_own
  on public.invites
  for update
  using (auth.email() = primary_email or primary_email is null)
  with check (auth.email() = primary_email or primary_email is null);

create policy guests_read_own
  on public.guests
  for select
  using (auth.email() = email);

create policy guests_update_own
  on public.guests
  for update
  using (auth.email() = email);

create policy guests_insert_own
  on public.guests
  for insert
  with check (auth.email() = email);
