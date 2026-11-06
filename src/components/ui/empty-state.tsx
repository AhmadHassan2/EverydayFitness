import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-8 text-center", className)}>
      {icon ? <div className="mb-3 text-subtle-foreground [&_svg]:size-6">{icon}</div> : null}
      <p className="text-[15px] font-medium">{title}</p>
      {description ? <p className="mt-1 max-w-72 text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
