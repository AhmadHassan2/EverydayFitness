"use client";

import { useState } from "react";
import { Layers, PencilLine, Search, SlidersHorizontal, Star, X } from "lucide-react";
import type { EnergyUnit, FoodSuggestion, SavedMeal } from "@/lib/domain/types";
import { sumNutrition } from "@/lib/domain/totals";
import { energyLabel, formatEnergy, pluralize } from "@/lib/domain/format";
import { suggestionFromSaved } from "@/lib/domain/foods";
import { useFoodSearch, useRecentFoods, useSavedFoods, useSavedMeals } from "@/lib/data/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MacroLine } from "@/components/today/meal-list";

interface QuickPickProps {
  unit: EnergyUnit;
  onLog: (s: FoodSuggestion) => void;
  onAdjust: (s: FoodSuggestion) => void;
  onLogMeal: (m: SavedMeal) => void;
  onManual: (name?: string) => void;
}

export function QuickPick({ unit, onLog, onAdjust, onLogMeal, onManual }: QuickPickProps) {
  const [query, setQuery] = useState("");
  const search = useFoodSearch(query);
  const recent = useRecentFoods(12);
  const saved = useSavedFoods();
  const meals = useSavedMeals();
  const searching = query.trim().length > 0;

  return (
    <div className="grid content-start gap-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-subtle-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your foods"
            aria-label="Search your foods"
            enterKeyHint="search"
            autoComplete="off"
            className="pl-10 pr-9 [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-subtle-foreground hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
        <Button type="button" variant="secondary" onClick={() => onManual(query.trim() || undefined)} className="px-3">
          <PencilLine aria-hidden /> Manual
        </Button>
      </div>

      {searching ? (
        <Section title="Results">
          {search.isLoading && !search.data?.length ? (
            <ListSkeleton />
          ) : search.data && search.data.length > 0 ? (
            <SuggestionList items={search.data} unit={unit} onLog={onLog} onAdjust={onAdjust} />
          ) : (
            <div className="rounded-xl border border-dashed border-border-strong px-4 py-5 text-center">
              <p className="text-[15px] font-medium">No match for “{query.trim()}”</p>
              <p className="mt-1 text-sm text-muted-foreground">Search covers foods you&apos;ve logged or saved.</p>
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => onManual(query.trim())}>
                Add “{query.trim()}” manually
              </Button>
            </div>
          )}
        </Section>
      ) : (
        <>
          {meals.data && meals.data.length > 0 ? (
            <Section title="Saved meals" icon={<Layers aria-hidden />}>
              <ul className="overflow-hidden rounded-xl border border-border">
                {meals.data.map((m) => {
                  const t = sumNutrition(m.items);
                  return (
                    <li key={m.id} className="border-b border-border last:border-b-0">
                      <button
                        type="button"
                        onClick={() => onLogMeal(m)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-2/60"
                        aria-label={`Log ${m.name}: ${pluralize(m.items.length, "item")}, ${formatEnergy(t.calories, unit)} ${energyLabel(unit)}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-medium">{m.name}</p>
                          <p className="truncate text-[13px] text-muted-foreground">
                            {m.items.map((i) => i.name).join(", ")}
                          </p>
                        </div>
                        <span className="text-[15px] font-medium tnum">{formatEnergy(t.calories, unit)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Section>
          ) : null}

          {saved.data && saved.data.length > 0 ? (
            <Section title="Favourites" icon={<Star aria-hidden />}>
              <SuggestionList items={saved.data.map(suggestionFromSaved)} unit={unit} onLog={onLog} onAdjust={onAdjust} />
            </Section>
          ) : null}

          <Section title="Recent">
            {recent.isPending ? (
              <ListSkeleton />
            ) : recent.data && recent.data.length > 0 ? (
              <SuggestionList items={recent.data} unit={unit} onLog={onLog} onAdjust={onAdjust} />
            ) : (
              <div className="rounded-xl border border-dashed border-border-strong px-4 py-5 text-center">
                <p className="text-[15px] font-medium">No recent foods yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Foods you log show up here so you can add them again in one tap.</p>
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h3 className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground [&_svg]:size-3.5">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function SuggestionList({
  items,
  unit,
  onLog,
  onAdjust,
}: {
  items: FoodSuggestion[];
  unit: EnergyUnit;
  onLog: (s: FoodSuggestion) => void;
  onAdjust: (s: FoodSuggestion) => void;
}) {
  return (
    <ul className="overflow-hidden rounded-xl border border-border">
      {items.map((s) => (
        <li key={s.key} className="flex items-center border-b border-border last:border-b-0">
          <button
            type="button"
            onClick={() => onLog(s)}
            aria-label={`Log ${s.name}, ${formatEnergy(s.calories, unit)} ${energyLabel(unit)}`}
            className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3 text-left hover:bg-surface-2/60"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium">{s.name}</p>
              <p className="truncate text-[13px] text-muted-foreground tnum">
                <MacroLine p={s.protein} c={s.carbs} f={s.fat} />
                {s.serving ? ` · ${s.serving}` : ""}
              </p>
            </div>
            <span className="text-[15px] font-medium tnum">{formatEnergy(s.calories, unit)}</span>
          </button>
          <button
            type="button"
            onClick={() => onAdjust(s)}
            aria-label={`Adjust ${s.name} before logging`}
            className="mx-1 flex size-10 shrink-0 items-center justify-center rounded-lg text-subtle-foreground hover:bg-surface-2 hover:text-foreground"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-3 rounded-xl border border-border p-3" aria-busy>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex justify-between gap-4">
          <div className="grid flex-1 gap-1.5">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-4 w-10" />
        </div>
      ))}
    </div>
  );
}
