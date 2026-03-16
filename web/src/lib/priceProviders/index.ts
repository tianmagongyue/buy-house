import type { PriceProvider } from "./types";
import { createFeedPriceProvider } from "./feed";

export function getPriceProvider(): PriceProvider | null {
  const feedUrl = process.env.PRICE_FEED_URL;
  if (!feedUrl) return null;
  return createFeedPriceProvider({ feedUrl });
}

