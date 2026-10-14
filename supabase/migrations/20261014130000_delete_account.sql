-- Account deletion: a signed-in user deletes their own account.
--
-- The caller passes their handle as confirmation (case, spaces and a leading
-- @ don't matter). The check lives here so it holds for web and iOS alike,
-- not only in a client-side modal.
--
-- Deleting the auth user cascades to the profile, then to entries,
-- collections and their links, and to analytics events. Shows and venues
-- they added stay in the shared catalogue with created_by set to null.
--
-- Files are not removed here: Postgres can't delete Storage objects
-- (storage.objects refuses direct deletes). Clients first remove
-- `entry-photos/{user_id}/` and `avatars/{user_id}/` through the Storage
-- API, then call this.

create function public.delete_my_account(confirm text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  own_handle text;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  select p.handle::text into own_handle from public.profiles p where p.id = uid;

  if own_handle is null
     or lower(ltrim(btrim(coalesce(confirm, '')), '@')) <> lower(own_handle) then
    raise exception 'Confirmation does not match' using errcode = '22023';
  end if;

  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;
