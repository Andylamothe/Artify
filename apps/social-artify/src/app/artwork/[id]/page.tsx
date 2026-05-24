"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useAuth } from "@/hooks/useAuth";
import { useLike } from "@/hooks/useLike";
import { buildArExperienceUrl } from "@/lib/ar";
import { APP_BASE } from "@/lib/api";
import BottomNav from "@/components/layout/BottomNav";
import LikeButton from "@/components/social/LikeButton";
import AuthModal from "@/components/auth/AuthModal";
import type { Artwork } from "@/lib/types";

export default function ArtworkDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const user = useAuthStore((s) => s.user);
  const setPendingAction = useAuthStore((s) => s.setPendingAction);
  const setAuthModalOpen = useAuthStore((s) => s.setAuthModalOpen);

  useAuth();
  useLike(id);

  // Fetch artwork from the real API
  useEffect(() => {
    fetch(`${APP_BASE}/api/artworks/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.artwork) {
          setArtwork(data.artwork);
          setIsSaved(data.artwork.isSavedByMe ?? false);
        }
      })
      .catch(console.error);
  }, [id]);

  const handleSave = async () => {
    if (!user) {
      setPendingAction({ type: "save", artworkId: id });
      setAuthModalOpen(true);
      return;
    }
    const res = await fetch(`${APP_BASE}/api/artworks/${id}/save`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();
    setIsSaved(data.saved);
  };

  const handle3D = () => {
    if (!artwork?.has3D || !artwork.arWebId) return;
    window.open(buildArExperienceUrl(artwork.arWebId), "_blank");
  };

  if (!artwork) {
    return (
      <div className="flex items-center justify-center h-dvh bg-background">
        <p className="text-muted">Artwork not found.</p>
      </div>
    );
  }

  const categoryLabel = artwork.categories.join(" · ").toUpperCase();

  return (
    <div className="flex flex-col min-h-dvh bg-background lg:pl-50 lg:h-dvh lg:overflow-hidden">

      {/* ── Header desktop ── */}
      <div className="hidden lg:flex items-center justify-between px-8 h-14 shrink-0 border-b border-border bg-background">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted text-sm font-medium hover:text-text transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="w-9 h-9 rounded-full flex items-center justify-center border border-border bg-surface hover:bg-border transition-colors"
            aria-label={isSaved ? "Remove bookmark" : "Save artwork"}
          >
            <svg width="17" height="17" viewBox="0 0 24 24"
              fill={isSaved ? "currentColor" : "none"} stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
            </svg>
          </button>
          <button
            onClick={() => navigator.share?.({ title: artwork.title, url: window.location.href })}
            className="w-9 h-9 rounded-full flex items-center justify-center border border-border bg-surface hover:bg-border transition-colors"
            aria-label="Share"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex flex-col flex-1 min-h-0 lg:flex-row lg:overflow-hidden">

        {/* ── Hero image ── */}
        <div className="relative shrink-0 h-[55dvh] lg:h-full lg:w-1/2 lg:shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artwork.imageUrl}
            alt={artwork.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-x-0 top-0 h-24"
            style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%)" }}
          />

          {/* Back — mobile */}
          <button
            onClick={() => router.back()}
            className="lg:hidden absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}
            aria-label="Go back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Bookmark + Share — mobile */}
          <div className="lg:hidden absolute top-4 right-4 flex gap-2">
            <button
              onClick={handleSave}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}
              aria-label={isSaved ? "Remove bookmark" : "Save artwork"}
            >
              <svg width="17" height="17" viewBox="0 0 24 24"
                fill={isSaved ? "white" : "none"} stroke="white"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
              </svg>
            </button>
            <button
              onClick={() => navigator.share?.({ title: artwork.title, url: window.location.href })}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}
              aria-label="Share"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Detail panel ── */}
        <div className="flex-1 px-5 pt-5 pb-32 relative lg:w-1/2 lg:overflow-y-auto lg:pb-10 lg:pt-8 lg:px-10">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#810B38", fontFamily: "var(--font-serif)" }}>
            {artwork.year} · {categoryLabel}
          </p>
          <h1 className="text-text font-bold leading-tight mb-1" style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(1.5rem, 4vw, 2.25rem)" }}>
            {artwork.title}
          </h1>
          <p className="text-muted text-sm mb-4">
            <span className="font-medium" style={{ color: "#1A1A1A" }}>{artwork.artistName}</span>
            {artwork.museum && <span> · {artwork.museum}{artwork.location ? `, ${artwork.location}` : ""}</span>}
          </p>

          {artwork.has3D && artwork.arWebId && (
            <button
              onClick={handle3D}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-text text-surface rounded-full font-semibold text-sm mb-5 active:scale-95 transition-transform"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              View in 3D
            </button>
          )}

          <div className="h-px bg-border mb-4" />

          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-0.5">Medium</p>
              <p className="text-sm text-text">{artwork.medium}</p>
            </div>
            {artwork.dimensions && (
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-0.5">Dimensions</p>
                <p className="text-sm text-text">{artwork.dimensions}</p>
              </div>
            )}
          </div>

          <div className="mb-5">
            <LikeButton artworkId={id} showCount />
          </div>

          {artwork.description && (
            <>
              <div className="h-px bg-border mb-4" />
              <p className="text-sm text-muted leading-relaxed">{artwork.description}</p>
            </>
          )}
        </div>
      </div>

      <button
        className="fixed bottom-24 right-5 w-10 h-10 rounded-full bg-surface border border-border shadow-md flex items-center justify-center text-muted text-sm font-medium z-10 lg:bottom-8"
        aria-label="Information"
      >
        ?
      </button>

      <BottomNav />
      <AuthModal />
    </div>
  );
}
