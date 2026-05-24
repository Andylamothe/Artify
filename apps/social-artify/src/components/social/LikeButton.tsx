"use client";
import { motion } from "framer-motion";
import { useLike } from "@/hooks/useLike";

interface LikeButtonProps {
  artworkId: string;
  showCount?: boolean;
}

export default function LikeButton({ artworkId, showCount = true }: LikeButtonProps) {
  const { isLiked, toggle, likes } = useLike(artworkId);

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 select-none"
      aria-label={isLiked ? "Unlike" : "Like"}
    >
      <motion.div
        whileTap={{ scale: 1.35 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill={isLiked ? "#810B38" : "none"}
          stroke={isLiked ? "#810B38" : "#6B4A36"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </motion.div>
      {showCount && (
        <span className="text-sm font-medium text-muted">
          {likes.toLocaleString()}
        </span>
      )}
    </button>
  );
}
