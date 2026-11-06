import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex items-end justify-between gap-3 pb-4 pt-[max(16px,env(safe-area-inset-top))] md:pt-8", className)}>
      <div className="min-w-0">
        <h1 className="truncate text-[28px] font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
        {subtitle ? <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
    </header>
  );
}
