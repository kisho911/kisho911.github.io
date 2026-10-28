-- Tester sign-up list for the Workshop site.
-- Run once in Supabase → SQL Editor → New query → Run.
create table if not exists public.testers (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  name        text check (char_length(name) <= 80),
  email       text not null unique check (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  apps        text[] not null default '{}' check (apps <@ array['AstroChart','PrivateLink','Vessel']::text[]),
  device      text check (char_length(device) <= 40)
);

alter table public.testers enable row level security;

-- Visitors can add themselves. Nobody can read, change or delete through the public key.
drop policy if exists "anyone can sign up" on public.testers;
create policy "anyone can sign up" on public.testers
  for insert to anon, authenticated
  with check (true);

-- Ruxi's evaluations and "speak to the manager" complaints.
-- Read them in Supabase → Table Editor → ruxi_notes.
create table if not exists public.ruxi_notes (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  kind        text not null check (kind in ('evaluation','complaint')),
  ratings     jsonb,
  topic       text check (char_length(topic) <= 80),
  severity    text check (char_length(severity) <= 40),
  message     text check (char_length(message) <= 800)
);

alter table public.ruxi_notes enable row level security;

drop policy if exists "ruxi can submit" on public.ruxi_notes;
create policy "ruxi can submit" on public.ruxi_notes
  for insert to anon, authenticated
  with check (true);
