import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("rounded-[var(--radius)] border border-border bg-surface", className)} {...props} />;
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex items-center justify-between gap-3 px-4 pt-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cn("text-[15px] font-semibold tracking-[-0.01em]", className)} {...props} />;
}

export function SectionLabel({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cn("px-1 text-[13px] font-medium text-muted-foreground", className)} {...props} />;
}
