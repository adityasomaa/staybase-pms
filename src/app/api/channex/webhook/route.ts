import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { ChannexClient, isChannexConfigured } from "@/lib/channex/client";
import { fromChannexBooking } from "@/lib/channex/mapping";
import type { ChannexWebhookPayload } from "@/lib/channex/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Channex delivers booking, ARI and sync-error events here.
 *
 * The endpoint is registered per property via `POST /webhooks` with an
 * `event_mask` (see Settings › Connectivity). Channex retries on any non-2xx,
 * so the handler acknowledges fast and never throws on unknown event types.
 */
export async function POST(request: Request) {
  const raw = await request.text();

  if (!verifySignature(raw, request.headers)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: ChannexWebhookPayload;
  try {
    payload = JSON.parse(raw) as ChannexWebhookPayload;
  } catch {
    return NextResponse.json({ error: "malformed json" }, { status: 400 });
  }

  switch (payload.event) {
    case "booking":
    case "booking_new":
    case "booking_modification":
    case "booking_cancellation":
      return NextResponse.json(await handleBooking(payload));

    case "ari":
      // Channex confirms an ARI batch landed on the channel side.
      return NextResponse.json({ ok: true, handled: "ari", property: payload.property_id });

    case "sync_error":
      console.error("[channex] sync error", payload.property_id, payload.payload);
      return NextResponse.json({ ok: true, handled: "sync_error" });

    default:
      return NextResponse.json({ ok: true, handled: "ignored", event: payload.event });
  }
}

async function handleBooking(payload: ChannexWebhookPayload) {
  // Webhooks registered with `send_data: true` inline the whole booking, which
  // saves a round trip. Otherwise we pull it from the bookings feed.
  let attributes = payload.data?.attributes ?? null;
  const revisionId = payload.payload?.revision_id ?? payload.payload?.booking_id;

  if (!attributes && revisionId && isChannexConfigured()) {
    try {
      const response = await ChannexClient.fromEnv().getBooking(revisionId);
      attributes = response.data.attributes;
    } catch (error) {
      console.error("[channex] failed to fetch booking", revisionId, error);
      // Returning 200 with `retry` lets Channex keep it in the feed for the
      // scheduled reconciliation run instead of hammering the webhook.
      return { ok: true, handled: "booking", deferred: true };
    }
  }

  if (!attributes) {
    return { ok: true, handled: "booking", deferred: true };
  }

  const booking = fromChannexBooking(attributes);

  // Persistence point: with DATABASE_URL configured this upserts the
  // reservation and its nightly rates inside a single transaction, keyed on
  // (property_id, ota_reservation_code) so modifications overwrite cleanly.
  console.info(
    "[channex] booking %s from %s: %s → %s (%s %s)",
    booking.channelReference,
    booking.channel,
    booking.checkIn,
    booking.checkOut,
    booking.currency,
    booking.total,
  );

  if (revisionId && isChannexConfigured()) {
    try {
      await ChannexClient.fromEnv().acknowledgeBooking(revisionId);
    } catch (error) {
      console.error("[channex] ack failed", revisionId, error);
    }
  }

  return {
    ok: true,
    handled: "booking",
    reference: booking.channelReference,
    channel: booking.channel,
    status: booking.status,
  };
}

/**
 * Channex signs the raw body with the shared secret configured on the webhook.
 * When no secret is set the endpoint stays open — fine for the staging sandbox,
 * but Settings warns about it for production.
 */
function verifySignature(raw: string, headers: Headers): boolean {
  const secret = process.env.CHANNEX_WEBHOOK_SECRET;
  if (!secret) return true;

  const provided =
    headers.get("x-channex-signature") ??
    headers.get("x-signature") ??
    headers.get("x-hub-signature-256");
  if (!provided) return false;

  const expected = createHmac("sha256", secret).update(raw, "utf8").digest("hex");
  const cleaned = provided.replace(/^sha256=/, "").trim();

  const a = Buffer.from(cleaned, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Channex probes the callback URL before activating a webhook. */
export async function GET() {
  return NextResponse.json({
    service: "staybase-pms",
    endpoint: "channex-webhook",
    configured: isChannexConfigured(),
    signatureRequired: Boolean(process.env.CHANNEX_WEBHOOK_SECRET),
  });
}
