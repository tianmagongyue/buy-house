import { getSql } from "@/lib/db";
import { getPriceProvider } from "@/lib/priceProviders";
import { runRefreshPrices } from "@/lib/jobs/refreshPrices";

export const runtime = "nodejs";

function isAuthorized(req: Request) {
  const token = process.env.REFRESH_TOKEN;
  if (!token) return false;
  const header = req.headers.get("authorization") || "";
  return header === `Bearer ${token}`;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const provider = getPriceProvider();
  if (!provider) {
    return new Response("Missing PRICE_FEED_URL", { status: 500 });
  }

  const sql = getSql();
  const result = await runRefreshPrices({ sql, provider });
  return Response.json(result);
}
