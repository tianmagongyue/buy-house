const fs = require("node:fs");
const path = require("node:path");
const { neon } = require("@neondatabase/serverless");
const { z } = require("zod");
require("dotenv").config({ path: path.join(process.cwd(), ".env.local") });

function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return null;
  const value = process.argv[idx + 1];
  if (!value || value.startsWith("--")) return null;
  return value;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

const ImportRowSchema = z.object({
  name: z.string().min(1),
  district: z.string().min(1),
  address: z.string().min(1),
  triggeredAt: z.string().min(1),
  triggeredAtPrecision: z.enum(["day", "month"]).optional(),
  lng: z.number().optional(),
  lat: z.number().optional(),
  photoUrl: z.string().url().optional(),
  sourceTitle: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  sourcePublishedAt: z.string().optional()
});

const ImportFileSchema = z.array(ImportRowSchema);

async function geocodeShanghaiAddress({ address, name, key }) {
  async function attempt(addr) {
    const url = new URL("https://restapi.amap.com/v3/geocode/geo");
    url.searchParams.set("key", key);
    url.searchParams.set("address", addr);
    url.searchParams.set("city", "上海");
    url.searchParams.set("output", "JSON");

    let res;
    try {
      res = await fetch(url, { method: "GET" });
    } catch {
      return null;
    }
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== "1") return null;
    const loc = json.geocodes?.[0]?.location;
    if (!loc) return null;
    const [lngStr, latStr] = String(loc).split(",");
    const lng = Number(lngStr);
    const lat = Number(latStr);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    if (lng === 0 && lat === 0) return null;
    return { lng, lat };
  }

  const primary = await attempt(address);
  if (primary) return primary;
  const secondary = name ? await attempt(`${address}${name}`) : null;
  if (secondary) return secondary;
  const fallback = name ? await attempt(name) : null;
  return fallback;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const conn = process.env.POSTGRES_URL;
  if (!conn) throw new Error("Missing POSTGRES_URL");

  const file = getArg("file");
  if (!file) throw new Error("Missing --file <path>");

  const yearRaw = getArg("year");
  const year = yearRaw ? Number(yearRaw) : 2021;
  if (!Number.isFinite(year)) throw new Error("Invalid --year");

  const doGeocode = hasFlag("geocode");
  const geocodeKey = process.env.AMAP_WEB_SERVICE_KEY || "";
  if (doGeocode && !geocodeKey) throw new Error("Missing AMAP_WEB_SERVICE_KEY");

  const fullPath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  const text = fs.readFileSync(fullPath, "utf8");
  const json = ImportFileSchema.parse(JSON.parse(text));

  const sql = neon(conn);
  let insertedOrUpdated = 0;
  let geocoded = 0;
  let geocodeFailed = 0;

  for (const row of json) {
    const precision = row.triggeredAtPrecision || (row.triggeredAt.length === 7 ? "month" : "day");
    const triggeredAt =
      precision === "month" ? `${row.triggeredAt}-01` : row.triggeredAt;

    let lng = row.lng ?? null;
    let lat = row.lat ?? null;

    if (doGeocode && (lng == null || lat == null)) {
      const loc = await geocodeShanghaiAddress({ address: row.address, name: row.name, key: geocodeKey });
      if (loc) {
        lng = loc.lng;
        lat = loc.lat;
        geocoded += 1;
      } else {
        geocodeFailed += 1;
      }
      await sleep(200);
    }

    await sql`
      insert into projects
        (year, name, district, address, lng, lat, triggered_at, triggered_at_precision, photo_url, source_title, source_url, source_published_at, updated_at)
      values
        (${year}, ${row.name}, ${row.district}, ${row.address}, ${lng}, ${lat}, ${triggeredAt}, ${precision}, ${row.photoUrl ?? null}, ${row.sourceTitle ?? null}, ${row.sourceUrl ?? null}, ${row.sourcePublishedAt ?? null}, now())
      on conflict (year, name, address) do update set
        district = excluded.district,
        lng = coalesce(excluded.lng, projects.lng),
        lat = coalesce(excluded.lat, projects.lat),
        triggered_at = excluded.triggered_at,
        triggered_at_precision = excluded.triggered_at_precision,
        photo_url = coalesce(excluded.photo_url, projects.photo_url),
        source_title = coalesce(excluded.source_title, projects.source_title),
        source_url = coalesce(excluded.source_url, projects.source_url),
        source_published_at = coalesce(excluded.source_published_at, projects.source_published_at),
        updated_at = now()
    `;
    insertedOrUpdated += 1;
  }

  await sql`
    insert into dataset_meta (key, value, updated_at)
    values ('projects', ${JSON.stringify({ year })}::jsonb, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;

  process.stdout.write(
    JSON.stringify(
      { year, total: json.length, insertedOrUpdated, geocoded, geocodeFailed },
      null,
      2
    ) + "\n"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
