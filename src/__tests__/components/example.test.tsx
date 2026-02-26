import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '../../app/page';

describe('Home Page', () => {
  it('should render the welcome heading', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: /welcome to nullar/i })).toBeTruthy();
  });

  it('should render main element', () => {
    const { container } = render(<Home />);
    expect(container.querySelector('main')).toBeTruthy();
  });
});
