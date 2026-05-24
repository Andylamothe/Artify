import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AccessibilityOverlay from '../AccessibilityOverlay'
import type { ArtworkConfig } from '@/types/ar'

const workbenchArtwork: ArtworkConfig = {
  id: 'starring-night',
  title: 'Workbench Only Artwork',
  artist: 'Saved Manifest Artist',
  year: '1889',
  shortSummary: 'Summary',
  historyText: 'History',
  targetIndex: 1,
  audioUrl: '/ar/audio/starry-night.wav',
  audioEnabled: true,
  historicalImages: [],
  arSceneType: 'starryNight',
  colors: { primary: '#000', secondary: '#111', accent: '#222' },
  effects: { particleCount: 1, lowPowerParticleCount: 1, intensity: 'low' },
}

beforeEach(() => {
  jest.clearAllMocks()
  Object.defineProperty(window, 'speechSynthesis', {
    writable: true,
    configurable: true,
    value: {
      cancel: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      speak: jest.fn(),
      getVoices: jest.fn(() => []),
      pending: false,
      speaking: false,
      paused: false,
      onvoiceschanged: null,
    },
  })
  Object.defineProperty(global, 'SpeechSynthesisUtterance', {
    writable: true,
    value: jest.fn().mockImplementation((text: string) => ({
      text,
      rate: 1,
      onend: null,
      onerror: null,
    })),
  })
})

test('renders nothing while disabled', () => {
  render(
    <AccessibilityOverlay
      enabled={false}
      activeArtwork={workbenchArtwork}
      artworks={[workbenchArtwork]}
      onDisable={jest.fn()}
    />,
  )

  expect(screen.queryByText(/Voice Assistant/i)).not.toBeInTheDocument()
})

test('shows compact assistant status for active MindAR artwork', async () => {
  render(
    <AccessibilityOverlay
      enabled
      activeArtwork={workbenchArtwork}
      artworks={[workbenchArtwork]}
      onDisable={jest.fn()}
    />,
  )

  await waitFor(() => expect(screen.getByText('Voice Assistant')).toBeInTheDocument())
  expect(screen.getByText(/Workbench Only Artwork/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /turn off voice assistant/i })).toBeInTheDocument()
})

test('offers compact manual selection only when requested', async () => {
  render(
    <AccessibilityOverlay
      enabled
      activeArtwork={null}
      artworks={[workbenchArtwork]}
      onDisable={jest.fn()}
    />,
  )

  expect(screen.getByText(/scan artwork/i)).toBeInTheDocument()
  expect(screen.queryByText('Workbench Only Artwork')).not.toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: /choose artwork manually/i }))

  expect(screen.getByText('Workbench Only Artwork')).toBeInTheDocument()
  expect(screen.getByText(/Saved Manifest Artist/)).toBeInTheDocument()
})
