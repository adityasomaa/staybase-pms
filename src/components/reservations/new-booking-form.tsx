"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { addDays, diffDays, formatDate } from "@/lib/date";
import { channelLabels, formatMoney, mealPlanLabels } from "@/lib/format";
import type { ChannelCode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";

export interface BookingOption {
  roomTypeId: string;
  roomTypeTitle: string;
  count: number;
  maxAdults: number;
  maxChildren: number;
  plans: {
    ratePlanId: string;
    title: string;
    code: string;
    mealPlan: string;
    rate: number;
  }[];
}

const TAX_RATE = 0.21;

const channels: ChannelCode[] = ["direct", "walk_in", "booking_com", "airbnb", "expedia", "agoda"];

export function NewBookingForm({
  options,
  today,
}: {
  options: BookingOption[];
  today: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const [roomTypeId, setRoomTypeId] = React.useState(options[0]?.roomTypeId ?? "");
  const roomType = options.find((o) => o.roomTypeId === roomTypeId) ?? options[0];
  const [ratePlanId, setRatePlanId] = React.useState(roomType?.plans[0]?.ratePlanId ?? "");

  // The plan list depends on the room type, so resolve it rather than syncing
  // it in an effect — the selected id is only a hint until it is valid.
  const ratePlan =
    roomType?.plans.find((p) => p.ratePlanId === ratePlanId) ?? roomType?.plans[0];
  const effectiveRatePlanId = ratePlan?.ratePlanId ?? "";

  const changeRoomType = (nextRoomTypeId: string) => {
    setRoomTypeId(nextRoomTypeId);
    const next = options.find((o) => o.roomTypeId === nextRoomTypeId);
    setRatePlanId(next?.plans[0]?.ratePlanId ?? "");
    if (next) {
      setAdults((value) => Math.min(value, next.maxAdults));
      setChildren((value) => Math.min(value, next.maxChildren));
    }
  };

  const [checkIn, setCheckIn] = React.useState(today);
  const [checkOut, setCheckOut] = React.useState(addDays(today, 2));
  const [adults, setAdults] = React.useState(2);
  const [children, setChildren] = React.useState(0);
  const [channel, setChannel] = React.useState<ChannelCode>("direct");
  const [guestName, setGuestName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const nights = Math.max(0, diffDays(checkIn, checkOut));
  const roomRevenue = nights * (ratePlan?.rate ?? 0);
  const taxes = Math.round(roomRevenue * TAX_RATE);
  const total = roomRevenue + taxes;

  const errors: string[] = [];
  if (nights < 1) errors.push("Check-out must be after check-in.");
  if (!guestName.trim()) errors.push("Guest name is required.");
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push("Email address looks wrong.");
  if (roomType && adults > roomType.maxAdults) {
    errors.push(`${roomType.roomTypeTitle} allows at most ${roomType.maxAdults} adults.`);
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }
    setPending(true);
    // A live deployment posts to the reservations service, which writes the
    // booking and immediately decrements availability on Channex.
    await new Promise((resolve) => setTimeout(resolve, 600));
    setPending(false);
    toast.success("Reservation created", {
      description: `${guestName} · ${formatDate(checkIn)} → ${formatDate(checkOut)} · ${formatMoney(total)}`,
    });
    router.push("/reservations");
  };

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Stay</CardTitle>
            <CardDescription>
              Inventory is checked against the ARI grid before the booking is written.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Room type" htmlFor="roomType">
              <Select value={roomTypeId} onValueChange={changeRoomType}>
                <SelectTrigger id="roomType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.roomTypeId} value={option.roomTypeId}>
                      {option.roomTypeTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Rate plan" htmlFor="ratePlan">
              <Select value={effectiveRatePlanId} onValueChange={setRatePlanId}>
                <SelectTrigger id="ratePlan" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roomType?.plans.map((plan) => (
                    <SelectItem key={plan.ratePlanId} value={plan.ratePlanId}>
                      {plan.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* The rate lives under the control rather than inside the
                  option: a plan name plus a formatted IDR amount does not fit
                  the trigger at tablet widths and was being clipped. */}
              <p className="text-muted-foreground text-xs">
                {ratePlan ? `${formatMoney(ratePlan.rate)} per night` : "No plan available"}
              </p>
            </Field>

            <Field label="Check-in" htmlFor="checkIn">
              <Input
                id="checkIn"
                type="date"
                value={checkIn}
                className="tabular"
                onChange={(event) => {
                  setCheckIn(event.target.value);
                  if (event.target.value >= checkOut) {
                    setCheckOut(addDays(event.target.value, 1));
                  }
                }}
              />
            </Field>

            <Field label="Check-out" htmlFor="checkOut">
              <Input
                id="checkOut"
                type="date"
                value={checkOut}
                min={addDays(checkIn, 1)}
                className="tabular"
                onChange={(event) => setCheckOut(event.target.value)}
              />
            </Field>

            <Field label="Adults" htmlFor="adults">
              <Input
                id="adults"
                type="number"
                min={1}
                max={roomType?.maxAdults ?? 4}
                value={adults}
                className="tabular"
                onChange={(event) => setAdults(Number(event.target.value))}
              />
            </Field>

            <Field label="Children" htmlFor="children">
              <Input
                id="children"
                type="number"
                min={0}
                max={roomType?.maxChildren ?? 0}
                value={children}
                className="tabular"
                onChange={(event) => setChildren(Number(event.target.value))}
              />
            </Field>
          </CardContent>
        </Card>

        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Guest</CardTitle>
            <CardDescription>
              Matching profiles are merged on email so stay history stays intact.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="guestName" className="sm:col-span-2">
              <Input
                id="guestName"
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                placeholder="Amelia Whitfield"
                required
              />
            </Field>
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="guest@example.com"
              />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <Input
                id="phone"
                value={phone}
                className="tabular"
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+62 812 3456 7890"
              />
            </Field>
            <Field label="Source" htmlFor="channel">
              <Select value={channel} onValueChange={(value) => setChannel(value as ChannelCode)}>
                <SelectTrigger id="channel" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((code) => (
                    <SelectItem key={code} value={code}>
                      {channelLabels[code]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
              <Textarea
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Airport pickup, dietary requirements, room preferences…"
                rows={3}
              />
            </Field>
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit gap-4 lg:sticky lg:top-20">
        <CardHeader>
          <CardTitle>Quote</CardTitle>
          <CardDescription>
            {roomType?.roomTypeTitle}
            {ratePlan ? ` · ${mealPlanLabels[ratePlan.mealPlan] ?? ratePlan.title}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Nights" value={String(nights)} />
          <Row label="Nightly rate" value={formatMoney(ratePlan?.rate ?? 0)} />
          <Row label="Room revenue" value={formatMoney(roomRevenue)} />
          <Row label={`Taxes & fees (${Math.round(TAX_RATE * 100)}%)`} value={formatMoney(taxes)} />
          <Separator />
          <Row label="Total" value={formatMoney(total)} strong />
          {errors.length > 0 ? (
            <ul className="text-destructive space-y-1 pt-2 text-xs">
              {errors.map((error) => (
                <li key={error}>· {error}</li>
              ))}
            </ul>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full gap-1.5" disabled={pending || errors.length > 0}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CalendarPlus className="size-4" />
            )}
            Create reservation
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={strong ? "font-medium" : "text-muted-foreground"}>{label}</span>
      <span className={`tabular ${strong ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
