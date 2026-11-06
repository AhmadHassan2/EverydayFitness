"use client";

import { ChevronRight, Dumbbell, Moon } from "lucide-react";
import { toast } from "sonner";
import type { DayStatus, ISODate, WorkoutLog, WorkoutStatus } from "@/lib/domain/types";
import { WORKOUT_TYPE_LABELS } from "@/lib/domain/types";
import { buildWeekStrip, formatDuration, indexByDate, nextStatusOnTap } from "@/lib/domain/workout";
import { weekDates } from "@/lib/domain/dates";
import { useSetWorkout, useWorkouts } from "@/lib/data/hooks";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppUI } from "@/components/shell/app-ui";
import { cn } from "@/lib/utils";
import { WeekStrip } from "./week-strip";

function detailLine(log: WorkoutLog | undefined): string | null {
  if (!log || log.status !== "trained") return null;
  const parts = [log.workoutType ? WORKOUT_TYPE_LABELS[log.workoutType] : null, formatDuration(log.durationMin)].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** "Did you train?" with one-tap Trained / Rest day, plus the week strip. */
export function TrainingCard({
  date,
  today,
  showWeek = true,
  onSelectDate,
}: {
  date: ISODate;
  today: ISODate;
  showWeek?: boolean;
  onSelectDate?: (d: ISODate) => void;
}) {
  const week = weekDates(date);
  const workouts = useWorkouts(week[0], week[6]);
  const setWorkout = useSetWorkout();
  const { openWorkout } = useAppUI();

  const logs = indexByDate(workouts.data ?? []);
  const log = logs.get(date);
  const status: DayStatus = log?.status ?? "none";
  const isFuture = date > today;
  const details = detailLine(log);

  const tap = (tapped: WorkoutStatus) => {
    const next = nextStatusOnTap(status, tapped);
    const prev = log;
    setWorkout.mutate(
      {
        date,
        input:
          next === "none"
            ? null
            : {
                status: next,
                // Keep details when re-marking a trained day; rest days carry none.
                workoutType: next === "trained" ? (prev?.workoutType ?? null) : null,
                durationMin: next === "trained" ? (prev?.durationMin ?? null) : null,
                notes: prev?.notes ?? null,
              },
      },
      {
        onSuccess: () => {
          if (next === "none") toast("Marked as not logged");
          else if (next === "trained")
            toast.success("Marked as trained", { action: { label: "Add details", onClick: () => openWorkout(date) } });
          else toast.success("Marked as rest day");
        },
        onError: (e) => toast.error("Couldn't save training", { description: e.message }),
      },
    );
  };

  const question = date === today ? "Did you train today?" : "Did you train this day?";

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Training</h2>
          <p className="truncate text-[13px] text-muted-foreground">
            {workouts.isPending
              ? " "
              : status === "trained"
                ? (details ?? "Trained")
                : status === "rest"
                  ? "Rest day"
                  : isFuture
                    ? "Upcoming"
                    : question}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openWorkout(date)}
          disabled={isFuture}
          className="-mr-2 flex h-9 shrink-0 items-center gap-0.5 rounded-lg px-2 text-[13px] font-medium text-muted-foreground hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
        >
          {status === "trained" ? "Edit" : "Details"} <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Training status">
        <StatusButton
          active={status === "trained"}
          disabled={isFuture || workouts.isPending}
          onClick={() => tap("trained")}
          icon={<Dumbbell aria-hidden />}
          label="Trained"
          tone="accent"
        />
        <StatusButton
          active={status === "rest"}
          disabled={isFuture || workouts.isPending}
          onClick={() => tap("rest")}
          icon={<Moon aria-hidden />}
          label="Rest day"
          tone="neutral"
        />
      </div>

      {showWeek ? (
        <div className="mt-4 border-t border-border pt-3">
          {workouts.isPending ? (
            <Skeleton className="h-[52px]" />
          ) : (
            <WeekStrip days={buildWeekStrip(week, logs, today)} selected={onSelectDate ? date : undefined} onSelect={onSelectDate} />
          )}
        </div>
      ) : null}
    </Card>
  );
}

function StatusButton({
  active,
  disabled,
  onClick,
  icon,
  label,
  tone,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  tone: "accent" | "neutral";
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-11 items-center justify-center gap-2 rounded-[10px] border text-[15px] font-medium transition-[background-color,border-color,color,transform] active:scale-[0.98] disabled:opacity-50 [&_svg]:size-[18px]",
        !active && "border-border-strong bg-surface text-foreground hover:bg-surface-2",
        active && tone === "accent" && "border-accent bg-accent text-accent-foreground",
        active && tone === "neutral" && "border-foreground/80 bg-foreground text-background",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
