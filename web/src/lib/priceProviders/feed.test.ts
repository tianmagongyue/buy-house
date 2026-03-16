import { afterEach, describe, expect, it } from "vitest";
import { createFeedPriceProvider } from "./feed";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("createFeedPriceProvider", () => {
  it("parses json feed", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify([
          {
            year: 2021,
            name: "示例楼盘A",
            priceCnyPerSqm: 85000,
            priceTotalCny: null,
            priceSourceTitle: "示例来源",
            priceSourceUrl: "https://www.fangdi.com.cn/",
            priceUpdatedAt: "2026-03-16T00:00:00Z"
          }
        ]),
        { headers: { "content-type": "application/json" } }
      )) as any;

    const p = createFeedPriceProvider({ feedUrl: "https://example.com/feed.json" });
    const updates = await p.fetchUpdates();
    expect(updates).toEqual([
      {
        year: 2021,
        name: "示例楼盘A",
        priceCnyPerSqm: 85000,
        priceTotalCny: null,
        priceSourceTitle: "示例来源",
        priceSourceUrl: "https://www.fangdi.com.cn/",
        priceUpdatedAt: "2026-03-16T00:00:00Z"
      }
    ]);
  });

  it("parses csv feed", async () => {
    globalThis.fetch = (async () =>
      new Response(
        [
          "year,name,priceCnyPerSqm,priceTotalCny,priceSourceTitle,priceSourceUrl,priceUpdatedAt",
          "2021,示例楼盘A,85000,,示例来源,https://www.fangdi.com.cn/,2026-03-16T00:00:00Z"
        ].join("\n"),
        { headers: { "content-type": "text/csv" } }
      )) as any;

    const p = createFeedPriceProvider({ feedUrl: "https://example.com/feed.csv" });
    const updates = await p.fetchUpdates();
    expect(updates[0]?.name).toBe("示例楼盘A");
    expect(updates[0]?.priceCnyPerSqm).toBe(85000);
  });
});

