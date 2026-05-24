"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFeedStore } from "@/store/feedStore";
import { useAuthStore } from "@/store/authStore";
import { useAuth } from "@/hooks/useAuth";
import { useArtworks } from "@/hooks/useArtworks";
import { buildArModeUrl } from "@/lib/ar";
import { ART_PROFILE_META } from "@/lib/artProfile";
import type { Artwork } from "@/lib/types";

import TopBar from "@/components/layout/TopBar";
import BottomNav from "@/components/layout/BottomNav";
import SwipeDeck, { type SwipeDeckHandle } from "@/components/artwork/SwipeDeck";
import ActionBar from "@/components/social/ActionBar";
import GuestBanner from "@/components/auth/GuestBanner";
import AuthModal from "@/components/auth/AuthModal";

export default function DiscoverPage() {
  const router = useRouter();
  const deckRef = useRef<SwipeDeckHandle>(null);

  const activeCategory = useFeedStore((s) => s.activeCategory);
  const setCategory = useFeedStore((s) => s.setCategory);
  const likeArtwork = useFeedStore((s) => s.likeArtwork);
  const user = useAuthStore((s) => s.user);
  const isGuest = useAuthStore((s) => s.isGuest);
  const guestSessionId = useAuthStore((s) => s.guestSessionId);
  const guestArtProfile = useAuthStore((s) => s.guestArtProfile);
  const setShowQuiz = useAuthStore((s) => s.setShowQuiz);
  const setPendingAction = useAuthStore((s) => s.setPendingAction);
  const setAuthModalOpen = useAuthStore((s) => s.setAuthModalOpen);
  const activeArtProfile = user?.artProfile ?? guestArtProfile ?? undefined;
  const { artworks: filtered } = useArtworks(activeCategory, activeArtProfile);

  const [currentArtwork, setCurrentArtwork] = useState<Artwork | null>(null);
  const [seenArtworkIds, setSeenArtworkIds] = useState<string[]>([]);
  const [likedArtworkIds, setLikedArtworkIds] = useState<string[]>([]);
  const [showJourneySummary, setShowJourneySummary] = useState(false);
  const [deckVersion, setDeckVersion] = useState(0);
  const handleTopCardChange = useCallback((artwork: Artwork | null) => {
    setCurrentArtwork(artwork);
  }, []);

  useAuth();

  useEffect(() => {
    setCategory("All");
  }, [setCategory]);

  const handleLike = useCallback(
    (artwork: Artwork) => {
      const actorId = user?.id ?? (isGuest ? guestSessionId : null);
      if (!actorId) {
        setPendingAction({ type: "like", artworkId: artwork.id });
        setAuthModalOpen(true);
        return;
      }
      likeArtwork(artwork.id, actorId);
      setLikedArtworkIds((prev) => (prev.includes(artwork.id) ? prev : [...prev, artwork.id]));
      setSeenArtworkIds((prev) => (prev.includes(artwork.id) ? prev : [...prev, artwork.id]));
    },
    [user, isGuest, guestSessionId, likeArtwork, setPendingAction, setAuthModalOpen]
  );

  const handlePass = useCallback((artwork: Artwork) => {
    setSeenArtworkIds((prev) => (prev.includes(artwork.id) ? prev : [...prev, artwork.id]));
  }, []);

  const handleCardTap = useCallback(
    (artwork: Artwork) => {
      router.push(`/artwork/${artwork.id}`);
    },
    [router]
  );

  const handleActionBarPass = () => {
    const artwork = deckRef.current?.topArtwork;
    if (artwork) handlePass(artwork);
    deckRef.current?.advance();
  };

  const handleActionBarLike = () => {
    const artwork = deckRef.current?.topArtwork;
    if (!artwork) return;
    handleLike(artwork);
    deckRef.current?.advance();
  };

  const handleDeckComplete = () => {
    setShowJourneySummary(true);
  };

  const handleRestartJourney = () => {
    setShowJourneySummary(false);
    setSeenArtworkIds([]);
    setLikedArtworkIds([]);
    setDeckVersion((v) => v + 1);
  };

  const artworkById = new Map(filtered.map((artwork) => [artwork.id, artwork]));
  const likedArtworks = likedArtworkIds
    .map((artworkId) => artworkById.get(artworkId))
    .filter((artwork): artwork is Artwork => Boolean(artwork));
  const floorMap = likedArtworks.reduce<Record<number, Artwork[]>>((acc, artwork) => {
    const floor = artwork.galleryLocation?.floor ?? 1;
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(artwork);
    return acc;
  }, {});
  const sortedFloors = Object.keys(floorMap)
    .map(Number)
    .sort((a, b) => a - b);
  const topForActionBar = showJourneySummary ? null : currentArtwork ?? filtered[0] ?? null;

  return (
    <div className="flex flex-col h-dvh bg-background overflow-hidden lg:pl-50">
      <TopBar />

      {!showJourneySummary && activeArtProfile && activeCategory === "All" && (
        <div className="flex shrink-0 items-center gap-2 px-4 pb-2">
          <div className="flex items-center gap-1.5 rounded-full bg-[#F3E1E8] px-3 py-1.5 text-xs font-semibold text-primary">
            <span className="material-icons" style={{ fontSize: "13px", lineHeight: 1 }}>
              {ART_PROFILE_META[activeArtProfile].icon}
            </span>
            {ART_PROFILE_META[activeArtProfile].name} recommendations
          </div>
          <button
            onClick={() => setShowQuiz(true)}
            className="text-[11px] font-semibold text-muted underline underline-offset-2 active:opacity-70"
          >
            Retake
          </button>
        </div>
      )}

      <p className="text-center text-[11px] font-semibold tracking-widest text-muted/60 uppercase pt-1 pb-0.5 shrink-0 lg:hidden">
        Swipe to vote · Tap to view
      </p>

      <div className="flex-1 relative px-4 pt-2 pb-1 min-h-0 lg:flex lg:items-center lg:justify-center">
        <div className="relative w-full h-full lg:max-w-110 lg:h-full">
          {showJourneySummary ? (
            <div className="h-full overflow-y-auto rounded-2xl border border-border bg-[#F8EBDD] shadow-[0_18px_48px_rgba(55,29,16,0.16)]">
              <div className="sticky top-0 z-10 border-b border-border/60 bg-[#F8EBDD]/95 px-4 py-4 backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted/70">
                      Visit Summary
                    </p>
                    <h2 className="mt-1 text-2xl font-bold leading-none text-primary" style={{ fontFamily: "var(--font-serif)" }}>
                      Your Art Journey
                    </h2>
                  </div>
                  <div className="min-w-17 rounded-2xl bg-primary px-3 py-2 text-center text-white">
                    <p className="text-2xl font-bold leading-none">{likedArtworks.length}</p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-80">liked</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-border/70 bg-background/75 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted/70">Reviewed</p>
                    <p className="mt-1 text-sm font-semibold text-text">
                      {seenArtworkIds.length} artwork{seenArtworkIds.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/75 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted/70">Floors</p>
                    <p className="mt-1 text-sm font-semibold text-text">
                      {sortedFloors.length} stop{sortedFloors.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <a
                  href={buildArModeUrl()}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-white shadow-sm active:scale-[0.98]"
                >
                  <span className="material-icons" style={{ fontSize: "18px", lineHeight: 1 }}>view_in_ar</span>
                  Go to AR mode
                </a>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={handleRestartJourney}
                    className="rounded-full border border-primary/20 bg-background px-4 py-2.5 text-sm font-bold text-primary shadow-sm active:scale-[0.98]"
                  >
                    Restart
                  </button>
                  <button
                    onClick={() => setShowQuiz(true)}
                    className="rounded-full border border-border bg-[#F1E2D1] px-4 py-2.5 text-sm font-bold text-primary shadow-sm active:scale-[0.98]"
                  >
                    Retake Quiz
                  </button>
                </div>
              </div>

              {likedArtworks.length === 0 ? (
                <div className="px-4 py-6">
                  <div className="rounded-2xl border border-border bg-background px-4 py-5 text-center">
                    <span className="material-icons text-primary" style={{ fontSize: "34px", lineHeight: 1 }}>favorite_border</span>
                    <p className="mt-2 text-sm font-semibold text-primary">No likes yet</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      Restart Discover and pick your favorites to build your museum route.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 px-4 py-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted/70">
                        Liked Works
                      </p>
                    </div>
                    {likedArtworks.map((artwork) => (
                      <div key={artwork.id} className="flex gap-3 rounded-2xl border border-border bg-background p-3 shadow-sm">
                        <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-surface">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={artwork.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-primary">{artwork.title}</p>
                              <p className="truncate text-xs text-muted">{artwork.artistName}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-[10px] font-bold text-muted">
                              F{artwork.galleryLocation?.floor ?? 1}
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-snug text-muted">
                            {artwork.galleryLocation?.section ?? "Main Hall"} · Piece {artwork.galleryLocation?.piece ?? "A"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted/70">
                        Museum Map
                      </p>
                      <p className="text-xs font-semibold text-primary">
                        {likedArtworks.length} stop{likedArtworks.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {sortedFloors.map((floor) => (
                        <div key={floor} className="rounded-2xl border border-border bg-background p-3 shadow-sm">
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                              {floor}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-primary">Floor {floor}</p>
                              <p className="text-xs text-muted">
                                {floorMap[floor].length} piece{floorMap[floor].length === 1 ? "" : "s"} to see
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 space-y-1.5">
                            {floorMap[floor].map((art) => (
                              <div key={art.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface/70 px-3 py-2 text-xs">
                                <span className="min-w-0 truncate font-semibold text-text">{art.title}</span>
                                <span className="shrink-0 text-muted">
                                  {art.galleryLocation?.section ?? "Main Hall"} · {art.galleryLocation?.piece ?? "A"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <SwipeDeck
              key={deckVersion}
              ref={deckRef}
              artworks={filtered}
              onLike={handleLike}
              onPass={handlePass}
              onCardTap={handleCardTap}
              onTopCardChange={handleTopCardChange}
              onDeckComplete={handleDeckComplete}
            />
          )}
        </div>
      </div>

      {!showJourneySummary && (
        <ActionBar
          artwork={topForActionBar}
          onPass={handleActionBarPass}
          onLike={handleActionBarLike}
        />
      )}

      {!showJourneySummary && <GuestBanner />}
      {!showJourneySummary && <div className="h-24 shrink-0 lg:hidden" />}
      <BottomNav />
      <AuthModal />
    </div>
  );
}
