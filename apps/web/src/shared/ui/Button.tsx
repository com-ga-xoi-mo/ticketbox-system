import React from 'react';
import { cn } from './cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'icon';
}

export function Button({
  loading = false,
  variant = 'primary',
  size = 'md',
  disabled,
  children,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const base =
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50';

  const variants = {
    primary: 'btn-primary text-on-primary-container',
    ghost: 'text-on-surface-variant hover:bg-white/5 hover:text-on-surface',
    outline: 'border border-white/10 text-on-surface hover:bg-white/5',
    danger: 'border border-error/20 bg-error/10 text-error hover:bg-error/20',
  };

  const sizes = {
    sm: 'h-9 px-3 text-xs',
    md: 'h-10 px-4',
    icon: 'size-9 p-0',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading && (
        <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
