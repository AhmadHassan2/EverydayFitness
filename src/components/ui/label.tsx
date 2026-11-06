import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label data-slot="label" className={cn("text-[13px] font-medium text-muted-foreground", className)} {...props} />;
}

export function FieldError({ children, id }: { children?: string; id?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="text-[13px] text-destructive">
      {children}
    </p>
  );
}
