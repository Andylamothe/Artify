"use client";
import { useState } from "react";
import type { Artwork } from "@/lib/types";

interface ArtworkCardProps {
  artwork: Artwork;
  compact?: boolean;
}

export default function ArtworkCard({ artwork, compact }: ArtworkCardProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        borderRadius: "var(--radius-card, 12px)",
        /* warm dark brown shows while image loads */
        backgroundColor: "#2A160B",
      }}
    >
      {/* Image — fades in when loaded */}
      {artwork.imageUrl && !errored && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={artwork.imageUrl}
          alt={artwork.title}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
          loading="eager"
          style={{
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.5s ease",
          }}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      )}

      {/* Warm gradient overlay — always visible, acts as loading skeleton too */}
      <div
        className="absolute inset-0"
        style={{
          background: loaded && !errored
            ? "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)"
            : "linear-gradient(to top, rgba(18,10,4,0.96) 0%, rgba(42,22,11,0.6) 60%, rgba(42,22,11,0.3) 100%)",
        }}
      />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {artwork.location && (
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
              {artwork.location}
            </span>
          )}
          <span className="text-[10px] font-semibold bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
            {artwork.year}
          </span>
          {artwork.has3D && (
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "#810B38" }}
            >
              3D READY
            </span>
          )}
        </div>

        {/* Title */}
        <h2
          className={`text-white font-bold leading-tight ${compact ? "text-xl" : "text-[1.6rem]"}`}
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {artwork.title}
        </h2>

        {/* Artist + medium */}
        <p className="text-white/70 text-sm mt-1">
          {artwork.artistName}
          {!compact && artwork.medium && (
            <span className="text-white/45"> · {artwork.medium}</span>
          )}
        </p>
      </div>
    </div>
  );
}
