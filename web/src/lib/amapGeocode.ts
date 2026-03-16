import { z } from "zod";

const GeocodeResponseSchema = z.object({
  status: z.string(),
  info: z.string().optional(),
  infocode: z.string().optional(),
  geocodes: z
    .array(
      z.object({
        location: z.string()
      })
    )
    .optional()
});

export async function geocodeShanghaiAddress(input: {
  address: string;
  key: string;
}): Promise<{ lng: number; lat: number } | null> {
  const url = new URL("https://restapi.amap.com/v3/geocode/geo");
  url.searchParams.set("key", input.key);
  url.searchParams.set("address", input.address);
  url.searchParams.set("city", "上海");
  url.searchParams.set("output", "JSON");

  const res = await fetch(url, { method: "GET" });
  if (!res.ok) return null;
  const json = GeocodeResponseSchema.safeParse(await res.json());
  if (!json.success) return null;
  if (json.data.status !== "1") return null;
  const loc = json.data.geocodes?.[0]?.location;
  if (!loc) return null;
  const [lngStr, latStr] = loc.split(",");
  const lng = Number(lngStr);
  const lat = Number(latStr);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lng, lat };
}

