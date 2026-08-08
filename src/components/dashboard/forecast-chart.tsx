"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { dayLabel, dayNumber } from "@/lib/date";
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

export interface ForecastPoint {
  date: string;
  sold: number;
  available: number;
  occupancy: number;
}

const config = {
  sold: { label: "Rooms sold", color: "var(--chart-1)" },
  available: { label: "Rooms free", color: "var(--muted)" },
} satisfies ChartConfig;

export function ForecastChart({ data }: { data: ForecastPoint[] }) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>14-day forecast</CardTitle>
        <CardDescription>
          Rooms on the books versus remaining inventory, by arrival date.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-4">
        <ChartContainer config={config} className="aspect-auto h-[200px] w-full">
          <BarChart data={data} margin={{ left: 0, right: 8, top: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              interval={0}
              tick={{ fontSize: 10 }}
              tickFormatter={(value: string) => `${dayLabel(value)[0]}${dayNumber(value)}`}
            />
            <YAxis width={28} tickLine={false} axisLine={false} className="tabular" />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => `${dayLabel(String(value))} ${String(value)}`}
                />
              }
            />
            <Bar dataKey="sold" stackId="a" fill="var(--color-sold)" radius={[0, 0, 3, 3]} />
            <Bar
              dataKey="available"
              stackId="a"
              fill="var(--color-available)"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
