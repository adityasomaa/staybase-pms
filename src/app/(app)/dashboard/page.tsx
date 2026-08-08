import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BedDouble,
  CircleDollarSign,
  LogIn,
  LogOut,
  Percent,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { ChannelMixChart } from "@/components/dashboard/channel-mix-chart";
import { ForecastChart } from "@/components/dashboard/forecast-chart";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { ChannelPill, StatusPill } from "@/components/tokens";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, relativeTime } from "@/lib/date";
import {
  formatMoney,
  formatMoneyCompact,
  formatPercent,
  initials,
} from "@/lib/format";
import {
  TODAY,
  activeProperty,
  arrivalsOn,
  departuresOn,
  getChannelMix,
  getDashboardStats,
  getForecast,
  getGuest,
  getPerformanceSeries,
  getRecentReservations,
  getRevenueByRoomType,
  syncEvents,
  totalRooms,
} from "@/lib/data/queries";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  const stats = getDashboardStats();
  const performance = getPerformanceSeries(60);
  const channelMix = getChannelMix();
  const forecast = getForecast(14);
  const recent = getRecentReservations(7);
  const roomTypePerformance = getRevenueByRoomType();
  const arrivals = arrivalsOn();
  const departures = departuresOn();
  const lastSync = syncEvents[0];

  return (
    <>
      <PageHeader
        title={`Good day at ${activeProperty.title}`}
        description={`${formatDate(TODAY)} · ${stats.arrivals} arrivals, ${stats.departures} departures and ${stats.inHouse} rooms in house.`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/reports">View reports</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/calendar">Open rate calendar</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Occupancy (30d)"
          value={formatPercent(stats.occupancy)}
          delta={stats.occupancyDelta}
          hint="vs previous 30 days"
          icon={Percent}
        />
        <StatCard
          label="ADR"
          value={formatMoney(stats.adr)}
          delta={stats.adrDelta}
          hint="average daily rate"
          icon={CircleDollarSign}
        />
        <StatCard
          label="RevPAR"
          value={formatMoney(stats.revpar)}
          delta={stats.revparDelta}
          hint={`across ${totalRooms} rooms`}
          icon={TrendingUp}
        />
        <StatCard
          label="Revenue (30d)"
          value={formatMoneyCompact(stats.revenue30d)}
          delta={stats.revenueDelta}
          hint={`${formatMoneyCompact(stats.unpaidBalance)} unpaid on the books`}
          icon={Wallet}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PerformanceChart data={performance} today={TODAY} />
        </div>
        <ChannelMixChart data={channelMix} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ForecastChart data={forecast} />
        </div>

        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Today at the desk</CardTitle>
            <CardDescription>
              {stats.unassigned > 0
                ? `${stats.unassigned} arrivals still need a room assigned.`
                : "Every arrival already has a room assigned."}
            </CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/front-desk">
                  Open
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3">
            <DeskRow
              icon={<LogIn className="size-4 text-emerald-500" />}
              label="Arrivals"
              value={arrivals.length}
              detail={
                arrivals[0]
                  ? `Next: ${getGuest(arrivals[0].guestId)?.name ?? "—"}`
                  : "Nothing scheduled"
              }
            />
            <DeskRow
              icon={<LogOut className="size-4 text-amber-500" />}
              label="Departures"
              value={departures.length}
              detail={
                departures[0]
                  ? `Next: ${getGuest(departures[0].guestId)?.name ?? "—"}`
                  : "Nothing scheduled"
              }
            />
            <DeskRow
              icon={<BedDouble className="size-4 text-sky-500" />}
              label="Rooms free tonight"
              value={stats.roomsAvailable}
              detail={`${totalRooms - stats.roomsAvailable} of ${totalRooms} sold`}
            />
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tonight&rsquo;s occupancy</span>
                <span className="tabular font-medium">
                  {formatPercent(((totalRooms - stats.roomsAvailable) / totalRooms) * 100)}
                </span>
              </div>
              <Progress value={((totalRooms - stats.roomsAvailable) / totalRooms) * 100} />
            </div>
            {lastSync ? (
              <p className="text-muted-foreground border-t pt-3 text-xs">
                Last Channex sync {relativeTime(lastSync.at)} — {lastSync.message.toLowerCase()}.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="gap-4 lg:col-span-3">
          <CardHeader>
            <CardTitle>Latest reservations</CardTitle>
            <CardDescription>Newest bookings delivered by Channex and direct.</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/reservations">
                  All reservations
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Guest</TableHead>
                  <TableHead className="hidden sm:table-cell">Channel</TableHead>
                  <TableHead className="hidden md:table-cell">Stay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-6 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((reservation) => {
                  const guest = getGuest(reservation.guestId);
                  return (
                    <TableRow key={reservation.id}>
                      <TableCell className="pl-6">
                        <Link
                          href={`/reservations/${reservation.id}`}
                          className="flex items-center gap-2.5 hover:underline"
                        >
                          <Avatar className="size-7">
                            <AvatarFallback className="text-[10px]">
                              {initials(guest?.name ?? "??")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="grid">
                            <span className="truncate text-sm font-medium">
                              {guest?.name ?? "Unknown guest"}
                            </span>
                            <span className="text-muted-foreground tabular text-xs">
                              {reservation.reference}
                            </span>
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <ChannelPill channel={reservation.channel} />
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular hidden text-xs md:table-cell">
                        {formatDate(reservation.checkIn)} · {reservation.nights}n
                      </TableCell>
                      <TableCell>
                        <StatusPill status={reservation.status} />
                      </TableCell>
                      <TableCell className="tabular pr-6 text-right text-sm font-medium">
                        {formatMoneyCompact(reservation.total)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="gap-4 lg:col-span-2">
          <CardHeader>
            <CardTitle>Room type production</CardTitle>
            <CardDescription>Rolling 90 days of room revenue and occupancy.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {roomTypePerformance.map((row) => (
              <div key={row.code} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{row.roomType}</span>
                  <span className="tabular text-sm font-medium">
                    {formatMoneyCompact(row.revenue)}
                  </span>
                </div>
                <Progress value={row.occupancy} />
                <div className="text-muted-foreground tabular flex justify-between text-xs">
                  <span>
                    {row.rooms} rooms · ADR {formatMoneyCompact(row.adr)}
                  </span>
                  <span>{formatPercent(row.occupancy)} occ.</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function DeskRow({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-muted flex size-8 items-center justify-center rounded-md">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground truncate text-xs">{detail}</p>
      </div>
      <span className="tabular text-lg font-semibold">{value}</span>
    </div>
  );
}
