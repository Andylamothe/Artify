"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useFeedStore } from "@/store/feedStore";
import { useAuthStore } from "@/store/authStore";
import { useAuth } from "@/hooks/useAuth";
import { useArtworks } from "@/hooks/useArtworks";
import { ART_PROFILE_META } from "@/lib/artProfile";
import type { Artwork } from "@/lib/types";

import TopBar from "@/components/layout/TopBar";
import BottomNav from "@/components/layout/BottomNav";
import CategoryFilter from "@/components/artwork/CategoryFilter";
import SwipeDeck, { type SwipeDeckHandle } from "@/components/artwork/SwipeDeck";
import ActionBar from "@/components/social/ActionBar";
import GuestBanner from "@/components/auth/GuestBanner";
import AuthModal from "@/components/auth/AuthModal";

export default function DiscoverPage() {
  const router = useRouter();
  const deckRef = useRef<SwipeDeckHandle>(null);

  const activeCategory = useFeedStore((s) => s.activeCategory);
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
  const [showJourneySummary, setShowJourneySummary] = useState(false);
  const [deckVersion, setDeckVersion] = useState(0);
  const handleTopCardChange = useCallback((artwork: Artwork | null) => {
    setCurrentArtwork(artwork);
  }, []);

  useAuth();

  const handleLike = useCallback(
    (artwork: Artwork) => {
      const actorId = user?.id ?? (isGuest ? guestSessionId : null);
      if (!actorId) {
        setPendingAction({ type: "like", artworkId: artwork.id });
        setAuthModalOpen(true);
        return;
      }
      likeArtwork(artwork.id, actorId);
    },
    [user, isGuest, guestSessionId, likeArtwork, setPendingAction, setAuthModalOpen]
  );

  const handlePass = useCallback((artwork: Artwork) => {
    setSeenArtworkIds((prev) => (prev.includes(artwork.id) ? prev : [...prev, artwork.id]));
    // pass needs no store update in the feed view
  }, []);

  const handleCardTap = useCallback(
    (artwork: Artwork) => {
      router.push(`/artwork/${artwork.id}`);
    },
    [router]
  );

  const handleActionBarPass = () => {
    deckRef.current?.advance();
  };

  const handleActionBarLike = () => {
    const artwork = deckRef.current?.topArtwork;
    if (!artwork) return;
    handleLike(artwork);
    setSeenArtworkIds((prev) => (prev.includes(artwork.id) ? prev : [...prev, artwork.id]));
    deckRef.current?.advance();
  };

  const handleDeckComplete = () => {
    setShowJourneySummary(true);
  };

  const actorId = user?.id ?? (isGuest ? guestSessionId : null);
  const likedArtworks = filtered.filter((artwork) =>
    actorId ? artwork.likedBy.includes(actorId) : false
  );
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
      <CategoryFilter />

      {activeArtProfile && activeCategory === "All" && (
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
            <div className="h-full overflow-y-auto rounded-2xl border border-border bg-surface px-4 py-5">
              <h2 className="text-xl font-bold text-primary" style={{ fontFamily: "var(--font-serif)" }}>
                Your Art Journey
              </h2>
              <p className="mt-1 text-sm text-muted">
                You liked {likedArtworks.length} artwork{likedArtworks.length === 1 ? "" : "s"}.
              </p>
              <p className="text-xs text-muted mt-1">
                You reviewed {seenArtworkIds.length} artwork{seenArtworkIds.length === 1 ? "" : "s"} in this run.
              </p>

              {likedArtworks.length === 0 ? (
                <p className="mt-4 text-sm text-muted">
                  No likes yet. Swipe again and pick your favorites.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    {likedArtworks.map((artwork) => (
                      <div key={artwork.id} className="rounded-xl border border-border bg-background p-3">
                        <p className="font-semibold text-sm text-primary">{artwork.title}</p>
                        <p className="text-xs text-muted">{artwork.artistName}</p>
                        <p className="text-xs text-muted mt-1">
                          Floor {artwork.galleryLocation?.floor ?? 1} · {artwork.galleryLocation?.section ?? "Main Hall"} · Piece {artwork.galleryLocation?.piece ?? "A"}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-border bg-background p-3">
                    <p className="text-sm font-semibold text-primary mb-2">Museum Map</p>
                    <div className="space-y-2">
                      {sortedFloors.map((floor) => (
                        <div key={floor} className="rounded-lg border border-border/70 bg-surface p-2.5">
                          <p className="text-xs font-bold tracking-wide uppercase text-muted">Floor {floor}</p>
                          <div className="mt-2 space-y-1.5">
                            {floorMap[floor].map((art) => (
                              <div key={art.id} className="flex items-center justify-between text-xs">
                                <span className="font-medium text-primary">{art.title}</span>
                                <span className="text-muted">
                                  {art.galleryLocation?.section ?? "Main Hall"} · Piece {art.galleryLocation?.piece ?? "A"}
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

              <div className="mt-5 flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowJourneySummary(false);
                    setSeenArtworkIds([]);
                    setDeckVersion((v) => v + 1);
                  }}
                  className="px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold"
                >
                  Restart Discover
                </button>
                <button
                  onClick={() => setShowQuiz(true)}
                  className="px-4 py-2 rounded-full border border-border text-sm font-semibold text-primary"
                >
                  Retake Quiz
                </button>
              </div>
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

      <ActionBar
        artwork={topForActionBar}
        onPass={handleActionBarPass}
        onLike={handleActionBarLike}
      />

      <GuestBanner />
      <div className="h-24 shrink-0 lg:hidden" />
      <BottomNav />
      <AuthModal />
    </div>
  );
}
