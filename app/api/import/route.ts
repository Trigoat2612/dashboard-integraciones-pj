import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { saveImportedRecords } from "@/lib/records";
import type { JudicialRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

function validRecord(record: JudicialRecord): boolean {
  return (
    typeof record.integration === "string" &&
    record.integration.trim().length > 0 &&
    Number.isInteger(record.year) &&
    record.year >= 1900 &&
    record.year <= 2200 &&
    typeof record.medida === "string" &&
    Number.isFinite(record.cantidad) &&
    typeof record.sourceSheet === "string" &&
    typeof record.sourceFile === "string"
  );
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      records?: JudicialRecord[];
      fileName?: string;
      mode?: "replace" | "append";
    };

    const records = Array.isArray(body.records) ? body.records : [];
    const fileName = String(body.fileName ?? "importacion.xlsx").slice(0, 255);
    const mode = body.mode === "append" ? "append" : "replace";

    if (!records.length || records.length > 250_000) {
      return NextResponse.json({ error: "La importación debe contener entre 1 y 250,000 registros." }, { status: 400 });
    }

    if (!records.every(validRecord)) {
      return NextResponse.json({ error: "La importación contiene registros inválidos." }, { status: 400 });
    }

    const saved = await saveImportedRecords(records, fileName, mode);
    return NextResponse.json({ ok: true, saved, mode });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar la importación.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
