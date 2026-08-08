/**
 * STAYBASE — core domain types.
 *
 * The vocabulary here follows the hospitality distribution model used by
 * Channex (property -> room type -> rate plan -> availability/restrictions),
 * so the PMS entities map 1:1 onto what we push to the channel manager.
 */

export type ISODate = string; // YYYY-MM-DD

export type Currency = "IDR" | "USD" | "EUR" | "SGD" | "AUD";

export interface Property {
  id: string;
  title: string;
  code: string;
  city: string;
  country: string;
  timezone: string;
  currency: Currency;
  logoHue: number;
  rooms: number;
  /** Channex property UUID once the property is registered upstream. */
  channexId: string | null;
}

export interface RoomType {
  id: string;
  propertyId: string;
  title: string;
  code: string;
  count: number;
  occupancy: number;
  maxAdults: number;
  maxChildren: number;
  defaultRate: number;
  channexId: string | null;
}

export type RatePlanMode = "manual" | "derived";

export interface RatePlan {
  id: string;
  propertyId: string;
  roomTypeId: string;
  title: string;
  code: string;
  mode: RatePlanMode;
  /** For derived plans: percentage offset from the parent plan. */
  derivedFrom?: string;
  derivedOffsetPct?: number;
  mealPlan: "room_only" | "breakfast" | "half_board" | "full_board";
  cancellationPolicy: string;
  channexId: string | null;
}

/** One cell of the ARI (availability, rates, inventory) grid. */
export interface AriCell {
  date: ISODate;
  roomTypeId: string;
  ratePlanId: string;
  rate: number;
  allotment: number;
  booked: number;
  minStay: number;
  maxStay: number;
  closed: boolean;
  closedToArrival: boolean;
  closedToDeparture: boolean;
}

export type ReservationStatus =
  | "confirmed"
  | "tentative"
  | "in_house"
  | "checked_out"
  | "cancelled"
  | "no_show";

export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";

export type ChannelCode =
  | "booking_com"
  | "airbnb"
  | "expedia"
  | "agoda"
  | "traveloka"
  | "tiket_com"
  | "direct"
  | "walk_in";

export interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  vip: boolean;
  stays: number;
  lifetimeValue: number;
  notes?: string;
}

export interface ReservationRoom {
  roomTypeId: string;
  ratePlanId: string;
  roomNumber: string | null;
  adults: number;
  children: number;
  nightlyRates: { date: ISODate; amount: number }[];
}

export interface Reservation {
  id: string;
  /** Human facing booking reference, e.g. SB-24081. */
  reference: string;
  /** Reference given by the OTA, delivered through Channex. */
  channelReference: string | null;
  propertyId: string;
  guestId: string;
  channel: ChannelCode;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  checkIn: ISODate;
  checkOut: ISODate;
  nights: number;
  rooms: ReservationRoom[];
  currency: Currency;
  roomRevenue: number;
  extrasRevenue: number;
  taxes: number;
  total: number;
  balance: number;
  commission: number;
  createdAt: string;
  specialRequests?: string;
  source: "channex" | "direct" | "manual";
}

export type HousekeepingStatus = "clean" | "dirty" | "inspected" | "out_of_order";

export interface Room {
  id: string;
  propertyId: string;
  roomTypeId: string;
  number: string;
  floor: number;
  housekeeping: HousekeepingStatus;
  occupied: boolean;
  assignedTo: string | null;
  note?: string;
}

export type ChannelConnectionState = "connected" | "pending" | "error" | "disabled";

export interface ChannelConnection {
  code: ChannelCode;
  name: string;
  /** Channex channel UUID. */
  channexId: string | null;
  state: ChannelConnectionState;
  mappedRoomTypes: number;
  totalRoomTypes: number;
  lastSyncAt: string | null;
  bookings30d: number;
  revenue30d: number;
  commissionPct: number;
  errorMessage?: string;
}

export type SyncDirection = "push" | "pull";
export type SyncKind =
  | "ari"
  | "booking"
  | "mapping"
  | "restriction"
  | "content"
  | "handshake";
export type SyncOutcome = "success" | "warning" | "error";

export interface SyncEvent {
  id: string;
  at: string;
  direction: SyncDirection;
  kind: SyncKind;
  channel: ChannelCode | null;
  outcome: SyncOutcome;
  message: string;
  payloadSize: number;
  durationMs: number;
}

export interface KpiPoint {
  date: ISODate;
  occupancy: number;
  adr: number;
  revpar: number;
  revenue: number;
  bookings: number;
}
