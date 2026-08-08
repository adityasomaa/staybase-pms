import "server-only";

import type {
  AriCell,
  ChannelCode,
  ChannelConnection,
  Guest,
  ISODate,
  KpiPoint,
  Property,
  RatePlan,
  Reservation,
  ReservationStatus,
  Room,
  RoomType,
  SyncEvent,
} from "@/lib/types";
import { addDays, toISODate } from "@/lib/date";

/**
 * Deterministic PRNG so that a given server process always produces the same
 * demo dataset. Real deployments replace this module with Drizzle queries
 * (see src/db/schema.ts) — the shape of what it returns is identical.
 */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260808);
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
const between = (min: number, max: number) => min + rand() * (max - min);
const intBetween = (min: number, max: number) => Math.floor(between(min, max + 1));

/** Anchor instant for the whole dataset — resolved once, on the server. */
const NOW = new Date();
export const TODAY: ISODate = toISODate(NOW);

/** Minutes before NOW, as an ISO timestamp. Keeps every "last sync" in the past. */
function minutesAgo(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString();
}

export const properties: Property[] = [
  {
    id: "prop_ubud",
    title: "Staybase Ubud Retreat",
    code: "SB-UBD",
    city: "Ubud, Bali",
    country: "Indonesia",
    timezone: "Asia/Makassar",
    currency: "IDR",
    logoHue: 172,
    rooms: 48,
    channexId: "8f4c2b10-1d3e-4a77-9c21-4c0b6e2f9a13",
  },
  {
    id: "prop_seminyak",
    title: "Staybase Seminyak Suites",
    code: "SB-SMY",
    city: "Seminyak, Bali",
    country: "Indonesia",
    timezone: "Asia/Makassar",
    currency: "IDR",
    logoHue: 24,
    rooms: 62,
    channexId: "b21d7e93-77aa-4b0c-8f65-2ad9c1e04f88",
  },
  {
    id: "prop_canggu",
    title: "Staybase Canggu Loft",
    code: "SB-CGU",
    city: "Canggu, Bali",
    country: "Indonesia",
    timezone: "Asia/Makassar",
    currency: "IDR",
    logoHue: 268,
    rooms: 24,
    channexId: null,
  },
];

export const roomTypes: RoomType[] = [
  {
    id: "rt_deluxe",
    propertyId: "prop_ubud",
    title: "Deluxe Garden View",
    code: "DLX",
    count: 18,
    occupancy: 2,
    maxAdults: 2,
    maxChildren: 1,
    defaultRate: 1_450_000,
    channexId: "c9a1f0d2-3b44-4c11-91b0-77a2e4d5c611",
  },
  {
    id: "rt_pool_villa",
    propertyId: "prop_ubud",
    title: "One Bedroom Pool Villa",
    code: "PVL",
    count: 12,
    occupancy: 2,
    maxAdults: 3,
    maxChildren: 2,
    defaultRate: 3_200_000,
    channexId: "d0b2e133-5c55-4d22-a2c1-88b3f5e6d722",
  },
  {
    id: "rt_family",
    propertyId: "prop_ubud",
    title: "Family Suite",
    code: "FAM",
    count: 10,
    occupancy: 4,
    maxAdults: 4,
    maxChildren: 2,
    defaultRate: 2_650_000,
    channexId: "e1c3f244-6d66-4e33-b3d2-99c4a6f7e833",
  },
  {
    id: "rt_loft",
    propertyId: "prop_ubud",
    title: "Rice Field Loft",
    code: "LFT",
    count: 8,
    occupancy: 2,
    maxAdults: 2,
    maxChildren: 0,
    defaultRate: 1_950_000,
    channexId: null,
  },
];

export const ratePlans: RatePlan[] = [
  {
    id: "rp_dlx_bar",
    propertyId: "prop_ubud",
    roomTypeId: "rt_deluxe",
    title: "Best Available Rate",
    code: "BAR",
    mode: "manual",
    mealPlan: "breakfast",
    cancellationPolicy: "Free cancellation until 48h before arrival",
    channexId: "a1b2c3d4-1111-4a11-8111-111111111111",
  },
  {
    id: "rp_dlx_nr",
    propertyId: "prop_ubud",
    roomTypeId: "rt_deluxe",
    title: "Non-Refundable",
    code: "NR",
    mode: "derived",
    derivedFrom: "rp_dlx_bar",
    derivedOffsetPct: -12,
    mealPlan: "breakfast",
    cancellationPolicy: "Non-refundable, charged at booking",
    channexId: "a1b2c3d4-2222-4a22-8222-222222222222",
  },
  {
    id: "rp_pvl_bar",
    propertyId: "prop_ubud",
    roomTypeId: "rt_pool_villa",
    title: "Best Available Rate",
    code: "BAR",
    mode: "manual",
    mealPlan: "breakfast",
    cancellationPolicy: "Free cancellation until 7 days before arrival",
    channexId: "a1b2c3d4-3333-4a33-8333-333333333333",
  },
  {
    id: "rp_pvl_ld",
    propertyId: "prop_ubud",
    roomTypeId: "rt_pool_villa",
    title: "Long Stay 7+",
    code: "LS7",
    mode: "derived",
    derivedFrom: "rp_pvl_bar",
    derivedOffsetPct: -18,
    mealPlan: "half_board",
    cancellationPolicy: "Free cancellation until 14 days before arrival",
    channexId: null,
  },
  {
    id: "rp_fam_bar",
    propertyId: "prop_ubud",
    roomTypeId: "rt_family",
    title: "Best Available Rate",
    code: "BAR",
    mode: "manual",
    mealPlan: "breakfast",
    cancellationPolicy: "Free cancellation until 48h before arrival",
    channexId: "a1b2c3d4-4444-4a44-8444-444444444444",
  },
  {
    id: "rp_lft_bar",
    propertyId: "prop_ubud",
    roomTypeId: "rt_loft",
    title: "Best Available Rate",
    code: "BAR",
    mode: "manual",
    mealPlan: "room_only",
    cancellationPolicy: "Free cancellation until 24h before arrival",
    channexId: null,
  },
];

const firstNames = [
  "Amelia", "Kenji", "Sofia", "Lucas", "Priya", "Mateo", "Hana", "Oliver",
  "Ines", "Rafael", "Anya", "Tobias", "Meilin", "Jonas", "Clara", "Dimas",
  "Nadia", "Felix", "Ayu", "Tomas", "Leila", "Bastian", "Sari", "Gideon",
];
const lastNames = [
  "Whitfield", "Nakamura", "Ferreira", "Almeida", "Sharma", "Delgado", "Kim",
  "Bennett", "Costa", "Moreau", "Petrov", "Lindqvist", "Chen", "Hartono",
  "Novak", "Wijaya", "Okafor", "Rossi", "Tanaka", "Silva",
];
const countries = [
  "Australia", "Singapore", "Germany", "United States", "Netherlands",
  "Japan", "France", "United Kingdom", "Indonesia", "South Korea",
];

export const guests: Guest[] = Array.from({ length: 64 }, (_, i) => {
  const name = `${pick(firstNames)} ${pick(lastNames)}`;
  const stays = intBetween(1, 9);
  return {
    id: `gst_${String(i + 1).padStart(3, "0")}`,
    name,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
    phone: `+${intBetween(1, 82)}${intBetween(100000000, 999999999)}`,
    country: pick(countries),
    vip: stays >= 6,
    stays,
    lifetimeValue: Math.round(stays * between(3_200_000, 9_800_000)),
    notes: rand() > 0.75 ? pick([
      "Prefers high floor, away from lift.",
      "Allergic to feather pillows.",
      "Celebrating anniversary — arrange welcome amenity.",
      "Late check-out requested on every stay.",
    ]) : undefined,
  };
});

const channelWeights: [ChannelCode, number][] = [
  ["booking_com", 0.34],
  ["airbnb", 0.17],
  ["expedia", 0.11],
  ["agoda", 0.12],
  ["traveloka", 0.09],
  ["tiket_com", 0.05],
  ["direct", 0.09],
  ["walk_in", 0.03],
];

function pickChannel(): ChannelCode {
  const r = rand();
  let acc = 0;
  for (const [code, w] of channelWeights) {
    acc += w;
    if (r <= acc) return code;
  }
  return "direct";
}

const commissionByChannel: Record<ChannelCode, number> = {
  booking_com: 18,
  airbnb: 15,
  expedia: 20,
  agoda: 18,
  traveloka: 16,
  tiket_com: 15,
  direct: 0,
  walk_in: 0,
};

const roomTypesForRates = roomTypes.filter((rt) => rt.propertyId === "prop_ubud");

function plansFor(roomTypeId: string) {
  return ratePlans.filter((rp) => rp.roomTypeId === roomTypeId);
}

/** Seasonality multiplier — weekends and Bali high season lift the rate. */
function seasonFactor(date: Date) {
  const dow = date.getDay();
  const weekend = dow === 5 || dow === 6 ? 1.18 : dow === 0 ? 1.06 : 1;
  const month = date.getMonth();
  const high = month === 6 || month === 7 || month === 11 ? 1.22 : month === 3 || month === 4 ? 1.08 : 1;
  return weekend * high;
}

/** 90 day ARI window starting 7 days in the past. */
export const ariCells: AriCell[] = (() => {
  const cells: AriCell[] = [];
  const start = addDays(TODAY, -7);
  for (let d = 0; d < 97; d++) {
    const date = addDays(start, d);
    const jsDate = new Date(`${date}T00:00:00Z`);
    const factor = seasonFactor(jsDate);
    for (const rt of roomTypesForRates) {
      const booked = Math.min(rt.count, Math.round(rt.count * between(0.35, 0.95)));
      for (const rp of plansFor(rt.id)) {
        const base = rt.defaultRate * factor;
        const offset = rp.mode === "derived" ? 1 + (rp.derivedOffsetPct ?? 0) / 100 : 1;
        const jitter = between(0.96, 1.05);
        cells.push({
          date,
          roomTypeId: rt.id,
          ratePlanId: rp.id,
          rate: Math.round((base * offset * jitter) / 50_000) * 50_000,
          allotment: rt.count,
          booked,
          minStay: factor > 1.15 ? 2 : 1,
          maxStay: 30,
          closed: false,
          closedToArrival: rand() > 0.96,
          closedToDeparture: false,
        });
      }
    }
  }
  return cells;
})();

/** Physical rooms — generated before reservations so stays can be assigned one. */
export const rooms: Room[] = (() => {
  const out: Room[] = [];
  const housekeepers = ["Wayan S.", "Komang A.", "Putu D.", "Made R.", "Kadek L."];
  let n = 0;
  for (const rt of roomTypesForRates) {
    for (let i = 0; i < rt.count; i++) {
      const floor = Math.min(4, Math.floor(n / 12) + 1);
      const index = (n % 12) + 1;
      n++;
      out.push({
        id: `room_${rt.code}_${i + 1}`,
        propertyId: "prop_ubud",
        roomTypeId: rt.id,
        number: `${floor}${String(index).padStart(2, "0")}`,
        floor,
        housekeeping: "clean",
        occupied: false,
        assignedTo: rand() > 0.25 ? pick(housekeepers) : null,
        note: rand() > 0.9 ? pick([
          "AC serviced today — verify temperature.",
          "Shower head replacement pending.",
          "Minibar restock needed.",
        ]) : undefined,
      });
    }
  }
  return out;
})();

const roomsByType = new Map<string, Room[]>();
for (const room of rooms) {
  const list = roomsByType.get(room.roomTypeId) ?? [];
  list.push(room);
  roomsByType.set(room.roomTypeId, list);
}

const statusPool: ReservationStatus[] = [
  "confirmed", "confirmed", "confirmed", "confirmed", "confirmed",
  "confirmed", "confirmed", "tentative", "cancelled", "no_show",
];

/**
 * ~900 reservations across a 135 day window keeps the house around 60–70%
 * full, which is what makes the front desk, forecast and KPI numbers agree.
 * The window reaches 75 days back so month-over-month comparisons have a
 * real baseline instead of an empty one.
 */
export const reservations: Reservation[] = (() => {
  const out: Reservation[] = [];
  for (let i = 0; i < 900; i++) {
    const offset = intBetween(-75, 60);
    const checkIn = addDays(TODAY, offset);
    const nights = intBetween(1, 9);
    const checkOut = addDays(checkIn, nights);
    const rt = pick(roomTypesForRates);
    const rp = pick(plansFor(rt.id));
    const channel = pickChannel();

    // Status follows the stay dates: departed stays are closed, stays that
    // straddle today are in house, and today's arrivals are still to check in.
    let status: ReservationStatus;
    if (checkOut < TODAY) {
      status = rand() > 0.12 ? "checked_out" : pick(["cancelled", "no_show"]);
    } else if (checkIn < TODAY) {
      status = rand() > 0.06 ? "in_house" : "no_show";
    } else if (checkIn === TODAY) {
      status = rand() > 0.15 ? "confirmed" : "tentative";
    } else {
      status = pick(statusPool);
    }

    const nightlyRates = Array.from({ length: nights }, (_, n) => {
      const date = addDays(checkIn, n);
      const factor = seasonFactor(new Date(`${date}T00:00:00Z`));
      const offsetPct = rp.mode === "derived" ? 1 + (rp.derivedOffsetPct ?? 0) / 100 : 1;
      return {
        date,
        amount: Math.round((rt.defaultRate * factor * offsetPct * between(0.95, 1.06)) / 50_000) * 50_000,
      };
    });

    const roomRevenue = nightlyRates.reduce((s, n) => s + n.amount, 0);
    const extrasRevenue = rand() > 0.6 ? Math.round(between(150_000, 1_800_000) / 50_000) * 50_000 : 0;
    const taxes = Math.round((roomRevenue + extrasRevenue) * 0.21);
    const total = roomRevenue + extrasRevenue + taxes;
    const paid = status === "cancelled" || status === "no_show"
      ? 0
      : rand() > 0.45
        ? total
        : Math.round(total * between(0.2, 0.6));

    out.push({
      id: `res_${String(i + 1).padStart(4, "0")}`,
      reference: `SB-${24000 + i * 7}`,
      channelReference: channel === "direct" || channel === "walk_in"
        ? null
        : `${channel.slice(0, 3).toUpperCase()}-${intBetween(1_000_000, 9_999_999)}`,
      propertyId: "prop_ubud",
      guestId: guests[intBetween(0, guests.length - 1)].id,
      channel,
      status,
      paymentStatus: paid === 0 ? "unpaid" : paid >= total ? "paid" : "partial",
      checkIn,
      checkOut,
      nights,
      rooms: [
        {
          roomTypeId: rt.id,
          ratePlanId: rp.id,
          roomNumber:
            status === "in_house" || status === "checked_out"
              ? (roomsByType.get(rt.id) ?? [])[
                  intBetween(0, (roomsByType.get(rt.id)?.length ?? 1) - 1)
                ]?.number ?? null
              : null,
          adults: intBetween(1, rt.maxAdults),
          children: rt.maxChildren > 0 && rand() > 0.7 ? intBetween(1, rt.maxChildren) : 0,
          nightlyRates,
        },
      ],
      currency: "IDR",
      roomRevenue,
      extrasRevenue,
      taxes,
      total,
      balance: total - paid,
      commission: Math.round((roomRevenue * commissionByChannel[channel]) / 100),
      // A booking is never created after today, however far out the arrival is.
      createdAt: (() => {
        const booked = addDays(checkIn, -intBetween(2, 90));
        const day = booked > TODAY ? addDays(TODAY, -intBetween(0, 6)) : booked;
        return `${day}T${String(intBetween(0, 23)).padStart(2, "0")}:${String(
          intBetween(0, 59),
        ).padStart(2, "0")}:00Z`;
      })(),
      specialRequests: rand() > 0.8 ? pick([
        "Early check-in if possible (arriving 09:00).",
        "Honeymoon — flowers and cake on arrival.",
        "Airport pickup requested, flight GA 407.",
        "Twin beds preferred.",
        "Baby cot required.",
      ]) : undefined,
      source: channel === "direct" ? "direct" : channel === "walk_in" ? "manual" : "channex",
    });
  }
  return out.sort((a, b) => (a.checkIn < b.checkIn ? -1 : 1));
})();

const LIVE: ReservationStatus[] = ["confirmed", "tentative", "in_house", "checked_out"];

/**
 * Reconcile the derived state now that reservations exist: which rooms are
 * occupied tonight, and how many of each room type are sold per date. Without
 * this pass the ARI grid and the front desk would tell different stories.
 */
(() => {
  const occupiedNumbers = new Set(
    reservations
      .filter((r) => r.status === "in_house")
      .flatMap((r) => r.rooms.map((room) => room.roomNumber))
      .filter(Boolean) as string[],
  );

  for (const room of rooms) {
    room.occupied = occupiedNumbers.has(room.number);
    room.housekeeping = room.occupied
      ? pick<Room["housekeeping"]>(["dirty", "dirty", "clean"])
      : pick<Room["housekeeping"]>(["clean", "inspected", "dirty", "clean", "out_of_order"]);
  }

  const soldByTypeDate = new Map<string, number>();
  for (const reservation of reservations) {
    if (!LIVE.includes(reservation.status)) continue;
    for (const room of reservation.rooms) {
      for (const night of room.nightlyRates) {
        const key = `${room.roomTypeId}|${night.date}`;
        soldByTypeDate.set(key, (soldByTypeDate.get(key) ?? 0) + 1);
      }
    }
  }

  for (const cell of ariCells) {
    cell.booked = Math.min(
      cell.allotment,
      soldByTypeDate.get(`${cell.roomTypeId}|${cell.date}`) ?? 0,
    );
  }
})();

export const channelConnections: ChannelConnection[] = (() => {
  const total = roomTypesForRates.length;
  const meta: [ChannelCode, string, ChannelConnection["state"], string | null][] = [
    ["booking_com", "Booking.com", "connected", "11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
    ["airbnb", "Airbnb", "connected", "22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb"],
    ["expedia", "Expedia Group", "connected", "33333333-cccc-4ccc-8ccc-cccccccccccc"],
    ["agoda", "Agoda", "error", "44444444-dddd-4ddd-8ddd-dddddddddddd"],
    ["traveloka", "Traveloka", "connected", "55555555-eeee-4eee-8eee-eeeeeeeeeeee"],
    ["tiket_com", "Tiket.com", "pending", null],
    ["direct", "Staybase Booking Engine", "connected", "66666666-ffff-4fff-8fff-ffffffffffff"],
  ];
  return meta.map(([code, name, state, channexId]) => {
    const res30 = reservations.filter(
      (r) => r.channel === code && r.createdAt >= addDays(TODAY, -30) && r.status !== "cancelled",
    );
    return {
      code,
      name,
      channexId,
      state,
      mappedRoomTypes: state === "connected" ? total : state === "error" ? total - 1 : intBetween(0, 2),
      totalRoomTypes: total,
      lastSyncAt: state === "pending" ? null : minutesAgo(intBetween(4, 260)),
      bookings30d: res30.length,
      revenue30d: res30.reduce((s, r) => s + r.total, 0),
      commissionPct: commissionByChannel[code],
      errorMessage: state === "error"
        ? "Mapping rejected: rate plan LS7 has no matching Agoda rate category."
        : undefined,
    };
  });
})();

export const syncEvents: SyncEvent[] = (() => {
  const out: SyncEvent[] = [];
  const templates: [SyncEvent["kind"], SyncEvent["direction"], string][] = [
    ["ari", "push", "Pushed 4 room types × 30 days of availability and rates"],
    ["ari", "push", "Rate update accepted for Deluxe Garden View / BAR"],
    ["booking", "pull", "New reservation received and mapped to room type"],
    ["booking", "pull", "Reservation modification applied (dates changed)"],
    ["restriction", "push", "Min-stay restriction applied to weekend dates"],
    ["mapping", "push", "Room type mapping refreshed"],
    ["content", "push", "Property content and photos synchronised"],
    ["handshake", "pull", "Channel handshake verified"],
  ];
  let elapsed = 6;
  for (let i = 0; i < 42; i++) {
    const [kind, direction, message] = pick(templates);
    elapsed += intBetween(20, 190);
    const at = minutesAgo(elapsed);
    const outcome: SyncEvent["outcome"] =
      rand() > 0.92 ? "error" : rand() > 0.82 ? "warning" : "success";
    out.push({
      id: `syn_${String(i + 1).padStart(3, "0")}`,
      at,
      direction,
      kind,
      channel: pick<ChannelCode>(["booking_com", "airbnb", "expedia", "agoda", "traveloka"]),
      outcome,
      message:
        outcome === "error"
          ? "Rejected by channel: rate plan is not mapped"
          : outcome === "warning"
            ? `${message} (partially applied)`
            : message,
      payloadSize: intBetween(400, 48_000),
      durationMs: intBetween(90, 2400),
    });
  }
  return out.sort((a, b) => (a.at > b.at ? -1 : 1));
})();

/**
 * Rolling 90 day performance series.
 *
 * Derived from the reservations themselves rather than generated separately —
 * otherwise the dashboard KPIs and the front desk disagree about the same day.
 */
export const kpiSeries: KpiPoint[] = (() => {
  const totalRooms = roomTypesForRates.reduce((s, rt) => s + rt.count, 0);

  const soldByDate = new Map<ISODate, number>();
  const revenueByDate = new Map<ISODate, number>();
  const bookingsByDate = new Map<ISODate, number>();

  for (const reservation of reservations) {
    if (!LIVE.includes(reservation.status)) continue;
    bookingsByDate.set(
      reservation.checkIn,
      (bookingsByDate.get(reservation.checkIn) ?? 0) + 1,
    );
    for (const room of reservation.rooms) {
      for (const night of room.nightlyRates) {
        soldByDate.set(night.date, (soldByDate.get(night.date) ?? 0) + 1);
        revenueByDate.set(night.date, (revenueByDate.get(night.date) ?? 0) + night.amount);
      }
    }
  }

  return Array.from({ length: 90 }, (_, i) => {
    const date = addDays(TODAY, i - 75);
    const sold = Math.min(totalRooms, soldByDate.get(date) ?? 0);
    const revenue = revenueByDate.get(date) ?? 0;
    return {
      date,
      occupancy: Number(((sold / totalRooms) * 100).toFixed(1)),
      adr: sold > 0 ? Math.round(revenue / sold) : 0,
      revpar: Math.round(revenue / totalRooms),
      revenue,
      bookings: bookingsByDate.get(date) ?? 0,
    };
  });
})();
