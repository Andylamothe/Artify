'use client'

import type { QASession } from '@/types/narration'

interface QAInterfaceProps {
  session: QASession
  onStopListening: () => void
  onAskAnother: () => void
  onDone: () => void
  onSkipTour: () => void
}

export function QAInterface({
  session,
  onStopListening,
  onAskAnother,
  onDone,
  onSkipTour,
}: QAInterfaceProps) {
  const lastAnswer = [...session.turns].reverse().find((t) => t.role === 'guide')?.text ?? ''

  const statusLabel =
    session.status === 'listening' ? 'Listening...' :
    session.status === 'transcribing' ? 'Processing...' :
    session.status === 'thinking' ? 'Finding an answer...' :
    session.status === 'answering' ? 'Answer:' :
    ''

  return (
    <div role="dialog" aria-modal="false" aria-label="Question and answer" className="qa-compact-panel">
      <p aria-live="assertive" className="qa-status">
        {statusLabel}
      </p>

      {session.status === 'listening' ? (
        <div className="qa-listening-row">
          <div aria-hidden="true" className="qa-listening-dot" />
          <button type="button" onClick={onStopListening} className="chip">
            Done
          </button>
        </div>
      ) : null}

      {session.status === 'thinking' || session.status === 'transcribing' ? (
        <div aria-hidden="true" className="qa-spinner" />
      ) : null}

      {session.status === 'answering' && lastAnswer ? (
        <p className="qa-answer">{lastAnswer}</p>
      ) : null}

      {session.status === 'answering' ? (
        <div className="qa-actions">
          <button type="button" onClick={onAskAnother} className="chip">
            Ask another
          </button>
          <button type="button" onClick={onDone} className="chip">
            Done
          </button>
          <button type="button" onClick={onSkipTour} className="chip">
            Skip tour section
          </button>
        </div>
      ) : (
        <button type="button" onClick={onDone} aria-label="Exit Q&A" className="qa-close-button">
          x
        </button>
      )}
    </div>
  )
}
