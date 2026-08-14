create table if not exists public.command_centre_state (
  key text primary key check (key in ('seating', 'cricket')),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table public.command_centre_state enable row level security;

-- No policies: this table is only ever touched by the command-centre-api
-- Edge Function using the service role key, which bypasses RLS entirely.
-- Anon/authenticated clients get zero access via PostgREST.

insert into public.command_centre_state (key, data)
values ('seating', '{}'::jsonb), ('cricket', '{}'::jsonb)
on conflict (key) do nothing;
