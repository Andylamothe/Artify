"use client";
import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useMemo } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import type { PanInfo } from "framer-motion";
import type { Artwork } from "@/lib/types";
import ArtworkCard from "./ArtworkCard";

export interface SwipeDeckHandle {
  /** Advance the deck by one card without firing any like/pass callback. */
  advance: () => void;
  topArtwork: Artwork | null;
}

interface SwipeDeckProps {
  artworks: Artwork[];
  onLike: (artwork: Artwork) => void;
  onPass: (artwork: Artwork) => void;
  onCardTap: (artwork: Artwork) => void;
  /** Called whenever the top card changes (including swipes and resets). */
  onTopCardChange?: (artwork: Artwork | null) => void;
  onDeckComplete?: () => void;
}

interface DraggableCardProps {
  artwork: Artwork;
  onLike: () => void;
  onPass: () => void;
  onCardTap: () => void;
}

function DraggableCard({ artwork, onLike, onPass, onCardTap }: DraggableCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const passOpacity = useTransform(x, [-120, -20], [1, 0]);
  const isDragging = useRef(false);

  const handleDragStart = () => { isDragging.current = true; };

  const handleDragEnd = async (_: unknown, info: PanInfo) => {
    const hit =
      Math.abs(info.offset.x) > 80 || Math.abs(info.velocity.x) > 400;
    if (hit) {
      const dir = info.offset.x > 0 ? 1 : -1;
      await animate(x, dir * 720, { duration: 0.26, ease: "easeOut" });
      if (dir > 0) onLike();
      else onPass();
    } else {
      animate(x, 0, { type: "spring", damping: 22, stiffness: 320 });
    }
    setTimeout(() => { isDragging.current = false; }, 50);
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      style={{ x, rotate, width: "100%", height: "100%" }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onTap={() => { if (!isDragging.current) onCardTap(); }}
      className="cursor-grab active:cursor-grabbing touch-none"
    >
      <div className="relative w-full h-full">
        <motion.div
          style={{ opacity: likeOpacity }}
          className="absolute inset-0 z-10 flex items-start justify-end p-5 pointer-events-none"
        >
          <span
            className="text-base font-bold text-green-400 border-2 border-green-400 px-3 py-1 rounded-md"
            style={{ transform: "rotate(-14deg)", textShadow: "0 1px 4px rgba(0,0,0,.5)" }}
          >
            <span className="flex items-center gap-1">
              LIKE
              <span className="material-icons" style={{ fontSize: "16px", lineHeight: 1 }}>favorite</span>
            </span>
          </span>
        </motion.div>
        <motion.div
          style={{ opacity: passOpacity }}
          className="absolute inset-0 z-10 flex items-start justify-start p-5 pointer-events-none"
        >
          <span
            className="text-base font-bold text-red-400 border-2 border-red-400 px-3 py-1 rounded-md"
            style={{ transform: "rotate(14deg)", textShadow: "0 1px 4px rgba(0,0,0,.5)" }}
          >
            PASS ✕
          </span>
        </motion.div>
        <ArtworkCard artwork={artwork} />
      </div>
    </motion.div>
  );
}

const SwipeDeck = forwardRef<SwipeDeckHandle, SwipeDeckProps>(
  function SwipeDeck({ artworks, onLike, onPass, onCardTap, onTopCardChange, onDeckComplete }, ref) {
    const [topIndex, setTopIndex] = useState(0);

    // Reset when artwork list changes (e.g. category filter)
    const artworkKey = useMemo(() => artworks.map((a) => a.id).join(","), [artworks]);
    const prevKeyRef = useRef(artworkKey);
    useEffect(() => {
      if (artworkKey !== prevKeyRef.current) {
        prevKeyRef.current = artworkKey;
        queueMicrotask(() => setTopIndex(0));
      }
    }, [artworkKey]);

    // Notify parent whenever the top card changes
    useEffect(() => {
      onTopCardChange?.(artworks[topIndex] ?? null);
    }, [topIndex, artworks, onTopCardChange]);

    useEffect(() => {
      if (artworks.length > 0 && topIndex >= artworks.length) {
        onDeckComplete?.();
      }
    }, [artworks.length, onDeckComplete, topIndex]);

    // Expose an advance() that just moves the deck forward (no callbacks)
    useImperativeHandle(ref, () => ({
      advance: () => setTopIndex((i) => i + 1),
      topArtwork: artworks[topIndex] ?? null,
    }), [artworks, topIndex]);

    const swipeLike = (artwork: Artwork) => {
      onLike(artwork);
      setTopIndex((i) => i + 1);
    };

    const swipePass = (artwork: Artwork) => {
      onPass(artwork);
      setTopIndex((i) => i + 1);
    };

    if (artworks.length === 0) {
      return (
        <div className="flex items-center justify-center w-full h-full">
          <p className="text-muted text-sm">No artworks in this category</p>
        </div>
      );
    }

    if (topIndex >= artworks.length) {
      return null;
    }

    const visible = artworks.slice(topIndex, topIndex + 3);

    return (
      <div className="relative w-full h-full">
        {[...visible].reverse().map((artwork, revIdx) => {
          const stackIdx = visible.length - 1 - revIdx; // 0 = top card
          const isTop = stackIdx === 0;
          const scale = 1 - stackIdx * 0.04;
          const ty = stackIdx * 12;

          return (
            <div
              key={artwork.id}
              className="absolute inset-0"
              style={{
                zIndex: visible.length - stackIdx,
                transform: `scale(${scale}) translateY(${ty}px)`,
                transformOrigin: "bottom center",
                transition: "transform 0.25s ease",
                pointerEvents: isTop ? "auto" : "none",
              }}
            >
              {isTop ? (
                <DraggableCard
                  artwork={artwork}
                  onLike={() => swipeLike(artwork)}
                  onPass={() => swipePass(artwork)}
                  onCardTap={() => onCardTap(artwork)}
                />
              ) : (
                <ArtworkCard artwork={artwork} />
              )}
            </div>
          );
        })}
      </div>
    );
  }
);

export default SwipeDeck;
