import { getSql } from "@/lib/db";
import { geocodeShanghaiAddress } from "@/lib/amapGeocode";

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

  const sql = getSql();
  const key = process.env.AMAP_WEB_SERVICE_KEY;
  if (!key) {
    return new Response("Missing AMAP_WEB_SERVICE_KEY", { status: 500 });
  }

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") || "50");

  const rows = (await sql`select id, address from projects where lng is null or lat is null limit ${limit}`) as {
    id: string;
    address: string;
  }[];

  let updated = 0;
  let failed = 0;

  for (const r of rows) {
    const loc = await geocodeShanghaiAddress({ address: r.address, key });
    if (!loc) {
      failed += 1;
      continue;
    }
    await sql`update projects set lng = ${loc.lng}, lat = ${loc.lat}, updated_at = now() where id = ${r.id}`;
    updated += 1;
  }

  return Response.json({ scanned: rows.length, updated, failed });
}
