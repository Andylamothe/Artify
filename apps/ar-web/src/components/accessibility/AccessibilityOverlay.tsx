'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ttsService } from '@/services/tts'
import { sttService } from '@/services/stt'
import { geminiService } from '@/services/ai'
import { useNarrationQueue } from '@/hooks/accessibility/useNarrationQueue'
import { useArtworkQA } from '@/hooks/accessibility/useArtworkQA'
import { QAInterface } from './QAInterface'
import type { ArtworkConfig } from '@/types/ar'

interface AccessibilityOverlayProps {
  enabled: boolean
  activeArtwork: ArtworkConfig | null
  artworks: ArtworkConfig[]
  onDisable: () => void
}

function normalizeNarrationArtworkId(artwork: ArtworkConfig): string {
  const fingerprint = `${artwork.id} ${artwork.title}`.toLowerCase()
  if (
    fingerprint.includes('starring-night') ||
    fingerprint.includes('starry-night') ||
    fingerprint.includes('starry night') ||
    fingerprint.includes('starrynight')
  ) {
    return 'starry-night'
  }
  return artwork.id
}

export default function AccessibilityOverlay({
  enabled,
  activeArtwork,
  artworks,
  onDisable,
}: AccessibilityOverlayProps) {
  const [manualPickerOpen, setManualPickerOpen] = useState(false)
  const [manualArtwork, setManualArtwork] = useState<ArtworkConfig | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [showQA, setShowQA] = useState(false)
  const activeGuideArtwork = activeArtwork ?? manualArtwork
  const lastStartedArtworkId = useRef<string | null>(null)

  const { state, narrationHistory, start, pause, resume, stop, skipToNext, answerConsent } =
    useNarrationQueue(ttsService)

  const qa = useArtworkQA({
    artwork: activeGuideArtwork ?? artworks[0],
    narrationHistory,
    ttsService,
    sttService,
    geminiService,
    currentSegmentIndex: state.currentSegmentIndex,
  })
  const { session: qaSession, startQA, stopListening, exitQA } = qa

  useEffect(() => {
    if (!enabled) {
      lastStartedArtworkId.current = null
      const resetId = window.setTimeout(() => {
        setManualPickerOpen(false)
        setManualArtwork(null)
        setIsPaused(false)
        setShowQA(false)
      }, 0)
      stop()
      exitQA()
      return () => window.clearTimeout(resetId)
    }

    if (!activeGuideArtwork) return

    const narrationId = normalizeNarrationArtworkId(activeGuideArtwork)
    if (lastStartedArtworkId.current === narrationId) return

    lastStartedArtworkId.current = narrationId
    setIsPaused(false)
    window.dispatchEvent(new CustomEvent('artify-accessibility-started'))
    start(narrationId)
  }, [activeGuideArtwork, enabled, exitQA, start, stop])

  const handleDisable = useCallback(() => {
    stop()
    exitQA()
    onDisable()
  }, [exitQA, onDisable, stop])

  const handlePause = useCallback(() => {
    setIsPaused(true)
    pause()
  }, [pause])

  const handleResume = useCallback(() => {
    setIsPaused(false)
    resume()
  }, [resume])

  const handleOpenQA = useCallback(async () => {
    if (!activeGuideArtwork) return
    setShowQA(true)
    pause()
    await startQA()
    setShowQA(false)
    resume()
  }, [activeGuideArtwork, pause, resume, startQA])

  const handleManualSelect = useCallback((artwork: ArtworkConfig) => {
    setManualArtwork(artwork)
    setManualPickerOpen(false)
  }, [])

  if (!enabled) return null

  const statusLabel =
    state.status === 'speaking' || state.status === 'label'
      ? 'Speaking'
      : state.status === 'consent'
        ? 'Continue?'
        : state.status === 'qa-offer'
        ? 'Question ready'
        : activeGuideArtwork
          ? 'Ready'
          : 'Waiting for target'

  return (
    <>
      <section className="voice-assistant-panel" aria-label="Voice Assistant">
        <div className="voice-assistant-copy">
          <span>Voice Assistant</span>
          <strong>{activeGuideArtwork ? activeGuideArtwork.title : 'Scan artwork'}</strong>
          <small>{statusLabel}</small>
        </div>
        <div className="voice-assistant-actions">
          {!activeGuideArtwork ? (
            <button
              type="button"
              className="chip"
              onClick={() => setManualPickerOpen(true)}
              aria-label="Choose artwork manually"
            >
              Choose manually
            </button>
          ) : null}
          {state.status === 'consent' ? (
            <>
              <button type="button" className="chip" onClick={() => answerConsent(false)}>
                Continue
              </button>
              <button type="button" className="chip" onClick={() => answerConsent(true)}>
                Ask
              </button>
            </>
          ) : null}
          {state.status === 'qa-offer' ? (
            <>
              <button type="button" className="chip" onClick={() => void handleOpenQA()} disabled={!activeGuideArtwork}>
                Ask
              </button>
              <button type="button" className="chip" onClick={() => skipToNext('button')}>
                Finish
              </button>
            </>
          ) : null}
          {activeGuideArtwork && state.status !== 'consent' && state.status !== 'qa-offer' ? (
            <button type="button" className="chip" onClick={() => void handleOpenQA()}>
              Ask
            </button>
          ) : null}
          {state.status === 'speaking' || state.status === 'label' ? (
            <button type="button" className="chip" onClick={isPaused ? handleResume : handlePause}>
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          ) : null}
          <button type="button" className="chip warning" onClick={handleDisable} aria-label="Turn off Voice Assistant">
            Off
          </button>
        </div>
      </section>

      {manualPickerOpen ? (
        <div className="voice-assistant-picker" role="dialog" aria-modal="false" aria-label="Choose artwork manually">
          <div className="voice-assistant-picker-head">
            <strong>Choose artwork</strong>
            <button type="button" className="chip" onClick={() => setManualPickerOpen(false)}>
              Close
            </button>
          </div>
          <div className="voice-assistant-picker-list">
            {artworks.map((artwork) => (
              <button key={artwork.id} type="button" onClick={() => handleManualSelect(artwork)}>
                <strong>{artwork.title}</strong>
                <span>
                  {artwork.artist} · {artwork.year}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showQA ? (
        <QAInterface
          session={qaSession}
          onStopListening={stopListening}
          onAskAnother={() => startQA()}
          onDone={() => { exitQA(); setShowQA(false); resume() }}
          onSkipTour={() => { exitQA(); setShowQA(false); skipToNext('button') }}
        />
      ) : null}
    </>
  )
}
