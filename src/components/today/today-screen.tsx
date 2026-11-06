"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { addDays, fullDayLabel, relativeDayLabel } from "@/lib/domain/dates";
import { useCurrentGoals, useToday } from "@/lib/data/hooks";
import { useAppUI } from "@/components/shell/app-ui";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { SummaryCardSkeleton } from "./summary-card";
import { DayView } from "./day-view";
import { GoalsSheet } from "./goals-sheet";

export function TodayScreen() {
  const today = useToday();
  const { viewDate, setViewDate } = useAppUI();
  const [goalsOpen, setGoalsOpen] = useState(false);
  // viewDate from an earlier day automatically falls back to today at midnight
  // only if the user was following today (viewDate === null).
  const date = viewDate ?? today;
  const goals = useCurrentGoals(today);

  if (!today || !date) {
    return (
      <>
        <PageHeader title="Today" subtitle={" "} />
        <SummaryCardSkeleton />
      </>
    );
  }

  const go = (d: string) => setViewDate(d === today ? null : d);
  const isToday = date === today;

  return (
    <>
      <PageHeader
        title={relativeDayLabel(date, today)}
        subtitle={isToday || date === addDays(today, -1) ? fullDayLabel(date) : null}
        actions={
          <>
            {!isToday ? (
              <Button variant="subtle" size="sm" onClick={() => go(today)}>
                Today
              </Button>
            ) : null}
            {isToday && goals ? (
              <Button variant="subtle" size="sm" onClick={() => setGoalsOpen(true)}>
                <SlidersHorizontal aria-hidden /> Goals
              </Button>
            ) : null}
            <Button variant="ghost" size="icon" aria-label="Previous day" onClick={() => go(addDays(date, -1))}>
              <ChevronLeft aria-hidden />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Next day" disabled={isToday} onClick={() => go(addDays(date, 1))}>
              <ChevronRight aria-hidden />
            </Button>
          </>
        }
      />
      <DayView date={date} today={today} onSelectDate={go} />
      {goals ? <GoalsSheet open={goalsOpen} onOpenChange={setGoalsOpen} goals={goals} effectiveDate={today} /> : null}
    </>
  );
}
