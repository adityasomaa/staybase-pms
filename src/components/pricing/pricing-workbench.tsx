"use client";

import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDown, ArrowUp, Info, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { formatDateShort } from "@/lib/date";
import { formatMoney, formatMoneyCompact, formatPercent } from "@/lib/format";
import { describeAdjustment, ruleKindLabels, suggestPrice } from "@/lib/pricing";
import type { PricingGuardrail, PricingRule } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface PricingInputView {
  date: string;
  roomTypeId: string;
  roomTypeTitle: string;
  ratePlanId: string;
  currentRate: number;
  occupancy: number;
  gapNights: number;
  competitorRate: number;
  roomsFree: number;
}

const chartConfig = {
  current: { label: "Current", color: "var(--muted-foreground)" },
  suggested: { label: "Suggested", color: "var(--chart-1)" },
} satisfies ChartConfig;

/**
 * Dynamic pricing workbench.
 *
 * The engine is the same pure function the server uses, so toggling a rule
 * re-prices in the browser with no round trip and no second implementation to
 * drift out of sync.
 */
export function PricingWorkbench({
  inputs,
  initialRules,
  initialGuardrails,
  roomTypes,
  today,
}: {
  inputs: PricingInputView[];
  initialRules: PricingRule[];
  initialGuardrails: PricingGuardrail[];
  roomTypes: { id: string; title: string }[];
  today: string;
}) {
  const [rules, setRules] = React.useState(initialRules);
  const [guardrails, setGuardrails] = React.useState(initialGuardrails);
  const [roomTypeFilter, setRoomTypeFilter] = React.useState("all");
  const [applying, setApplying] = React.useState(false);

  const suggestions = React.useMemo(
    () =>
      inputs.map((input) =>
        suggestPrice(
          input,
          rules,
          guardrails.find((g) => g.roomTypeId === input.roomTypeId),
          today,
        ),
      ),
    [inputs, rules, guardrails, today],
  );

  const rows = suggestions
    .map((suggestion, index) => ({ ...suggestion, input: inputs[index] }))
    .filter((row) => roomTypeFilter === "all" || row.roomTypeId === roomTypeFilter);

  const changed = rows.filter((row) => row.suggestedRate !== row.currentRate);
  const projectedUplift = rows.reduce(
    (sum, row) => sum + (row.suggestedRate - row.currentRate) * row.input.roomsFree,
    0,
  );
  const clamped = rows.filter((row) => row.clampedBy !== null).length;

  const dates = [...new Set(rows.map((row) => row.date))].sort();
  const series = dates.map((date) => {
    const day = rows.filter((row) => row.date === date);
    const avg = (fn: (r: (typeof day)[number]) => number) =>
      day.length ? Math.round(day.reduce((s, r) => s + fn(r), 0) / day.length / 1000) : 0;
    return {
      date,
      current: avg((r) => r.currentRate),
      suggested: avg((r) => r.suggestedRate),
    };
  });

  const toggleRule = (id: string, enabled: boolean) => {
    setRules((prev) => prev.map((rule) => (rule.id === id ? { ...rule, enabled } : rule)));
  };

  const updateGuardrail = (roomTypeId: string, patch: Partial<PricingGuardrail>) => {
    setGuardrails((prev) =>
      prev.map((g) => (g.roomTypeId === roomTypeId ? { ...g, ...patch } : g)),
    );
  };

  const apply = async () => {
    setApplying(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setApplying(false);
    toast.success(`${changed.length} rates staged on the calendar`, {
      description:
        "They behave like any manual edit — open Rates & Availability and push when you are ready.",
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat
          label="Dates repriced"
          value={`${changed.length}`}
          hint={`of ${rows.length} evaluated`}
        />
        <MiniStat
          label="Rules active"
          value={`${rules.filter((r) => r.enabled).length}/${rules.length}`}
          hint="compound in priority order"
        />
        <MiniStat
          label="Clamped by guardrails"
          value={`${clamped}`}
          hint={clamped ? "bounded before publishing" : "nothing hit a bound"}
        />
        <MiniStat
          label="Projected uplift"
          value={formatMoneyCompact(projectedUplift)}
          hint="on unsold rooms in the window"
          positive={projectedUplift >= 0}
        />
      </div>

      <Tabs defaultValue="rules">
        <div className="flex flex-wrap items-center gap-2">
          <TabsList>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="guardrails">Guardrails</TabsTrigger>
          </TabsList>
          <Select value={roomTypeFilter} onValueChange={setRoomTypeFilter}>
            <SelectTrigger size="sm" className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All room types</SelectItem>
              {roomTypes.map((rt) => (
                <SelectItem key={rt.id} value={rt.id}>
                  {rt.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="ml-auto gap-1.5"
            onClick={apply}
            disabled={applying || changed.length === 0}
          >
            {applying ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            Apply {changed.length} to calendar
          </Button>
        </div>

        <TabsContent value="rules" className="mt-4 space-y-3">
          {[...rules]
            .sort((a, b) => a.priority - b.priority)
            .map((rule) => {
              const hits = suggestions.filter((s) =>
                s.appliedRules.some((applied) => applied.id === rule.id),
              ).length;
              return (
                <Card key={rule.id} className={cn("gap-2 py-4", !rule.enabled && "opacity-60")}>
                  <CardHeader className="px-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">{rule.name}</CardTitle>
                      <Badge variant="outline" className="text-[10px]">
                        {ruleKindLabels[rule.kind]}
                      </Badge>
                      <Badge variant="secondary" className="tabular text-[10px]">
                        {describeAdjustment(rule.adjustment)}
                      </Badge>
                      {rule.roomTypeIds.length > 0 ? (
                        <Badge variant="outline" className="text-[10px]">
                          {roomTypes.find((rt) => rt.id === rule.roomTypeIds[0])?.title ??
                            "Scoped"}
                        </Badge>
                      ) : null}
                    </div>
                    <CardDescription className="text-pretty">{rule.description}</CardDescription>
                    <CardAction>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                        aria-label={`Enable ${rule.name}`}
                      />
                    </CardAction>
                  </CardHeader>
                  <CardContent className="px-4">
                    <p className="text-muted-foreground tabular text-xs">
                      Priority {rule.priority} ·{" "}
                      {rule.enabled
                        ? `${hits} date${hits === 1 ? "" : "s"} matched in this window`
                        : "disabled"}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
        </TabsContent>

        <TabsContent value="preview" className="mt-4 space-y-4">
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Current versus suggested</CardTitle>
              <CardDescription>
                Average rate per night across the selected room types, in thousands of rupiah.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-4">
              <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
                <LineChart data={series} margin={{ left: 4, right: 8, top: 6 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={24}
                    tickFormatter={(value: string) => formatDateShort(value)}
                  />
                  <YAxis width={40} tickLine={false} axisLine={false} className="tabular" />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) => formatDateShort(String(value))}
                      />
                    }
                  />
                  <Line
                    dataKey="current"
                    type="monotone"
                    stroke="var(--color-current)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    dataKey="suggested"
                    type="monotone"
                    stroke="var(--color-suggested)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="overflow-hidden p-0">
            <CardContent className="p-0">
              <div className="scrollbar-thin max-h-[440px] overflow-auto">
                <Table>
                  <TableHeader className="bg-background sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">Date</TableHead>
                      <TableHead className="hidden sm:table-cell">Room type</TableHead>
                      <TableHead className="text-right">Occupancy</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">Suggested</TableHead>
                      <TableHead className="pr-6">Why</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changed.slice(0, 80).map((row) => (
                      <TableRow key={`${row.date}-${row.ratePlanId}`}>
                        <TableCell className="tabular pl-6 text-sm whitespace-nowrap">
                          {formatDateShort(row.date)}
                          <span className="text-muted-foreground ml-1 text-xs">
                            +{row.leadDays}d
                          </span>
                        </TableCell>
                        <TableCell className="hidden text-sm sm:table-cell">
                          {row.input.roomTypeTitle}
                        </TableCell>
                        <TableCell className="tabular text-right text-sm">
                          {formatPercent(row.occupancy, 0)}
                        </TableCell>
                        <TableCell className="tabular text-muted-foreground text-right text-sm">
                          {formatMoneyCompact(row.currentRate)}
                        </TableCell>
                        <TableCell className="tabular text-right text-sm font-medium">
                          <span className="inline-flex items-center gap-1">
                            {row.deltaPct > 0 ? (
                              <ArrowUp className="size-3 text-emerald-500" />
                            ) : (
                              <ArrowDown className="size-3 text-amber-500" />
                            )}
                            {formatMoneyCompact(row.suggestedRate)}
                          </span>
                          <span
                            className={cn(
                              "ml-1 text-xs",
                              row.deltaPct > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-amber-600 dark:text-amber-400",
                            )}
                          >
                            {row.deltaPct > 0 ? "+" : ""}
                            {row.deltaPct}%
                          </span>
                        </TableCell>
                        <TableCell className="pr-6">
                          <div className="flex flex-wrap items-center gap-1">
                            {row.appliedRules.map((applied) => (
                              <Badge
                                key={applied.id}
                                variant="outline"
                                className="text-[10px] font-normal"
                              >
                                {applied.name}
                              </Badge>
                            ))}
                            {row.clampedBy ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="border-amber-500/25 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300"
                                  >
                                    {row.clampedBy.replace(/_/g, " ")}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Clamped by the guardrail before publishing
                                </TooltipContent>
                              </Tooltip>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          {changed.length > 80 ? (
            <p className="text-muted-foreground text-xs">
              Showing the first 80 of {changed.length} repriced dates.
            </p>
          ) : null}
        </TabsContent>

        <TabsContent value="guardrails" className="mt-4">
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Guardrails</CardTitle>
              <CardDescription className="text-pretty">
                Applied after every rule has run. The maximum daily movement exists to stop a
                demand spike from doubling a rate overnight — channels treat that as suspicious
                and guests remember it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {guardrails.map((guardrail) => {
                const roomType = roomTypes.find((rt) => rt.id === guardrail.roomTypeId);
                return (
                  <div key={guardrail.roomTypeId} className="rounded-lg border p-3">
                    <p className="mb-3 text-sm font-medium">{roomType?.title ?? "—"}</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`floor-${guardrail.roomTypeId}`}>Floor</Label>
                        <Input
                          id={`floor-${guardrail.roomTypeId}`}
                          type="number"
                          step={50000}
                          className="tabular"
                          value={guardrail.floor}
                          onChange={(e) =>
                            updateGuardrail(guardrail.roomTypeId, {
                              floor: Number(e.target.value),
                            })
                          }
                        />
                        <p className="text-muted-foreground text-xs">
                          {formatMoney(guardrail.floor)}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`ceiling-${guardrail.roomTypeId}`}>Ceiling</Label>
                        <Input
                          id={`ceiling-${guardrail.roomTypeId}`}
                          type="number"
                          step={50000}
                          className="tabular"
                          value={guardrail.ceiling}
                          onChange={(e) =>
                            updateGuardrail(guardrail.roomTypeId, {
                              ceiling: Number(e.target.value),
                            })
                          }
                        />
                        <p className="text-muted-foreground text-xs">
                          {formatMoney(guardrail.ceiling)}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`move-${guardrail.roomTypeId}`}>
                          Max daily move (%)
                        </Label>
                        <Input
                          id={`move-${guardrail.roomTypeId}`}
                          type="number"
                          min={1}
                          max={100}
                          className="tabular"
                          value={guardrail.maxDailyMovePct}
                          onChange={(e) =>
                            updateGuardrail(guardrail.roomTypeId, {
                              maxDailyMovePct: Number(e.target.value),
                            })
                          }
                        />
                        <p className="text-muted-foreground text-xs">
                          Caps a single reprice at ±{guardrail.maxDailyMovePct}%
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                Guardrails are evaluated last and always win. If a suggestion looks
                surprisingly flat, it is usually a bound doing its job rather than a rule
                failing to fire.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MiniStat({
  label,
  value,
  hint,
  positive,
}: {
  label: string;
  value: string;
  hint: string;
  positive?: boolean;
}) {
  return (
    <Card className="gap-0 py-4">
      <CardContent className="px-4">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {label}
        </p>
        <p
          className={cn(
            "tabular mt-1.5 text-2xl font-semibold tracking-tight",
            positive === true && "text-emerald-600 dark:text-emerald-400",
            positive === false && "text-destructive",
          )}
        >
          {value}
        </p>
        <p className="text-muted-foreground mt-1 truncate text-xs">{hint}</p>
      </CardContent>
    </Card>
  );
}
