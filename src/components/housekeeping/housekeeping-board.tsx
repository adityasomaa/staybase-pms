"use client";

import * as React from "react";
import { BrushCleaning, CircleCheck, TriangleAlert, Wrench } from "lucide-react";
import { toast } from "sonner";

import { statusLabels } from "@/lib/format";
import type { HousekeepingStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/tokens";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export interface HousekeepingRoom {
  id: string;
  number: string;
  floor: number;
  roomTypeTitle: string;
  housekeeping: HousekeepingStatus;
  occupied: boolean;
  assignedTo: string | null;
  guestName: string | null;
  departingToday: boolean;
  note?: string;
}

const statusOrder: HousekeepingStatus[] = ["dirty", "clean", "inspected", "out_of_order"];

const statusIcon: Record<HousekeepingStatus, React.ReactNode> = {
  dirty: <BrushCleaning className="size-3.5" />,
  clean: <CircleCheck className="size-3.5" />,
  inspected: <CircleCheck className="size-3.5" />,
  out_of_order: <Wrench className="size-3.5" />,
};

const cardTone: Record<HousekeepingStatus, string> = {
  dirty: "border-amber-500/30 bg-amber-500/5",
  clean: "border-emerald-500/30 bg-emerald-500/5",
  inspected: "border-sky-500/30 bg-sky-500/5",
  out_of_order: "border-destructive/30 bg-destructive/5",
};

export function HousekeepingBoard({ rooms }: { rooms: HousekeepingRoom[] }) {
  const [state, setState] = React.useState(rooms);
  const [filter, setFilter] = React.useState<HousekeepingStatus | "all">("all");
  const [attendant, setAttendant] = React.useState<string>("all");

  const attendants = React.useMemo(
    () => [...new Set(rooms.map((r) => r.assignedTo).filter(Boolean) as string[])].sort(),
    [rooms],
  );

  const visible = state.filter((room) => {
    if (filter !== "all" && room.housekeeping !== filter) return false;
    if (attendant !== "all" && room.assignedTo !== attendant) return false;
    return true;
  });

  const advance = (room: HousekeepingRoom) => {
    const next: HousekeepingStatus =
      room.housekeeping === "dirty"
        ? "clean"
        : room.housekeeping === "clean"
          ? "inspected"
          : "dirty";
    setState((prev) =>
      prev.map((r) => (r.id === room.id ? { ...r, housekeeping: next } : r)),
    );
    toast.success(`Room ${room.number} marked ${statusLabels[next].toLowerCase()}`);
  };

  const counts = statusOrder.map((status) => ({
    status,
    count: state.filter((r) => r.housekeeping === status).length,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={filter}
          onValueChange={(value) => setFilter((value || "all") as typeof filter)}
        >
          <ToggleGroupItem value="all" className="px-2.5 text-xs">
            All ({state.length})
          </ToggleGroupItem>
          {counts.map(({ status, count }) => (
            <ToggleGroupItem key={status} value={status} className="px-2.5 text-xs">
              {statusLabels[status]} ({count})
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <Select value={attendant} onValueChange={setAttendant}>
          <SelectTrigger size="sm" className="ml-auto w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All attendants</SelectItem>
            {attendants.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="Nothing in this bucket"
          description="Every room matching this filter has already been handled."
          icon={<CircleCheck className="size-6" />}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((room) => (
            <Card key={room.id} className={cn("gap-2 py-3", cardTone[room.housekeeping])}>
              <CardContent className="space-y-2 px-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="tabular text-lg leading-none font-semibold">{room.number}</p>
                    <p className="text-muted-foreground mt-1 truncate text-xs">
                      {room.roomTypeTitle}
                    </p>
                  </div>
                  <Badge variant="outline" className="gap-1 bg-background/60 text-[10px]">
                    {statusIcon[room.housekeeping]}
                    {statusLabels[room.housekeeping]}
                  </Badge>
                </div>

                <div className="space-y-0.5 text-xs">
                  <p className="text-muted-foreground">
                    {room.occupied ? (
                      <>
                        Occupied by{" "}
                        <span className="text-foreground font-medium">
                          {room.guestName ?? "guest"}
                        </span>
                      </>
                    ) : (
                      "Vacant"
                    )}
                  </p>
                  <p className="text-muted-foreground">
                    Attendant:{" "}
                    <span className="text-foreground">{room.assignedTo ?? "unassigned"}</span>
                  </p>
                  {room.departingToday ? (
                    <p className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                      <TriangleAlert className="size-3" />
                      Departs today — prioritise
                    </p>
                  ) : null}
                </div>

                {room.note ? (
                  <p className="text-muted-foreground bg-background/60 rounded border p-1.5 text-[11px] text-pretty">
                    {room.note}
                  </p>
                ) : null}

                <Button
                  variant="outline"
                  size="sm"
                  className="bg-background/60 w-full text-xs"
                  disabled={room.housekeeping === "out_of_order"}
                  onClick={() => advance(room)}
                >
                  {room.housekeeping === "dirty"
                    ? "Mark clean"
                    : room.housekeeping === "clean"
                      ? "Mark inspected"
                      : room.housekeeping === "inspected"
                        ? "Mark dirty"
                        : "Out of order"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
