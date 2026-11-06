"use client";

import { useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";

/** Card with a chart and an equivalent table view (for screen readers and exact values). */
export function ChartCard({
  title,
  subtitle,
  legend,
  chart,
  table,
  footnote,
  dimmed,
}: {
  title: string;
  subtitle?: ReactNode;
  legend?: ReactNode;
  chart: ReactNode;
  table?: ReactNode;
  footnote?: ReactNode;
  dimmed?: boolean;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p> : null}
        </div>
        {table ? (
          <Segmented
            label={`${title} view`}
            value={view}
            onValueChange={setView}
            size="sm"
            className="w-[120px] shrink-0"
            options={[
              { value: "chart", label: "Chart" },
              { value: "table", label: "Table" },
            ]}
          />
        ) : null}
      </div>
      {legend && view === "chart" ? <div className="mt-3">{legend}</div> : null}
      <div className={dimmed ? "mt-3 opacity-50 transition-opacity" : "mt-3 transition-opacity"}>
        {view === "chart" || !table ? chart : <div className="max-h-72 overflow-y-auto">{table}</div>}
      </div>
      {footnote ? <p className="mt-3 text-xs text-muted-foreground">{footnote}</p> : null}
    </Card>
  );
}

export function Legend({ items }: { items: { label: string; swatch: "bar" | "line" | "dot"; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={i.swatch === "bar" ? "h-2.5 w-2.5 rounded-[3px]" : i.swatch === "dot" ? "size-2 rounded-full" : "h-0.5 w-3.5 rounded-full"}
            style={{ background: i.color }}
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-left text-[13px] tnum">
      <thead className="sticky top-0 bg-surface text-muted-foreground">
        <tr>
          {head.map((h, i) => (
            <th key={h} scope="col" className={i === 0 ? "py-1.5 font-medium" : "py-1.5 text-right font-medium"}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri} className="border-t border-border">
            {r.map((c, ci) => (
              <td key={ci} className={ci === 0 ? "py-1.5" : "py-1.5 text-right"}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Tooltip shell: value first, label second, line keys. */
export function TooltipBox({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="min-w-36 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] shadow-lg">
      <p className="mb-1 text-xs text-muted-foreground">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2">
          {r.color ? <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: r.color }} /> : null}
          <span className="font-semibold tnum">{r.value}</span>
          <span className="text-muted-foreground">{r.label}</span>
        </p>
      ))}
    </div>
  );
}
