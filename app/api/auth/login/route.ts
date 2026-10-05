import { NextResponse } from "next/server";
import { createSessionToken, passwordMatches, setSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");

  if (!passwordMatches(password)) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  const token = await createSessionToken();
  await setSessionCookie(token);
  return NextResponse.redirect(new URL("/", request.url), 303);
}
