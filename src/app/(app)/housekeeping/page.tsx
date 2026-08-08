import type { Metadata } from "next";
import { BrushCleaning, CircleCheck, DoorOpen, Wrench } from "lucide-react";

import {
  HousekeepingBoard,
  type HousekeepingRoom,
} from "@/components/housekeeping/housekeeping-board";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { formatPercent } from "@/lib/format";
import { getHousekeepingBoard } from "@/lib/data/queries";

export const metadata: Metadata = { title: "Housekeeping" };

export default function HousekeepingPage() {
  const board = getHousekeepingBoard();

  const rooms: HousekeepingRoom[] = board.map((room) => ({
    id: room.id,
    number: room.number,
    floor: room.floor,
    roomTypeTitle: room.roomTypeTitle,
    housekeeping: room.housekeeping,
    occupied: room.occupied,
    assignedTo: room.assignedTo,
    guestName: room.guestName,
    departingToday: room.departingToday,
    note: room.note,
  }));

  const dirty = rooms.filter((r) => r.housekeeping === "dirty").length;
  const ready = rooms.filter(
    (r) => r.housekeeping === "clean" || r.housekeeping === "inspected",
  ).length;
  const ooo = rooms.filter((r) => r.housekeeping === "out_of_order").length;
  const departures = rooms.filter((r) => r.departingToday).length;

  return (
    <>
      <PageHeader
        title="Housekeeping"
        description="Room status board for the floor team. Rooms flagged out of order are automatically removed from the inventory pushed to Channex."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Awaiting clean"
          value={String(dirty)}
          hint={`${formatPercent((dirty / Math.max(1, rooms.length)) * 100)} of the house`}
          icon={BrushCleaning}
        />
        <StatCard
          label="Ready to sell"
          value={String(ready)}
          hint="clean or inspected"
          icon={CircleCheck}
        />
        <StatCard
          label="Departures today"
          value={String(departures)}
          hint="prioritise these turns"
          icon={DoorOpen}
        />
        <StatCard
          label="Out of order"
          value={String(ooo)}
          hint={ooo ? "withheld from all channels" : "nothing blocked"}
          icon={Wrench}
        />
      </div>

      <HousekeepingBoard rooms={rooms} />
    </>
  );
}
