const { neon } = require("@neondatabase/serverless");

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

function csvEscape(v) {
  const s = v == null ? "" : String(v);
  if (/[,"\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

async function main() {
  const conn = process.env.POSTGRES_URL;
  if (!conn) throw new Error("Missing POSTGRES_URL");

  const cmd = process.argv[2] || "list";
  if (cmd !== "list") {
    throw new Error("Usage: node scripts/cli.cjs list [--year 2021] [--district ...] [--q ...] [--minPrice ...] [--maxPrice ...] [--format json|csv]");
  }

  const year = Number(getArg("year") || "2021");
  const district = getArg("district");
  const q = getArg("q");
  const minPrice = getArg("minPrice");
  const maxPrice = getArg("maxPrice");
  const includeUnknownPrice = hasFlag("no-unknown") ? false : true;
  const format = (getArg("format") || "json").toLowerCase();
  const limit = Number(getArg("limit") || "5000");
  const offset = Number(getArg("offset") || "0");

  const whereParts = ["p.year = $1"];
  const params = [year];
  let idx = 2;

  if (district) {
    whereParts.push(`p.district = $${idx++}`);
    params.push(district);
  }

  if (q) {
    whereParts.push(`(p.name ilike $${idx} or p.address ilike $${idx})`);
    params.push(`%${q}%`);
    idx += 1;
  }

  if (minPrice || maxPrice) {
    const min = minPrice ? Number(minPrice) : 0;
    const max = maxPrice ? Number(maxPrice) : 2147483647;
    if (includeUnknownPrice) {
      whereParts.push(
        `(pp.price_cny_per_sqm is null or (pp.price_cny_per_sqm between $${idx} and $${idx + 1}))`
      );
    } else {
      whereParts.push(`(pp.price_cny_per_sqm between $${idx} and $${idx + 1})`);
    }
    params.push(min, max);
    idx += 2;
  } else if (!includeUnknownPrice) {
    whereParts.push(`pp.price_cny_per_sqm is not null`);
  }

  whereParts.push(`true`);

  const whereSql = `where ${whereParts.join(" and ")}`;
  const limitParam = idx;
  const offsetParam = idx + 1;
  params.push(limit, offset);

  const sql = neon(conn);
  const rows = await sql.query(
    `select
        p.id, p.year, p.name, p.district, p.address, p.lng, p.lat, p.triggered_at, p.triggered_at_precision,
        p.source_title, p.source_url,
        pp.price_cny_per_sqm, pp.price_source_title, pp.price_source_url, pp.price_updated_at
     from projects p
     left join project_prices pp on pp.project_id = p.id
     ${whereSql}
     order by p.district asc, p.name asc
     limit $${limitParam} offset $${offsetParam}`,
    params
  );

  if (format === "csv") {
    const header = [
      "id",
      "year",
      "name",
      "district",
      "address",
      "lng",
      "lat",
      "triggeredAt",
      "priceCnyPerSqm",
      "priceSourceUrl",
      "priceUpdatedAt",
      "sourceUrl"
    ];
    process.stdout.write(header.join(",") + "\n");
    for (const r of rows) {
      const line = [
        r.id,
        r.year,
        r.name,
        r.district,
        r.address,
        r.lng,
        r.lat,
        r.triggered_at,
        r.price_cny_per_sqm,
        r.price_source_url,
        r.price_updated_at,
        r.source_url
      ]
        .map(csvEscape)
        .join(",");
      process.stdout.write(line + "\n");
    }
    return;
  }

  process.stdout.write(JSON.stringify(rows, null, 2) + "\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

