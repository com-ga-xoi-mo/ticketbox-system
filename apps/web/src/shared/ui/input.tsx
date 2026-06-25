import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/shared/ui/cn"
import { FieldError } from "./FieldError"

export interface InputProps extends React.ComponentProps<"input"> {
  icon?: string;
  suffix?: React.ReactNode;
  error?: string;
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, suffix, error, label, id, ...props }, ref) => {
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
          <InputPrimitive
            ref={ref}
            id={id}
            type={type}
            data-slot="input"
            aria-invalid={!!error || undefined}
            className={cn(
              "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
              icon ? 'pl-10' : '',
              suffix ? 'pr-10' : '',
              className
            )}
            {...props}
          />
          {suffix && <span className="absolute right-3 flex items-center">{suffix}</span>}
        </div>
        <FieldError message={error} />
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
