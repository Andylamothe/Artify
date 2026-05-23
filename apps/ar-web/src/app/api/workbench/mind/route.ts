import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const mindPath = path.join(process.cwd(), "public", "ar", "targets", "artworks.mind");

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("mindFile");

  if (!(file instanceof File)) {
    return Response.json({ error: "mindFile is required" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length < 64) {
    return Response.json({ error: "The uploaded .mind file is too small." }, { status: 400 });
  }

  await mkdir(path.dirname(mindPath), { recursive: true });
  await writeFile(mindPath, bytes);

  return Response.json({
    ok: true,
    mindFile: "/ar/targets/artworks.mind",
    bytes: bytes.length,
    updatedAt: new Date().toISOString(),
  });
}
