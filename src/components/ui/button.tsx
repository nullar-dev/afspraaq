import * as React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

function Button({ className, variant = 'default', size = 'default', ...props }: ButtonProps) {
  return (
    <button
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        // variant: default
        'bg-primary text-primary-foreground hover:bg-primary/90',
        // size: default
        'h-9 px-4 py-2',
        className
      )}
      {...props}
    />
  );
}

export { Button };
