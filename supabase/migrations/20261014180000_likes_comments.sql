-- Likes and comments on entries (Phase 3), Hevy style. Anyone signed in who
-- can see an entry can like it once and comment on it; everyone who can see
-- the entry sees its likes and comments. The entry's owner can delete any
-- comment on it, and commenters can delete their own. Comments can't be
-- edited (delete and post again), as on Hevy.
--
-- "Can see" is the entries select policy for everyone but the owner: a
-- public, logged entry on a profile the caller may see (not private, theirs,
-- or an approved follower). So a private or planned entry can't be liked or
-- commented on, and an entry made private later hides its likes and comments
-- from everyone but its owner (they come back if it's made public again).
--
-- Clients write the tables directly (web and iOS alike); the rules live here.

-- Whether the caller may like or comment on an entry, and see who has.
-- Security definer so the policies below can ask without entries' RLS (the
-- owner sees their private entries, but those aren't open to reactions).
create function public.entry_is_open(entry uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.entries e
    where e.id = entry
      and e.status = 'logged'
      and e.visibility = 'public'
      and public.profile_is_visible(e.user_id)
  );
$$;

revoke execute on function public.entry_is_open(uuid) from public;
grant execute on function public.entry_is_open(uuid) to anon, authenticated;

-- Whether the caller owns an entry. Reads entries directly, so it holds for
-- the owner's private entries too.
create function public.owns_entry(entry uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.entries e
    where e.id = entry and e.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.owns_entry(uuid) from public;
grant execute on function public.owns_entry(uuid) to anon, authenticated;

-- Likes ---------------------------------------------------------------------

create table public.entry_likes (
  entry_id   uuid not null references public.entries (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (entry_id, user_id)
);

-- "Shows you've liked" (later) looks up by user.
create index entry_likes_user_idx on public.entry_likes (user_id, created_at desc);

alter table public.entry_likes enable row level security;

revoke all on public.entry_likes from anon, authenticated;
grant select on public.entry_likes to anon, authenticated;
grant insert (entry_id, user_id) on public.entry_likes to authenticated;
grant delete on public.entry_likes to authenticated;

create policy "Likes are visible with their entry"
  on public.entry_likes for select
  to anon, authenticated
  using (public.entry_is_open(entry_id) or public.owns_entry(entry_id));

create policy "Users like entries they can see, as themselves"
  on public.entry_likes for insert
  to authenticated
  with check (user_id = (select auth.uid()) and public.entry_is_open(entry_id));

create policy "Users unlike their own likes"
  on public.entry_likes for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Comments ------------------------------------------------------------------

create table public.entry_comments (
  id         uuid primary key default gen_random_uuid(),
  entry_id   uuid not null references public.entries (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body       text not null check (body = btrim(body) and char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

-- An entry's thread, oldest first.
create index entry_comments_entry_idx on public.entry_comments (entry_id, created_at);
create index entry_comments_user_idx on public.entry_comments (user_id);

alter table public.entry_comments enable row level security;

revoke all on public.entry_comments from anon, authenticated;
grant select on public.entry_comments to anon, authenticated;
grant insert (id, entry_id, user_id, body) on public.entry_comments to authenticated;
grant delete on public.entry_comments to authenticated;

create policy "Comments are visible with their entry"
  on public.entry_comments for select
  to anon, authenticated
  using (public.entry_is_open(entry_id) or public.owns_entry(entry_id));

create policy "Users comment on entries they can see, as themselves"
  on public.entry_comments for insert
  to authenticated
  with check (user_id = (select auth.uid()) and public.entry_is_open(entry_id));

create policy "Commenters and the entry's owner delete comments"
  on public.entry_comments for delete
  to authenticated
  using (user_id = (select auth.uid()) or public.owns_entry(entry_id));

-- The server sets the time, so a client can't backdate a like or comment.
create function public.set_created_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_at := now();
  return new;
end;
$$;

revoke execute on function public.set_created_at() from public, anon, authenticated;

create trigger entry_likes_set_created_at
  before insert on public.entry_likes
  for each row execute function public.set_created_at();

create trigger entry_comments_set_created_at
  before insert on public.entry_comments
  for each row execute function public.set_created_at();

-- Counts for a list of entries, and whether the caller liked each: one call
-- per page of cards. Security invoker, so the policies above decide what's
-- counted; an entry the caller can't see comes back with zeros.
create function public.entry_reactions(entry_ids uuid[])
returns table (entry_id uuid, likes integer, comments integer, liked boolean)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    e.id,
    (select count(*)::integer from public.entry_likes l where l.entry_id = e.id),
    (select count(*)::integer from public.entry_comments c where c.entry_id = e.id),
    exists (
      select 1 from public.entry_likes l
      where l.entry_id = e.id and l.user_id = (select auth.uid())
    )
  from unnest(entry_ids) as e(id);
$$;

revoke execute on function public.entry_reactions(uuid[]) from public;
grant execute on function public.entry_reactions(uuid[]) to anon, authenticated;
