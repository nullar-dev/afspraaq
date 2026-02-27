-- Profile integrity hardening:
-- - idempotent profile creation
-- - lowercase email normalization
-- - created_at write-protection
-- - automatic updated_at management

-- Ensure role/created_at cannot be modified by clients directly.
revoke update (role, created_at) on table public.profiles from authenticated;
grant update (email) on table public.profiles to authenticated;

-- Keep emails normalized for consistency and duplicate prevention.
create or replace function public.normalize_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if new.email is not null then
    new.email := lower(trim(new.email));
  end if;
  return new;
end;
$$;

drop trigger if exists normalize_profile_email_before_write on public.profiles;
create trigger normalize_profile_email_before_write
  before insert or update on public.profiles
  for each row execute procedure public.normalize_profile_email();

-- Manage timestamps safely.
create or replace function public.protect_profile_timestamps()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if tg_op = 'insert' then
    if new.created_at is null then
      new.created_at := now();
    end if;
    new.updated_at := now();
    return new;
  end if;

  -- Prevent clients from mutating created_at.
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists protect_profile_timestamps_before_write on public.profiles;
create trigger protect_profile_timestamps_before_write
  before insert or update on public.profiles
  for each row execute procedure public.protect_profile_timestamps();

-- Make signup trigger idempotent for retries/races.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, lower(trim(new.email)), 'user')
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;
