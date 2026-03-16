import { getSql } from "@/lib/db";
import { getPriceProvider } from "@/lib/priceProviders";
import { runRefreshPrices } from "@/lib/jobs/refreshPrices";

export const runtime = "nodejs";

let lastRunAt = 0;

export async function GET(req: Request) {
  const token = process.env.REFRESH_TOKEN;
  if (!token) return new Response("Missing REFRESH_TOKEN", { status: 500 });

  const url = new URL(req.url);
  const provided = url.searchParams.get("token") || "";
  if (provided !== token) {
    const now = Date.now();
    if (now - lastRunAt < 10 * 60 * 1000) {
      return new Response("Too Many Requests", { status: 429 });
    }
    lastRunAt = now;
  }

  const provider = getPriceProvider();
  if (!provider) {
    return new Response("Missing PRICE_FEED_URL", { status: 500 });
  }

  const sql = getSql();
  const result = await runRefreshPrices({ sql, provider });
  return Response.json(result);
}
