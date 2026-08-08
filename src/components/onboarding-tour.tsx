"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarRange,
  CircleHelp,
  CreditCard,
  Plug,
  Search,
  SlidersHorizontal,
  Table2,
} from "lucide-react";

import { completeTour } from "@/app/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Step {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  points: string[];
  href?: string;
  hrefLabel?: string;
}

/**
 * First-run tour.
 *
 * Six screens, each about one thing the operator will otherwise learn the hard
 * way. It is dismissible at any point and never shown again — the flag lives
 * in a cookie so it survives a new browser tab.
 */
const steps: Step[] = [
  {
    icon: Table2,
    title: "Rates and availability live in one grid",
    body: "Room types down the side, dates across the top, one row per rate plan. The row directly under a room type is availability, shared by every plan beneath it.",
    points: [
      "Click a cell to change rate, minimum stay or stop sell.",
      "Edits stage locally and outline in colour — nothing reaches a channel until you press Save & push.",
      "An amber triangle means the row is not mapped to Channex and will be skipped.",
    ],
    href: "/calendar",
    hrefLabel: "Open the grid",
  },
  {
    icon: CalendarRange,
    title: "The booking calendar is room by room",
    body: "One row per physical room, so a gap on screen is a genuinely empty room rather than an aggregate number.",
    points: [
      "Click any stay to open its details, assign a room or take a payment.",
      "Click an empty cell to block the room for maintenance, renovation or owner use.",
      "Blocks reduce sellable inventory immediately and reach channels on the next push.",
    ],
    href: "/planner",
    hrefLabel: "Open the calendar",
  },
  {
    icon: Plug,
    title: "Channels connect through Channex",
    body: "STAYBASE never talks to an OTA directly. It pushes availability, rates and restrictions to Channex, and Channex fans them out.",
    points: [
      "Add a channel and follow the per-OTA guide — the extranet path differs for each one.",
      "Map every room type and rate plan; a connected channel with unmapped rows silently sells nothing.",
      "Push seven days first and verify on the OTA extranet before widening the window.",
    ],
    href: "/channels",
    hrefLabel: "See channels",
  },
  {
    icon: SlidersHorizontal,
    title: "Dynamic pricing suggests, you decide",
    body: "Rules compound in priority order, then per-room-type guardrails clamp the result so a demand spike cannot double a rate overnight.",
    points: [
      "Set the floor and ceiling before enabling any rule.",
      "The preview shows exactly which rules moved each date and what clamped it.",
      "Applying suggestions stages them like any other edit — you still push deliberately.",
    ],
    href: "/pricing",
    hrefLabel: "Open pricing",
  },
  {
    icon: Search,
    title: "Search finds more than pages",
    body: "Press ⌘K anywhere. It searches the whole reservation ledger on the server, plus guests, rooms, rate plans, channels, settings and every tutorial.",
    points: [
      "Type a reference like SB-24021 or an OTA code to jump straight to a booking.",
      "Ask a question — “how do I block a room” finds the guide, not just the page.",
      "Actions are searchable too: “invite user”, “add channel”, “pay invoice”.",
    ],
  },
  {
    icon: CreditCard,
    title: "Billing, users and what suspension means",
    body: "The subscription is billed per sellable room. Users get a role for what they can do and a property assignment for where they can do it.",
    points: [
      "An unpaid invoice shows a banner, then locks the workspace after the grace period.",
      "Suspension pauses outbound pushes but keeps accepting inbound bookings from Channex.",
      "Every screen here is explained in Help & Tutorials if you want the detail later.",
    ],
    href: "/help",
    hrefLabel: "Browse tutorials",
  },
];

export function OnboardingTour() {
  const router = useRouter();
  const [open, setOpen] = React.useState(true);
  const [index, setIndex] = React.useState(0);
  const step = steps[index];
  const isLast = index === steps.length - 1;

  const finish = async () => {
    setOpen(false);
    await completeTour();
    router.refresh();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) void finish();
        else setOpen(true);
      }}
    >
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <div className="bg-primary/10 text-primary mb-1 flex size-10 items-center justify-center rounded-lg">
            <step.icon className="size-5" />
          </div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Welcome to STAYBASE · {index + 1} of {steps.length}
          </p>
          <DialogTitle className="text-xl text-balance">{step.title}</DialogTitle>
          <DialogDescription className="text-pretty">{step.body}</DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 text-sm">
          {step.points.map((point) => (
            <li key={point} className="flex items-start gap-2">
              <ArrowRight className="text-primary mt-0.5 size-3.5 shrink-0" />
              <span className="text-pretty">{point}</span>
            </li>
          ))}
        </ul>

        {step.href ? (
          <Button variant="outline" size="sm" className="w-fit gap-1.5" asChild onClick={() => void finish()}>
            <Link href={step.href}>
              {step.hrefLabel}
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        ) : null}

        <DialogFooter className="mt-2 items-center sm:justify-between">
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Tour progress">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Step ${i + 1}`}
                aria-selected={i === index}
                role="tab"
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "bg-primary w-5" : "bg-border hover:bg-muted-foreground/40 w-1.5",
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => void finish()}>
              Skip
            </Button>
            {index > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setIndex((i) => i - 1)}>
                Back
              </Button>
            ) : null}
            <Button
              size="sm"
              onClick={() => (isLast ? void finish() : setIndex((i) => i + 1))}
            >
              {isLast ? "Start using STAYBASE" : "Next"}
            </Button>
          </div>
        </DialogFooter>

        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <CircleHelp className="size-3" />
          You can replay this from Help &amp; Tutorials at any time.
        </p>
      </DialogContent>
    </Dialog>
  );
}
