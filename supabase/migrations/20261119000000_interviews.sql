-- Ascent: mock interview rounds (docs/design/mock-interviewer/03-detailed-design.md §6).
-- Every table is private to its owner via RLS, in the same style as 20261116000000_init.sql.
-- usage_ledger (platform-paid usage) is Phase 4 and is intentionally not created here.

create table public.interview_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  config jsonb not null,                 -- SessionConfig, with tone and persona resolved
  question_ref text not null,            -- curriculum id, imported id or ai-generated id
  question_snapshot jsonb not null,      -- the exact question used (content may change later)
  picked boolean not null default false, -- MI-SET-3: an exact question rather than a draw
  format text not null default 'standard' check (format in ('standard', 'reverse', 'peer')),
  engine text not null,
  status text not null check (status in ('live', 'scoring', 'done', 'abandoned')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  deadline_at timestamptz not null,      -- a live round past this is abandoned by the reaper
  loop_id uuid,                          -- MI-X-3: rounds of one loop day share it
  stats jsonb,                           -- delivery analytics (MI-FB-3)
  has_media boolean not null default false, -- a recording was uploaded to interview-media
  updated_at timestamptz not null default now()
);
create index interview_sessions_user_started_idx on public.interview_sessions (user_id, started_at desc);
create index interview_sessions_live_deadline_idx on public.interview_sessions (deadline_at) where status = 'live';
create index interview_sessions_loop_idx on public.interview_sessions (loop_id) where loop_id is not null;

create table public.interview_events (
  session_id uuid not null references public.interview_sessions (id) on delete cascade,
  seq int not null,
  user_id uuid not null references auth.users (id) on delete cascade, -- denormalised for RLS
  t_ms int not null,                     -- ms since the round started
  type text not null,                    -- event type, see §7
  payload jsonb not null,
  primary key (session_id, seq)
);
create index interview_events_user_idx on public.interview_events (user_id);

create table public.interview_scorecards (
  session_id uuid primary key references public.interview_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  decision text not null check (decision in ('strong_no_hire', 'no_hire', 'leaning_no_hire', 'leaning_hire', 'hire', 'strong_hire')),
  level_supported text,
  ratings jsonb not null,                -- [{dimension, score 1-4, evidence: [{seq, quote}], note}]
  card jsonb not null,                   -- the full scorecard (summary, strengths, improvements, …)
  predicted_decision text,               -- MI-FB-5
  model jsonb not null,                  -- task profile used (provider, model, params, prompt version)
  created_at timestamptz not null default now()
);
create index interview_scorecards_user_idx on public.interview_scorecards (user_id, created_at desc);

alter table public.interview_sessions enable row level security;
alter table public.interview_events enable row level security;
alter table public.interview_scorecards enable row level security;

create policy "own interview sessions" on public.interview_sessions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own interview events" on public.interview_events for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own interview scorecards" on public.interview_scorecards for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.interview_sessions, public.interview_events, public.interview_scorecards from anon;
grant select, insert, update, delete on public.interview_sessions, public.interview_events, public.interview_scorecards to authenticated;

-- Close the caller's own rounds that were left live past their deadline (a closed tab, a crash).
-- Called by the client on sync; runs with the caller's rights, so RLS still applies.
create or replace function public.reap_my_interviews() returns int
language sql security invoker set search_path = '' as $$
  with closed as (
    update public.interview_sessions
       set status = 'abandoned', ended_at = coalesce(ended_at, deadline_at), updated_at = now()
     where user_id = (select auth.uid()) and status = 'live' and deadline_at < now()
     returning 1
  )
  select count(*)::int from closed;
$$;
revoke all on function public.reap_my_interviews() from public, anon;
grant execute on function public.reap_my_interviews() to authenticated;

-- Opt-in recordings and whiteboard snapshots (MI-FB-2). Private; each user reads and writes only
-- under <user_id>/<session_id>/…
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('interview-media', 'interview-media', false, 104857600,
        array['audio/webm', 'audio/ogg', 'audio/mp4', 'application/json'])
on conflict (id) do nothing;

create policy "own interview media read" on storage.objects for select to authenticated
  using (bucket_id = 'interview-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own interview media insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'interview-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own interview media update" on storage.objects for update to authenticated
  using (bucket_id = 'interview-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own interview media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'interview-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
