import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "sijud_session";

function secretKey(): Uint8Array | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export function authEnabled(): boolean {
  return Boolean(process.env.DASHBOARD_PASSWORD && process.env.SESSION_SECRET);
}

export function passwordMatches(candidate: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) return true;
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function createSessionToken(): Promise<string> {
  const key = secretKey();
  if (!key) return "dev-no-auth";

  return new SignJWT({ scope: "dashboard" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(key);
}

export async function isAuthenticated(): Promise<boolean> {
  if (!authEnabled()) return true;
  const key = secretKey();
  if (!key) return false;

  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;

  try {
    const verified = await jwtVerify(token, key);
    return verified.payload.scope === "dashboard";
  } catch {
    return false;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
