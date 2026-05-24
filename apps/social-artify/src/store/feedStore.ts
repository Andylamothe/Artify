"use client";

import { create } from "zustand";
import type { Artwork } from "@/lib/types";

interface FeedStore {
  artworks: Artwork[];
  activeCategory: string;
  setArtworks: (artworks: Artwork[]) => void;
  setCategory: (category: string) => void;
  likeArtwork: (artworkId: string, userId: string) => void;
  unlikeArtwork: (artworkId: string, userId: string) => void;
}

export const useFeedStore = create<FeedStore>((set) => ({
  artworks: [],
  activeCategory: "All",

  setArtworks: (artworks) => set({ artworks }),
  setCategory: (activeCategory) => set({ activeCategory }),

  // Mise à jour optimiste — l'UI réagit immédiatement, l'API confirme en fond
  likeArtwork: (artworkId, userId) =>
    set((state) => ({
      artworks: state.artworks.map((a) =>
        a.id === artworkId
          ? a.likedBy.includes(userId)
            ? a
            : { ...a, likes: a.likes + 1, likedBy: [...a.likedBy, userId] }
          : a
      ),
    })),

  unlikeArtwork: (artworkId, userId) =>
    set((state) => ({
      artworks: state.artworks.map((a) =>
        a.id === artworkId
          ? { ...a, likes: Math.max(0, a.likes - 1), likedBy: a.likedBy.filter((id) => id !== userId) }
          : a
      ),
    })),
}));
