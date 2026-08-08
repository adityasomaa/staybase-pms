import type {
  ChannexAvailabilityValue,
  ChannexBookingAttributes,
  ChannexPropertyAttributes,
  ChannexRatePlanAttributes,
  ChannexRestrictionValue,
  ChannexRoomTypeAttributes,
} from "@/lib/channex/types";
import type {
  AriCell,
  ChannelCode,
  Property,
  RatePlan,
  Reservation,
  RoomType,
} from "@/lib/types";

/**
 * Translation layer between STAYBASE entities and Channex payloads.
 *
 * Everything here is pure so both the sync worker and the unit tests can call
 * it without a network or database.
 */

const mealTypeMap: Record<RatePlan["mealPlan"], ChannexRatePlanAttributes["meal_type"]> = {
  room_only: "none",
  breakfast: "breakfast",
  half_board: "half_board",
  full_board: "full_board",
};

export function toChannexProperty(property: Property): ChannexPropertyAttributes {
  return {
    title: property.title,
    currency: property.currency,
    country: countryCode(property.country),
    city: property.city.split(",")[0]!.trim(),
    timezone: property.timezone,
    property_type: "hotel",
    is_active: true,
  };
}

export function toChannexRoomType(
  roomType: RoomType,
  channexPropertyId: string,
): ChannexRoomTypeAttributes {
  return {
    title: roomType.title,
    property_id: channexPropertyId,
    count_of_rooms: roomType.count,
    occ_adults: roomType.maxAdults,
    occ_children: roomType.maxChildren,
    occ_infants: 1,
    default_occupancy: roomType.occupancy,
    room_kind: "room",
  };
}

export function toChannexRatePlan(
  plan: RatePlan,
  ctx: {
    channexPropertyId: string;
    channexRoomTypeId: string;
    channexParentRatePlanId?: string | null;
    currency: string;
    baseRate: number;
    occupancy: number;
  },
): ChannexRatePlanAttributes {
  const derived = plan.mode === "derived" && Boolean(ctx.channexParentRatePlanId);
  return {
    title: plan.title,
    property_id: ctx.channexPropertyId,
    room_type_id: ctx.channexRoomTypeId,
    parent_rate_plan_id: derived ? ctx.channexParentRatePlanId : null,
    currency: ctx.currency,
    sell_mode: "per_room",
    rate_mode: derived ? "derived" : "manual",
    meal_type: mealTypeMap[plan.mealPlan],
    options: [
      {
        occupancy: ctx.occupancy,
        is_primary: true,
        rate: ctx.baseRate,
        ...(derived
          ? { derived_option: { rate: ["percent", plan.derivedOffsetPct ?? 0] as [string, number] } }
          : {}),
      },
    ],
    inherit_rate: derived,
    inherit_closed_to_arrival: derived,
    inherit_closed_to_departure: derived,
    inherit_stop_sell: derived,
    inherit_min_stay_arrival: derived,
    inherit_max_stay: derived,
  };
}

/**
 * Availability is per room type, so collapse the per-plan grid down to one
 * value per (room type, date) before pushing.
 */
export function toAvailabilityValues(
  cells: AriCell[],
  ctx: { channexPropertyId: string; roomTypeIdMap: Record<string, string> },
): ChannexAvailabilityValue[] {
  const seen = new Set<string>();
  const values: ChannexAvailabilityValue[] = [];
  for (const cell of cells) {
    const key = `${cell.roomTypeId}|${cell.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const channexRoomTypeId = ctx.roomTypeIdMap[cell.roomTypeId];
    if (!channexRoomTypeId) continue;
    values.push({
      property_id: ctx.channexPropertyId,
      room_type_id: channexRoomTypeId,
      date: cell.date,
      availability: Math.max(0, cell.allotment - cell.booked),
    });
  }
  return values;
}

export function toRestrictionValues(
  cells: AriCell[],
  ctx: { channexPropertyId: string; ratePlanIdMap: Record<string, string> },
): ChannexRestrictionValue[] {
  return cells.flatMap((cell) => {
    const ratePlanId = ctx.ratePlanIdMap[cell.ratePlanId];
    if (!ratePlanId) return [];
    return [
      {
        property_id: ctx.channexPropertyId,
        rate_plan_id: ratePlanId,
        date: cell.date,
        rate: cell.rate,
        min_stay_arrival: cell.minStay,
        min_stay_through: cell.minStay,
        max_stay: cell.maxStay,
        closed_to_arrival: cell.closedToArrival,
        closed_to_departure: cell.closedToDeparture,
        stop_sell: cell.closed,
      },
    ];
  });
}

/** Channex sends batches of at most 500 ARI values per request. */
export function chunk<T>(items: T[], size = 500): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const otaToChannel: Record<string, ChannelCode> = {
  "Booking.com": "booking_com",
  BookingCom: "booking_com",
  Airbnb: "airbnb",
  AirBNB: "airbnb",
  Expedia: "expedia",
  Agoda: "agoda",
  Traveloka: "traveloka",
  "Tiket.com": "tiket_com",
  Open: "direct",
  Website: "direct",
};

export function otaNameToChannel(otaName: string): ChannelCode {
  return otaToChannel[otaName] ?? "direct";
}

export interface InboundBooking {
  channelReference: string;
  channel: ChannelCode;
  status: Reservation["status"];
  checkIn: string;
  checkOut: string;
  currency: string;
  total: number;
  guest: { name: string; email: string; phone: string; country: string };
  rooms: {
    channexRoomTypeId: string;
    channexRatePlanId: string;
    adults: number;
    children: number;
    nightlyRates: { date: string; amount: number }[];
  }[];
  notes: string | null;
  receivedAt: string;
}

/**
 * Normalises an inbound Channex booking into the shape the PMS persists.
 * Channex prices arrive as decimal strings — parse once, here.
 */
export function fromChannexBooking(attributes: ChannexBookingAttributes): InboundBooking {
  const customer = attributes.customer ?? {};
  return {
    channelReference: attributes.ota_reservation_code,
    channel: otaNameToChannel(attributes.ota_name),
    status: attributes.status === "cancelled" ? "cancelled" : "confirmed",
    checkIn: attributes.arrival_date,
    checkOut: attributes.departure_date,
    currency: attributes.currency,
    total: Number.parseFloat(attributes.amount ?? "0"),
    guest: {
      name: [customer.name, customer.surname].filter(Boolean).join(" ").trim() || "Channel guest",
      email: customer.mail ?? "",
      phone: customer.phone ?? "",
      country: customer.country ?? "",
    },
    rooms: (attributes.rooms ?? []).map((room) => ({
      channexRoomTypeId: room.room_type_id,
      channexRatePlanId: room.rate_plan_id,
      adults: room.occupancy?.adults ?? 2,
      children: room.occupancy?.children ?? 0,
      nightlyRates: Object.entries(room.days ?? {}).map(([date, amount]) => ({
        date,
        amount: Number.parseFloat(amount),
      })),
    })),
    notes: attributes.notes ?? null,
    receivedAt: attributes.inserted_at,
  };
}

function countryCode(country: string): string {
  const codes: Record<string, string> = {
    Indonesia: "ID",
    Australia: "AU",
    Singapore: "SG",
    Thailand: "TH",
    Malaysia: "MY",
    "United States": "US",
    "United Kingdom": "GB",
  };
  return codes[country] ?? country.slice(0, 2).toUpperCase();
}
