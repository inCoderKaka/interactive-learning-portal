-- Ascent: portal notes (sticky notes and imported notes). Private to the owner via RLS, in the same
-- style as 20261116000000_init.sql. The note body lives in `data` (lib/notes/types.ts PortalNote);
-- deletions are tombstones (data.deleted) so they sync across devices.

create table public.portal_notes (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.portal_notes enable row level security;
create policy "own portal notes" on public.portal_notes for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.portal_notes from anon;
grant select, insert, update, delete on public.portal_notes to authenticated;

-- Images and voice notes attached to notes. Each user reads and writes only under <user_id>/…
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('note-media', 'note-media', false, 26214400,
        array['image/webp', 'image/png', 'image/jpeg', 'image/gif', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'])
on conflict (id) do nothing;

create policy "own note media read" on storage.objects for select to authenticated
  using (bucket_id = 'note-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own note media insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'note-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own note media update" on storage.objects for update to authenticated
  using (bucket_id = 'note-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own note media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'note-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
