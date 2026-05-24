"use client";

import { useAuthStore } from "@/store/authStore";
import { useFeedStore } from "@/store/feedStore";
import { APP_BASE } from "@/lib/api";

export function useLike(artworkId: string) {
  const user = useAuthStore((s) => s.user);
  const isGuest = useAuthStore((s) => s.isGuest);
  const guestSessionId = useAuthStore((s) => s.guestSessionId);
  const setPendingAction = useAuthStore((s) => s.setPendingAction);
  const setAuthModalOpen = useAuthStore((s) => s.setAuthModalOpen);

  const artworks = useFeedStore((s) => s.artworks);
  const likeArtwork = useFeedStore((s) => s.likeArtwork);
  const unlikeArtwork = useFeedStore((s) => s.unlikeArtwork);

  const artwork = artworks.find((a) => a.id === artworkId);
  const actorId = user?.id ?? (isGuest ? guestSessionId : null);
  const isLiked = actorId ? (artwork?.likedBy ?? []).includes(actorId) : false;
  const likes = artwork?.likes ?? 0;

  const toggle = async () => {
    if (!actorId) {
      setPendingAction({ type: "like", artworkId });
      setAuthModalOpen(true);
      return;
    }

    if (isLiked) {
      unlikeArtwork(artworkId, actorId);
    } else {
      likeArtwork(artworkId, actorId);
    }

    // Guest likes are session-local only, no backend call.
    if (!user) return;

    try {
      await fetch(`${APP_BASE}/api/artworks/${artworkId}/like`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      if (isLiked) likeArtwork(artworkId, user.id);
      else unlikeArtwork(artworkId, user.id);
      console.error(err);
    }
  };

  return { isLiked, toggle, likes };
}
