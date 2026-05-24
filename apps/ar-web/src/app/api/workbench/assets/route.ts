import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/bmp",
  "image/svg+xml",
  "image/tiff",
  "image/heic",
  "image/heif",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "video/mp4",
  "video/webm",
  "model/gltf-binary",
  "model/gltf+json",
  "application/octet-stream",
]);

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("asset");
  const artworkId = sanitizeSegment(String(formData.get("artworkId") || "shared"));

  if (!(file instanceof File)) {
    return Response.json({ error: "asset is required" }, { status: 400 });
  }

  if (file.type && !allowedTypes.has(file.type)) {
    return Response.json({ error: `Unsupported asset type: ${file.type}` }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length === 0) {
    return Response.json({ error: "Asset is empty." }, { status: 400 });
  }

  const extension = extensionFor(file);
  const baseName = sanitizeSegment(file.name.replace(/\.[^/.]+$/, "")) || "asset";
  const fileName = `${Date.now()}-${baseName}${extension}`;
  const relativeDir = path.join("ar", "workbench", "assets", artworkId);
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);
  const absolutePath = path.join(absoluteDir, fileName);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(absolutePath, bytes);

  return Response.json({
    ok: true,
    url: `/${relativeDir.replaceAll(path.sep, "/")}/${fileName}`,
    bytes: bytes.length,
    type: file.type || "application/octet-stream",
  });
}

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function extensionFor(file: File) {
  const fromName = file.name.match(/\.[a-z0-9]+$/i)?.[0];
  if (fromName) return fromName.toLowerCase();
  if (file.type === "image/jpeg") return ".jpg";
  if (file.type === "image/png") return ".png";
  if (file.type === "image/webp") return ".webp";
  if (file.type === "image/gif") return ".gif";
  if (file.type === "image/avif") return ".avif";
  if (file.type === "image/bmp") return ".bmp";
  if (file.type === "image/svg+xml") return ".svg";
  if (file.type === "image/tiff") return ".tiff";
  if (file.type === "image/heic") return ".heic";
  if (file.type === "image/heif") return ".heif";
  if (file.type.includes("wav")) return ".wav";
  if (file.type.includes("mpeg") || file.type.includes("mp3")) return ".mp3";
  if (file.type === "video/webm") return ".webm";
  if (file.type === "video/mp4") return ".mp4";
  if (file.type === "model/gltf-binary") return ".glb";
  return ".bin";
}
