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
      {/* Container queries, not media queries: this card is a third of the
          width on a 1024px dashboard but half of it on a 1440px reports page,
          so the breakpoint that matters is the card's own width. The fixed
          168px track also stops Recharts' initial 100%-width measure from
          briefly overlapping the legend on mount. */}
      <CardContent className="@container">
        <div className="grid gap-4 @sm:grid-cols-[168px_minmax(0,1fr)] @sm:items-center">
          <ChartContainer config={config} className="mx-auto aspect-square h-[168px] w-[168px]">
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

          {/* A grid rather than a flex row: the name column is the only one
              allowed to shrink, so the figures never get pushed out of the
              card at intermediate widths. */}
          <ul className="space-y-1.5">
            {data.slice(0, 6).map((row, index) => (
              <li
                key={row.channel}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-2 text-sm"
              >
                <span
                  aria-hidden
                  className="size-2.5 rounded-[3px]"
                  style={{ background: palette[index % palette.length] }}
                />
                <span className="truncate">{channelLabels[row.channel]}</span>
                <span className="text-muted-foreground tabular text-xs">
                  {formatPercent(row.share)}
                </span>
                <span className="tabular text-right text-xs font-medium">
                  {formatMoneyCompact(row.revenue)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
      <CardContent className="text-muted-foreground border-t pt-3 text-xs">
        Total booked revenue {formatMoneyCompact(total)} across{" "}
        {data.reduce((sum, row) => sum + row.bookings, 0)} reservations.
      </CardContent>
    </Card>
  );
}
