import type { STTResult } from '@/types/narration'
import type { STTService } from '../STTService'

export class GCPSpeechToTextService implements STTService {
  mockTranscript = 'What year was this painted?'
  mockConfidence = 0.95
  mockShouldFail = false
  private _recording = false

  async startRecording(): Promise<void> {
    this._recording = true
  }

  async stopRecording(): Promise<STTResult> {
    this._recording = false
    if (this.mockShouldFail) {
      throw new Error('STT mock error')
    }
    return {
      transcript: this.mockTranscript,
      confidence: this.mockConfidence,
      isFinal: true,
    }
  }

  cancel(): void {
    this._recording = false
  }

  isRecording(): boolean {
    return this._recording
  }
}
