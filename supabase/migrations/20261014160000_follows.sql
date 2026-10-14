-- Follows (Phase 3), Hevy style. Following a public profile takes effect at
-- once; following a private one sends a request its owner approves or
-- declines. Approved followers of a private profile see what everyone sees
-- of a public one: its public, logged entries, its trips, their photos and
-- its stats. Private entries stay owner-only whoever follows.
--
-- Clients write the table directly (web and iOS alike); the rules live here:
-- - the status is set by a trigger, never by the client;
-- - only the person followed can approve, and only from pending to accepted;
-- - either side can end a follow (unfollow, cancel a request, decline,
--   remove a follower), so there is no separate "declined" state.

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

-- Followers lists and the profile-visibility check look up by followee.
create index follows_followee_idx on public.follows (followee_id, status);

alter table public.follows enable row level security;

revoke all on public.follows from anon, authenticated;
grant select on public.follows to anon, authenticated;
grant insert (follower_id, followee_id) on public.follows to authenticated;
grant update (status) on public.follows to authenticated;
grant delete on public.follows to authenticated;

-- Whether the caller may see a profile's public rows: it isn't private, it's
-- theirs, or they're an approved follower. Security definer so policies on
-- other tables can ask without follows' own RLS getting in the way.
create function public.profile_is_visible(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = profile_id
      and (
        not p.is_private
        or p.id = (select auth.uid())
        or exists (
          select 1 from public.follows f
          where f.followee_id = p.id
            and f.follower_id = (select auth.uid())
            and f.status = 'accepted'
        )
      )
  );
$$;

revoke execute on function public.profile_is_visible(uuid) from public;
grant execute on function public.profile_is_visible(uuid) to anon, authenticated;

-- A follow row is visible to both people in it. Anyone else sees accepted
-- follows only, and only between two profiles they can see, so a private
-- profile's followers and following lists stay hidden from strangers.
create policy "Follows are visible to their two people, or when both profiles are"
  on public.follows for select
  to anon, authenticated
  using (
    (select auth.uid()) in (follower_id, followee_id)
    or (
      status = 'accepted'
      and public.profile_is_visible(follower_id)
      and public.profile_is_visible(followee_id)
    )
  );

create policy "Users follow as themselves"
  on public.follows for insert
  to authenticated
  with check (follower_id = (select auth.uid()));

create policy "The person followed approves requests"
  on public.follows for update
  to authenticated
  using (followee_id = (select auth.uid()))
  with check (followee_id = (select auth.uid()) and status = 'accepted');

create policy "Either person ends a follow"
  on public.follows for delete
  to authenticated
  using ((select auth.uid()) in (follower_id, followee_id));

-- New follows: accepted straight away unless the profile is private.
create function public.set_follow_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.status := case
    when exists (select 1 from public.profiles p where p.id = new.followee_id and p.is_private)
      then 'pending'
    else 'accepted'
  end;
  new.created_at := now();
  return new;
end;
$$;

revoke execute on function public.set_follow_status() from public, anon, authenticated;

create trigger follows_set_status
  before insert on public.follows
  for each row execute function public.set_follow_status();

-- A profile that goes public approves its waiting requests: there's nothing
-- left to approve them for. Going private keeps existing followers.
create function public.accept_requests_when_public()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.follows set status = 'accepted'
  where followee_id = new.id and status = 'pending';
  return new;
end;
$$;

revoke execute on function public.accept_requests_when_public() from public, anon, authenticated;

create trigger profiles_accept_requests_when_public
  after update of is_private on public.profiles
  for each row
  when (old.is_private and not new.is_private)
  execute function public.accept_requests_when_public();

-- Headline counts for /@handle: accepted follows only. Shown for every
-- profile, private ones too (as on Instagram and Hevy); the lists behind
-- them follow the select policy above.
create function public.follow_counts(profile_id uuid)
returns table (followers integer, following integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::integer from public.follows
     where followee_id = profile_id and status = 'accepted'),
    (select count(*)::integer from public.follows
     where follower_id = profile_id and status = 'accepted');
$$;

revoke execute on function public.follow_counts(uuid) from public;
grant execute on function public.follow_counts(uuid) to anon, authenticated;

-- Private profiles: approved followers now see public rows too. Entry photos
-- and trip links look entries up under the caller's RLS, so they follow.
alter policy "Public entries are visible to everyone"
  on public.entries
  using (
    status = 'logged'
    and visibility = 'public'
    and public.profile_is_visible(user_id)
  );

create or replace function public.collection_is_public(collection uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.entry_collections ec
    join public.entries e on e.id = ec.entry_id
    where ec.collection_id = collection
      and e.status = 'logged'
      and e.visibility = 'public'
      and public.profile_is_visible(e.user_id)
  );
$$;
