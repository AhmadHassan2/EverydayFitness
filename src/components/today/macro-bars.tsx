import type { MacroKey } from "@/lib/domain/types";
import { MACRO_KEYS, MACRO_LABELS } from "@/lib/domain/types";
import { formatGrams } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

const FILL: Record<MacroKey, string> = { protein: "bg-protein", carbs: "bg-carbs", fat: "bg-fat" };

export function MacroBar({ macro, consumed }: { macro: MacroKey; consumed: number }) {
  const label = MACRO_LABELS[macro];
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span aria-hidden className={cn("size-2 rounded-full", FILL[macro])} />
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 truncate text-[15px] font-semibold tnum">
        {formatGrams(consumed)} <span className="font-normal text-subtle-foreground">g</span>
      </p>
    </div>
  );
}

export function MacroBars({ macros }: { macros: Record<MacroKey, number> }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {MACRO_KEYS.map((m) => (
        <MacroBar key={m} macro={m} consumed={macros[m]} />
      ))}
    </div>
  );
}
