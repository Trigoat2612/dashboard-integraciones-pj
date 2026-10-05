import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getImportRows } from "@/lib/records";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;
  const importId = Number(id);
  if (!Number.isInteger(importId) || importId <= 0) {
    return NextResponse.json({ error: "Identificador de importación inválido." }, { status: 400 });
  }

  try {
    const url = new URL(request.url);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const limit = Number(url.searchParams.get("limit") ?? 200);
    const result = await getImportRows(importId, offset, limit);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo leer el detalle histórico.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
