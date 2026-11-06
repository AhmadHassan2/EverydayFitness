"use client";

import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { decimalField, LIMITS } from "@/lib/domain/validation";
import { sumNutrition } from "@/lib/domain/totals";
import { formatNumber } from "@/lib/domain/format";
import { useRecentFoods, useSaveMeal, useSavedFoods } from "@/lib/data/hooks";
import { suggestionFromSaved, mergeSuggestions } from "@/lib/domain/foods";
import { useAppUI } from "@/components/shell/app-ui";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerBody, DrawerContent, DrawerFooter } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";

const itemSchema = z.object({
  name: z.string().trim().min(1, "Name").max(LIMITS.name),
  serving: z.string().trim().max(LIMITS.serving),
  calories: decimalField({ max: LIMITS.calories, label: "kcal", required: true }),
  protein: decimalField({ max: LIMITS.macro, label: "Protein" }),
  carbs: decimalField({ max: LIMITS.macro, label: "Carbs" }),
  fat: decimalField({ max: LIMITS.macro, label: "Fat" }),
});
const mealFormSchema = z.object({
  name: z.string().trim().min(1, "Give the meal a name").max(LIMITS.name),
  items: z.array(itemSchema).min(1, "Add at least one food").max(LIMITS.mealItems),
});
type MealFormInput = z.input<typeof mealFormSchema>;
type MealFormOutput = z.output<typeof mealFormSchema>;

const blankItem = { name: "", serving: "", calories: "", protein: "", carbs: "", fat: "" };

export function MealBuilderSheet() {
  const { mealBuilder, closeMealBuilder } = useAppUI();
  const [session, setSession] = useState(0);
  return (
    <Drawer
      open={mealBuilder.open}
      onOpenChange={(o) => {
        if (!o) {
          closeMealBuilder();
          setSession((s) => s + 1);
        }
      }}
    >
      {mealBuilder.open ? <MealBuilder key={session} state={mealBuilder} onDone={closeMealBuilder} /> : null}
    </Drawer>
  );
}

function MealBuilder({
  state,
  onDone,
}: {
  state: Extract<ReturnType<typeof useAppUI>["mealBuilder"], { open: true }>;
  onDone: () => void;
}) {
  const source = state.meal ?? state.prefill;
  const save = useSaveMeal();
  const saved = useSavedFoods();
  const recent = useRecentFoods(20);
  const [picking, setPicking] = useState(false);

  const form = useForm<MealFormInput, unknown, MealFormOutput>({
    resolver: zodResolver(mealFormSchema),
    defaultValues: {
      name: source?.name ?? "",
      items: source?.items.length
        ? source.items.map((i) => ({
            name: i.name,
            serving: i.serving ?? "",
            calories: String(i.calories),
            protein: String(i.protein),
            carbs: String(i.carbs),
            fat: String(i.fat),
          }))
        : [blankItem],
    },
  });
  const { register, control, handleSubmit, formState } = form;
  const items = useFieldArray({ control, name: "items" });
  const values = useWatch({ control, name: "items" });
  const total = sumNutrition(
    values.map((v) => ({
      calories: Number(String(v.calories).replace(",", ".")) || 0,
      protein: Number(String(v.protein).replace(",", ".")) || 0,
      carbs: Number(String(v.carbs).replace(",", ".")) || 0,
      fat: Number(String(v.fat).replace(",", ".")) || 0,
    })),
  );

  const pickable = mergeSuggestions((saved.data ?? []).map(suggestionFromSaved), recent.data ?? []);

  const submit = (v: MealFormOutput) => {
    save.mutate(
      {
        id: state.meal?.id,
        input: { name: v.name, items: v.items.map((i) => ({ ...i, serving: i.serving || null })) },
      },
      {
        onSuccess: (m) => {
          toast.success(state.meal ? "Meal updated" : `Saved “${m.name}”`, {
            description: state.meal ? undefined : "Find it under Saved meals when adding food.",
          });
          onDone();
        },
        onError: (e) => toast.error("Couldn't save meal", { description: e.message }),
      },
    );
  };

  return (
    <DrawerContent
      title={state.meal ? "Edit meal" : "New saved meal"}
      description="Log several foods together in one tap."
      className="h-[88dvh]"
    >
      <form onSubmit={handleSubmit(submit)} className="flex min-h-0 flex-1 flex-col" noValidate>
        <DrawerBody className="grid content-start gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="meal-name">Name</Label>
            <Input id="meal-name" placeholder="e.g. Usual breakfast" autoComplete="off" {...register("name")} />
            <FieldError>{formState.errors.name?.message}</FieldError>
          </div>

          <div className="grid gap-2">
            <div className="flex items-baseline justify-between">
              <h3 className="text-[13px] font-medium text-muted-foreground">Foods</h3>
              <span className="text-[13px] text-muted-foreground tnum">{formatNumber(total.calories)} kcal total</span>
            </div>
            <ul className="grid gap-2">
              {items.fields.map((f, i) => {
                const err = formState.errors.items?.[i];
                return (
                  <li key={f.id} className="grid gap-2 rounded-xl border border-border p-3">
                    <div className="flex gap-2">
                      <Input aria-label={`Food ${i + 1} name`} placeholder="Food" autoComplete="off" {...register(`items.${i}.name`)} />
                      <Button
                        type="button"
                        variant="subtle"
                        size="icon"
                        aria-label={`Remove food ${i + 1}`}
                        onClick={() => items.remove(i)}
                        disabled={items.fields.length === 1}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {(["calories", "protein", "carbs", "fat"] as const).map((k) => (
                        <div key={k} className="grid gap-1">
                          <Label htmlFor={`item-${f.id}-${k}`} className="text-xs">
                            {k === "calories" ? "kcal" : k === "protein" ? "P (g)" : k === "carbs" ? "C (g)" : "F (g)"}
                          </Label>
                          <Input
                            id={`item-${f.id}-${k}`}
                            inputMode="decimal"
                            placeholder="0"
                            className="h-10 px-2 tnum"
                            aria-invalid={Boolean(err?.[k]) || undefined}
                            {...register(`items.${i}.${k}`)}
                          />
                        </div>
                      ))}
                    </div>
                    <FieldError>{err?.name?.message ?? err?.calories?.message ?? err?.protein?.message ?? err?.carbs?.message ?? err?.fat?.message}</FieldError>
                  </li>
                );
              })}
            </ul>
            <FieldError>{formState.errors.items?.root?.message ?? formState.errors.items?.message}</FieldError>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => items.append(blankItem)} disabled={items.fields.length >= LIMITS.mealItems}>
                <Plus aria-hidden /> Add food
              </Button>
              {pickable.length > 0 ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setPicking((p) => !p)} aria-expanded={picking}>
                  Pick from your foods
                </Button>
              ) : null}
            </div>
            {picking ? (
              <ul className="max-h-60 overflow-y-auto rounded-xl border border-border">
                {pickable.map((s) => (
                  <li key={s.key} className="border-b border-border last:border-b-0">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-surface-2/60"
                      onClick={() => {
                        const firstBlank = values.findIndex((v) => !v.name && !v.calories);
                        const item = {
                          name: s.name,
                          serving: s.serving ?? "",
                          calories: String(s.calories),
                          protein: String(s.protein),
                          carbs: String(s.carbs),
                          fat: String(s.fat),
                        };
                        if (firstBlank >= 0) items.update(firstBlank, item);
                        else items.append(item);
                      }}
                    >
                      <span className="truncate text-[15px]">{s.name}</span>
                      <span className="text-[13px] text-muted-foreground tnum">{formatNumber(s.calories)} kcal</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button type="submit" size="lg" className="w-full" disabled={save.isPending}>
            {state.meal ? "Save changes" : "Save meal"}
          </Button>
        </DrawerFooter>
      </form>
    </DrawerContent>
  );
}
