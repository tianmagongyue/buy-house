const fs = require("node:fs");
const path = require("node:path");
const { neon } = require("@neondatabase/serverless");

async function main() {
  const conn = process.env.POSTGRES_URL;
  if (!conn) {
    throw new Error("Missing POSTGRES_URL");
  }

  const sql = neon(conn);
  const migrationsDir = path.join(process.cwd(), "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort();

  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    const text = fs.readFileSync(fullPath, "utf8");
    await sql.unsafe(text);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

