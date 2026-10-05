import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import postgres from "postgres";

const root = process.cwd();

// Neon CLI suele escribir DATABASE_URL en .env.local al ejecutar link/env pull.
for (const envFile of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(path.join(root, envFile));
  } catch {
    // El archivo es opcional.
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL. Ejecuta `neon link`/`neon env pull` o define la variable manualmente.");
  process.exit(1);
}

const schema = await fs.readFile(path.join(root, "database", "schema.sql"), "utf8");
const sql = postgres(url, { ssl: "require", max: 1, prepare: false });

try {
  await sql.unsafe(schema);
  console.log("Esquema creado/verificado.");

  if (process.argv.includes("--seed")) {
    const seed = await fs.readFile(path.join(root, "database", "seed.sql"), "utf8");
    await sql.unsafe(seed);
    console.log("Seed consolidado cargado: 10 integraciones / 771 filas fuente + histórico inicial.");
  }

  if (process.argv.includes("--verify")) {
    const [countRows, importCount, historyCount] = await Promise.all([
      sql`select count(*)::int as rows from judicial_integration_records`,
      sql`select count(*)::int as rows from judicial_imports`,
      sql`select count(*)::int as rows from judicial_import_rows`,
    ]);
    const integrations = await sql`
      select integration_name, count(*)::int as rows, min(year)::int as min_year, max(year)::int as max_year, sum(cantidad)::bigint as total
      from judicial_integration_records
      group by integration_name
      order by integration_name
    `;
    console.log(`Filas vigentes: ${countRows[0]?.rows ?? 0}`);
    console.log(`Cargas auditadas: ${importCount[0]?.rows ?? 0}`);
    console.log(`Filas históricas: ${historyCount[0]?.rows ?? 0}`);
    console.table(integrations.map((row) => ({
      integracion: String(row.integration_name),
      filas: Number(row.rows),
      desde: Number(row.min_year),
      hasta: Number(row.max_year),
      total: String(row.total),
    })));
  }
} finally {
  await sql.end({ timeout: 5 });
}
