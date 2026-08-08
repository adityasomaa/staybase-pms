import "server-only";

import { addDays, diffDays, eachDay } from "@/lib/date";
import { helpArticles, helpCategoryLabels } from "@/lib/help/articles";
import { allNavItems } from "@/lib/navigation";
import { otaCatalog } from "@/lib/ota/catalog";
import { suggestPrice } from "@/lib/pricing";
import type {
  AriCell,
  BlockReason,
  ChannelCode,
  ISODate,
  Invoice,
  Plan,
  PriceSuggestion,
  PricingRule,
  RatePlan,
  Reservation,
  ReservationStatus,
  RoomBlock,
  RoomType,
  SearchResult,
  Subscription,
} from "@/lib/types";
import {
  ariCells,
  channelConnections,
  guests,
  kpiSeries,
  properties,
  ratePlans,
  reservations,
  roomTypes,
  rooms,
  syncEvents,
  TODAY,
} from "@/lib/data/seed";
import {
  invoices,
  plans,
  pricingGuardrails,
  pricingRules,
  roomBlocks,
  subscription,
  users,
} from "@/lib/data/seed-ops";

export {
  TODAY,
  properties,
  roomTypes,
  ratePlans,
  guests,
  rooms,
  channelConnections,
  syncEvents,
  kpiSeries,
  users,
  invoices,
  plans,
  subscription,
  roomBlocks,
};

export const activeProperty = properties[0];

export function getGuest(id: string) {
  return guests.find((g) => g.id === id);
}

export function getRoomType(id: string) {
  return roomTypes.find((rt) => rt.id === id);
}

export function getRatePlan(id: string) {
  return ratePlans.find((rp) => rp.id === id);
}

export function getReservation(id: string) {
  return reservations.find((r) => r.id === id);
}

/** Reservations that count towards occupancy and revenue. */
const LIVE_STATUSES: ReservationStatus[] = ["confirmed", "tentative", "in_house", "checked_out"];

export function listReservations(options: {
  status?: ReservationStatus | "all";
  channel?: ChannelCode | "all";
  query?: string;
  from?: ISODate;
  to?: ISODate;
} = {}) {
  const { status = "all", channel = "all", query = "", from, to } = options;
  const q = query.trim().toLowerCase();
  return reservations.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (channel !== "all" && r.channel !== channel) return false;
    if (from && r.checkOut < from) return false;
    if (to && r.checkIn > to) return false;
    if (!q) return true;
    const guest = getGuest(r.guestId);
    return (
      r.reference.toLowerCase().includes(q) ||
      (r.channelReference?.toLowerCase().includes(q) ?? false) ||
      (guest?.name.toLowerCase().includes(q) ?? false) ||
      (guest?.email.toLowerCase().includes(q) ?? false)
    );
  });
}

export function arrivalsOn(date: ISODate = TODAY) {
  return reservations.filter(
    (r) => r.checkIn === date && (r.status === "confirmed" || r.status === "tentative"),
  );
}

export function departuresOn(date: ISODate = TODAY) {
  return reservations.filter((r) => r.checkOut === date && r.status === "in_house");
}

export function inHouseOn(date: ISODate = TODAY) {
  return reservations.filter(
    (r) => r.checkIn <= date && r.checkOut > date && r.status === "in_house",
  );
}

export function stayoversOn(date: ISODate = TODAY) {
  return inHouseOn(date).filter((r) => r.checkOut > addDays(date, 1));
}

/** Nights sold on a given date across every live reservation. */
function roomNightsOn(date: ISODate) {
  return reservations.filter(
    (r) => LIVE_STATUSES.includes(r.status) && r.checkIn <= date && r.checkOut > date,
  ).length;
}

export const totalRooms = roomTypes
  .filter((rt) => rt.propertyId === activeProperty.id)
  .reduce((s, rt) => s + rt.count, 0);

export interface DashboardStats {
  occupancy: number;
  occupancyDelta: number;
  adr: number;
  adrDelta: number;
  revpar: number;
  revparDelta: number;
  revenue30d: number;
  revenueDelta: number;
  arrivals: number;
  departures: number;
  inHouse: number;
  roomsAvailable: number;
  unassigned: number;
  unpaidBalance: number;
  pendingSyncErrors: number;
}

function seriesSlice(daysBack: number, daysForward = 0) {
  const from = addDays(TODAY, -daysBack);
  const to = addDays(TODAY, daysForward);
  return kpiSeries.filter((p) => p.date >= from && p.date <= to);
}

function avg(xs: number[]) {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}

export function getDashboardStats(): DashboardStats {
  const current = seriesSlice(30);
  const previous = kpiSeries.filter(
    (p) => p.date >= addDays(TODAY, -60) && p.date < addDays(TODAY, -30),
  );

  const occ = avg(current.map((p) => p.occupancy));
  const occPrev = avg(previous.map((p) => p.occupancy));
  const adr = avg(current.map((p) => p.adr));
  const adrPrev = avg(previous.map((p) => p.adr));
  const revpar = avg(current.map((p) => p.revpar));
  const revparPrev = avg(previous.map((p) => p.revpar));
  const rev = current.reduce((s, p) => s + p.revenue, 0);
  const revPrev = previous.reduce((s, p) => s + p.revenue, 0);

  const pct = (a: number, b: number) => (b === 0 ? 0 : ((a - b) / b) * 100);

  const arrivals = arrivalsOn();
  const inHouse = inHouseOn();

  return {
    occupancy: Number(occ.toFixed(1)),
    occupancyDelta: Number(pct(occ, occPrev).toFixed(1)),
    adr: Math.round(adr),
    adrDelta: Number(pct(adr, adrPrev).toFixed(1)),
    revpar: Math.round(revpar),
    revparDelta: Number(pct(revpar, revparPrev).toFixed(1)),
    revenue30d: rev,
    revenueDelta: Number(pct(rev, revPrev).toFixed(1)),
    arrivals: arrivals.length,
    departures: departuresOn().length,
    inHouse: inHouse.length,
    roomsAvailable: Math.max(0, totalRooms - roomNightsOn(TODAY)),
    unassigned: arrivals.filter((r) => r.rooms.every((rm) => rm.roomNumber === null)).length,
    unpaidBalance: reservations
      .filter((r) => LIVE_STATUSES.includes(r.status) && r.balance > 0)
      .reduce((s, r) => s + r.balance, 0),
    pendingSyncErrors: syncEvents.filter((e) => e.outcome === "error").length,
  };
}

/** 30 day occupancy / ADR series for the dashboard area chart. */
export function getPerformanceSeries(days = 45) {
  return seriesSlice(days - 14, 14).map((p) => ({
    date: p.date,
    occupancy: p.occupancy,
    adr: Math.round(p.adr / 1000),
    revpar: Math.round(p.revpar / 1000),
  }));
}

export function getChannelMix() {
  const live = reservations.filter(
    (r) =>
      LIVE_STATUSES.includes(r.status) &&
      r.checkIn >= addDays(TODAY, -30) &&
      r.checkIn <= TODAY,
  );
  const total = live.reduce((s, r) => s + r.total, 0) || 1;
  const byChannel = new Map<ChannelCode, { bookings: number; revenue: number; nights: number }>();
  for (const r of live) {
    const cur = byChannel.get(r.channel) ?? { bookings: 0, revenue: 0, nights: 0 };
    cur.bookings += 1;
    cur.revenue += r.total;
    cur.nights += r.nights;
    byChannel.set(r.channel, cur);
  }
  return [...byChannel.entries()]
    .map(([channel, v]) => ({
      channel,
      ...v,
      share: Number(((v.revenue / total) * 100).toFixed(1)),
      adr: Math.round(v.revenue / Math.max(1, v.nights)),
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function getPickupByLeadTime() {
  const buckets = [
    { label: "0–3 d", min: 0, max: 3 },
    { label: "4–7 d", min: 4, max: 7 },
    { label: "8–14 d", min: 8, max: 14 },
    { label: "15–30 d", min: 15, max: 30 },
    { label: "31–60 d", min: 31, max: 60 },
    { label: "60+ d", min: 61, max: 9999 },
  ];
  return buckets.map((b) => {
    const matching = reservations.filter((r) => {
      if (!LIVE_STATUSES.includes(r.status)) return false;
      const lead = diffDays(r.createdAt.slice(0, 10), r.checkIn);
      return lead >= b.min && lead <= b.max;
    });
    return {
      bucket: b.label,
      bookings: matching.length,
      revenue: matching.reduce((s, r) => s + r.total, 0),
    };
  });
}

/** Occupancy forecast for the next N days, from live reservations. */
export function getForecast(days = 14) {
  return eachDay(TODAY, days).map((date) => {
    const sold = roomNightsOn(date);
    return {
      date,
      sold,
      available: Math.max(0, totalRooms - sold),
      occupancy: Number(((sold / totalRooms) * 100).toFixed(1)),
    };
  });
}

export interface AriRow {
  roomTypeId: string;
  roomTypeTitle: string;
  roomTypeCode: string;
  count: number;
  channexMapped: boolean;
  plans: {
    ratePlanId: string;
    title: string;
    code: string;
    mode: string;
    channexMapped: boolean;
    cells: AriCell[];
  }[];
  /** Availability per date, shared by every plan under the room type. */
  availability: { date: ISODate; free: number; allotment: number }[];
}

export function getAriGrid(from: ISODate, days: number): { dates: ISODate[]; rows: AriRow[] } {
  const dates = eachDay(from, days);
  const dateSet = new Set(dates);
  const rows: AriRow[] = roomTypes
    .filter((rt) => rt.propertyId === activeProperty.id)
    .map((rt) => {
      const plans = ratePlans
        .filter((rp) => rp.roomTypeId === rt.id)
        .map((rp) => ({
          ratePlanId: rp.id,
          title: rp.title,
          code: rp.code,
          mode: rp.mode,
          channexMapped: rp.channexId !== null,
          cells: ariCells
            .filter((c) => c.ratePlanId === rp.id && dateSet.has(c.date))
            .sort((a, b) => (a.date < b.date ? -1 : 1)),
        }));
      const availability = dates.map((date) => {
        const cell = ariCells.find((c) => c.roomTypeId === rt.id && c.date === date);
        const allotment = cell?.allotment ?? rt.count;
        return {
          date,
          allotment,
          free: Math.max(0, allotment - (cell?.booked ?? 0)),
        };
      });
      return {
        roomTypeId: rt.id,
        roomTypeTitle: rt.title,
        roomTypeCode: rt.code,
        count: rt.count,
        channexMapped: rt.channexId !== null,
        plans,
        availability,
      };
    });
  return { dates, rows };
}

export function getHousekeepingBoard() {
  return rooms
    .map((room) => {
      const occupant = reservations.find(
        (r) =>
          r.status === "in_house" &&
          r.rooms.some((rm) => rm.roomNumber === room.number),
      );
      const departingToday = occupant?.checkOut === TODAY;
      return {
        ...room,
        roomTypeTitle: getRoomType(room.roomTypeId)?.title ?? "—",
        guestName: occupant ? getGuest(occupant.guestId)?.name ?? null : null,
        reservationId: occupant?.id ?? null,
        departingToday,
      };
    })
    .sort((a, b) => a.number.localeCompare(b.number));
}

export function getGuestDirectory() {
  return guests
    .map((g) => {
      const own = reservations.filter((r) => r.guestId === g.id);
      const last = own
        .filter((r) => r.checkOut <= TODAY)
        .sort((a, b) => (a.checkOut > b.checkOut ? -1 : 1))[0];
      const next = own
        .filter((r) => r.checkIn > TODAY && r.status !== "cancelled")
        .sort((a, b) => (a.checkIn < b.checkIn ? -1 : 1))[0];
      return {
        ...g,
        reservations: own.length,
        lastStay: last?.checkOut ?? null,
        upcoming: next?.checkIn ?? null,
        preferredChannel: own[0]?.channel ?? "direct",
      };
    })
    .sort((a, b) => b.lifetimeValue - a.lifetimeValue);
}

export function getRevenueByRoomType() {
  const live = reservations.filter(
    (r) =>
      LIVE_STATUSES.includes(r.status) &&
      r.checkIn >= addDays(TODAY, -90) &&
      r.checkIn <= TODAY,
  );
  return roomTypes
    .filter((rt) => rt.propertyId === activeProperty.id)
    .map((rt) => {
      const matching = live.filter((r) => r.rooms.some((rm) => rm.roomTypeId === rt.id));
      const nights = matching.reduce((s, r) => s + r.nights, 0);
      const revenue = matching.reduce((s, r) => s + r.roomRevenue, 0);
      return {
        roomType: rt.title,
        code: rt.code,
        rooms: rt.count,
        nights,
        revenue,
        adr: Math.round(revenue / Math.max(1, nights)),
        occupancy: Number(((nights / (rt.count * 90)) * 100).toFixed(1)),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export function getRecentReservations(limit = 8): Reservation[] {
  return [...reservations]
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
    .slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/*  Booking calendar (room-by-room timeline)                                  */
/* -------------------------------------------------------------------------- */

export interface PlannerStay {
  reservationId: string;
  reference: string;
  guestName: string;
  channel: ChannelCode;
  status: ReservationStatus;
  paymentStatus: string;
  checkIn: ISODate;
  checkOut: ISODate;
  nights: number;
  adults: number;
  children: number;
  total: number;
  balance: number;
  ratePlanTitle: string;
  specialRequests?: string;
  /** Column index within the rendered window, and how many columns it spans. */
  offset: number;
  span: number;
  /** True when the stay starts before the window does. */
  clippedStart: boolean;
  clippedEnd: boolean;
}

export interface PlannerBlock {
  id: string;
  reason: BlockReason;
  note?: string;
  from: ISODate;
  to: ISODate;
  createdBy: string;
  offset: number;
  span: number;
}

export interface PlannerRow {
  roomId: string;
  roomNumber: string;
  floor: number;
  roomTypeId: string;
  roomTypeTitle: string;
  housekeeping: string;
  stays: PlannerStay[];
  blocks: PlannerBlock[];
}

const PLANNER_STATUSES: ReservationStatus[] = ["confirmed", "tentative", "in_house", "checked_out"];

/**
 * Builds the room-by-room timeline.
 *
 * Stays are clipped to the visible window and carry their column offset and
 * span, so the client renders bars by grid position instead of recomputing
 * date maths for every cell.
 */
export function getPlannerGrid(from: ISODate, days: number): {
  dates: ISODate[];
  rows: PlannerRow[];
  unassigned: PlannerStay[];
} {
  const dates = eachDay(from, days);
  const windowEnd = addDays(from, days);

  const clip = (start: ISODate, end: ISODate) => {
    const offset = Math.max(0, diffDays(from, start));
    const endIndex = Math.min(days, diffDays(from, end));
    return {
      offset,
      span: Math.max(1, endIndex - offset),
      clippedStart: start < from,
      clippedEnd: end > windowEnd,
    };
  };

  const toStay = (reservation: Reservation): PlannerStay => {
    const room = reservation.rooms[0];
    const geometry = clip(reservation.checkIn, reservation.checkOut);
    return {
      reservationId: reservation.id,
      reference: reservation.reference,
      guestName: getGuest(reservation.guestId)?.name ?? "Unknown guest",
      channel: reservation.channel,
      status: reservation.status,
      paymentStatus: reservation.paymentStatus,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      nights: reservation.nights,
      adults: room.adults,
      children: room.children,
      total: reservation.total,
      balance: reservation.balance,
      ratePlanTitle: getRatePlan(room.ratePlanId)?.title ?? "—",
      specialRequests: reservation.specialRequests,
      ...geometry,
    };
  };

  const inWindow = reservations.filter(
    (r) =>
      PLANNER_STATUSES.includes(r.status) &&
      r.checkIn < windowEnd &&
      r.checkOut > from,
  );

  const byRoomNumber = new Map<string, Reservation[]>();
  const unassigned: PlannerStay[] = [];
  for (const reservation of inWindow) {
    const number = reservation.rooms[0]?.roomNumber;
    if (!number) {
      unassigned.push(toStay(reservation));
      continue;
    }
    const list = byRoomNumber.get(number) ?? [];
    list.push(reservation);
    byRoomNumber.set(number, list);
  }

  const blocksByRoom = new Map<string, RoomBlock[]>();
  for (const block of roomBlocks) {
    if (block.from >= windowEnd || block.to <= from) continue;
    const list = blocksByRoom.get(block.roomId) ?? [];
    list.push(block);
    blocksByRoom.set(block.roomId, list);
  }

  const rows: PlannerRow[] = rooms
    .map((room) => ({
      roomId: room.id,
      roomNumber: room.number,
      floor: room.floor,
      roomTypeId: room.roomTypeId,
      roomTypeTitle: getRoomType(room.roomTypeId)?.title ?? "—",
      housekeeping: room.housekeeping,
      stays: (byRoomNumber.get(room.number) ?? [])
        .map(toStay)
        .sort((a, b) => a.offset - b.offset),
      blocks: (blocksByRoom.get(room.id) ?? []).map((block) => {
        const geometry = clip(block.from, block.to);
        return {
          id: block.id,
          reason: block.reason,
          note: block.note,
          from: block.from,
          to: block.to,
          createdBy: block.createdBy,
          offset: geometry.offset,
          span: geometry.span,
        };
      }),
    }))
    .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));

  return { dates, rows, unassigned: unassigned.sort((a, b) => a.offset - b.offset) };
}

export function listRoomBlocks() {
  return [...roomBlocks].sort((a, b) => (a.from < b.from ? -1 : 1));
}

/* -------------------------------------------------------------------------- */
/*  Users                                                                     */
/* -------------------------------------------------------------------------- */

export function listUsers() {
  const order: Record<string, number> = { active: 0, invited: 1, suspended: 2 };
  return [...users].sort(
    (a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name),
  );
}

/* -------------------------------------------------------------------------- */
/*  Billing                                                                   */
/* -------------------------------------------------------------------------- */

export interface BillingOverview {
  subscription: Subscription;
  plan: Plan;
  plans: Plan[];
  invoices: Invoice[];
  outstanding: Invoice[];
  amountDue: number;
  /** Negative once the grace period has expired. */
  daysUntilSuspension: number | null;
  nextInvoiceEstimate: number;
}

export function getBillingOverview(): BillingOverview {
  const plan = plans.find((p) => p.id === subscription.planId)!;
  const outstanding = invoices.filter(
    (invoice) => invoice.status === "open" || invoice.status === "past_due",
  );
  const oldestDue = outstanding
    .map((invoice) => invoice.dueAt)
    .sort()
    .at(0);

  const roomsAmount = Math.max(
    plan.minimumMonthly,
    subscription.billableRooms * plan.pricePerRoom,
  );

  return {
    subscription,
    plan,
    plans,
    invoices: [...invoices].sort((a, b) => (a.issuedAt > b.issuedAt ? -1 : 1)),
    outstanding,
    amountDue: outstanding.reduce((sum, invoice) => sum + invoice.total, 0),
    daysUntilSuspension: oldestDue
      ? diffDays(TODAY, addDays(oldestDue, subscription.graceDays))
      : null,
    nextInvoiceEstimate: Math.round(roomsAmount * 1.11),
  };
}

/* -------------------------------------------------------------------------- */
/*  Dynamic pricing                                                           */
/* -------------------------------------------------------------------------- */

export { pricingRules, pricingGuardrails };

/** Occupancy per room type per date, from the ARI grid. */
function occupancyFor(roomTypeId: string, date: ISODate): number {
  const cell = ariCells.find((c) => c.roomTypeId === roomTypeId && c.date === date);
  if (!cell || cell.allotment === 0) return 0;
  return Math.min(1, cell.booked / cell.allotment);
}

/**
 * The raw inputs the rule engine needs, one per (room type, date).
 *
 * Sent to the browser so toggling a rule re-prices instantly. The engine is a
 * pure function with no server dependencies, so it runs identically on both
 * sides and there is no second implementation to drift.
 */
export function getPricingInputs(days = 30) {
  const dates = eachDay(TODAY, days);
  const primaryPlans = roomTypes
    .filter((rt) => rt.propertyId === activeProperty.id)
    .map((rt) => ({
      roomType: rt,
      plan: ratePlans.find((rp) => rp.roomTypeId === rt.id && rp.mode === "manual"),
    }))
    .filter((entry): entry is { roomType: RoomType; plan: RatePlan } => Boolean(entry.plan));

  const inputs = [];
  for (const { roomType, plan } of primaryPlans) {
    for (const date of dates) {
      const cell = ariCells.find((c) => c.ratePlanId === plan.id && c.date === date);
      if (!cell) continue;
      inputs.push({
        date,
        roomTypeId: roomType.id,
        roomTypeTitle: roomType.title,
        ratePlanId: plan.id,
        currentRate: cell.rate,
        occupancy: occupancyFor(roomType.id, date),
        gapNights: orphanGapNights(roomType.id, date),
        competitorRate: Math.round((roomType.defaultRate * 1.12) / 50_000) * 50_000,
        roomsFree: Math.max(0, cell.allotment - cell.booked),
      });
    }
  }
  return { dates, inputs };
}

/**
 * Runs the rule stack over the primary rate plan of every room type for the
 * next N days. Only the primary plan is priced — derived plans follow their
 * parent by construction, so pricing them separately would double-apply.
 */
export function getPricingPreview(days = 30, rules: PricingRule[] = pricingRules) {
  const dates = eachDay(TODAY, days);
  const primaryPlans = roomTypes
    .filter((rt) => rt.propertyId === activeProperty.id)
    .map((rt) => ({
      roomType: rt,
      plan: ratePlans.find((rp) => rp.roomTypeId === rt.id && rp.mode === "manual"),
    }))
    .filter((entry): entry is { roomType: RoomType; plan: RatePlan } => Boolean(entry.plan));

  const suggestions: PriceSuggestion[] = [];
  for (const { roomType, plan } of primaryPlans) {
    const guardrail = pricingGuardrails.find((g) => g.roomTypeId === roomType.id);
    for (const date of dates) {
      const cell = ariCells.find((c) => c.ratePlanId === plan.id && c.date === date);
      if (!cell) continue;
      const occupancy = occupancyFor(roomType.id, date);
      suggestions.push(
        suggestPrice(
          {
            date,
            roomTypeId: roomType.id,
            ratePlanId: plan.id,
            currentRate: cell.rate,
            occupancy,
            gapNights: orphanGapNights(roomType.id, date),
            competitorRate: Math.round((roomType.defaultRate * 1.12) / 50_000) * 50_000,
          },
          rules,
          guardrail,
          TODAY,
        ),
      );
    }
  }

  const changed = suggestions.filter((s) => s.suggestedRate !== s.currentRate);
  const uplift = suggestions.reduce((sum, s) => {
    const cell = ariCells.find(
      (c) => c.ratePlanId === s.ratePlanId && c.date === s.date,
    );
    const free = cell ? Math.max(0, cell.allotment - cell.booked) : 0;
    return sum + (s.suggestedRate - s.currentRate) * free;
  }, 0);

  return {
    dates,
    suggestions,
    changed: changed.length,
    total: suggestions.length,
    projectedUplift: uplift,
    byDate: dates.map((date) => {
      const day = suggestions.filter((s) => s.date === date);
      const avgCurrent = day.length
        ? day.reduce((sum, s) => sum + s.currentRate, 0) / day.length
        : 0;
      const avgSuggested = day.length
        ? day.reduce((sum, s) => sum + s.suggestedRate, 0) / day.length
        : 0;
      return {
        date,
        current: Math.round(avgCurrent / 1000),
        suggested: Math.round(avgSuggested / 1000),
        occupancy: Number(
          (
            (day.reduce((sum, s) => sum + s.occupancy, 0) / Math.max(1, day.length))
          ).toFixed(1),
        ),
      };
    }),
  };
}

/**
 * Nights in the gap this date sits in, or 0 when the date is not an orphan.
 * An orphan is a short empty stretch bounded by sold nights on both sides.
 */
function orphanGapNights(roomTypeId: string, date: ISODate): number {
  const sold = (d: ISODate) => {
    const cell = ariCells.find((c) => c.roomTypeId === roomTypeId && c.date === d);
    return cell ? cell.booked / Math.max(1, cell.allotment) > 0.75 : false;
  };
  if (sold(date)) return 0;

  let back = 1;
  while (back <= 3 && !sold(addDays(date, -back))) back++;
  if (back > 3) return 0;

  let forward = 1;
  while (forward <= 3 && !sold(addDays(date, forward))) forward++;
  if (forward > 3) return 0;

  return back + forward - 1;
}

/* -------------------------------------------------------------------------- */
/*  Global search                                                             */
/* -------------------------------------------------------------------------- */

const CHANNEL_LABELS: Record<string, string> = {
  booking_com: "Booking.com",
  airbnb: "Airbnb",
  expedia: "Expedia",
  agoda: "Agoda",
  traveloka: "Traveloka",
  tiket_com: "Tiket.com",
  direct: "Direct",
  walk_in: "Walk-in",
};

/**
 * Words that carry no signal in a query like "how do I block a room".
 * Without stripping these, token coverage never reaches a useful threshold
 * and natural-language questions score zero.
 */
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "can", "do", "does", "for", "from",
  "how", "i", "in", "is", "it", "me", "my", "of", "on", "or", "our", "set",
  "should", "the", "to", "up", "want", "was", "we", "what", "when", "where",
  "which", "why", "with", "you", "your",
]);

function meaningfulTokens(needle: string): string[] {
  const tokens = needle
    .split(/[^a-z0-9.-]+/i)
    .map((token) => token.trim())
    .filter(Boolean);
  const kept = tokens.filter((token) => token.length > 1 && !STOPWORDS.has(token));
  // If the query was nothing but stopwords, fall back to what was typed.
  return kept.length > 0 ? kept : tokens;
}

/**
 * Scores a candidate against the query.
 *
 * Exact and prefix matches outrank everything, so a full reference lands its
 * reservation first. Below that, score is driven by how much of the query's
 * meaningful vocabulary the candidate covers, which is what lets a typed
 * question find the article that answers it.
 */
function best(
  needle: string,
  tokens: string[],
  ...fields: (string | null | undefined)[]
): number {
  const values = fields.filter(Boolean).map((field) => field!.toLowerCase());
  if (values.length === 0) return 0;

  let phraseScore = 0;
  for (const value of values) {
    if (value === needle) phraseScore = Math.max(phraseScore, 100);
    else if (value.startsWith(needle)) phraseScore = Math.max(phraseScore, 72);
    else {
      const index = value.indexOf(needle);
      if (index === 0) phraseScore = Math.max(phraseScore, 62);
      else if (index > 0) phraseScore = Math.max(phraseScore, 44 - Math.min(20, index));
    }
  }

  const haystack = values.join(" ");
  const matched = tokens.filter((token) => haystack.includes(token)).length;
  const coverage = tokens.length === 0 ? 0 : matched / tokens.length;
  // Require more than a single incidental word before a multi-word query
  // counts as a hit, otherwise "room" alone drags in everything.
  const coverageScore =
    coverage === 0 || (tokens.length > 2 && matched < 2) ? 0 : Math.round(coverage * 48);

  return Math.max(phraseScore, coverageScore);
}

/**
 * One index over everything a user might type: reservations, guests, rooms,
 * rate plans, channels, pages, help articles and quick actions.
 *
 * It runs on the server so it covers the whole ledger rather than only what
 * the current page happens to have loaded into the browser.
 */
export function searchEverything(rawQuery: string, limit = 24): SearchResult[] {
  const needle = rawQuery.trim().toLowerCase();
  if (needle.length < 1) return [];
  const tokens = meaningfulTokens(needle);

  const results: SearchResult[] = [];

  for (const item of allNavItems) {
    const score = best(needle, tokens, item.title, item.description);
    if (score > 0) {
      results.push({
        id: `page:${item.href}`,
        kind: "page",
        title: item.title,
        subtitle: item.description,
        href: item.href,
        score: score + 12,
      });
    }
  }

  for (const article of helpArticles) {
    const score = best(
      needle,
      tokens,
      article.title,
      article.summary,
      article.keywords.join(" "),
    );
    if (score > 0) {
      results.push({
        id: `article:${article.slug}`,
        kind: "article",
        title: article.title,
        subtitle: `${helpCategoryLabels[article.category]} · ${article.minutes} min read`,
        href: `/help/${article.slug}`,
        score: score + 6,
        badge: "Tutorial",
      });
    }
  }

  for (const ota of otaCatalog) {
    const score = best(needle, tokens, ota.name, `connect ${ota.name}`, ota.summary);
    if (score > 0) {
      results.push({
        id: `ota:${ota.slug}`,
        kind: "article",
        title: `Connect ${ota.name}`,
        subtitle: ota.summary.slice(0, 90),
        href: `/channels/connect/${ota.slug}`,
        score: score + 4,
        badge: "Setup guide",
      });
    }
  }

  for (const reservation of reservations) {
    const guest = getGuest(reservation.guestId);
    const score = best(needle, tokens, reservation.reference,
      reservation.channelReference,
      guest?.name,
      guest?.email,
    );
    if (score > 0) {
      results.push({
        id: `res:${reservation.id}`,
        kind: "reservation",
        title: `${reservation.reference} · ${guest?.name ?? "Unknown guest"}`,
        subtitle: `${CHANNEL_LABELS[reservation.channel]} · ${reservation.checkIn} → ${reservation.checkOut}`,
        href: `/reservations/${reservation.id}`,
        score: score + 8,
        badge: reservation.status.replace(/_/g, " "),
      });
    }
  }

  for (const guest of guests) {
    const score = best(needle, tokens, guest.name, guest.email, guest.phone);
    if (score > 0) {
      results.push({
        id: `guest:${guest.id}`,
        kind: "guest",
        title: guest.name,
        subtitle: `${guest.email} · ${guest.stays} stay${guest.stays === 1 ? "" : "s"}`,
        href: "/guests",
        score,
      });
    }
  }

  for (const room of rooms) {
    const score = best(needle, tokens, `room ${room.number}`, room.number);
    if (score > 0) {
      results.push({
        id: `room:${room.id}`,
        kind: "room",
        title: `Room ${room.number}`,
        subtitle: `${getRoomType(room.roomTypeId)?.title ?? "—"} · floor ${room.floor}`,
        href: "/planner",
        score,
      });
    }
  }

  for (const plan of ratePlans) {
    const score = best(needle, tokens, plan.title, plan.code);
    if (score > 0) {
      results.push({
        id: `plan:${plan.id}`,
        kind: "rate_plan",
        title: `${plan.title} (${plan.code})`,
        subtitle: getRoomType(plan.roomTypeId)?.title ?? "—",
        href: "/inventory",
        score,
      });
    }
  }

  for (const channel of channelConnections) {
    const score = best(needle, tokens, channel.name, channel.code);
    if (score > 0) {
      results.push({
        id: `channel:${channel.code}`,
        kind: "channel",
        title: channel.name,
        subtitle: `${channel.state} · ${channel.mappedRoomTypes}/${channel.totalRoomTypes} mapped`,
        href: "/channels",
        score,
      });
    }
  }

  const actions = [
    { title: "Create a reservation", subtitle: "New direct or walk-in booking", href: "/reservations/new", terms: "new booking create reservation add" },
    { title: "Block a room", subtitle: "Take a room out of sale for maintenance", href: "/planner?block=1", terms: "block room maintenance out of order repair" },
    { title: "Add a channel", subtitle: "Connect an OTA through Channex", href: "/channels?add=1", terms: "add channel connect ota new integration" },
    { title: "Add a room type", subtitle: "Create sellable inventory", href: "/inventory?add=room-type", terms: "add room type inventory create new room" },
    { title: "Add a rate plan", subtitle: "Create a new price product", href: "/inventory?add=rate-plan", terms: "add rate plan price product create" },
    { title: "Invite a user", subtitle: "Add a teammate and scope properties", href: "/users?invite=1", terms: "invite user add team member staff access" },
    { title: "Pay an invoice", subtitle: "Settle the outstanding balance", href: "/billing", terms: "pay invoice billing payment subscription card" },
    { title: "Push rates to channels", subtitle: "Sync the ARI window through Channex", href: "/calendar", terms: "sync push rates availability channex update" },
  ];
  for (const action of actions) {
    const score = best(needle, tokens, action.title, action.terms);
    if (score > 0) {
      results.push({
        id: `action:${action.href}`,
        kind: "action",
        title: action.title,
        subtitle: action.subtitle,
        href: action.href,
        score: score + 10,
        badge: "Action",
      });
    }
  }

  return results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit);
}
