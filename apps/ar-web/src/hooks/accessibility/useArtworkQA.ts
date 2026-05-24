'use client'

import { useCallback, useRef, useState } from 'react'
import { audioLogger } from '@/services/audio/AudioLogger'
import type { TTSService } from '@/services/tts/TTSService'
import type { STTService } from '@/services/stt/STTService'
import type { GeminiService } from '@/services/ai/GeminiService'
import type { GeminiArtworkContext, QASession, QAStatus } from '@/types/narration'
import type { ArtworkConfig } from '@/types/ar'

const MAX_TURNS = 10
const SESSION_STORAGE_PREFIX = 'artify-qa-'

function buildContext(
  artwork: ArtworkConfig,
  narrationHistory: { segmentLabel: string; text: string }[],
  session: QASession,
): GeminiArtworkContext {
  return {
    artwork: {
      title: artwork.title,
      artist: artwork.artist,
      year: artwork.year,
      description: artwork.shortSummary,
      historicalContext: artwork.historyText,
      arDescription: `An augmented reality scene with ${artwork.arSceneType} effects`,
    },
    narrationHistory,
    conversationHistory: session.turns,
  }
}

function loadSession(artworkId: string): QASession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(`${SESSION_STORAGE_PREFIX}${artworkId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as QASession
    audioLogger.log('INFO', 'QA', `session restored from sessionStorage: ${parsed.turns.length} turns`)
    return parsed
  } catch {
    return null
  }
}

function saveSession(session: QASession): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(`${SESSION_STORAGE_PREFIX}${session.artworkId}`, JSON.stringify(session))
  } catch { /* storage full or unavailable */ }
}

function makeEmptySession(artworkId: string): QASession {
  return { artworkId, turns: [], status: 'idle', errorMessage: null }
}

async function checkMicrophoneAvailable(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((track) => track.stop())
    return true
  } catch (err) {
    if (err instanceof DOMException && err.name === 'NotAllowedError') {
      audioLogger.log('WARN', 'QA', 'mic permission denied')
    }
    return false
  }
}

export interface UseArtworkQAOptions {
  artwork: ArtworkConfig
  narrationHistory: { segmentLabel: string; text: string }[]
  ttsService: TTSService
  sttService: STTService
  geminiService: GeminiService
  currentSegmentIndex: number
}

export interface UseArtworkQAReturn {
  session: QASession
  qaAvailable: boolean
  startQA(): Promise<void>
  stopListening(): void
  exitQA(): void
}

export function useArtworkQA(options: UseArtworkQAOptions): UseArtworkQAReturn {
  const { artwork, narrationHistory, ttsService, sttService, geminiService, currentSegmentIndex } = options

  const [session, setSession] = useState<QASession>(() => {
    return loadSession(artwork.id) ?? makeEmptySession(artwork.id)
  })
  const [qaAvailable, setQaAvailable] = useState(true)

  // sessionRef mirrors `session` so the long-running startQA() loop can read
  // the latest turns without re-creating the callback. Kept in sync inside
  // `updateSession` / `pushTurn`, which are the only paths that mutate it.
  const sessionRef = useRef(session)

  const activeRef = useRef(false)
  const stopListeningTriggerRef = useRef<(() => void) | null>(null)

  const updateSession = useCallback((patch: Partial<QASession>) => {
    setSession((prev) => {
      const next = { ...prev, ...patch }
      sessionRef.current = next
      saveSession(next)
      return next
    })
  }, [])

  const pushTurn = useCallback((turn: QASession['turns'][number]) => {
    setSession((prev) => {
      const next = { ...prev, turns: [...prev.turns, turn] }
      sessionRef.current = next
      saveSession(next)
      return next
    })
  }, [])

  const setStatus = useCallback((status: QAStatus, errorMessage: string | null = null) => {
    updateSession({ status, errorMessage })
  }, [updateSession])

  const stopListening = useCallback(() => {
    if (stopListeningTriggerRef.current) {
      stopListeningTriggerRef.current()
      stopListeningTriggerRef.current = null
    }
  }, [])

  const exitQA = useCallback(() => {
    activeRef.current = false
    sttService.cancel()
    setStatus('idle')
    audioLogger.log('INFO', 'QA', 'user exited Q&A')
  }, [sttService, setStatus])

  const startQA = useCallback(async () => {
    const micAvailable = await checkMicrophoneAvailable()
    setQaAvailable(micAvailable)
    if (!micAvailable) {
      audioLogger.log('WARN', 'QA', 'mic unavailable — Q&A disabled for this session')
      await ttsService.speak('Microphone access is not available. Continuing the tour.')
      return
    }

    activeRef.current = true
    audioLogger.log('INFO', 'QA', `session started for artwork "${artwork.id}"`)

    let turnCount = sessionRef.current.turns.length

    while (activeRef.current) {
      if (turnCount >= MAX_TURNS) {
        audioLogger.log('WARN', 'QA', `max turns (${MAX_TURNS}) reached — exiting Q&A`)
        await ttsService.speak("We've covered a lot of ground. Let's continue the tour.")
        exitQA()
        break
      }

      // Prompt visitor
      setStatus('listening')
      await ttsService.speak('Ask your question now.')

      try {
        await new Promise<void>((resolve, reject) => {
          stopListeningTriggerRef.current = resolve
          sttService.startRecording(resolve).catch(reject)
        })
      } catch (err) {
        audioLogger.log('ERROR', 'QA', `microphone failed: ${err}`)
        await ttsService.speak('Microphone access is not available. Continuing the tour.')
        exitQA()
        return
      }

      setStatus('transcribing')
      let transcript = ''
      try {
        const result = await sttService.stopRecording()
        transcript = result.transcript.trim()
      } catch (err) {
        audioLogger.log('ERROR', 'QA', `STT failed: ${err}`)
        await ttsService.speak("I couldn't connect. Please check your connection and try again.")
        exitQA()
        return
      }

      if (!transcript) {
        audioLogger.log('WARN', 'QA', 'empty transcript — re-prompting')
        await ttsService.speak("I didn't catch that. Please ask again.")
        continue
      }

      turnCount++
      const visitorTurn = {
        id: crypto.randomUUID(),
        role: 'visitor' as const,
        text: transcript,
        timestamp: Date.now(),
        audioSource: 'gcp-stt' as const,
        segmentIndexAtTime: currentSegmentIndex,
      }

      pushTurn(visitorTurn)
      audioLogger.log('INFO', 'QA', `turn ${turnCount}: visitor asked "${transcript.slice(0, 40)}"`)

      // Fetch Gemini answer
      setStatus('thinking')
      await ttsService.speak('Let me think about that.')

      let answer = ''
      try {
        const context = buildContext(artwork, narrationHistory, sessionRef.current)
        const response = await geminiService.ask(transcript, context)
        answer = response.answer
      } catch (err) {
        const code = (err as { code?: string }).code
        if (code === 'quota_exceeded') {
          audioLogger.log('WARN', 'QA', 'Gemini quota exceeded')
          await ttsService.speak("I've reached my question limit for now. Please ask gallery staff.")
        } else {
          audioLogger.log('ERROR', 'QA', `Gemini error: ${err}`)
          await ttsService.speak("Something went wrong. Let's continue with the tour.")
        }
        exitQA()
        return
      }

      const guideTurn = {
        id: crypto.randomUUID(),
        role: 'guide' as const,
        text: answer,
        timestamp: Date.now(),
        segmentIndexAtTime: currentSegmentIndex,
      }

      pushTurn(guideTurn)
      audioLogger.log('INFO', 'QA', `turn ${turnCount}: guide answered "${answer.slice(0, 40)}"`)

      setStatus('answering')
      await ttsService.speak(answer)

      // Prompt for next question / done / skip
      await ttsService.speak(
        "Ask another question, say 'done' when finished, or say 'skip' to continue the tour."
      )

      // Passive listen for 'done' or 'skip'
      const nextAction = await new Promise<'done' | 'skip' | 'continue'>((resolve) => {
        const SpeechRec =
          typeof window !== 'undefined' &&
          (window.SpeechRecognition ||
            (window as unknown as { webkitSpeechRecognition: typeof SpeechRecognition }).webkitSpeechRecognition)

        if (!SpeechRec) { resolve('continue'); return }

        const rec = new SpeechRec()
        rec.lang = 'en-US'
        rec.continuous = false
        rec.interimResults = false

        rec.onresult = (event) => {
          const t = event.results[0][0].transcript.toLowerCase().trim()
          if (t.includes('done')) {
            audioLogger.log('INFO', 'QA', 'user said "done" — exiting Q&A')
            resolve('done')
          } else if (t.includes('skip')) {
            audioLogger.log('INFO', 'QA', 'user said "skip" — exiting Q&A and skipping segment')
            resolve('skip')
          } else {
            resolve('continue')
          }
          rec.stop()
        }

        rec.onerror = () => resolve('continue')
        rec.onend = () => { /* handled above */ }

        // Also allow button tap to exit
        stopListeningTriggerRef.current = () => resolve('done')

        try { rec.start() } catch { resolve('continue') }
      })

      if (nextAction === 'done' || nextAction === 'skip') {
        exitQA()
        break
      }
      // else: loop continues with next question
    }
  }, [
    artwork, narrationHistory, ttsService, sttService, geminiService,
    currentSegmentIndex, pushTurn, setStatus, exitQA,
  ])

  return { session, qaAvailable, startQA, stopListening, exitQA }
}
