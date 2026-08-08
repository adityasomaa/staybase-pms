import { NextResponse } from "next/server";

import { searchEverything } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

/**
 * Global search.
 *
 * Runs on the server so a query reaches the whole reservation ledger rather
 * than only the slice the current page happened to send to the browser.
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  if (query.trim().length === 0) {
    return NextResponse.json({ query, results: [] });
  }
  return NextResponse.json({ query, results: searchEverything(query, 24) });
}
