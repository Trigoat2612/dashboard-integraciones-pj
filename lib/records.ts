import { getSql } from "@/lib/db";
import { SEED_RECORDS } from "@/lib/seed";
import type { JudicialRecord } from "@/lib/types";

function cleanText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

export function databaseEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function getAllRecords(): Promise<JudicialRecord[]> {
  const sql = getSql();
  if (!sql) return SEED_RECORDS;

  const rows = await sql`
    select
      id,
      integration_name as integration,
      year,
      csj,
      sede,
      organo,
      measure_name as medida,
      source_measure_name as "sourceMeasure",
      cantidad::float8 as cantidad,
      source_sheet as "sourceSheet",
      source_file as "sourceFile",
      source_row as "sourceRow"
    from judicial_integration_records
    order by integration_name, year, csj nulls first, sede nulls first, organo nulls first, source_row nulls last, id
  `;

  return rows.map((row) => ({
    id: Number(row.id),
    integration: String(row.integration),
    year: Number(row.year),
    csj: cleanText(row.csj),
    sede: cleanText(row.sede),
    organo: cleanText(row.organo),
    medida: String(row.medida),
    cantidad: Number(row.cantidad),
    sourceSheet: String(row.sourceSheet ?? ""),
    sourceFile: String(row.sourceFile ?? ""),
    sourceMeasure: cleanText(row.sourceMeasure),
    sourceRow: row.sourceRow === null || row.sourceRow === undefined ? null : Number(row.sourceRow),
  }));
}

export async function getLastImport(): Promise<string | null> {
  const sql = getSql();
  if (!sql) return null;

  const rows = await sql`
    select imported_at
    from judicial_imports
    order by imported_at desc
    limit 1
  `;

  if (!rows[0]?.imported_at) return null;
  return new Date(rows[0].imported_at).toISOString();
}

export async function saveImportedRecords(
  records: JudicialRecord[],
  fileName: string,
  mode: "replace" | "append",
): Promise<number> {
  const sql = getSql();
  if (!sql) {
    throw new Error("DATABASE_URL no está configurada. La importación está deshabilitada en modo local.");
  }

  if (!records.length) throw new Error("No hay registros normalizados para guardar.");

  const payload = records.map((record) => ({
    integration_name: record.integration.trim(),
    year: record.year,
    csj: record.csj?.trim() || null,
    sede: record.sede?.trim() || null,
    organo: record.organo?.trim() || null,
    measure_name: record.medida.trim() || "Cantidad",
    source_measure_name: record.sourceMeasure?.trim() || record.medida.trim() || "Cantidad",
    cantidad: Math.trunc(record.cantidad),
    source_sheet: record.sourceSheet.trim(),
    source_file: record.sourceFile.trim() || fileName,
    source_row: Number.isInteger(record.sourceRow) ? record.sourceRow : null,
  }));

  await sql.begin(async (tx) => {
    if (mode === "replace") await tx`delete from judicial_integration_records`;

    const chunkSize = 500;
    for (let i = 0; i < payload.length; i += chunkSize) {
      const chunk = payload.slice(i, i + chunkSize);
      await tx`
        insert into judicial_integration_records ${tx(
          chunk,
          "integration_name",
          "year",
          "csj",
          "sede",
          "organo",
          "measure_name",
          "source_measure_name",
          "cantidad",
          "source_sheet",
          "source_file",
          "source_row",
        )}
      `;
    }

    await tx`
      insert into judicial_imports (source_file, rows_imported, import_mode)
      values (${fileName}, ${payload.length}, ${mode})
    `;
  });

  return payload.length;
}
