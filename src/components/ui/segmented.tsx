"use client";

import { ToggleGroup } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SegmentedProps<T extends string> {
  value: T | "";
  onValueChange: (value: T) => void;
  options: { value: T; label: ReactNode; ariaLabel?: string }[];
  label: string;
  className?: string;
  size?: "sm" | "md";
}

/** Single-select pill group (iOS segmented control). */
export function Segmented<T extends string>({ value, onValueChange, options, label, className, size = "md" }: SegmentedProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      aria-label={label}
      value={value}
      onValueChange={(v) => v && onValueChange(v as T)}
      className={cn("grid auto-cols-fr grid-flow-col gap-0.5 rounded-[10px] bg-surface-2 p-0.5", className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          aria-label={o.ariaLabel}
          className={cn(
            "rounded-lg px-2 font-medium text-muted-foreground transition-colors data-[state=on]:bg-surface data-[state=on]:text-foreground data-[state=on]:shadow-[0_1px_2px_rgb(0_0_0/0.08)] dark:data-[state=on]:bg-border-strong",
            size === "sm" ? "h-8 text-[13px]" : "h-9 text-sm",
          )}
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
