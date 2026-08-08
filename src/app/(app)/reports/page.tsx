import type { Metadata } from "next";
import { CircleDollarSign, Percent, PiggyBank, TrendingUp } from "lucide-react";

import { ChannelMixChart } from "@/components/dashboard/channel-mix-chart";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { PageHeader } from "@/components/page-header";
import { PickupChart } from "@/components/reports/pickup-chart";
import { StatCard } from "@/components/stat-card";
import { ChannelPill } from "@/components/tokens";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney, formatMoneyCompact, formatPercent } from "@/lib/format";
import {
  TODAY,
  channelConnections,
  getChannelMix,
  getDashboardStats,
  getPerformanceSeries,
  getPickupByLeadTime,
  getRevenueByRoomType,
} from "@/lib/data/queries";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  const stats = getDashboardStats();
  const performance = getPerformanceSeries(75);
  const channelMix = getChannelMix();
  const pickup = getPickupByLeadTime();
  const roomTypes = getRevenueByRoomType();

  const commissionByChannel = channelMix.map((row) => {
    const connection = channelConnections.find((c) => c.code === row.channel);
    const commissionPct = connection?.commissionPct ?? 0;
    const commission = (row.revenue * commissionPct) / 100;
    return {
      ...row,
      commissionPct,
      commission,
      net: row.revenue - commission,
      netAdr: Math.round((row.revenue - commission) / Math.max(1, row.bookings)),
    };
  });

  const grossRevenue = commissionByChannel.reduce((sum, row) => sum + row.revenue, 0);
  const totalCommission = commissionByChannel.reduce((sum, row) => sum + row.commission, 0);
  const directShare =
    (commissionByChannel
      .filter((row) => row.channel === "direct" || row.channel === "walk_in")
      .reduce((sum, row) => sum + row.revenue, 0) /
      Math.max(1, grossRevenue)) *
    100;

  return (
    <>
      <PageHeader
        title="Reports"
        description="Production, pace and channel profitability. Commission is applied per channel so you can compare net revenue rather than headline rate."
        actions={
          <Button variant="outline" size="sm">
            Export as CSV
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Gross revenue (30d)"
          value={formatMoneyCompact(grossRevenue)}
          delta={stats.revenueDelta}
          hint="all channels"
          icon={CircleDollarSign}
        />
        <StatCard
          label="Commission paid"
          value={formatMoneyCompact(totalCommission)}
          hint={`${formatPercent((totalCommission / Math.max(1, grossRevenue)) * 100)} of gross`}
          icon={PiggyBank}
          invertDelta
        />
        <StatCard
          label="Direct share"
          value={formatPercent(directShare)}
          hint="commission-free revenue"
          icon={Percent}
        />
        <StatCard
          label="RevPAR"
          value={formatMoney(stats.revpar)}
          delta={stats.revparDelta}
          hint="vs previous 30 days"
          icon={TrendingUp}
        />
      </div>

      <PerformanceChart data={performance} today={TODAY} />

      <div className="grid gap-4 lg:grid-cols-2">
        <PickupChart data={pickup} />
        <ChannelMixChart data={channelMix} />
      </div>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Channel profitability</CardTitle>
          <CardDescription>
            Net revenue after commission — the number that decides where inventory should go.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="scrollbar-thin overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Channel</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Nights</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Commission</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="pr-6 text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissionByChannel.map((row) => (
                  <TableRow key={row.channel}>
                    <TableCell className="pl-6">
                      <ChannelPill channel={row.channel} />
                    </TableCell>
                    <TableCell className="tabular text-right text-sm">{row.bookings}</TableCell>
                    <TableCell className="tabular hidden text-right text-sm sm:table-cell">
                      {row.nights}
                    </TableCell>
                    <TableCell className="tabular text-right text-sm">
                      {formatMoneyCompact(row.revenue)}
                    </TableCell>
                    <TableCell className="tabular hidden text-right text-sm md:table-cell">
                      <span className={row.commission > 0 ? "text-destructive" : ""}>
                        {row.commission > 0 ? `−${formatMoneyCompact(row.commission)}` : "—"}
                      </span>
                      <span className="text-muted-foreground ml-1 text-xs">
                        {row.commissionPct ? `(${row.commissionPct}%)` : ""}
                      </span>
                    </TableCell>
                    <TableCell className="tabular text-right text-sm font-medium">
                      {formatMoneyCompact(row.net)}
                    </TableCell>
                    <TableCell className="tabular pr-6 text-right text-sm">
                      {formatPercent(row.share)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Room type production</CardTitle>
          <CardDescription>Rolling 90 days by room type.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Room type</TableHead>
                <TableHead className="text-right">Rooms</TableHead>
                <TableHead className="text-right">Room nights</TableHead>
                <TableHead className="text-right">ADR</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Occupancy</TableHead>
                <TableHead className="pr-6 text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roomTypes.map((row) => (
                <TableRow key={row.code}>
                  <TableCell className="pl-6 text-sm font-medium">{row.roomType}</TableCell>
                  <TableCell className="tabular text-right text-sm">{row.rooms}</TableCell>
                  <TableCell className="tabular text-right text-sm">{row.nights}</TableCell>
                  <TableCell className="tabular text-right text-sm">
                    {formatMoneyCompact(row.adr)}
                  </TableCell>
                  <TableCell className="tabular hidden text-right text-sm sm:table-cell">
                    {formatPercent(row.occupancy)}
                  </TableCell>
                  <TableCell className="tabular pr-6 text-right text-sm font-medium">
                    {formatMoneyCompact(row.revenue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
