import type { FoodEntry, GoalRecord, MealType, Nutrition, SavedFood, SavedMeal, WorkoutLog, WorkoutType } from "@/lib/domain/types";
import { addDays, weekdayIndex, zonedToUtc } from "@/lib/domain/dates";
import type { DemoState } from "./store";

/*
 * Generates ~90 days of plausible history ending today, in the visitor's
 * timezone. Deterministic per day so a reset reproduces the same story.
 * Includes skipped days (missing logs), one fasted day logged at 0 kcal, a
 * goal change mid-way, and some days with no workout status.
 */

type Food = Nutrition & { name: string; serving: string };

const F = (name: string, serving: string, calories: number, protein: number, carbs: number, fat: number): Food => ({
  name,
  serving,
  calories,
  protein,
  carbs,
  fat,
});

const BREAKFASTS: Food[][] = [
  [F("Overnight oats", "1 jar", 380, 18, 56, 9), F("Black coffee", "1 cup", 2, 0.3, 0, 0)],
  [F("Greek yogurt, 2%", "200 g", 146, 20, 8, 4), F("Granola", "40 g", 186, 4, 26, 7.5), F("Blueberries", "75 g", 43, 0.6, 11, 0.2)],
  [F("Scrambled eggs", "3 eggs", 273, 19, 2, 21), F("Sourdough toast", "1 slice", 140, 5, 27, 1), F("Black coffee", "1 cup", 2, 0.3, 0, 0)],
  [F("Protein oats", "1 bowl", 452, 36, 58, 9), F("Banana", "1 medium", 105, 1.3, 27, 0.4)],
];

const LUNCHES: Food[][] = [
  [F("Chicken burrito bowl", "1 bowl", 640, 46, 68, 18)],
  [F("Turkey & avocado wrap", "1 wrap", 520, 34, 44, 22), F("Apple", "1 medium", 95, 0.5, 25, 0.3)],
  [F("Salmon poke bowl", "1 bowl", 610, 35, 72, 19)],
  [F("Chicken caesar salad", "1 large", 480, 42, 18, 26), F("Sourdough toast", "1 slice", 140, 5, 27, 1)],
  [F("Lentil soup", "400 ml", 330, 18, 48, 6), F("Cheddar toastie", "1", 410, 18, 34, 22)],
];

const DINNERS: Food[][] = [
  [F("Grilled chicken thighs", "200 g", 410, 48, 0, 24), F("Jasmine rice", "1 cup cooked", 205, 4.3, 45, 0.4), F("Roasted broccoli", "150 g", 85, 4, 10, 4)],
  [F("Beef stir-fry", "1 plate", 620, 42, 48, 26)],
  [F("Salmon fillet", "180 g", 367, 40, 0, 22), F("Baked potato", "1 medium", 161, 4.3, 37, 0.2), F("Green salad", "1 bowl", 60, 2, 6, 3.5)],
  [F("Spaghetti bolognese", "1 plate", 690, 38, 82, 21)],
  [F("Chicken tikka & rice", "1 plate", 720, 45, 78, 22)],
  [F("Tofu veggie curry", "1 bowl", 520, 24, 52, 24), F("Basmati rice", "1 cup cooked", 210, 4.4, 46, 0.5)],
];

const SNACKS: Food[] = [
  F("Whey shake", "1 scoop", 120, 24, 3, 1.5),
  F("Almonds", "30 g", 174, 6.4, 6, 15),
  F("Protein bar", "1 bar", 210, 20, 22, 7),
  F("Banana", "1 medium", 105, 1.3, 27, 0.4),
  F("Cottage cheese", "150 g", 147, 17, 5, 6.5),
  F("Dark chocolate", "20 g", 120, 1.6, 9, 8.6),
];

// Mon … Sun training split; null = rest.
const SPLIT: (WorkoutType | null)[] = ["push", "pull", null, "legs", "upper", "cardio", null];

/** Small deterministic PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

let idCounter = 0;
function demoId(prefix: string): string {
  idCounter += 1;
  return `demo-${prefix}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildDemoState(today: string, timeZone: string, nowIso: string): DemoState {
  const entries: FoodEntry[] = [];
  const workouts: WorkoutLog[] = [];
  const DAYS = 90;

  const fastedDay = addDays(today, -23);
  const goals: GoalRecord[] = [
    { effectiveDate: addDays(today, -(DAYS - 1)), calories: 2400, protein: 130, carbs: 290, fat: 80 },
    { effectiveDate: addDays(today, -34), calories: 2200, protein: 140, carbs: 240, fat: 70 },
  ];

  const push = (date: string, meal: MealType, time: string, food: Food, scale = 1) => {
    const loggedAt = zonedToUtc(date, time, timeZone).toISOString();
    entries.push({
      id: demoId("e"),
      date,
      loggedAt,
      meal,
      name: food.name,
      serving: food.serving,
      calories: Math.round(food.calories * scale),
      protein: Math.round(food.protein * scale * 10) / 10,
      carbs: Math.round(food.carbs * scale * 10) / 10,
      fat: Math.round(food.fat * scale * 10) / 10,
      savedFoodId: null,
      source: "manual",
      externalRef: null,
      createdAt: loggedAt,
    });
  };

  for (let i = DAYS - 1; i >= 1; i--) {
    const date = addDays(today, -i);
    const r = rng(hash(date));
    const pick = <T,>(list: T[]) => list[Math.floor(r() * list.length)];

    // Workout status: follow the split, with occasional skipped or unmarked days.
    const planned = SPLIT[weekdayIndex(date)];
    const roll = r();
    if (roll > 0.12) {
      const trained = planned !== null ? roll > 0.2 : roll > 0.93;
      const type = planned ?? "full_body";
      workouts.push({
        id: demoId("w"),
        date,
        status: trained ? "trained" : "rest",
        workoutType: trained ? type : null,
        durationMin: trained ? (type === "cardio" ? 35 : 50 + Math.floor(r() * 4) * 5) : null,
        notes: null,
        updatedAt: nowIso,
      });
    }

    if (date === fastedDay) {
      push(date, "breakfast", "08:10", F("Black coffee", "1 cup", 0, 0, 0, 0));
      continue;
    }
    // About one day in twelve has no food logged at all.
    if (r() < 0.085) continue;

    const variance = 0.95 + r() * 0.35;
    for (const f of pick(BREAKFASTS)) push(date, "breakfast", "07:45", f);
    for (const f of pick(LUNCHES)) push(date, "lunch", "12:40", f, variance);
    if (r() > 0.06) for (const f of pick(DINNERS)) push(date, "dinner", "19:10", f, variance);
    // Most days include a shake; one or two other snacks on top.
    if (r() < 0.7) push(date, "snack", "16:00", SNACKS[0]);
    const snackCount = r() < 0.25 ? 0 : r() < 0.7 ? 1 : 2;
    for (let s = 0; s < snackCount; s++) push(date, "snack", s === 0 ? "15:30" : "21:00", pick(SNACKS.slice(1)));
  }

  // Today: breakfast and a snack logged so the dashboard has something to show.
  push(today, "breakfast", "07:50", BREAKFASTS[3][0]);
  push(today, "breakfast", "07:50", BREAKFASTS[3][1]);
  push(today, "snack", "10:30", SNACKS[0]);

  const savedFoods: SavedFood[] = [SNACKS[0], SNACKS[2], BREAKFASTS[3][0], LUNCHES[0][0]].map((f, i) => ({
    id: demoId("f"),
    name: f.name,
    serving: f.serving,
    calories: f.calories,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    useCount: 12 - i * 2,
    lastUsedAt: nowIso,
    createdAt: nowIso,
  }));

  const savedMeals: SavedMeal[] = [
    {
      id: demoId("m"),
      name: "Usual breakfast",
      createdAt: nowIso,
      items: BREAKFASTS[1].map((f, position) => ({ id: demoId("mi"), position, ...f })),
    },
    {
      id: demoId("m"),
      name: "Chicken & rice",
      createdAt: nowIso,
      items: DINNERS[0].map((f, position) => ({ id: demoId("mi"), position, ...f })),
    },
  ];

  return {
    version: 1,
    profile: { displayName: null, email: null, timezone: timeZone, energyUnit: "kcal", onboarded: true },
    goals,
    entries,
    savedFoods,
    savedMeals,
    workouts,
  };
}
