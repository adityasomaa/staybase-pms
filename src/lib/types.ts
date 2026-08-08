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

/* -------------------------------------------------------------------------- */
/*  Room blocks                                                               */
/* -------------------------------------------------------------------------- */

export type BlockReason =
  | "maintenance"
  | "renovation"
  | "deep_clean"
  | "owner_use"
  | "quarantine";

export interface RoomBlock {
  id: string;
  propertyId: string;
  roomId: string;
  roomNumber: string;
  roomTypeId: string;
  /** Inclusive start, exclusive end — same convention as a stay. */
  from: ISODate;
  to: ISODate;
  reason: BlockReason;
  note?: string;
  createdBy: string;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Users & access                                                            */
/* -------------------------------------------------------------------------- */

export type UserRole =
  | "owner"
  | "manager"
  | "revenue_manager"
  | "front_desk"
  | "housekeeping"
  | "accountant";

export type UserStatus = "active" | "invited" | "suspended";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  /** Property ids this user can see. Owners implicitly see everything. */
  propertyIds: string[];
  lastActiveAt: string | null;
  invitedAt: string;
  avatarHue: number;
}

/* -------------------------------------------------------------------------- */
/*  Billing & subscription                                                    */
/* -------------------------------------------------------------------------- */

export type SubscriptionStatus = "active" | "past_due" | "suspended" | "trialing";

export type PlanId = "starter" | "growth" | "scale";

export interface Plan {
  id: PlanId;
  name: string;
  /** Price per room per month. */
  pricePerRoom: number;
  minimumMonthly: number;
  includedProperties: number;
  features: string[];
}

export interface Subscription {
  planId: PlanId;
  status: SubscriptionStatus;
  billableRooms: number;
  properties: number;
  currentPeriodStart: ISODate;
  currentPeriodEnd: ISODate;
  /** Days after the due date before the workspace is locked. */
  graceDays: number;
  paymentMethod: { brand: string; last4: string; expiry: string } | null;
}

export type InvoiceStatus = "paid" | "open" | "past_due" | "void";

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitAmount: number;
  amount: number;
}

export interface Invoice {
  id: string;
  number: string;
  periodStart: ISODate;
  periodEnd: ISODate;
  issuedAt: ISODate;
  dueAt: ISODate;
  status: InvoiceStatus;
  currency: Currency;
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  total: number;
  paidAt: ISODate | null;
}

/* -------------------------------------------------------------------------- */
/*  Dynamic pricing                                                           */
/* -------------------------------------------------------------------------- */

export type PricingRuleKind =
  | "occupancy"
  | "lead_time"
  | "day_of_week"
  | "orphan_gap"
  | "length_of_stay"
  | "competitor";

export type PricingAdjustment =
  | { type: "percent"; value: number }
  | { type: "amount"; value: number }
  | { type: "target"; value: number };

export interface PricingRule {
  id: string;
  name: string;
  kind: PricingRuleKind;
  enabled: boolean;
  /** Lower runs first; later rules compound on the result. */
  priority: number;
  /** Restrict to specific room types; empty means all. */
  roomTypeIds: string[];
  description: string;
  condition:
    | { kind: "occupancy"; minOccupancy: number; maxOccupancy: number }
    | { kind: "lead_time"; minDays: number; maxDays: number }
    | { kind: "day_of_week"; days: number[] }
    | { kind: "orphan_gap"; maxGapNights: number }
    | { kind: "length_of_stay"; minNights: number }
    | { kind: "competitor"; direction: "below" | "above" };
  adjustment: PricingAdjustment;
}

export interface PricingGuardrail {
  roomTypeId: string;
  floor: number;
  ceiling: number;
  maxDailyMovePct: number;
}

export interface PriceSuggestion {
  date: ISODate;
  roomTypeId: string;
  ratePlanId: string;
  currentRate: number;
  suggestedRate: number;
  deltaPct: number;
  occupancy: number;
  leadDays: number;
  appliedRules: { id: string; name: string; effect: number }[];
  clampedBy: "floor" | "ceiling" | "daily_move" | null;
}

/* -------------------------------------------------------------------------- */
/*  OTA catalogue & help                                                      */
/* -------------------------------------------------------------------------- */

export interface OtaDefinition {
  /** Slug used in the connect URL. */
  slug: string;
  name: string;
  /** Channex channel identifier. */
  channexChannel: string;
  category: "ota" | "metasearch" | "direct" | "wholesaler";
  commissionRange: [number, number];
  /** Model the channel uses for rates. */
  rateModel: "per_room" | "per_person" | "both";
  regions: string[];
  summary: string;
  /** What the hotel must obtain before mapping can start. */
  credentials: { label: string; hint: string; secret: boolean }[];
  steps: { title: string; detail: string }[];
  pitfalls: string[];
  docsUrl: string;
  averageSetupDays: number;
}

export type HelpCategory =
  | "getting_started"
  | "rates"
  | "reservations"
  | "channels"
  | "billing"
  | "users"
  | "pricing";

export interface HelpArticle {
  slug: string;
  title: string;
  category: HelpCategory;
  summary: string;
  minutes: number;
  keywords: string[];
  body: { heading: string; paragraphs: string[]; steps?: string[] }[];
}

/* -------------------------------------------------------------------------- */
/*  Search                                                                    */
/* -------------------------------------------------------------------------- */

export type SearchKind =
  | "reservation"
  | "guest"
  | "room"
  | "rate_plan"
  | "channel"
  | "page"
  | "article"
  | "action";

export interface SearchResult {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle: string;
  href: string;
  /** Higher wins. */
  score: number;
  badge?: string;
}
