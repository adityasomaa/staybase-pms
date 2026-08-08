"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { BILLING_COOKIE, TOUR_COOKIE } from "@/lib/workspace";

const YEAR = 60 * 60 * 24 * 365;

/**
 * Billing enforcement.
 *
 * Suspension deliberately locks only the UI and outbound pushes. The Channex
 * webhook keeps accepting reservations, because dropping a guest's booking
 * over an unpaid invoice punishes the wrong person.
 */
export async function suspendWorkspace() {
  const store = await cookies();
  store.set(BILLING_COOKIE, "suspended", { path: "/", maxAge: YEAR, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function restoreWorkspace() {
  const store = await cookies();
  store.set(BILLING_COOKIE, "active", { path: "/", maxAge: YEAR, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function completeTour() {
  const store = await cookies();
  store.set(TOUR_COOKIE, "done", { path: "/", maxAge: YEAR, sameSite: "lax" });
}

export async function resetTour() {
  const store = await cookies();
  store.delete(TOUR_COOKIE);
  revalidatePath("/", "layout");
}
