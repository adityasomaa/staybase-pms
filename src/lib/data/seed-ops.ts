import "server-only";

import { addDays } from "@/lib/date";
import type {
  Invoice,
  Plan,
  PricingGuardrail,
  PricingRule,
  RoomBlock,
  Subscription,
  User,
} from "@/lib/types";
import {
  TODAY,
  intBetween,
  minutesAgo,
  pick,
  properties,
  reservations,
  roomTypes,
  rooms,
} from "@/lib/data/seed";

/**
 * Operational seed data — blocks, users, billing and pricing rules.
 *
 * Split out from seed.ts because these depend on the core dataset rather than
 * defining it, and keeping the dependency one-directional makes the load order
 * obvious.
 */

/* -------------------------------------------------------------------------- */
/*  Room blocks                                                               */
/* -------------------------------------------------------------------------- */

const blockNotes: Record<RoomBlock["reason"], string> = {
  maintenance: "Air-conditioning compressor replacement, engineering booked.",
  renovation: "Bathroom retiling, contractor on site.",
  deep_clean: "Post-checkout deep clean and mattress rotation.",
  owner_use: "Owner staying, do not sell.",
  quarantine: "Held empty pending housekeeping inspection.",
};

export const roomBlocks: RoomBlock[] = (() => {
  const reasons: RoomBlock["reason"][] = [
    "maintenance",
    "renovation",
    "deep_clean",
    "owner_use",
    "quarantine",
  ];
  const occupiedNumbers = new Set(
    reservations
      .filter((r) => r.status === "in_house")
      .flatMap((r) => r.rooms.map((room) => room.roomNumber))
      .filter(Boolean) as string[],
  );
  // Blocking an occupied room is a data conflict, not a demo scenario.
  const candidates = rooms.filter((room) => !occupiedNumbers.has(room.number));

  return Array.from({ length: 9 }, (_, i) => {
    const room = candidates[intBetween(0, candidates.length - 1)];
    const from = addDays(TODAY, intBetween(-6, 34));
    const reason = pick(reasons);
    return {
      id: `blk_${String(i + 1).padStart(3, "0")}`,
      propertyId: "prop_ubud",
      roomId: room.id,
      roomNumber: room.number,
      roomTypeId: room.roomTypeId,
      from,
      to: addDays(from, intBetween(1, 6)),
      reason,
      note: blockNotes[reason],
      createdBy: pick(["Ayu Pratiwi", "Dewa Nugraha", "Sinta Halim"]),
      createdAt: minutesAgo(intBetween(60, 20_000)),
    };
  });
})();

/* -------------------------------------------------------------------------- */
/*  Users                                                                     */
/* -------------------------------------------------------------------------- */

export const users: User[] = [
  {
    id: "usr_001",
    name: "Aditya Soma",
    email: "somanathasastra10@gmail.com",
    role: "owner",
    status: "active",
    propertyIds: properties.map((p) => p.id),
    lastActiveAt: minutesAgo(3),
    invitedAt: addDays(TODAY, -420),
    avatarHue: 195,
  },
  {
    id: "usr_002",
    name: "Ayu Pratiwi",
    email: "ayu.pratiwi@staybase.id",
    role: "manager",
    status: "active",
    propertyIds: ["prop_ubud", "prop_seminyak"],
    lastActiveAt: minutesAgo(41),
    invitedAt: addDays(TODAY, -310),
    avatarHue: 24,
  },
  {
    id: "usr_003",
    name: "Dewa Nugraha",
    email: "dewa@staybase.id",
    role: "revenue_manager",
    status: "active",
    propertyIds: ["prop_ubud"],
    lastActiveAt: minutesAgo(126),
    invitedAt: addDays(TODAY, -220),
    avatarHue: 268,
  },
  {
    id: "usr_004",
    name: "Sinta Halim",
    email: "sinta@staybase.id",
    role: "front_desk",
    status: "active",
    propertyIds: ["prop_ubud"],
    lastActiveAt: minutesAgo(12),
    invitedAt: addDays(TODAY, -180),
    avatarHue: 152,
  },
  {
    id: "usr_005",
    name: "Wayan Suardana",
    email: "wayan.s@staybase.id",
    role: "housekeeping",
    status: "active",
    propertyIds: ["prop_ubud"],
    lastActiveAt: minutesAgo(88),
    invitedAt: addDays(TODAY, -160),
    avatarHue: 96,
  },
  {
    id: "usr_006",
    name: "Rina Kusuma",
    email: "rina.kusuma@staybase.id",
    role: "accountant",
    status: "active",
    propertyIds: properties.map((p) => p.id),
    lastActiveAt: minutesAgo(1_400),
    invitedAt: addDays(TODAY, -95),
    avatarHue: 320,
  },
  {
    id: "usr_007",
    name: "Bagus Wirawan",
    email: "bagus.wirawan@staybase.id",
    role: "front_desk",
    status: "invited",
    propertyIds: ["prop_canggu"],
    lastActiveAt: null,
    invitedAt: addDays(TODAY, -3),
    avatarHue: 42,
  },
  {
    id: "usr_008",
    name: "Putri Anggraini",
    email: "putri.a@staybase.id",
    role: "manager",
    status: "suspended",
    propertyIds: ["prop_seminyak"],
    lastActiveAt: minutesAgo(64_000),
    invitedAt: addDays(TODAY, -400),
    avatarHue: 8,
  },
];

/* -------------------------------------------------------------------------- */
/*  Billing                                                                   */
/* -------------------------------------------------------------------------- */

export const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    pricePerRoom: 45_000,
    minimumMonthly: 900_000,
    includedProperties: 1,
    features: [
      "One property",
      "Channex connectivity",
      "Rates, availability and reservations",
      "Email support",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    pricePerRoom: 38_000,
    minimumMonthly: 1_800_000,
    includedProperties: 5,
    features: [
      "Up to five properties",
      "Everything in Starter",
      "Dynamic pricing rules",
      "User roles and property scoping",
      "Priority support",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    pricePerRoom: 31_000,
    minimumMonthly: 5_400_000,
    includedProperties: 25,
    features: [
      "Up to twenty-five properties",
      "Everything in Growth",
      "Market rate shopping",
      "Custom reporting exports",
      "Dedicated onboarding",
    ],
  },
];

const billableRooms = properties.reduce((sum, p) => sum + p.rooms, 0);

export const subscription: Subscription = {
  planId: "growth",
  status: "past_due",
  billableRooms,
  properties: properties.length,
  currentPeriodStart: addDays(TODAY, -12),
  currentPeriodEnd: addDays(TODAY, 18),
  graceDays: 7,
  paymentMethod: { brand: "Visa", last4: "4242", expiry: "07/29" },
};

export const invoices: Invoice[] = (() => {
  const plan = plans.find((p) => p.id === subscription.planId)!;
  return Array.from({ length: 6 }, (_, monthsAgo) => {
    const periodStart = addDays(TODAY, -12 - monthsAgo * 30);
    const dueAt = addDays(periodStart, 14);
    const roomCount = Math.max(0, billableRooms - monthsAgo * intBetween(0, 3));
    const lines = [
      {
        description: `${plan.name} plan — ${roomCount} rooms`,
        quantity: roomCount,
        unitAmount: plan.pricePerRoom,
        amount: Math.max(plan.minimumMonthly, roomCount * plan.pricePerRoom),
      },
    ];
    if (monthsAgo === 0) {
      lines.push({
        description: "Additional property, Staybase Canggu Loft (prorated)",
        quantity: 1,
        unitAmount: 420_000,
        amount: 420_000,
      });
    }
    const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
    const tax = Math.round(subtotal * 0.11);
    // The newest invoice is the one that has slipped past its due date.
    const status: Invoice["status"] = monthsAgo === 0 ? "past_due" : "paid";
    return {
      id: `inv_${String(6 - monthsAgo).padStart(4, "0")}`,
      number: `STB-2026-${String(120 - monthsAgo).padStart(4, "0")}`,
      periodStart,
      periodEnd: addDays(periodStart, 30),
      issuedAt: periodStart,
      dueAt,
      status,
      currency: "IDR" as const,
      lines,
      subtotal,
      tax,
      total: subtotal + tax,
      paidAt: status === "paid" ? addDays(dueAt, -intBetween(1, 9)) : null,
    };
  });
})();

/* -------------------------------------------------------------------------- */
/*  Dynamic pricing                                                           */
/* -------------------------------------------------------------------------- */

export const pricingRules: PricingRule[] = [
  {
    id: "pr_high_demand",
    name: "High demand uplift",
    kind: "occupancy",
    enabled: true,
    priority: 10,
    roomTypeIds: [],
    description: "Raise the rate once the room type is 80% or more committed.",
    condition: { kind: "occupancy", minOccupancy: 0.8, maxOccupancy: 1.01 },
    adjustment: { type: "percent", value: 18 },
  },
  {
    id: "pr_healthy_demand",
    name: "Healthy demand uplift",
    kind: "occupancy",
    enabled: true,
    priority: 20,
    roomTypeIds: [],
    description: "A gentler lift between 60% and 80% occupancy.",
    condition: { kind: "occupancy", minOccupancy: 0.6, maxOccupancy: 0.8 },
    adjustment: { type: "percent", value: 7 },
  },
  {
    id: "pr_soft_demand",
    name: "Soft demand discount",
    kind: "occupancy",
    enabled: true,
    priority: 30,
    roomTypeIds: [],
    description: "Discount when a date is still under 35% committed.",
    condition: { kind: "occupancy", minOccupancy: 0, maxOccupancy: 0.35 },
    adjustment: { type: "percent", value: -9 },
  },
  {
    id: "pr_last_minute",
    name: "Last-minute release",
    kind: "lead_time",
    enabled: true,
    priority: 40,
    roomTypeIds: [],
    description: "Inside three days an empty room earns nothing, so release it.",
    condition: { kind: "lead_time", minDays: 0, maxDays: 3 },
    adjustment: { type: "percent", value: -12 },
  },
  {
    id: "pr_early_bird",
    name: "Far-out protection",
    kind: "lead_time",
    enabled: false,
    priority: 50,
    roomTypeIds: [],
    description: "Hold a premium beyond 90 days so early bookers do not set the floor.",
    condition: { kind: "lead_time", minDays: 90, maxDays: 365 },
    adjustment: { type: "percent", value: 6 },
  },
  {
    id: "pr_weekend",
    name: "Weekend premium",
    kind: "day_of_week",
    enabled: true,
    priority: 60,
    roomTypeIds: [],
    description: "Friday and Saturday nights carry a premium.",
    condition: { kind: "day_of_week", days: [5, 6] },
    adjustment: { type: "percent", value: 10 },
  },
  {
    id: "pr_orphan",
    name: "Orphan night clearance",
    kind: "orphan_gap",
    enabled: true,
    priority: 70,
    roomTypeIds: [],
    description: "A one or two night gap between stays rarely sells at full rate.",
    condition: { kind: "orphan_gap", maxGapNights: 2 },
    adjustment: { type: "percent", value: -15 },
  },
  {
    id: "pr_villa_position",
    name: "Pool villa positioning",
    kind: "competitor",
    enabled: false,
    priority: 80,
    roomTypeIds: ["rt_pool_villa"],
    description: "Close part of the gap to the market reference when we sit below it.",
    condition: { kind: "competitor", direction: "below" },
    adjustment: { type: "target", value: 40 },
  },
];

export const pricingGuardrails: PricingGuardrail[] = roomTypes
  .filter((rt) => rt.propertyId === "prop_ubud")
  .map((rt) => ({
    roomTypeId: rt.id,
    floor: Math.round((rt.defaultRate * 0.7) / 50_000) * 50_000,
    ceiling: Math.round((rt.defaultRate * 1.85) / 50_000) * 50_000,
    maxDailyMovePct: 25,
  }));
