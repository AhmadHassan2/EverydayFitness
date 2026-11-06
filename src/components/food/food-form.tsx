"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, ChevronDown, Trash2 } from "lucide-react";
import type { ISODate, MealType } from "@/lib/domain/types";
import { MEAL_LABELS, MEAL_TYPES } from "@/lib/domain/types";
import { formatClock, relativeDayLabel } from "@/lib/domain/dates";
import { caloriesFromMacros } from "@/lib/domain/totals";
import { formatNumber } from "@/lib/domain/format";
import { foodFormSchema, type FoodFormInput, type FoodFormOutput } from "@/lib/domain/validation";
import { Button } from "@/components/ui/button";
import { DrawerBody, DrawerFooter } from "@/components/ui/drawer";
import { FieldError, Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface FoodFormProps {
  defaultValues: FoodFormInput;
  today: ISODate;
  submitLabel: (meal: MealType) => string;
  onSubmit: (values: FoodFormOutput) => Promise<void> | void;
  onDelete?: () => void;
  pending?: boolean;
  /** Hide "save as favourite" (e.g. editing an entry). */
  allowFavorite?: boolean;
}

const MEAL_OPTIONS = MEAL_TYPES.map((m) => ({ value: m, label: MEAL_LABELS[m] }));

export function FoodForm({ defaultValues, today, submitLabel, onSubmit, onDelete, pending, allowFavorite = true }: FoodFormProps) {
  const form = useForm<FoodFormInput, unknown, FoodFormOutput>({
    resolver: zodResolver(foodFormSchema),
    defaultValues,
    mode: "onTouched",
  });
  const { register, handleSubmit, control, formState } = form;
  const [showWhen, setShowWhen] = useState(false);
  const errors = formState.errors;

  const [meal, date, time, ...nums] = useWatch({ control, name: ["meal", "date", "time", "protein", "carbs", "fat", "calories"] });
  const [p, c, f, kcal] = nums.map((v) => Number(String(v).replace(",", ".")) || 0);
  const implied = caloriesFromMacros({ protein: p, carbs: c, fat: f });
  const showImplied = implied > 0 && Math.abs(implied - kcal) > Math.max(25, kcal * 0.15);

  const numberProps = (name: "calories" | "protein" | "carbs" | "fat" | "sodium" | "potassium") => ({
    ...register(name),
    inputMode: "decimal" as const,
    autoComplete: "off",
    enterKeyHint: "next" as const,
    "aria-invalid": Boolean(errors[name]) || undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.select(),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col" noValidate>
      <DrawerBody className="grid content-start gap-4">
        <Controller
          control={control}
          name="meal"
          render={({ field }) => <Segmented label="Meal" value={field.value} onValueChange={field.onChange} options={MEAL_OPTIONS} size="sm" />}
        />

        <div className="grid gap-1.5">
          <Label htmlFor="food-name">Food</Label>
          <Input
            id="food-name"
            placeholder="e.g. Chicken wrap"
            autoComplete="off"
            enterKeyHint="next"
            aria-invalid={Boolean(errors.name) || undefined}
            {...register("name")}
          />
          <FieldError>{errors.name?.message}</FieldError>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="food-calories">Calories (kcal)</Label>
          <Input id="food-calories" placeholder="0" className="h-12 text-[20px] font-semibold tnum" {...numberProps("calories")} />
          <FieldError id="calories-error">{errors.calories?.message}</FieldError>
          {showImplied ? (
            <p className="text-[13px] text-muted-foreground">
              Macros add up to about {formatNumber(implied)} kcal.{" "}
              <button
                type="button"
                className="font-medium text-foreground underline underline-offset-2"
                onClick={() => form.setValue("calories", String(Math.round(implied)), { shouldValidate: true })}
              >
                Use that
              </button>
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(["protein", "carbs", "fat"] as const).map((m) => (
            <div key={m} className="grid min-w-0 gap-1.5">
              <Label htmlFor={`food-${m}`} className="flex items-center gap-1.5">
                <span aria-hidden className={cn("size-2 rounded-full", m === "protein" ? "bg-protein" : m === "carbs" ? "bg-carbs" : "bg-fat")} />
                {m === "protein" ? "Protein" : m === "carbs" ? "Carbs" : "Fat"} (g)
              </Label>
              <Input id={`food-${m}`} placeholder="0" className="tnum" {...numberProps(m)} />
              <FieldError id={`${m}-error`}>{errors[m]?.message}</FieldError>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(["sodium", "potassium"] as const).map((mineral) => (
            <div key={mineral} className="grid gap-1.5">
              <Label htmlFor={`food-${mineral}`}>{mineral === "sodium" ? "Sodium" : "Potassium"} (mg)</Label>
              <Input id={`food-${mineral}`} placeholder="0" className="tnum" {...numberProps(mineral)} />
              <FieldError id={`${mineral}-error`}>{errors[mineral]?.message}</FieldError>
            </div>
          ))}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="food-serving">
            Serving <span className="font-normal text-subtle-foreground">(optional)</span>
          </Label>
          <Input id="food-serving" placeholder="e.g. 1 bowl, 200 g" autoComplete="off" {...register("serving")} />
        </div>

        <div className="rounded-[10px] border border-border">
          <button
            type="button"
            aria-expanded={showWhen}
            onClick={() => setShowWhen((s) => !s)}
            className="flex h-11 w-full items-center gap-2.5 px-3 text-left text-[15px]"
          >
            <CalendarClock className="size-[18px] text-muted-foreground" aria-hidden />
            <span className="flex-1">
              {relativeDayLabel(date, today)}, {formatClock(time)}
            </span>
            <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", showWhen && "rotate-180")} aria-hidden />
          </button>
          {showWhen ? (
            <div className="grid grid-cols-2 gap-2 border-t border-border p-3">
              <div className="grid gap-1.5">
                <Label htmlFor="food-date">Date</Label>
                <Input id="food-date" type="date" {...register("date")} />
                <FieldError>{errors.date?.message}</FieldError>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="food-time">Time</Label>
                <Input id="food-time" type="time" {...register("time")} />
                <FieldError>{errors.time?.message}</FieldError>
              </div>
            </div>
          ) : null}
        </div>

        {allowFavorite ? (
          <Controller
            control={control}
            name="saveAsFavorite"
            render={({ field }) => (
              <label className="flex items-center justify-between gap-3 py-1">
                <span>
                  <span className="block text-[15px] font-medium">Save to favourites</span>
                  <span className="block text-[13px] text-muted-foreground">Log it again in one tap.</span>
                </span>
                <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Save to favourites" />
              </label>
            )}
          />
        ) : null}
      </DrawerBody>

      <DrawerFooter className="flex gap-2">
        {onDelete ? (
          <Button type="button" variant="destructive-ghost" size="icon" aria-label="Delete entry" onClick={onDelete}>
            <Trash2 aria-hidden />
          </Button>
        ) : null}
        <Button type="submit" size="lg" className="flex-1" disabled={pending}>
          {submitLabel(meal)}
        </Button>
      </DrawerFooter>
    </form>
  );
}
