import { z } from "zod";
import { isISODate, isValidTimeZone } from "./dates";
import { MEAL_TYPES, WORKOUT_STATUSES, WORKOUT_TYPES } from "./types";

/*
 * Schemas shared by forms (client) and server actions. Server actions re-parse
 * everything they receive; the database adds CHECK constraints underneath.
 */

export const LIMITS = {
  calories: 10_000,
  macro: 1_000,
  name: 120,
  serving: 60,
  notes: 500,
  duration: 600,
  mealItems: 30,
} as const;

export const isoDateSchema = z.string().refine(isISODate, "Invalid date");
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time");
export const idSchema = z.string().min(1).max(64);

const oneDecimal = (n: number) => Math.round(n * 10) / 10;

const nutritionFields = {
  calories: z.number().finite().min(0).max(LIMITS.calories).transform(oneDecimal),
  protein: z.number().finite().min(0).max(LIMITS.macro).transform(oneDecimal),
  carbs: z.number().finite().min(0).max(LIMITS.macro).transform(oneDecimal),
  fat: z.number().finite().min(0).max(LIMITS.macro).transform(oneDecimal),
};

export const nutritionSchema = z.object(nutritionFields);

const nameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name")
  .max(LIMITS.name, `Keep it under ${LIMITS.name} characters`)
  .transform((s) => s.replace(/\s+/g, " "));

const servingSchema = z
  .string()
  .trim()
  .max(LIMITS.serving)
  .nullable()
  .transform((s) => (s ? s : null));

export const foodEntryInputSchema = z.object({
  date: isoDateSchema,
  loggedAt: z.iso.datetime({ offset: true }),
  meal: z.enum(MEAL_TYPES),
  name: nameSchema,
  serving: servingSchema,
  ...nutritionFields,
  savedFoodId: idSchema.nullable(),
  source: z.enum(["manual", "saved_food", "saved_meal", "copied", "database", "barcode"]),
});
export type FoodEntryInput = z.output<typeof foodEntryInputSchema>;

export const savedFoodInputSchema = z.object({
  name: nameSchema,
  serving: servingSchema,
  ...nutritionFields,
});
export type SavedFoodInput = z.output<typeof savedFoodInputSchema>;

export const savedMealInputSchema = z.object({
  name: nameSchema,
  items: z
    .array(z.object({ name: nameSchema, serving: servingSchema, ...nutritionFields }))
    .min(1, "Add at least one food")
    .max(LIMITS.mealItems),
});
export type SavedMealInput = z.output<typeof savedMealInputSchema>;

export const workoutInputSchema = z
  .object({
    status: z.enum(WORKOUT_STATUSES),
    workoutType: z.enum(WORKOUT_TYPES).nullable(),
    durationMin: z.number().int().min(1).max(LIMITS.duration).nullable(),
    notes: z
      .string()
      .trim()
      .max(LIMITS.notes)
      .nullable()
      .transform((s) => (s ? s : null)),
  })
  // Rest days carry no workout details; drop them rather than store contradictions.
  .transform((w) => (w.status === "rest" ? { ...w, workoutType: null, durationMin: null } : w));
export type WorkoutInput = z.output<typeof workoutInputSchema>;

export const goalsInputSchema = z.object({
  calories: z.number().int().min(500, "At least 500").max(LIMITS.calories),
  protein: z.number().min(0).max(LIMITS.macro).transform(oneDecimal),
  carbs: z.number().min(0).max(LIMITS.macro).transform(oneDecimal),
  fat: z.number().min(0).max(LIMITS.macro).transform(oneDecimal),
});
export type GoalsInput = z.output<typeof goalsInputSchema>;

export const profilePatchSchema = z
  .object({
    displayName: z.string().trim().max(60).nullable(),
    timezone: z.string().refine(isValidTimeZone, "Unknown time zone"),
    energyUnit: z.enum(["kcal", "kj"]),
    onboarded: z.literal(true),
  })
  .partial();
export type ProfilePatch = z.output<typeof profilePatchSchema>;

// ---------------------------------------------------------------------------
// Form helpers: inputs are strings so a field can be empty while typing.
// ---------------------------------------------------------------------------

/** Accepts "12", "12.5", "12,5", or "" (→ fallback). Rejects anything else. */
export function decimalField(opts: { max: number; label: string; required?: boolean; integer?: boolean }) {
  return z.string().transform((raw, ctx) => {
    const v = raw.trim().replace(",", ".");
    if (v === "") {
      if (opts.required) {
        ctx.addIssue({ code: "custom", message: `Enter ${opts.label.toLowerCase()}` });
        return z.NEVER;
      }
      return 0;
    }
    const pattern = opts.integer ? /^\d+$/ : /^\d+(\.\d*)?$|^\.\d+$/;
    if (!pattern.test(v)) {
      ctx.addIssue({ code: "custom", message: opts.integer ? "Whole number" : "Numbers only" });
      return z.NEVER;
    }
    const n = Number(v);
    if (n > opts.max) {
      ctx.addIssue({ code: "custom", message: `Max ${opts.max.toLocaleString("en-US")}` });
      return z.NEVER;
    }
    return n;
  });
}

export const foodFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(LIMITS.name),
  serving: z.string().trim().max(LIMITS.serving),
  calories: decimalField({ max: LIMITS.calories, label: "Calories", required: true }),
  protein: decimalField({ max: LIMITS.macro, label: "Protein" }),
  carbs: decimalField({ max: LIMITS.macro, label: "Carbs" }),
  fat: decimalField({ max: LIMITS.macro, label: "Fat" }),
  meal: z.enum(MEAL_TYPES),
  date: isoDateSchema,
  time: timeSchema,
  saveAsFavorite: z.boolean(),
});
export type FoodFormInput = z.input<typeof foodFormSchema>;
export type FoodFormOutput = z.output<typeof foodFormSchema>;

export const goalsFormSchema = z.object({
  calories: decimalField({ max: LIMITS.calories, label: "Calories", required: true, integer: true }).refine(
    (n) => n >= 500,
    "At least 500",
  ),
  protein: decimalField({ max: LIMITS.macro, label: "Protein", required: true }),
  carbs: decimalField({ max: LIMITS.macro, label: "Carbs", required: true }),
  fat: decimalField({ max: LIMITS.macro, label: "Fat", required: true }),
});
export type GoalsFormInput = z.input<typeof goalsFormSchema>;
export type GoalsFormOutput = z.output<typeof goalsFormSchema>;

export const workoutFormSchema = z.object({
  workoutType: z.enum(WORKOUT_TYPES).nullable(),
  duration: decimalField({ max: LIMITS.duration, label: "Duration", integer: true }),
  notes: z.string().max(LIMITS.notes),
});
export type WorkoutFormInput = z.input<typeof workoutFormSchema>;
export type WorkoutFormOutput = z.output<typeof workoutFormSchema>;
