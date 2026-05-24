import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const APP_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/social";
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

function safeExtension(file: File) {
  const typeExtension = ALLOWED_TYPES.get(file.type);
  if (typeExtension) return typeExtension;

  const nameExtension = file.name.split(".").pop()?.toLowerCase();
  if (nameExtension && ["jpg", "jpeg", "png", "webp", "gif"].includes(nameExtension)) {
    return nameExtension === "jpeg" ? "jpg" : nameExtension;
  }

  return null;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing image file" }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Image must be between 1 byte and 8 MB" }, { status: 400 });
  }

  const extension = safeExtension(file);
  if (!extension) {
    return NextResponse.json({ error: "Only JPG, PNG, WEBP, and GIF images are allowed" }, { status: 400 });
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "artworks");
  await mkdir(uploadsDir, { recursive: true });

  const filename = `${Date.now()}-${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, filename), buffer);

  return NextResponse.json({ imageUrl: `${APP_BASE}/api/admin/uploads/${filename}` });
}
