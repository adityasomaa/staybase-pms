import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { formatDelta } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  delta,
  hint,
  icon: Icon,
  /** Set when a rising number is bad (e.g. cancellations). */
  invertDelta = false,
}: {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  icon?: LucideIcon;
  invertDelta?: boolean;
}) {
  const positive = delta === undefined ? null : invertDelta ? delta < 0 : delta > 0;
  const Trend = delta !== undefined && delta < 0 ? TrendingDown : TrendingUp;

  return (
    <Card className="gap-0 py-4">
      <CardContent className="px-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {label}
          </p>
          {Icon ? <Icon className="text-muted-foreground/70 size-4 shrink-0" /> : null}
        </div>
        <p className="tabular mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        <div className="mt-1.5 flex items-center gap-2 text-xs">
          {delta !== undefined ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 font-medium tabular",
                positive
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-destructive/20 bg-destructive/10 text-destructive",
              )}
            >
              <Trend className="size-3" />
              {formatDelta(delta)}
            </span>
          ) : null}
          {hint ? <span className="text-muted-foreground truncate">{hint}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
