"use client";

import * as React from "react";
import {
  CalendarSync,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Loader2,
  Save,
} from "lucide-react";
import { toast } from "sonner";

import { dayLabel, dayNumber, isWeekend, monthLabel } from "@/lib/date";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface CalendarCell {
  date: string;
  rate: number;
  allotment: number;
  booked: number;
  minStay: number;
  maxStay: number;
  closed: boolean;
  closedToArrival: boolean;
  closedToDeparture: boolean;
}

export interface CalendarPlan {
  ratePlanId: string;
  title: string;
  code: string;
  mode: string;
  channexMapped: boolean;
  cells: CalendarCell[];
}

export interface CalendarRow {
  roomTypeId: string;
  roomTypeTitle: string;
  roomTypeCode: string;
  count: number;
  channexMapped: boolean;
  plans: CalendarPlan[];
  availability: { date: string; free: number; allotment: number }[];
}

type Edit = { rate?: number; minStay?: number; closed?: boolean };

const DAY_WIDTH = "5.25rem";

/**
 * The ARI grid: room types down the side, dates across the top.
 *
 * Edits are staged locally so an operator can rework a whole week before
 * pushing once — a Channex push is a paid, rate-limited call, and partial
 * pushes are what create rate parity incidents.
 */
export function RateCalendar({
  initialFrom,
  days,
  dates,
  rows,
  channexConfigured,
}: {
  initialFrom: string;
  days: number;
  dates: string[];
  rows: CalendarRow[];
  channexConfigured: boolean;
}) {
  const [offset, setOffset] = React.useState(0);
  const [edits, setEdits] = React.useState<Record<string, Edit>>({});
  const [syncing, setSyncing] = React.useState(false);
  const [density, setDensity] = React.useState<"comfortable" | "compact">("comfortable");

  const visibleDates = React.useMemo(
    () => dates.slice(offset, offset + days),
    [dates, days, offset],
  );

  const editCount = Object.keys(edits).length;

  const key = (planId: string, date: string) => `${planId}|${date}`;

  const stage = (planId: string, date: string, patch: Edit) => {
    setEdits((prev) => ({ ...prev, [key(planId, date)]: { ...prev[key(planId, date)], ...patch } }));
  };

  const discard = () => {
    setEdits({});
    toast.info("Pending changes discarded.");
  };

  const push = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/channex/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          from: visibleDates[0] ?? initialFrom,
          days: visibleDates.length,
          scope: "ari",
        }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        mode: string;
        reason?: string;
        error?: string;
        plan?: { availabilityValues: number; restrictionValues: number };
      };

      if (!result.ok) {
        toast.error("Channex rejected the push", { description: result.error });
        return;
      }

      const counts = `${result.plan?.availabilityValues ?? 0} availability + ${result.plan?.restrictionValues ?? 0} rate values`;
      if (result.mode === "dry-run") {
        toast.warning("Dry run — nothing was sent", {
          description: `${result.reason}. Prepared ${counts}.`,
        });
      } else {
        toast.success("Pushed to Channex", { description: `${counts} accepted.` });
        setEdits({});
      }
    } catch (error) {
      toast.error("Sync failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSyncing(false);
    }
  };

  const canGoBack = offset > 0;
  const canGoForward = offset + days < dates.length;
  const rowHeight = density === "compact" ? "h-9" : "h-11";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-md border">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-r-none"
            disabled={!canGoBack}
            onClick={() => setOffset((value) => Math.max(0, value - 7))}
            aria-label="Previous week"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="tabular w-40 border-x px-2 text-center text-sm font-medium">
            {monthLabel(visibleDates[0] ?? initialFrom)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-l-none"
            disabled={!canGoForward}
            onClick={() => setOffset((value) => Math.min(dates.length - days, value + 7))}
            aria-label="Next week"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={() => setOffset(0)}>
          Today
        </Button>

        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={density}
          onValueChange={(value) => value && setDensity(value as typeof density)}
          className="hidden md:flex"
        >
          <ToggleGroupItem value="comfortable" className="px-2.5 text-xs">
            Comfortable
          </ToggleGroupItem>
          <ToggleGroupItem value="compact" className="px-2.5 text-xs">
            Compact
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="ml-auto flex items-center gap-2">
          {editCount > 0 ? (
            <>
              <Badge variant="secondary" className="tabular">
                {editCount} pending
              </Badge>
              <Button variant="ghost" size="sm" onClick={discard}>
                Discard
              </Button>
            </>
          ) : null}
          <Button size="sm" onClick={push} disabled={syncing} className="gap-1.5">
            {syncing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : editCount > 0 ? (
              <Save className="size-3.5" />
            ) : (
              <CalendarSync className="size-3.5" />
            )}
            {editCount > 0 ? "Save & push" : "Sync now"}
          </Button>
        </div>
      </div>

      {!channexConfigured ? (
        <div className="border-border bg-muted/40 text-muted-foreground flex items-start gap-2 rounded-lg border border-dashed p-3 text-sm">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            Channex is not configured, so &ldquo;Sync now&rdquo; runs as a dry run and reports
            exactly what would be sent. Add <code className="tabular">CHANNEX_API_KEY</code> in
            Settings › Connectivity to go live.
          </p>
        </div>
      ) : null}

      <Card className="overflow-hidden p-0">
        <CardContent className="p-0">
          <div className="scrollbar-thin overflow-x-auto">
            <div style={{ minWidth: `calc(14rem + ${visibleDates.length} * ${DAY_WIDTH})` }}>
              {/* Date header */}
              <div className="bg-muted/50 sticky top-0 z-20 flex border-b">
                <div className="bg-muted/50 sticky left-0 z-10 w-56 shrink-0 border-r px-3 py-2">
                  <p className="text-xs font-medium">Room type / rate plan</p>
                </div>
                {visibleDates.map((date) => (
                  <div
                    key={date}
                    style={{ width: DAY_WIDTH }}
                    className={cn(
                      "shrink-0 border-r px-1 py-1.5 text-center last:border-r-0",
                      isWeekend(date) && "bg-accent/50",
                    )}
                  >
                    <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                      {dayLabel(date)}
                    </p>
                    <p className="tabular text-sm font-semibold">{dayNumber(date)}</p>
                  </div>
                ))}
              </div>

              {rows.map((row) => (
                <div key={row.roomTypeId} className="border-b last:border-b-0">
                  {/* Availability line */}
                  <div className="bg-background flex">
                    <div className="bg-background sticky left-0 z-10 flex w-56 shrink-0 items-center gap-2 border-r px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{row.roomTypeTitle}</p>
                        <p className="text-muted-foreground text-xs">
                          {row.count} rooms · {row.roomTypeCode}
                        </p>
                      </div>
                      {!row.channexMapped ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CircleAlert className="ml-auto size-3.5 shrink-0 text-amber-500" />
                          </TooltipTrigger>
                          <TooltipContent>Not mapped to Channex</TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                    {row.availability
                      .filter((a) => visibleDates.includes(a.date))
                      .map((availability) => {
                        const ratio = availability.free / Math.max(1, availability.allotment);
                        return (
                          <div
                            key={availability.date}
                            style={{ width: DAY_WIDTH }}
                            className={cn(
                              "flex shrink-0 flex-col items-center justify-center border-r py-1.5 last:border-r-0",
                              isWeekend(availability.date) && "bg-accent/30",
                            )}
                          >
                            <span
                              className={cn(
                                "tabular text-sm font-semibold",
                                ratio === 0
                                  ? "text-destructive"
                                  : ratio < 0.2
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-emerald-600 dark:text-emerald-400",
                              )}
                            >
                              {availability.free}
                            </span>
                            <span className="text-muted-foreground text-[10px]">
                              of {availability.allotment}
                            </span>
                          </div>
                        );
                      })}
                  </div>

                  {/* One line per rate plan */}
                  {row.plans.map((plan) => (
                    <div key={plan.ratePlanId} className="hover:bg-muted/30 flex">
                      <div className="bg-background sticky left-0 z-10 flex w-56 shrink-0 items-center gap-1.5 border-r py-1.5 pr-2 pl-6">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{plan.title}</p>
                          <p className="text-muted-foreground text-[10px]">
                            {plan.code}
                            {plan.mode === "derived" ? " · derived" : ""}
                          </p>
                        </div>
                        {!plan.channexMapped ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <CircleAlert className="size-3 shrink-0 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent>Rate plan is not mapped</TooltipContent>
                          </Tooltip>
                        ) : null}
                      </div>

                      {plan.cells
                        .filter((cell) => visibleDates.includes(cell.date))
                        .map((cell) => {
                          const edit = edits[key(plan.ratePlanId, cell.date)];
                          const rate = edit?.rate ?? cell.rate;
                          const minStay = edit?.minStay ?? cell.minStay;
                          const closed = edit?.closed ?? cell.closed;
                          const dirty = Boolean(edit);

                          return (
                            <Popover key={cell.date}>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  style={{ width: DAY_WIDTH }}
                                  className={cn(
                                    "shrink-0 border-r px-1 text-center transition-colors last:border-r-0",
                                    rowHeight,
                                    "hover:bg-accent focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
                                    isWeekend(cell.date) && "bg-accent/20",
                                    dirty && "bg-primary/10 ring-primary/40 ring-1 ring-inset",
                                    closed && "bg-destructive/10",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "tabular block text-xs font-medium",
                                      closed && "text-destructive line-through",
                                    )}
                                  >
                                    {compactRate(rate)}
                                  </span>
                                  <span className="text-muted-foreground block text-[10px]">
                                    {closed ? "stop sell" : `min ${minStay}n`}
                                    {cell.closedToArrival ? " · CTA" : ""}
                                  </span>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 space-y-3" align="center">
                                <div>
                                  <p className="text-sm font-medium">{plan.title}</p>
                                  <p className="text-muted-foreground text-xs">
                                    {row.roomTypeTitle} · {cell.date}
                                  </p>
                                </div>
                                <div className="space-y-1.5">
                                  <Label htmlFor={`rate-${plan.ratePlanId}-${cell.date}`}>
                                    Rate
                                  </Label>
                                  <Input
                                    id={`rate-${plan.ratePlanId}-${cell.date}`}
                                    type="number"
                                    step={50000}
                                    className="tabular"
                                    value={rate}
                                    onChange={(event) =>
                                      stage(plan.ratePlanId, cell.date, {
                                        rate: Number(event.target.value),
                                      })
                                    }
                                  />
                                  <p className="text-muted-foreground text-xs">
                                    {formatMoney(rate)} per night
                                  </p>
                                </div>
                                <div className="space-y-1.5">
                                  <Label htmlFor={`min-${plan.ratePlanId}-${cell.date}`}>
                                    Minimum stay
                                  </Label>
                                  <Input
                                    id={`min-${plan.ratePlanId}-${cell.date}`}
                                    type="number"
                                    min={1}
                                    max={30}
                                    className="tabular"
                                    value={minStay}
                                    onChange={(event) =>
                                      stage(plan.ratePlanId, cell.date, {
                                        minStay: Number(event.target.value),
                                      })
                                    }
                                  />
                                </div>
                                <div className="flex items-center justify-between rounded-md border p-2">
                                  <div>
                                    <p className="text-sm font-medium">Stop sell</p>
                                    <p className="text-muted-foreground text-xs">
                                      Closes the date on every channel
                                    </p>
                                  </div>
                                  <Switch
                                    checked={closed}
                                    onCheckedChange={(checked) =>
                                      stage(plan.ratePlanId, cell.date, { closed: checked })
                                    }
                                  />
                                </div>
                                <p className="text-muted-foreground text-xs">
                                  {cell.booked} of {cell.allotment} rooms sold on this date.
                                </p>
                              </PopoverContent>
                            </Popover>
                          );
                        })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Rp 1,450,000 is too wide for an 84px cell — show 1.45M instead. */
function compactRate(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}
