import { audioLogger } from '@/services/audio/AudioLogger'
import type { GeminiArtworkContext, GeminiResponse } from '@/types/narration'
import type { GeminiService } from './GeminiService'

type GeminiErrorCode = 'quota_exceeded' | 'network_error' | 'timeout' | 'unknown'

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly code: GeminiErrorCode,
  ) {
    super(message)
    this.name = 'GeminiError'
  }
}

function stripMarkdown(text: string): string {
  return text.replace(/[*#`_~]/g, '').replace(/\n+/g, ' ').trim()
}

export class GeminiAPIService implements GeminiService {
  async ask(question: string, context: GeminiArtworkContext): Promise<GeminiResponse> {
    audioLogger.log('INFO', 'Gemini', `question: "${question.slice(0, 60)}${question.length > 60 ? '…' : ''}"`)
    audioLogger.log('DEBUG', 'Gemini', 'thinking...')

    let res: Response
    try {
      res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context }),
        signal: AbortSignal.timeout(10_000),
      })
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'TimeoutError'
      const code: GeminiErrorCode = isTimeout ? 'timeout' : 'network_error'
      audioLogger.log('ERROR', 'Gemini', `${code}: ${err}`)
      throw new GeminiError(isTimeout ? 'Request timed out' : 'Network error', code)
    }

    if (!res.ok) {
      if (res.status === 429) {
        audioLogger.log('WARN', 'Gemini', 'quota exceeded (429)')
        throw new GeminiError('Quota exceeded', 'quota_exceeded')
      }
      audioLogger.log('ERROR', 'Gemini', `upstream error: ${res.status}`)
      throw new GeminiError(`Gemini error: ${res.status}`, 'unknown')
    }

    const data = await res.json()
    const answer = stripMarkdown(data.answer ?? '')
    const tokensUsed: number = data.tokensUsed ?? 0

    audioLogger.log('INFO', 'Gemini', `answer: "${answer.slice(0, 60)}${answer.length > 60 ? '…' : ''}" (${tokensUsed} tokens)`)

    return { answer, tokensUsed }
  }
}
