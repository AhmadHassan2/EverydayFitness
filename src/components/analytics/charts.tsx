"use client";

import { Bar, BarChart, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyPoint, MonthConsistency, WeekBucket } from "@/lib/domain/analytics";
import type { EnergyUnit, MacroKey } from "@/lib/domain/types";
import { MACRO_KEYS, MACRO_LABELS } from "@/lib/domain/types";
import { energyLabel, energyValue, formatGrams, formatNumber, formatPercent } from "@/lib/domain/format";
import { addDays, longDayLabel, shortDateLabel } from "@/lib/domain/dates";
import { TooltipBox } from "./chart-card";

const AXIS = { fontSize: 11, fill: "var(--chart-axis)" };
const GRID = { stroke: "var(--chart-grid)", strokeDasharray: undefined, vertical: false } as const;

/** Round the axis top up to a clean step so ticks land on 0 / 500 / 1K … */
const niceMax = (step: number) => (max: number) => Math.max(step, Math.ceil(max / step) * step);

function compact(n: number): string {
  return n >= 1000 ? `${Math.round(n / 100) / 10}K`.replace(".0K", "K") : String(Math.round(n));
}

function tickFormatter(days: number) {
  return (d: string) => (days <= 7 ? longDayLabel(d).split(",")[0] : shortDateLabel(d));
}

/** Pick ~5 evenly spaced ticks so labels never collide at phone width. */
function ticks(points: { date: string }[], max = 5): string[] {
  if (points.length <= max) return points.map((p) => p.date);
  const step = Math.ceil((points.length - 1) / (max - 1));
  const out: string[] = [];
  for (let i = points.length - 1; i >= 0; i -= step) out.unshift(points[i].date);
  return out;
}

export function CaloriesChart({ data, unit }: { data: DailyPoint[]; unit: EnergyUnit }) {
  const rows = data.map((d) => ({
    date: d.date,
    intake: d.calories === null ? null : energyValue(d.calories, unit),
    goal: d.calorieTarget === null ? null : energyValue(d.calorieTarget, unit),
  }));
  const u = energyLabel(unit);
  return (
    <div className="h-52" role="img" aria-label={`Daily intake in ${u} with goal line. Use the table view for exact values.`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 4, right: 16, bottom: 0, left: -12 }} barCategoryGap="22%">
          <CartesianGrid {...GRID} />
          <XAxis dataKey="date" ticks={ticks(rows)} tickFormatter={tickFormatter(rows.length)} tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--chart-grid)" }} interval={0} minTickGap={8} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} tickFormatter={compact} domain={[0, niceMax(unit === "kj" ? 2000 : 500)]} tickCount={5} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as (typeof rows)[number];
              return (
                <TooltipBox
                  title={longDayLabel(String(label))}
                  rows={[
                    { label: p.intake === null ? "not logged" : u, value: p.intake === null ? "—" : formatNumber(p.intake), color: "var(--accent)" },
                    ...(p.goal !== null ? [{ label: `${u} goal`, value: formatNumber(p.goal), color: "var(--muted-foreground)" }] : []),
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="intake" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
          <Line dataKey="goal" type="stepAfter" stroke="var(--muted-foreground)" strokeWidth={1.5} dot={false} activeDot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeeklyCaloriesChart({ weeks, unit }: { weeks: WeekBucket[]; unit: EnergyUnit }) {
  const rows = weeks.map((w) => ({ ...w, avg: w.avgCalories === null ? null : energyValue(w.avgCalories, unit) }));
  const u = energyLabel(unit);
  return (
    <div className="h-44" role="img" aria-label={`Weekly average intake in ${u}. Use the table view for exact values.`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 4, right: 16, bottom: 0, left: -12 }} barCategoryGap="30%">
          <CartesianGrid {...GRID} />
          <XAxis dataKey="weekStart" tickFormatter={(d) => shortDateLabel(d)} tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--chart-grid)" }} ticks={ticks(rows.map((r) => ({ date: r.weekStart })), 5)} interval={0} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} tickFormatter={compact} domain={[0, niceMax(unit === "kj" ? 2000 : 500)]} tickCount={5} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const w = payload[0].payload as (typeof rows)[number];
              return (
                <TooltipBox
                  title={`Week of ${shortDateLabel(w.weekStart)}`}
                  rows={[
                    { label: `${u} avg`, value: w.avg === null ? "—" : formatNumber(w.avg), color: "var(--accent)" },
                    { label: "days logged", value: `${w.loggedDays}/${w.daysInRange}` },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="avg" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProteinChart({ data }: { data: DailyPoint[] }) {
  const dots = data.length <= 31;
  return (
    <div className="h-48" role="img" aria-label="Daily protein in grams with goal line. Use the table view for exact values.">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 16, bottom: 0, left: -12 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="date" ticks={ticks(data)} tickFormatter={tickFormatter(data.length)} tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--chart-grid)" }} interval={0} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} domain={[0, niceMax(25)]} tickCount={5} allowDecimals={false} />
          <Tooltip
            cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as DailyPoint;
              return (
                <TooltipBox
                  title={longDayLabel(String(label))}
                  rows={[
                    { label: p.protein === null ? "not logged" : "g protein", value: p.protein === null ? "—" : formatGrams(p.protein), color: "var(--protein)" },
                    ...(p.proteinTarget !== null ? [{ label: "g goal", value: formatGrams(p.proteinTarget), color: "var(--muted-foreground)" }] : []),
                  ]}
                />
              );
            }}
          />
          <Line dataKey="proteinTarget" type="stepAfter" stroke="var(--muted-foreground)" strokeWidth={1.5} dot={false} activeDot={false} isAnimationActive={false} />
          <Line
            dataKey="protein"
            type="linear"
            stroke="var(--protein)"
            strokeWidth={2}
            connectNulls={false}
            dot={dots ? { r: 3.5, fill: "var(--protein)", stroke: "var(--surface)", strokeWidth: 2 } : false}
            activeDot={{ r: 5, fill: "var(--protein)", stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const MACRO_COLOR: Record<MacroKey, string> = { protein: "var(--protein)", carbs: "var(--carbs)", fat: "var(--fat)" };

/** Share of energy from each macro as one 100% bar with a 2px surface gap. */
export function MacroSplit({ split, avgGrams }: { split: Record<MacroKey, number>; avgGrams: Record<MacroKey, number | null> }) {
  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={MACRO_KEYS.map((m) => `${MACRO_LABELS[m]} ${formatPercent(split[m])}`).join(", ")}>
        {MACRO_KEYS.map((m) => (
          <div key={m} style={{ width: `${split[m] * 100}%`, background: MACRO_COLOR[m] }} className="h-full first:rounded-l-full last:rounded-r-full" />
        ))}
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-3">
        {MACRO_KEYS.map((m) => (
          <div key={m}>
            <dt className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <span aria-hidden className="size-2 rounded-full" style={{ background: MACRO_COLOR[m] }} />
              {MACRO_LABELS[m]}
            </dt>
            <dd className="mt-0.5 text-lg font-semibold">{formatPercent(split[m])}</dd>
            <dd className="text-xs text-muted-foreground tnum">{avgGrams[m] === null ? "—" : `${formatGrams(avgGrams[m]!)} g / day`}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function TrainingWeeksChart({ weeks }: { weeks: WeekBucket[] }) {
  return (
    <div className="h-40" role="img" aria-label="Training days per week. Use the table view for exact values.">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={weeks} margin={{ top: 4, right: 16, bottom: 0, left: -12 }} barCategoryGap="30%">
          <CartesianGrid {...GRID} />
          <XAxis dataKey="weekStart" tickFormatter={(d) => shortDateLabel(d)} tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--chart-grid)" }} ticks={ticks(weeks.map((r) => ({ date: r.weekStart })), 5)} interval={0} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} domain={[0, 7]} ticks={[0, 2, 4, 6]} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const w = payload[0].payload as WeekBucket;
              const end = addDays(w.weekStart, 6);
              return (
                <TooltipBox
                  title={`${shortDateLabel(w.weekStart)} – ${shortDateLabel(end)}`}
                  rows={[
                    { label: "trained", value: String(w.trainedDays), color: "var(--accent)" },
                    { label: "rest", value: String(w.restDays) },
                    ...(w.daysInRange < 7 ? [{ label: "days in range", value: String(w.daysInRange) }] : []),
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="trainedDays" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyConsistency({ months }: { months: MonthConsistency[] }) {
  return (
    <ul className="grid gap-3">
      {months.map((m) => {
        const label = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(`${m.month}-01T00:00:00Z`));
        return (
          <li key={m.month}>
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="font-medium">{label}</span>
              <span className="text-muted-foreground tnum">
                {m.trainedDays} of {m.days} days · <span className="font-medium text-foreground">{formatPercent(m.ratio)}</span>
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-accent-track"
              role="progressbar"
              aria-label={`${label}: trained ${m.trainedDays} of ${m.days} days`}
              aria-valuemin={0}
              aria-valuemax={m.days}
              aria-valuenow={m.trainedDays}
            >
              <div className="h-full rounded-full bg-accent" style={{ width: `${m.ratio * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

