import { z } from "zod";
import { getSql } from "@/lib/db";
import { loadDemoDataset } from "@/lib/demoData";

export const runtime = "nodejs";

const ParamsSchema = z.object({
  id: z.string().uuid()
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = ParamsSchema.safeParse(await ctx.params);
  if (!params.success) {
    return Response.json({ error: params.error.flatten() }, { status: 400 });
  }

  try {
    const sql = getSql();
    const rows = (await sql`
      select
        p.id, p.year, p.name, p.district, p.address, p.lng, p.lat, p.triggered_at, p.triggered_at_precision,
        p.photo_url, p.source_title, p.source_url, p.source_published_at, p.created_at, p.updated_at,
        pp.price_cny_per_sqm, pp.price_total_cny, pp.price_source_title, pp.price_source_url, pp.price_updated_at
      from projects p
      left join project_prices pp on pp.project_id = p.id
      where p.id = ${params.data.id}
      limit 1
    `) as Record<string, unknown>[];

    const item = rows[0];
    if (!item) {
      return new Response("Not Found", { status: 404 });
    }
    return Response.json(item);
  } catch {
    const demo = await loadDemoDataset({ year: 2021 });
    const item = demo.projects.find((p) => p.id === params.data.id);
    if (!item) return new Response("Not Found", { status: 404 });
    return Response.json(item);
  }
}
