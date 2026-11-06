import { describe, expect, it } from "vitest";
import type { GoalRecord } from "./types";
import { goalForDate, upsertGoalRecord } from "./goals";

const history: GoalRecord[] = [
  { effectiveDate: "2026-09-01", calories: 2400, protein: 140, carbs: 280, fat: 75 },
  { effectiveDate: "2026-10-10", calories: 2200, protein: 160, carbs: 220, fat: 70 },
];

describe("goalForDate", () => {
  it("uses the record in force on that day", () => {
    expect(goalForDate(history, "2026-09-15")?.calories).toBe(2400);
    expect(goalForDate(history, "2026-10-09")?.calories).toBe(2400);
    expect(goalForDate(history, "2026-10-10")?.calories).toBe(2200);
    expect(goalForDate(history, "2026-12-31")?.calories).toBe(2200);
  });

  it("falls back to the first record for earlier days", () => {
    expect(goalForDate(history, "2026-01-01")?.calories).toBe(2400);
  });

  it("does not depend on input order", () => {
    expect(goalForDate([...history].reverse(), "2026-09-15")?.calories).toBe(2400);
  });

  it("returns null without any goals", () => {
    expect(goalForDate([], "2026-10-10")).toBeNull();
  });
});

describe("upsertGoalRecord", () => {
  it("adds a new record without rewriting history", () => {
    const next = upsertGoalRecord(history, { calories: 2000, protein: 170, carbs: 180, fat: 65 }, "2026-10-24");
    expect(next).toHaveLength(3);
    expect(goalForDate(next, "2026-10-15")?.calories).toBe(2200);
    expect(goalForDate(next, "2026-10-24")?.calories).toBe(2000);
  });

  it("replaces a same-day record", () => {
    const next = upsertGoalRecord(history, { calories: 2100, protein: 160, carbs: 210, fat: 70 }, "2026-10-10");
    expect(next).toHaveLength(2);
    expect(goalForDate(next, "2026-10-10")?.calories).toBe(2100);
  });
});
