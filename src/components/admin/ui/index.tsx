// Shared UI components for admin dashboard
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

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
