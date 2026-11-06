"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { FoodEntry, FoodSuggestion, ISODate, MealType, SavedMeal } from "@/lib/domain/types";
import { MEAL_LABELS, MEAL_TYPES } from "@/lib/domain/types";
import { mealForHour, relativeDayLabel, timeInZone, zonedParts, zonedToUtc } from "@/lib/domain/dates";
import { pluralize } from "@/lib/domain/format";
import type { FoodEntryInput, FoodFormInput, FoodFormOutput } from "@/lib/domain/validation";
import { useAddEntries, useDeleteEntry, useProfile, useSaveFood, useTimeZone, useToday, useUpdateEntry, entryToInput } from "@/lib/data/hooks";
import { useAppUI } from "@/components/shell/app-ui";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Drawer, DrawerBody, DrawerContent } from "@/components/ui/drawer";
import { Segmented } from "@/components/ui/segmented";
import { FoodForm } from "./food-form";
import { QuickPick } from "./quick-pick";

/** Typical clock time for a meal, used when logging to a day other than today. */
const MEAL_TIME: Record<MealType, string> = { breakfast: "08:00", lunch: "12:30", dinner: "19:00", snack: "15:30" };

function defaultTime(date: ISODate, today: ISODate, meal: MealType, tz: string): string {
  return date === today ? timeInZone(new Date(), tz) : MEAL_TIME[meal];
}

export function FoodSheet() {
  const { foodSheet, closeFoodSheet } = useAppUI();
  // A new key per opening resets all inner state.
  const [session, setSession] = useState(0);
  const open = foodSheet.open;

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          closeFoodSheet();
          setSession((s) => s + 1);
        }
      }}
      repositionInputs={false}
    >
      {foodSheet.open ? (
        foodSheet.mode === "add" ? (
          <AddFood key={`add-${session}`} date={foodSheet.date} initialMeal={foodSheet.meal} onDone={closeFoodSheet} />
        ) : (
          <EditFood key={`edit-${foodSheet.entry.id}-${session}`} entry={foodSheet.entry} onDone={closeFoodSheet} />
        )
      ) : null}
    </Drawer>
  );
}

function useNowContext() {
  const tz = useTimeZone();
  const today = useToday();
  const profile = useProfile();
  return { tz, today: today ?? "", unit: profile.data?.energyUnit ?? "kcal" };
}

function AddFood({ date, initialMeal, onDone }: { date: ISODate; initialMeal?: MealType; onDone: () => void }) {
  const { tz, today, unit } = useNowContext();
  const [meal, setMeal] = useState<MealType>(() => initialMeal ?? mealForHour(zonedParts(new Date(), tz).hour));
  const [view, setView] = useState<{ kind: "pick" } | { kind: "form"; prefill?: FoodSuggestion; name?: string }>({ kind: "pick" });
  const add = useAddEntries();
  const del = useDeleteEntry();
  const saveFood = useSaveFood();

  const loggedAtFor = (m: MealType, time?: string) => zonedToUtc(date, time ?? defaultTime(date, today, m, tz), tz).toISOString();

  const logInputs = (inputs: FoodEntryInput[], label: string) => {
    add.mutate(inputs, {
      onSuccess: (created) =>
        toast.success(`Added ${label} to ${MEAL_LABELS[inputs[0].meal].toLowerCase()}`, {
          action: {
            label: "Undo",
            onClick: () => created.forEach((e: FoodEntry) => del.mutate(e)),
          },
        }),
      onError: (e) => toast.error("Couldn't add food", { description: e.message }),
    });
  };

  const logSuggestion = (s: FoodSuggestion) =>
    logInputs(
      [
        {
          date,
          loggedAt: loggedAtFor(meal),
          meal,
          name: s.name,
          serving: s.serving,
          calories: s.calories,
          protein: s.protein,
          carbs: s.carbs,
          fat: s.fat,
          savedFoodId: s.savedFoodId,
          source: s.savedFoodId ? "saved_food" : "manual",
        },
      ],
      s.name,
    );

  const logMeal = (m: SavedMeal) =>
    logInputs(
      m.items.map((it) => ({
        date,
        loggedAt: loggedAtFor(meal),
        meal,
        name: it.name,
        serving: it.serving,
        calories: it.calories,
        protein: it.protein,
        carbs: it.carbs,
        fat: it.fat,
        savedFoodId: null,
        source: "saved_meal" as const,
      })),
      `${m.name} (${pluralize(m.items.length, "item")})`,
    );

  const submitForm = async (v: FoodFormOutput, prefill?: FoodSuggestion) => {
    let savedFoodId = prefill?.savedFoodId ?? null;
    if (v.saveAsFavorite) {
      try {
        const saved = await saveFood.mutateAsync({
          name: v.name,
          serving: v.serving || null,
          calories: v.calories,
          protein: v.protein,
          carbs: v.carbs,
          fat: v.fat,
        });
        savedFoodId = saved.id;
      } catch (e) {
        toast.error("Couldn't save favourite", { description: (e as Error).message });
        return;
      }
    }
    const input: FoodEntryInput = {
      date: v.date,
      loggedAt: zonedToUtc(v.date, v.time, tz).toISOString(),
      meal: v.meal,
      name: v.name,
      serving: v.serving || null,
      calories: v.calories,
      protein: v.protein,
      carbs: v.carbs,
      fat: v.fat,
      savedFoodId,
      source: savedFoodId ? "saved_food" : "manual",
    };
    logInputs([input], v.name);
    onDone();
  };

  const dayLabel = today ? relativeDayLabel(date, today) : "";

  if (view.kind === "form") {
    const s = view.prefill;
    const defaults: FoodFormInput = {
      name: s?.name ?? view.name ?? "",
      serving: s?.serving ?? "",
      calories: s ? String(s.calories) : "",
      protein: s ? String(s.protein) : "",
      carbs: s ? String(s.carbs) : "",
      fat: s ? String(s.fat) : "",
      meal,
      date,
      time: defaultTime(date, today, meal, tz),
      saveAsFavorite: false,
    };
    return (
      <DrawerContent
        title={s ? "Adjust & add" : "Add food"}
        description={dayLabel}
        headerAction={
          <Button variant="ghost" size="sm" onClick={() => setView({ kind: "pick" })}>
            <ArrowLeft aria-hidden /> Back
          </Button>
        }
      >
        <FoodForm
          defaultValues={defaults}
          today={today}
          submitLabel={(m) => `Add to ${MEAL_LABELS[m].toLowerCase()}`}
          onSubmit={(v) => submitForm(v, s)}
          pending={saveFood.isPending}
          allowFavorite={!s?.savedFoodId}
        />
      </DrawerContent>
    );
  }

  return (
    <DrawerContent
      title="Add food"
      description={dayLabel}
      headerAction={
        <Button variant="ghost" size="sm" onClick={onDone}>
          Done
        </Button>
      }
      className="h-[88dvh]"
    >
      <div className="px-5 pb-3">
        <Segmented
          label="Meal"
          value={meal}
          onValueChange={setMeal}
          options={MEAL_TYPES.map((m) => ({ value: m, label: MEAL_LABELS[m] }))}
          size="sm"
        />
      </div>
      <DrawerBody className="pb-[max(20px,env(safe-area-inset-bottom))]">
        <QuickPick
          unit={unit}
          onLog={logSuggestion}
          onAdjust={(prefill) => setView({ kind: "form", prefill })}
          onLogMeal={logMeal}
          onManual={(name) => setView({ kind: "form", name })}
        />
      </DrawerBody>
    </DrawerContent>
  );
}

function EditFood({ entry, onDone }: { entry: FoodEntry; onDone: () => void }) {
  const { tz, today } = useNowContext();
  const update = useUpdateEntry();
  const del = useDeleteEntry();
  const add = useAddEntries();
  const [confirm, setConfirm] = useState(false);

  const defaults: FoodFormInput = {
    name: entry.name,
    serving: entry.serving ?? "",
    calories: String(entry.calories),
    protein: String(entry.protein),
    carbs: String(entry.carbs),
    fat: String(entry.fat),
    meal: entry.meal,
    date: entry.date,
    time: timeInZone(new Date(entry.loggedAt), tz),
    saveAsFavorite: false,
  };

  const submit = (v: FoodFormOutput) => {
    update.mutate(
      {
        id: entry.id,
        input: {
          ...entryToInput(entry),
          date: v.date,
          loggedAt: zonedToUtc(v.date, v.time, tz).toISOString(),
          meal: v.meal,
          name: v.name,
          serving: v.serving || null,
          calories: v.calories,
          protein: v.protein,
          carbs: v.carbs,
          fat: v.fat,
        },
      },
      {
        onSuccess: () => toast.success("Changes saved"),
        onError: (e) => toast.error("Couldn't save changes", { description: e.message }),
      },
    );
    onDone();
  };

  const remove = () => {
    del.mutate(entry, {
      onSuccess: () => toast(`Deleted ${entry.name}`, { action: { label: "Undo", onClick: () => add.mutate([entryToInput(entry)]) } }),
      onError: (e) => toast.error("Couldn't delete entry", { description: e.message }),
    });
    onDone();
  };

  return (
    <DrawerContent title="Edit entry" description={today ? relativeDayLabel(entry.date, today) : undefined}>
      <FoodForm
        defaultValues={defaults}
        today={today}
        submitLabel={() => "Save changes"}
        onSubmit={submit}
        onDelete={() => setConfirm(true)}
        allowFavorite={false}
      />
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete ${entry.name}?`}
        description="It will be removed from this day's totals."
        confirmLabel="Delete"
        onConfirm={remove}
      />
    </DrawerContent>
  );
}

