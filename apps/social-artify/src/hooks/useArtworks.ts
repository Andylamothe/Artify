"use client";

import { useState, useEffect } from "react";
import { useFeedStore } from "@/store/feedStore";
import { APP_BASE } from "@/lib/api";
import type { ArtProfile, Artwork } from "@/lib/types";

export function useArtworks(category?: string, profile?: ArtProfile) {
  const [isLoading, setIsLoading] = useState(false);
  const { artworks, setArtworks } = useFeedStore();

  useEffect(() => {
    queueMicrotask(() => setIsLoading(true));
    const search = new URLSearchParams();
    if (category && category !== "All") search.set("category", category);
    else if (profile) search.set("profile", profile);
    const params = search.toString() ? `?${search.toString()}` : "";
    fetch(`${APP_BASE}/api/artworks${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data: { artworks: Artwork[] }) => setArtworks(data.artworks ?? []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [category, profile, setArtworks]);

  return { artworks, isLoading };
}
