import * as React from "react"

import { cn } from "@/shared/ui/cn"
import { FieldError } from "./FieldError"

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  error?: string;
  label?: string;
}

function Textarea({ className, error, label, id, ...props }: TextareaProps) {
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
        data-slot="textarea"
        aria-invalid={!!error || undefined}
        className={cn(
          "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className
        )}
        {...props}
      />
      <FieldError message={error} />
    </div>
  )
}

export { Textarea }
