import type { Metadata } from "next";
import { BedDouble, CalendarRange, TriangleAlert, Wrench } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { BookingPlanner } from "@/components/planner/booking-planner";
import { StatCard } from "@/components/stat-card";
import { formatPercent } from "@/lib/format";
import { addDays } from "@/lib/date";
import {
  TODAY,
  getPlannerGrid,
  inHouseOn,
  listRoomBlocks,
  rooms,
  totalRooms,
} from "@/lib/data/queries";

export const metadata: Metadata = { title: "Booking Calendar" };

/** Load a 90 day window, render 21 columns at a time. */
const WINDOW_DAYS = 90;
const VISIBLE_DAYS = 21;

export default async function PlannerPage(props: {
  searchParams: Promise<{ block?: string }>;
}) {
  const searchParams = await props.searchParams;
  const from = addDays(TODAY, -3);
  const { dates, rows, unassigned } = getPlannerGrid(from, WINDOW_DAYS);

  const activeBlocks = listRoomBlocks().filter((b) => b.to > TODAY);
  const blockedTonight = listRoomBlocks().filter(
    (b) => b.from <= TODAY && b.to > TODAY,
  ).length;
  const occupiedTonight = inHouseOn().length;

  return (
    <>
      <PageHeader
        title="Booking Calendar"
        description="One row per physical room. Click a stay to manage it without leaving the calendar, or any empty cell to take a room out of sale for maintenance."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Rooms"
          value={String(rooms.length)}
          hint={`${totalRooms} sellable`}
          icon={BedDouble}
        />
        <StatCard
          label="Occupied tonight"
          value={String(occupiedTonight)}
          hint={formatPercent((occupiedTonight / Math.max(1, totalRooms)) * 100)}
          icon={CalendarRange}
        />
        <StatCard
          label="Blocked tonight"
          value={String(blockedTonight)}
          hint={blockedTonight ? "withheld from every channel" : "nothing blocked"}
          icon={Wrench}
        />
        <StatCard
          label="Unassigned stays"
          value={String(unassigned.length)}
          hint={unassigned.length ? "need a room before arrival" : "every stay has a room"}
          icon={TriangleAlert}
        />
      </div>

      <BookingPlanner
        from={from}
        dates={dates}
        rows={rows}
        unassigned={unassigned}
        visibleDays={VISIBLE_DAYS}
        today={TODAY}
        openBlockOnMount={searchParams.block === "1"}
      />

      <p className="text-muted-foreground text-xs text-pretty">
        {activeBlocks.length} active or upcoming block
        {activeBlocks.length === 1 ? "" : "s"} across the property. Blocks reduce sellable
        inventory the moment they are saved; channels learn about them on the next push, so
        sync straight away if the block is urgent.
      </p>
    </>
  );
}
