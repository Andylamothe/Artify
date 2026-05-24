import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Artwork } from "@/lib/types";

type AdminArtworkPayload = Partial<Artwork> & {
  id?: string;
  duplicateFromId?: string;
  deleteId?: string;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function uniqueId(base: string, artworks: Artwork[]) {
  const root = slugify(base) || "artwork";
  const used = new Set(artworks.map((artwork) => artwork.id));
  if (!used.has(root)) return root;

  let index = 2;
  while (used.has(`${root}-${index}`)) index += 1;
  return `${root}-${index}`;
}

function normalizeCategories(categories: unknown): string[] {
  if (Array.isArray(categories)) {
    return categories.map(String).map((item) => item.trim()).filter(Boolean);
  }
  if (typeof categories === "string") {
    return categories.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function buildArtwork(payload: AdminArtworkPayload, existing: Artwork | undefined, artworks: Artwork[]): Artwork {
  const title = String(payload.title ?? existing?.title ?? "Untitled artwork").trim() || "Untitled artwork";
  const id = existing?.id ?? uniqueId(payload.id || title, artworks);

  return {
    id,
    title,
    artistName: String(payload.artistName ?? existing?.artistName ?? "Unknown artist").trim() || "Unknown artist",
    artistId: String(payload.artistId ?? existing?.artistId ?? "admin-created").trim() || "admin-created",
    medium: String(payload.medium ?? existing?.medium ?? "Mixed media").trim() || "Mixed media",
    year: Number(payload.year ?? existing?.year ?? new Date().getFullYear()),
    dimensions: String(payload.dimensions ?? existing?.dimensions ?? "").trim() || undefined,
    museum: String(payload.museum ?? existing?.museum ?? "").trim() || undefined,
    location: String(payload.location ?? existing?.location ?? "").trim() || undefined,
    categories: normalizeCategories(payload.categories ?? existing?.categories ?? []),
    galleryLocation: {
      floor: Number(payload.galleryLocation?.floor ?? existing?.galleryLocation?.floor ?? 1),
      section: String(payload.galleryLocation?.section ?? existing?.galleryLocation?.section ?? "Main Hall").trim() || "Main Hall",
      piece: String(payload.galleryLocation?.piece ?? existing?.galleryLocation?.piece ?? "A").trim() || "A",
    },
    imageUrl: String(payload.imageUrl ?? existing?.imageUrl ?? "").trim(),
    isHidden: Boolean(payload.isHidden ?? existing?.isHidden ?? false),
    has3D: Boolean(payload.has3D ?? existing?.has3D ?? false),
    arWebId: String(payload.arWebId ?? existing?.arWebId ?? "").trim() || undefined,
    description: String(payload.description ?? existing?.description ?? "").trim() || undefined,
    likes: Number(existing?.likes ?? payload.likes ?? 0),
    dislikes: Number(existing?.dislikes ?? payload.dislikes ?? 0),
    likedBy: existing?.likedBy ?? [],
    dislikedBy: existing?.dislikedBy ?? [],
    savedBy: existing?.savedBy ?? [],
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
}

export async function GET() {
  return NextResponse.json({ artworks: db.artworks.getAll() });
}

export async function POST(req: NextRequest) {
  const payload = (await req.json()) as AdminArtworkPayload;
  const artworks = db.artworks.getAll();

  if (payload.deleteId) {
    const next = artworks.filter((artwork) => artwork.id !== payload.deleteId);
    db.artworks.save(next);
    return NextResponse.json({ artworks: next });
  }

  if (payload.duplicateFromId) {
    const source = artworks.find((artwork) => artwork.id === payload.duplicateFromId);
    if (!source) return NextResponse.json({ error: "Artwork not found" }, { status: 404 });
    const clone = {
      ...source,
      id: uniqueId(`${source.id}-copy`, artworks),
      title: `${source.title} Copy`,
      has3D: false,
      arWebId: undefined,
      likes: 0,
      dislikes: 0,
      likedBy: [],
      dislikedBy: [],
      savedBy: [],
      createdAt: new Date().toISOString(),
    };
    const next = [clone, ...artworks];
    db.artworks.save(next);
    return NextResponse.json({ artwork: clone, artworks: next });
  }

  const existing = payload.id ? artworks.find((artwork) => artwork.id === payload.id) : undefined;
  const saved = buildArtwork(payload, existing, artworks);
  const next = existing
    ? artworks.map((artwork) => (artwork.id === saved.id ? saved : artwork))
    : [saved, ...artworks];
  db.artworks.save(next);

  return NextResponse.json({ artwork: saved, artworks: next });
}
