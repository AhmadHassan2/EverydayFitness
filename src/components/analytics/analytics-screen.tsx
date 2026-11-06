"use client";

import { useMemo, useState } from "react";
import { ChartColumn } from "lucide-react";
import type { ISODate, WorkoutLog } from "@/lib/domain/types";
import { addDays, rangeEnding, longDayLabel, shortDateLabel } from "@/lib/domain/dates";
import {
  buildDaySummaries,
  dailySeries,
  monthlyConsistency,
  summarizeRange,
  weeklyBuckets,
  type RangeSummary,
} from "@/lib/domain/analytics";
import { buildWeekStrip, indexByDate } from "@/lib/domain/workout";
import { energyLabel, formatEnergy, formatGrams, formatNumber, formatPercent, pluralize } from "@/lib/domain/format";
import { useEntries, useGoalHistory, useProfile, useToday, useWorkouts } from "@/lib/data/hooks";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { WeekStrip } from "@/components/workout/week-strip";
import { ChartCard, DataTable, Legend } from "./chart-card";
import { CaloriesChart, MacroSplit, MonthlyConsistency, ProteinChart, TrainingWeeksChart, WeeklyCaloriesChart } from "./charts";

const RANGES = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
] as const;
type Range = (typeof RANGES)[number]["value"];

export function AnalyticsScreen() {
  const today = useToday();
  const [range, setRange] = useState<Range>("30");
  return (
    <>
      <PageHeader title="Analytics" subtitle={today ? rangeSubtitle(today, Number(range)) : " "} />
      <div className="sticky top-0 z-10 -mx-4 bg-background/92 px-4 pb-3 pt-1 backdrop-blur-xl md:static md:mx-0 md:max-w-sm md:bg-transparent md:px-0 md:backdrop-blur-none">
        <Segmented label="Date range" value={range} onValueChange={setRange} options={[...RANGES]} />
      </div>
      {today ? <Analytics today={today} days={Number(range)} /> : <AnalyticsSkeleton />}
    </>
  );
}

/**
 * Ranges cover the last N *complete* days, ending yesterday. Today is still in
 * progress, so including it would drag averages down every morning.
 */
function completeRange(today: ISODate, days: number) {
  return rangeEnding(addDays(today, -1), days);
}

function rangeSubtitle(today: ISODate, days: number) {
  const { from, to } = completeRange(today, days);
  return `${shortDateLabel(from)} – ${shortDateLabel(to)} · today is added once it's over`;
}

function Analytics({ today, days }: { today: ISODate; days: number }) {
  const { from, to, dates } = completeRange(today, days);
  const entries = useEntries(from, to, { keepPrevious: true });
  const workouts = useWorkouts(from, to, { keepPrevious: true });
  const goals = useGoalHistory();
  const profile = useProfile();
  const unit = profile.data?.energyUnit ?? "kcal";
  const u = energyLabel(unit);

  const model = useMemo(() => {
    if (!entries.data || !workouts.data || !goals.data) return null;
    const summaries = buildDaySummaries(dates, entries.data, goals.data, workouts.data);
    return {
      summaries,
      summary: summarizeRange(summaries),
      series: dailySeries(summaries),
      weeks: weeklyBuckets(summaries),
      months: monthlyConsistency(summaries),
    };
    // `dates` is derived from from/to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, entries.data, workouts.data, goals.data]);

  if (entries.isError || workouts.isError) {
    return (
      <Card>
        <EmptyState title="Couldn't load analytics" description={(entries.error ?? workouts.error)?.message} />
      </Card>
    );
  }
  if (!model) return <AnalyticsSkeleton />;

  const { summary: s, series, weeks, months } = model;
  const refetching = entries.isPlaceholderData || workouts.isPlaceholderData;

  if (s.loggedDays === 0 && s.trainedDays + s.restDays === 0) {
    return (
      <Card>
        <EmptyState
          icon={<ChartColumn aria-hidden />}
          title="Nothing to chart yet"
          description={`Nothing was logged in the ${days} days before today. Trends appear here once you log food or training.`}
        />
      </Card>
    );
  }

  return (
    <div className={refetching ? "grid gap-3 opacity-60 transition-opacity lg:grid-cols-2 lg:gap-4" : "grid gap-3 transition-opacity lg:grid-cols-2 lg:gap-4"}>
      <StatGrid s={s} unit={unit} />

      <ChartCard
        title="Daily intake"
        subtitle={`${s.loggedDays} of ${s.days} days logged`}
        legend={
          <Legend
            items={[
              { label: u, swatch: "bar", color: "var(--accent)" },
              { label: "Goal", swatch: "line", color: "var(--muted-foreground)" },
            ]}
          />
        }
        chart={<CaloriesChart data={series} unit={unit} />}
        table={
          <DataTable
            head={["Day", u, "Goal"]}
            rows={[...series].reverse().map((p) => [
              longDayLabel(p.date, today),
              p.calories === null ? "Not logged" : formatEnergy(p.calories, unit),
              p.calorieTarget === null ? "—" : formatEnergy(p.calorieTarget, unit),
            ])}
          />
        }
        footnote="Gaps are days with nothing logged. They're left out of averages rather than counted as zero."
      />

      {days > 7 ? (
        <ChartCard
          title="Weekly average"
          subtitle="Average over logged days in each Monday–Sunday week"
          chart={<WeeklyCaloriesChart weeks={weeks} unit={unit} />}
          table={
            <DataTable
              head={["Week of", `Avg ${u}`, "Logged"]}
              rows={[...weeks].reverse().map((w) => [
                shortDateLabel(w.weekStart),
                w.avgCalories === null ? "—" : formatEnergy(w.avgCalories, unit),
                `${w.loggedDays}/${w.daysInRange}`,
              ])}
            />
          }
        />
      ) : null}

      <ChartCard
        title="Protein"
        subtitle={
          s.proteinGoalMet.ratio === null
            ? "No logged days in this range"
            : `Goal met on ${s.proteinGoalMet.count} of ${pluralize(s.proteinGoalMet.of, "logged day")}`
        }
        legend={
          <Legend
            items={[
              { label: "Protein (g)", swatch: "line", color: "var(--protein)" },
              { label: "Goal", swatch: "line", color: "var(--muted-foreground)" },
            ]}
          />
        }
        chart={<ProteinChart data={series} />}
        table={
          <DataTable
            head={["Day", "Protein", "Goal"]}
            rows={[...series].reverse().map((p) => [
              longDayLabel(p.date, today),
              p.protein === null ? "Not logged" : `${formatGrams(p.protein)} g`,
              p.proteinTarget === null ? "—" : `${formatGrams(p.proteinTarget)} g`,
            ])}
          />
        }
      />

      {s.macroSplit ? (
        <ChartCard
          title="Macro balance"
          subtitle="Share of energy from each macro, logged days"
          chart={<MacroSplit split={s.macroSplit} avgGrams={{ protein: s.avgProtein, carbs: s.avgCarbs, fat: s.avgFat }} />}
          footnote="Uses 4 kcal/g for protein and carbs, 9 kcal/g for fat."
        />
      ) : null}

      {days <= 7 ? (
        <TrainingWeek today={today} workouts={workouts.data ?? []} s={s} />
      ) : (
        <ChartCard
          title="Training days per week"
          subtitle={`${pluralize(s.trainedDays, "session")} · ${s.trainingPerWeek} per week on average`}
          chart={<TrainingWeeksChart weeks={weeks} />}
          table={
            <DataTable
              head={["Week of", "Trained", "Rest"]}
              rows={[...weeks].reverse().map((w) => [shortDateLabel(w.weekStart), w.trainedDays, w.restDays])}
            />
          }
          footnote={s.unmarkedDays > 0 ? `${pluralize(s.unmarkedDays, "day")} in this range have no training status.` : undefined}
        />
      )}

      {days > 7 ? (
        <ChartCard
          title="Monthly consistency"
          subtitle="Trained days out of days in range"
          chart={<MonthlyConsistency months={months} />}
        />
      ) : null}
    </div>
  );
}

function TrainingWeek({ today, workouts, s }: { today: ISODate; workouts: WorkoutLog[]; s: RangeSummary }) {
  const { dates } = completeRange(today, 7);
  // A rolling 7-day window, shown as a strip (it rarely aligns with Mon–Sun).
  const strip = buildWeekStrip(dates, indexByDate(workouts), today);
  return (
    <Card className="p-4">
      <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Training</h2>
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        {pluralize(s.trainedDays, "session")} · {pluralize(s.restDays, "rest day")}
        {s.unmarkedDays ? ` · ${s.unmarkedDays} not logged` : ""}
      </p>
      <div className="mt-4">
        <WeekStrip days={strip} />
      </div>
    </Card>
  );
}

function StatGrid({ s, unit }: { s: RangeSummary; unit: "kcal" | "kj" }) {
  const u = energyLabel(unit);
  return (
    <div className="grid grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-4">
      <Stat
        label="Avg intake"
        value={s.avgCalories === null ? "—" : formatEnergy(s.avgCalories, unit)}
        unit={s.avgCalories === null ? undefined : u}
        note={s.avgCalorieTarget === null ? `${s.loggedDays} of ${s.days} days logged` : `Goal ${formatEnergy(s.avgCalorieTarget, unit)} · ${s.loggedDays}/${s.days} logged`}
      />
      <Stat
        label="Avg protein"
        value={s.avgProtein === null ? "—" : formatGrams(s.avgProtein)}
        unit={s.avgProtein === null ? undefined : "g"}
        note={s.avgProteinTarget === null ? "No logged days" : `Goal ${formatGrams(s.avgProteinTarget)} g`}
      />
      <Stat
        label="On target"
        value={s.calorieAdherence.ratio === null ? "—" : formatPercent(s.calorieAdherence.ratio)}
        note={
          s.calorieAdherence.ratio === null
            ? "Within ±10% of goal"
            : `${s.calorieAdherence.count} of ${s.calorieAdherence.of} logged days within ±10%`
        }
      />
      <Stat
        label="Training"
        value={formatNumber(s.trainedDays)}
        unit={s.trainedDays === 1 ? "day" : "days"}
        note={`${s.trainingPerWeek} per week`}
      />
    </div>
  );
}

function Stat({ label, value, unit, note }: { label: string; value: string; unit?: string; note: string }) {
  return (
    <Card className="p-4">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-[24px] font-semibold leading-none tracking-[-0.02em]">
        {value}
        {unit ? <span className="ml-1 text-sm font-normal text-subtle-foreground">{unit}</span> : null}
      </p>
      <p className="mt-2 text-xs leading-snug text-muted-foreground">{note}</p>
    </Card>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="grid gap-3" aria-busy>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[104px] rounded-[var(--radius)]" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-[var(--radius)]" />
      <Skeleton className="h-64 rounded-[var(--radius)]" />
    </div>
  );
}
