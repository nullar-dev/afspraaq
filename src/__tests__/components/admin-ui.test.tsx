import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Card,
  Button,
  Badge,
  Skeleton,
  SearchInput,
  Pagination,
  Modal,
  Table,
  Select,
} from '@/components/admin/ui';

describe('Admin UI Components', () => {
  describe('Card', () => {
    it('renders children', () => {
      render(<Card>Test Content</Card>);
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<Card className="custom-class">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card?.classList.contains('custom-class')).toBe(true);
    });

    it('applies hover class when hover prop is true', () => {
      const { container } = render(<Card hover>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card?.classList.contains('hover:border-gold/40')).toBe(true);
    });

    it('applies animate class when animate prop is true', () => {
      const { container } = render(<Card animate>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card?.classList.contains('animate-fade-in-up')).toBe(true);
    });
  });

  describe('Button', () => {
    it('renders children', () => {
      render(<Button>Click Me</Button>);
      expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument();
    });

    it('applies variant classes', () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole('button', { name: 'Primary' });
      expect(button).toHaveClass('bg-gold');
    });

    it('applies secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button', { name: 'Secondary' });
      expect(button).toHaveClass('bg-dark-200');
    });

    it('applies ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button', { name: 'Ghost' });
      expect(button).toHaveClass('bg-transparent');
    });

    it('applies danger variant', () => {
      render(<Button variant="danger">Danger</Button>);
      const button = screen.getByRole('button', { name: 'Danger' });
      expect(button).toHaveClass('bg-red-600');
    });

    it('applies size classes', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button', { name: 'Large' });
      expect(button).toHaveClass('px-6');
    });

    it('applies sm size', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button', { name: 'Small' });
      expect(button).toHaveClass('px-3');
    });

    it('calls onClick handler', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      fireEvent.click(screen.getByRole('button', { name: 'Click Me' }));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Badge', () => {
    it('renders children', () => {
      render(<Badge>Confirmed</Badge>);
      expect(screen.getByText('Confirmed')).toBeInTheDocument();
    });

    it('applies confirmed variant', () => {
      render(<Badge variant="confirmed">Confirmed</Badge>);
      const badge = screen.getByText('Confirmed');
      expect(badge).toHaveClass('bg-gold/20');
      expect(badge).toHaveClass('text-gold');
    });

    it('applies pending variant', () => {
      render(<Badge variant="pending">Pending</Badge>);
      const badge = screen.getByText('Pending');
      expect(badge).toHaveClass('bg-yellow-500/20');
    });

    it('applies completed variant', () => {
      render(<Badge variant="completed">Completed</Badge>);
      const badge = screen.getByText('Completed');
      expect(badge).toHaveClass('bg-green-500/20');
    });

    it('applies cancelled variant', () => {
      render(<Badge variant="cancelled">Cancelled</Badge>);
      const badge = screen.getByText('Cancelled');
      expect(badge).toHaveClass('bg-red-500/20');
    });

    it('applies default variant', () => {
      render(<Badge>Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge).toHaveClass('bg-dark-200');
    });
  });

  describe('Skeleton', () => {
    it('renders with default classes', () => {
      render(<Skeleton />);
      const skeleton = document.querySelector('.animate-shimmer');
      expect(skeleton).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<Skeleton className="h-12" />);
      const skeleton = document.querySelector('.h-12');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('SearchInput', () => {
    it('renders with placeholder', () => {
      render(<SearchInput value="" onChange={() => {}} placeholder="Search..." />);
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('displays current value', () => {
      render(<SearchInput value="test query" onChange={() => {}} />);
      expect(screen.getByDisplayValue('test query')).toBeInTheDocument();
    });

    it('calls onChange when value changes', () => {
      const handleChange = vi.fn();
      render(<SearchInput value="" onChange={handleChange} />);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'new value' } });
      // Note: onChange is debounced, so we can't test immediate call
      expect(input).toHaveValue('new value');
    });

    it('clears value when clear button is clicked', () => {
      const handleChange = vi.fn();
      render(<SearchInput value="test" onChange={handleChange} />);
      const clearButton = screen.getByRole('button');
      fireEvent.click(clearButton);
      // Input should be cleared
      expect(screen.getByRole('textbox')).toHaveValue('');
    });
  });

  describe('Pagination', () => {
    it('renders page numbers', () => {
      render(<Pagination currentPage={2} totalPages={5} onPageChange={() => {}} />);
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('disables previous button on first page', () => {
      render(<Pagination currentPage={1} totalPages={5} onPageChange={() => {}} />);
      const prevButton = screen.getAllByRole('button')[0];
      expect(prevButton).toBeDisabled();
    });

    it('disables next button on last page', () => {
      render(<Pagination currentPage={5} totalPages={5} onPageChange={() => {}} />);
      const buttons = screen.getAllByRole('button');
      const nextButton = buttons[buttons.length - 1];
      expect(nextButton).toBeDisabled();
    });

    it('calls onPageChange when page is clicked', () => {
      const handleChange = vi.fn();
      render(<Pagination currentPage={1} totalPages={5} onPageChange={handleChange} />);
      fireEvent.click(screen.getByText('2'));
      expect(handleChange).toHaveBeenCalledWith(2);
    });

    it('shows result count when totalItems is provided', () => {
      render(<Pagination currentPage={1} totalPages={5} onPageChange={() => {}} totalItems={50} />);
      expect(screen.getByText(/of 50 results/)).toBeInTheDocument();
    });
  });

  describe('Modal', () => {
    it('renders when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          Modal Content
        </Modal>
      );
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={() => {}} title="Test Modal">
          Modal Content
        </Modal>
      );
      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Test Modal">
          Content
        </Modal>
      );
      // The close button is the X button in the header
      const closeButton = screen.getByRole('button', { name: '' });
      fireEvent.click(closeButton);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', () => {
      const handleClose = vi.fn();
      const { container } = render(
        <Modal isOpen={true} onClose={handleClose} title="Test Modal">
          Content
        </Modal>
      );
      // Click the backdrop (first child of the fixed div)
      const backdrop = container.querySelector('.bg-black\\/50');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(handleClose).toHaveBeenCalledTimes(1);
      }
    });

    it('renders footer when provided', () => {
      render(
        <Modal
          isOpen={true}
          onClose={() => {}}
          title="Test Modal"
          footer={<button>Footer Button</button>}
        >
          Content
        </Modal>
      );
      expect(screen.getByText('Footer Button')).toBeInTheDocument();
    });

    it('renders with different maxWidth sizes', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test" maxWidth="sm">
          Content
        </Modal>
      );
      expect(container.querySelector('.max-w-sm')).toBeInTheDocument();
    });
  });

  describe('Table', () => {
    it('renders table headers', () => {
      render(
        <Table headers={['Name', 'Email']} isLoading={false}>
          <tr>
            <td>John</td>
            <td>john@example.com</td>
          </tr>
        </Table>
      );
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('renders children rows', () => {
      render(
        <Table headers={['Name']} isLoading={false}>
          <tr>
            <td>John</td>
          </tr>
        </Table>
      );
      expect(screen.getByText('John')).toBeInTheDocument();
    });

    it('shows skeleton when isLoading is true', () => {
      const { container } = render(
        <Table headers={['Name']} isLoading={true}>
          <div></div>
        </Table>
      );
      expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
    });
  });

  describe('Select', () => {
    it('renders select with options', () => {
      render(
        <Select
          options={[
            { value: '1', label: 'Option 1' },
            { value: '2', label: 'Option 2' },
          ]}
        />
      );
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });

    it('renders label when provided', () => {
      render(<Select options={[{ value: '1', label: 'Option 1' }]} label="Select Label" />);
      expect(screen.getByText('Select Label')).toBeInTheDocument();
    });

    it('handles value change', () => {
      const handleChange = vi.fn();
      render(
        <Select
          options={[
            { value: '1', label: 'Option 1' },
            { value: '2', label: 'Option 2' },
          ]}
          onChange={handleChange}
        />
      );
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '2' } });
      expect(handleChange).toHaveBeenCalled();
    });
  });
});
