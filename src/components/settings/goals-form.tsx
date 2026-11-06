"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Goals } from "@/lib/domain/types";
import { caloriesFromMacros } from "@/lib/domain/totals";
import { formatNumber } from "@/lib/domain/format";
import { goalsFormSchema, type GoalsFormInput, type GoalsFormOutput } from "@/lib/domain/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const FIELDS = [
  { name: "protein", label: "Protein", dot: "bg-protein" },
  { name: "carbs", label: "Carbs", dot: "bg-carbs" },
  { name: "fat", label: "Fat", dot: "bg-fat" },
] as const;

export function GoalsForm({
  initial,
  submitLabel,
  onSubmit,
  pending,
  note,
  requireChange = false,
}: {
  initial: Goals;
  submitLabel: string;
  onSubmit: (g: GoalsFormOutput) => void;
  pending?: boolean;
  note?: string;
  /** Disable submit until a value changes (settings). */
  requireChange?: boolean;
}) {
  const { register, handleSubmit, control, formState, reset } = useForm<GoalsFormInput, unknown, GoalsFormOutput>({
    resolver: zodResolver(goalsFormSchema),
    defaultValues: {
      calories: String(initial.calories),
      protein: String(initial.protein),
      carbs: String(initial.carbs),
      fat: String(initial.fat),
    },
  });
  const e = formState.errors;
  const [kcal, p, c, f] = useWatch({ control, name: ["calories", "protein", "carbs", "fat"] }).map((v) => Number(String(v).replace(",", ".")) || 0);
  const implied = caloriesFromMacros({ protein: p, carbs: c, fat: f });
  const diff = implied - kcal;

  const num = (name: keyof GoalsFormInput) => ({
    ...register(name),
    inputMode: "decimal" as const,
    autoComplete: "off",
    "aria-invalid": Boolean(e[name]) || undefined,
    onFocus: (ev: React.FocusEvent<HTMLInputElement>) => ev.currentTarget.select(),
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((v) => {
        onSubmit(v);
        reset({ calories: String(v.calories), protein: String(v.protein), carbs: String(v.carbs), fat: String(v.fat) });
      })}
      className="grid gap-4"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="goal-calories">Daily calories (kcal)</Label>
        <Input id="goal-calories" {...num("calories")} className="h-12 text-[20px] font-semibold tnum" />
        <FieldError>{e.calories?.message}</FieldError>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {FIELDS.map((fd) => (
          <div key={fd.name} className="grid min-w-0 gap-1.5">
            <Label htmlFor={`goal-${fd.name}`} className="flex items-center gap-1.5">
              <span aria-hidden className={cn("size-2 rounded-full", fd.dot)} />
              {fd.label} (g)
            </Label>
            <Input id={`goal-${fd.name}`} {...num(fd.name)} className="tnum" />
            <FieldError>{e[fd.name]?.message}</FieldError>
          </div>
        ))}
      </div>
      <p className="text-[13px] text-muted-foreground tnum">
        Macros add up to {formatNumber(implied)} kcal
        {Math.abs(diff) >= 50
          ? ` · ${formatNumber(Math.abs(diff))} kcal ${diff > 0 ? "above" : "below"} your calorie goal`
          : " · matches your calorie goal"}
      </p>
      {note ? <p className="text-[13px] text-muted-foreground">{note}</p> : null}
      <Button type="submit" size="lg" disabled={pending || (requireChange && !formState.isDirty)}>
        {submitLabel}
      </Button>
    </form>
  );
}
