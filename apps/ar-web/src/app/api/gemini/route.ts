import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import type { GeminiArtworkContext } from '@/types/narration'

export const runtime = 'nodejs'

/**
 * Gemini Q&A proxy via Vertex AI.
 *
 * Authenticates via the service-account JSON at GOOGLE_APPLICATION_CREDENTIALS.
 * Project / location come from GCP_PROJECT_ID / VERTEX_AI_LOCATION (defaults to
 * us-central1). Uses the official @google/genai SDK which replaces the
 * deprecated @google-cloud/vertexai package.
 *
 * Response contract: { answer: string, tokensUsed: number } — unchanged so
 * the existing GeminiAPIService client keeps working.
 *
 * IAM: the service account must have the role roles/aiplatform.user on the
 * project (gives aiplatform.endpoints.predict). Grant in Cloud Console →
 * IAM & Admin → IAM → grant principal "Vertex AI User".
 */

const DEFAULT_LOCATION = 'us-central1'
const DEFAULT_MODEL = 'gemini-1.5-flash'

let _client: GoogleGenAI | null = null
function getClient(): GoogleGenAI {
  if (_client) return _client
  const project = process.env.GCP_PROJECT_ID
  const location = process.env.VERTEX_AI_LOCATION ?? DEFAULT_LOCATION
  if (!project) throw new Error('GCP_PROJECT_ID not set')
  _client = new GoogleGenAI({ vertexai: true, project, location })
  return _client
}

function buildSystemPrompt(context: GeminiArtworkContext): string {
  const { artwork, narrationHistory } = context
  const historyText =
    narrationHistory.length > 0
      ? narrationHistory.map((s, i) => `${i + 1}. ${s.segmentLabel}: ${s.text}`).join('\n\n')
      : 'The visitor has not yet heard any narration.'

  return `You are an audio guide for a museum or gallery.
You are currently describing "${artwork.title}" by ${artwork.artist} (${artwork.year}).

ARTWORK FACTS:
- Description: ${artwork.description}
- Historical context: ${artwork.historicalContext}
- AR experience: ${artwork.arDescription}

WHAT THE VISITOR HAS ALREADY HEARD:
${historyText}

RULES:
- Keep answers under 100 words. This is spoken audio — be concise.
- Speak in a warm, knowledgeable tone as a human museum guide would.
- If asked something not in the artwork facts, say "I don't have that information, but I'd suggest asking the gallery staff."
- Never make up facts. Stick to the provided context.
- Do not use markdown, bullet points, or headers — plain spoken sentences only.`
}

interface UpstreamError {
  code?: number | string
  status?: number | string
  message?: string
}

function statusFromError(err: UpstreamError): number | null {
  const numericCode = typeof err.code === 'number' ? err.code : Number(err.code)
  const numericStatus = typeof err.status === 'number' ? err.status : Number(err.status)
  if (Number.isFinite(numericCode)) return numericCode
  if (Number.isFinite(numericStatus)) return numericStatus
  // Vertex/genai sometimes embeds status in message like "got status: 403 Forbidden"
  const match = err.message?.match(/status:\s*(\d{3})/)
  if (match) return Number(match[1])
  return null
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { question, context } = body as { question?: unknown; context?: unknown }

  if (!question || typeof question !== 'string') {
    return NextResponse.json({ error: 'Missing question' }, { status: 400 })
  }
  if (!context || typeof context !== 'object') {
    return NextResponse.json({ error: 'Missing context' }, { status: 400 })
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('[API/gemini] GOOGLE_APPLICATION_CREDENTIALS not set')
    return NextResponse.json({ error: 'Gemini not configured' }, { status: 503 })
  }
  if (!process.env.GCP_PROJECT_ID) {
    console.error('[API/gemini] GCP_PROJECT_ID not set')
    return NextResponse.json({ error: 'GCP project not configured' }, { status: 503 })
  }

  const typedContext = context as GeminiArtworkContext
  const systemPrompt = buildSystemPrompt(typedContext)

  const contents = [
    ...(typedContext.conversationHistory ?? []).map((turn) => ({
      role: turn.role === 'visitor' ? 'user' : 'model',
      parts: [{ text: turn.text }],
    })),
    { role: 'user', parts: [{ text: question }] },
  ]

  try {
    const ai = getClient()
    const modelName = process.env.VERTEX_AI_MODEL ?? DEFAULT_MODEL

    const result = await ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 200,
        temperature: 0.4,
      },
    })

    const raw =
      result.text ??
      result.candidates?.[0]?.content?.parts?.[0]?.text ??
      ''
    const answer = raw.replace(/[*#`_~]/g, '').replace(/\n+/g, ' ').trim()
    const tokensUsed = result.usageMetadata?.totalTokenCount ?? 0

    return NextResponse.json({ answer, tokensUsed })
  } catch (err) {
    const e = err as UpstreamError
    const status = statusFromError(e)
    console.error(`[API/gemini] Vertex AI error (${status ?? 'unknown'}):`, e.message ?? err)
    if (status === 429 || status === 8 /* RESOURCE_EXHAUSTED */) {
      return NextResponse.json({ error: 'quota_exceeded' }, { status: 429 })
    }
    if (status === 403) {
      return NextResponse.json(
        {
          error: 'permission_denied',
          hint: 'Grant the service account the role roles/aiplatform.user in IAM.',
        },
        { status: 403 },
      )
    }
    return NextResponse.json({ error: 'Gemini upstream error' }, { status: 502 })
  }
}
