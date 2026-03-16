export type PriceUpdate = {
  year: number;
  name: string;
  priceCnyPerSqm: number | null;
  priceTotalCny: number | null;
  priceSourceTitle: string | null;
  priceSourceUrl: string | null;
  priceUpdatedAt: string | null;
};

export type PriceProvider = {
  fetchUpdates: () => Promise<PriceUpdate[]>;
};

