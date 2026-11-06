"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ChartColumn, House, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToday } from "@/lib/data/hooks";
import { useAppUI } from "./app-ui";

const ITEMS = [
  { href: "/", label: "Today", icon: House },
  { href: "/history", label: "History", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: ChartColumn },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** The day "Add food" logs to: the day open on Today, else today. */
function useAddTarget() {
  const pathname = usePathname();
  const { viewDate } = useAppUI();
  const today = useToday();
  return pathname === "/" && viewDate ? viewDate : today;
}

export function BottomNav() {
  const pathname = usePathname();
  const { openAddFood } = useAppUI();
  const target = useAddTarget();

  const link = (item: (typeof ITEMS)[number]) => {
    const active = isActive(pathname, item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
          active ? "text-foreground" : "text-subtle-foreground hover:text-muted-foreground",
        )}
      >
        <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} aria-hidden />
        {item.label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/92 pb-safe backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch px-2">
        {ITEMS.slice(0, 2).map(link)}
        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            aria-label="Add food"
            disabled={!target}
            onClick={() => target && openAddFood(target)}
            className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground transition-transform active:scale-95 disabled:opacity-50"
          >
            <Plus className="size-6" strokeWidth={2.4} aria-hidden />
          </button>
        </div>
        {ITEMS.slice(2).map(link)}
      </div>
    </nav>
  );
}

export function SideNav() {
  const pathname = usePathname();
  const { openAddFood } = useAppUI();
  const target = useAddTarget();
  return (
    <nav aria-label="Primary" className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-1 border-r border-border px-3 py-6 md:flex">
      <div className="mb-6 flex items-center gap-2 px-3">
        <span aria-hidden className="size-5 rounded-full border-[3px] border-accent" />
        <span className="text-[15px] font-semibold tracking-[-0.01em]">Everyday</span>
      </div>
      <button
        type="button"
        disabled={!target}
        onClick={() => target && openAddFood(target)}
        className="mb-4 flex h-10 items-center gap-2 rounded-[10px] bg-accent px-3 text-[15px] font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Plus className="size-[18px]" aria-hidden /> Add food
      </button>
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 items-center gap-3 rounded-[10px] px-3 text-[15px] font-medium transition-colors",
              active ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:bg-surface-2/60 hover:text-foreground",
            )}
          >
            <Icon className="size-[18px]" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
