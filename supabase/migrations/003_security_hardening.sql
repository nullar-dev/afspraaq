-- Security hardening for profiles and auth trigger function

-- Ensure clients cannot escalate privileges via role column.
-- Restrict table privileges and allow only safe operations for authenticated users.
revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;
grant select, insert, update (email, updated_at) on table public.profiles to authenticated;

-- Tighten RLS checks to enforce non-admin role on self-write paths.
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = 'user');

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
  for insert
  with check (auth.uid() = id and role = 'user');

-- Harden SECURITY DEFINER function against search_path hijacking.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$;
