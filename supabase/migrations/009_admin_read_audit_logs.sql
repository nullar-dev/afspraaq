-- Audit trail for admin read operations on sensitive resources.
-- This table is append-only for authenticated admins via RLS.

create table if not exists public.admin_read_audit_logs (
  id bigserial primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  resource text not null,
  action text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_read_audit_logs_created_at
  on public.admin_read_audit_logs (created_at desc);

create index if not exists idx_admin_read_audit_logs_actor_user_id
  on public.admin_read_audit_logs (actor_user_id);

revoke all on table public.admin_read_audit_logs from anon;
revoke all on table public.admin_read_audit_logs from authenticated;
grant insert on table public.admin_read_audit_logs to authenticated;

alter table public.admin_read_audit_logs enable row level security;

drop policy if exists "Admins can insert read audit logs" on public.admin_read_audit_logs;
create policy "Admins can insert read audit logs" on public.admin_read_audit_logs
  for insert
  with check (public.is_admin());
