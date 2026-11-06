import type { MacroKey } from "@/lib/domain/types";
import { MACRO_KEYS, MACRO_LABELS } from "@/lib/domain/types";
import type { Progress } from "@/lib/domain/totals";
import { formatGrams } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

const FILL: Record<MacroKey, string> = { protein: "bg-protein", carbs: "bg-carbs", fat: "bg-fat" };
const TRACK: Record<MacroKey, string> = { protein: "bg-protein-track", carbs: "bg-carbs-track", fat: "bg-fat-track" };

export function MacroBar({ macro, p }: { macro: MacroKey; p: Progress }) {
  const pct = Math.min(p.ratio, 1) * 100;
  const label = MACRO_LABELS[macro];
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span aria-hidden className={cn("size-2 rounded-full", FILL[macro])} />
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 truncate text-[15px] font-semibold tnum">
        {formatGrams(p.consumed)}
        <span className="font-normal text-subtle-foreground"> / {formatGrams(p.target)} g</span>
      </p>
      <div
        role="progressbar"
        aria-label={`${label}: ${formatGrams(p.consumed)} of ${formatGrams(p.target)} grams`}
        aria-valuemin={0}
        aria-valuemax={p.target}
        aria-valuenow={Math.min(p.consumed, p.target)}
        className={cn("mt-2 h-1.5 overflow-hidden rounded-full", TRACK[macro])}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out-soft)]", FILL[macro])}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground tnum">
        {p.target <= 0 ? "No target" : p.isOver ? `${formatGrams(p.over)} g over` : p.remaining === 0 ? "Goal met" : `${formatGrams(p.remaining)} g left`}
      </p>
    </div>
  );
}

export function MacroBars({ macros }: { macros: Record<MacroKey, Progress> }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {MACRO_KEYS.map((m) => (
        <MacroBar key={m} macro={m} p={macros[m]} />
      ))}
    </div>
  );
}
