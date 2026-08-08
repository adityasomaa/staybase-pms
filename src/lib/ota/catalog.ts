import type { OtaDefinition } from "@/lib/types";

/**
 * OTA catalogue used by the "Add channel" flow.
 *
 * Every OTA follows the same three-part shape — request connectivity in the
 * OTA's own extranet, nominate Channex as the provider, then map room types
 * and rate plans — but each one names things differently and fails in its own
 * way. The steps below capture that shape; exact menu labels move around, so
 * the last step always points at the live Channex documentation.
 *
 * Commission figures are typical published ranges, not a quote — the rate in
 * your own contract is what the Reports page should be configured with.
 */
export const otaCatalog: OtaDefinition[] = [
  {
    slug: "booking-com",
    name: "Booking.com",
    channexChannel: "BookingCom",
    category: "ota",
    commissionRange: [15, 20],
    rateModel: "per_room",
    regions: ["Global"],
    summary:
      "The highest-volume OTA in most markets. Connects by machine account, and is strict about rate parity and about availability that disagrees with what it was last sent.",
    credentials: [
      { label: "Legal entity / Hotel ID", hint: "The numeric property ID shown in the Booking.com extranet header.", secret: false },
      { label: "Machine account username", hint: "Issued by Booking.com Connectivity once the provider request is approved.", secret: false },
      { label: "Machine account password", hint: "Issued alongside the username. Store it in Channex, never in a spreadsheet.", secret: true },
    ],
    steps: [
      { title: "Request connectivity", detail: "In the Booking.com extranet open Account → Connectivity provider and search for Channex. Send the connection request." },
      { title: "Approve the request in Channex", detail: "Channex receives the request and returns a machine account. Approval usually lands within one working day." },
      { title: "Add the channel in STAYBASE", detail: "Paste the Hotel ID and machine account credentials, then save. STAYBASE stores them against the Channex channel, not in the browser." },
      { title: "Map room types and rate plans", detail: "Every Booking.com room/rate combination must point at exactly one STAYBASE rate plan. Unmapped combinations are skipped on push and reported on the Channels page." },
      { title: "Push a short window first", detail: "Sync 7 days, confirm the rates on the extranet calendar match, then widen to 90 or 365 days." },
    ],
    pitfalls: [
      "Booking.com rejects an availability update for a room that has no mapped rate plan — the batch partially applies and the rest silently does not.",
      "Rate parity checks compare against your own website; if the direct rate plan is cheaper, expect a parity warning rather than a hard error.",
      "Occupancy-based pricing must be configured on both sides or the derived rate plans will look wrong on the extranet.",
    ],
    docsUrl: "https://docs.channex.io",
    averageSetupDays: 2,
  },
  {
    slug: "airbnb",
    name: "Airbnb",
    channexChannel: "AirBNB",
    category: "ota",
    commissionRange: [3, 16],
    rateModel: "per_room",
    regions: ["Global"],
    summary:
      "Connects over OAuth rather than credentials, and models inventory as listings rather than room types — a room type with 12 rooms becomes 12 listings or one multi-unit listing.",
    credentials: [
      { label: "Airbnb account", hint: "Authorised through OAuth in Channex; no password is ever entered into STAYBASE.", secret: false },
    ],
    steps: [
      { title: "Start the OAuth handshake", detail: "Channex redirects you to Airbnb to grant access. Sign in with the account that owns the listings." },
      { title: "Choose the listings to link", detail: "Select which Airbnb listings belong to this property. Anything you leave out keeps being managed by hand." },
      { title: "Decide the inventory model", detail: "Multi-unit listings map cleanly to a room type. Individual listings need one STAYBASE room type per listing or availability will double-count." },
      { title: "Map and push", detail: "Map each listing to a room type and rate plan, then push a short window and compare against the Airbnb calendar." },
    ],
    pitfalls: [
      "Airbnb's host-fee model means the commission you see in Reports is not comparable to a Booking.com figure unless you configure it per channel.",
      "Length-of-stay and pricing rules set inside Airbnb's own Smart Pricing will fight the rates you push — turn Smart Pricing off.",
      "Cancelling a reservation on Airbnb does not always release inventory instantly; re-push availability after a cancellation spike.",
    ],
    docsUrl: "https://docs.channex.io",
    averageSetupDays: 1,
  },
  {
    slug: "expedia",
    name: "Expedia Group",
    channexChannel: "Expedia",
    category: "ota",
    commissionRange: [15, 25],
    rateModel: "both",
    regions: ["Global", "North America"],
    summary:
      "Covers Expedia, Hotels.com and Vrbo from one connection. Uses its own product catalogue, so mapping is against Expedia room and rate identifiers rather than names.",
    credentials: [
      { label: "Expedia Hotel ID (EID)", hint: "Numeric property identifier from Expedia Partner Central.", secret: false },
    ],
    steps: [
      { title: "Nominate Channex in Partner Central", detail: "Open Expedia Partner Central → Rooms and Rates → Connectivity settings and select Channex as the connectivity provider." },
      { title: "Wait for the provider link", detail: "Expedia links the property to Channex. You will see the property appear on the Channex side when it completes." },
      { title: "Match the product catalogue", detail: "Expedia exposes room type and rate plan IDs. Map each to a STAYBASE rate plan — names rarely match, so work from the IDs." },
      { title: "Verify per-occupancy pricing", detail: "If you sell per person, confirm the occupancy pricing grid before the first full push." },
    ],
    pitfalls: [
      "Vrbo inventory arrives through the same connection but has different cancellation semantics — check the policy mapping.",
      "Expedia rejects the whole batch when a single rate plan is inactive on their side, so an unnoticed deactivation looks like a total sync failure.",
    ],
    docsUrl: "https://docs.channex.io",
    averageSetupDays: 3,
  },
  {
    slug: "agoda",
    name: "Agoda",
    channexChannel: "Agoda",
    category: "ota",
    commissionRange: [15, 20],
    rateModel: "per_room",
    regions: ["Asia Pacific"],
    summary:
      "Strong in Southeast Asia. Rate categories on Agoda's side are fixed, so a STAYBASE rate plan with no matching Agoda category cannot be mapped at all.",
    credentials: [
      { label: "Agoda Property ID", hint: "Found in Agoda YCS under Property → Property details.", secret: false },
      { label: "YCS API key", hint: "Generated in YCS once Channex is nominated as your provider.", secret: true },
    ],
    steps: [
      { title: "Nominate Channex in YCS", detail: "In Agoda YCS open Connectivity → Channel manager and choose Channex." },
      { title: "Generate the API key", detail: "YCS issues an API key for the connection. Copy it once — it is not shown again." },
      { title: "Align rate categories first", detail: "List the Agoda rate categories available on your property and make sure each STAYBASE rate plan has one to land on. This is where most Agoda setups stall." },
      { title: "Map, push, verify", detail: "Map room types, push a week, and confirm the calendar in YCS." },
    ],
    pitfalls: [
      "A derived rate plan such as Long Stay 7+ often has no Agoda equivalent — either create the category in YCS or leave the plan unmapped deliberately.",
      "Agoda caches availability aggressively; a correction can take several minutes to appear in YCS.",
    ],
    docsUrl: "https://docs.channex.io",
    averageSetupDays: 3,
  },
  {
    slug: "traveloka",
    name: "Traveloka",
    channexChannel: "Traveloka",
    category: "ota",
    commissionRange: [12, 18],
    rateModel: "per_room",
    regions: ["Indonesia", "Southeast Asia"],
    summary:
      "The dominant OTA for Indonesian domestic travel. Onboarding runs through a Traveloka account manager rather than fully self-service.",
    credentials: [
      { label: "Traveloka Hotel ID", hint: "Provided by your Traveloka account manager.", secret: false },
      { label: "Connectivity token", hint: "Issued by Traveloka when the Channex connection is approved.", secret: true },
    ],
    steps: [
      { title: "Ask your account manager to enable connectivity", detail: "Traveloka enables channel-manager access per property. Name Channex as the provider in the request." },
      { title: "Receive the hotel ID and token", detail: "These arrive by email from Traveloka once the property is enabled." },
      { title: "Add the channel and map", detail: "Paste the credentials, map room types, and push a short window." },
      { title: "Confirm IDR rounding", detail: "Traveloka expects whole rupiah. Rates that carry decimals from a derived plan are rounded, which can break parity by a few hundred rupiah." },
    ],
    pitfalls: [
      "Promotions configured inside Traveloka stack on top of the pushed rate — a channel-side promo plus a STAYBASE discount can undercut your floor.",
      "Domestic demand spikes around Indonesian public holidays; make sure min-stay restrictions are pushed before, not after, the pickup.",
    ],
    docsUrl: "https://docs.channex.io",
    averageSetupDays: 5,
  },
  {
    slug: "tiket-com",
    name: "Tiket.com",
    channexChannel: "TiketCom",
    category: "ota",
    commissionRange: [12, 18],
    rateModel: "per_room",
    regions: ["Indonesia"],
    summary:
      "Indonesian OTA with a large domestic base. Similar onboarding to Traveloka and usually connected alongside it.",
    credentials: [
      { label: "Tiket.com Hotel ID", hint: "Provided by the Tiket.com partner team.", secret: false },
      { label: "API credentials", hint: "Issued when connectivity is approved.", secret: true },
    ],
    steps: [
      { title: "Request channel-manager access", detail: "Contact the Tiket.com partner team and nominate Channex." },
      { title: "Add the channel in STAYBASE", detail: "Enter the hotel ID and credentials once approval lands." },
      { title: "Map room types and rate plans", detail: "Map every combination you intend to sell; leave the rest unmapped rather than half-mapped." },
      { title: "Push and verify", detail: "Push 7 days and compare against the Tiket.com extranet." },
    ],
    pitfalls: [
      "Room type names must be recognisable to Indonesian domestic guests — a literal translation of an internal code converts poorly.",
    ],
    docsUrl: "https://docs.channex.io",
    averageSetupDays: 5,
  },
  {
    slug: "trip-com",
    name: "Trip.com",
    channexChannel: "TripCom",
    category: "ota",
    commissionRange: [15, 20],
    rateModel: "per_room",
    regions: ["China", "Asia Pacific", "Global"],
    summary:
      "The main route to Chinese outbound travellers. Content requirements are stricter than most: photos and descriptions are reviewed before the property goes live.",
    credentials: [
      { label: "Trip.com Hotel ID", hint: "Assigned when the property is created on Trip.com.", secret: false },
      { label: "Connection key", hint: "Issued after the Channex connection is approved.", secret: true },
    ],
    steps: [
      { title: "Create or claim the property", detail: "The property must exist on Trip.com and pass content review before connectivity is useful." },
      { title: "Nominate Channex", detail: "Request a channel-manager connection naming Channex as provider." },
      { title: "Map and push", detail: "Map room types, push a short window, then verify on the Trip.com extranet." },
    ],
    pitfalls: [
      "Content review can block go-live even after the connection is technically healthy — a green channel does not mean you are bookable.",
      "Currency conversion happens on Trip.com's side; push in your property currency and let them convert.",
    ],
    docsUrl: "https://docs.channex.io",
    averageSetupDays: 7,
  },
  {
    slug: "google-hotel-ads",
    name: "Google Hotel Ads",
    channexChannel: "GoogleHotelAds",
    category: "metasearch",
    commissionRange: [0, 12],
    rateModel: "per_room",
    regions: ["Global"],
    summary:
      "Metasearch rather than an OTA — it surfaces your direct rate and sends the guest to your booking engine, so the booking arrives as Direct, not as a channel reservation.",
    credentials: [
      { label: "Booking engine URL", hint: "Where Google should send the guest. Must accept dates and occupancy as query parameters.", secret: false },
    ],
    steps: [
      { title: "Connect the booking engine first", detail: "Google Hotel Ads is only worth connecting once your direct booking engine is live, because that is where the booking completes." },
      { title: "Enable the channel in Channex", detail: "Channex pushes your direct rates and availability to Google as a price feed." },
      { title: "Match the direct rate plan", detail: "Map the plan that represents your true direct price. Pushing an OTA rate here creates a parity problem with your own site." },
    ],
    pitfalls: [
      "Bookings appear as Direct in Reports, so the commission column will read zero even though you may be paying Google per click or per stay.",
      "A price mismatch between the feed and the booking engine gets your property demoted quickly.",
    ],
    docsUrl: "https://docs.channex.io",
    averageSetupDays: 4,
  },
  {
    slug: "hostelworld",
    name: "Hostelworld",
    channexChannel: "Hostelworld",
    category: "ota",
    commissionRange: [10, 15],
    rateModel: "per_person",
    regions: ["Global"],
    summary:
      "Sells beds rather than rooms. Only worth connecting if you have dorm inventory modelled as a per-person room type.",
    credentials: [
      { label: "Hostelworld Property ID", hint: "From the Hostelworld Inbox extranet.", secret: false },
      { label: "API key", hint: "Issued when Channex is nominated.", secret: true },
    ],
    steps: [
      { title: "Model dorms correctly", detail: "Create a room type with per-person selling before connecting; mapping a per-room type to a dorm produces wrong prices." },
      { title: "Nominate Channex", detail: "Request the connection from the Hostelworld extranet." },
      { title: "Map beds and push", detail: "Map each dorm to its room type and push a short window." },
    ],
    pitfalls: [
      "Per-person and per-room rate models cannot be mixed inside one mapping — a mismatch silently multiplies or divides the rate by the occupancy.",
    ],
    docsUrl: "https://docs.channex.io",
    averageSetupDays: 3,
  },
];

export function getOta(slug: string): OtaDefinition | undefined {
  return otaCatalog.find((ota) => ota.slug === slug);
}

export const otaCategoryLabels: Record<OtaDefinition["category"], string> = {
  ota: "Online travel agency",
  metasearch: "Metasearch",
  direct: "Direct",
  wholesaler: "Wholesaler",
};
