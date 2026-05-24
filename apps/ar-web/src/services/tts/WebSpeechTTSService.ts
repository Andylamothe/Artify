import { audioLogger } from '@/services/audio/AudioLogger'
import type { TTSService } from './TTSService'

export class WebSpeechTTSService implements TTSService {
  private _speaking = false
  private _currentRate = 1

  get isSpeaking(): boolean {
    return this._speaking
  }

  speak(text: string, rate?: number): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        audioLogger.log('WARN', 'TTS', 'speechSynthesis not available')
        resolve()
        return
      }

      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = rate ?? this._currentRate

      audioLogger.log('INFO', 'TTS', `speaking: "${text.slice(0, 40)}${text.length > 40 ? '...' : ''}"`)

      utterance.onstart = () => { this._speaking = true }
      utterance.onend = () => {
        this._speaking = false
        resolve()
      }
      utterance.onerror = (event) => {
        this._speaking = false
        audioLogger.log('WARN', 'TTS', `speech ended with browser error: ${event.error}`)
        resolve()
      }

      window.speechSynthesis.speak(utterance)
    })
  }

  cancel(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
      this._speaking = false
      audioLogger.log('INFO', 'TTS', 'cancelled')
    }
  }

  pause(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause()
      audioLogger.log('INFO', 'TTS', 'paused')
    }
  }

  resume(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume()
      audioLogger.log('INFO', 'TTS', 'resumed')
    }
  }

  getVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !window.speechSynthesis) return []
    return window.speechSynthesis.getVoices()
  }

  setRate(rate: number): void {
    this._currentRate = Math.max(0.1, Math.min(10, rate))
  }
}
