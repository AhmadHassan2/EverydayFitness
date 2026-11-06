"use client";

import Link from "next/link";
import { useRepository } from "@/lib/data/provider";

export function DemoBadge() {
  const repo = useRepository();
  if (repo?.mode !== "demo") return null;
  return (
    <Link
      href="/settings#demo"
      className="rounded-full border border-border-strong px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
      title="Demo mode: data stays on this device"
    >
      Demo
    </Link>
  );
}
