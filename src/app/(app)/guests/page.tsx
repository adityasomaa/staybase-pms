import type { Metadata } from "next";
import { Globe, HeartHandshake, Repeat, Users } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { ChannelPill } from "@/components/tokens";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
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
import { formatDate } from "@/lib/date";
import { formatMoney, formatMoneyCompact, formatPercent, initials } from "@/lib/format";
import { getGuestDirectory } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Guests" };

export default function GuestsPage() {
  const directory = getGuestDirectory();
  const repeatGuests = directory.filter((g) => g.stays > 1);
  const vips = directory.filter((g) => g.vip);
  const lifetimeValue = directory.reduce((sum, g) => sum + g.lifetimeValue, 0);

  const byCountry = [...directory.reduce((map, guest) => {
    map.set(guest.country, (map.get(guest.country) ?? 0) + 1);
    return map;
  }, new Map<string, number>())]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <>
      <PageHeader
        title="Guests"
        description="One profile per guest, merged across every channel on email. Stay history feeds the repeat-guest rate and the direct-booking campaigns."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Profiles" value={String(directory.length)} hint="unique guests" icon={Users} />
        <StatCard
          label="Repeat rate"
          value={formatPercent((repeatGuests.length / Math.max(1, directory.length)) * 100)}
          hint={`${repeatGuests.length} guests with 2+ stays`}
          icon={Repeat}
        />
        <StatCard
          label="VIP guests"
          value={String(vips.length)}
          hint="6 or more stays"
          icon={HeartHandshake}
        />
        <StatCard
          label="Lifetime value"
          value={formatMoneyCompact(lifetimeValue)}
          hint="across all profiles"
          icon={Globe}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="gap-4 lg:col-span-3">
          <CardHeader>
            <CardTitle>Directory</CardTitle>
            <CardDescription>Ranked by lifetime value.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="scrollbar-thin overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Guest</TableHead>
                    <TableHead className="hidden md:table-cell">Country</TableHead>
                    <TableHead>Stays</TableHead>
                    <TableHead className="hidden lg:table-cell">Last stay</TableHead>
                    <TableHead className="hidden lg:table-cell">Upcoming</TableHead>
                    <TableHead className="hidden sm:table-cell">Source</TableHead>
                    <TableHead className="pr-6 text-right">Lifetime value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {directory.slice(0, 30).map((guest) => (
                    <TableRow key={guest.id}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-7">
                            <AvatarFallback className="text-[10px]">
                              {initials(guest.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 text-sm font-medium">
                              <span className="truncate">{guest.name}</span>
                              {guest.vip ? (
                                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                                  VIP
                                </Badge>
                              ) : null}
                            </p>
                            <p className="text-muted-foreground truncate text-xs">{guest.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-sm md:table-cell">
                        {guest.country}
                      </TableCell>
                      <TableCell className="tabular text-sm">{guest.stays}</TableCell>
                      <TableCell className="text-muted-foreground tabular hidden text-xs lg:table-cell">
                        {guest.lastStay ? formatDate(guest.lastStay) : "—"}
                      </TableCell>
                      <TableCell className="tabular hidden text-xs lg:table-cell">
                        {guest.upcoming ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {formatDate(guest.upcoming)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <ChannelPill channel={guest.preferredChannel} />
                      </TableCell>
                      <TableCell className="tabular pr-6 text-right text-sm font-medium">
                        {formatMoney(guest.lifetimeValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit gap-4">
          <CardHeader>
            <CardTitle>Top source markets</CardTitle>
            <CardDescription>Where the guests come from.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {byCountry.map(([country, count]) => (
              <div key={country} className="space-y-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="truncate">{country}</span>
                  <span className="tabular text-muted-foreground text-xs">{count}</span>
                </div>
                <Progress value={(count / directory.length) * 100} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
