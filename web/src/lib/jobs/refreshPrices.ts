import type { PriceProvider } from "@/lib/priceProviders/types";

export async function runRefreshPrices(input: {
  sql: any;
  provider: PriceProvider;
}) {
  const updates = await input.provider.fetchUpdates();
  const years = Array.from(new Set(updates.map((u) => u.year))).sort();

  const maps = new Map<number, Map<string, string>>();
  for (const year of years) {
    const rows = (await input.sql`select id, name from projects where year = ${year}`) as {
      id: string;
      name: string;
    }[];
    maps.set(
      year,
      new Map(rows.map((r) => [r.name, r.id]))
    );
  }

  let matched = 0;
  let updated = 0;

  for (const u of updates) {
    const id = maps.get(u.year)?.get(u.name);
    if (!id) continue;
    matched += 1;
    await input.sql`
      insert into project_prices
        (project_id, price_cny_per_sqm, price_total_cny, price_source_title, price_source_url, price_updated_at, updated_at)
      values
        (${id}, ${u.priceCnyPerSqm}, ${u.priceTotalCny}, ${u.priceSourceTitle}, ${u.priceSourceUrl}, ${u.priceUpdatedAt}, now())
      on conflict (project_id) do update set
        price_cny_per_sqm = excluded.price_cny_per_sqm,
        price_total_cny = excluded.price_total_cny,
        price_source_title = excluded.price_source_title,
        price_source_url = excluded.price_source_url,
        price_updated_at = excluded.price_updated_at,
        updated_at = now()
    `;
    updated += 1;
  }

  await input.sql`
    insert into dataset_meta (key, value, updated_at)
    values ('prices', ${JSON.stringify({ years })}::jsonb, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;

  return { totalUpdates: updates.length, matched, updated, years };
}

