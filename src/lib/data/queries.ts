import "server-only";

import { addDays, diffDays, eachDay } from "@/lib/date";
import type {
  AriCell,
  ChannelCode,
  ISODate,
  Reservation,
  ReservationStatus,
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
