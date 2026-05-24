'use client'

import { useEffect } from 'react'
import type { NarrationQueueState } from '@/types/narration'

interface AccessibilityAudioBarProps {
  state: NarrationQueueState
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onSkip: () => void
  onOpenQA: () => void
  isPaused: boolean
  rate: number
  onRateChange: (rate: number) => void
}

const RATES = [0.75, 1, 1.25, 1.5]

export function AccessibilityAudioBar({
  state,
  onPause,
  onResume,
  onStop,
  onSkip,
  onOpenQA,
  isPaused,
  rate,
  onRateChange,
}: AccessibilityAudioBarProps) {
  const active = state.status !== 'idle' && state.status !== 'completed'

  // Keyboard: Right arrow → skip
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && state.canSkip) {
        e.preventDefault()
        onSkip()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [state.canSkip, onSkip])

  if (!active) return null

  return (
    <div
      role="toolbar"
      aria-label="Accessibility narration controls"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(0,0,0,0.92)',
        borderTop: '1px solid rgba(255,255,255,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1rem',
        paddingBottom: 'env(safe-area-inset-bottom)',
        minHeight: 72,
        zIndex: 999,
        gap: '0.5rem',
      }}
    >
      {/* Segment label */}
      <span
        aria-live="polite"
        style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: '0.75rem',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {state.currentSegmentIndex >= 0
          ? `${state.currentSegmentIndex + 1} of 6`
          : 'Starting…'}
      </span>

      {/* Play / Pause */}
      <button
        onClick={isPaused ? onResume : onPause}
        aria-label={isPaused ? 'Resume narration' : 'Pause narration'}
        style={btnStyle}
      >
        {isPaused ? '▶' : '⏸'}
      </button>

      {/* Skip */}
      <button
        onClick={onSkip}
        disabled={!state.canSkip}
        aria-label="Skip section"
        aria-disabled={!state.canSkip}
        style={{
          ...btnStyle,
          opacity: state.canSkip ? 1 : 0.35,
          cursor: state.canSkip ? 'pointer' : 'default',
        }}
      >
        Skip →
      </button>

      {/* Stop */}
      <button
        onClick={onStop}
        aria-label="Stop narration"
        style={btnStyle}
      >
        ■
      </button>

      {/* Speed */}
      <select
        value={rate}
        onChange={(e) => onRateChange(Number(e.target.value))}
        aria-label="Narration speed"
        style={{
          background: 'transparent',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 4,
          padding: '0.25rem 0.5rem',
          fontSize: '0.85rem',
          cursor: 'pointer',
          height: 40,
        }}
      >
        {RATES.map((r) => (
          <option key={r} value={r} style={{ background: '#111', color: '#fff' }}>
            {r}×
          </option>
        ))}
      </select>

      {/* Open Q&A */}
      <button
        onClick={onOpenQA}
        aria-label="Ask a question"
        title="Ask a question"
        style={btnStyle}
      >
        🎙
      </button>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  background: 'transparent',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.3)',
  borderRadius: 6,
  minWidth: 60,
  minHeight: 60,
  fontSize: '1rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
