import "server-only";

import { cookies } from "next/headers";

/**
 * Workspace-level state that outlives a request but has no database behind it
 * in the demo build: whether billing has locked the workspace, and whether the
 * operator has finished the first-run tour.
 *
 * Cookies rather than module state, because serverless instances are not
 * shared and a toggle that silently reverted would be worse than no toggle.
 */
export const BILLING_COOKIE = "staybase_billing";
export const TOUR_COOKIE = "staybase_tour";

export type BillingState = "active" | "suspended";

export async function getBillingState(): Promise<BillingState> {
  const store = await cookies();
  return store.get(BILLING_COOKIE)?.value === "suspended" ? "suspended" : "active";
}

export async function hasSeenTour(): Promise<boolean> {
  const store = await cookies();
  return store.get(TOUR_COOKIE)?.value === "done";
}
