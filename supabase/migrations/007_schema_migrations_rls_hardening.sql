-- Harden internal migration tracking table:
-- - Prevent anon/authenticated read/write
-- - Enable RLS for defense in depth

revoke all on table public.schema_migrations from anon;
revoke all on table public.schema_migrations from authenticated;

alter table public.schema_migrations enable row level security;
