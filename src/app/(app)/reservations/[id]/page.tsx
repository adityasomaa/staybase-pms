import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BedDouble,
  CreditCard,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Receipt,
  Star,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/tokens";
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
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/date";
import { channelLabels, formatMoney, initials, mealPlanLabels } from "@/lib/format";
import {
  activeProperty,
  getGuest,
  getRatePlan,
  getReservation,
  getRoomType,
} from "@/lib/data/queries";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params;
  const reservation = getReservation(id);
  return { title: reservation ? `Reservation ${reservation.reference}` : "Reservation" };
}

export default async function ReservationDetailPage(props: Props) {
  const { id } = await props.params;
  const reservation = getReservation(id);
  if (!reservation) notFound();

  const guest = getGuest(reservation.guestId);
  const room = reservation.rooms[0];
  const roomType = getRoomType(room.roomTypeId);
  const ratePlan = getRatePlan(room.ratePlanId);
  const paid = reservation.total - reservation.balance;
  const netToHotel = reservation.total - reservation.commission;

  return (
    <>
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-2 gap-1.5" asChild>
          <Link href="/reservations">
            <ArrowLeft className="size-3.5" />
            All reservations
          </Link>
        </Button>
        <PageHeader
          title={`${reservation.reference} · ${guest?.name ?? "Unknown guest"}`}
          description={`${formatDate(reservation.checkIn)} → ${formatDate(reservation.checkOut)} · ${reservation.nights} night${reservation.nights === 1 ? "" : "s"} at ${activeProperty.title}`}
          actions={
            <>
              <StatusPill status={reservation.status} className="px-2 py-1 text-sm" />
              <Button variant="outline" size="sm">
                Modify stay
              </Button>
              <Button size="sm" disabled={reservation.status !== "confirmed"}>
                Check in
              </Button>
            </>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Stay details</CardTitle>
              <CardDescription>
                Delivered by {channelLabels[reservation.channel]}
                {reservation.channelReference
                  ? ` as ${reservation.channelReference}`
                  : " directly"}
                , booked {formatDateTime(reservation.createdAt)}.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Detail icon={BedDouble} label="Room type" value={roomType?.title ?? "—"} />
              <Detail
                icon={BedDouble}
                label="Room number"
                value={room.roomNumber ? `Room ${room.roomNumber}` : "Not yet assigned"}
              />
              <Detail
                icon={Receipt}
                label="Rate plan"
                value={`${ratePlan?.title ?? "—"} (${ratePlan?.code ?? "—"})`}
                hint={ratePlan ? mealPlanLabels[ratePlan.mealPlan] : undefined}
              />
              <Detail
                icon={Star}
                label="Occupancy"
                value={`${room.adults} adult${room.adults === 1 ? "" : "s"}${
                  room.children ? `, ${room.children} child` : ""
                }`}
              />
              <Detail
                icon={Receipt}
                label="Cancellation policy"
                value={ratePlan?.cancellationPolicy ?? "—"}
              />
              <Detail
                icon={ChannelIcon}
                label="Source"
                value={reservation.source === "channex" ? "Channex webhook" : reservation.source}
                hint={reservation.channelReference ?? undefined}
              />
            </CardContent>
            {reservation.specialRequests ? (
              <CardContent>
                <div className="bg-muted/50 flex gap-2 rounded-lg border p-3">
                  <MessageSquare className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Special requests</p>
                    <p className="text-muted-foreground text-sm text-pretty">
                      {reservation.specialRequests}
                    </p>
                  </div>
                </div>
              </CardContent>
            ) : null}
          </Card>

          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Nightly breakdown</CardTitle>
              <CardDescription>
                Rates exactly as the channel delivered them — used to reconcile OTA invoices.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Night</TableHead>
                    <TableHead>Rate plan</TableHead>
                    <TableHead className="pr-6 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {room.nightlyRates.map((night) => (
                    <TableRow key={night.date}>
                      <TableCell className="tabular pl-6 text-sm">
                        {formatDate(night.date)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {ratePlan?.code ?? "—"}
                      </TableCell>
                      <TableCell className="tabular pr-6 text-right text-sm">
                        {formatMoney(night.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Guest</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  <AvatarFallback>{initials(guest?.name ?? "??")}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <span className="truncate">{guest?.name ?? "Unknown guest"}</span>
                    {guest?.vip ? (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        VIP
                      </Badge>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {guest?.stays ?? 0} previous stay{guest?.stays === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <Separator />
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Mail className="text-muted-foreground size-3.5 shrink-0" />
                  <span className="truncate">{guest?.email ?? "—"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="text-muted-foreground size-3.5 shrink-0" />
                  <span className="tabular">{guest?.phone ?? "—"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="text-muted-foreground size-3.5 shrink-0" />
                  <span>{guest?.country ?? "—"}</span>
                </li>
              </ul>
              {guest?.notes ? (
                <p className="text-muted-foreground bg-muted/50 rounded-md border p-2 text-xs text-pretty">
                  {guest.notes}
                </p>
              ) : null}
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/guests">View guest profile</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Folio</CardTitle>
              <CardDescription>
                <StatusPill status={reservation.paymentStatus} />
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Money label="Room revenue" value={reservation.roomRevenue} />
              <Money label="Extras" value={reservation.extrasRevenue} />
              <Money label="Taxes & fees" value={reservation.taxes} />
              <Separator />
              <Money label="Total" value={reservation.total} strong />
              <Money label="Paid" value={paid} />
              <Money label="Balance due" value={reservation.balance} strong />
              <Separator />
              <Money
                label={`Channel commission (${channelLabels[reservation.channel]})`}
                value={reservation.commission > 0 ? -reservation.commission : 0}
              />
              <Money label="Net to hotel" value={netToHotel} strong />
              <Button variant="outline" size="sm" className="mt-2 w-full gap-1.5">
                <CreditCard className="size-3.5" />
                Record payment
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function ChannelIcon(props: React.SVGProps<SVGSVGElement>) {
  return <Receipt {...props} />;
}

function Detail({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex gap-2.5">
      <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-sm font-medium text-pretty">{value}</p>
        {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      </div>
    </div>
  );
}

function Money({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={strong ? "font-medium" : "text-muted-foreground"}>{label}</span>
      <span className={`tabular ${strong ? "font-semibold" : ""}`}>{formatMoney(value)}</span>
    </div>
  );
}
