"use client";

import { useState } from "react";
import { BookmarkPlus, Copy, Ellipsis, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { EnergyUnit, FoodEntry, ISODate } from "@/lib/domain/types";
import { MEAL_LABELS } from "@/lib/domain/types";
import { groupByMeal, type MealGroup } from "@/lib/domain/totals";
import { energyLabel, formatEnergy, formatGrams } from "@/lib/domain/format";
import { formatClock, timeInZone } from "@/lib/domain/dates";
import { entryToInput, useAddEntries, useDeleteEntry } from "@/lib/data/hooks";
import { useAppUI } from "@/components/shell/app-ui";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

export function MacroLine({ p, c, f, className }: { p: number; c: number; f: number; className?: string }) {
  return (
    <span className={className}>
      <span className="sr-only">Protein </span>P {formatGrams(p)}
      <span aria-hidden> · </span>
      <span className="sr-only">, carbs </span>C {formatGrams(c)}
      <span aria-hidden> · </span>
      <span className="sr-only">, fat </span>F {formatGrams(f)}
    </span>
  );
}

export function MealList({
  entries,
  date,
  unit,
  timeZone,
}: {
  entries: FoodEntry[];
  date: ISODate;
  unit: EnergyUnit;
  timeZone: string;
}) {
  const groups = groupByMeal(entries);
  return (
    <div className="grid gap-3">
      {groups.map((g) => (
        <MealCard key={g.meal} group={g} date={date} unit={unit} timeZone={timeZone} />
      ))}
    </div>
  );
}

function MealCard({ group, date, unit, timeZone }: { group: MealGroup; date: ISODate; unit: EnergyUnit; timeZone: string }) {
  const { openAddFood, openMealBuilder } = useAppUI();
  const label = MEAL_LABELS[group.meal];
  return (
    <Card>
      <div className="flex items-center justify-between gap-2 py-1 pl-4 pr-1.5">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em]">
          {label}
          <span className="ml-2 text-[13px] font-normal text-muted-foreground tnum">
            {formatEnergy(group.totals.calories, unit)} {energyLabel(unit)}
          </span>
        </h3>
        <div className="flex items-center">
          <button
            type="button"
            aria-label={`Save ${label.toLowerCase()} as a meal`}
            title="Save as meal"
            onClick={() =>
              openMealBuilder({
                prefill: {
                  name: label,
                  items: group.entries.map((e) => ({
                    name: e.name,
                    serving: e.serving,
                    calories: e.calories,
                    protein: e.protein,
                    carbs: e.carbs,
                    fat: e.fat,
                  })),
                },
              })
            }
            className="flex size-10 items-center justify-center rounded-lg text-subtle-foreground hover:bg-surface-2 hover:text-foreground"
          >
            <BookmarkPlus className="size-[18px]" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={`Add to ${label.toLowerCase()}`}
            onClick={() => openAddFood(date, group.meal)}
            className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          >
            <Plus className="size-5" aria-hidden />
          </button>
        </div>
      </div>
      <ul className="border-t border-border">
        {group.entries.map((e) => (
          <EntryRow key={e.id} entry={e} unit={unit} timeZone={timeZone} />
        ))}
      </ul>
    </Card>
  );
}

function EntryRow({ entry, unit, timeZone }: { entry: FoodEntry; unit: EnergyUnit; timeZone: string }) {
  const { openEditEntry } = useAppUI();
  const del = useDeleteEntry();
  const add = useAddEntries();
  const [confirm, setConfirm] = useState(false);
  const pending = entry.id.startsWith("optimistic-");

  const remove = () => {
    del.mutate(entry, {
      onSuccess: () =>
        toast(`Deleted ${entry.name}`, {
          action: { label: "Undo", onClick: () => add.mutate([entryToInput(entry)]) },
        }),
      onError: (e) => toast.error("Couldn't delete entry", { description: e.message }),
    });
  };

  const duplicate = () => {
    add.mutate([entryToInput(entry, { source: "copied" })], {
      onSuccess: () => toast.success(`Added another ${entry.name}`),
      onError: (e) => toast.error("Couldn't duplicate entry", { description: e.message }),
    });
  };

  return (
    <li className="flex items-center border-b border-border last:border-b-0" aria-busy={pending || undefined}>
      <button
        type="button"
        onClick={() => !pending && openEditEntry(entry)}
        className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left transition-colors hover:bg-surface-2/50"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium">{entry.name}</p>
          <p className="truncate text-[13px] text-muted-foreground tnum">
            <MacroLine p={entry.protein} c={entry.carbs} f={entry.fat} />
            {entry.serving ? <span> · {entry.serving}</span> : null}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[15px] font-medium tnum">{formatEnergy(entry.calories, unit)}</p>
          <p className="text-xs text-subtle-foreground tnum">{formatClock(timeInZone(new Date(entry.loggedAt), timeZone))}</p>
        </div>
      </button>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          disabled={pending}
          aria-label={`Options for ${entry.name}`}
          className="mx-1 flex size-10 shrink-0 items-center justify-center rounded-lg text-subtle-foreground hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
        >
          <Ellipsis className="size-[18px]" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => openEditEntry(entry)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={duplicate}>
            <Copy /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => setConfirm(true)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete ${entry.name}?`}
        description={`${formatEnergy(entry.calories, unit)} ${energyLabel(unit)} will be removed from this day.`}
        confirmLabel="Delete"
        onConfirm={remove}
      />
    </li>
  );
}

export function MealListSkeleton() {
  return (
    <Card className="p-4" aria-busy>
      <Skeleton className="h-5 w-32" />
      <div className="mt-4 grid gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex justify-between gap-4">
            <div className="grid flex-1 gap-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-10" />
          </div>
        ))}
      </div>
    </Card>
  );
}
