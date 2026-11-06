"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { SavedFood } from "@/lib/domain/types";
import { decimalField, LIMITS } from "@/lib/domain/validation";
import { useUpdateSavedFood } from "@/lib/data/hooks";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerBody, DrawerContent, DrawerFooter } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";

const schema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(LIMITS.name),
  serving: z.string().trim().max(LIMITS.serving),
  calories: decimalField({ max: LIMITS.calories, label: "Calories", required: true }),
  protein: decimalField({ max: LIMITS.macro, label: "Protein" }),
  carbs: decimalField({ max: LIMITS.macro, label: "Carbs" }),
  fat: decimalField({ max: LIMITS.macro, label: "Fat" }),
  sodium: decimalField({ max: 100_000, label: "Sodium" }),
  potassium: decimalField({ max: 100_000, label: "Potassium" }),
});

const SHORT = { calories: "kcal", protein: "P (g)", carbs: "C (g)", fat: "F (g)" } as const;

export function SavedFoodSheet({ food, onClose }: { food: SavedFood | null; onClose: () => void }) {
  return (
    <Drawer open={food !== null} onOpenChange={(o) => !o && onClose()}>
      {food ? <SavedFoodForm key={food.id} food={food} onClose={onClose} /> : null}
    </Drawer>
  );
}

function SavedFoodForm({ food, onClose }: { food: SavedFood; onClose: () => void }) {
  const update = useUpdateSavedFood();
  const { register, handleSubmit, formState } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: food.name,
      serving: food.serving ?? "",
      calories: String(food.calories),
      protein: String(food.protein),
      carbs: String(food.carbs),
      fat: String(food.fat),
      sodium: String(food.sodium ?? 0),
      potassium: String(food.potassium ?? 0),
    },
  });
  const e = formState.errors;
  const submit = (v: z.output<typeof schema>) =>
    update.mutate(
      { id: food.id, input: { ...v, serving: v.serving || null } },
      {
        onSuccess: () => {
          toast.success("Favourite updated");
          onClose();
        },
        onError: (err) => toast.error("Couldn't save favourite", { description: err.message }),
      },
    );

  return (
    <DrawerContent title="Edit favourite" description="Applies to future logs. Past entries keep their values.">
      <form onSubmit={handleSubmit(submit)} noValidate className="flex min-h-0 flex-1 flex-col">
        <DrawerBody className="grid content-start gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="sf-name">Name</Label>
            <Input id="sf-name" {...register("name")} aria-invalid={Boolean(e.name) || undefined} />
            <FieldError>{e.name?.message}</FieldError>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["sodium", "potassium"] as const).map((k) => (
              <div key={k} className="grid gap-1.5">
                <Label htmlFor={`sf-${k}`}>{k === "sodium" ? "Sodium" : "Potassium"} (mg)</Label>
                <Input id={`sf-${k}`} inputMode="decimal" className="px-2 tnum" {...register(k)} aria-invalid={Boolean(e[k]) || undefined} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(["calories", "protein", "carbs", "fat"] as const).map((k) => (
              <div key={k} className="grid gap-1.5">
                <Label htmlFor={`sf-${k}`}>{SHORT[k]}</Label>
                <Input id={`sf-${k}`} inputMode="decimal" className="px-2 tnum" {...register(k)} aria-invalid={Boolean(e[k]) || undefined} />
              </div>
            ))}
          </div>
          <FieldError>{e.calories?.message ?? e.protein?.message ?? e.carbs?.message ?? e.fat?.message ?? e.sodium?.message ?? e.potassium?.message}</FieldError>
          <div className="grid gap-1.5">
            <Label htmlFor="sf-serving">
              Serving <span className="font-normal text-subtle-foreground">(optional)</span>
            </Label>
            <Input id="sf-serving" {...register("serving")} />
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button type="submit" size="lg" className="w-full" disabled={update.isPending}>
            Save changes
          </Button>
        </DrawerFooter>
      </form>
    </DrawerContent>
  );
}
