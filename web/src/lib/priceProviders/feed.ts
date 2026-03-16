import { z } from "zod";
import type { PriceProvider, PriceUpdate } from "./types";

const FeedRowSchema = z.object({
  year: z.number().int().default(2021),
  name: z.string().min(1),
  priceCnyPerSqm: z.number().int().nullable().default(null),
  priceTotalCny: z.number().int().nullable().default(null),
  priceSourceTitle: z.string().nullable().default(null),
  priceSourceUrl: z.string().url().nullable().default(null),
  priceUpdatedAt: z.string().nullable().default(null)
});

const FeedSchema = z.array(FeedRowSchema);

function parseCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].split(",").map((s) => s.trim());
  const idx = (key: string) => header.indexOf(key);
  const rows = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(",").map((s) => s.trim());
    const get = (key: string) => {
      const i = idx(key);
      return i >= 0 ? cols[i] : "";
    };
    const year = Number(get("year") || "2021");
    const name = get("name");
    const priceCnyPerSqmRaw = get("priceCnyPerSqm");
    const priceTotalCnyRaw = get("priceTotalCny");
    rows.push({
      year,
      name,
      priceCnyPerSqm: priceCnyPerSqmRaw ? Number(priceCnyPerSqmRaw) : null,
      priceTotalCny: priceTotalCnyRaw ? Number(priceTotalCnyRaw) : null,
      priceSourceTitle: get("priceSourceTitle") || null,
      priceSourceUrl: get("priceSourceUrl") || null,
      priceUpdatedAt: get("priceUpdatedAt") || null
    });
  }
  return rows;
}

export function createFeedPriceProvider(input: { feedUrl: string }): PriceProvider {
  return {
    fetchUpdates: async () => {
      const res = await fetch(input.feedUrl, { method: "GET" });
      if (!res.ok) throw new Error(`PRICE_FEED_URL fetch failed: ${res.status}`);
      const contentType = res.headers.get("content-type") || "";
      const text = await res.text();
      const data =
        contentType.includes("application/json") || input.feedUrl.endsWith(".json")
          ? JSON.parse(text)
          : parseCsv(text);
      const parsed = FeedSchema.parse(data);
      const out: PriceUpdate[] = parsed.map((r) => ({
        year: r.year,
        name: r.name,
        priceCnyPerSqm: r.priceCnyPerSqm,
        priceTotalCny: r.priceTotalCny,
        priceSourceTitle: r.priceSourceTitle,
        priceSourceUrl: r.priceSourceUrl,
        priceUpdatedAt: r.priceUpdatedAt
      }));
      return out;
    }
  };
}

