"use client";

import { Check, Minus } from "lucide-react";
import type { ISODate } from "@/lib/domain/types";
import type { WeekStripDay } from "@/lib/domain/workout";
import { fullDayLabel, weekdayShort } from "@/lib/domain/dates";
import { cn } from "@/lib/utils";

const STATUS_TEXT = { trained: "trained", rest: "rest day", none: "not logged" } as const;

/** Mon–Sun row. Trained = filled check, rest = dash, not logged = empty ring. */
export function WeekStrip({
  days,
  selected,
  onSelect,
}: {
  days: WeekStripDay[];
  selected?: ISODate;
  onSelect?: (date: ISODate) => void;
}) {
  return (
    <ol className="grid grid-cols-7 gap-1" aria-label="This week's training">
      {days.map((d) => {
        const label = `${fullDayLabel(d.date)}: ${d.isFuture ? "upcoming" : STATUS_TEXT[d.status]}`;
        const marker = (
          <>
            <span className={cn("text-[11px] font-medium", d.isToday ? "text-foreground" : "text-subtle-foreground")}>
              {weekdayShort(d.date)}
            </span>
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full transition-colors",
                d.status === "trained" && "bg-accent text-accent-foreground",
                d.status === "rest" && "bg-surface-2 text-muted-foreground",
                d.status === "none" && !d.isFuture && "border border-border-strong",
                d.isFuture && "border border-dashed border-border",
                d.isToday && d.status === "none" && "border-foreground/40",
                selected === d.date && "ring-2 ring-foreground/70 ring-offset-2 ring-offset-surface",
              )}
            >
              {d.status === "trained" ? <Check className="size-4" strokeWidth={2.6} aria-hidden /> : null}
              {d.status === "rest" ? <Minus className="size-4" strokeWidth={2.4} aria-hidden /> : null}
            </span>
          </>
        );
        return (
          <li key={d.date} className="flex justify-center">
            {onSelect && !d.isFuture ? (
              <button
                type="button"
                aria-label={label}
                aria-pressed={selected === d.date}
                onClick={() => onSelect(d.date)}
                className="flex min-h-11 flex-col items-center gap-1 rounded-lg px-1 py-0.5"
              >
                {marker}
              </button>
            ) : (
              <span aria-label={label} role="img" className="flex flex-col items-center gap-1 px-1 py-0.5">
                {marker}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
