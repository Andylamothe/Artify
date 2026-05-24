import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import type { Artwork } from "@/lib/types";

function toClient(artwork: Artwork, userId?: string) {
  return {
    ...artwork,
    isLikedByMe: userId ? artwork.likedBy.includes(userId) : false,
    isDislikedByMe: userId ? artwork.dislikedBy.includes(userId) : false,
    isSavedByMe: userId ? artwork.savedBy.includes(userId) : false,
  };
}

/** GET /api/artworks/[id] */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payload = await verifyToken(req);

  const artwork = db.artworks.getAll().find((a) => a.id === id);
  if (!artwork)
    return NextResponse.json({ error: "Artwork not found" }, { status: 404 });

  return NextResponse.json({ artwork: toClient(artwork, payload?.userId) });
}
