'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getNarrationSegments } from '@/data/narrationData'
import { audioLogger } from '@/services/audio/AudioLogger'
import type { TTSService } from '@/services/tts/TTSService'
import type { NarrationQueueState, NarrationSegment } from '@/types/narration'

type SkipMethod = 'button' | 'voice'

const INITIAL_STATE: NarrationQueueState = {
  status: 'idle',
  currentSegmentIndex: -1,
  canSkip: false,
  skipCount: 0,
  artworkId: null,
}

export interface UseNarrationQueueReturn {
  state: NarrationQueueState
  narrationHistory: { segmentLabel: string; text: string }[]
  start(artworkId: string): void
  pause(): void
  resume(): void
  stop(): void
  skipToNext(method?: SkipMethod): void
  answerConsent(yes: boolean): void
}

export function useNarrationQueue(ttsService: TTSService): UseNarrationQueueReturn {
  const [state, setState] = useState<NarrationQueueState>(INITIAL_STATE)
  // stateRef mirrors `state` so callbacks captured by long-lived listeners
  // (passive SpeechRecognition, audio promises) can read the latest value
  // without being re-created on every state change. Kept in sync inside
  // `updateState`, which is the only path that mutates `state`.
  const stateRef = useRef(state)

  const [narrationHistory, setNarrationHistory] = useState<
    { segmentLabel: string; text: string }[]
  >([])

  const segmentsRef = useRef<NarrationSegment[]>([])
  const skipMethodRef = useRef<SkipMethod>('button')
  const consentResolverRef = useRef<((yes: boolean) => void) | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const abortRef = useRef(false)

  const updateState = useCallback((patch: Partial<NarrationQueueState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch }
      stateRef.current = next
      return next
    })
  }, [])

  const stopPassiveListener = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* already stopped */ }
      recognitionRef.current = null
    }
  }, [])

  const startPassiveListener = useCallback(() => {
    const SpeechRec =
      (typeof window !== 'undefined' &&
        (window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition: typeof SpeechRecognition }).webkitSpeechRecognition)) ||
      null

    if (!SpeechRec) {
      audioLogger.log('WARN', 'NarrationQueue', 'voice skip not available — SpeechRecognition unsupported')
      return
    }

    const rec = new SpeechRec()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript.toLowerCase().trim())
        .join(' ')

      if (transcript.includes('skip') && stateRef.current.canSkip) {
        audioLogger.log('INFO', 'NarrationQueue', `voice "skip" detected: "${transcript}"`)
        stopPassiveListener()
        skipMethodRef.current = 'voice'
        // Trigger skip via the ref to avoid stale closure
        skipNextRef.current?.('voice')
      }
    }

    rec.onerror = (event) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        audioLogger.log('WARN', 'NarrationQueue', `passive recognition error: ${event.error}`)
      }
    }

    try {
      rec.start()
      recognitionRef.current = rec
    } catch (err) {
      audioLogger.log('WARN', 'NarrationQueue', `failed to start passive recognition: ${err}`)
    }
  }, [stopPassiveListener])

  const playSegment = useCallback(async (index: number) => {
    const segments = segmentsRef.current
    if (index >= segments.length || abortRef.current) {
      // Tour complete
      updateState({ status: 'qa-offer', canSkip: false })
      audioLogger.log('INFO', 'NarrationQueue', 'all segments complete — offering Q&A')
      return
    }

    const segment = segments[index]
    updateState({ status: 'label', currentSegmentIndex: index, canSkip: false })
    audioLogger.log('INFO', 'NarrationQueue', `playing segment ${index}: "${segment.label}"`)

    // Speak label
    if (!abortRef.current) {
      await ttsService.speak(segment.label)
    }
    if (abortRef.current) return

    // Now in content speech — canSkip = true
    updateState({ status: 'speaking', canSkip: true })
    startPassiveListener()

    if (!abortRef.current) {
      await ttsService.speak(segment.text)
    }

    stopPassiveListener()
    if (abortRef.current) return

    // Log to history
    setNarrationHistory((prev) => [
      ...prev,
      { segmentLabel: segment.label, text: segment.text },
    ])

    // Consent gate
    updateState({ status: 'consent', canSkip: false })
    audioLogger.log('DEBUG', 'NarrationQueue', 'waiting for consent')
  }, [ttsService, updateState, startPassiveListener, stopPassiveListener])

  // Forward ref so passive listener can call skipToNext without stale closure
  const skipNextRef = useRef<((method: SkipMethod) => void) | null>(null)

  const skipToNext = useCallback((method: SkipMethod = 'button') => {
    const current = stateRef.current
    if (!current.canSkip) return

    const nextIndex = current.currentSegmentIndex + 1
    audioLogger.log('INFO', 'NarrationQueue',
      `skipToNext() called, method: "${method}" — segment ${current.currentSegmentIndex} → ${nextIndex}`)

    stopPassiveListener()
    ttsService.cancel()

    const newSkipCount = current.skipCount + 1
    updateState({ skipCount: newSkipCount })
    audioLogger.log('DEBUG', 'NarrationQueue', `skip count this session: ${newSkipCount}`)

    if (nextIndex >= segmentsRef.current.length) {
      audioLogger.log('INFO', 'NarrationQueue', 'skip on last segment — going to end')
      ttsService.speak('End of tour.').then(() => {
        updateState({ status: 'qa-offer', canSkip: false })
      })
      return
    }

    const nextSegment = segmentsRef.current[nextIndex]
    ttsService.speak(`Skipping. ${nextSegment.label}.`).then(() => {
      playSegment(nextIndex)
    })
  }, [ttsService, updateState, stopPassiveListener, playSegment])

  // Sync the forward-declared ref so the passive voice listener (which captured
  // `skipNextRef` before `skipToNext` was defined) always calls the latest version.
  // The new react-hooks/immutability rule flags any `ref.current = …` assignment;
  // here we genuinely need a forward reference to break the cycle
  // playSegment → passiveListener → skipToNext → playSegment.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    skipNextRef.current = skipToNext
  }, [skipToNext])

  const answerConsent = useCallback((yes: boolean) => {
    if (consentResolverRef.current) {
      consentResolverRef.current(yes)
      consentResolverRef.current = null
    } else {
      // Direct state advance when not in promise-based consent
      const current = stateRef.current
      if (current.status !== 'consent') return
      if (yes) {
        updateState({ status: 'qa-offer', canSkip: false })
      } else {
        playSegment(current.currentSegmentIndex + 1)
      }
    }
  }, [updateState, playSegment])

  const start = useCallback((artworkId: string) => {
    abortRef.current = false
    const segments = getNarrationSegments(artworkId)

    if (segments.length === 0) {
      audioLogger.log('WARN', 'NarrationQueue', `no narration data for artworkId: "${artworkId}"`)
      return
    }

    segmentsRef.current = segments
    setNarrationHistory([])
    updateState({ ...INITIAL_STATE, artworkId })
    audioLogger.log('INFO', 'NarrationQueue', `starting narration for "${artworkId}" (${segments.length} segments)`)
    playSegment(0)
  }, [updateState, playSegment])

  const pause = useCallback(() => {
    stopPassiveListener()
    ttsService.pause()
    audioLogger.log('INFO', 'NarrationQueue', 'paused')
  }, [ttsService, stopPassiveListener])

  const resume = useCallback(() => {
    ttsService.resume()
    if (stateRef.current.canSkip) startPassiveListener()
    audioLogger.log('INFO', 'NarrationQueue', 'resumed')
  }, [ttsService, startPassiveListener])

  const stop = useCallback(() => {
    abortRef.current = true
    stopPassiveListener()
    ttsService.cancel()
    updateState({ ...INITIAL_STATE })
    audioLogger.log('INFO', 'NarrationQueue', 'stopped')
  }, [ttsService, stopPassiveListener, updateState])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true
      stopPassiveListener()
      ttsService.cancel()
    }
  }, [stopPassiveListener, ttsService])

  return {
    state,
    narrationHistory,
    start,
    pause,
    resume,
    stop,
    skipToNext,
    answerConsent,
  }
}
