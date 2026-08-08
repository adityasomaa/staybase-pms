"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, Line, ReferenceLine, XAxis, YAxis } from "recharts";

import { formatDateShort } from "@/lib/date";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export interface PerformancePoint {
  date: string;
  occupancy: number;
  adr: number;
  revpar: number;
}

const config = {
  occupancy: { label: "Occupancy %", color: "var(--chart-1)" },
  adr: { label: "ADR (Rp ’000)", color: "var(--chart-2)" },
  revpar: { label: "RevPAR (Rp ’000)", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function PerformanceChart({
  data,
  today,
}: {
  data: PerformancePoint[];
  today: string;
}) {
  const [range, setRange] = React.useState<"30" | "45" | "all">("45");

  const visible = React.useMemo(() => {
    if (range === "all") return data;
    return data.slice(-Number(range));
  }, [data, range]);

  return (
    <Card className="gap-4">
      <CardHeader className="items-start">
        <CardTitle>Performance</CardTitle>
        <CardDescription>
          Occupancy against ADR and RevPAR — everything right of the marker is on the books.
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            size="sm"
            value={range}
            onValueChange={(value) => value && setRange(value as typeof range)}
            variant="outline"
            className="hidden sm:flex"
          >
            <ToggleGroupItem value="30" className="px-2.5 text-xs">
              30d
            </ToggleGroupItem>
            <ToggleGroupItem value="45" className="px-2.5 text-xs">
              45d
            </ToggleGroupItem>
            <ToggleGroupItem value="all" className="px-2.5 text-xs">
              All
            </ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 sm:px-4">
        <ChartContainer config={config} className="aspect-auto h-[260px] w-full">
          <AreaChart data={visible} margin={{ left: 4, right: 8, top: 6 }}>
            <defs>
              <linearGradient id="fillOccupancy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-occupancy)" stopOpacity={0.55} />
                <stop offset="95%" stopColor="var(--color-occupancy)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={28}
              tickFormatter={(value: string) => formatDateShort(value)}
            />
            <YAxis
              width={34}
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              domain={[0, 100]}
              className="tabular"
            />
            <ChartTooltip
              cursor={{ strokeDasharray: "4 4" }}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => formatDateShort(String(value))}
                  indicator="line"
                />
              }
            />
            <ReferenceLine
              x={today}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              label={{ value: "today", position: "top", fontSize: 10, fill: "var(--muted-foreground)" }}
            />
            <Area
              dataKey="occupancy"
              type="monotone"
              fill="url(#fillOccupancy)"
              stroke="var(--color-occupancy)"
              strokeWidth={2}
            />
            <Line
              dataKey="adr"
              type="monotone"
              stroke="var(--color-adr)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="revpar"
              type="monotone"
              stroke="var(--color-revpar)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
