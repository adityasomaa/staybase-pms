import type { Metadata } from "next";
import Link from "next/link";
import { BedDouble, LogIn, LogOut, Moon, UserCheck } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { ChannelPill, EmptyState, StatusPill } from "@/components/tokens";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/date";
import { formatMoney, formatMoneyCompact, initials } from "@/lib/format";
import type { Reservation } from "@/lib/types";
import {
  TODAY,
  arrivalsOn,
  departuresOn,
  getGuest,
  getRoomType,
  inHouseOn,
  stayoversOn,
  totalRooms,
} from "@/lib/data/queries";

export const metadata: Metadata = { title: "Front Desk" };

export default function FrontDeskPage() {
  const arrivals = arrivalsOn();
  const departures = departuresOn();
  const inHouse = inHouseOn();
  const stayovers = stayoversOn();
  const unassigned = arrivals.filter((r) => r.rooms.every((room) => room.roomNumber === null));
  const outstanding = inHouse.reduce((sum, r) => sum + r.balance, 0);

  return (
    <>
      <PageHeader
        title="Front Desk"
        description={`Everything happening at ${formatDate(TODAY)} — arrivals to check in, departures to settle and rooms currently occupied.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Arrivals"
          value={String(arrivals.length)}
          hint={unassigned.length ? `${unassigned.length} without a room` : "all rooms assigned"}
          icon={LogIn}
        />
        <StatCard
          label="Departures"
          value={String(departures.length)}
          hint={`${formatMoneyCompact(departures.reduce((s, r) => s + r.balance, 0))} to settle`}
          icon={LogOut}
        />
        <StatCard
          label="In house"
          value={String(inHouse.length)}
          hint={`${stayovers.length} stay over tonight`}
          icon={UserCheck}
        />
        <StatCard
          label="Rooms free"
          value={String(Math.max(0, totalRooms - inHouse.length))}
          hint={`of ${totalRooms} rooms`}
          icon={BedDouble}
        />
      </div>

      <Tabs defaultValue="arrivals">
        <TabsList>
          <TabsTrigger value="arrivals">
            Arrivals
            <Badge variant="secondary" className="tabular ml-1.5 h-4 px-1 text-[10px]">
              {arrivals.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="departures">
            Departures
            <Badge variant="secondary" className="tabular ml-1.5 h-4 px-1 text-[10px]">
              {departures.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="in-house">
            In house
            <Badge variant="secondary" className="tabular ml-1.5 h-4 px-1 text-[10px]">
              {inHouse.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="arrivals" className="mt-4">
          <DeskList
            reservations={arrivals}
            action="Check in"
            emptyTitle="No arrivals today"
            emptyDescription="Nothing is scheduled to arrive. Check the forecast on the dashboard for the days ahead."
          />
        </TabsContent>
        <TabsContent value="departures" className="mt-4">
          <DeskList
            reservations={departures}
            action="Check out"
            emptyTitle="No departures today"
            emptyDescription="Every in-house guest is staying another night."
          />
        </TabsContent>
        <TabsContent value="in-house" className="mt-4">
          <DeskList
            reservations={inHouse}
            action="Open folio"
            emptyTitle="The house is empty"
            emptyDescription="No occupied rooms right now."
          />
        </TabsContent>
      </Tabs>

      {outstanding > 0 ? (
        <Card className="gap-2 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">Outstanding balances in house</CardTitle>
            <CardDescription>
              {formatMoney(outstanding)} across {inHouse.filter((r) => r.balance > 0).length}{" "}
              occupied rooms — settle before departure.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </>
  );
}

function DeskList({
  reservations,
  action,
  emptyTitle,
  emptyDescription,
}: {
  reservations: Reservation[];
  action: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (reservations.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={<Moon className="size-6" />}
      />
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {reservations.map((reservation) => {
        const guest = getGuest(reservation.guestId);
        const room = reservation.rooms[0];
        const roomType = getRoomType(room.roomTypeId);
        return (
          <Card key={reservation.id} className="gap-3 py-4">
            <CardContent className="space-y-3 px-4">
              <div className="flex items-start gap-3">
                <Avatar className="size-9">
                  <AvatarFallback className="text-xs">
                    {initials(guest?.name ?? "??")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/reservations/${reservation.id}`}
                    className="flex items-center gap-1.5 text-sm font-medium hover:underline"
                  >
                    <span className="truncate">{guest?.name ?? "Unknown guest"}</span>
                    {guest?.vip ? (
                      <Badge variant="secondary" className="h-4 shrink-0 px-1 text-[10px]">
                        VIP
                      </Badge>
                    ) : null}
                  </Link>
                  <p className="text-muted-foreground tabular truncate text-xs">
                    {reservation.reference} · {guest?.country ?? "—"}
                  </p>
                </div>
                <ChannelPill channel={reservation.channel} />
              </div>

              <dl className="grid grid-cols-2 gap-2 text-xs">
                <Item label="Room type" value={roomType?.title ?? "—"} />
                <Item
                  label="Room"
                  value={room.roomNumber ? `#${room.roomNumber}` : "Unassigned"}
                  warn={!room.roomNumber}
                />
                <Item label="Stay" value={`${reservation.nights} night${reservation.nights === 1 ? "" : "s"}`} />
                <Item label="Guests" value={`${room.adults + room.children}`} />
              </dl>

              <div className="flex items-center justify-between gap-2 border-t pt-3">
                <div className="min-w-0">
                  <StatusPill status={reservation.paymentStatus} />
                  {reservation.balance > 0 ? (
                    <span className="text-muted-foreground tabular ml-2 text-xs">
                      {formatMoney(reservation.balance)} due
                    </span>
                  ) : null}
                </div>
                <Button size="sm" variant="outline">
                  {action}
                </Button>
              </div>

              {reservation.specialRequests ? (
                <p className="text-muted-foreground bg-muted/50 rounded-md border p-2 text-xs text-pretty">
                  {reservation.specialRequests}
                </p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Item({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={`truncate font-medium ${warn ? "text-amber-600 dark:text-amber-400" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
