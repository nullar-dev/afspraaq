-- Enforce a basic email format at the database layer for profile records.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_email_format_check'
  ) then
    alter table public.profiles
      add constraint profiles_email_format_check
      check (
        email is null
        or email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
      );
  end if;
end
$$;
