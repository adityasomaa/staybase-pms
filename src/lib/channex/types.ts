/**
 * Channex API payload shapes.
 *
 * Channex is JSON:API flavoured: every resource is wrapped in
 * `{ data: { id, type, attributes } }` and collections come back as
 * `{ data: [...], meta: { total, limit, page } }`.
 */

export interface ChannexResource<TAttributes> {
  id: string;
  type: string;
  attributes: TAttributes;
  relationships?: Record<string, { data: { id: string; type: string } | null }>;
}

export interface ChannexSingle<T> {
  data: ChannexResource<T>;
}

export interface ChannexList<T> {
  data: ChannexResource<T>[];
  meta?: { total?: number; limit?: number; page?: number };
}

export interface ChannexErrorBody {
  errors?: {
    code?: string;
    title?: string;
    details?: Record<string, string[]> | string;
  };
}

export interface ChannexPropertyAttributes {
  title: string;
  currency: string;
  email?: string;
  phone?: string;
  zip_code?: string;
  country: string;
  state?: string;
  city: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  timezone?: string;
  property_type?: string;
  group_id?: string | null;
  is_active?: boolean;
}

export interface ChannexRoomTypeAttributes {
  title: string;
  property_id: string;
  count_of_rooms: number;
  occ_adults: number;
  occ_children: number;
  occ_infants: number;
  default_occupancy: number;
  facilities?: string[];
  room_kind?: "room" | "dorm";
}

export interface ChannexRatePlanAttributes {
  title: string;
  property_id: string;
  room_type_id: string;
  parent_rate_plan_id?: string | null;
  currency: string;
  sell_mode: "per_room" | "per_person";
  rate_mode: "manual" | "derived" | "auto" | "cascade";
  meal_type?: "none" | "breakfast" | "half_board" | "full_board" | "all_inclusive";
  options: {
    occupancy: number;
    is_primary: boolean;
    rate: number;
    derived_option?: { rate: [string, number] };
  }[];
  auto_rate_settings?: Record<string, unknown> | null;
  inherit_rate?: boolean;
  inherit_closed_to_arrival?: boolean;
  inherit_closed_to_departure?: boolean;
  inherit_stop_sell?: boolean;
  inherit_min_stay_arrival?: boolean;
  inherit_max_stay?: boolean;
}

/** One entry of the bulk ARI update payload. */
export interface ChannexAvailabilityValue {
  property_id: string;
  room_type_id: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  availability: number;
}

export interface ChannexRestrictionValue {
  property_id: string;
  rate_plan_id: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  rate?: number | string;
  min_stay_arrival?: number;
  min_stay_through?: number;
  max_stay?: number;
  closed_to_arrival?: boolean;
  closed_to_departure?: boolean;
  stop_sell?: boolean;
  availability_offset?: number;
}

export interface ChannexBookingRoom {
  room_type_id: string;
  rate_plan_id: string;
  checkin_date: string;
  checkout_date: string;
  amount: string;
  occupancy: { adults: number; children: number; infants: number };
  days: Record<string, string>;
  guests?: { name?: string; surname?: string }[];
}

export interface ChannexBookingAttributes {
  property_id: string;
  ota_reservation_code: string;
  ota_name: string;
  system_id?: string;
  status: "new" | "modified" | "cancelled";
  currency: string;
  arrival_date: string;
  departure_date: string;
  arrival_hour?: string | null;
  inserted_at: string;
  amount: string;
  customer: {
    name?: string;
    surname?: string;
    mail?: string;
    phone?: string;
    country?: string;
    city?: string;
    address?: string;
    language?: string;
  };
  services?: { total_price: string; name: string }[];
  rooms: ChannexBookingRoom[];
  notes?: string | null;
  payment_collect?: string | null;
  payment_type?: string | null;
}

export type ChannexWebhookEvent =
  | "booking"
  | "booking_new"
  | "booking_modification"
  | "booking_cancellation"
  | "ari"
  | "message"
  | "sync_error"
  | "reservation_request"
  | "hotel_policy_update";

export interface ChannexWebhookPayload {
  event: ChannexWebhookEvent;
  timestamp?: string;
  property_id: string;
  user_id?: string;
  payload?: {
    booking_id?: string;
    revision_id?: string;
    ota_name?: string;
    ota_reservation_code?: string;
    [key: string]: unknown;
  };
  /** Present only when the webhook is registered with `send_data: true`. */
  data?: ChannexResource<ChannexBookingAttributes>;
}

export interface ChannexChannelAttributes {
  title: string;
  property_id: string;
  channel: string;
  is_active: boolean;
  settings?: Record<string, unknown>;
  properties?: Record<string, unknown>;
}
