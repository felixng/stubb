-- Private profiles, Hevy style. Every user has a handle (set at /welcome), so
-- /@handle always exists. A private profile still shows its handle, name,
-- avatar, bio and link, but its entries, trips, photos and stats are hidden
-- from everyone but the owner, whatever each entry's own visibility. When
-- follows arrive (Phase 3), approved followers will see them too.
--
-- Enforced here, in RLS, so the API can't read around the page.

alter table public.profiles
  add column is_private boolean not null default false;

grant select (is_private) on public.profiles to anon;
grant update (is_private) on public.profiles to authenticated;

-- A handle, once set, can be changed but not removed: the profile page and
-- share cards depend on it. (Before onboarding it's null.)
create function public.keep_handle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.handle is not null and new.handle is null then
    raise exception 'a handle cannot be removed once set'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke execute on function public.keep_handle() from public, anon, authenticated;

create trigger profiles_keep_handle
  before update of handle on public.profiles
  for each row execute function public.keep_handle();

-- Public rows of a private profile are visible to their owner only (the
-- owner policies are unchanged). The entry_collections and entry-photos read
-- policies look up entries and collections under the caller's RLS, so they
-- follow these automatically.
drop policy "Public entries are visible to everyone" on public.entries;
create policy "Public entries are visible to everyone"
  on public.entries for select
  to anon, authenticated
  using (
    visibility = 'public'
    and not exists (select 1 from public.profiles p where p.id = user_id and p.is_private)
  );

drop policy "Public collections are visible to everyone" on public.collections;
create policy "Public collections are visible to everyone"
  on public.collections for select
  to anon, authenticated
  using (
    visibility = 'public'
    and not exists (select 1 from public.profiles p where p.id = user_id and p.is_private)
  );
