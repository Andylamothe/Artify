import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import type { Artwork } from "@/lib/types";
import { isArtProfile, rankArtworksForProfile } from "@/lib/artProfile";

function toClient(artwork: Artwork, userId?: string) {
  return {
    ...artwork,
    isLikedByMe: userId ? artwork.likedBy.includes(userId) : false,
    isDislikedByMe: userId ? artwork.dislikedBy.includes(userId) : false,
    isSavedByMe: userId ? artwork.savedBy.includes(userId) : false,
  };
}

/** GET /api/artworks?category=Baroque */
export async function GET(req: NextRequest) {
  const payload = await verifyToken(req);
  const userId = payload?.userId;
  const category = req.nextUrl.searchParams.get("category");
  const profile = req.nextUrl.searchParams.get("profile");

  let artworks = db.artworks.getAll();
  if (category && category !== "All")
    artworks = artworks.filter((a) =>
      category === "New 3D"
        ? a.has3D
        : a.categories.some((c) => c.toLowerCase().includes(category.toLowerCase()))
    );
  else if (isArtProfile(profile))
    artworks = rankArtworksForProfile(artworks, profile);

  return NextResponse.json({ artworks: artworks.map((a) => toClient(a, userId)) });
}
