import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const assetsRoot = path.join(process.cwd(), "public", "ar", "workbench", "assets");

type RouteContext = {
  params: Promise<{ assetPath?: string[] }>;
};

export async function GET(request: Request, context: RouteContext) {
  return serveAsset(request, context, false);
}

export async function HEAD(request: Request, context: RouteContext) {
  return serveAsset(request, context, true);
}

async function serveAsset(request: Request, context: RouteContext, headOnly: boolean) {
  const params = await context.params;
  const parts = params.assetPath ?? [];
  const absolutePath = resolveSafeAssetPath(parts);
  if (!absolutePath) return Response.json({ error: "Invalid asset path." }, { status: 400 });

  try {
    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile()) return Response.json({ error: "Asset not found." }, { status: 404 });

    const contentType = contentTypeFor(absolutePath);
    const range = request.headers.get("range");
    const commonHeaders = {
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    };

    if (range) {
      const parsed = parseRange(range, fileStat.size);
      if (!parsed) {
        return new Response(null, {
          status: 416,
          headers: {
            ...commonHeaders,
            "Content-Range": `bytes */${fileStat.size}`,
          },
        });
      }
      const bytes = headOnly ? Buffer.alloc(0) : (await readFile(absolutePath)).subarray(parsed.start, parsed.end + 1);
      return new Response(bytes, {
        status: 206,
        headers: {
          ...commonHeaders,
          "Content-Length": String(parsed.end - parsed.start + 1),
          "Content-Range": `bytes ${parsed.start}-${parsed.end}/${fileStat.size}`,
        },
      });
    }

    const bytes = headOnly ? Buffer.alloc(0) : await readFile(absolutePath);
    return new Response(bytes, {
      status: 200,
      headers: {
        ...commonHeaders,
        "Content-Length": String(fileStat.size),
      },
    });
  } catch {
    return Response.json({ error: "Asset not found." }, { status: 404 });
  }
}

function resolveSafeAssetPath(parts: string[]) {
  if (!parts.length || parts.some((part) => part === ".." || part.includes("/") || part.includes("\\"))) return null;
  const absolutePath = path.resolve(assetsRoot, ...parts);
  const root = path.resolve(assetsRoot);
  if (absolutePath !== root && !absolutePath.startsWith(`${root}${path.sep}`)) return null;
  return absolutePath;
}

function parseRange(range: string, size: number) {
  const match = range.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;
  const startText = match[1];
  const endText = match[2];
  let start = startText ? Number(startText) : 0;
  let end = endText ? Number(endText) : size - 1;
  if (!startText && endText) {
    const suffixLength = Number(endText);
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}

function contentTypeFor(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".mp4") return "video/mp4";
  if (extension === ".webm") return "video/webm";
  if (extension === ".mov") return "video/quicktime";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  if (extension === ".mp3") return "audio/mpeg";
  if (extension === ".wav") return "audio/wav";
  if (extension === ".glb") return "model/gltf-binary";
  return "application/octet-stream";
}
