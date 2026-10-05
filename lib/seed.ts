import seedRecords from "@/data/seed-records.json";
import type { JudicialRecord } from "@/lib/types";

// Corte consolidado de los Excel adjuntos del 05/10/2026.
// 10 integraciones, 771 filas fuente. Las hojas "Res*" son tablas dinámicas de referencia y no se duplican.
export const SEED_RECORDS = seedRecords as JudicialRecord[];
