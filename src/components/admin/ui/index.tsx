// Shared UI components for admin dashboard
// Note: Using controlled inputs for forms (no react-hook-form yet)
// TODO: Senior Engineer - Add react-hook-form + zod when connecting real backend

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  animate?: boolean;
}

export function Card({ children, className, hover = false, animate = false }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-dark-100 border border-dark-400 shadow-xl',
        hover && 'hover:border-gold/40 hover:shadow-gold transition-all duration-300',
        animate && 'animate-fade-in-up',
        className
      )}
    >
      {children}
    </div>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-gold text-dark hover:bg-gold-400 shadow-gold hover:shadow-gold-lg',
    secondary: 'bg-dark-200 text-white border border-dark-400 hover:border-gold/40',
    ghost: 'bg-transparent text-dark-900 hover:text-white hover:bg-dark-200',
    danger: 'bg-red-600 text-white hover:bg-red-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={cn(
        'rounded-xl font-medium transition-all duration-300',
        'hover:scale-[1.02] active:scale-[0.98]',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'default';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const variants = {
    confirmed: 'bg-gold/20 text-gold border-gold/30',
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
    default: 'bg-dark-200 text-dark-900 border-dark-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variants[variant]
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-shimmer bg-gradient-to-r from-dark-200 via-dark-300 to-dark-200',
        'bg-[length:200%_100%] rounded-lg',
        className
      )}
    />
  );
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  debounceMs = 300,
  className,
}: SearchInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onChangeRef.current(inputValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [inputValue, debounceMs]);

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-900" />
      <input
        type="text"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full pl-10 pr-10 py-2 rounded-xl bg-dark-200 border border-dark-400',
          'text-white placeholder:text-dark-900',
          'focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold',
          'transition-all duration-200'
        )}
      />
      {inputValue && (
        <button
          onClick={() => setInputValue('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-900 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showInfo?: boolean;
  totalItems?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showInfo = true,
  totalItems,
}: PaginationProps) {
  if (!Number.isFinite(totalPages) || totalPages <= 0) {
    return null;
  }

  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages = pages.slice(
    Math.max(0, safeCurrentPage - 3),
    Math.min(totalPages, safeCurrentPage + 2)
  );

  return (
    <div className="flex items-center justify-between gap-4">
      {showInfo && totalItems && (
        <span className="text-sm text-dark-900">
          Showing {Math.min((safeCurrentPage - 1) * 10 + 1, totalItems)} -{' '}
          {Math.min(safeCurrentPage * 10, totalItems)} of {totalItems} results
        </span>
      )}

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1}
          className={cn(
            'p-2 rounded-lg transition-colors',
            safeCurrentPage === 1
              ? 'text-dark-900 cursor-not-allowed'
              : 'hover:bg-dark-200 text-white'
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {visiblePages.map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={cn(
              'min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors',
              page === safeCurrentPage
                ? 'bg-gold text-dark'
                : 'hover:bg-dark-200 text-dark-900 hover:text-white'
            )}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage === totalPages}
          className={cn(
            'p-2 rounded-lg transition-colors',
            safeCurrentPage === totalPages
              ? 'text-dark-900 cursor-not-allowed'
              : 'hover:bg-dark-200 text-white'
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = 'md' }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full rounded-2xl bg-dark-100 border border-dark-400 shadow-2xl',
          'animate-fade-in-up',
          maxWidths[maxWidth]
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-400">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-dark-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-dark-400">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

interface TableProps {
  headers: string[];
  children: React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function Table({ headers, children, isLoading, className }: TableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-dark-400">
            {headers.map((header, i) => (
              <th key={i} className="text-left py-3 px-4 text-sm font-medium text-dark-900">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-400">{children}</tbody>
      </table>
    </div>
  );
}

interface SelectProps {
  options: Array<{ value: string; label: string }>;
  label?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  autoFocus?: boolean;
  className?: string;
}

export function Select({
  options,
  label,
  className,
  value,
  onChange,
  disabled,
  required,
  name,
  id,
  autoFocus,
}: SelectProps) {
  const selectValue = value ?? '';

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-dark-900 mb-1">{label}</label>}
      <select
        value={onChange ? selectValue : undefined}
        defaultValue={onChange ? undefined : selectValue}
        onChange={onChange}
        disabled={disabled}
        required={required}
        name={name}
        id={id}
        autoFocus={autoFocus}
        className={cn(
          'w-full px-3 py-2 rounded-xl bg-dark-200 border border-dark-400',
          'text-white',
          'focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold',
          'transition-all duration-200'
        )}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
