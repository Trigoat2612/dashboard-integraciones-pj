export type JudicialRecord = {
  id?: number;
  integration: string;
  year: number;
  csj: string | null;
  sede: string | null;
  organo: string | null;
  medida: string;
  cantidad: number;
  sourceSheet: string;
  sourceFile: string;
  sourceMeasure?: string | null;
  sourceRow?: number | null;
};

export type ImportSheetSummary = {
  sheet: string;
  integration: string;
  rows: number;
  measures: string[];
  duplicate: boolean;
  ignored?: boolean;
  note?: string;
};

export type ImportPreview = {
  fileName: string;
  fileSizeBytes: number;
  fileSha256: string;
  records: JudicialRecord[];
  sheets: ImportSheetSummary[];
  totalRows: number;
  duplicatedSheets: number;
  ignoredSheets: number;
};

export type ImportAudit = {
  id: number;
  sourceFile: string;
  fileSha256: string | null;
  fileSizeBytes: number | null;
  hasFile: boolean;
  importedByEmail: string;
  importedAt: string;
  rowsReceived: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsUnchanged: number;
  integrationCount: number;
};

export type ImportAuditRowAction = "inserted" | "updated" | "unchanged" | "legacy";

export type ImportAuditRow = {
  id: number;
  integration: string;
  year: number;
  csj: string | null;
  sede: string | null;
  organo: string | null;
  medida: string;
  sourceMeasure: string | null;
  cantidad: number;
  previousCantidad: number | null;
  sourceSheet: string;
  sourceFile: string;
  sourceRow: number | null;
  action: ImportAuditRowAction;
};

export type ImportSaveResult = {
  importId: number;
  received: number;
  inserted: number;
  updated: number;
  unchanged: number;
  integrationCount: number;
};
