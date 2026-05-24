"use client";

import { create } from "zustand";
import type { Artwork } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";

interface FeedStore {
  artworks: Artwork[];
  activeCategory: string;
  setArtworks: (artworks: Artwork[]) => void;
  setCategory: (category: string) => void;
  likeArtwork: (artworkId: string, userId: string) => void;
  unlikeArtwork: (artworkId: string, userId: string) => void;
}

function applyGuestLikes(artworks: Artwork[]) {
  const { isGuest, guestSessionId, guestLikedArtworkIds } = useAuthStore.getState();
  if (!isGuest || !guestSessionId || guestLikedArtworkIds.length === 0) return artworks;

  const guestLikes = new Set(guestLikedArtworkIds);
  return artworks.map((artwork) => {
    if (!guestLikes.has(artwork.id) || artwork.likedBy.includes(guestSessionId)) return artwork;
    return {
      ...artwork,
      likes: artwork.likes + 1,
      likedBy: [...artwork.likedBy, guestSessionId],
    };
  });
}

export const useFeedStore = create<FeedStore>((set) => ({
  artworks: [],
  activeCategory: "All",

  setArtworks: (artworks) => set({ artworks: applyGuestLikes(artworks) }),
  setCategory: (activeCategory) => set({ activeCategory }),

  // Mise à jour optimiste — l'UI réagit immédiatement, l'API confirme en fond
  likeArtwork: (artworkId, userId) => {
    const { isGuest, guestSessionId, addGuestLike } = useAuthStore.getState();
    if (isGuest && guestSessionId === userId) addGuestLike(artworkId);

    set((state) => ({
      artworks: state.artworks.map((a) =>
        a.id === artworkId
          ? a.likedBy.includes(userId)
            ? a
            : { ...a, likes: a.likes + 1, likedBy: [...a.likedBy, userId] }
          : a
      ),
    }));
  },

  unlikeArtwork: (artworkId, userId) => {
    const { isGuest, guestSessionId, removeGuestLike } = useAuthStore.getState();
    if (isGuest && guestSessionId === userId) removeGuestLike(artworkId);

    set((state) => ({
      artworks: state.artworks.map((a) =>
        a.id === artworkId
          ? { ...a, likes: Math.max(0, a.likes - 1), likedBy: a.likedBy.filter((id) => id !== userId) }
          : a
      ),
    }));
  },
}));
