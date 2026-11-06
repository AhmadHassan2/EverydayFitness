"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ISODate } from "@/lib/domain/types";
import type { DaySummary } from "@/lib/domain/analytics";
import { addMonths, fullDayLabel, monthGrid, monthLabel, parseISODate, startOfMonth } from "@/lib/domain/dates";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function MonthCalendar({
  month,
  onMonthChange,
  selected,
  onSelect,
  today,
  days,
  loading,
}: {
  month: ISODate;
  onMonthChange: (m: ISODate) => void;
  selected: ISODate;
  onSelect: (d: ISODate) => void;
  today: ISODate;
  days: Map<ISODate, DaySummary>;
  loading: boolean;
}) {
  const grid = monthGrid(month);
  const isCurrentMonth = startOfMonth(month) === startOfMonth(today);

  return (
    <Card className="p-3 pb-4">
      <div className="flex items-center justify-between pb-2 pl-2">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]" aria-live="polite">
          {monthLabel(month)}
        </h2>
        <div className="flex">
          <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => onMonthChange(addMonths(startOfMonth(month), -1))}>
            <ChevronLeft aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next month"
            disabled={isCurrentMonth}
            onClick={() => onMonthChange(addMonths(startOfMonth(month), 1))}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </div>

      <div role="grid" aria-label={monthLabel(month)} aria-busy={loading || undefined} className="grid gap-1">
        <div role="row" className="grid grid-cols-7">
          {WEEKDAYS.map((d, i) => (
            <span key={i} role="columnheader" className="py-1 text-center text-[11px] font-medium text-subtle-foreground">
              {d}
            </span>
          ))}
        </div>
        {grid.map((week, wi) => (
          <div role="row" key={wi} className="grid grid-cols-7">
            {week.map((cell) => {
              if (!cell.inMonth) return <span key={cell.date} role="gridcell" aria-hidden />;
              const s = days.get(cell.date);
              const future = cell.date > today;
              const isSel = cell.date === selected;
              const status = s?.workout ?? "none";
              const label = [
                fullDayLabel(cell.date),
                s?.logged ? "food logged" : "no food logged",
                status === "trained" ? "trained" : status === "rest" ? "rest day" : null,
              ]
                .filter(Boolean)
                .join(", ");
              return (
                <div role="gridcell" key={cell.date} className="flex justify-center">
                  <button
                    type="button"
                    disabled={future}
                    aria-label={label}
                    aria-pressed={isSel}
                    onClick={() => onSelect(cell.date)}
                    className="flex h-12 w-11 flex-col items-center justify-center gap-1 rounded-xl transition-colors hover:bg-surface-2 disabled:opacity-35 disabled:hover:bg-transparent"
                  >
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full text-[14px] tnum",
                        status === "trained" && "bg-accent-soft font-semibold text-accent",
                        status === "rest" && "ring-1 ring-inset ring-border-strong",
                        cell.date === today && status === "none" && "font-semibold",
                        isSel && "bg-foreground text-background ring-0",
                      )}
                    >
                      {parseISODate(cell.date).day}
                    </span>
                    <span
                      aria-hidden
                      className={cn("size-1 rounded-full", s?.logged ? "bg-muted-foreground" : "bg-transparent")}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-full bg-accent-soft ring-1 ring-inset ring-accent/40" /> Trained
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-full ring-1 ring-inset ring-border-strong" /> Rest day
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-1 rounded-full bg-muted-foreground" /> Food logged
        </li>
      </ul>
    </Card>
  );
}
