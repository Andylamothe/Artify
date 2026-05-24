import '@testing-library/jest-dom'

// Polyfill AbortSignal.timeout for jsdom
if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout !== 'function') {
  ;(AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout = (ms: number) => {
    const controller = new AbortController()
    setTimeout(() => controller.abort(new DOMException('TimeoutError', 'TimeoutError')), ms)
    return controller.signal
  }
}
