/**
 * lib/api.ts — Typed fetch wrappers for all backend endpoints.
 * All calls use credentials: 'include' so the httpOnly cookie is
 * automatically sent/received by the browser.
 */

import type { User, Role } from "./types";

export const APP_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
const BASE = APP_BASE;

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? "Request failed");
  }
  return data as T;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function apiRegister(
  name: string,
  email: string,
  password: string,
  role: Role
): Promise<{ user: User }> {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, role }),
  });
}

export async function apiLogin(
  email: string,
  password: string
): Promise<{ user: User }> {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function apiLogout(): Promise<void> {
  await fetch(`${BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export async function apiGetMe(): Promise<User | null> {
  try {
    const data = await request<{ user: User }>("/api/auth/me");
    return data.user;
  } catch {
    return null;
  }
}
