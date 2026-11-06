import type { EnergyUnit } from "./types";

export const KJ_PER_KCAL = 4.184;

const intFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const oneFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

/** Energy for display. Values are stored in kcal. */
export function energyValue(kcal: number, unit: EnergyUnit): number {
  return unit === "kj" ? kcal * KJ_PER_KCAL : kcal;
}

export function formatEnergy(kcal: number, unit: EnergyUnit): string {
  return intFmt.format(Math.round(energyValue(kcal, unit)));
}

export function energyLabel(unit: EnergyUnit): string {
  return unit === "kj" ? "kJ" : "kcal";
}

export function formatGrams(g: number): string {
  // Whole grams read cleaner at a glance; show a decimal only below 10 g.
  return g < 10 && g % 1 !== 0 ? oneFmt.format(g) : intFmt.format(Math.round(g));
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function formatNumber(n: number): string {
  return intFmt.format(Math.round(n));
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
