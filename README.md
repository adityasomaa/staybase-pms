# STAYBASE

A property management system for independent hotels, villas and small groups —
built the way Book and Link works, with **Channex** as the connectivity provider.

STAYBASE owns the reservation ledger, the rate and availability grid, the front
desk and housekeeping. Channex owns the last mile to Booking.com, Airbnb,
Expedia, Agoda, Traveloka and the rest: STAYBASE pushes ARI in batches and
receives bookings back over a signed webhook.

**Live:** https://staybase-pms.vercel.app

---

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) + React 19 | Server Components keep the 900-reservation dataset on the server; only the interactive grids ship to the browser |
| Language | TypeScript (strict) | The ARI grid and the Channex payloads are where a type error becomes a rate-parity incident |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix) | Token-driven theme, light/dark from one palette, no runtime CSS-in-JS |
| Charts | Recharts via the shadcn chart wrapper | Themeable through the same CSS variables as the rest of the UI |
| Data | Drizzle ORM + Postgres | Typed schema, SQL you can read, migrations in the repo |
| Validation | Zod | One schema for the sync API route |
| Hosting | Vercel (`sin1`) | Serverless functions in the same region as the properties |

The app runs with **zero infrastructure**: without `DATABASE_URL` it serves a
deterministic demo dataset, and without `CHANNEX_API_KEY` every push becomes a
dry run that reports exactly what *would* be sent.

---

## Modules

| Route | What it does |
| --- | --- |
| `/dashboard` | Occupancy, ADR, RevPAR and revenue with month-over-month deltas, a 60-day performance chart, channel mix, 14-day forecast and today's desk summary |
| `/calendar` | The ARI grid — room types × dates, one line per rate plan. Edit rate, min-stay and stop-sell inline; changes stage locally and push to Channex in one batch |
| `/planner` | Room-by-room booking timeline. Click a stay to inspect it, take payment or check in without leaving the calendar; click empty track to block a room for maintenance |
| `/reservations` | Full booking ledger with search, status/channel filters, sorting and CSV export |
| `/reservations/[id]` | Stay details, nightly rate breakdown as delivered by the channel, guest profile and a folio with commission and net-to-hotel |
| `/reservations/new` | Direct and walk-in booking with a live quote |
| `/front-desk` | Arrivals, departures and in-house, with unassigned-room warnings and outstanding balances |
| `/housekeeping` | Room status board, attendant filter, departure prioritisation. Out-of-order rooms are withheld from channels |
| `/guests` | Guest directory ranked by lifetime value, repeat rate and source markets |
| `/channels` | Channex connection health, mapping coverage, sync journal, and an add-channel flow covering nine OTAs |
| `/channels/connect/[ota]` | Per-OTA setup guide: required credentials, ordered steps, and the failure modes specific to that channel |
| `/inventory` | Room types, rooms and rate plans, with creation flows for all three |
| `/pricing` | Dynamic pricing rules, live preview and per-room-type guardrails |
| `/reports` | Channel profitability net of commission, booking-window pace, room-type production |
| `/users` | Invite teammates, set roles, and scope which properties each one can reach |
| `/billing` | Subscription, invoices, payment method, and the suspension policy |
| `/help` | Tutorial library, indexed by global search |
| `/settings` | Connectivity status, webhook registration details and environment variable checklist |

### Cross-cutting behaviour

**Global search (⌘K)** runs server-side at `/api/search`, so it reaches the
whole reservation ledger rather than the slice the current page happened to
load. It indexes reservations, OTA codes, guests, rooms, rate plans, channels,
every page, every tutorial and a set of quick actions. Query scoring drops
stopwords and rewards vocabulary coverage, which is what lets a typed question
("how do I block a room") land on the guide that answers it. Enter always
follows the top result.

**Dynamic pricing** evaluates enabled rules in priority order, each applied to
the running rate rather than the original — so a 15% occupancy uplift followed
by a 10% weekend uplift gives 26.5%, not 25%. Guardrails (floor, ceiling,
maximum daily movement) clamp afterwards and the suggestion reports which bound
clamped it. The engine is a pure function shared by server and browser, so
toggling a rule re-prices instantly with no second implementation to drift.

**Billing enforcement** warns while an invoice is past due, then locks the
workspace once the grace period expires. Suspension pauses outbound pushes and
locks the UI, but the Channex webhook keeps accepting reservations — dropping a
guest's booking over an unpaid invoice punishes the wrong person, and it means
nothing needs re-syncing after payment.

**Access control** is two independent dimensions: a role decides what someone
may do, a property assignment decides where. A manager scoped to one property
cannot see the others at all.

**First-run tour** covers the six things that are otherwise learned the hard
way. The completion flag is a cookie, so it survives a new tab, and it can be
replayed from Help & Tutorials.

---

## Channex integration

Everything lives under `src/lib/channex/` and `src/app/api/channex/`.

### Outbound — ARI push

`POST /api/channex/sync` builds the payload from the ARI grid and sends it:

- **Availability** is per *room type* and per date, so the per-plan grid is
  collapsed before sending (`toAvailabilityValues`).
- **Rates and restrictions** are per *rate plan*: rate, min-stay-arrival,
  min-stay-through, max-stay, CTA, CTD and stop-sell (`toRestrictionValues`).
- Values are chunked at 500 per request, which is the Channex batch limit.
- Room types and rate plans without a `channexId` are skipped and reported back
  so the operator sees what did not go out — silent skipping is how parity
  breaks.
- Without an API key the route returns `mode: "dry-run"` with the exact batch
  counts instead of failing.

`GET /api/channex/sync` is the same push over a 90-day window, wired to a
nightly Vercel cron. Channels drift — a rejected batch, a channel-side outage or
a manual edit in an extranet all leave an OTA out of step — so re-pushing the
full window once a night makes that self-healing. Protect it with `CRON_SECRET`.

### Inbound — booking webhook

`POST /api/channex/webhook` handles `booking`, `booking_new`,
`booking_modification`, `booking_cancellation`, `ari` and `sync_error`.

- The raw body is verified against `CHANNEX_WEBHOOK_SECRET` with HMAC-SHA256
  and a constant-time compare before anything is parsed.
- Webhooks registered with `send_data: true` inline the booking, which removes a
  round trip per reservation; otherwise the handler pulls it from the feed.
- Bookings are acknowledged back to Channex so they leave the unprocessed feed.
- Unknown event types return 200 — Channex retries on any non-2xx, and an
  unrecognised event is not a failure.

### Rate plan derivation

Derived plans (`Non-Refundable` at −12%, `Long Stay 7+` at −18%) map onto the
Channex `rate_mode: "derived"` model with `parent_rate_plan_id` and inherited
restrictions, so the offset is computed by Channex rather than duplicated in
every push.

---

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000 — it redirects to the dashboard and works
immediately on the bundled dataset.

### Going live

1. Add `CHANNEX_API_KEY` (and `CHANNEX_BASE_URL` for production).
2. Add `CHANNEX_WEBHOOK_SECRET`, then register the webhook:

   ```
   POST /webhooks
   {
     "webhook": {
       "property_id": "<channex property uuid>",
       "callback_url": "https://staybase-pms.vercel.app/api/channex/webhook",
       "event_mask": "booking,sync_error",
       "request_type": "json",
       "send_data": true,
       "is_active": true
     }
   }
   ```

3. Add `DATABASE_URL` and run `npm run db:push` to move off the demo dataset.

### Scripts

```bash
npm run dev          # Turbopack dev server
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run db:push      # apply the Drizzle schema
npm run db:studio    # browse the database
```

---

## Project layout

```
src/
  app/
    (app)/           route group carrying the sidebar shell
    api/channex/     sync + webhook endpoints
    api/search/      global search
    api/health/      readiness probe
    actions.ts       billing + tour server actions
  components/
    ui/              shadcn/ui primitives
    calendar/        the ARI grid
    planner/         room-by-room booking timeline
    pricing/         dynamic pricing workbench
    billing/         payment flow and the suspension lock screen
    users/           directory, invites, property scoping
    dashboard/       KPI charts
    ...
  db/                Drizzle schema + lazy client
  lib/
    channex/         API client, payload types, PMS ⇄ Channex mapping
    ota/catalog.ts   the nine OTAs and their setup guides
    help/articles.ts the tutorial library (also the search index)
    pricing.ts       the rule engine — pure, shared by server and client
    data/            demo dataset + the query layer pages call
    date.ts          UTC-anchored date maths (the grid must not drift a day)
    format.ts        money, percent, channel and status tokens
    workspace.ts     cookie-backed billing lock and tour flag
```

## Verification

Screenshots were unavailable in the environment this was built in, so layout
was verified geometrically instead: a headless pass over all 18 routes at
1440 / 1024 / 768 / 390px, asserting no horizontal overflow, no clipped text
and no overlapping siblings. That pass is what caught the nested `<main>`
(shadcn's `SidebarInset` already renders one), the ARI date header sticking to
the page rather than its own scroller, and a legend that overflowed its card
only between 1024 and 1280px. Behaviour is covered by a 20-assertion headless
run over the tour, search, planner, blocks, billing lock, invites, inventory
and pricing.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `CHANNEX_API_KEY` | for live sync | Channex user API key |
| `CHANNEX_BASE_URL` | no | Defaults to the staging sandbox |
| `CHANNEX_WEBHOOK_SECRET` | recommended | HMAC verification for inbound webhooks |
| `CHANNEX_TIMEOUT_MS` | no | Request timeout, default 15000 |
| `DATABASE_URL` | no | Postgres; omit to use the demo dataset |
| `CRON_SECRET` | recommended | Bearer token guarding the nightly resync endpoint |
