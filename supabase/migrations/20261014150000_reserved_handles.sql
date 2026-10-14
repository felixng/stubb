-- Reserved handles: Stubbed's own names, staff-sounding ones, and words that
-- would read as site pages or system values. Nobody can claim one from the
-- app or the API. The owner can still give one out from the SQL editor
-- (postgres) or with the service role, which this check skips.
--
-- The same list is in apps/web/src/lib/profile-handle.ts (RESERVED_HANDLES),
-- so the forms say "reserved" before saving; a unit test keeps them in step.
-- To change it, add a migration that replaces this function, and edit both.

create function public.is_reserved_handle(h text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(h) = any (array[
    'stubbed', 'stubbedapp', 'getstubbed', 'stubbed_app', 'stubbedhq',
    'teamstubbed', 'admin', 'administrator', 'root', 'sysadmin', 'superuser',
    'staff', 'team', 'official', 'mod', 'mods', 'moderator', 'support', 'help',
    'helpdesk', 'security', 'safety', 'abuse', 'legal', 'privacy', 'terms',
    'trust', 'verified', 'system', 'owner', 'founder', 'app', 'api', 'about',
    'faq', 'login', 'logout', 'signin', 'signout', 'signup', 'register',
    'join', 'welcome', 'confirmed', 'auth', 'account', 'settings', 'profile',
    'import', 'share', 'trips', 'diary', 'explore', 'search', 'feed', 'home',
    'news', 'blog', 'press', 'jobs', 'careers', 'contact', 'status', 'docs',
    'sitemap', 'robots', 'www', 'mail', 'email', 'noreply', 'no_reply',
    'postmaster', 'webmaster', 'hostmaster', 'null', 'undefined', 'none',
    'nobody', 'anonymous', 'everyone', 'all', 'user', 'users', 'test', 'example'
  ]);
$$;

grant execute on function public.is_reserved_handle(text) to anon, authenticated;

-- A trigger rather than a check constraint, so a handle someone already holds
-- stays valid if the list grows later; only claiming a new one is refused.
create function public.refuse_reserved_handle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.handle is not null
     and new.handle is distinct from (case when tg_op = 'UPDATE' then old.handle end)
     and current_user in ('anon', 'authenticated')
     and public.is_reserved_handle(new.handle::text) then
    raise exception 'handle "%" is reserved', new.handle
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke execute on function public.refuse_reserved_handle() from public, anon, authenticated;

create trigger profiles_refuse_reserved_handle
  before insert or update of handle on public.profiles
  for each row execute function public.refuse_reserved_handle();
