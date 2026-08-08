import type { ChannelCode, Currency } from "@/lib/types";

const currencyFractionDigits: Record<Currency, number> = {
  IDR: 0,
  USD: 2,
  EUR: 2,
  SGD: 2,
  AUD: 2,
};

export function formatMoney(amount: number, currency: Currency = "IDR"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: currencyFractionDigits[currency],
    maximumFractionDigits: currencyFractionDigits[currency],
  }).format(amount);
}

/** Compact money for KPI tiles — "Rp 1.2B" reads better than 13 digits. */
export function formatMoneyCompact(amount: number, currency: Currency = "IDR"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatPercent(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export function formatDelta(n: number, digits = 1): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

export const channelLabels: Record<ChannelCode, string> = {
  booking_com: "Booking.com",
  airbnb: "Airbnb",
  expedia: "Expedia",
  agoda: "Agoda",
  traveloka: "Traveloka",
  tiket_com: "Tiket.com",
  direct: "Direct",
  walk_in: "Walk-in",
};

/** Tailwind classes keyed by channel — keeps channel identity consistent. */
export const channelTone: Record<ChannelCode, string> = {
  booking_com: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  airbnb: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  expedia: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  agoda: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  traveloka: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  tiket_com: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  direct: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  walk_in: "bg-muted text-muted-foreground border-border",
};

export const statusLabels: Record<string, string> = {
  confirmed: "Confirmed",
  tentative: "Tentative",
  in_house: "In house",
  checked_out: "Checked out",
  cancelled: "Cancelled",
  no_show: "No show",
  unpaid: "Unpaid",
  partial: "Partial",
  paid: "Paid",
  refunded: "Refunded",
  clean: "Clean",
  dirty: "Dirty",
  inspected: "Inspected",
  out_of_order: "Out of order",
};

export const statusTone: Record<string, string> = {
  confirmed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  tentative: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  in_house: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  checked_out: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  no_show: "bg-destructive/10 text-destructive border-destructive/20",
  unpaid: "bg-destructive/10 text-destructive border-destructive/20",
  partial: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  paid: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  refunded: "bg-muted text-muted-foreground border-border",
  clean: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  dirty: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  inspected: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  out_of_order: "bg-destructive/10 text-destructive border-destructive/20",
};

export const mealPlanLabels: Record<string, string> = {
  room_only: "Room only",
  breakfast: "Breakfast included",
  half_board: "Half board",
  full_board: "Full board",
};

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
