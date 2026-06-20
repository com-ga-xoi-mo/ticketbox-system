import React from 'react';
import { cn } from './cn';
import { FieldError } from './FieldError';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: string;
  suffix?: React.ReactNode;
  error?: string;
  label?: string;
}

export function Input({ icon, suffix, error, label, id, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={id}
          className="block font-label text-label-sm text-on-surface-variant uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span
            className="material-symbols-outlined absolute left-3 select-none text-[20px] text-outline"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <input
          id={id}
          aria-invalid={!!error || undefined}
          autoComplete={props.autoComplete ?? 'off'}
          className={cn(
            'input-dark w-full rounded-lg py-3 text-sm text-on-surface placeholder:text-outline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
            error && 'border-error',
            icon ? 'pl-10' : 'pl-3',
            suffix ? 'pr-10' : 'pr-3',
            className,
          )}
          {...props}
        />
        {suffix && <span className="absolute right-3 flex items-center">{suffix}</span>}
      </div>
      <FieldError message={error} />
    </div>
  );
}
