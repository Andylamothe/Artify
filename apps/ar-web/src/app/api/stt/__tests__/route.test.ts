/**
 * @jest-environment node
 */

const mockRecognize = jest.fn()
jest.mock('@google-cloud/speech', () => ({
  SpeechClient: jest.fn().mockImplementation(() => ({
    recognize: mockRecognize,
  })),
}))

import { POST } from '../route'
import { NextRequest } from 'next/server'

function makeReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/stt', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const ORIGINAL_CREDS = process.env.GOOGLE_APPLICATION_CREDENTIALS

beforeEach(() => {
  jest.clearAllMocks()
  process.env.GOOGLE_APPLICATION_CREDENTIALS = '/fake/path/creds.json'
})

afterAll(() => {
  if (ORIGINAL_CREDS === undefined) {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS
  } else {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = ORIGINAL_CREDS
  }
})

describe('POST /api/stt', () => {
  test('returns transcript in expected shape on success', async () => {
    mockRecognize.mockResolvedValue([
      {
        results: [
          {
            alternatives: [
              { transcript: 'Hello world', confidence: 0.92 },
            ],
          },
        ],
      },
    ])

    const res = await POST(makeReq({ audio: 'base64string', config: { languageCode: 'en-US' } }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.results[0].alternatives[0].transcript).toBe('Hello world')
    expect(data.results[0].alternatives[0].confidence).toBe(0.92)
  })

  test('forwards sampleRateHertz and languageCode to the Speech client', async () => {
    mockRecognize.mockResolvedValue([{ results: [] }])

    await POST(
      makeReq({
        audio: 'base64string',
        config: { languageCode: 'fr-FR', sampleRateHertz: 16000 },
      }),
    )

    expect(mockRecognize).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          languageCode: 'fr-FR',
          sampleRateHertz: 16000,
          encoding: 'WEBM_OPUS',
        }),
        audio: { content: 'base64string' },
      }),
    )
  })

  test('returns 400 when audio is missing', async () => {
    const res = await POST(makeReq({ config: {} }))
    expect(res.status).toBe(400)
    expect(mockRecognize).not.toHaveBeenCalled()
  })

  test('returns 503 when GOOGLE_APPLICATION_CREDENTIALS is not set', async () => {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS
    const res = await POST(makeReq({ audio: 'base64', config: {} }))
    expect(res.status).toBe(503)
  })

  test('returns 502 when the Speech client throws', async () => {
    mockRecognize.mockRejectedValue(new Error('upstream failure'))
    const res = await POST(makeReq({ audio: 'base64', config: {} }))
    expect(res.status).toBe(502)
  })

  test('returns 200 with empty results array when no transcripts come back', async () => {
    mockRecognize.mockResolvedValue([{ results: [] }])
    const res = await POST(makeReq({ audio: 'base64', config: {} }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.results).toEqual([])
  })
})
