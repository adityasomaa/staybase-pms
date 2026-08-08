import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Plus, Ban, Wallet } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ReservationsTable, type ReservationRow } from "@/components/reservations/reservations-table";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { formatMoneyCompact, formatPercent } from "@/lib/format";
import { addDays } from "@/lib/date";
import {
  TODAY,
  getGuest,
  getRoomType,
  listReservations,
} from "@/lib/data/queries";

export const metadata: Metadata = { title: "Reservations" };

export default function ReservationsPage() {
  const reservations = listReservations();

  const rows: ReservationRow[] = reservations.map((reservation) => {
    const guest = getGuest(reservation.guestId);
    const first = reservation.rooms[0];
    return {
      id: reservation.id,
      reference: reservation.reference,
      channelReference: reservation.channelReference,
      guestName: guest?.name ?? "Unknown guest",
      guestCountry: guest?.country ?? "—",
      channel: reservation.channel,
      status: reservation.status,
      paymentStatus: reservation.paymentStatus,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      nights: reservation.nights,
      roomTypeTitle: getRoomType(first.roomTypeId)?.title ?? "—",
      roomNumber: first.roomNumber,
      total: reservation.total,
      balance: reservation.balance,
      createdAt: reservation.createdAt,
    };
  });

  const upcoming = reservations.filter(
    (r) => r.checkIn >= TODAY && (r.status === "confirmed" || r.status === "tentative"),
  );
  const cancelled = reservations.filter(
    (r) => r.status === "cancelled" || r.status === "no_show",
  );
  const last30 = reservations.filter((r) => r.createdAt.slice(0, 10) >= addDays(TODAY, -30));
  const outstanding = reservations
    .filter((r) => r.balance > 0 && r.status !== "cancelled")
    .reduce((sum, r) => sum + r.balance, 0);

  return (
    <>
      <PageHeader
        title="Reservations"
        description="Every booking from every channel in one ledger. OTA bookings arrive through the Channex webhook and are deduplicated on the OTA reservation code."
        actions={
          <Button size="sm" asChild>
            <Link href="/reservations/new">
              <Plus className="size-3.5" />
              New booking
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="On the books"
          value={String(upcoming.length)}
          hint={`${formatMoneyCompact(upcoming.reduce((s, r) => s + r.total, 0))} future revenue`}
          icon={CalendarCheck}
        />
        <StatCard
          label="Booked last 30d"
          value={String(last30.length)}
          hint={`${formatMoneyCompact(last30.reduce((s, r) => s + r.total, 0))} produced`}
          icon={Plus}
        />
        <StatCard
          label="Cancellation rate"
          value={formatPercent((cancelled.length / Math.max(1, reservations.length)) * 100)}
          hint={`${cancelled.length} cancelled or no-show`}
          icon={Ban}
          invertDelta
        />
        <StatCard
          label="Outstanding balance"
          value={formatMoneyCompact(outstanding)}
          hint="across live reservations"
          icon={Wallet}
        />
      </div>

      <ReservationsTable rows={rows} />
    </>
  );
}
