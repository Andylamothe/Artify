import type { GeminiArtworkContext, GeminiResponse } from '@/types/narration'
import type { GeminiService } from '../GeminiService'

export class GeminiAPIService implements GeminiService {
  mockAnswer = 'It was painted around 1503.'
  mockShouldFail = false
  mockErrorCode = 'unknown'
  callCount = 0

  async ask(_question: string, _context: GeminiArtworkContext): Promise<GeminiResponse> {
    this.callCount++
    if (this.mockShouldFail) {
      const err = new Error('Mock Gemini error') as Error & { code: string }
      err.code = this.mockErrorCode
      throw err
    }
    return { answer: this.mockAnswer, tokensUsed: 42 }
  }

  reset(): void {
    this.callCount = 0
    this.mockShouldFail = false
  }
}
