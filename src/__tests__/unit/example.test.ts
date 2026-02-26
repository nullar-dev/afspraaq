import { describe, it, expect } from 'vitest';

describe('Unit Example', () => {
  it('should pass basic assertions', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle basic math', () => {
    expect(10 - 5).toBe(5);
    expect(5 * 3).toBe(15);
  });
});
