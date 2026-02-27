import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';

describe('robots', () => {
  it('returns crawler rules', () => {
    const result = robots();
    expect(result.rules).toBeTruthy();
  });
});
