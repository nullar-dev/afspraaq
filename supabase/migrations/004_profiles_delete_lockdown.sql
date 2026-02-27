-- Explicitly disallow profile deletes from anon/authenticated roles.
-- This documents intent and protects against future accidental grants/policies.

revoke delete on table public.profiles from anon;
revoke delete on table public.profiles from authenticated;

drop policy if exists "Users can delete own profile" on public.profiles;
