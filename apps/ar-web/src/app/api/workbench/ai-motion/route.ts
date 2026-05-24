import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { GoogleAuth } from "google-auth-library";

export const runtime = "nodejs";

const DEFAULT_LOCATION = "us-central1";
const DEFAULT_MODEL = "veo-3.1-fast-generate-001";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const allowedMimeTypes = new Set(["image/png", "image/jpeg"]);

type AnalyzeRequest = {
  action: "analyze";
  artworkId: string;
  imageBase64: string;
  mimeType: string;
  title?: string;
};

type StartRequest = {
  action: "start";
  artworkId: string;
  imageBase64: string;
  mimeType: string;
  prompt: string;
  durationSeconds?: number;
  aspectRatio?: string;
};

type PollRequest = {
  action: "poll";
  artworkId: string;
  operationName: string;
  model?: string;
};

export async function POST(request: Request) {
  let body: AnalyzeRequest | StartRequest | PollRequest;
  try {
    body = (await request.json()) as AnalyzeRequest | StartRequest | PollRequest;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "poll") return pollOperation(body);
  if (body.action === "start") return startGeneration(body);
  if (body.action === "analyze") return analyzeArtworkMotion(body);
  return Response.json({ error: "Unknown ai motion action." }, { status: 400 });
}

async function analyzeArtworkMotion(body: AnalyzeRequest) {
  const configError = validateGoogleConfig();
  if (configError) return configError;
  if (!allowedMimeTypes.has(body.mimeType)) {
    return Response.json({ error: "Gemini image input must be PNG or JPEG." }, { status: 400 });
  }
  if (!body.imageBase64 || body.imageBase64.length < 64) {
    return Response.json({ error: "A base64 image is required." }, { status: 400 });
  }

  try {
    const model = process.env.VERTEX_AI_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    const location = process.env.VERTEX_AI_LOCATION || DEFAULT_LOCATION;
    const response = await vertexGeminiFetch(model, location, {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: [
                "You are helping build a museum-safe living artwork effect.",
                `Artwork title: ${body.title || body.artworkId || "Selected artwork"}.`,
                "Look at the image and write a strong Veo 3 IMAGE-TO-VIDEO prompt.",
                "Follow Google Veo image-to-video best practice: the source image already provides subject, scene, lighting, style, and composition, so the prompt must focus on MOTION ONLY.",
                "The previous result zoomed into the image; prevent that by making fixed framing the first instruction.",
                "The prompt must start with: Static locked-off camera, fixed framing, no zoom, no pan, no dolly.",
                "Create 5 to 8 specific localized motion instructions for existing visible regions only. Use concrete verbs and directions: flows clockwise, ripples outward, flickers softly, sways left and right, pulses, drifts upward, shimmers along edges, brush strokes crawl along their painted direction.",
                "Animate many existing parts at once when present: sky, clouds, stars, moon, water, fabric, hair, plants, smoke, light, reflections, shadows, outlines, texture, painted brush strokes, and background atmosphere.",
                "Make the artwork feel alive and expressive, with clear visible motion, but preserve the original composition, subject identity, style, color palette, and historical character.",
                "Avoid these outputs: camera zoom, crop-in, pan, dolly, new objects, new text, face changes, subject replacement, modernized scene, full image morph, different artwork.",
                "Mention seamless loop and stable composition.",
                "Return compact strict JSON only with this exact shape:",
                '{"focusAreas":["short area 1","short area 2","short area 3"],"prompt":"one detailed motion-only Veo 3 prompt under 170 words"}',
              ].join(" "),
            },
            {
              inlineData: {
                mimeType: body.mimeType,
                data: stripDataUrl(body.imageBase64),
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 768,
        responseMimeType: "application/json",
      },
    });

    if (!response.ok) return vertexError(response);
    const result = await response.json();
    const raw = result.text ?? result.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = parseGeminiPrompt(raw);
    return Response.json({
      ok: true,
      model,
      focusAreas: parsed.focusAreas,
      prompt: parsed.prompt,
      raw,
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 502 });
  }
}

async function startGeneration(body: StartRequest) {
  const configError = validateGoogleConfig();
  if (configError) return configError;
  if (!allowedMimeTypes.has(body.mimeType)) {
    return Response.json({ error: "Google Veo image input must be PNG or JPEG." }, { status: 400 });
  }
  if (!body.imageBase64 || body.imageBase64.length < 64) {
    return Response.json({ error: "A base64 image is required." }, { status: 400 });
  }

  const model = process.env.VERTEX_AI_VEO_MODEL || DEFAULT_MODEL;
  const location = process.env.VERTEX_AI_LOCATION || DEFAULT_LOCATION;
  const prompt = buildConservativePrompt(body.prompt);
  const parameters: Record<string, unknown> = {
    sampleCount: 1,
    durationSeconds: clampNumber(body.durationSeconds ?? 4, 4, 8),
    aspectRatio: body.aspectRatio || "16:9",
    resizeMode: "pad",
  };
  if (process.env.VERTEX_AI_VEO_OUTPUT_GCS_URI) {
    parameters.storageUri = process.env.VERTEX_AI_VEO_OUTPUT_GCS_URI;
  }

  try {
    const response = await vertexFetch(model, location, "predictLongRunning", {
      instances: [
        {
          prompt,
          image: {
            bytesBase64Encoded: stripDataUrl(body.imageBase64),
            mimeType: body.mimeType,
          },
        },
      ],
      parameters,
    });

    if (!response.ok) return vertexError(response);
    const payload = (await response.json()) as { name?: string };
    if (!payload.name) {
      return Response.json({ error: "Veo did not return an operation name." }, { status: 502 });
    }

    return Response.json({
      ok: true,
      status: "running",
      operationName: payload.name,
      model,
      prompt,
      message: "Google Veo generation started. This can take a minute.",
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 502 });
  }
}

async function pollOperation(body: PollRequest) {
  const configError = validateGoogleConfig();
  if (configError) return configError;
  if (!body.operationName) return Response.json({ error: "operationName is required." }, { status: 400 });

  const model = body.model || process.env.VERTEX_AI_VEO_MODEL || DEFAULT_MODEL;
  const location = process.env.VERTEX_AI_LOCATION || DEFAULT_LOCATION;
  try {
    const response = await vertexFetch(model, location, "fetchPredictOperation", {
      operationName: body.operationName,
    });
    if (!response.ok) return vertexError(response);

    const operation = await response.json();
    if (!operation.done) {
      return Response.json({ ok: true, status: "running", operationName: body.operationName });
    }
    if (operation.error) {
      return Response.json(
        { error: operation.error.message || "Veo generation failed.", details: operation.error },
        { status: 502 },
      );
    }

    const videoBase64 = findBase64Video(operation.response);
    const videoUri = findGeneratedVideoUri(operation.response);
    if (videoBase64) {
      const saved = await saveVideo(Buffer.from(videoBase64, "base64"), body.artworkId);
      return Response.json({ ok: true, status: "done", ...saved, source: "inline" });
    }
    if (videoUri) {
      const bytes = videoUri.startsWith("gs://") ? await downloadGcsObject(videoUri) : await downloadRemoteVideo(videoUri);
      const saved = await saveVideo(bytes, body.artworkId);
      return Response.json({ ok: true, status: "done", ...saved, source: videoUri });
    }

    return Response.json({
      ok: true,
      status: "done",
      videoUri,
      warning: "Veo finished, but no downloadable MP4 was found in the response.",
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 502 });
  }
}

async function vertexFetch(model: string, location: string, method: "predictLongRunning" | "fetchPredictOperation", body: unknown) {
  const project = process.env.GCP_PROJECT_ID;
  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const token = await auth.getAccessToken();
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:${method}`;
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function vertexGeminiFetch(model: string, location: string, body: unknown) {
  const project = process.env.GCP_PROJECT_ID;
  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const token = await auth.getAccessToken();
  if (!project) throw new Error("GCP_PROJECT_ID is not configured.");
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function downloadGcsObject(uri: string) {
  const match = uri.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!match) throw new Error(`Invalid GCS URI: ${uri}`);
  const [, bucket, objectName] = match;
  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const token = await auth.getAccessToken();
  const response = await fetch(
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectName)}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error(await response.text());
  return Buffer.from(await response.arrayBuffer());
}

async function downloadRemoteVideo(uri: string) {
  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const token = await auth.getAccessToken();
  const response = await fetch(uri, {
    headers: uri.includes("googleapis.com") || uri.includes("storage.cloud.google.com") ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(await response.text());
  const contentType = response.headers.get("content-type") || "";
  if (contentType && !/video|octet-stream/i.test(contentType)) {
    throw new Error(`Generated asset was not a video. Content-Type: ${contentType}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function saveVideo(bytes: Buffer, artworkId: string) {
  if (!bytes.length) throw new Error("Generated video is empty.");
  const safeArtworkId = sanitizeSegment(artworkId || "shared");
  const relativeDir = path.join("ar", "workbench", "assets", safeArtworkId);
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);
  const fileName = `${Date.now()}-${safeArtworkId}-google-living-art.mp4`;
  const assetPath = `${safeArtworkId}/${fileName}`;
  const assetUrl = `/api/workbench/assets/${assetPath}`;
  const publicUrl = `/${relativeDir.replaceAll(path.sep, "/")}/${fileName}`;
  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, fileName), bytes);
  return {
    url: assetUrl,
    downloadUrl: assetUrl,
    publicUrl,
    fileName,
    bytes: bytes.length,
    contentType: "video/mp4",
  };
}

function validateGoogleConfig() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return Response.json({ error: "GOOGLE_APPLICATION_CREDENTIALS is not configured." }, { status: 503 });
  }
  if (!process.env.GCP_PROJECT_ID) {
    return Response.json({ error: "GCP_PROJECT_ID is not configured." }, { status: 503 });
  }
  return null;
}

function buildConservativePrompt(prompt: string) {
  return [
    "Static locked-off camera, fixed framing, no zoom, no pan, no dolly.",
    "Use the input image as the exact first frame and preserve the original composition, subject identity, colors, style, and brushwork.",
    "Animate only existing visible regions of the artwork. Create clear localized motion in multiple areas such as brush strokes, fabric, hair, foliage, light, glow, water, smoke, sky, shadows, outlines, texture, and atmosphere where present.",
    "Keep motion expressive and visible, but avoid new objects, new text, face changes, subject replacement, scene modernization, full-image morphing, or changing the artwork into a different image.",
    "Make the animation a seamless loop with stable composition.",
    prompt.trim() ||
      "Animate many existing visual details with coordinated painterly motion while keeping the artwork recognizably unchanged.",
  ].join(" ");
}

function parseGeminiPrompt(raw: string) {
  const cleaned = raw.replace(/```json|```/gi, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  try {
    const parsed = JSON.parse(jsonMatch?.[0] || cleaned) as { focusAreas?: unknown; prompt?: unknown };
    const focusAreas = Array.isArray(parsed.focusAreas)
      ? parsed.focusAreas.filter((item): item is string => typeof item === "string").slice(0, 5)
      : [];
    const prompt =
      typeof parsed.prompt === "string" && parsed.prompt.trim()
        ? parsed.prompt.trim()
        : "Animate only small existing details with subtle looping motion while preserving the original artwork unchanged.";
    return { focusAreas, prompt };
  } catch {
    const recoveredAreas = recoverFocusAreas(cleaned);
    if (recoveredAreas.length) {
      return {
        focusAreas: recoveredAreas,
        prompt: buildRecoveredCreativePrompt(recoveredAreas),
      };
    }
    return {
      focusAreas: [],
      prompt:
        "Animate many existing regions of the artwork with coordinated painterly motion: visible brush strokes, background atmosphere, light shimmer, shadows, texture, fabric, hair, water, foliage, smoke, or sky where present. Keep the camera locked, preserve the original composition and subject identity, and create a seamless expressive loop without adding new objects or text.",
    };
  }
}

function recoverFocusAreas(raw: string) {
  const areas = Array.from(raw.matchAll(/"([^"]{3,80})"/g))
    .map((match) => match[1])
    .filter((value) => !/focusAreas|prompt/i.test(value))
    .slice(0, 8);
  return Array.from(new Set(areas));
}

function buildRecoveredCreativePrompt(areas: string[]) {
  const areaText = areas.join(", ");
  return [
    "Static locked-off camera, fixed framing, no zoom, no pan, no dolly.",
    `Animate these existing areas with clear coordinated motion: ${areaText}.`,
    "Use painterly movement across multiple regions: brush-stroke flow along painted directions, visible light shimmer, gentle pulsing glow, texture crawling subtly along contours, and atmospheric drift where present.",
    "Keep the camera locked and preserve the original composition, subject identity, colors, style, and historical character.",
    "Do not add new objects, text, modern elements, or transform the artwork into a different image.",
  ].join(" ");
}

function findGeneratedVideoUri(value: unknown): string | null {
  if (typeof value === "string" && /^(gs|https?):\/\//i.test(value) && /(\.mp4|video|generated|prediction|storage|googleapis)/i.test(value)) {
    return value;
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of ["uri", "gcsUri", "gcs_uri", "videoUri", "video_uri", "signedUri", "signed_uri"]) {
    const candidate = record[key];
    if (typeof candidate === "string" && /^(gs|https?):\/\//i.test(candidate)) return candidate;
  }
  for (const child of Object.values(record)) {
    const found = findGeneratedVideoUri(child);
    if (found) return found;
  }
  return null;
}

function findBase64Video(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (
      typeof child === "string" &&
      /bytes|base64|bytesBase64Encoded|videoBytes/i.test(key) &&
      child.length > 1024 &&
      !/^(gs|https?):\/\//i.test(child)
    ) {
      return child.replace(/^data:video\/[^;]+;base64,/, "");
    }
    const found = findBase64Video(child);
    if (found) return found;
  }
  return null;
}

async function vertexError(response: Response) {
  const text = await response.text();
  return Response.json({ error: text || `Vertex AI returned ${response.status}` }, { status: response.status });
}

function stripDataUrl(value: string) {
  return value.replace(/^data:[^;]+;base64,/, "");
}

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Google AI motion failed.";
}
