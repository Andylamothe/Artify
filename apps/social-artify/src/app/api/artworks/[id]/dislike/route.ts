import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await verifyToken(req);
  if (!payload) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { id } = await params;
  const artworks = db.artworks.getAll();
  const artwork = artworks.find((a) => a.id === id);
  if (!artwork) {
    return NextResponse.json({ error: "Artwork not found" }, { status: 404 });
  }

  const alreadyDisliked = artwork.dislikedBy.includes(payload.userId);
  if (alreadyDisliked) {
    artwork.dislikedBy = artwork.dislikedBy.filter((uid) => uid !== payload.userId);
    artwork.dislikes = Math.max(0, artwork.dislikes - 1);
  } else {
    if (artwork.likedBy.includes(payload.userId)) {
      artwork.likedBy = artwork.likedBy.filter((uid) => uid !== payload.userId);
      artwork.likes = Math.max(0, artwork.likes - 1);
    }
    artwork.dislikedBy.push(payload.userId);
    artwork.dislikes += 1;
  }

  db.artworks.save(artworks);
  return NextResponse.json({
    likes: artwork.likes,
    dislikes: artwork.dislikes,
    liked: false,
    disliked: !alreadyDisliked,
  });
}
