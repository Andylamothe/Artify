import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

export const SOCIAL_AUTH_COOKIE = "artify_social_token";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-secret-change-in-prod");

export interface TokenPayload {
  userId: string;
  role: string;
}

export async function signToken(userId: string, role: string): Promise<string> {
  return new SignJWT({ userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1d")
    .sign(SECRET);
}

export async function verifyToken(req: NextRequest): Promise<TokenPayload | null> {
  const token = req.cookies.get(SOCIAL_AUTH_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export const COOKIE_OPTIONS = {
  httpOnly: true,
  path: "/social",
  maxAge: 60 * 60 * 24 * 7,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
} as const;
