import type { HTMLAttributes } from 'react';
import { cn } from './cn';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'muted' | 'success' | 'danger';
}

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  const variants = {
    default: 'border-primary/20 bg-primary/10 text-primary',
    muted: 'border-white/10 bg-white/5 text-on-surface-variant',
    success: 'border-tertiary/20 bg-tertiary/10 text-tertiary',
    danger: 'border-error/20 bg-error/10 text-error',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
