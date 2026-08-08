"use client";

import * as React from "react";
import { BedDouble, DoorOpen, Plus, Tags } from "lucide-react";
import { toast } from "sonner";

import { formatMoney, mealPlanLabels } from "@/lib/format";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";

export interface RoomTypeOption {
  id: string;
  title: string;
  code: string;
  defaultRate: number;
  ratePlans: { id: string; title: string; code: string }[];
}

type OpenDialog = "room-type" | "rate-plan" | "room" | null;

/**
 * Inventory creation flows.
 *
 * All three share a toolbar because they are almost always used together:
 * a new room type is useless without at least one rate plan, and a rate plan
 * is unsellable without rooms.
 */
export function InventoryActions({
  roomTypes,
  initial = null,
}: {
  roomTypes: RoomTypeOption[];
  initial?: OpenDialog;
}) {
  const [open, setOpen] = React.useState<OpenDialog>(initial);
  // Bumped on every open so the dialog remounts with fresh state. Remounting
  // is how React resets a form — syncing each field back in an effect causes
  // a cascading render for no benefit.
  const [seq, setSeq] = React.useState(0);

  const show = (kind: Exclude<OpenDialog, null>) => {
    setSeq((value) => value + 1);
    setOpen(kind);
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => show("room")}>
        <DoorOpen className="size-3.5" />
        Add room
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => show("rate-plan")}>
        <Tags className="size-3.5" />
        Add rate plan
      </Button>
      <Button size="sm" className="gap-1.5" onClick={() => show("room-type")}>
        <Plus className="size-3.5" />
        Add room type
      </Button>

      <RoomTypeDialog key={`rt-${seq}`} open={open === "room-type"} onClose={() => setOpen(null)} />
      <RatePlanDialog
        key={`rp-${seq}`}
        open={open === "rate-plan"}
        roomTypes={roomTypes}
        onClose={() => setOpen(null)}
      />
      <RoomDialog
        key={`rm-${seq}`}
        open={open === "room"}
        roomTypes={roomTypes}
        onClose={() => setOpen(null)}
      />
    </>
  );
}

function RoomTypeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = React.useState("");
  const [code, setCode] = React.useState("");
  const [count, setCount] = React.useState(10);
  const [occupancy, setOccupancy] = React.useState(2);
  const [maxAdults, setMaxAdults] = React.useState(2);
  const [maxChildren, setMaxChildren] = React.useState(1);
  const [rate, setRate] = React.useState(1_500_000);
  const [createBar, setCreateBar] = React.useState(true);

  // Codes end up on OTA extranets, so keep them short and uppercase.
  const derivedCode = code || title.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase();
  const invalid = title.trim().length < 3 || count < 1 || rate <= 0 || maxAdults < occupancy;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BedDouble className="size-4" />
            Add a room type
          </DialogTitle>
          <DialogDescription className="text-pretty">
            A room type is what channels sell. The count is how many of these rooms exist —
            it becomes the allotment pushed to every channel.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="rt-title">Name</Label>
            <Input
              id="rt-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Deluxe Garden View"
            />
            <p className="text-muted-foreground text-xs">
              Guests see this on the OTA, so describe the room rather than an internal code.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rt-code">Code</Label>
            <Input
              id="rt-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder={derivedCode || "DLX"}
              className="tabular"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rt-count">Number of rooms</Label>
            <Input
              id="rt-count"
              type="number"
              min={1}
              className="tabular"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rt-occ">Standard occupancy</Label>
            <Input
              id="rt-occ"
              type="number"
              min={1}
              className="tabular"
              value={occupancy}
              onChange={(e) => setOccupancy(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rt-adults">Max adults</Label>
            <Input
              id="rt-adults"
              type="number"
              min={1}
              className="tabular"
              value={maxAdults}
              onChange={(e) => setMaxAdults(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rt-children">Max children</Label>
            <Input
              id="rt-children"
              type="number"
              min={0}
              className="tabular"
              value={maxChildren}
              onChange={(e) => setMaxChildren(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rt-rate">Base rate</Label>
            <Input
              id="rt-rate"
              type="number"
              step={50000}
              className="tabular"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
            />
            <p className="text-muted-foreground text-xs">{formatMoney(rate)} per night</p>
          </div>

          <div className="flex items-start justify-between gap-3 rounded-md border p-2.5 sm:col-span-2">
            <div className="min-w-0">
              <p className="text-sm font-medium">Also create a Best Available Rate plan</p>
              <p className="text-muted-foreground text-xs text-pretty">
                A room type with no rate plan cannot be sold or mapped to a channel.
              </p>
            </div>
            <Switch checked={createBar} onCheckedChange={setCreateBar} aria-label="Create BAR" />
          </div>
        </div>

        {maxAdults < occupancy ? (
          <p className="text-destructive text-xs">
            Max adults cannot be lower than the standard occupancy.
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={invalid}
            onClick={() => {
              onClose();
              toast.success(`${title} created`, {
                description: createBar
                  ? `${count} rooms · ${derivedCode} · Best Available Rate added. Map it on the Channels page before pushing.`
                  : `${count} rooms · ${derivedCode}. Add a rate plan before it can be sold.`,
              });
            }}
          >
            Create room type
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RatePlanDialog({
  open,
  roomTypes,
  onClose,
}: {
  open: boolean;
  roomTypes: RoomTypeOption[];
  onClose: () => void;
}) {
  const [roomTypeId, setRoomTypeId] = React.useState(roomTypes[0]?.id ?? "");
  const [title, setTitle] = React.useState("");
  const [code, setCode] = React.useState("");
  const [mode, setMode] = React.useState<"manual" | "derived">("manual");
  const [parentHint, setParentHint] = React.useState("");
  const [offset, setOffset] = React.useState(-10);
  const [mealPlan, setMealPlan] = React.useState("breakfast");
  const [policy, setPolicy] = React.useState("Free cancellation until 48h before arrival");

  const roomType = roomTypes.find((rt) => rt.id === roomTypeId) ?? roomTypes[0];
  const parents = React.useMemo(() => roomType?.ratePlans ?? [], [roomType]);

  // The parent list depends on the room type, so resolve the selection rather
  // than syncing it — a stale hint simply falls back to the first valid plan.
  const parentId = parents.some((parent) => parent.id === parentHint)
    ? parentHint
    : (parents[0]?.id ?? "");

  const derivedPreview =
    roomType && mode === "derived"
      ? Math.round((roomType.defaultRate * (1 + offset / 100)) / 50_000) * 50_000
      : roomType?.defaultRate ?? 0;

  const invalid =
    title.trim().length < 3 || !roomTypeId || (mode === "derived" && !parentId);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="size-4" />
            Add a rate plan
          </DialogTitle>
          <DialogDescription className="text-pretty">
            A rate plan is a price product: the same room sold on different terms. Derived
            plans track a parent, so you maintain one price instead of several.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="rp-roomtype">Room type</Label>
            <Select value={roomTypeId} onValueChange={setRoomTypeId}>
              <SelectTrigger id="rp-roomtype" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roomTypes.map((rt) => (
                  <SelectItem key={rt.id} value={rt.id}>
                    {rt.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rp-title">Name</Label>
            <Input
              id="rp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Non-Refundable"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rp-code">Code</Label>
            <Input
              id="rp-code"
              className="tabular"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="NR"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rp-mode">Pricing</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <SelectTrigger id="rp-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual — priced independently</SelectItem>
                <SelectItem value="derived" disabled={parents.length === 0}>
                  Derived — offset from a parent
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rp-meal">Board</Label>
            <Select value={mealPlan} onValueChange={setMealPlan}>
              <SelectTrigger id="rp-meal" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(mealPlanLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === "derived" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="rp-parent">Parent plan</Label>
                <Select value={parentId} onValueChange={setParentHint}>
                  <SelectTrigger id="rp-parent" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {parents.map((parent) => (
                      <SelectItem key={parent.id} value={parent.id}>
                        {parent.title} ({parent.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rp-offset">Offset (%)</Label>
                <Input
                  id="rp-offset"
                  type="number"
                  className="tabular"
                  value={offset}
                  onChange={(e) => setOffset(Number(e.target.value))}
                />
                <p className="text-muted-foreground text-xs">
                  ≈ {formatMoney(derivedPreview)} at today&rsquo;s base rate
                </p>
              </div>
            </>
          ) : null}

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="rp-policy">Cancellation policy</Label>
            <Input
              id="rp-policy"
              value={policy}
              onChange={(e) => setPolicy(e.target.value)}
            />
          </div>
        </div>

        <Separator />
        <p className="text-muted-foreground text-xs text-pretty">
          New plans start unmapped and are skipped when pushing ARI until you map them on the
          Channels page. That is deliberate — an unmapped plan is safer than a wrongly mapped
          one.
        </p>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={invalid}
            onClick={() => {
              onClose();
              toast.success(`${title} created`, {
                description:
                  mode === "derived"
                    ? `Derived at ${offset}% from ${parents.find((p) => p.id === parentId)?.code ?? "parent"}. Map it before pushing.`
                    : `Manual pricing on ${roomType?.title}. Set rates in the ARI grid.`,
              });
            }}
          >
            Create rate plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoomDialog({
  open,
  roomTypes,
  onClose,
}: {
  open: boolean;
  roomTypes: RoomTypeOption[];
  onClose: () => void;
}) {
  const [roomTypeId, setRoomTypeId] = React.useState(roomTypes[0]?.id ?? "");
  const [numbers, setNumbers] = React.useState("");
  const [floor, setFloor] = React.useState(1);

  // Accepting a list means adding a floor of rooms is one action, not twelve.
  const parsed = numbers
    .split(/[,\s]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const invalid = parsed.length === 0 || !roomTypeId;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DoorOpen className="size-4" />
            Add rooms
          </DialogTitle>
          <DialogDescription className="text-pretty">
            Physical rooms are what the front desk assigns and what the booking calendar shows.
            They do not change what channels see — that is the room type allotment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="room-type">Room type</Label>
            <Select value={roomTypeId} onValueChange={setRoomTypeId}>
              <SelectTrigger id="room-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roomTypes.map((rt) => (
                  <SelectItem key={rt.id} value={rt.id}>
                    {rt.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="room-numbers">Room numbers</Label>
            <Input
              id="room-numbers"
              className="tabular"
              value={numbers}
              onChange={(e) => setNumbers(e.target.value)}
              placeholder="201, 202, 203"
            />
            <p className="text-muted-foreground text-xs">
              {parsed.length > 0
                ? `${parsed.length} room${parsed.length === 1 ? "" : "s"} will be created.`
                : "Separate multiple numbers with commas or spaces."}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="room-floor">Floor</Label>
            <Input
              id="room-floor"
              type="number"
              min={0}
              className="tabular"
              value={floor}
              onChange={(e) => setFloor(Number(e.target.value))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={invalid}
            onClick={() => {
              onClose();
              toast.success(
                `${parsed.length} room${parsed.length === 1 ? "" : "s"} added to floor ${floor}`,
                {
                  description: `${roomTypes.find((rt) => rt.id === roomTypeId)?.title} · ${parsed.join(", ")}`,
                },
              );
            }}
          >
            Add rooms
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
