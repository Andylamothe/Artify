export interface TTSService {
  speak(text: string, rate?: number): Promise<void>
  cancel(): void
  pause(): void
  resume(): void
  readonly isSpeaking: boolean
  getVoices(): SpeechSynthesisVoice[]
}
