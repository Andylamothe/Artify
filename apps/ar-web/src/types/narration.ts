export interface NarrationSegment {
  id: string
  label: string
  text: string
  pauseAfterMs: number
}

export type NarrationStatus =
  | 'idle'
  | 'label'
  | 'speaking'
  | 'consent'
  | 'qa-offer'
  | 'completed'

export interface NarrationQueueState {
  status: NarrationStatus
  currentSegmentIndex: number
  canSkip: boolean
  skipCount: number
  artworkId: string | null
}

export interface QATurn {
  id: string
  role: 'visitor' | 'guide'
  text: string
  timestamp: number
  audioSource?: 'gcp-stt' | 'web-speech'
  segmentIndexAtTime: number
}

export type QAStatus =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'answering'
  | 'error'

export interface QASession {
  artworkId: string
  turns: QATurn[]
  status: QAStatus
  errorMessage: string | null
}

export interface STTResult {
  transcript: string
  confidence: number
  isFinal: boolean
}

export interface STTOptions {
  languageCode?: string
  sampleRateHertz?: number
  enableAutomaticPunctuation?: boolean
  maxAlternatives?: number
}

export interface GeminiArtworkContext {
  artwork: {
    title: string
    artist: string
    year: string
    description: string
    historicalContext: string
    arDescription: string
  }
  narrationHistory: {
    segmentLabel: string
    text: string
  }[]
  conversationHistory: QATurn[]
}

export interface GeminiResponse {
  answer: string
  tokensUsed: number
}
