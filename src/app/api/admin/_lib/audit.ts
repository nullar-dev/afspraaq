interface SupabaseLike {
  from: (table: string) => {
    insert?: (values: Record<string, unknown> | Record<string, unknown>[]) => Promise<{
      error: { message?: string } | null;
    }>;
  };
}

interface AdminReadAuditInput {
  supabase: SupabaseLike;
  actorUserId: string;
  resource: string;
  action: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}

export const logAdminReadAudit = async ({
  supabase,
  actorUserId,
  resource,
  action,
  targetId = null,
  metadata = {},
}: AdminReadAuditInput) => {
  try {
    const query = supabase.from('admin_read_audit_logs');
    if (!query || typeof query.insert !== 'function') return;

    const { error } = await query.insert({
      actor_user_id: actorUserId,
      resource,
      action,
      target_id: targetId,
      metadata,
    });

    if (error) {
      console.warn('Admin read audit insert failed', {
        actorUserId,
        resource,
        action,
        message: error.message ?? 'unknown',
      });
    }
  } catch (error) {
    console.warn('Admin read audit logging failed', {
      actorUserId,
      resource,
      action,
      message: error instanceof Error ? error.message : 'unknown',
    });
  }
};
