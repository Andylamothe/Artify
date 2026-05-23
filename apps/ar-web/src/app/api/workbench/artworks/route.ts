import { artworks } from "@/data/artworks";
import { ArtworkConfig, WorkbenchManifest } from "@/types/ar";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const manifestPath = path.join(process.cwd(), "public", "ar", "workbench", "artworks.json");

function createDefaultManifest(): WorkbenchManifest {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    mindFile: "/ar/targets/artworks.mind",
    artworks,
  };
}

async function readManifest(): Promise<WorkbenchManifest> {
  try {
    const raw = await readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw) as WorkbenchManifest;
    if (!Array.isArray(parsed.artworks)) return createDefaultManifest();
    return {
      version: 1,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      mindFile: parsed.mindFile || "/ar/targets/artworks.mind",
      artworks: parsed.artworks.map(normalizeArtwork),
    };
  } catch {
    return createDefaultManifest();
  }
}

function normalizeArtwork(artwork: ArtworkConfig, index: number): ArtworkConfig {
  return {
    ...artwork,
    id: artwork.id || slugify(artwork.title || `artwork-${index + 1}`),
    title: artwork.title || `Artwork ${index + 1}`,
    artist: artwork.artist || "Unknown artist",
    year: artwork.year || "Unknown year",
    shortSummary: artwork.shortSummary || "Museum AR artwork.",
    historyText: artwork.historyText || "Historical notes can be added from the workbench.",
    targetIndex: Number.isFinite(artwork.targetIndex) ? artwork.targetIndex : index,
    targetImageUrl:
      artwork.targetImageUrl ||
      (artwork.id === "mona-lisa" ? "/ar/images/workbench-demo-art.webp" : artwork.historicalImages?.[0]) ||
      "",
    audioUrl: artwork.audioUrl || "",
    historicalImages: Array.isArray(artwork.historicalImages) ? artwork.historicalImages : [],
    arSceneType: artwork.arSceneType || "monaLisa",
    colors: {
      primary: artwork.colors?.primary || "#2f6f61",
      secondary: artwork.colors?.secondary || "#d7ece4",
      accent: artwork.colors?.accent || "#d19a3a",
    },
    effects: {
      particleCount: clampNumber(artwork.effects?.particleCount, 20, 150, 80),
      lowPowerParticleCount: clampNumber(artwork.effects?.lowPowerParticleCount, 10, 80, 35),
      intensity: artwork.effects?.intensity === "medium" ? "medium" : "low",
    },
    arObjects: Array.isArray(artwork.arObjects)
      ? artwork.arObjects.map((object, objectIndex) => ({
          id: object.id || `object-${objectIndex + 1}`,
          name: object.name || `Object ${objectIndex + 1}`,
          type: object.type || "text",
          text: object.text || "",
          src: object.src || "",
          color: object.color || "#ffffff",
          opacity: clampFloat(object.opacity, 0.05, 1, 1),
          width: clampFloat(object.width, 0.05, 3, 0.5),
          height: clampFloat(object.height, 0.05, 3, 0.25),
          position: {
            x: clampFloat(object.position?.x, -2, 2, 0),
            y: clampFloat(object.position?.y, -2, 2, 0),
            z: clampFloat(object.position?.z, -1, 2, 0.12),
          },
          rotation: {
            x: clampNumber(object.rotation?.x, -180, 180, 0),
            y: clampNumber(object.rotation?.y, -180, 180, 0),
            z: clampNumber(object.rotation?.z, -180, 180, 0),
          },
          scale: {
            x: clampFloat(object.scale?.x, 0.05, 5, 1),
            y: clampFloat(object.scale?.y, 0.05, 5, 1),
            z: clampFloat(object.scale?.z, 0.05, 5, 1),
          },
        }))
      : [],
  };
}

export async function GET() {
  const manifest = await readManifest();
  return Response.json(manifest);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<WorkbenchManifest>;
  const normalized: WorkbenchManifest = {
    version: 1,
    updatedAt: new Date().toISOString(),
    mindFile: body.mindFile || "/ar/targets/artworks.mind",
    artworks: (body.artworks ?? []).map(normalizeArtwork),
  };

  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return Response.json(normalized);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function clampNumber(value: number | undefined, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value as number)));
}

function clampFloat(value: number | undefined, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Number((value as number).toFixed(3))));
}
