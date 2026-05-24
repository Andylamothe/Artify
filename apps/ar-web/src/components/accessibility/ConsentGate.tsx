'use client'

import { useEffect, useRef } from 'react'

interface ConsentGateProps {
  question: string
  onAnswer: (yes: boolean) => void
}

export function ConsentGate({ question, onAnswer }: ConsentGateProps) {
  const listenerRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    const SpeechRec =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition: typeof SpeechRecognition }).webkitSpeechRecognition)

    if (!SpeechRec) return

    const rec = new SpeechRec()
    rec.lang = 'en-US'
    rec.continuous = false
    rec.interimResults = false

    rec.onresult = (event) => {
      const t = event.results[0][0].transcript.toLowerCase().trim()
      if (t.includes('yes') || t.includes('yeah') || t.includes('sure')) {
        onAnswer(true)
      } else if (t.includes('no') || t.includes('nope')) {
        onAnswer(false)
      }
    }

    rec.onerror = () => { /* silently ignore — buttons still work */ }

    try { rec.start() } catch { /* voice unavailable — buttons only */ }
    listenerRef.current = rec

    return () => {
      try { rec.stop() } catch { /* already stopped */ }
    }
  }, [onAnswer])

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="accessibility-consent-gate"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '2rem',
        gap: '2rem',
      }}
    >
      <p
        aria-live="assertive"
        style={{
          color: '#fff',
          fontSize: '1.5rem',
          textAlign: 'center',
          maxWidth: '480px',
          lineHeight: 1.5,
        }}
      >
        {question}
      </p>
      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <button
          onClick={() => onAnswer(true)}
          aria-label="Yes"
          style={{
            minWidth: 120,
            minHeight: 60,
            fontSize: '1.25rem',
            background: '#fff',
            color: '#000',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Yes
        </button>
        <button
          onClick={() => onAnswer(false)}
          aria-label="No"
          style={{
            minWidth: 120,
            minHeight: 60,
            fontSize: '1.25rem',
            background: 'transparent',
            color: '#fff',
            border: '2px solid #fff',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          No
        </button>
      </div>
    </div>
  )
}
