import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";

/**
 * Lazily-created Drizzle client.
 *
 * STAYBASE runs fully on the bundled demo dataset until DATABASE_URL is
 * present, which keeps preview deployments working with zero infrastructure.
 */
let cached: ReturnType<typeof create> | null = null;

function create(url: string) {
  const client = postgres(url, {
    max: 1,
    prepare: false,
    idle_timeout: 20,
  });
  return drizzle(client, { schema });
}

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  cached ??= create(url);
  return cached;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export { schema };
