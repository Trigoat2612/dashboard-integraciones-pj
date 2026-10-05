import * as XLSX from "xlsx";
import type { ImportPreview, ImportSheetSummary, JudicialRecord } from "@/lib/types";

type Cell = string | number | boolean | Date | null | undefined;

const YEAR_KEYS = new Set(["ano", "anio", "year"]);
const CSJ_KEYS = new Set([
  "csj",
  "distritojudicial",
  "csjdistritojudicial",
  "cortesuperior",
  "cortesuperiordejusticia",
]);
const SEDE_KEYS = new Set(["sede", "sedes"]);
const ORGANO_KEYS = new Set([
  "organjurisdiccional",
  "organojurisdiccional",
  "instancia",
  "tipoinstancia",
  "oj",
  "orgjurisdiccional",
  "xnominstancia",
]);

const INTEGRATION_NAMES: Record<string, string> = {
  fallolaboral: "Sentido de Fallo",
  repej: "REPEJ",
  sernot: "SERNOT",
  redjum: "REDJUM",
  embargos: "Embargos",
  sinarejmultas: "Multas",
  jurisprudencia: "Jurisprudencia",
  casillero: "Casillero Digital",
  depositos: "Depósitos",
  sunarp: "SUNARP",
};

const MEASURE_PRIORITY = [
  "cantidad",
  "count",
  "cantidadexpedientes",
  "cantenviossunarp",
  "totalcedulas",
];

function key(value: Cell): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function text(value: Cell): string | null {
  if (value === null || value === undefined) return null;
  const result = String(value).trim();
  return result ? result : null;
}

function numberValue(value: Cell): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/,/g, "").replace(/\s/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function yearValue(value: Cell): number | null {
  const parsed = numberValue(value);
  if (parsed === null) return null;
  const year = Math.trunc(parsed);
  return year >= 1900 && year <= 2200 ? year : null;
}

function isTotalLabel(value: Cell): boolean {
  const normalized = key(value);
  return normalized === "total" || normalized === "totalgeneral" || normalized === "grandtotal" || normalized.startsWith("subtotal");
}

function isMeasureHeader(value: Cell): boolean {
  const normalized = key(value);
  return (
    normalized.includes("cantidad") ||
    normalized === "count" ||
    normalized.startsWith("count") ||
    normalized.startsWith("cant") ||
    normalized.includes("expediente") ||
    normalized.includes("enviossunarp") ||
    normalized.includes("totalcedulas")
  );
}

function isSummarySheet(sheetName: string): boolean {
  return /^\s*res(?:umen)?(?:[\s._-]|$)/i.test(sheetName);
}

function integrationName(sheetName: string): string {
  const mapped = INTEGRATION_NAMES[key(sheetName)];
  if (mapped) return mapped;

  const cleaned = sheetName
    .replace(/^\s*res(?:umen)?[\s._-]+/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return sheetName.trim();
  return cleaned
    .toLocaleLowerCase("es")
    .replace(/(^|\s|[-/])([a-záéíóúñ])/g, (_match, prefix, letter) => `${prefix}${letter.toLocaleUpperCase("es")}`)
    .replace(/\b(De|Del|La|Las|Los|Y|En)\b/g, (word) => word.toLocaleLowerCase("es"));
}

function findHeaderRow(rows: Cell[][]): number {
  let bestIndex = 0;
  let bestScore = -1;

  rows.slice(0, 30).forEach((row, index) => {
    const keys = row.map(key);
    let score = 0;
    if (keys.some((item) => YEAR_KEYS.has(item))) score += 4;
    if (keys.some((item) => CSJ_KEYS.has(item))) score += 2;
    if (keys.some((item) => SEDE_KEYS.has(item))) score += 2;
    if (keys.some((item) => ORGANO_KEYS.has(item))) score += 2;
    if (row.some(isMeasureHeader)) score += 4;
    if (row.some((item) => yearValue(item) !== null)) score += 2;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function indexOfAlias(headers: Cell[], aliases: Set<string>): number {
  return headers.findIndex((header) => aliases.has(key(header)));
}

function primaryMeasureIndex(headers: Cell[], excluded: number[]): number {
  const candidates = headers
    .map((header, index) => ({ header, index, normalized: key(header) }))
    .filter(({ index, header }) => !excluded.includes(index) && isMeasureHeader(header));

  for (const expected of MEASURE_PRIORITY) {
    const exact = candidates.find((candidate) => candidate.normalized === expected);
    if (exact) return exact.index;
  }

  return candidates[0]?.index ?? -1;
}

function rowLooksEmpty(row: Cell[]): boolean {
  return row.every((cell) => text(cell) === null);
}

function dependencyTotalRow(row: Cell[], dimensionIndexes: number[]): boolean {
  if (dimensionIndexes.some((index) => index >= 0 && isTotalLabel(row[index]))) return true;
  return row.slice(0, 6).some((cell) => isTotalLabel(cell));
}

function parseSheet(sheetName: string, rows: Cell[][], fileName: string): JudicialRecord[] {
  if (!rows.length) return [];
  const headerIndex = findHeaderRow(rows);
  const headers = rows[headerIndex] ?? [];
  const body = rows.slice(headerIndex + 1);

  const yearIndex = indexOfAlias(headers, YEAR_KEYS);
  const csjIndex = indexOfAlias(headers, CSJ_KEYS);
  const sedeIndex = indexOfAlias(headers, SEDE_KEYS);
  const organoIndex = indexOfAlias(headers, ORGANO_KEYS);
  const dims = [csjIndex, sedeIndex, organoIndex].filter((index) => index >= 0);
  const measureIndex = primaryMeasureIndex(headers, [yearIndex, ...dims]);

  if (yearIndex < 0 || measureIndex < 0) return [];

  const result: JudicialRecord[] = [];
  const integration = integrationName(sheetName);
  const sourceMeasure = text(headers[measureIndex]) ?? "Cantidad";

  body.forEach((row, bodyIndex) => {
    if (rowLooksEmpty(row) || dependencyTotalRow(row, dims)) return;
    const year = yearValue(row[yearIndex]);
    const cantidad = numberValue(row[measureIndex]);
    if (!year || cantidad === null) return;

    result.push({
      integration,
      year,
      csj: csjIndex >= 0 ? text(row[csjIndex]) : null,
      sede: sedeIndex >= 0 ? text(row[sedeIndex]) : null,
      organo: organoIndex >= 0 ? text(row[organoIndex]) : null,
      medida: "Cantidad",
      cantidad,
      sourceSheet: sheetName,
      sourceFile: fileName,
      sourceMeasure,
      sourceRow: headerIndex + bodyIndex + 2,
    });
  });

  return result;
}

function fingerprint(records: JudicialRecord[]): string {
  let hash = 2166136261;
  const source = records
    .map((record) => [record.integration, record.year, record.csj, record.sede, record.organo, record.medida, record.cantidad].join("¦"))
    .join("§");
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export async function parseExcelFile(file: File): Promise<ImportPreview> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true, cellFormula: false });
  const seen = new Set<string>();
  const records: JudicialRecord[] = [];
  const sheets: ImportSheetSummary[] = [];

  for (const sheetName of workbook.SheetNames) {
    if (isSummarySheet(sheetName)) {
      sheets.push({
        sheet: sheetName,
        integration: integrationName(sheetName),
        rows: 0,
        measures: [],
        duplicate: false,
        ignored: true,
        note: "Hoja de resumen/tabla dinámica: se conserva como referencia visual y no se carga en la base.",
      });
      continue;
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;
    const rows = XLSX.utils.sheet_to_json<Cell[]>(worksheet, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false,
    });

    const parsed = parseSheet(sheetName, rows, file.name);
    const signature = parsed.length ? fingerprint(parsed) : `empty:${sheetName}`;
    const duplicate = parsed.length > 0 && seen.has(signature);
    if (parsed.length > 0 && !duplicate) {
      seen.add(signature);
      records.push(...parsed);
    }

    const sourceMeasure = parsed[0]?.sourceMeasure ?? null;
    sheets.push({
      sheet: sheetName,
      integration: integrationName(sheetName),
      rows: duplicate ? 0 : parsed.length,
      measures: parsed.length ? ["Cantidad"] : [],
      duplicate,
      ignored: false,
      note: duplicate
        ? "Hoja repetida: se omitió para evitar duplicar registros."
        : parsed.length
          ? sourceMeasure && sourceMeasure !== "Cantidad"
            ? `Métrica fuente normalizada como Cantidad: ${sourceMeasure}.`
            : undefined
          : "Sin filas compatibles con el esquema esperado.",
    });
  }

  return {
    fileName: file.name,
    records,
    sheets,
    totalRows: records.length,
    duplicatedSheets: sheets.filter((sheet) => sheet.duplicate).length,
    ignoredSheets: sheets.filter((sheet) => sheet.ignored).length,
  };
}
