import { NextResponse } from "next/server";
import { databaseEnabled } from "@/lib/records";

export async function GET() {
  return NextResponse.json({ status: "ok", database: databaseEnabled() ? "configured" : "demo" });
}
