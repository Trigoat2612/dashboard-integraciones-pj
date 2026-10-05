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
  records: JudicialRecord[];
  sheets: ImportSheetSummary[];
  totalRows: number;
  duplicatedSheets: number;
  ignoredSheets: number;
};
