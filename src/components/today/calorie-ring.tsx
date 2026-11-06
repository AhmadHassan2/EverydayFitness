import { cn } from "@/lib/utils";

interface CalorieRingProps {
  /** consumed / target (unclamped). */
  ratio: number;
  isOver: boolean;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Progress ring. Fills clockwise from 12 o'clock in the accent colour; past
 * 100% the overage draws a second lap in the over-target colour, so "how far
 * over" stays visible instead of just a full ring.
 */
export function CalorieRing({ ratio, isOver, size = 148, stroke = 12, children, className }: CalorieRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const base = Math.min(Math.max(ratio, 0), 1);
  const over = isOver ? Math.min(ratio - 1, 1) : 0;

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent-track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - base)}
          className="transition-[stroke-dashoffset] duration-700 ease-[var(--ease-out-soft)]"
          style={{ opacity: base === 0 ? 0 : 1 }}
        />
        {over > 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--over)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - Math.max(over, 0.02))}
            className="transition-[stroke-dashoffset] duration-700 ease-[var(--ease-out-soft)]"
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
