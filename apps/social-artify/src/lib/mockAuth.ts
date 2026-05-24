// Mock auth — all state lives in localStorage, no real server
import type { User, Role } from "./types";

const STORAGE_KEY = "social-artify-user";

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function register(name: string, email: string, role: Role): User {
  const user: User = {
    id: crypto.randomUUID(),
    name,
    email,
    role,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return user;
}

export function login(email: string): User | null {
  const user = getStoredUser();
  if (user?.email === email) return user;
  return null;
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEY);
}
