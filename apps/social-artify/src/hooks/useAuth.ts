"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import type { Role, User } from "@/lib/types";
import { APP_BASE } from "@/lib/api";

export function useAuth() {
  const router = useRouter();
  const {
    user, isGuest, pendingAction, authModalOpen, authModalTab,
    setUser, clearAuth, setGuest, setPendingAction,
    setAuthModalOpen, openAuthModal, setShowQuiz, setUserProfile, setGuestSessionId,
  } = useAuthStore();

  useEffect(() => {
    if (user || isGuest) return;
    fetch(`${APP_BASE}/api/auth/me`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user?: User } | null) => {
        if (data?.user && !useAuthStore.getState().user) {
          setUser(data.user);
        }
      })
      .catch(() => undefined);
  }, [isGuest, setUser, user]);

  async function login(email: string, password: string) {
    const res = await fetch(`${APP_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Login failed");
    setUser(data.user);
    router.push("/discover");
    return data.user;
  }

  async function register(name: string, email: string, password: string, role: Role) {
    const res = await fetch(`${APP_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Register failed");
    setUser(data.user);
    setShowQuiz(true);
    router.push("/discover");
    return data.user;
  }

  async function logout() {
    await fetch(`${APP_BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
    clearAuth();
    router.push("/onboarding");
  }

  function browseAsGuest() {
    const existingGuestId = useAuthStore.getState().guestSessionId;
    if (!existingGuestId) {
      const nextId = `guest-${crypto.randomUUID()}`;
      setGuestSessionId(nextId);
    }
    setGuest(true);
    setShowQuiz(true);
  }

  return {
    user,
    isGuest,
    isLoggedIn: !!user,
    isArtist: user?.role === "artist",
    pendingAction,
    authModalOpen,
    authModalTab,
    login,
    register,
    logout,
    browseAsGuest,
    setGuest,
    setShowQuiz,
    setUserProfile,
    setPendingAction,
    setAuthModalOpen,
    openAuthModal,
  };
}
