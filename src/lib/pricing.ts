import { diffDays, parseISODate } from "@/lib/date";
import type {
  ISODate,
  PriceSuggestion,
  PricingGuardrail,
  PricingRule,
} from "@/lib/types";

export interface PricingInput {
  date: ISODate;
  roomTypeId: string;
  ratePlanId: string;
  currentRate: number;
  /** 0–1 for the room type on this date. */
  occupancy: number;
  /** Nights until the gap on either side closes; Infinity when not an orphan. */
  gapNights: number;
  /** Market reference rate, when a rate-shopper feed is connected. */
  competitorRate?: number;
}

/**
 * Turns the enabled rules into one suggested rate per date.
 *
 * Rules compound in priority order — each is applied to the running rate, not
 * to the original — and guardrails clamp the result afterwards. Compounding is
 * the behaviour revenue managers expect from a rule stack, and clamping last is
 * what stops a demand spike from doubling a rate overnight.
 */
export function suggestPrice(
  input: PricingInput,
  rules: PricingRule[],
  guardrail: PricingGuardrail | undefined,
  today: ISODate,
): PriceSuggestion {
  const leadDays = diffDays(today, input.date);
  const dow = parseISODate(input.date).getUTCDay();

  const applicable = rules
    .filter((rule) => rule.enabled)
    .filter((rule) => rule.roomTypeIds.length === 0 || rule.roomTypeIds.includes(input.roomTypeId))
    .filter((rule) => matches(rule, { ...input, leadDays, dow }))
    .sort((a, b) => a.priority - b.priority);

  let rate = input.currentRate;
  const appliedRules: PriceSuggestion["appliedRules"] = [];

  for (const rule of applicable) {
    const before = rate;
    rate = applyAdjustment(rate, rule, input);
    if (Math.round(rate) !== Math.round(before)) {
      appliedRules.push({ id: rule.id, name: rule.name, effect: rate - before });
    }
  }

  let clampedBy: PriceSuggestion["clampedBy"] = null;
  if (guardrail) {
    const maxMove = (input.currentRate * guardrail.maxDailyMovePct) / 100;
    if (Math.abs(rate - input.currentRate) > maxMove) {
      rate = input.currentRate + Math.sign(rate - input.currentRate) * maxMove;
      clampedBy = "daily_move";
    }
    if (rate < guardrail.floor) {
      rate = guardrail.floor;
      clampedBy = "floor";
    } else if (rate > guardrail.ceiling) {
      rate = guardrail.ceiling;
      clampedBy = "ceiling";
    }
  }

  // Channels round to whole currency units; rounding here keeps the suggestion
  // identical to what will actually be sold.
  const suggestedRate = Math.round(rate / 10_000) * 10_000;

  return {
    date: input.date,
    roomTypeId: input.roomTypeId,
    ratePlanId: input.ratePlanId,
    currentRate: input.currentRate,
    suggestedRate,
    deltaPct:
      input.currentRate === 0
        ? 0
        : Number((((suggestedRate - input.currentRate) / input.currentRate) * 100).toFixed(1)),
    occupancy: Number((input.occupancy * 100).toFixed(1)),
    leadDays,
    appliedRules,
    clampedBy,
  };
}

function matches(
  rule: PricingRule,
  ctx: PricingInput & { leadDays: number; dow: number },
): boolean {
  const c = rule.condition;
  switch (c.kind) {
    case "occupancy":
      return ctx.occupancy >= c.minOccupancy && ctx.occupancy < c.maxOccupancy;
    case "lead_time":
      return ctx.leadDays >= c.minDays && ctx.leadDays <= c.maxDays;
    case "day_of_week":
      return c.days.includes(ctx.dow);
    case "orphan_gap":
      return ctx.gapNights > 0 && ctx.gapNights <= c.maxGapNights;
    case "length_of_stay":
      return true; // Evaluated per booking request, not per date.
    case "competitor":
      if (ctx.competitorRate === undefined) return false;
      return c.direction === "below"
        ? ctx.currentRate < ctx.competitorRate
        : ctx.currentRate > ctx.competitorRate;
    default:
      return false;
  }
}

function applyAdjustment(rate: number, rule: PricingRule, input: PricingInput): number {
  switch (rule.adjustment.type) {
    case "percent":
      return rate * (1 + rule.adjustment.value / 100);
    case "amount":
      return rate + rule.adjustment.value;
    case "target":
      // Move a share of the way towards the market reference rather than
      // matching it outright — matching exactly starts a race to the bottom.
      if (input.competitorRate === undefined) return rate;
      return rate + (input.competitorRate - rate) * (rule.adjustment.value / 100);
    default:
      return rate;
  }
}

export const ruleKindLabels: Record<PricingRule["kind"], string> = {
  occupancy: "Occupancy",
  lead_time: "Lead time",
  day_of_week: "Day of week",
  orphan_gap: "Orphan gap",
  length_of_stay: "Length of stay",
  competitor: "Market position",
};

export function describeAdjustment(adjustment: PricingRule["adjustment"]): string {
  switch (adjustment.type) {
    case "percent":
      return `${adjustment.value > 0 ? "+" : ""}${adjustment.value}%`;
    case "amount":
      return `${adjustment.value > 0 ? "+" : ""}${adjustment.value.toLocaleString()}`;
    case "target":
      return `${adjustment.value}% towards market`;
  }
}
