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
  const starryNightLike = isStarryNightArtwork(artwork);
  return {
    ...artwork,
    id: artwork.id || slugify(artwork.title || `artwork-${index + 1}`),
    title: starryNightLike ? "Starry Night" : artwork.title || `Artwork ${index + 1}`,
    artist: starryNightLike && artwork.artist === "Unknown artist" ? "Vincent van Gogh" : artwork.artist || "Unknown artist",
    year: starryNightLike && artwork.year === "2026" ? "1889" : artwork.year || "Unknown year",
    shortSummary: starryNightLike
      ? "A night landscape transformed into rhythmic motion through bold brushwork, contrast, and emotional color."
      : artwork.shortSummary || "Museum AR artwork.",
    historyText: starryNightLike
      ? "Created in Saint-Remy, the painting reflects van Gogh's expressive interpretation of the sky and remains one of the most recognized works in modern art history."
      : artwork.historyText || "Historical notes can be added from the workbench.",
    targetIndex: Number.isFinite(artwork.targetIndex) ? artwork.targetIndex : index,
    targetImageUrl:
      artwork.targetImageUrl ||
      (artwork.id === "mona-lisa" ? "/ar/images/workbench-demo-art.webp" : artwork.historicalImages?.[0]) ||
      "",
    audioUrl: starryNightLike ? artwork.audioUrl || "/ar/audio/starry-night.wav" : artwork.audioUrl || "",
    historicalImages: starryNightLike
      ? uniqueStrings([...(Array.isArray(artwork.historicalImages) ? artwork.historicalImages : []), artwork.targetImageUrl])
      : Array.isArray(artwork.historicalImages)
        ? artwork.historicalImages
        : [],
    arSceneType: starryNightLike ? "starryNight" : artwork.arSceneType || "monaLisa",
    colors: {
      primary: starryNightLike ? "#1F3C88" : artwork.colors?.primary || "#2f6f61",
      secondary: starryNightLike ? "#5A83E5" : artwork.colors?.secondary || "#d7ece4",
      accent: starryNightLike ? "#F7C948" : artwork.colors?.accent || "#d19a3a",
    },
    effects: {
      particleCount: clampNumber(artwork.effects?.particleCount, 0, 90, 45),
      lowPowerParticleCount: clampNumber(artwork.effects?.lowPowerParticleCount, 0, 36, 18),
      intensity: artwork.effects?.intensity === "medium" ? "medium" : "low",
    },
    arObjects: Array.isArray(artwork.arObjects)
      ? artwork.arObjects.map((object, objectIndex) => ({
          id: object.id || `object-${objectIndex + 1}`,
          name: object.name || `Object ${objectIndex + 1}`,
          type: object.type || "text",
          text: object.text || "",
          src: object.src || "",
          icon: object.icon || "",
          actionType: object.actionType || "none",
          actionUrl: object.actionUrl || "",
          brushPoints: Array.isArray(object.brushPoints)
            ? object.brushPoints
                .filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))
                .map((point) => ({
                  x: clampFloat(point.x, -3, 3, 0),
                  y: clampFloat(point.y, -3, 3, 0),
                }))
            : [],
          brushAnimation:
            object.brushAnimation === "pulse" || object.brushAnimation === "wave" ? object.brushAnimation : "flow",
          brushSpeed: clampFloat(object.brushSpeed, 0.1, 4, 1),
          brushWidth: clampFloat(object.brushWidth, 0.01, 0.16, 0.045),
          motionBrush: object.motionBrush
            ? {
                maskDataUrl: object.motionBrush.maskDataUrl || "",
                paths: Array.isArray(object.motionBrush.paths)
                  ? object.motionBrush.paths
                      .filter((path) => path?.from && path?.to)
                      .map((path, pathIndex) => ({
                        id: path.id || `motion-path-${pathIndex + 1}`,
                        from: {
                          x: clampFloat(path.from.x, 0, 1, 0),
                          y: clampFloat(path.from.y, 0, 1, 0),
                        },
                        to: {
                          x: clampFloat(path.to.x, 0, 1, 0),
                          y: clampFloat(path.to.y, 0, 1, 0),
                        },
                        speed: clampFloat(path.speed, 0.1, 5, 1),
                        force: clampFloat(path.force, 0, 2, 1),
                      }))
                  : [],
                settings: {
                  brushSize: clampFloat(object.motionBrush.settings?.brushSize, 1, 200, 42),
                  feather: clampFloat(object.motionBrush.settings?.feather, 0, 120, 18),
                  speed: clampFloat(object.motionBrush.settings?.speed, 0.1, 5, 1),
                  intensity: clampFloat(object.motionBrush.settings?.intensity, 0, 2, 0.55),
                  distortionStrength: clampFloat(object.motionBrush.settings?.distortionStrength, 0, 2, 0.42),
                  loopDuration: clampNumber(object.motionBrush.settings?.loopDuration, 300, 8000, 1800),
                  opacity: clampFloat(object.motionBrush.settings?.opacity, 0, 1, 1),
                },
                previewEnabled: !!object.motionBrush.previewEnabled,
              }
            : undefined,
          portfolioItems: Array.isArray(object.portfolioItems)
            ? object.portfolioItems
                .filter((item) => item?.src)
                .map((item, itemIndex) => ({
                  id: item.id || `portfolio-item-${itemIndex + 1}`,
                  title: item.title || `Artwork ${itemIndex + 1}`,
                  src: item.src,
                }))
            : [],
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

function isStarryNightArtwork(artwork: ArtworkConfig) {
  const fingerprint = `${artwork.id ?? ""} ${artwork.title ?? ""} ${artwork.targetImageUrl ?? ""}`.toLowerCase();
  return fingerprint.includes("starry-night") || fingerprint.includes("starring-night") || fingerprint.includes("starrynight");
}

function uniqueStrings(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => !!value)));
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
