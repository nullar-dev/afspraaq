import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/health/route';

describe('health route', () => {
  it('returns 200 with no-store cache header', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
    expect(body.config).toEqual({ allowedOriginsConfigured: true });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
