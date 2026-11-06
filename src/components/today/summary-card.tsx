"use client";

import { TriangleAlert } from "lucide-react";
import type { EnergyUnit, FoodEntry, Goals } from "@/lib/domain/types";
import { dayProgress } from "@/lib/domain/totals";
import { energyLabel, formatEnergy, formatNumber, formatPercent } from "@/lib/domain/format";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalorieRing } from "./calorie-ring";
import { MacroBars } from "./macro-bars";

export function SummaryCard({ entries, goals, unit }: { entries: FoodEntry[]; goals: Goals; unit: EnergyUnit }) {
  const { calories, macros, totals } = dayProgress(entries, goals);
  const u = energyLabel(unit);
  const pct = formatPercent(calories.ratio);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-5">
        <CalorieRing ratio={calories.ratio} isOver={calories.isOver}>
          <span className="text-[13px] text-muted-foreground">{calories.isOver ? "Over by" : "Remaining"}</span>
          <span className={calories.isOver ? "text-[32px] font-semibold leading-none tracking-[-0.03em] text-over" : "text-[32px] font-semibold leading-none tracking-[-0.03em]"}>
            {formatEnergy(calories.isOver ? calories.over : calories.remaining, unit)}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">{u}</span>
        </CalorieRing>
        <dl className="grid min-w-0 flex-1 gap-3">
          <div>
            <dt className="text-[13px] text-muted-foreground">Eaten</dt>
            <dd className="text-xl font-semibold tracking-[-0.01em] tnum">
              {formatEnergy(calories.consumed, unit)} <span className="text-sm font-normal text-subtle-foreground">{u}</span>
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted-foreground">Goal</dt>
            <dd className="text-xl font-semibold tracking-[-0.01em] tnum">
              {formatEnergy(calories.target, unit)} <span className="text-sm font-normal text-subtle-foreground">{u}</span>
            </dd>
          </div>
          <div>
            <dt className="sr-only">Progress</dt>
            <dd className="flex items-center gap-1.5 text-[13px] font-medium tnum">
              {calories.isOver ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-over-soft px-2 py-0.5 text-over">
                  <TriangleAlert className="size-3.5" aria-hidden /> {pct} of goal
                </span>
              ) : (
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-accent">{pct} of goal</span>
              )}
            </dd>
          </div>
        </dl>
      </div>
      <div className="mt-5 border-t border-border pt-4">
        <MacroBars macros={macros} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
        <div>
          <dt className="text-[13px] text-muted-foreground">Sodium</dt>
          <dd className="mt-1 text-[15px] font-semibold tnum">{formatNumber(totals.sodium ?? 0)} <span className="text-xs font-normal text-subtle-foreground">mg</span></dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted-foreground">Potassium</dt>
          <dd className="mt-1 text-[15px] font-semibold tnum">{formatNumber(totals.potassium ?? 0)} <span className="text-xs font-normal text-subtle-foreground">mg</span></dd>
        </div>
      </dl>
    </Card>
  );
}

export function SummaryCardSkeleton() {
  return (
    <Card className="p-4" aria-busy>
      <div className="flex items-center gap-5">
        <Skeleton className="size-[148px] rounded-full" />
        <div className="grid flex-1 gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-4 border-t border-border pt-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    </Card>
  );
}
