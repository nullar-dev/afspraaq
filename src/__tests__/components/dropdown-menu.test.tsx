import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

describe('DropdownMenu UI', () => {
  it('opens and handles item click', () => {
    const onSelect = vi.fn();

    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent forceMount>
          <DropdownMenuItem onClick={onSelect}>Profile</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    fireEvent.click(screen.getByText('Profile'));

    expect(onSelect).toHaveBeenCalled();
  });
});
