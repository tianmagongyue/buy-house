import { z } from "zod";
import { getSql } from "@/lib/db";
import { loadDemoDataset } from "@/lib/demoData";

export const runtime = "nodejs";

const QuerySchema = z.object({
  year: z.coerce.number().int().default(2021),
  district: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
  minPrice: z.coerce.number().int().optional(),
  maxPrice: z.coerce.number().int().optional(),
  includeUnknownPrice: z.coerce.boolean().default(true),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50)
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const q = parsed.data;
  let sql: ReturnType<typeof getSql> | null = null;
  try {
    sql = getSql();
  } catch {
    sql = null;
  }

  const offset = (q.page - 1) * q.pageSize;

  if (!sql) {
    const demo = await loadDemoDataset({ year: q.year });
    let filtered = demo.projects;
    if (q.district) filtered = filtered.filter((p) => p.district === q.district);
    if (q.q) {
      const needle = q.q.toLowerCase();
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(needle) || p.address.toLowerCase().includes(needle)
      );
    }
    if (typeof q.minPrice === "number" || typeof q.maxPrice === "number") {
      const min = typeof q.minPrice === "number" ? q.minPrice : 0;
      const max = typeof q.maxPrice === "number" ? q.maxPrice : 2147483647;
      filtered = filtered.filter((p) => {
        const price = p.price_cny_per_sqm;
        if (price == null) return q.includeUnknownPrice;
        return price >= min && price <= max;
      });
    } else if (!q.includeUnknownPrice) {
      filtered = filtered.filter((p) => p.price_cny_per_sqm != null);
    }
    const total = filtered.length;
    const items = filtered.slice(offset, offset + q.pageSize);
    return Response.json({ page: q.page, pageSize: q.pageSize, total, items });
  }

  const whereParts = ["p.year = $1"];
  const params: Array<string | number> = [q.year];
  let idx = 2;

  if (q.district) {
    whereParts.push(`p.district = $${idx++}`);
    params.push(q.district);
  }

  if (q.q) {
    whereParts.push(`(p.name ilike $${idx} or p.address ilike $${idx})`);
    params.push(`%${q.q}%`);
    idx += 1;
  }

  const hasMin = typeof q.minPrice === "number";
  const hasMax = typeof q.maxPrice === "number";
  if (hasMin || hasMax) {
    const min = hasMin ? (q.minPrice ?? 0) : 0;
    const max = hasMax ? (q.maxPrice ?? 2147483647) : 2147483647;
    if (q.includeUnknownPrice) {
      whereParts.push(
        `(pp.price_cny_per_sqm is null or (pp.price_cny_per_sqm between $${idx} and $${idx + 1}))`
      );
    } else {
      whereParts.push(`(pp.price_cny_per_sqm between $${idx} and $${idx + 1})`);
    }
    params.push(min, max);
    idx += 2;
  } else if (!q.includeUnknownPrice) {
    whereParts.push(`pp.price_cny_per_sqm is not null`);
  }

  const whereSql = whereParts.length ? `where ${whereParts.join(" and ")}` : "";

  const countResult = (await sql.query(
    `select count(1)::int as cnt
     from projects p
     left join project_prices pp on pp.project_id = p.id
     ${whereSql}`,
    params
  )) as { cnt: number }[];

  const total = countResult[0]?.cnt ?? 0;

  const limitParam = idx;
  const offsetParam = idx + 1;
  params.push(q.pageSize, offset);

  const rows = (await sql.query(
    `select
        p.id, p.year, p.name, p.district, p.address, p.lng, p.lat, p.triggered_at, p.triggered_at_precision,
        p.seq, p.developer, p.unit_type, p.unit_count, p.avg_price_cny_per_sqm, p.heat_score, p.heat_label, p.unlock_window,
        p.photo_url, p.source_title, p.source_url, p.source_published_at, p.created_at, p.updated_at,
        pp.price_cny_per_sqm, pp.price_total_cny, pp.price_source_title, pp.price_source_url, pp.price_updated_at
     from projects p
     left join project_prices pp on pp.project_id = p.id
     ${whereSql}
     order by p.district asc, p.name asc
     limit $${limitParam} offset $${offsetParam}`,
    params
  )) as Record<string, unknown>[];

  return Response.json({
    page: q.page,
    pageSize: q.pageSize,
    total,
    items: rows
  });
}
