import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import GlobalError from '@/app/error';

describe('global error boundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders fallback and allows retry', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reset = vi.fn();
    render(<GlobalError error={new Error('boom')} reset={reset} />);

    expect(screen.getByText(/something went wrong/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(reset).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
