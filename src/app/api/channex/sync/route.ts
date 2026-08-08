import { NextResponse } from "next/server";
import { z } from "zod";

import { ChannexClient, ChannexError, isChannexConfigured } from "@/lib/channex/client";
import { chunk, toAvailabilityValues, toRestrictionValues } from "@/lib/channex/mapping";
import { addDays } from "@/lib/date";
import { activeProperty, getAriGrid, ratePlans, roomTypes, TODAY } from "@/lib/data/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  days: z.number().int().min(1).max(365).default(30),
  scope: z.enum(["ari", "availability", "restrictions"]).default("ari"),
});

/**
 * Pushes the ARI window to Channex, which fans it out to every mapped channel.
 * Called by the "Sync now" action in the rate calendar and by the scheduled
 * job configured in vercel.json.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { from = TODAY, days, scope } = parsed.data;
  const { rows } = getAriGrid(from, days);
  const cells = rows.flatMap((row) => row.plans.flatMap((plan) => plan.cells));

  const roomTypeIdMap = Object.fromEntries(
    roomTypes.filter((rt) => rt.channexId).map((rt) => [rt.id, rt.channexId!]),
  );
  const ratePlanIdMap = Object.fromEntries(
    ratePlans.filter((rp) => rp.channexId).map((rp) => [rp.id, rp.channexId!]),
  );
  const channexPropertyId = activeProperty.channexId;

  const unmappedRoomTypes = roomTypes.filter((rt) => !rt.channexId).map((rt) => rt.code);
  const unmappedRatePlans = ratePlans.filter((rp) => !rp.channexId).map((rp) => rp.code);

  const availability = channexPropertyId
    ? toAvailabilityValues(cells, { channexPropertyId, roomTypeIdMap })
    : [];
  const restrictions = channexPropertyId
    ? toRestrictionValues(cells, { channexPropertyId, ratePlanIdMap })
    : [];

  const plan = {
    property: activeProperty.code,
    window: { from, to: addDays(from, days - 1), days },
    availabilityValues: availability.length,
    restrictionValues: restrictions.length,
    batches: {
      availability: chunk(availability).length,
      restrictions: chunk(restrictions).length,
    },
    unmappedRoomTypes,
    unmappedRatePlans,
  };

  if (!isChannexConfigured() || !channexPropertyId) {
    // Dry run: the UI still gets an exact preview of what would be sent.
    return NextResponse.json({
      ok: true,
      mode: "dry-run",
      reason: !channexPropertyId
        ? "Property is not registered on Channex yet"
        : "CHANNEX_API_KEY is not configured",
      plan,
    });
  }

  const client = ChannexClient.fromEnv();
  const started = Date.now();
  try {
    if (scope !== "restrictions") {
      for (const batch of chunk(availability)) await client.updateAvailability(batch);
    }
    if (scope !== "availability") {
      for (const batch of chunk(restrictions)) await client.updateRestrictions(batch);
    }
  } catch (error) {
    const status = error instanceof ChannexError ? error.status || 502 : 502;
    return NextResponse.json(
      {
        ok: false,
        mode: "live",
        error: error instanceof Error ? error.message : "sync failed",
        plan,
      },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    mode: "live",
    durationMs: Date.now() - started,
    plan,
  });
}
