import { GeminiAPIService } from '../GeminiAPIService'
import type { GeminiArtworkContext } from '@/types/narration'

const mockContext: GeminiArtworkContext = {
  artwork: {
    title: 'Mona Lisa',
    artist: 'Leonardo da Vinci',
    year: '1503-1506',
    description: 'A portrait known for its subtle smile.',
    historicalContext: 'Painted in Florence during the High Renaissance.',
    arDescription: 'Golden particles rise around the portrait.',
  },
  narrationHistory: [
    { segmentLabel: 'Section 1 of 6: Scene labels', text: 'You are looking at the Mona Lisa.' },
  ],
  conversationHistory: [],
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GeminiAPIService', () => {
  test('ask() POSTs to /api/gemini with question and context', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: 'It was painted around 1503.', tokensUsed: 42 }),
    }) as jest.Mock

    const svc = new GeminiAPIService()
    const result = await svc.ask('When was this painted?', mockContext)

    expect(result.answer).toBe('It was painted around 1503.')
    expect(result.tokensUsed).toBe(42)
    expect(fetch).toHaveBeenCalledWith(
      '/api/gemini',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  test('ask() includes narration history in request body', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: 'Yes.', tokensUsed: 5 }),
    }) as jest.Mock

    const svc = new GeminiAPIService()
    await svc.ask('Tell me more', mockContext)

    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body)
    expect(body.context.narrationHistory).toHaveLength(1)
    expect(body.context.narrationHistory[0].segmentLabel).toBe('Section 1 of 6: Scene labels')
  })

  test('ask() includes prior conversation turns', async () => {
    const contextWithHistory: GeminiArtworkContext = {
      ...mockContext,
      conversationHistory: [
        { id: '1', role: 'visitor', text: 'First question', timestamp: 0, segmentIndexAtTime: 0 },
        { id: '2', role: 'guide', text: 'First answer', timestamp: 0, segmentIndexAtTime: 0 },
      ],
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: 'Follow-up answer', tokensUsed: 10 }),
    }) as jest.Mock

    const svc = new GeminiAPIService()
    await svc.ask('Follow-up question', contextWithHistory)

    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body)
    expect(body.context.conversationHistory).toHaveLength(2)
  })

  test('ask() throws GeminiError with code quota_exceeded on 429', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
    }) as jest.Mock

    const svc = new GeminiAPIService()
    await expect(svc.ask('question', mockContext)).rejects.toMatchObject({ code: 'quota_exceeded' })
  })

  test('ask() throws GeminiError with code unknown on non-429 error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
    }) as jest.Mock

    const svc = new GeminiAPIService()
    await expect(svc.ask('question', mockContext)).rejects.toMatchObject({ code: 'unknown' })
  })

  test('ask() strips markdown from response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: '**Bold answer** with `code` and _italic_', tokensUsed: 5 }),
    }) as jest.Mock

    const svc = new GeminiAPIService()
    const result = await svc.ask('q', mockContext)
    expect(result.answer).toBe('Bold answer with code and italic')
  })
})
