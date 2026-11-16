-- Ascent: per-account study state. Every table is private to its owner via RLS.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  custom jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table public.notes (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null,
  body text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table public.activity (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  data jsonb not null,
  primary key (user_id, day)
);

create table public.attempts (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null,
  kind text not null,
  input text not null default '',
  feedback jsonb,
  score int,
  created_at timestamptz not null default now()
);
create index attempts_user_created_idx on public.attempts (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.progress enable row level security;
alter table public.notes enable row level security;
alter table public.activity enable row level security;
alter table public.attempts enable row level security;

create policy "own profile" on public.profiles for all to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "own progress" on public.progress for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own notes" on public.notes for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own activity" on public.activity for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own attempts" on public.attempts for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.profiles, public.progress, public.notes, public.activity, public.attempts from anon;
grant select, insert, update, delete on public.profiles, public.progress, public.notes, public.activity, public.attempts to authenticated;
