import type { ArtProfile, Artwork } from "./types";

export const ART_PROFILE_META: Record<
  ArtProfile,
  { name: string; icon: string; description: string; categories: string[] }
> = {
  renaissance: {
    name: "Renaissance",
    icon: "architecture",
    description: "You gravitate toward harmony, craft, portraiture, and classical balance.",
    categories: ["Renaissance", "Baroque", "Italian Baroque", "Portraits"],
  },
  modern: {
    name: "Modern",
    icon: "brush",
    description: "You like expressive brushwork, emotion, and artworks that feel alive.",
    categories: ["Post-Impressionism", "Expressionism", "Modern", "New 3D"],
  },
  abstract: {
    name: "Abstract",
    icon: "auto_awesome",
    description: "Color, rhythm, shape, and atmosphere matter more to you than literal subjects.",
    categories: ["Abstract", "Contemporary", "Minimalism", "Post-Impressionism"],
  },
  surreal: {
    name: "Surreal",
    icon: "psychology",
    description: "You are drawn to mystery, dream logic, symbolism, and unexpected images.",
    categories: ["Surrealism", "Symbolism", "Expressionism", "New 3D"],
  },
};

export const ART_PROFILES = Object.keys(ART_PROFILE_META) as ArtProfile[];

export function isArtProfile(value: unknown): value is ArtProfile {
  return typeof value === "string" && ART_PROFILES.includes(value as ArtProfile);
}

export function getArtworkProfileScore(artwork: Artwork, profile: ArtProfile): number {
  const targets = ART_PROFILE_META[profile].categories.map((category) => category.toLowerCase());
  return artwork.categories.reduce((score, category) => {
    const normalized = category.toLowerCase();
    return targets.some((target) => normalized.includes(target) || target.includes(normalized))
      ? score + 1
      : score;
  }, 0);
}

export function rankArtworksForProfile(artworks: Artwork[], profile?: ArtProfile): Artwork[] {
  if (!profile) return artworks;
  return [...artworks].sort((a, b) => {
    const scoreDiff = getArtworkProfileScore(b, profile) - getArtworkProfileScore(a, profile);
    if (scoreDiff !== 0) return scoreDiff;
    return b.likes - a.likes;
  });
}
