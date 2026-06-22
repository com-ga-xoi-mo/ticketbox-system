import React from 'react';
import { cn } from './cn';
import { FieldError } from './FieldError';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
}

export function Textarea({ error, label, id, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={id}
          className="block font-label text-label-sm uppercase tracking-wider text-on-surface-variant"
        >
          {label}
        </label>
      )}
      <textarea
        id={id}
        aria-invalid={!!error || undefined}
        autoComplete={props.autoComplete ?? 'off'}
        className={cn(
          'input-dark w-full resize-none rounded-lg px-3 py-3 text-sm text-on-surface placeholder:text-outline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
          error && 'border-error',
          className,
        )}
        {...props}
      />
      <FieldError message={error} />
    </div>
  );
}
