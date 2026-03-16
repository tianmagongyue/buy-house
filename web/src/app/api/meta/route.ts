import { getSql } from "@/lib/db";
import { loadDemoDataset } from "@/lib/demoData";

export const runtime = "nodejs";

export async function GET() {
  try {
    const sql = getSql();
    const meta = (await sql`
      select key, value, updated_at
      from dataset_meta
      where key in ('projects', 'prices')
    `) as { key: string; value: unknown; updated_at: string }[];

    const totalRows = (await sql`select count(1)::int as cnt from projects`) as { cnt: number }[];
    const totalProjects = totalRows[0]?.cnt ?? 0;

    const districts = (await sql`
      select district, count(1)::int as cnt
      from projects
      group by district
      order by cnt desc, district asc
    `) as { district: string; cnt: number }[];

    const projectsMeta = meta.find((m) => m.key === "projects");
    const pricesMeta = meta.find((m) => m.key === "prices");

    return Response.json({
      totalProjects,
      projectsUpdatedAt: projectsMeta?.updated_at ?? null,
      pricesUpdatedAt: pricesMeta?.updated_at ?? null,
      districts
    });
  } catch {
    const demo = await loadDemoDataset({ year: 2021 });
    const counts = new Map<string, number>();
    for (const p of demo.projects) {
      counts.set(p.district, (counts.get(p.district) || 0) + 1);
    }
    const districts = Array.from(counts.entries())
      .map(([district, cnt]) => ({ district, cnt }))
      .sort((a, b) => b.cnt - a.cnt || a.district.localeCompare(b.district, "zh-CN"));
    return Response.json({
      totalProjects: demo.projects.length,
      projectsUpdatedAt: demo.projectsUpdatedAt,
      pricesUpdatedAt: demo.pricesUpdatedAt,
      districts
    });
  }
}
