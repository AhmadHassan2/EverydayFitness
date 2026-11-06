"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { DayStatus, ISODate, WorkoutLog } from "@/lib/domain/types";
import { WORKOUT_TYPES, WORKOUT_TYPE_LABELS } from "@/lib/domain/types";
import { relativeDayLabel } from "@/lib/domain/dates";
import { workoutFormSchema, type WorkoutFormInput, type WorkoutFormOutput } from "@/lib/domain/validation";
import { useSetWorkout, useToday, useWorkouts } from "@/lib/data/hooks";
import { useAppUI } from "@/components/shell/app-ui";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerBody, DrawerContent, DrawerFooter } from "@/components/ui/drawer";
import { Input, Textarea } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const DURATIONS = [30, 45, 60, 75, 90];

export function WorkoutSheet() {
  const { workoutSheet, closeWorkout } = useAppUI();
  return (
    <Drawer open={workoutSheet !== null} onOpenChange={(o) => !o && closeWorkout()}>
      {workoutSheet ? <WorkoutSheetContent key={workoutSheet} date={workoutSheet} onDone={closeWorkout} /> : null}
    </Drawer>
  );
}

function WorkoutSheetContent({ date, onDone }: { date: ISODate; onDone: () => void }) {
  const today = useToday();
  const q = useWorkouts(date, date);
  const log = q.data?.find((w) => w.date === date);
  return (
    <DrawerContent title="Training" description={today ? relativeDayLabel(date, today) : undefined}>
      {q.isPending ? (
        <DrawerBody>
          <Skeleton className="h-64" />
        </DrawerBody>
      ) : (
        <WorkoutForm date={date} log={log} onDone={onDone} />
      )}
    </DrawerContent>
  );
}

function WorkoutForm({ date, log, onDone }: { date: ISODate; log?: WorkoutLog; onDone: () => void }) {
  const [status, setStatus] = useState<DayStatus>(log?.status ?? "trained");
  const setWorkout = useSetWorkout();
  const form = useForm<WorkoutFormInput, unknown, WorkoutFormOutput>({
    resolver: zodResolver(workoutFormSchema),
    defaultValues: {
      workoutType: log?.workoutType ?? null,
      duration: log?.durationMin ? String(log.durationMin) : "",
      notes: log?.notes ?? "",
    },
  });
  const { control, register, handleSubmit, setValue, formState } = form;
  const duration = useWatch({ control, name: "duration" });

  const submit = (v: WorkoutFormOutput) => {
    const input =
      status === "none"
        ? null
        : {
            status,
            workoutType: status === "trained" ? v.workoutType : null,
            durationMin: status === "trained" && v.duration > 0 ? v.duration : null,
            notes: v.notes.trim() || null,
          };
    setWorkout.mutate(
      { date, input },
      {
        onSuccess: () => toast.success(input ? "Training saved" : "Marked as not logged"),
        onError: (e) => toast.error("Couldn't save training", { description: e.message }),
      },
    );
    onDone();
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DrawerBody className="grid content-start gap-5">
        <Segmented<DayStatus>
          label="Status"
          value={status}
          onValueChange={setStatus}
          options={[
            { value: "trained", label: "Trained" },
            { value: "rest", label: "Rest day" },
            { value: "none", label: "Not logged" },
          ]}
        />

        {status === "trained" ? (
          <>
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-[13px] font-medium text-muted-foreground">
                Type <span className="font-normal text-subtle-foreground">(optional)</span>
              </legend>
              <Controller
                control={control}
                name="workoutType"
                render={({ field }) => (
                  <div className="grid grid-cols-4 gap-2">
                    {WORKOUT_TYPES.map((t) => {
                      const on = field.value === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          aria-pressed={on}
                          onClick={() => field.onChange(on ? null : t)}
                          className={cn(
                            "h-10 rounded-[10px] border text-sm font-medium transition-colors",
                            on ? "border-accent bg-accent-soft text-accent" : "border-border-strong hover:bg-surface-2",
                          )}
                        >
                          {WORKOUT_TYPE_LABELS[t]}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            </fieldset>

            <div className="grid gap-2">
              <Label htmlFor="workout-duration">
                Duration <span className="font-normal text-subtle-foreground">(minutes, optional)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="workout-duration"
                  inputMode="numeric"
                  placeholder="—"
                  className="w-20 tnum"
                  aria-invalid={Boolean(formState.errors.duration) || undefined}
                  {...register("duration")}
                />
                <div className="flex flex-1 gap-1.5 overflow-x-auto scrollbar-none">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setValue("duration", String(d), { shouldValidate: true })}
                      className={cn(
                        "h-11 min-w-11 flex-1 rounded-[10px] border px-2 text-sm font-medium tnum transition-colors",
                        duration === String(d) ? "border-accent bg-accent-soft text-accent" : "border-border-strong hover:bg-surface-2",
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <FieldError>{formState.errors.duration?.message}</FieldError>
            </div>
          </>
        ) : null}

        {status !== "none" ? (
          <div className="grid gap-2">
            <Label htmlFor="workout-notes">
              Notes <span className="font-normal text-subtle-foreground">(optional)</span>
            </Label>
            <Textarea id="workout-notes" rows={3} maxLength={500} placeholder="How did it go?" {...register("notes")} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">The day will show as not logged. Nothing else changes.</p>
        )}
      </DrawerBody>
      <DrawerFooter>
        <Button type="submit" size="lg" className="w-full">
          Save
        </Button>
      </DrawerFooter>
    </form>
  );
}
