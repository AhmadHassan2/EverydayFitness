import { describe, expect, it } from "vitest";
import { foodEntryInputSchema, foodFormSchema, goalsFormSchema } from "./validation";

const baseForm = {
  name: " Chicken  wrap ",
  serving: "",
  calories: "520",
  protein: "38,5",
  carbs: "",
  fat: "18.25",
  sodium: "120",
  potassium: "340",
  meal: "lunch" as const,
  date: "2026-10-24",
  time: "12:30",
  saveAsFavorite: false,
};

describe("food form", () => {
  it("parses decimals, commas and blanks", () => {
    const out = foodFormSchema.parse(baseForm);
    expect(out).toMatchObject({ calories: 520, protein: 38.5, carbs: 0, fat: 18.25, sodium: 120, potassium: 340 });
  });

  it("requires calories and rejects junk", () => {
    expect(foodFormSchema.safeParse({ ...baseForm, calories: "" }).success).toBe(false);
    expect(foodFormSchema.safeParse({ ...baseForm, protein: "12g" }).success).toBe(false);
    expect(foodFormSchema.safeParse({ ...baseForm, calories: "-5" }).success).toBe(false);
    expect(foodFormSchema.safeParse({ ...baseForm, calories: "10001" }).success).toBe(false);
  });
});

describe("food entry (server) schema", () => {
  it("normalises names and rounds to one decimal", () => {
    const out = foodEntryInputSchema.parse({
      date: "2026-10-24",
      loggedAt: "2026-10-24T16:30:00.000Z",
      meal: "lunch",
      name: " Chicken  wrap ",
      serving: "",
      calories: 520.04,
      protein: 38.55,
      carbs: 0,
      fat: 18.25,
      sodium: 120.04,
      potassium: 340,
      savedFoodId: null,
      source: "manual",
    });
    expect(out.name).toBe("Chicken wrap");
    expect(out.serving).toBeNull();
    expect(out.calories).toBe(520);
    expect(out.fat).toBe(18.3);
  });

  it("rejects impossible dates", () => {
    const r = foodEntryInputSchema.safeParse({
      date: "2026-02-30",
      loggedAt: "2026-02-28T16:30:00.000Z",
      meal: "lunch",
      name: "x",
      serving: null,
      calories: 1,
      protein: 0,
      carbs: 0,
      fat: 0,
      sodium: 0,
      potassium: 0,
      savedFoodId: null,
      source: "manual",
    });
    expect(r.success).toBe(false);
  });
});

describe("goals form", () => {
  it("requires whole-number calories of at least 500", () => {
    expect(goalsFormSchema.safeParse({ calories: "2200" }).success).toBe(true);
    expect(goalsFormSchema.safeParse({ calories: "2200.5" }).success).toBe(false);
    expect(goalsFormSchema.safeParse({ calories: "300" }).success).toBe(false);
  });
});
