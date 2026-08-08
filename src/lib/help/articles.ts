import type { HelpArticle, HelpCategory } from "@/lib/types";

export const helpCategoryLabels: Record<HelpCategory, string> = {
  getting_started: "Getting started",
  rates: "Rates & availability",
  reservations: "Reservations",
  channels: "Channels & Channex",
  billing: "Billing",
  users: "Users & access",
  pricing: "Dynamic pricing",
};

/**
 * The in-app tutorial library. Everything here is indexed by global search, so
 * a question typed into ⌘K finds the answer rather than only a page name.
 */
export const helpArticles: HelpArticle[] = [
  {
    slug: "how-staybase-fits-together",
    title: "How STAYBASE fits together",
    category: "getting_started",
    summary:
      "The four objects everything else is built on, and why the order matters.",
    minutes: 4,
    keywords: ["overview", "concepts", "model", "start", "basics", "room type", "rate plan"],
    body: [
      {
        heading: "Four objects, in order",
        paragraphs: [
          "A property holds room types. A room type holds physical rooms and one or more rate plans. A rate plan holds a price and restrictions for each date. Everything else — reservations, reports, channel pushes — reads from those four.",
          "The order matters because you cannot map a channel until rate plans exist, and you cannot sell a rate plan until its room type has rooms.",
        ],
        steps: [
          "Create room types under Inventory, with the real number of sellable rooms.",
          "Add the physical rooms so the front desk can assign them.",
          "Add at least one rate plan per room type — usually a Best Available Rate.",
          "Open Rates & Availability and set prices for the next 60 days.",
          "Connect a channel and map every room type and rate plan you intend to sell.",
        ],
      },
      {
        heading: "Where the numbers come from",
        paragraphs: [
          "Occupancy, ADR and RevPAR on the dashboard are derived from reservations, not entered anywhere. If a figure looks wrong, the reservation data behind it is wrong — start at the Reservations ledger, not the dashboard.",
        ],
      },
    ],
  },
  {
    slug: "reading-the-ari-grid",
    title: "Reading and editing the ARI grid",
    category: "rates",
    summary:
      "Rates, inventory and restrictions in one grid — and why edits stage before they push.",
    minutes: 5,
    keywords: ["ari", "calendar", "rates", "availability", "restrictions", "min stay", "stop sell", "grid"],
    body: [
      {
        heading: "What each row means",
        paragraphs: [
          "The first row under a room type is availability: rooms free out of total allotment. It is shared by every rate plan beneath it, because availability belongs to the room type, not to a price.",
          "Each row below is a rate plan. The number is the nightly rate; the small line underneath shows the minimum stay, or 'stop sell' when the date is closed.",
        ],
      },
      {
        heading: "Staging and pushing",
        paragraphs: [
          "Editing a cell stages the change locally and outlines it. Nothing leaves STAYBASE until you press Save & push.",
          "That is deliberate. A push is a rate-limited call and a half-finished push is exactly how rate parity incidents start — it is safer to rework a whole week and send it once.",
        ],
        steps: [
          "Click a cell to open rate, minimum stay and stop sell.",
          "Repeat across the dates you want to change; the pending counter tracks them.",
          "Press Save & push to send the whole batch, or Discard to drop it.",
        ],
      },
      {
        heading: "Amber warning triangles",
        paragraphs: [
          "A triangle next to a room type or rate plan means it has no Channex identifier. Those rows are skipped when you push — deliberately, and the sync result tells you which ones were skipped so it never happens silently.",
        ],
      },
    ],
  },
  {
    slug: "booking-calendar-and-blocks",
    title: "Managing stays on the booking calendar",
    category: "reservations",
    summary:
      "Move, inspect and block rooms from the room-by-room timeline.",
    minutes: 4,
    keywords: ["planner", "timeline", "tape chart", "block", "maintenance", "move room", "assign"],
    body: [
      {
        heading: "One row per room",
        paragraphs: [
          "The booking calendar shows physical rooms down the side and dates across the top, so a gap on screen is a genuinely empty room rather than an aggregate number.",
          "Each bar is a stay. Click it to open the full reservation, assign a room, or take a payment without leaving the calendar.",
        ],
      },
      {
        heading: "Blocking a room",
        paragraphs: [
          "Blocking removes a room from sale for a date range and pushes the reduced availability to every connected channel on the next sync.",
        ],
        steps: [
          "Click any empty cell on the room's row, or use Block room.",
          "Pick the date range and a reason — maintenance, renovation, deep clean, owner use or quarantine.",
          "Save. The room is struck out on the calendar and excluded from availability.",
        ],
      },
      {
        heading: "Blocks and overbooking",
        paragraphs: [
          "A block reduces sellable inventory immediately, but channels only learn about it on the next push. If the block is urgent, sync straight after saving rather than waiting for the nightly job.",
        ],
      },
    ],
  },
  {
    slug: "connect-an-ota",
    title: "Connecting an OTA through Channex",
    category: "channels",
    summary:
      "The shape every channel connection follows, and the two steps people skip.",
    minutes: 6,
    keywords: ["ota", "channel", "connect", "booking.com", "airbnb", "expedia", "agoda", "mapping", "channex"],
    body: [
      {
        heading: "The shape is always the same",
        paragraphs: [
          "Whichever OTA you are connecting, the sequence is: request connectivity in the OTA's own extranet, nominate Channex as your provider, receive an identifier and usually a secret, then map room types and rate plans.",
          "STAYBASE never talks to the OTA directly. It talks to Channex, and Channex fans out.",
        ],
        steps: [
          "Open Channels and press Add channel.",
          "Pick the OTA and follow its specific guide — the credentials and the extranet path differ per channel.",
          "Paste the identifiers, save, then map every room type and rate plan.",
          "Push seven days first and compare against the OTA extranet before widening the window.",
        ],
      },
      {
        heading: "The two steps people skip",
        paragraphs: [
          "First, mapping. A channel can show as connected while half its room types point nowhere, and those simply never receive rates.",
          "Second, the short verification push. Pushing a year on day one means a mapping mistake is spread across 365 dates before anyone notices.",
        ],
      },
    ],
  },
  {
    slug: "dynamic-pricing-rules",
    title: "How dynamic pricing decides a rate",
    category: "pricing",
    summary:
      "Rules compound in priority order, then guardrails clamp the result.",
    minutes: 6,
    keywords: ["dynamic pricing", "revenue", "yield", "rules", "occupancy", "lead time", "guardrail", "floor", "ceiling"],
    body: [
      {
        heading: "Rules compound, they do not compete",
        paragraphs: [
          "Each enabled rule is evaluated in priority order against the base rate already produced by the rules before it. An occupancy uplift of 15% followed by a weekend uplift of 10% gives 26.5%, not 25%.",
          "That is why priority matters: a percentage rule late in the chain is applied to a bigger number.",
        ],
      },
      {
        heading: "Guardrails always win",
        paragraphs: [
          "Every room type has a floor, a ceiling and a maximum daily movement. After the rules have run, the result is clamped to those bounds, and the suggestion tells you which bound clamped it.",
          "The maximum daily movement exists to stop a demand spike from doubling a rate overnight, which channels treat as suspicious and guests remember.",
        ],
        steps: [
          "Set the floor and ceiling per room type before enabling any rule.",
          "Enable one rule at a time and read the preview.",
          "Apply to the calendar when the suggestions look right — they stage like any other edit, so nothing reaches a channel until you push.",
        ],
      },
    ],
  },
  {
    slug: "invite-a-user",
    title: "Inviting a user and scoping properties",
    category: "users",
    summary: "Roles decide what someone can do; property assignment decides where.",
    minutes: 3,
    keywords: ["user", "invite", "role", "permission", "access", "property", "assign", "team"],
    body: [
      {
        heading: "Two independent dimensions",
        paragraphs: [
          "A role decides which actions someone can take. A property assignment decides which properties those actions apply to. They are independent: a manager scoped to one property cannot see the others at all.",
          "Owners are the exception — they always see every property, and the assignment control is disabled for them.",
        ],
        steps: [
          "Open Users and press Invite user.",
          "Enter the email and pick the role.",
          "Tick the properties they should reach.",
          "Send. The invite stays pending until they accept, and a pending user can be revoked with no side effects.",
        ],
      },
      {
        heading: "Choosing a role",
        paragraphs: [
          "Front desk covers arrivals, departures and folios. Housekeeping sees only the room board. Revenue manager reaches rates and pricing but not billing. Accountant reaches billing and reports but not operations.",
        ],
      },
    ],
  },
  {
    slug: "billing-and-suspension",
    title: "Billing, invoices and what suspension does",
    category: "billing",
    summary:
      "How the subscription is priced, and exactly what stops working when an invoice goes unpaid.",
    minutes: 4,
    keywords: ["billing", "invoice", "payment", "subscription", "suspend", "plan", "past due", "card"],
    body: [
      {
        heading: "How it is priced",
        paragraphs: [
          "The subscription is billed monthly on the number of sellable rooms across every property, with a minimum monthly charge per plan. Adding rooms mid-cycle is prorated on the next invoice.",
        ],
      },
      {
        heading: "What suspension actually does",
        paragraphs: [
          "An invoice that passes its due date moves to past due and the workspace shows a warning. After the grace period the workspace is suspended.",
          "Suspension locks the app to the billing page. It deliberately does not stop the Channex webhook — inbound bookings keep being accepted, because losing reservations would punish your guests for an unpaid invoice. Outbound rate and availability pushes do stop.",
        ],
        steps: [
          "Open Billing to see the outstanding invoice and the grace deadline.",
          "Pay the invoice, or update the card if the failure was a declined charge.",
          "Access is restored immediately on payment; no re-sync is needed because inbound never stopped.",
        ],
      },
    ],
  },
  {
    slug: "search-anything",
    title: "Finding anything with search",
    category: "getting_started",
    summary: "One box for reservations, guests, rooms, settings and these articles.",
    minutes: 2,
    keywords: ["search", "command", "shortcut", "find", "cmd k", "palette"],
    body: [
      {
        heading: "Press ⌘K anywhere",
        paragraphs: [
          "Search covers reservation references and OTA codes, guest names and emails, room numbers, rate plans, channels, every page in the app, and every article in this help library.",
          "It runs on the server, so it searches the whole reservation ledger rather than only what the current page happens to have loaded.",
        ],
        steps: [
          "Press ⌘K, or Ctrl+K on Windows.",
          "Type a reference like SB-24021, a guest name, a room number, or a question like 'how do I block a room'.",
          "Press Enter to jump straight to the top result.",
        ],
      },
    ],
  },
  {
    slug: "overbooking-and-availability",
    title: "Why availability and channels disagree",
    category: "channels",
    summary: "The three usual causes, in the order worth checking.",
    minutes: 5,
    keywords: ["overbooking", "availability", "mismatch", "sync", "parity", "troubleshoot", "error"],
    body: [
      {
        heading: "Check in this order",
        paragraphs: [
          "Most disagreements are one of three things, and checking them in this order is faster than reading logs.",
        ],
        steps: [
          "Mapping — open Channels and look for a room type mapped to fewer channels than the others.",
          "Rejected pushes — the sync journal shows which batches were rejected and why. A rejected batch means the channel is running on stale data.",
          "Blocks and out-of-order rooms — these reduce sellable inventory locally the moment they are saved, but a channel only learns about them on the next push.",
        ],
      },
      {
        heading: "The nightly resync",
        paragraphs: [
          "STAYBASE re-pushes the full 90 day window once a night. Most drift heals itself by morning, so an isolated mismatch late in the day is worth watching before it is worth escalating.",
        ],
      },
    ],
  },
  {
    slug: "derived-rate-plans",
    title: "Derived rate plans and where they break",
    category: "rates",
    summary: "One price to maintain instead of four — until a channel has no matching category.",
    minutes: 4,
    keywords: ["derived", "rate plan", "non-refundable", "offset", "parent", "linked"],
    body: [
      {
        heading: "Why derive",
        paragraphs: [
          "A derived plan is expressed as an offset from a parent — Non-Refundable at minus 12% of the Best Available Rate, for example. You maintain one price and the rest follow.",
          "Channex is told about the derivation, so the offset is computed on their side rather than being duplicated in every push. That keeps the two systems from drifting apart.",
        ],
      },
      {
        heading: "Where it breaks",
        paragraphs: [
          "Some channels have a fixed catalogue of rate categories. If your derived plan has no matching category on that channel, it cannot be mapped — the plan is simply not sellable there.",
          "That is a business decision, not a bug: either create the category in the channel's extranet, or accept that the plan is direct-only and leave it unmapped deliberately.",
        ],
      },
    ],
  },
];

export function getArticle(slug: string): HelpArticle | undefined {
  return helpArticles.find((article) => article.slug === slug);
}
