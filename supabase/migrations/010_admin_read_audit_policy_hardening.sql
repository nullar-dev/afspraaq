-- Harden admin audit insert policy to prevent spoofed actor identities.
-- Admins may insert audit logs, but actor_user_id must match auth.uid().

drop policy if exists "Admins can insert read audit logs" on public.admin_read_audit_logs;

create policy "Admins can insert read audit logs" on public.admin_read_audit_logs
  for insert
  with check (public.is_admin() and actor_user_id = auth.uid());
