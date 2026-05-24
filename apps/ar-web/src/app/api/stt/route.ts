import { NextRequest, NextResponse } from 'next/server'
import { SpeechClient } from '@google-cloud/speech'

export const runtime = 'nodejs'

/**
 * Cloud Speech-to-Text proxy.
 *
 * Authenticates via the service-account JSON pointed at by
 * GOOGLE_APPLICATION_CREDENTIALS (see apps/ar-web/.env.local).
 *
 * The client expects the original API response shape:
 *   { results: [{ alternatives: [{ transcript, confidence }] }] }
 * so the existing GCPSpeechToTextService keeps working unchanged.
 */

let _client: SpeechClient | null = null
function getClient(): SpeechClient {
  if (!_client) _client = new SpeechClient()
  return _client
}

interface STTRequestBody {
  audio?: string
  config?: {
    sampleRateHertz?: number
    languageCode?: string
    enableAutomaticPunctuation?: boolean
  }
}

export async function POST(req: NextRequest) {
  let body: STTRequestBody
  try {
    body = (await req.json()) as STTRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { audio, config } = body
  if (!audio || typeof audio !== 'string') {
    return NextResponse.json({ error: 'Missing audio' }, { status: 400 })
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('[API/stt] GOOGLE_APPLICATION_CREDENTIALS not set')
    return NextResponse.json({ error: 'STT not configured' }, { status: 503 })
  }

  try {
    const client = getClient()
    const [response] = await client.recognize({
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: config?.sampleRateHertz ?? 48000,
        languageCode: config?.languageCode ?? 'en-US',
        enableAutomaticPunctuation: config?.enableAutomaticPunctuation ?? true,
        maxAlternatives: 1,
        model: 'latest_long',
      },
      audio: { content: audio },
    })

    // Normalize to the response shape the client expects.
    const results =
      response.results?.map((r) => ({
        alternatives: (r.alternatives ?? []).map((a) => ({
          transcript: a.transcript ?? '',
          confidence: a.confidence ?? 0,
        })),
      })) ?? []

    return NextResponse.json({ results })
  } catch (err) {
    console.error('[API/stt] Speech client error:', err)
    return NextResponse.json({ error: 'STT upstream error' }, { status: 502 })
  }
}
