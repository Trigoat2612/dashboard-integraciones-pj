import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getImportHistory } from "@/lib/records";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 30);
    const imports = await getImportHistory(limit);
    return NextResponse.json({ imports });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo leer el historial de importaciones.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
