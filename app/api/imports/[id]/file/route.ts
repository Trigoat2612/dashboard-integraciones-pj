import { isAuthenticated } from "@/lib/auth";
import { getImportFile } from "@/lib/records";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeFileName(value: string): string {
  return value.replace(/[\r\n"\\/]/g, "_").slice(0, 180) || "importacion.xlsx";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return new Response("No autorizado", { status: 401 });
  }

  const { id } = await context.params;
  const importId = Number(id);
  if (!Number.isInteger(importId) || importId <= 0) {
    return new Response("Identificador inválido", { status: 400 });
  }

  const file = await getImportFile(importId);
  if (!file) return new Response("El archivo original no está disponible para esta carga.", { status: 404 });

  const body = new ArrayBuffer(file.content.byteLength);
  new Uint8Array(body).set(file.content);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(body.byteLength),
      "Content-Disposition": `attachment; filename="${safeFileName(file.fileName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
