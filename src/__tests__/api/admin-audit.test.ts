/**
 * Admin Audit Logging Unit Tests
 * Comprehensive tests for audit logging functionality
 * Target: 55.55% statements → 100% coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logAdminReadAudit } from '@/app/api/admin/_lib/audit';

describe('logAdminReadAudit', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('successfully logs admin read audit entry', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    const mockSupabase = { from: mockFrom };

    await logAdminReadAudit({
      supabase: mockSupabase,
      actorUserId: 'user-123',
      resource: 'profiles',
      action: 'list',
    });

    expect(mockFrom).toHaveBeenCalledWith('admin_read_audit_logs');
    expect(mockInsert).toHaveBeenCalledWith({
      actor_user_id: 'user-123',
      resource: 'profiles',
      action: 'list',
      target_id: null,
      metadata: {},
    });
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('includes target_id when provided', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    const mockSupabase = { from: mockFrom };

    await logAdminReadAudit({
      supabase: mockSupabase,
      actorUserId: 'user-123',
      resource: 'profiles',
      action: 'view',
      targetId: 'profile-456',
    });

    expect(mockInsert).toHaveBeenCalledWith({
      actor_user_id: 'user-123',
      resource: 'profiles',
      action: 'view',
      target_id: 'profile-456',
      metadata: {},
    });
  });

  it('includes metadata when provided', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    const mockSupabase = { from: mockFrom };

    const metadata = { filters: { role: 'admin' }, page: 1 };

    await logAdminReadAudit({
      supabase: mockSupabase,
      actorUserId: 'user-123',
      resource: 'profiles',
      action: 'list',
      metadata,
    });

    expect(mockInsert).toHaveBeenCalledWith({
      actor_user_id: 'user-123',
      resource: 'profiles',
      action: 'list',
      target_id: null,
      metadata,
    });
  });

  it('returns early when query is null', async () => {
    const mockFrom = vi.fn().mockReturnValue(null);
    const mockSupabase = { from: mockFrom };

    await logAdminReadAudit({
      supabase: mockSupabase,
      actorUserId: 'user-123',
      resource: 'profiles',
      action: 'list',
    });

    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('returns early when query is not an object', async () => {
    const mockFrom = vi.fn().mockReturnValue('not-an-object');
    const mockSupabase = { from: mockFrom };

    await logAdminReadAudit({
      supabase: mockSupabase,
      actorUserId: 'user-123',
      resource: 'profiles',
      action: 'list',
    });

    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('returns early when query has no insert method', async () => {
    const mockFrom = vi.fn().mockReturnValue({});
    const mockSupabase = { from: mockFrom };

    await logAdminReadAudit({
      supabase: mockSupabase,
      actorUserId: 'user-123',
      resource: 'profiles',
      action: 'list',
    });

    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('returns early when insert is not a function', async () => {
    const mockFrom = vi.fn().mockReturnValue({ insert: 'not-a-function' });
    const mockSupabase = { from: mockFrom };

    await logAdminReadAudit({
      supabase: mockSupabase,
      actorUserId: 'user-123',
      resource: 'profiles',
      action: 'list',
    });

    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('logs warning when insert returns an error', async () => {
    const error = new Error('Database connection failed');
    const mockInsert = vi.fn().mockResolvedValue({ error });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    const mockSupabase = { from: mockFrom };

    await logAdminReadAudit({
      supabase: mockSupabase,
      actorUserId: 'user-123',
      resource: 'profiles',
      action: 'list',
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Admin read audit insert failed',
      expect.objectContaining({
        actorUserId: 'user-123',
        resource: 'profiles',
        action: 'list',
        message: 'Database connection failed',
      })
    );
  });

  it('logs warning with unknown message when error has no message', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: {} });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    const mockSupabase = { from: mockFrom };

    await logAdminReadAudit({
      supabase: mockSupabase,
      actorUserId: 'user-123',
      resource: 'profiles',
      action: 'list',
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Admin read audit insert failed',
      expect.objectContaining({
        message: 'unknown',
      })
    );
  });

  it('catches and logs exceptions from supabase.from()', async () => {
    const error = new Error('Supabase client error');
    const mockFrom = vi.fn().mockImplementation(() => {
      throw error;
    });
    const mockSupabase = { from: mockFrom };

    await logAdminReadAudit({
      supabase: mockSupabase,
      actorUserId: 'user-123',
      resource: 'profiles',
      action: 'list',
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Admin read audit logging failed',
      expect.objectContaining({
        actorUserId: 'user-123',
        resource: 'profiles',
        action: 'list',
        message: 'Supabase client error',
      })
    );
  });

  it('catches and logs exceptions from query.insert()', async () => {
    const error = new Error('Insert operation failed');
    const mockInsert = vi.fn().mockImplementation(() => {
      throw error;
    });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    const mockSupabase = { from: mockFrom };

    await logAdminReadAudit({
      supabase: mockSupabase,
      actorUserId: 'user-123',
      resource: 'profiles',
      action: 'list',
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Admin read audit logging failed',
      expect.objectContaining({
        message: 'Insert operation failed',
      })
    );
  });

  it('handles non-Error exceptions gracefully', async () => {
    const mockFrom = vi.fn().mockImplementation(() => {
      throw 'String error';
    });
    const mockSupabase = { from: mockFrom };

    await logAdminReadAudit({
      supabase: mockSupabase,
      actorUserId: 'user-123',
      resource: 'profiles',
      action: 'list',
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Admin read audit logging failed',
      expect.objectContaining({
        message: 'unknown',
      })
    );
  });

  it('never throws - always swallows errors', async () => {
    const mockFrom = vi.fn().mockImplementation(() => {
      throw new Error('Critical error');
    });
    const mockSupabase = { from: mockFrom };

    // Should not throw
    await expect(
      logAdminReadAudit({
        supabase: mockSupabase,
        actorUserId: 'user-123',
        resource: 'profiles',
        action: 'list',
      })
    ).resolves.toBeUndefined();
  });

  it('handles all audit fields correctly in error logging', async () => {
    const error = new Error('Test error');
    const mockInsert = vi.fn().mockResolvedValue({ error });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    const mockSupabase = { from: mockFrom };

    await logAdminReadAudit({
      supabase: mockSupabase,
      actorUserId: 'admin-789',
      resource: 'bookings',
      action: 'delete',
      targetId: 'booking-123',
      metadata: { reason: 'fraudulent' },
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Admin read audit insert failed',
      expect.objectContaining({
        actorUserId: 'admin-789',
        resource: 'bookings',
        action: 'delete',
      })
    );
  });
});
