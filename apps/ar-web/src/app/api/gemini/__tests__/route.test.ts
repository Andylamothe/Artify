/**
 * @jest-environment node
 */

const mockGenerateContent = jest.fn()
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}))

import { POST } from '../route'
import { NextRequest } from 'next/server'
import type { GeminiArtworkContext } from '@/types/narration'

const mockContext: GeminiArtworkContext = {
  artwork: {
    title: 'Mona Lisa',
    artist: 'Leonardo da Vinci',
    year: '1503-1506',
    description: 'A portrait.',
    historicalContext: 'Painted in Florence.',
    arDescription: 'Golden particles.',
  },
  narrationHistory: [],
  conversationHistory: [],
}

function makeReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/gemini', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const ORIGINAL_CREDS = process.env.GOOGLE_APPLICATION_CREDENTIALS
const ORIGINAL_PROJECT = process.env.GCP_PROJECT_ID

beforeEach(() => {
  jest.clearAllMocks()
  process.env.GOOGLE_APPLICATION_CREDENTIALS = '/fake/path/creds.json'
  process.env.GCP_PROJECT_ID = 'test-project'
})

afterAll(() => {
  if (ORIGINAL_CREDS === undefined) delete process.env.GOOGLE_APPLICATION_CREDENTIALS
  else process.env.GOOGLE_APPLICATION_CREDENTIALS = ORIGINAL_CREDS
  if (ORIGINAL_PROJECT === undefined) delete process.env.GCP_PROJECT_ID
  else process.env.GCP_PROJECT_ID = ORIGINAL_PROJECT
})

describe('POST /api/gemini', () => {
  test('returns answer and tokensUsed on success (uses response.text)', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'It was painted around 1503.',
      usageMetadata: { totalTokenCount: 42 },
    })

    const res = await POST(makeReq({ question: 'When?', context: mockContext }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.answer).toBe('It was painted around 1503.')
    expect(data.tokensUsed).toBe(42)
  })

  test('falls back to candidates[0].content.parts[0].text when response.text is missing', async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [{ content: { parts: [{ text: 'Fallback answer.' }] } }],
      usageMetadata: { totalTokenCount: 5 },
    })

    const res = await POST(makeReq({ question: 'q', context: mockContext }))
    const data = await res.json()
    expect(data.answer).toBe('Fallback answer.')
  })

  test('strips markdown from response', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '**Bold** with `code`',
      usageMetadata: { totalTokenCount: 5 },
    })

    const res = await POST(makeReq({ question: 'q', context: mockContext }))
    const data = await res.json()
    expect(data.answer).toBe('Bold with code')
  })

  test('forwards conversationHistory as prior contents', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'Yes.',
      usageMetadata: { totalTokenCount: 1 },
    })

    const contextWithHistory: GeminiArtworkContext = {
      ...mockContext,
      conversationHistory: [
        { id: '1', role: 'visitor', text: 'First question', timestamp: 0, segmentIndexAtTime: 0 },
        { id: '2', role: 'guide', text: 'First answer', timestamp: 0, segmentIndexAtTime: 0 },
      ],
    }

    await POST(makeReq({ question: 'Follow up', context: contextWithHistory }))

    const callArgs = mockGenerateContent.mock.calls[0][0]
    expect(callArgs.contents).toHaveLength(3) // 2 prior + 1 new
    expect(callArgs.contents[0].role).toBe('user')
    expect(callArgs.contents[0].parts[0].text).toBe('First question')
    expect(callArgs.contents[1].role).toBe('model')
    expect(callArgs.contents[2].parts[0].text).toBe('Follow up')
  })

  test('passes systemInstruction in config', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'A.',
      usageMetadata: { totalTokenCount: 1 },
    })

    await POST(makeReq({ question: 'q', context: mockContext }))

    const callArgs = mockGenerateContent.mock.calls[0][0]
    expect(callArgs.config?.systemInstruction).toContain('audio guide')
    expect(callArgs.config?.maxOutputTokens).toBe(200)
  })

  test('returns 400 when question is missing', async () => {
    const res = await POST(makeReq({ context: mockContext }))
    expect(res.status).toBe(400)
  })

  test('returns 503 when GOOGLE_APPLICATION_CREDENTIALS is not set', async () => {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS
    const res = await POST(makeReq({ question: 'q', context: mockContext }))
    expect(res.status).toBe(503)
  })

  test('returns 429 when Vertex AI signals quota exhaustion (gRPC code 8)', async () => {
    mockGenerateContent.mockRejectedValue({ code: 8, message: 'resource exhausted' })
    const res = await POST(makeReq({ question: 'q', context: mockContext }))
    expect(res.status).toBe(429)
  })

  test('returns 429 when Vertex AI signals HTTP 429', async () => {
    mockGenerateContent.mockRejectedValue({ code: 429, message: 'too many requests' })
    const res = await POST(makeReq({ question: 'q', context: mockContext }))
    expect(res.status).toBe(429)
  })

  test('returns 403 with IAM hint on permission denied', async () => {
    mockGenerateContent.mockRejectedValue({ message: 'got status: 403 Forbidden' })
    const res = await POST(makeReq({ question: 'q', context: mockContext }))
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.hint).toMatch(/roles\/aiplatform.user/)
  })

  test('returns 502 on other upstream errors', async () => {
    mockGenerateContent.mockRejectedValue(new Error('server error'))
    const res = await POST(makeReq({ question: 'q', context: mockContext }))
    expect(res.status).toBe(502)
  })
})
