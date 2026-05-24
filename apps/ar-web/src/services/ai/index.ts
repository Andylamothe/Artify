export type { GeminiService } from './GeminiService'
export { GeminiAPIService } from './GeminiAPIService'

import { GeminiAPIService } from './GeminiAPIService'
export const geminiService = new GeminiAPIService()
