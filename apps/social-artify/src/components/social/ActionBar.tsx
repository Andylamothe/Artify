"use client";
import { motion } from "framer-motion";
import type { Artwork } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";
import { useFeedStore } from "@/store/feedStore";
import { buildArExperienceUrl } from "@/lib/ar";

interface ActionBarProps {
  artwork: Artwork | null;
  onPass: () => void;
  onLike?: () => void; // optional override; if omitted, falls back to internal useLike
}

export default function ActionBar({ artwork, onPass, onLike }: ActionBarProps) {
  const user = useAuthStore((s) => s.user);
  const isGuest = useAuthStore((s) => s.isGuest);
  const guestSessionId = useAuthStore((s) => s.guestSessionId);
  const artworks = useFeedStore((s) => s.artworks);

  // Compute isLiked from store (for the heart fill state)
  const storedArtwork = artworks.find((a) => a.id === artwork?.id);
  const actorId = user?.id ?? (isGuest ? guestSessionId : null);
  const isLiked = actorId ? (storedArtwork?.likedBy ?? []).includes(actorId) : false;

  const handle3D = () => {
    if (!artwork?.has3D || !artwork.arWebId) return;
    window.open(buildArExperienceUrl(artwork.arWebId), "_blank");
  };

  const handleLike = () => {
    onLike?.();
  };

  return (
    <div className="flex items-center justify-center gap-6 py-3 shrink-0">
      {/* Pass */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={onPass}
        disabled={!artwork}
        className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center shadow-sm disabled:opacity-40 active:bg-border"
        aria-label="Pass"
      >
        <svg
          width="20" height="20" viewBox="0 0 24 24"
          fill="none" stroke="#6B4A36" strokeWidth="2.5" strokeLinecap="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </motion.button>

      {/* View in 3D */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={handle3D}
        disabled={!artwork?.has3D}
        className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-md disabled:opacity-35"
        aria-label="View in 3D"
        title={artwork?.has3D ? "View in 3D" : "No 3D for this artwork"}
      >
        <svg
          width="28" height="28" viewBox="0 0 24 24"
          fill="none" stroke="white" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      </motion.button>

      {/* Like */}
      <motion.button
        whileTap={{ scale: 1.25 }}
        onClick={handleLike}
        disabled={!artwork}
        className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center shadow-sm disabled:opacity-40 active:bg-border"
        aria-label="Like"
      >
        <svg
          width="22" height="22" viewBox="0 0 24 24"
          fill={isLiked ? "#810B38" : "none"}
          stroke={isLiked ? "#810B38" : "#6B4A36"}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </motion.button>
    </div>
  );
}
