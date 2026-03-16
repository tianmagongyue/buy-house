import { neon } from "@neondatabase/serverless";

let cached: ReturnType<typeof neon> | null = null;

export function getSql() {
  if (cached) return cached;
  const conn = process.env.POSTGRES_URL;
  if (!conn) {
    throw new Error("Missing POSTGRES_URL");
  }
  cached = neon(conn);
  return cached;
}
