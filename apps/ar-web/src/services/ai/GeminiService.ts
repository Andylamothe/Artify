import type { GeminiArtworkContext, GeminiResponse } from '@/types/narration'

export interface GeminiService {
  ask(question: string, context: GeminiArtworkContext): Promise<GeminiResponse>
}
