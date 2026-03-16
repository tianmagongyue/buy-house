import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

type DemoProjectInput = {
  name: string;
  district: string;
  address: string;
  triggeredAt: string;
  triggeredAtPrecision?: "day" | "month";
  sourceTitle?: string;
  sourceUrl?: string;
  photoUrl?: string;
};

type DemoPriceInput = {
  year?: number;
  name: string;
  priceCnyPerSqm?: number | null;
  priceTotalCny?: number | null;
  priceSourceTitle?: string | null;
  priceSourceUrl?: string | null;
  priceUpdatedAt?: string | null;
};

export type DemoProject = {
  id: string;
  year: number;
  name: string;
  district: string;
  address: string;
  lng: number | null;
  lat: number | null;
  triggered_at: string | null;
  triggered_at_precision: "day" | "month";
  photo_url: string | null;
  source_title: string | null;
  source_url: string | null;
  source_published_at: string | null;
  created_at: string;
  updated_at: string;
  price_cny_per_sqm: number | null;
  price_total_cny: number | null;
  price_source_title: string | null;
  price_source_url: string | null;
  price_updated_at: string | null;
};

function uuidFromString(input: string) {
  const hex = crypto.createHash("md5").update(input).digest("hex");
  const parts = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, "0")}${hex.slice(18, 20)}`,
    hex.slice(20, 32)
  ];
  return parts.join("-");
}

export async function loadDemoDataset(input?: { year?: number }): Promise<{
  projects: DemoProject[];
  projectsUpdatedAt: string;
  pricesUpdatedAt: string;
}> {
  const year = input?.year ?? 2021;
  const base = process.cwd();
  const projectsPath = path.join(base, "data", "sample-projects-2021.json");
  const pricesPath = path.join(base, "data", "sample-prices.json");

  const [projectsRaw, pricesRaw] = await Promise.all([
    fs.readFile(projectsPath, "utf8"),
    fs.readFile(pricesPath, "utf8").catch(() => "[]")
  ]);

  const nowIso = new Date().toISOString();
  const projects = JSON.parse(projectsRaw) as DemoProjectInput[];
  const prices = JSON.parse(pricesRaw) as DemoPriceInput[];

  const priceMap = new Map<string, DemoPriceInput>();
  for (const p of prices) {
    const y = p.year ?? year;
    priceMap.set(`${y}::${p.name}`, p);
  }

  const out: DemoProject[] = projects.map((p) => {
    const precision = p.triggeredAtPrecision ?? (p.triggeredAt.length === 7 ? "month" : "day");
    const triggeredAt = precision === "month" ? `${p.triggeredAt}-01` : p.triggeredAt;
    const price = priceMap.get(`${year}::${p.name}`) || null;
    const id = uuidFromString(`${year}::${p.name}::${p.address}`);
    return {
      id,
      year,
      name: p.name,
      district: p.district,
      address: p.address,
      lng: null,
      lat: null,
      triggered_at: triggeredAt || null,
      triggered_at_precision: precision,
      photo_url: p.photoUrl ?? null,
      source_title: p.sourceTitle ?? null,
      source_url: p.sourceUrl ?? null,
      source_published_at: null,
      created_at: nowIso,
      updated_at: nowIso,
      price_cny_per_sqm: price?.priceCnyPerSqm ?? null,
      price_total_cny: price?.priceTotalCny ?? null,
      price_source_title: price?.priceSourceTitle ?? null,
      price_source_url: price?.priceSourceUrl ?? null,
      price_updated_at: price?.priceUpdatedAt ?? null
    };
  });

  return {
    projects: out,
    projectsUpdatedAt: nowIso,
    pricesUpdatedAt: nowIso
  };
}

