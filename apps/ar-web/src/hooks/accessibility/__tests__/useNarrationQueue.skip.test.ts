import { act, renderHook, waitFor } from '@testing-library/react'
import { useNarrationQueue } from '../useNarrationQueue'

class MockTTSService {
  speakCalls: string[] = []
  cancelCount = 0
  isSpeaking = false
  /** Long enough that waitFor can observe intermediate state ticks. */
  speakDelay = 150
  async speak(text: string): Promise<void> {
    this.speakCalls.push(text)
    await new Promise((r) => setTimeout(r, this.speakDelay))
  }
  cancel(): void { this.cancelCount++ }
  pause(): void {}
  resume(): void {}
  getVoices(): SpeechSynthesisVoice[] { return [] }
}

// Stub SpeechRecognition so the passive listener constructs cleanly
function installSpeechRecognitionStub() {
  const stub = jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    onresult: null,
    onerror: null,
    onend: null,
    lang: '',
    continuous: false,
    interimResults: false,
  }))
  Object.defineProperty(global, 'SpeechRecognition', {
    writable: true,
    configurable: true,
    value: stub,
  })
  return stub
}

beforeEach(() => {
  installSpeechRecognitionStub()
})

describe('useNarrationQueue — skip behavior', () => {
  test('starts in idle status', () => {
    const tts = new MockTTSService()
    const { result } = renderHook(() => useNarrationQueue(tts))
    expect(result.current.state.status).toBe('idle')
    expect(result.current.state.skipCount).toBe(0)
  })

  test('start() transitions to label, then speaking (canSkip=true)', async () => {
    const tts = new MockTTSService()
    const { result } = renderHook(() => useNarrationQueue(tts))

    act(() => { result.current.start('mona-lisa') })

    await waitFor(() => expect(result.current.state.status).toBe('speaking'))
    expect(result.current.state.canSkip).toBe(true)
    expect(result.current.state.currentSegmentIndex).toBe(0)
  })

  test('canSkip is false during label, true during content speech', async () => {
    const tts = new MockTTSService()
    tts.speakDelay = 150
    const { result } = renderHook(() => useNarrationQueue(tts))

    act(() => { result.current.start('mona-lisa') })

    await waitFor(() => expect(result.current.state.status).toBe('label'))
    expect(result.current.state.canSkip).toBe(false)

    await waitFor(() => expect(result.current.state.canSkip).toBe(true))
    expect(result.current.state.status).toBe('speaking')
  })

  test('skipToNext() cancels current speech and announces next segment', async () => {
    const tts = new MockTTSService()
    const { result } = renderHook(() => useNarrationQueue(tts))

    act(() => { result.current.start('mona-lisa') })
    await waitFor(() => expect(result.current.state.canSkip).toBe(true))

    act(() => { result.current.skipToNext('button') })

    expect(tts.cancelCount).toBeGreaterThan(0)
    await waitFor(() => {
      expect(tts.speakCalls.some((c) => c.startsWith('Skipping.'))).toBe(true)
    })
  })

  test('skipToNext() advances currentSegmentIndex', async () => {
    const tts = new MockTTSService()
    const { result } = renderHook(() => useNarrationQueue(tts))

    act(() => { result.current.start('mona-lisa') })
    await waitFor(() => expect(result.current.state.canSkip).toBe(true))

    act(() => { result.current.skipToNext('button') })

    await waitFor(() => expect(result.current.state.currentSegmentIndex).toBe(1))
  })

  test('skipToNext() does nothing when canSkip is false', async () => {
    const tts = new MockTTSService()
    tts.speakDelay = 300
    const { result } = renderHook(() => useNarrationQueue(tts))

    act(() => { result.current.start('mona-lisa') })

    // Still in label phase
    await waitFor(() => expect(result.current.state.status).toBe('label'))
    const cancelBefore = tts.cancelCount

    act(() => { result.current.skipToNext('button') })

    expect(tts.cancelCount).toBe(cancelBefore)
    expect(result.current.state.skipCount).toBe(0)
  })

  test('skipCount increments on each skip', async () => {
    const tts = new MockTTSService()
    const { result } = renderHook(() => useNarrationQueue(tts))

    act(() => { result.current.start('mona-lisa') })
    await waitFor(() => expect(result.current.state.canSkip).toBe(true))

    act(() => { result.current.skipToNext('button') })
    await waitFor(() => expect(result.current.state.skipCount).toBe(1))

    await waitFor(() => expect(result.current.state.canSkip).toBe(true))

    act(() => { result.current.skipToNext('button') })
    await waitFor(() => expect(result.current.state.skipCount).toBe(2))
  })

  test('start() with unknown artworkId does not crash and stays idle', () => {
    const tts = new MockTTSService()
    const { result } = renderHook(() => useNarrationQueue(tts))

    act(() => { result.current.start('does-not-exist') })

    expect(result.current.state.status).toBe('idle')
  })

  test('skipToNext() supports voice method', async () => {
    const tts = new MockTTSService()
    const { result } = renderHook(() => useNarrationQueue(tts))

    act(() => { result.current.start('mona-lisa') })
    await waitFor(() => expect(result.current.state.canSkip).toBe(true))

    act(() => { result.current.skipToNext('voice') })

    await waitFor(() => expect(result.current.state.skipCount).toBe(1))
  })
})
