import { cn } from "@/lib/utils";
import type * as React from "react";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      spellCheck={false}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-ring/50 ring-ring/10 transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive/60 aria-invalid:outline-destructive/60 aria-invalid:outline-destructive/60 aria-invalid:ring-destructive/20 aria-invalid:ring-destructive/20 aria-invalid:focus-visible:outline-none aria-invalid:focus-visible:ring-[3px] md:text-sm dark:outline-ring/40 dark:ring-ring/20 dark:aria-invalid:border-destructive dark:aria-invalid:outline-destructive dark:aria-invalid:outline-destructive dark:aria-invalid:ring-destructive/40 dark:aria-invalid:ring-destructive/50 dark:aria-invalid:focus-visible:ring-4",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
