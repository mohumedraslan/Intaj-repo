// Minimal Shadcn-style Button component for MVP
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'px-4 py-2 rounded font-medium transition-colors',
          variant === 'destructive'
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-primary text-white hover:bg-primary/90',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
