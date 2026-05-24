import { GCPSpeechToTextService } from '../GCPSpeechToTextService'

const mockStop = jest.fn()
const mockTracks = [{ stop: mockStop }]
const mockStream = { getTracks: () => mockTracks }

const mockRecorderInstance = {
  start: jest.fn(),
  stop: jest.fn(),
  ondataavailable: null as ((e: { data: Blob }) => void) | null,
  onstop: null as (() => void) | null,
  stream: mockStream,
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRecorderInstance.ondataavailable = null
  mockRecorderInstance.onstop = null

  Object.defineProperty(global, 'MediaRecorder', {
    writable: true,
    value: jest.fn().mockImplementation(() => mockRecorderInstance),
  })

  Object.assign(MediaRecorder, {
    isTypeSupported: jest.fn().mockReturnValue(true),
  })

  Object.defineProperty(global.navigator, 'mediaDevices', {
    writable: true,
    value: {
      getUserMedia: jest.fn().mockResolvedValue(mockStream),
    },
  })

  // Mock FileReader for blobToBase64
  Object.defineProperty(global, 'FileReader', {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      readAsDataURL: jest.fn(function (this: { onloadend: () => void; result: string }) {
        this.result = 'data:audio/webm;base64,dGVzdA=='
        this.onloadend()
      }),
      onloadend: null,
      onerror: null,
      result: '',
    })),
  })
})

describe('GCPSpeechToTextService', () => {
  test('startRecording() calls getUserMedia with audio:true', async () => {
    const svc = new GCPSpeechToTextService()
    await svc.startRecording()
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
  })

  test('isRecording() returns true after start, false initially', async () => {
    const svc = new GCPSpeechToTextService()
    expect(svc.isRecording()).toBe(false)
    await svc.startRecording()
    expect(svc.isRecording()).toBe(true)
  })

  test('stopRecording() POSTs to /api/stt and returns transcript', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ alternatives: [{ transcript: 'What year was this painted?', confidence: 0.95 }] }],
      }),
    }) as jest.Mock

    const svc = new GCPSpeechToTextService()
    await svc.startRecording()

    // Simulate audio data
    mockRecorderInstance.ondataavailable?.({ data: new Blob(['a'.repeat(2000)]) })

    const resultPromise = svc.stopRecording()
    mockRecorderInstance.onstop?.()

    const result = await resultPromise
    expect(result.transcript).toBe('What year was this painted?')
    expect(result.confidence).toBe(0.95)
    expect(fetch).toHaveBeenCalledWith('/api/stt', expect.objectContaining({ method: 'POST' }))
  })

  test('stopRecording() resolves with empty transcript when audio is too small (silence)', async () => {
    global.fetch = jest.fn() as jest.Mock

    const svc = new GCPSpeechToTextService()
    await svc.startRecording()

    // Tiny blob — below SILENCE_THRESHOLD_BYTES
    mockRecorderInstance.ondataavailable?.({ data: new Blob(['x']) })

    const resultPromise = svc.stopRecording()
    mockRecorderInstance.onstop?.()

    const result = await resultPromise
    expect(result.transcript).toBe('')
    expect(fetch).not.toHaveBeenCalled()
  })

  test('stopRecording() rejects on API error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }) as jest.Mock

    const svc = new GCPSpeechToTextService()
    await svc.startRecording()
    mockRecorderInstance.ondataavailable?.({ data: new Blob(['a'.repeat(2000)]) })

    const resultPromise = svc.stopRecording()
    mockRecorderInstance.onstop?.()

    await expect(resultPromise).rejects.toThrow('STT API error: 500')
  })

  test('cancel() stops recording without calling API', async () => {
    global.fetch = jest.fn() as jest.Mock

    const svc = new GCPSpeechToTextService()
    await svc.startRecording()
    svc.cancel()

    expect(fetch).not.toHaveBeenCalled()
    expect(svc.isRecording()).toBe(false)
  })
})
