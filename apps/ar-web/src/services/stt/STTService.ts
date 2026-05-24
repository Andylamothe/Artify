import type { STTResult } from '@/types/narration'

export interface STTService {
  startRecording(onAutoStop?: () => void): Promise<void>
  stopRecording(): Promise<STTResult>
  cancel(): void
  isRecording(): boolean
}
