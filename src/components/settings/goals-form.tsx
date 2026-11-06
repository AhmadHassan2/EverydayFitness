"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Goals } from "@/lib/domain/types";
import { goalsFormSchema, type GoalsFormInput, type GoalsFormOutput, type GoalsInput } from "@/lib/domain/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";

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
  onSubmit: (g: GoalsInput) => void;
  pending?: boolean;
  note?: string;
  /** Disable submit until a value changes (settings). */
  requireChange?: boolean;
}) {
  const { register, handleSubmit, formState, reset } = useForm<GoalsFormInput, unknown, GoalsFormOutput>({
    resolver: zodResolver(goalsFormSchema),
    defaultValues: {
      calories: String(initial.calories),
    },
  });
  const e = formState.errors;

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
        onSubmit({ ...v, protein: 0, carbs: 0, fat: 0 });
        reset({ calories: String(v.calories) });
      })}
      className="grid gap-4"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="goal-calories">Daily calories (kcal)</Label>
        <Input id="goal-calories" {...num("calories")} className="h-12 text-[20px] font-semibold tnum" />
        <FieldError>{e.calories?.message}</FieldError>
      </div>
      <p className="text-[13px] text-muted-foreground">Protein, carbs, fat, sodium, and potassium are tracked without daily targets.</p>
      {note ? <p className="text-[13px] text-muted-foreground">{note}</p> : null}
      <Button type="submit" size="lg" disabled={pending || (requireChange && !formState.isDirty)}>
        {submitLabel}
      </Button>
    </form>
  );
}
