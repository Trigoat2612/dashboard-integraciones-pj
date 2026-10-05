import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { parseExcelFile } from "@/lib/excel-client";
import { mergeImportedRecords } from "@/lib/records";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FILE_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const fileValue = form.get("file");
    const userEmail = String(form.get("userEmail") ?? "").trim().toLocaleLowerCase("es").slice(0, 320);

    if (!(fileValue instanceof File)) {
      return NextResponse.json({ error: "Debes adjuntar el archivo Excel a importar." }, { status: 400 });
    }
    if (!EMAIL_RE.test(userEmail)) {
      return NextResponse.json({ error: "Ingresa un correo electrónico válido para la auditoría de la carga." }, { status: 400 });
    }
    if (fileValue.size <= 0 || fileValue.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "El archivo debe pesar entre 1 byte y 4 MB." }, { status: 400 });
    }
    if (!/\.(xlsx|xls)$/i.test(fileValue.name)) {
      return NextResponse.json({ error: "Solo se permiten archivos Excel .xlsx o .xls." }, { status: 400 });
    }

    // La API vuelve a procesar el archivo real: no confía en los registros ni en el hash enviados por el navegador.
    const [preview, fileBuffer] = await Promise.all([
      parseExcelFile(fileValue),
      fileValue.arrayBuffer(),
    ]);

    if (!preview.records.length || preview.records.length > 250_000) {
      return NextResponse.json({ error: "La importación debe contener entre 1 y 250,000 registros compatibles." }, { status: 400 });
    }

    const result = await mergeImportedRecords(preview.records, {
      fileName: preview.fileName.slice(0, 255),
      fileSha256: preview.fileSha256,
      fileSizeBytes: preview.fileSizeBytes,
      fileMimeType: fileValue.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      fileContent: Buffer.from(fileBuffer),
      userEmail,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar la importación.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
