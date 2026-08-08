import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * STAYBASE persistence schema (Postgres via Drizzle).
 *
 * The demo dataset in src/lib/data/seed.ts mirrors these tables exactly, so
 * swapping the query layer over to Drizzle is a drop-in change once
 * DATABASE_URL is set. Run `npm run db:push` to apply.
 */

export const reservationStatus = pgEnum("reservation_status", [
  "confirmed",
  "tentative",
  "in_house",
  "checked_out",
  "cancelled",
  "no_show",
]);

export const paymentStatus = pgEnum("payment_status", [
  "unpaid",
  "partial",
  "paid",
  "refunded",
]);

export const housekeepingStatus = pgEnum("housekeeping_status", [
  "clean",
  "dirty",
  "inspected",
  "out_of_order",
]);

export const ratePlanMode = pgEnum("rate_plan_mode", ["manual", "derived"]);

export const syncOutcome = pgEnum("sync_outcome", ["success", "warning", "error"]);

export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  code: text("code").notNull().unique(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  timezone: text("timezone").notNull().default("Asia/Makassar"),
  currency: text("currency").notNull().default("IDR"),
  channexId: uuid("channex_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const roomTypes = pgTable(
  "room_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    code: text("code").notNull(),
    count: integer("count").notNull(),
    occupancy: integer("occupancy").notNull().default(2),
    maxAdults: integer("max_adults").notNull().default(2),
    maxChildren: integer("max_children").notNull().default(0),
    defaultRate: numeric("default_rate", { precision: 14, scale: 2 }).notNull(),
    channexId: uuid("channex_id"),
  },
  (t) => [uniqueIndex("room_types_property_code_idx").on(t.propertyId, t.code)],
);

export const ratePlans = pgTable(
  "rate_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    roomTypeId: uuid("room_type_id")
      .notNull()
      .references(() => roomTypes.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    code: text("code").notNull(),
    mode: ratePlanMode("mode").notNull().default("manual"),
    derivedFrom: uuid("derived_from"),
    derivedOffsetPct: numeric("derived_offset_pct", { precision: 6, scale: 2 }),
    mealPlan: text("meal_plan").notNull().default("room_only"),
    cancellationPolicy: text("cancellation_policy"),
    channexId: uuid("channex_id"),
  },
  (t) => [index("rate_plans_room_type_idx").on(t.roomTypeId)],
);

/** One row per (rate plan, date) — the ARI grid the calendar edits. */
export const ariCells = pgTable(
  "ari_cells",
  {
    ratePlanId: uuid("rate_plan_id")
      .notNull()
      .references(() => ratePlans.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    rate: numeric("rate", { precision: 14, scale: 2 }).notNull(),
    allotment: integer("allotment").notNull(),
    booked: integer("booked").notNull().default(0),
    minStay: integer("min_stay").notNull().default(1),
    maxStay: integer("max_stay").notNull().default(30),
    closed: boolean("closed").notNull().default(false),
    closedToArrival: boolean("closed_to_arrival").notNull().default(false),
    closedToDeparture: boolean("closed_to_departure").notNull().default(false),
    syncedAt: timestamp("synced_at", { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.ratePlanId, t.date] }),
    index("ari_cells_date_idx").on(t.date),
  ],
);

export const guests = pgTable(
  "guests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    country: text("country"),
    vip: boolean("vip").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("guests_email_idx").on(t.email)],
);

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    roomTypeId: uuid("room_type_id")
      .notNull()
      .references(() => roomTypes.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    floor: integer("floor").notNull().default(1),
    housekeeping: housekeepingStatus("housekeeping").notNull().default("clean"),
    assignedTo: text("assigned_to"),
    note: text("note"),
  },
  (t) => [uniqueIndex("rooms_property_number_idx").on(t.propertyId, t.number)],
);

export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull().unique(),
    channelReference: text("channel_reference"),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    guestId: uuid("guest_id")
      .notNull()
      .references(() => guests.id),
    channel: text("channel").notNull().default("direct"),
    status: reservationStatus("status").notNull().default("confirmed"),
    paymentStatus: paymentStatus("payment_status").notNull().default("unpaid"),
    checkIn: date("check_in").notNull(),
    checkOut: date("check_out").notNull(),
    currency: text("currency").notNull().default("IDR"),
    roomRevenue: numeric("room_revenue", { precision: 14, scale: 2 }).notNull(),
    extrasRevenue: numeric("extras_revenue", { precision: 14, scale: 2 }).notNull().default("0"),
    taxes: numeric("taxes", { precision: 14, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 14, scale: 2 }).notNull(),
    balance: numeric("balance", { precision: 14, scale: 2 }).notNull().default("0"),
    commission: numeric("commission", { precision: 14, scale: 2 }).notNull().default("0"),
    specialRequests: text("special_requests"),
    source: text("source").notNull().default("direct"),
    /** Raw Channex booking payload kept for audit + replay. */
    channexPayload: jsonb("channex_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("reservations_stay_idx").on(t.propertyId, t.checkIn, t.checkOut),
    uniqueIndex("reservations_channel_ref_idx").on(t.propertyId, t.channelReference),
  ],
);

export const reservationRooms = pgTable("reservation_rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  reservationId: uuid("reservation_id")
    .notNull()
    .references(() => reservations.id, { onDelete: "cascade" }),
  roomTypeId: uuid("room_type_id")
    .notNull()
    .references(() => roomTypes.id),
  ratePlanId: uuid("rate_plan_id")
    .notNull()
    .references(() => ratePlans.id),
  roomId: uuid("room_id").references(() => rooms.id),
  adults: integer("adults").notNull().default(2),
  children: integer("children").notNull().default(0),
  /** { "2026-08-08": 1450000, ... } — nightly breakdown from the channel. */
  nightlyRates: jsonb("nightly_rates").notNull().default({}),
});

export const channelConnections = pgTable(
  "channel_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    channexId: uuid("channex_id"),
    state: text("state").notNull().default("pending"),
    commissionPct: numeric("commission_pct", { precision: 5, scale: 2 }).notNull().default("0"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    settings: jsonb("settings"),
  },
  (t) => [uniqueIndex("channel_connections_property_code_idx").on(t.propertyId, t.code)],
);

export const syncEvents = pgTable(
  "sync_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    direction: text("direction").notNull(),
    kind: text("kind").notNull(),
    channel: text("channel"),
    outcome: syncOutcome("outcome").notNull().default("success"),
    message: text("message").notNull(),
    payloadSize: integer("payload_size").notNull().default(0),
    durationMs: integer("duration_ms").notNull().default(0),
    payload: jsonb("payload"),
  },
  (t) => [index("sync_events_at_idx").on(t.propertyId, t.at)],
);
