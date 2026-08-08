"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { formatMoneyCompact } from "@/lib/format";
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

export interface PickupRow {
  bucket: string;
  bookings: number;
  revenue: number;
}

const config = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function PickupChart({ data }: { data: PickupRow[] }) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Booking window</CardTitle>
        <CardDescription>
          Revenue by lead time — how far ahead guests commit. A short window means pricing has
          room to move late.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-4">
        <ChartContainer config={config} className="aspect-auto h-[240px] w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              className="tabular"
              tickFormatter={(value: number) => formatMoneyCompact(value)}
            />
            <YAxis
              type="category"
              dataKey="bucket"
              width={56}
              tickLine={false}
              axisLine={false}
              className="tabular"
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatMoneyCompact(Number(value))}
                />
              }
            />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
