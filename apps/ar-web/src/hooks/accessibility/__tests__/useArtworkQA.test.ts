import { act, renderHook, waitFor } from '@testing-library/react'
import { useArtworkQA, type UseArtworkQAOptions } from '../useArtworkQA'
import type { ArtworkConfig } from '@/types/ar'

const mockArtwork: ArtworkConfig = {
  id: 'mona-lisa',
  title: 'Mona Lisa',
  artist: 'Leonardo da Vinci',
  year: '1503-1506',
  shortSummary: 'A portrait.',
  historyText: 'Painted in Florence.',
  targetIndex: 0,
  audioUrl: '/ar/audio/mona-lisa.wav',
  historicalImages: [],
  arSceneType: 'monaLisa',
  colors: { primary: '#000', secondary: '#000', accent: '#000' },
  effects: { particleCount: 1, lowPowerParticleCount: 1, intensity: 'low' },
}

class MockTTSService {
  speakCalls: string[] = []
  isSpeaking = false
  async speak(text: string): Promise<void> {
    this.speakCalls.push(text)
  }
  cancel(): void {}
  pause(): void {}
  resume(): void {}
  getVoices(): SpeechSynthesisVoice[] { return [] }
}

class MockSTTService {
  mockTranscript = 'What year was this painted?'
  private _recording = false
  async startRecording(): Promise<void> { this._recording = true }
  async stopRecording() {
    this._recording = false
    return { transcript: this.mockTranscript, confidence: 0.9, isFinal: true }
  }
  cancel(): void { this._recording = false }
  isRecording(): boolean { return this._recording }
}

class MockGeminiService {
  mockAnswer = 'It was painted around 1503.'
  callCount = 0
  shouldThrow: { code: string } | null = null
  async ask() {
    this.callCount++
    if (this.shouldThrow) {
      const err = new Error('Mock fail') as Error & { code: string }
      err.code = this.shouldThrow.code
      throw err
    }
    return { answer: this.mockAnswer, tokensUsed: 10 }
  }
}

function makeOptions(overrides: Partial<UseArtworkQAOptions> = {}): UseArtworkQAOptions {
  const tts = new MockTTSService()
  const stt = new MockSTTService()
  const gemini = new MockGeminiService()
  return {
    artwork: mockArtwork,
    narrationHistory: [{ segmentLabel: 'Section 1', text: 'Mona Lisa.' }],
    ttsService: tts,
    sttService: stt,
    geminiService: gemini,
    currentSegmentIndex: 0,
    ...overrides,
  }
}

beforeEach(() => {
  sessionStorage.clear()

  Object.defineProperty(global.navigator, 'mediaDevices', {
    writable: true,
    configurable: true,
    value: {
      getUserMedia: jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      }),
    },
  })

  Object.defineProperty(global, 'crypto', {
    writable: true,
    configurable: true,
    value: { randomUUID: jest.fn(() => `uuid-${Math.random()}`) },
  })

  // SpeechRecognition stub — by default, never fires (visitor never says "done"/"skip"
  // so the post-answer wait blocks; tests use exitQA() to break the loop instead).
  Object.defineProperty(global, 'SpeechRecognition', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      onresult: null,
      onerror: null,
      onend: null,
      lang: '',
      continuous: false,
      interimResults: false,
    })),
  })
})

describe('useArtworkQA', () => {
  test('starts in idle status', () => {
    const { result } = renderHook(() => useArtworkQA(makeOptions()))
    expect(result.current.session.status).toBe('idle')
    expect(result.current.session.turns).toHaveLength(0)
  })

  test('does not request microphone permission until startQA', () => {
    const getUserMedia = jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
    })
    Object.defineProperty(global.navigator, 'mediaDevices', {
      writable: true,
      configurable: true,
      value: { getUserMedia },
    })

    renderHook(() => useArtworkQA(makeOptions()))

    expect(getUserMedia).not.toHaveBeenCalled()
  })

  test('startQA reports unavailable when microphone permission is denied', async () => {
    Object.defineProperty(global.navigator, 'mediaDevices', {
      writable: true,
      configurable: true,
      value: {
        getUserMedia: jest.fn().mockRejectedValue(
          new DOMException('Permission denied', 'NotAllowedError'),
        ),
      },
    })

    const opts = makeOptions()
    const { result } = renderHook(() => useArtworkQA(opts))

    await act(async () => {
      await result.current.startQA()
    })

    await waitFor(() => expect(result.current.qaAvailable).toBe(false))
    expect((opts.ttsService as MockTTSService).speakCalls).toContain(
      'Microphone access is not available. Continuing the tour.',
    )
  })

  test('startQA() transitions to listening', async () => {
    const opts = makeOptions()
    const { result } = renderHook(() => useArtworkQA(opts))

    act(() => { result.current.startQA() })

    await waitFor(() => expect(result.current.session.status).toBe('listening'))
    expect((opts.ttsService as MockTTSService).speakCalls[0]).toContain('Ask your question')
  })

  test('stopListening + Gemini answer logs visitor + guide turns', async () => {
    const opts = makeOptions()
    const { result } = renderHook(() => useArtworkQA(opts))

    act(() => { result.current.startQA() })
    await waitFor(() => expect(result.current.session.status).toBe('listening'))

    act(() => { result.current.stopListening() })

    await waitFor(() => expect(result.current.session.turns).toHaveLength(2))

    expect(result.current.session.turns[0].role).toBe('visitor')
    expect(result.current.session.turns[0].text).toBe('What year was this painted?')
    expect(result.current.session.turns[1].role).toBe('guide')
    expect(result.current.session.turns[1].text).toBe('It was painted around 1503.')
  })

  test('empty transcript triggers re-prompt without calling Gemini', async () => {
    const stt = new MockSTTService()
    stt.mockTranscript = ''
    const gemini = new MockGeminiService()
    const opts = makeOptions({ sttService: stt, geminiService: gemini })

    const { result } = renderHook(() => useArtworkQA(opts))

    act(() => { result.current.startQA() })
    await waitFor(() => expect(result.current.session.status).toBe('listening'))
    act(() => { result.current.stopListening() })

    // Should re-prompt — speak "I didn't catch that"
    await waitFor(() => {
      const calls = (opts.ttsService as MockTTSService).speakCalls
      expect(calls.some((c) => c.includes("didn't catch"))).toBe(true)
    })
    expect(gemini.callCount).toBe(0)
  })

  test('Gemini quota error speaks "question limit" message and exits', async () => {
    const gemini = new MockGeminiService()
    gemini.shouldThrow = { code: 'quota_exceeded' }
    const opts = makeOptions({ geminiService: gemini })

    const { result } = renderHook(() => useArtworkQA(opts))

    act(() => { result.current.startQA() })
    await waitFor(() => expect(result.current.session.status).toBe('listening'))
    act(() => { result.current.stopListening() })

    await waitFor(() => {
      const calls = (opts.ttsService as MockTTSService).speakCalls
      expect(calls.some((c) => c.includes('question limit'))).toBe(true)
    })
    await waitFor(() => expect(result.current.session.status).toBe('idle'))
  })

  test('session is persisted to sessionStorage', async () => {
    const opts = makeOptions()
    const { result } = renderHook(() => useArtworkQA(opts))

    act(() => { result.current.startQA() })
    await waitFor(() => expect(result.current.session.status).toBe('listening'))
    act(() => { result.current.stopListening() })

    await waitFor(() => expect(result.current.session.turns).toHaveLength(2))

    const stored = JSON.parse(sessionStorage.getItem(`artify-qa-${mockArtwork.id}`) ?? '{}')
    expect(stored.turns).toHaveLength(2)
  })

  test('exitQA() resets status to idle', async () => {
    const { result } = renderHook(() => useArtworkQA(makeOptions()))

    act(() => { result.current.startQA() })
    await waitFor(() => expect(result.current.session.status).toBe('listening'))

    act(() => { result.current.exitQA() })
    expect(result.current.session.status).toBe('idle')
  })
})
