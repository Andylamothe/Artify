"use client";

import { create } from "zustand";
import type { ArtProfile, User } from "@/lib/types";

interface PendingAction {
  type: string;
  artworkId?: string;
}

interface AuthStore {
  user: User | null;
  isGuest: boolean;
  guestSessionId: string | null;
  pendingAction: PendingAction | null;
  authModalOpen: boolean;
  authModalTab: "login" | "register";
  showQuiz: boolean;
  guestArtProfile: ArtProfile | null;

  setUser: (user: User) => void;
  clearAuth: () => void;
  setGuest: (val: boolean) => void;
  setGuestSessionId: (id: string | null) => void;
  setShowQuiz: (show: boolean) => void;
  setUserProfile: (profile: ArtProfile) => void;
  setPendingAction: (action: PendingAction | null) => void;
  setAuthModalOpen: (open: boolean) => void;
  setAuthModalTab: (tab: "login" | "register") => void;
  openAuthModal: (tab: "login" | "register") => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isGuest: false,
  guestSessionId: null,
  pendingAction: null,
  authModalOpen: false,
  authModalTab: "login",
  showQuiz: false,
  guestArtProfile: null,

  setUser: (user) =>
    set({
      user,
      isGuest: false,
      guestSessionId: null,
      pendingAction: null,
      authModalOpen: false,
    }),
  clearAuth: () => set({ user: null, isGuest: false, guestSessionId: null, pendingAction: null }),
  setGuest: (val) => set((state) => ({ isGuest: val, guestSessionId: val ? state.guestSessionId : null })),
  setGuestSessionId: (guestSessionId) => set({ guestSessionId }),
  setShowQuiz: (showQuiz) => set({ showQuiz }),
  setUserProfile: (profile) =>
    set((state) => ({
      user: state.user ? { ...state.user, artProfile: profile } : state.user,
      guestArtProfile: state.user ? state.guestArtProfile : profile,
    })),
  setPendingAction: (action) => set({ pendingAction: action }),
  setAuthModalOpen: (open) => set({ authModalOpen: open }),
  setAuthModalTab: (tab) => set({ authModalTab: tab }),
  openAuthModal: (tab) => set({ authModalOpen: true, authModalTab: tab }),
}));
