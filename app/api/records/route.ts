import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { databaseEnabled, getAllRecords, getLastImport } from "@/lib/records";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const [records, lastImport] = await Promise.all([getAllRecords(), getLastImport()]);
    return NextResponse.json({
      records,
      databaseEnabled: databaseEnabled(),
      lastImport,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error de lectura";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
