import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        // 16px text prevents iOS Safari from zooming into focused inputs.
        "h-11 w-full min-w-0 rounded-[10px] border border-input bg-surface px-3 text-base text-foreground outline-none transition-colors placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 aria-invalid:border-destructive aria-invalid:ring-destructive/15 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-20 w-full rounded-[10px] border border-input bg-surface px-3 py-2.5 text-base text-foreground outline-none transition-colors placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}
