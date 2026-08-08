"use client";

import { Cell, Pie, PieChart } from "recharts";

import { channelLabels, formatMoneyCompact, formatPercent } from "@/lib/format";
import type { ChannelCode } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export interface ChannelMixRow {
  channel: ChannelCode;
  bookings: number;
  revenue: number;
  share: number;
  adr: number;
}

const palette = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
];

export function ChannelMixChart({ data }: { data: ChannelMixRow[] }) {
  const config: ChartConfig = Object.fromEntries(
    data.map((row, index) => [
      row.channel,
      { label: channelLabels[row.channel], color: palette[index % palette.length] },
    ]),
  );

  const total = data.reduce((sum, row) => sum + row.revenue, 0);

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Channel mix</CardTitle>
        <CardDescription>Revenue share of the last 30 days of arrivals.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-[minmax(0,180px)_1fr] sm:items-center">
        <ChartContainer config={config} className="mx-auto aspect-square h-[168px]">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  nameKey="channel"
                  hideLabel
                  formatter={(value) => formatMoneyCompact(Number(value))}
                />
              }
            />
            <Pie
              data={data}
              dataKey="revenue"
              nameKey="channel"
              innerRadius={48}
              outerRadius={80}
              paddingAngle={2}
              strokeWidth={2}
            >
              {data.map((row, index) => (
                <Cell key={row.channel} fill={palette[index % palette.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        <ul className="space-y-1.5">
          {data.slice(0, 6).map((row, index) => (
            <li key={row.channel} className="flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ background: palette[index % palette.length] }}
              />
              <span className="truncate">{channelLabels[row.channel]}</span>
              <span className="text-muted-foreground tabular ml-auto text-xs">
                {formatPercent(row.share)}
              </span>
              <span className="tabular w-20 text-right text-xs font-medium">
                {formatMoneyCompact(row.revenue)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardContent className="text-muted-foreground border-t pt-3 text-xs">
        Total booked revenue {formatMoneyCompact(total)} across{" "}
        {data.reduce((sum, row) => sum + row.bookings, 0)} reservations.
      </CardContent>
    </Card>
  );
}
