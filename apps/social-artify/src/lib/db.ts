import fs from "fs";
import path from "path";
import type { User, Artwork } from "./types";

const BUNDLED_DATA_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "data");
const DATA_DIR = process.env.SOCIAL_DATA_DIR ?? BUNDLED_DATA_DIR;

type StoredUser = User & { password: string };

function ensureDataFile(file: string): string {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const filePath = path.join(/* turbopackIgnore: true */ DATA_DIR, file);
  if (!fs.existsSync(filePath)) {
    const seedPath = path.join(BUNDLED_DATA_DIR, file);
    const seed = fs.existsSync(seedPath) ? fs.readFileSync(seedPath, "utf-8") : "[]";
    fs.writeFileSync(filePath, seed);
  }
  return filePath;
}

function read<T>(file: string): T[] {
  return JSON.parse(fs.readFileSync(ensureDataFile(file), "utf-8")) as T[];
}

function write<T>(file: string, data: T[]): void {
  fs.writeFileSync(ensureDataFile(file), JSON.stringify(data, null, 2));
}

function normalizeArtwork(artwork: Artwork): Artwork {
  return {
    ...artwork,
    likes: artwork.likes ?? artwork.likedBy?.length ?? 0,
    dislikes: artwork.dislikes ?? artwork.dislikedBy?.length ?? 0,
    likedBy: artwork.likedBy ?? [],
    dislikedBy: artwork.dislikedBy ?? [],
    savedBy: artwork.savedBy ?? [],
  };
}

export const db = {
  users: {
    getAll: () => read<StoredUser>("users.json"),
    save: (users: StoredUser[]) => write("users.json", users),
  },
  artworks: {
    getAll: () => read<Artwork>("artworks.json").map(normalizeArtwork),
    save: (artworks: Artwork[]) => write("artworks.json", artworks.map(normalizeArtwork)),
  },
};
