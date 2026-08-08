import type { ISODate } from "@/lib/types";

/** All PMS date math is UTC-anchored so the ARI grid never drifts by a day. */
export function toISODate(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

export function parseISODate(d: ISODate): Date {
  return new Date(`${d}T00:00:00.000Z`);
}

export function addDays(d: ISODate, days: number): ISODate {
  const date = parseISODate(d);
  date.setUTCDate(date.getUTCDate() + days);
  return toISODate(date);
}

export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((parseISODate(to).getTime() - parseISODate(from).getTime()) / 86_400_000);
}

export function eachDay(from: ISODate, count: number): ISODate[] {
  return Array.from({ length: count }, (_, i) => addDays(from, i));
}

export function isWeekend(d: ISODate): boolean {
  const dow = parseISODate(d).getUTCDay();
  return dow === 0 || dow === 6;
}

export function dayLabel(d: ISODate): string {
  return parseISODate(d).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
}

export function dayNumber(d: ISODate): string {
  return String(parseISODate(d).getUTCDate());
}

export function monthLabel(d: ISODate): string {
  return parseISODate(d).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDate(d: ISODate): string {
  return parseISODate(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateShort(d: ISODate): string {
  return parseISODate(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const delta = (new Date(iso).getTime() - now.getTime()) / 1000;
  const abs = Math.abs(delta);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["second", 60],
    ["minute", 3600],
    ["hour", 86_400],
    ["day", 604_800],
    ["week", 2_629_800],
    ["month", 31_557_600],
  ];
  const fmt = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  let prev = 1;
  for (const [unit, limit] of units) {
    if (abs < limit) return fmt.format(Math.round(delta / prev), unit);
    prev = limit;
  }
  return fmt.format(Math.round(delta / 31_557_600), "year");
}
