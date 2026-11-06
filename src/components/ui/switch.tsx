"use client";

import { Switch as S } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: ComponentProps<typeof S.Root>) {
  return (
    <S.Root
      className={cn(
        "relative inline-flex h-[28px] w-[46px] shrink-0 items-center rounded-full bg-border-strong transition-colors data-[state=checked]:bg-accent",
        className,
      )}
      {...props}
    >
      <S.Thumb className="block size-6 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 data-[state=checked]:translate-x-[20px]" />
    </S.Root>
  );
}
