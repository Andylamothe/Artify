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
  const rotate = useTransform(x, [-220, 220], [-14, 14]);
  const likeOpacity = useTransform(x, [28, 128], [0, 1]);
  const passOpacity = useTransform(x, [-128, -28], [1, 0]);
  const likeBorderOpacity = useTransform(x, [24, 104], [0, 1]);
  const passBorderOpacity = useTransform(x, [-104, -24], [1, 0]);
  const cardShadow = useTransform(
    x,
    [-180, 0, 180],
    [
      "0 22px 48px rgba(225,29,72,0.18)",
      "0 18px 42px rgba(55,29,16,0.18)",
      "0 22px 48px rgba(16,185,129,0.18)",
    ],
  );
  const isDragging = useRef(false);

  const handleDragStart = () => { isDragging.current = true; };

  const handleDragEnd = async (_: unknown, info: PanInfo) => {
    const hit =
      Math.abs(info.offset.x) > 80 || Math.abs(info.velocity.x) > 400;
    if (hit) {
      const dir = info.offset.x > 0 ? 1 : -1;
      await animate(x, dir * 760, { duration: 0.22, ease: [0.22, 1, 0.36, 1] });
      if (dir > 0) onLike();
      else onPass();
    } else {
      animate(x, 0, { type: "spring", damping: 30, stiffness: 420, mass: 0.8 });
    }
    setTimeout(() => { isDragging.current = false; }, 50);
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.42}
      dragMomentum={false}
      whileDrag={{ scale: 1.012 }}
      style={{
        x,
        rotate,
        width: "100%",
        height: "100%",
        boxShadow: cardShadow,
        willChange: "transform",
        transform: "translateZ(0)",
        backfaceVisibility: "hidden",
      }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onTap={() => { if (!isDragging.current) onCardTap(); }}
      className="cursor-grab active:cursor-grabbing touch-none"
    >
      <div className="relative w-full h-full">
        <motion.div
          aria-hidden="true"
          style={{ opacity: likeBorderOpacity, willChange: "opacity" }}
          className="absolute inset-0 z-20 pointer-events-none rounded-[var(--radius-card,12px)] border-[7px] border-emerald-400 shadow-[0_0_0_2px_rgba(236,253,245,0.85),0_0_26px_rgba(52,211,153,0.72),inset_0_0_26px_rgba(16,185,129,0.24)]"
        >
          <div className="absolute inset-0 rounded-[calc(var(--radius-card,12px)-4px)] bg-emerald-400/10" />
          <div className="absolute right-5 top-5 flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-sm font-black uppercase tracking-wide text-[#082218] shadow-[0_12px_32px_rgba(16,185,129,0.45)]">
            <span className="material-icons" style={{ fontSize: "19px", lineHeight: 1 }}>favorite</span>
            Like
          </div>
        </motion.div>
        <motion.div
          aria-hidden="true"
          style={{ opacity: passBorderOpacity, willChange: "opacity" }}
          className="absolute inset-0 z-20 pointer-events-none rounded-[var(--radius-card,12px)] border-[7px] border-rose-500 shadow-[0_0_0_2px_rgba(255,241,242,0.82),0_0_26px_rgba(244,63,94,0.72),inset_0_0_26px_rgba(225,29,72,0.24)]"
        >
          <div className="absolute inset-0 rounded-[calc(var(--radius-card,12px)-4px)] bg-rose-500/10" />
          <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full bg-rose-500 px-4 py-2 text-sm font-black uppercase tracking-wide text-white shadow-[0_12px_32px_rgba(225,29,72,0.45)]">
            <span className="material-icons" style={{ fontSize: "19px", lineHeight: 1 }}>close</span>
            Pass
          </div>
        </motion.div>
        <motion.div
          style={{ opacity: likeOpacity }}
          className="absolute inset-0 z-30 flex items-start justify-end p-5 pointer-events-none"
        >
          <span
            className="text-base font-bold text-emerald-100 border-2 border-emerald-200 bg-emerald-500/35 px-3 py-1 rounded-md"
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
          className="absolute inset-0 z-30 flex items-start justify-start p-5 pointer-events-none"
        >
          <span
            className="text-base font-bold text-rose-100 border-2 border-rose-200 bg-rose-500/35 px-3 py-1 rounded-md"
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
            transition: "transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
            pointerEvents: isTop ? "auto" : "none",
            willChange: "transform",
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
