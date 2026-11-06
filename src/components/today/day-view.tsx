"use client";

import { CopyPlus, Plus, Utensils } from "lucide-react";
import { toast } from "sonner";
import type { ISODate } from "@/lib/domain/types";
import { addDays, timeInZone, zonedToUtc } from "@/lib/domain/dates";
import { goalForDate } from "@/lib/domain/goals";
import { energyLabel, formatEnergy, pluralize } from "@/lib/domain/format";
import { sumNutrition } from "@/lib/domain/totals";
import { entryToInput, useAddEntries, useEntries, useGoalHistory, useProfile, useTimeZone } from "@/lib/data/hooks";
import { useAppUI } from "@/components/shell/app-ui";
import { Button } from "@/components/ui/button";
import { Card, SectionLabel } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TrainingCard } from "@/components/workout/training-card";
import { MealList, MealListSkeleton } from "./meal-list";
import { SummaryCard, SummaryCardSkeleton } from "./summary-card";

/** Everything about one day: progress, training, and what was eaten. Used by Today and History. */
export function DayView({
  date,
  today,
  onSelectDate,
  layout = "split",
}: {
  date: ISODate;
  today: ISODate;
  onSelectDate?: (d: ISODate) => void;
  /** `split` puts food beside the summary on wide screens; `stack` always stacks. */
  layout?: "split" | "stack";
}) {
  const prev = addDays(date, -1);
  const entriesQ = useEntries(prev, date);
  const goalsQ = useGoalHistory();
  const profile = useProfile();
  const tz = useTimeZone();
  const add = useAddEntries();
  const { openAddFood } = useAppUI();

  const unit = profile.data?.energyUnit ?? "kcal";
  const all = entriesQ.data ?? [];
  const entries = all.filter((e) => e.date === date);
  const previous = all.filter((e) => e.date === prev);
  const goals = goalsQ.data ? goalForDate(goalsQ.data, date) : null;
  const loading = entriesQ.isPending || goalsQ.isPending;

  const copyPrevious = () => {
    const inputs = previous.map((e) =>
      entryToInput(e, {
        date,
        loggedAt: zonedToUtc(date, timeInZone(new Date(e.loggedAt), tz), tz).toISOString(),
        source: "copied",
      }),
    );
    add.mutate(inputs, {
      onSuccess: (created) => toast.success(`Copied ${pluralize(created.length, "item")}`),
      onError: (e) => toast.error("Couldn't copy entries", { description: e.message }),
    });
  };

  return (
    <div className={layout === "split" ? "grid gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-6" : "grid gap-3"}>
      <div className={layout === "split" ? "grid gap-3 lg:sticky lg:top-6" : "grid gap-3"}>
      {entriesQ.isError ? (
        <Card className="p-4">
          <p className="text-[15px] font-medium">Couldn&apos;t load this day</p>
          <p className="mt-1 text-sm text-muted-foreground">{entriesQ.error.message}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => entriesQ.refetch()}>
            Try again
          </Button>
        </Card>
      ) : loading ? (
        <SummaryCardSkeleton />
      ) : goals ? (
        <SummaryCard entries={entries} goals={goals} unit={unit} />
      ) : null}

      <TrainingCard date={date} today={today} onSelectDate={onSelectDate} />
      </div>

      <div className="grid gap-3">
      <div className={layout === "split" ? "mt-2 flex items-center justify-between lg:mt-0 lg:min-h-5" : "mt-2 flex items-center justify-between"}>
        <SectionLabel>Food</SectionLabel>
        {entries.length > 0 ? (
          <span className="pr-1 text-[13px] text-muted-foreground tnum">
            {pluralize(entries.length, "item")} · {formatEnergy(sumNutrition(entries).calories, unit)} {energyLabel(unit)}
          </span>
        ) : null}
      </div>

      {loading ? (
        <MealListSkeleton />
      ) : entries.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Utensils aria-hidden />}
            title={date === today ? "Nothing logged yet today" : date > today ? "This day hasn't happened yet" : "Nothing logged this day"}
            description={
              date > today
                ? "You can still plan ahead by adding food."
                : "Days without food entries are left out of averages, not counted as zero."
            }
            action={
              <div className="flex flex-col items-center gap-2">
                <Button onClick={() => openAddFood(date)}>
                  <Plus aria-hidden /> Add food
                </Button>
                {previous.length > 0 ? (
                  <Button variant="ghost" size="sm" onClick={copyPrevious} disabled={add.isPending}>
                    <CopyPlus aria-hidden /> Copy previous day ({pluralize(previous.length, "item")})
                  </Button>
                ) : null}
              </div>
            }
          />
        </Card>
      ) : (
        <MealList entries={entries} date={date} unit={unit} timeZone={tz} />
      )}
      </div>
    </div>
  );
}
