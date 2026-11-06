"use client";

import { useMemo, useState } from "react";
import type { ISODate } from "@/lib/domain/types";
import { addDays, datesBetween, fullDayLabel, monthGrid, startOfMonth } from "@/lib/domain/dates";
import { buildDaySummaries, summarizeRange } from "@/lib/domain/analytics";
import { pluralize } from "@/lib/domain/format";
import { useEntries, useGoalHistory, useToday, useWorkouts } from "@/lib/data/hooks";
import { PageHeader } from "@/components/shell/page-header";
import { SectionLabel } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DayView } from "@/components/today/day-view";
import { MonthCalendar } from "./month-calendar";

export function HistoryScreen() {
  const today = useToday();
  if (!today) {
    return (
      <>
        <PageHeader title="History" subtitle={" "} />
        <Skeleton className="h-[420px] rounded-[var(--radius)]" />
      </>
    );
  }
  return <History today={today} />;
}

function History({ today }: { today: ISODate }) {
  const [month, setMonth] = useState(startOfMonth(today));
  const [selected, setSelected] = useState<ISODate>(addDays(today, -1));

  const grid = monthGrid(month);
  const from = grid[0][0].date;
  const to = grid[grid.length - 1][6].date;
  const entries = useEntries(from, to, { keepPrevious: true });
  const workouts = useWorkouts(from, to, { keepPrevious: true });
  const goals = useGoalHistory();

  const days = useMemo(() => {
    const list = buildDaySummaries(datesBetween(from, to), entries.data ?? [], goals.data ?? [], workouts.data ?? []);
    return new Map(list.map((d) => [d.date, d]));
  }, [from, to, entries.data, goals.data, workouts.data]);

  const monthStats = useMemo(() => {
    const inMonth = [...days.values()].filter((d) => d.date.startsWith(month.slice(0, 7)) && d.date <= today);
    return summarizeRange(inMonth);
  }, [days, month, today]);

  return (
    <>
      <PageHeader
        title="History"
        subtitle={
          entries.isPending || workouts.isPending
            ? " "
            : `${pluralize(monthStats.trainedDays, "training day")} · ${monthStats.loggedDays} of ${monthStats.days} days logged`
        }
      />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div className="lg:sticky lg:top-6">
        <MonthCalendar
          month={month}
          onMonthChange={setMonth}
          selected={selected}
          onSelect={setSelected}
          today={today}
          days={days}
          loading={entries.isPending || workouts.isPending}
        />
        </div>
        <div className="grid gap-3">
        <SectionLabel className="mt-3 lg:mt-0">{fullDayLabel(selected)}</SectionLabel>
        <DayView
          date={selected}
          today={today}
          layout="stack"
          onSelectDate={(d) => {
            setSelected(d);
            if (startOfMonth(d) !== startOfMonth(month)) setMonth(startOfMonth(d));
          }}
        />
        </div>
      </div>
    </>
  );
}
