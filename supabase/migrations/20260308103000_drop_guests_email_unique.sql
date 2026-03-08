alter table if exists public.guests
  drop constraint if exists guests_email_unique;

drop index if exists public.guests_email_unique;
