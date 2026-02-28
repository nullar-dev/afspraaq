-- Allow admin users to read all profiles in React-admin while preserving
-- normal users' existing self-only access.

create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  current_role text;
begin
  select role into current_role
  from public.profiles
  where id = auth.uid();

  return current_role = 'admin';
end;
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles" on public.profiles
  for select
  using (public.is_admin());
