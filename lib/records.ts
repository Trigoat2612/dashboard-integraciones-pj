import { getSql } from "@/lib/db";
import { SEED_RECORDS } from "@/lib/seed";
import type { ImportAudit, ImportAuditRow, ImportSaveResult, JudicialRecord } from "@/lib/types";

function cleanText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function canonical(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es");
}

function businessKey(record: JudicialRecord): string {
  return [
    canonical(record.integration),
    record.year,
    canonical(record.csj),
    canonical(record.sede),
    canonical(record.organo),
    canonical(record.medida),
  ].join("¦");
}

function assertUniqueIncomingRecords(records: JudicialRecord[]): void {
  const seen = new Map<string, number>();
  for (let index = 0; index < records.length; index += 1) {
    const key = businessKey(records[index]);
    const previous = seen.get(key);
    if (previous !== undefined) {
      const record = records[index];
      throw new Error(
        `El Excel contiene una clave funcional duplicada entre las filas normalizadas ${previous + 1} y ${index + 1}: ` +
          `${record.integration} / ${record.year} / ${record.csj ?? "-"} / ${record.sede ?? "-"} / ${record.organo ?? "-"}.`,
      );
    }
    seen.set(key, index);
  }
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
    order by imported_at desc, id desc
    limit 1
  `;

  if (!rows[0]?.imported_at) return null;
  return new Date(rows[0].imported_at).toISOString();
}

export async function getImportHistory(limit = 30): Promise<ImportAudit[]> {
  const sql = getSql();
  if (!sql) return [];
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);

  const rows = await sql`
    select
      id,
      source_file as "sourceFile",
      file_sha256 as "fileSha256",
      file_size_bytes as "fileSizeBytes",
      (file_content is not null) as "hasFile",
      imported_by_email as "importedByEmail",
      imported_at as "importedAt",
      rows_received as "rowsReceived",
      rows_inserted as "rowsInserted",
      rows_updated as "rowsUpdated",
      rows_unchanged as "rowsUnchanged",
      integration_count as "integrationCount"
    from judicial_imports
    order by imported_at desc, id desc
    limit ${safeLimit}
  `;

  return rows.map((row) => ({
    id: Number(row.id),
    sourceFile: String(row.sourceFile),
    fileSha256: cleanText(row.fileSha256),
    fileSizeBytes: row.fileSizeBytes === null || row.fileSizeBytes === undefined ? null : Number(row.fileSizeBytes),
    hasFile: Boolean(row.hasFile),
    importedByEmail: String(row.importedByEmail),
    importedAt: new Date(row.importedAt).toISOString(),
    rowsReceived: Number(row.rowsReceived ?? 0),
    rowsInserted: Number(row.rowsInserted ?? 0),
    rowsUpdated: Number(row.rowsUpdated ?? 0),
    rowsUnchanged: Number(row.rowsUnchanged ?? 0),
    integrationCount: Number(row.integrationCount ?? 0),
  }));
}

export async function getImportFile(importId: number): Promise<{ fileName: string; mimeType: string; content: Uint8Array } | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    select source_file, file_mime_type, file_content
    from judicial_imports
    where id = ${importId}
    limit 1
  `;
  const row = rows[0];
  if (!row?.file_content) return null;
  const raw = row.file_content as Uint8Array;
  return {
    fileName: String(row.source_file),
    mimeType: String(row.file_mime_type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    content: raw instanceof Uint8Array ? raw : new Uint8Array(raw),
  };
}

export async function getImportRows(
  importId: number,
  offset = 0,
  limit = 200,
): Promise<{ rows: ImportAuditRow[]; total: number }> {
  const sql = getSql();
  if (!sql) return { rows: [], total: 0 };

  const safeOffset = Math.max(Math.trunc(offset), 0);
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 500);

  const [countRows, rows] = await Promise.all([
    sql`select count(*)::int as total from judicial_import_rows where import_id = ${importId}`,
    sql`
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
        previous_cantidad::float8 as "previousCantidad",
        source_sheet as "sourceSheet",
        source_file as "sourceFile",
        source_row as "sourceRow",
        row_action as action
      from judicial_import_rows
      where import_id = ${importId}
      order by id
      limit ${safeLimit} offset ${safeOffset}
    `,
  ]);

  return {
    total: Number(countRows[0]?.total ?? 0),
    rows: rows.map((row) => ({
      id: Number(row.id),
      integration: String(row.integration),
      year: Number(row.year),
      csj: cleanText(row.csj),
      sede: cleanText(row.sede),
      organo: cleanText(row.organo),
      medida: String(row.medida),
      sourceMeasure: cleanText(row.sourceMeasure),
      cantidad: Number(row.cantidad),
      previousCantidad: row.previousCantidad === null || row.previousCantidad === undefined ? null : Number(row.previousCantidad),
      sourceSheet: String(row.sourceSheet),
      sourceFile: String(row.sourceFile),
      sourceRow: row.sourceRow === null || row.sourceRow === undefined ? null : Number(row.sourceRow),
      action: String(row.action) as ImportAuditRow["action"],
    })),
  };
}

export async function mergeImportedRecords(
  records: JudicialRecord[],
  options: {
    fileName: string;
    fileSha256: string;
    fileSizeBytes: number;
    fileMimeType: string;
    fileContent: Uint8Array;
    userEmail: string;
  },
): Promise<ImportSaveResult> {
  const sql = getSql();
  if (!sql) {
    throw new Error("DATABASE_URL no está configurada. La importación está deshabilitada en modo local.");
  }
  if (!records.length) throw new Error("No hay registros normalizados para guardar.");

  assertUniqueIncomingRecords(records);

  const payload = records.map((record, sourceIndex) => ({
    source_index: sourceIndex + 1,
    integration_name: record.integration.trim(),
    year: record.year,
    csj: record.csj?.trim() || null,
    sede: record.sede?.trim() || null,
    organo: record.organo?.trim() || null,
    measure_name: record.medida.trim() || "Cantidad",
    source_measure_name: record.sourceMeasure?.trim() || record.medida.trim() || "Cantidad",
    cantidad: Math.trunc(record.cantidad),
    source_sheet: record.sourceSheet.trim(),
    source_file: options.fileName,
    source_row: Number.isInteger(record.sourceRow) ? record.sourceRow : null,
  }));

  const integrationCount = new Set(payload.map((record) => canonical(record.integration_name))).size;

  return sql.begin(async (tx) => {
    await tx.unsafe(`
      create temporary table incoming_judicial_records (
        source_index integer not null,
        integration_name varchar(180) not null,
        year integer not null,
        csj varchar(240),
        sede varchar(320),
        organo varchar(420),
        measure_name varchar(180) not null,
        source_measure_name varchar(180),
        cantidad bigint not null,
        source_sheet varchar(255) not null,
        source_file varchar(255) not null,
        source_row integer
      ) on commit drop
    `);

    const chunkSize = 500;
    for (let index = 0; index < payload.length; index += chunkSize) {
      const chunk = payload.slice(index, index + chunkSize);
      await tx`
        insert into incoming_judicial_records ${tx(
          chunk,
          "source_index",
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

    const statRows = await tx`
      select
        count(*) filter (where r.id is null)::int as inserted,
        count(*) filter (where r.id is not null and r.cantidad is distinct from s.cantidad)::int as updated,
        count(*) filter (where r.id is not null and r.cantidad is not distinct from s.cantidad)::int as unchanged
      from incoming_judicial_records s
      left join judicial_integration_records r
        on sijud_norm_key(r.integration_name) = sijud_norm_key(s.integration_name)
       and r.year = s.year
       and sijud_norm_key(r.csj) = sijud_norm_key(s.csj)
       and sijud_norm_key(r.sede) = sijud_norm_key(s.sede)
       and sijud_norm_key(r.organo) = sijud_norm_key(s.organo)
       and sijud_norm_key(r.measure_name) = sijud_norm_key(s.measure_name)
    `;

    const inserted = Number(statRows[0]?.inserted ?? 0);
    const updated = Number(statRows[0]?.updated ?? 0);
    const unchanged = Number(statRows[0]?.unchanged ?? 0);

    const importRows = await tx`
      insert into judicial_imports (
        source_file, rows_imported, import_mode, imported_by_email,
        file_sha256, file_size_bytes, file_mime_type, file_content, rows_received, rows_inserted,
        rows_updated, rows_unchanged, integration_count
      )
      values (
        ${options.fileName}, ${payload.length}, 'merge', ${options.userEmail},
        ${options.fileSha256}, ${options.fileSizeBytes}, ${options.fileMimeType}, ${options.fileContent}, ${payload.length}, ${inserted},
        ${updated}, ${unchanged}, ${integrationCount}
      )
      returning id
    `;
    const importId = Number(importRows[0].id);

    await tx`
      insert into judicial_import_rows (
        import_id, current_record_id, integration_name, year, csj, sede, organo,
        measure_name, source_measure_name, cantidad, previous_cantidad,
        source_sheet, source_file, source_row, row_action
      )
      select
        ${importId}, r.id, s.integration_name, s.year, s.csj, s.sede, s.organo,
        s.measure_name, s.source_measure_name, s.cantidad, r.cantidad,
        s.source_sheet, s.source_file, s.source_row,
        case
          when r.id is null then 'inserted'
          when r.cantidad is distinct from s.cantidad then 'updated'
          else 'unchanged'
        end
      from incoming_judicial_records s
      left join judicial_integration_records r
        on sijud_norm_key(r.integration_name) = sijud_norm_key(s.integration_name)
       and r.year = s.year
       and sijud_norm_key(r.csj) = sijud_norm_key(s.csj)
       and sijud_norm_key(r.sede) = sijud_norm_key(s.sede)
       and sijud_norm_key(r.organo) = sijud_norm_key(s.organo)
       and sijud_norm_key(r.measure_name) = sijud_norm_key(s.measure_name)
    `;

    await tx`
      update judicial_integration_records r
      set
        integration_name = s.integration_name,
        csj = s.csj,
        sede = s.sede,
        organo = s.organo,
        measure_name = s.measure_name,
        source_measure_name = s.source_measure_name,
        cantidad = s.cantidad,
        source_sheet = s.source_sheet,
        source_file = s.source_file,
        source_row = s.source_row,
        source_import_id = ${importId},
        updated_at = case when r.cantidad is distinct from s.cantidad then now() else r.updated_at end,
        updated_by_email = case when r.cantidad is distinct from s.cantidad then ${options.userEmail} else r.updated_by_email end,
        last_seen_at = now()
      from incoming_judicial_records s
      where sijud_norm_key(r.integration_name) = sijud_norm_key(s.integration_name)
        and r.year = s.year
        and sijud_norm_key(r.csj) = sijud_norm_key(s.csj)
        and sijud_norm_key(r.sede) = sijud_norm_key(s.sede)
        and sijud_norm_key(r.organo) = sijud_norm_key(s.organo)
        and sijud_norm_key(r.measure_name) = sijud_norm_key(s.measure_name)
    `;

    await tx`
      insert into judicial_integration_records (
        integration_name, year, csj, sede, organo, measure_name, source_measure_name,
        cantidad, source_sheet, source_file, source_row, source_import_id,
        created_by_email, updated_by_email, last_seen_at
      )
      select
        s.integration_name, s.year, s.csj, s.sede, s.organo, s.measure_name, s.source_measure_name,
        s.cantidad, s.source_sheet, s.source_file, s.source_row, ${importId},
        ${options.userEmail}, ${options.userEmail}, now()
      from incoming_judicial_records s
      where not exists (
        select 1
        from judicial_integration_records r
        where sijud_norm_key(r.integration_name) = sijud_norm_key(s.integration_name)
          and r.year = s.year
          and sijud_norm_key(r.csj) = sijud_norm_key(s.csj)
          and sijud_norm_key(r.sede) = sijud_norm_key(s.sede)
          and sijud_norm_key(r.organo) = sijud_norm_key(s.organo)
          and sijud_norm_key(r.measure_name) = sijud_norm_key(s.measure_name)
      )
    `;

    await tx`
      update judicial_import_rows h
      set current_record_id = r.id
      from judicial_integration_records r
      where h.import_id = ${importId}
        and h.current_record_id is null
        and sijud_norm_key(r.integration_name) = sijud_norm_key(h.integration_name)
        and r.year = h.year
        and sijud_norm_key(r.csj) = sijud_norm_key(h.csj)
        and sijud_norm_key(r.sede) = sijud_norm_key(h.sede)
        and sijud_norm_key(r.organo) = sijud_norm_key(h.organo)
        and sijud_norm_key(r.measure_name) = sijud_norm_key(h.measure_name)
    `;

    return {
      importId,
      received: payload.length,
      inserted,
      updated,
      unchanged,
      integrationCount,
    };
  });
}
