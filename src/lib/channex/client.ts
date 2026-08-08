import "server-only";

import type {
  ChannexAvailabilityValue,
  ChannexBookingAttributes,
  ChannexChannelAttributes,
  ChannexErrorBody,
  ChannexList,
  ChannexPropertyAttributes,
  ChannexRatePlanAttributes,
  ChannexRestrictionValue,
  ChannexRoomTypeAttributes,
  ChannexSingle,
} from "@/lib/channex/types";

export class ChannexError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: ChannexErrorBody,
  ) {
    super(message);
    this.name = "ChannexError";
  }
}

export interface ChannexConfig {
  apiKey: string;
  /** Staging: https://staging.channex.io/api/v1 — Production: https://app.channex.io/api/v1 */
  baseUrl: string;
  /** Aborts a request that Channex has not answered in time. */
  timeoutMs: number;
}

export function readChannexConfig(): ChannexConfig | null {
  const apiKey = process.env.CHANNEX_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: process.env.CHANNEX_BASE_URL ?? "https://staging.channex.io/api/v1",
    timeoutMs: Number(process.env.CHANNEX_TIMEOUT_MS ?? 15_000),
  };
}

export function isChannexConfigured(): boolean {
  return readChannexConfig() !== null;
}

type QueryValue = string | number | boolean | undefined;

function buildQuery(params?: Record<string, QueryValue>): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Thin typed wrapper over the Channex REST API.
 *
 * Every write goes through here so that retries, error translation and the
 * sync journal stay in one place instead of being sprinkled across routes.
 */
export class ChannexClient {
  constructor(private readonly config: ChannexConfig) {}

  static fromEnv(): ChannexClient {
    const config = readChannexConfig();
    if (!config) {
      throw new ChannexError(
        "CHANNEX_API_KEY is not set — add it in Settings › Connectivity before syncing.",
        503,
      );
    }
    return new ChannexClient(config);
  }

  private async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    options: { body?: unknown; query?: Record<string, QueryValue>; retries?: number } = {},
  ): Promise<T> {
    const { body, query, retries = 2 } = options;
    const url = `${this.config.baseUrl}${path}${buildQuery(query)}`;

    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
      try {
        const res = await fetch(url, {
          method,
          headers: {
            "user-api-key": this.config.apiKey,
            "content-type": "application/json",
            accept: "application/json",
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
          cache: "no-store",
        });

        if (res.status === 429 || res.status >= 500) {
          // Channex rate limits per API key; back off and retry.
          if (attempt < retries) {
            await sleep(2 ** attempt * 500);
            continue;
          }
        }

        const text = await res.text();
        const json = text ? (JSON.parse(text) as unknown) : ({} as unknown);

        if (!res.ok) {
          const errorBody = json as ChannexErrorBody;
          throw new ChannexError(
            errorBody.errors?.title ?? `Channex responded ${res.status}`,
            res.status,
            errorBody,
          );
        }
        return json as T;
      } catch (error) {
        lastError = error;
        if (error instanceof ChannexError) throw error;
        if (attempt >= retries) break;
        await sleep(2 ** attempt * 500);
      } finally {
        clearTimeout(timer);
      }
    }

    throw new ChannexError(
      lastError instanceof Error ? lastError.message : "Channex request failed",
      0,
    );
  }

  // ---------------------------------------------------------------- properties

  listProperties(page = 1, limit = 50) {
    return this.request<ChannexList<ChannexPropertyAttributes>>("GET", "/properties", {
      query: { "pagination[page]": page, "pagination[limit]": limit },
    });
  }

  getProperty(id: string) {
    return this.request<ChannexSingle<ChannexPropertyAttributes>>("GET", `/properties/${id}`);
  }

  createProperty(attributes: ChannexPropertyAttributes) {
    return this.request<ChannexSingle<ChannexPropertyAttributes>>("POST", "/properties", {
      body: { property: attributes },
    });
  }

  // ---------------------------------------------------------------- room types

  listRoomTypes(propertyId: string) {
    return this.request<ChannexList<ChannexRoomTypeAttributes>>("GET", "/room_types", {
      query: { "filter[property_id]": propertyId },
    });
  }

  createRoomType(attributes: ChannexRoomTypeAttributes) {
    return this.request<ChannexSingle<ChannexRoomTypeAttributes>>("POST", "/room_types", {
      body: { room_type: attributes },
    });
  }

  // ---------------------------------------------------------------- rate plans

  listRatePlans(propertyId: string) {
    return this.request<ChannexList<ChannexRatePlanAttributes>>("GET", "/rate_plans", {
      query: { "filter[property_id]": propertyId },
    });
  }

  createRatePlan(attributes: ChannexRatePlanAttributes) {
    return this.request<ChannexSingle<ChannexRatePlanAttributes>>("POST", "/rate_plans", {
      body: { rate_plan: attributes },
    });
  }

  // ----------------------------------------------------------------------- ARI

  /** Bulk availability push. Channex accepts up to 500 values per call. */
  updateAvailability(values: ChannexAvailabilityValue[]) {
    return this.request<{ meta: { message: string } }>("POST", "/availability", {
      body: { values },
    });
  }

  /** Bulk rate + restriction push (rate, min stay, CTA/CTD, stop sell). */
  updateRestrictions(values: ChannexRestrictionValue[]) {
    return this.request<{ meta: { message: string } }>("POST", "/restrictions", {
      body: { values },
    });
  }

  getAvailability(propertyId: string, dateFrom: string, dateTo: string) {
    return this.request<{ data: { attributes: Record<string, Record<string, number>> } }>(
      "GET",
      "/availability",
      {
        query: {
          "filter[property_id]": propertyId,
          "filter[date][gte]": dateFrom,
          "filter[date][lte]": dateTo,
        },
      },
    );
  }

  // ------------------------------------------------------------------ bookings

  /** Bookings Channex has not yet seen acknowledged by the PMS. */
  listUnprocessedBookings(propertyId?: string) {
    return this.request<ChannexList<ChannexBookingAttributes>>(
      "GET",
      "/bookings/feed",
      { query: propertyId ? { "filter[property_id]": propertyId } : undefined },
    );
  }

  getBooking(id: string) {
    return this.request<ChannexSingle<ChannexBookingAttributes>>("GET", `/bookings/${id}`);
  }

  /** Tells Channex the booking has landed in the PMS so it leaves the feed. */
  acknowledgeBooking(revisionId: string) {
    return this.request<{ meta: { message: string } }>(
      "PUT",
      `/bookings/${revisionId}/ack`,
    );
  }

  // ------------------------------------------------------------------ channels

  listChannels(propertyId: string) {
    return this.request<ChannexList<ChannexChannelAttributes>>("GET", "/channels", {
      query: { "filter[property_id]": propertyId },
    });
  }

  // ------------------------------------------------------------------ webhooks

  listWebhooks(propertyId: string) {
    return this.request<ChannexList<Record<string, unknown>>>("GET", "/webhooks", {
      query: { "filter[property_id]": propertyId },
    });
  }

  createWebhook(input: {
    property_id: string;
    callback_url: string;
    event_mask: string;
    request_type?: "json" | "form";
    is_active?: boolean;
    send_data?: boolean;
    headers?: Record<string, string>;
  }) {
    return this.request<ChannexSingle<Record<string, unknown>>>("POST", "/webhooks", {
      body: { webhook: { request_type: "json", is_active: true, ...input } },
    });
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
