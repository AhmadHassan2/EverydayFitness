import type { FoodEntry, FoodSuggestion, SavedFood } from "./types";

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Two logs are the same food when name and numbers match. */
function suggestionKey(f: { name: string; calories: number; protein: number; carbs: number; fat: number }): string {
  return [normalizeName(f.name), f.calories, f.protein, f.carbs, f.fat].join("|");
}

export function suggestionFromSaved(food: SavedFood): FoodSuggestion {
  return {
    key: `saved:${food.id}`,
    name: food.name,
    serving: food.serving,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    sodium: food.sodium,
    potassium: food.potassium,
    savedFoodId: food.id,
    lastUsedAt: food.lastUsedAt,
    lastMeal: null,
  };
}

/**
 * Distinct foods from history, most recently eaten first. Entries are
 * de-duplicated on name + nutrition, so a recurring food appears once.
 */
export function recentFoods(entries: readonly FoodEntry[], limit: number): FoodSuggestion[] {
  const sorted = [...entries].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
  const seen = new Set<string>();
  const out: FoodSuggestion[] = [];
  for (const e of sorted) {
    const key = suggestionKey(e);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      key: `entry:${key}`,
      name: e.name,
      serving: e.serving,
      calories: e.calories,
      protein: e.protein,
      carbs: e.carbs,
      fat: e.fat,
      sodium: e.sodium,
      potassium: e.potassium,
      savedFoodId: e.savedFoodId,
      lastUsedAt: e.loggedAt,
      lastMeal: e.meal,
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** Case-insensitive match on every word of the query, best matches first. */
export function matchesQuery(name: string, query: string): boolean {
  const hay = normalizeName(name);
  return normalizeName(query)
    .split(" ")
    .filter(Boolean)
    .every((word) => hay.includes(word));
}

export function rankByQuery<T extends { name: string }>(items: readonly T[], query: string): T[] {
  const q = normalizeName(query);
  if (!q) return [...items];
  const scored = items
    .filter((it) => matchesQuery(it.name, q))
    .map((it) => {
      const n = normalizeName(it.name);
      const score = n === q ? 0 : n.startsWith(q) ? 1 : n.split(" ").some((w) => w.startsWith(q)) ? 2 : 3;
      return { it, score };
    });
  scored.sort((a, b) => a.score - b.score);
  return scored.map((s) => s.it);
}

/** Merges suggestion lists, keeping the first occurrence of each food. */
export function mergeSuggestions(...lists: FoodSuggestion[][]): FoodSuggestion[] {
  const seen = new Set<string>();
  const out: FoodSuggestion[] = [];
  for (const list of lists) {
    for (const s of list) {
      const key = suggestionKey(s);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
    }
  }
  return out;
}
