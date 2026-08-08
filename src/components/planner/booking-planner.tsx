"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CreditCard,
  Hammer,
  LogIn,
  Trash2,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { addDays, dayLabel, dayNumber, diffDays, formatDate, isWeekend, monthLabel } from "@/lib/date";
import { channelLabels, formatMoney, initials, statusLabels } from "@/lib/format";
import type { BlockReason, ChannelCode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChannelPill, StatusPill } from "@/components/tokens";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface PlannerStayView {
  reservationId: string;
  reference: string;
  guestName: string;
  channel: ChannelCode;
  status: string;
  paymentStatus: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  total: number;
  balance: number;
  ratePlanTitle: string;
  specialRequests?: string;
  offset: number;
  span: number;
  clippedStart: boolean;
  clippedEnd: boolean;
}

export interface PlannerBlockView {
  id: string;
  reason: BlockReason;
  note?: string;
  from: string;
  to: string;
  createdBy: string;
  offset: number;
  span: number;
}

export interface PlannerRowView {
  roomId: string;
  roomNumber: string;
  floor: number;
  roomTypeId: string;
  roomTypeTitle: string;
  housekeeping: string;
  stays: PlannerStayView[];
  blocks: PlannerBlockView[];
}

const CELL = 46;
const ROOM_COL = 168;

export const blockReasonLabels: Record<BlockReason, string> = {
  maintenance: "Maintenance",
  renovation: "Renovation",
  deep_clean: "Deep clean",
  owner_use: "Owner use",
  quarantine: "Quarantine",
};

const statusBar: Record<string, string> = {
  confirmed: "bg-emerald-500/85 text-white",
  tentative: "bg-amber-500/85 text-white",
  in_house: "bg-sky-500/85 text-white",
  checked_out: "bg-muted-foreground/50 text-white",
};

/**
 * Room-by-room timeline.
 *
 * Bars are positioned from the offset and span the server already computed, so
 * scrolling never re-derives date maths per cell. Clicking a bar opens the
 * stay; clicking empty track starts a block on that room and date.
 */
export function BookingPlanner({
  from,
  dates,
  rows,
  unassigned,
  visibleDays,
  today,
  openBlockOnMount = false,
}: {
  from: string;
  dates: string[];
  rows: PlannerRowView[];
  unassigned: PlannerStayView[];
  visibleDays: number;
  today: string;
  openBlockOnMount?: boolean;
}) {
  const [offset, setOffset] = React.useState(0);
  const [floor, setFloor] = React.useState<string>("all");
  const [roomType, setRoomType] = React.useState<string>("all");
  const [stay, setStay] = React.useState<PlannerStayView | null>(null);
  const [localBlocks, setLocalBlocks] = React.useState<
    (PlannerBlockView & { roomId: string })[]
  >([]);
  const [removed, setRemoved] = React.useState<Set<string>>(new Set());
  // Seeded from the initial render rather than an effect, so arriving with
  // ?block=1 opens the dialog on the first paint instead of the second.
  const [blockDraft, setBlockDraft] = React.useState<{
    roomId: string;
    roomNumber: string;
    from: string;
    to: string;
  } | null>(() =>
    openBlockOnMount && rows.length > 0
      ? {
          roomId: rows[0].roomId,
          roomNumber: rows[0].roomNumber,
          from: today,
          to: addDays(today, 1),
        }
      : null,
  );

  const windowDates = dates.slice(offset, offset + visibleDays);
  const windowStart = windowDates[0] ?? from;

  const roomTypes = React.useMemo(
    () => [...new Map(rows.map((r) => [r.roomTypeId, r.roomTypeTitle])).entries()],
    [rows],
  );
  const floors = React.useMemo(
    () => [...new Set(rows.map((r) => r.floor))].sort((a, b) => a - b),
    [rows],
  );

  const visibleRows = rows.filter((row) => {
    if (floor !== "all" && String(row.floor) !== floor) return false;
    if (roomType !== "all" && row.roomTypeId !== roomType) return false;
    return true;
  });

  const blocksFor = (row: PlannerRowView) =>
    [...row.blocks, ...localBlocks.filter((b) => b.roomId === row.roomId)].filter(
      (b) => !removed.has(b.id),
    );

  const saveBlock = (reason: BlockReason, note: string) => {
    if (!blockDraft) return;
    const nights = Math.max(1, diffDays(blockDraft.from, blockDraft.to));
    const id = `blk_local_${Date.now()}`;
    setLocalBlocks((prev) => [
      ...prev,
      {
        id,
        roomId: blockDraft.roomId,
        reason,
        note: note || undefined,
        from: blockDraft.from,
        to: blockDraft.to,
        createdBy: "You",
        offset: diffDays(from, blockDraft.from),
        span: nights,
      },
    ]);
    setBlockDraft(null);
    toast.success(`Room ${blockDraft.roomNumber} blocked`, {
      description: `${blockReasonLabels[reason]} · ${formatDate(blockDraft.from)} → ${formatDate(blockDraft.to)}. Push to update channels.`,
    });
  };

  const removeBlock = (id: string, roomNumber: string) => {
    setRemoved((prev) => new Set(prev).add(id));
    toast.success(`Block removed from room ${roomNumber}`, {
      description: "The room returns to sale on the next push.",
    });
  };

  const canBack = offset > 0;
  const canForward = offset + visibleDays < dates.length;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-md border">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-r-none"
            disabled={!canBack}
            onClick={() => setOffset((v) => Math.max(0, v - 7))}
            aria-label="Previous week"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="tabular w-36 border-x px-2 text-center text-sm font-medium">
            {monthLabel(windowStart)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-l-none"
            disabled={!canForward}
            onClick={() => setOffset((v) => Math.min(dates.length - visibleDays, v + 7))}
            aria-label="Next week"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOffset(0)}>
          Today
        </Button>

        <Select value={floor} onValueChange={setFloor}>
          <SelectTrigger size="sm" className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All floors</SelectItem>
            {floors.map((f) => (
              <SelectItem key={f} value={String(f)}>
                Floor {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={roomType} onValueChange={setRoomType}>
          <SelectTrigger size="sm" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All room types</SelectItem>
            {roomTypes.map(([id, title]) => (
              <SelectItem key={id} value={id}>
                {title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          className="ml-auto gap-1.5"
          onClick={() =>
            setBlockDraft({
              roomId: visibleRows[0]?.roomId ?? rows[0].roomId,
              roomNumber: visibleRows[0]?.roomNumber ?? rows[0].roomNumber,
              from: today,
              to: addDays(today, 1),
            })
          }
        >
          <Wrench className="size-3.5" />
          Block room
        </Button>
      </div>

      {/* Legend */}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        {(["confirmed", "tentative", "in_house", "checked_out"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-[3px]", statusBar[s])} />
            {statusLabels[s]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="bg-destructive/25 border-destructive/40 size-2.5 rounded-[3px] border" />
          Blocked
        </span>
        <span className="ml-auto hidden sm:inline">
          Click a stay to manage it, or any empty cell to block that room.
        </span>
      </div>

      {unassigned.length > 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <div className="min-w-0">
            <p className="font-medium">
              {unassigned.length} stay{unassigned.length === 1 ? "" : "s"} without a room
            </p>
            <p className="text-muted-foreground text-pretty">
              These do not appear on the grid until a room is assigned:{" "}
              {unassigned.slice(0, 4).map((s, i) => (
                <React.Fragment key={s.reservationId}>
                  {i > 0 ? ", " : ""}
                  <button
                    type="button"
                    className="underline underline-offset-2"
                    onClick={() => setStay(s)}
                  >
                    {s.reference}
                  </button>
                </React.Fragment>
              ))}
              {unassigned.length > 4 ? ` and ${unassigned.length - 4} more` : ""}.
            </p>
          </div>
        </div>
      ) : null}

      <Card className="overflow-hidden p-0">
        <CardContent className="p-0">
          <div className="scrollbar-thin max-h-[62vh] overflow-auto">
            <div style={{ minWidth: ROOM_COL + windowDates.length * CELL }}>
              {/* Date header. Sticky inside this scroller, so it never slides
                  under the app header. */}
              <div className="bg-muted/60 sticky top-0 z-20 flex border-b backdrop-blur-sm">
                <div
                  className="bg-muted/60 sticky left-0 z-30 shrink-0 border-r px-3 py-2"
                  style={{ width: ROOM_COL }}
                >
                  <p className="text-xs font-medium">Room</p>
                </div>
                {windowDates.map((date) => (
                  <div
                    key={date}
                    style={{ width: CELL }}
                    className={cn(
                      "shrink-0 border-r py-1.5 text-center last:border-r-0",
                      isWeekend(date) && "bg-accent/60",
                      date === today && "bg-primary/15",
                    )}
                  >
                    <p className="text-muted-foreground text-[10px] uppercase">
                      {dayLabel(date)[0]}
                    </p>
                    <p className="tabular text-xs font-semibold">{dayNumber(date)}</p>
                  </div>
                ))}
              </div>

              {visibleRows.map((row) => {
                const blocks = blocksFor(row);
                return (
                  <div key={row.roomId} className="group/row flex border-b last:border-b-0">
                    <div
                      className="bg-background group-hover/row:bg-muted/40 sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r px-3 py-1.5 transition-colors"
                      style={{ width: ROOM_COL }}
                    >
                      <div className="min-w-0">
                        <p className="tabular text-sm leading-tight font-semibold">
                          {row.roomNumber}
                        </p>
                        <p className="text-muted-foreground truncate text-[11px]">
                          {row.roomTypeTitle}
                        </p>
                      </div>
                      {row.housekeeping === "out_of_order" ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Hammer className="text-destructive ml-auto size-3.5 shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent>Out of order</TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>

                    <div
                      className="relative flex"
                      style={{ width: windowDates.length * CELL, height: 44 }}
                    >
                      {/* Clickable empty track */}
                      {windowDates.map((date) => (
                        <button
                          key={date}
                          type="button"
                          aria-label={`Block room ${row.roomNumber} on ${date}`}
                          onClick={() =>
                            setBlockDraft({
                              roomId: row.roomId,
                              roomNumber: row.roomNumber,
                              from: date,
                              to: addDays(date, 1),
                            })
                          }
                          className={cn(
                            "hover:bg-primary/10 focus-visible:ring-ring shrink-0 border-r transition-colors last:border-r-0 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
                            isWeekend(date) && "bg-accent/25",
                            date === today && "bg-primary/8",
                          )}
                          style={{ width: CELL }}
                        />
                      ))}

                      {blocks.map((block) => {
                        const left = (block.offset - offset) * CELL;
                        const width = block.span * CELL;
                        if (left + width <= 0 || left >= windowDates.length * CELL) return null;
                        return (
                          <div
                            key={block.id}
                            className="bg-destructive/20 border-destructive/40 absolute top-1 bottom-1 flex items-center gap-1 overflow-hidden rounded-md border px-1.5"
                            style={{
                              left: Math.max(0, left) + 2,
                              width: Math.min(width, windowDates.length * CELL - Math.max(0, left)) - 4,
                              backgroundImage:
                                "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.05) 4px, rgba(0,0,0,0.05) 8px)",
                            }}
                          >
                            <Wrench className="text-destructive size-3 shrink-0" />
                            <span className="text-destructive truncate text-[10px] font-medium">
                              {blockReasonLabels[block.reason]}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeBlock(block.id, row.roomNumber)}
                              aria-label="Remove block"
                              className="text-destructive hover:bg-destructive/20 ml-auto shrink-0 rounded p-0.5"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        );
                      })}

                      {row.stays.map((s) => {
                        const left = (s.offset - offset) * CELL;
                        const width = s.span * CELL;
                        if (left + width <= 0 || left >= windowDates.length * CELL) return null;
                        const clampedLeft = Math.max(0, left);
                        return (
                          <button
                            key={s.reservationId}
                            type="button"
                            onClick={() => setStay(s)}
                            title={`${s.guestName} · ${s.reference}`}
                            className={cn(
                              "absolute top-1 bottom-1 flex items-center gap-1 overflow-hidden px-1.5 text-left shadow-sm transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none",
                              statusBar[s.status] ?? "bg-muted-foreground/60 text-white",
                              s.clippedStart || left < 0 ? "rounded-l-none" : "rounded-l-md",
                              s.clippedEnd ? "rounded-r-none" : "rounded-r-md",
                            )}
                            style={{
                              left: clampedLeft + 2,
                              width:
                                Math.min(width, windowDates.length * CELL - clampedLeft) - 4,
                            }}
                          >
                            {s.balance > 0 ? (
                              <CircleAlert className="size-3 shrink-0 opacity-90" />
                            ) : null}
                            <span className="truncate text-[11px] font-medium">
                              {s.guestName}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <StaySheet stay={stay} onClose={() => setStay(null)} />
      {/* Keyed on the draft so a fresh block starts with a clean reason and
          note — remounting is how React resets a form. */}
      <BlockDialog
        key={blockDraft ? `${blockDraft.roomId}-${blockDraft.from}` : "no-block"}
        draft={blockDraft}
        rooms={rows.map((r) => ({ id: r.roomId, number: r.roomNumber, type: r.roomTypeTitle }))}
        onChange={setBlockDraft}
        onCancel={() => setBlockDraft(null)}
        onSave={saveBlock}
      />
    </div>
  );
}

function StaySheet({
  stay,
  onClose,
}: {
  stay: PlannerStayView | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={Boolean(stay)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {stay ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  <AvatarFallback>{initials(stay.guestName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <SheetTitle className="truncate text-base">{stay.guestName}</SheetTitle>
                  <SheetDescription className="tabular">{stay.reference}</SheetDescription>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <StatusPill status={stay.status} />
                <StatusPill status={stay.paymentStatus} />
                <ChannelPill channel={stay.channel} />
              </div>
            </SheetHeader>

            <div className="space-y-4 px-4 pb-4">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Check-in" value={formatDate(stay.checkIn)} />
                <Field label="Check-out" value={formatDate(stay.checkOut)} />
                <Field label="Nights" value={String(stay.nights)} />
                <Field
                  label="Guests"
                  value={`${stay.adults} adult${stay.adults === 1 ? "" : "s"}${
                    stay.children ? ` + ${stay.children}` : ""
                  }`}
                />
                <Field label="Rate plan" value={stay.ratePlanTitle} />
                <Field label="Source" value={channelLabels[stay.channel]} />
              </dl>

              {stay.specialRequests ? (
                <p className="bg-muted/50 text-muted-foreground rounded-md border p-2.5 text-sm text-pretty">
                  {stay.specialRequests}
                </p>
              ) : null}

              <Separator />

              <div className="space-y-2 text-sm">
                <Row label="Total" value={formatMoney(stay.total)} strong />
                <Row label="Paid" value={formatMoney(stay.total - stay.balance)} />
                <Row label="Balance due" value={formatMoney(stay.balance)} strong />
              </div>

              {stay.balance > 0 ? (
                <Badge
                  variant="outline"
                  className="border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                >
                  Collect before departure
                </Badge>
              ) : null}
            </div>

            <SheetFooter className="gap-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() =>
                    toast.success("Payment recorded", {
                      description: `${formatMoney(stay.balance)} against ${stay.reference}.`,
                    })
                  }
                  disabled={stay.balance <= 0}
                >
                  <CreditCard className="size-3.5" />
                  Take payment
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={stay.status !== "confirmed"}
                  onClick={() =>
                    toast.success(`${stay.guestName} checked in`, {
                      description: `Reference ${stay.reference}.`,
                    })
                  }
                >
                  <LogIn className="size-3.5" />
                  Check in
                </Button>
              </div>
              <Button size="sm" asChild>
                <Link href={`/reservations/${stay.reservationId}`}>Open full reservation</Link>
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function BlockDialog({
  draft,
  rooms,
  onChange,
  onCancel,
  onSave,
}: {
  draft: { roomId: string; roomNumber: string; from: string; to: string } | null;
  rooms: { id: string; number: string; type: string }[];
  onChange: (draft: { roomId: string; roomNumber: string; from: string; to: string }) => void;
  onCancel: () => void;
  onSave: (reason: BlockReason, note: string) => void;
}) {
  const [reason, setReason] = React.useState<BlockReason>("maintenance");
  const [note, setNote] = React.useState("");

  const nights = draft ? Math.max(0, diffDays(draft.from, draft.to)) : 0;
  const invalid = nights < 1;

  return (
    <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Block a room</DialogTitle>
          <DialogDescription className="text-pretty">
            The room is removed from sale for these dates and the reduced availability reaches
            every connected channel on the next push.
          </DialogDescription>
        </DialogHeader>

        {draft ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="block-room">Room</Label>
              <Select
                value={draft.roomId}
                onValueChange={(value) => {
                  const room = rooms.find((r) => r.id === value);
                  onChange({ ...draft, roomId: value, roomNumber: room?.number ?? "" });
                }}
              >
                <SelectTrigger id="block-room" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      Room {room.number} · {room.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="block-from">From</Label>
                <Input
                  id="block-from"
                  type="date"
                  className="tabular"
                  value={draft.from}
                  onChange={(e) => {
                    const next = e.target.value;
                    onChange({
                      ...draft,
                      from: next,
                      to: next >= draft.to ? addDays(next, 1) : draft.to,
                    });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="block-to">To</Label>
                <Input
                  id="block-to"
                  type="date"
                  className="tabular"
                  min={addDays(draft.from, 1)}
                  value={draft.to}
                  onChange={(e) => onChange({ ...draft, to: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="block-reason">Reason</Label>
              <Select value={reason} onValueChange={(v) => setReason(v as BlockReason)}>
                <SelectTrigger id="block-reason" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(blockReasonLabels) as BlockReason[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {blockReasonLabels[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="block-note">Note</Label>
              <Textarea
                id="block-note"
                rows={2}
                placeholder="What is being done, and who is doing it"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <p className="text-muted-foreground text-xs">
              {invalid
                ? "The end date must be after the start date."
                : `Room ${draft.roomNumber} will be unsellable for ${nights} night${nights === 1 ? "" : "s"}.`}
            </p>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={invalid} onClick={() => onSave(reason, note)}>
            Block room
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={strong ? "font-medium" : "text-muted-foreground"}>{label}</span>
      <span className={cn("tabular", strong && "font-semibold")}>{value}</span>
    </div>
  );
}
