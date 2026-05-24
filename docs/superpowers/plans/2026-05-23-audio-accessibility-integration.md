# Audio Accessibility Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate `origin/feature/audio-accessibility` into the current Artify AR app without regressing MindAR tracking, workbench-edited artwork data, native A-Frame panels, existing artwork audio, or deployment safety.

**Architecture:** Keep the current AR runtime and workbench state as the source of truth. Import the accessibility services, hooks, tests, and UI from the feature branch, then adapt the overlay so it consumes the same live artwork manifest as `ARExperience` and never starts microphone, STT, Gemini, or TTS until the visitor explicitly opts in.

**Tech Stack:** Next.js 16 App Router, React 19, MindAR, A-Frame, Three.js, Web Speech API, MediaRecorder, Google Cloud Speech-to-Text, Vertex AI Gemini via `@google/genai`, Jest.

---

## Pre-Implementation Findings

- `origin/feature/audio-accessibility` fetches cleanly and has one commit: `defd27f Add audio accessibility (TTS narration, GCP STT, Vertex AI Q&A, skip)`.
- A virtual merge of `HEAD` and `origin/feature/audio-accessibility` has no Git conflict.
- The working tree already contains uncommitted AR/workbench changes. Do not overwrite these files from the branch:
  - `apps/ar-web/src/components/ar/ARExperience.tsx`
  - `apps/ar-web/src/components/ar/scenes/ARCustomObjects.tsx`
  - `apps/ar-web/src/components/ar/scenes/StarryNightScene.tsx`
  - `apps/ar-web/src/components/workbench/MindTargetWorkbench.tsx`
  - `apps/ar-web/src/data/artworks.ts`
  - `apps/ar-web/src/types/ar.ts`
  - `apps/ar-web/public/ar/workbench/artworks.json`
- Branch risk: `AccessibilityOverlay` imports `artworks` from `src/data/artworks.ts`, so it would ignore runtime/workbench edits loaded from `/api/workbench/artworks`.
- Branch risk: `useArtworkQA` requests microphone permission on mount, even when the visitor has not opened accessibility mode.
- Branch risk: TTS narration and existing artwork narration audio can play at the same time.
- Branch risk: `AccessibilityOverlay` is hard-mounted over `/ar`; z-index and full-screen dialogs can cover the camera and native A-Frame panels.
- Branch risk: route handlers depend on `GOOGLE_APPLICATION_CREDENTIALS`, `GCP_PROJECT_ID`, and IAM. Missing config must degrade gracefully.
- Branch risk: the narration data only knows `starry-night`, not possible prod id `starring-night`.

## Files

- Add from branch: `apps/ar-web/src/components/accessibility/AccessibilityAudioBar.tsx`
- Add from branch and modify: `apps/ar-web/src/components/accessibility/AccessibilityOverlay.tsx`
- Add from branch: `apps/ar-web/src/components/accessibility/ConsentGate.tsx`
- Add from branch: `apps/ar-web/src/components/accessibility/QAInterface.tsx`
- Add from branch and modify: `apps/ar-web/src/hooks/accessibility/useArtworkQA.ts`
- Add from branch and modify: `apps/ar-web/src/hooks/accessibility/useNarrationQueue.ts`
- Add from branch and modify: `apps/ar-web/src/data/narrationData.ts`
- Add from branch: `apps/ar-web/src/services/audio/AudioLogger.ts`
- Add from branch: `apps/ar-web/src/services/tts/*`
- Add from branch: `apps/ar-web/src/services/stt/*`
- Add from branch: `apps/ar-web/src/services/ai/*`
- Add from branch: `apps/ar-web/src/types/narration.ts`
- Add from branch: `apps/ar-web/src/types/speech-recognition.d.ts`
- Add from branch: `apps/ar-web/src/app/api/stt/route.ts`
- Add from branch: `apps/ar-web/src/app/api/gemini/route.ts`
- Add from branch: `apps/ar-web/jest.config.js`
- Add from branch: `apps/ar-web/jest.setup.ts`
- Modify: `apps/ar-web/package.json`
- Modify: `apps/ar-web/package-lock.json`
- Modify: `apps/ar-web/eslint.config.mjs`
- Modify: `.gitignore`
- Modify: `apps/ar-web/src/app/ar/page.tsx`
- Optional doc update: `apps/ar-web/docs/AR_MUSEUM_EXPERIENCE.md`

## Task 1: Create An Isolated Integration Branch

**Files:**
- No application files changed.

- [ ] **Step 1: Confirm dirty state before starting**

Run:

```powershell
git status --short --branch
```

Expected:

```text
## main...origin/main
 M apps/ar-web/src/app/api/workbench/artworks/route.ts
 M apps/ar-web/src/app/api/workbench/assets/route.ts
 M apps/ar-web/src/app/globals.css
 M apps/ar-web/src/components/ar/ARExperience.tsx
 M apps/ar-web/src/components/ar/scenes/ARCustomObjects.tsx
 M apps/ar-web/src/components/ar/scenes/MonaLisaScene.tsx
 M apps/ar-web/src/components/ar/scenes/ScreamScene.tsx
 M apps/ar-web/src/components/ar/scenes/StarryNightScene.tsx
 M apps/ar-web/src/components/workbench/MindTargetWorkbench.tsx
 M apps/ar-web/src/data/artworks.ts
 M apps/ar-web/src/types/ar.ts
?? apps/ar-web/docs/STARRY_NIGHT_AR_EXPERIENCE.md
?? apps/ar-web/public/ar/artworks/
?? apps/ar-web/public/ar/workbench/
?? apps/ar-web/src/components/ar/scenes/starry-night/
?? apps/ar-web/test/
```

- [ ] **Step 2: Create a branch without discarding current work**

Run:

```powershell
git switch -c codex/audio-accessibility-integration
```

Expected:

```text
Switched to a new branch 'codex/audio-accessibility-integration'
```

- [ ] **Step 3: Commit or stash only if the user asks**

Do not run `git reset`, `git checkout --`, or any destructive cleanup. Existing dirty files are part of the current project state.

## Task 2: Import Branch Files Without Overwriting Current AR Runtime

**Files:**
- Add: accessibility, service, API, test config files listed above.
- Modify: `apps/ar-web/package.json`
- Modify: `apps/ar-web/package-lock.json`
- Modify: `.gitignore`
- Modify: `apps/ar-web/eslint.config.mjs`

- [ ] **Step 1: Restore only non-conflicting new files from the branch**

Run:

```powershell
git restore --source origin/feature/audio-accessibility -- `
  apps/ar-web/.env.example `
  apps/ar-web/jest.config.js `
  apps/ar-web/jest.setup.ts `
  apps/ar-web/src/app/api/gemini `
  apps/ar-web/src/app/api/stt `
  apps/ar-web/src/components/accessibility `
  apps/ar-web/src/data/narrationData.ts `
  apps/ar-web/src/hooks/accessibility `
  apps/ar-web/src/services/ai `
  apps/ar-web/src/services/audio `
  apps/ar-web/src/services/stt `
  apps/ar-web/src/services/tts `
  apps/ar-web/src/types/narration.ts `
  apps/ar-web/src/types/speech-recognition.d.ts
```

Expected:

```text
No terminal output; files appear as added/modified in git status.
```

- [ ] **Step 2: Merge dependency metadata**

Update `apps/ar-web/package.json` so existing scripts remain and these are added:

```json
{
  "scripts": {
    "test": "jest",
    "test:coverage": "jest --coverage"
  },
  "dependencies": {
    "@google-cloud/speech": "^7.3.1",
    "@google/genai": "^2.6.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6",
    "@testing-library/react": "^16",
    "@testing-library/user-event": "^14",
    "@types/jest": "^29",
    "jest": "^29",
    "jest-environment-jsdom": "^29",
    "ts-jest": "^29"
  }
}
```

Keep existing `aframe`, `next`, `react`, `react-dom`, `three`, TypeScript, ESLint, and `compile:targets` entries.

- [ ] **Step 3: Regenerate lockfile from package.json**

Run:

```powershell
npm install
```

Working directory:

```text
C:\Users\PC\Documents\HackTheSummit\apps\ar-web
```

Expected:

```text
added/changed packages for Jest, Google Cloud Speech, and Google GenAI
```

- [ ] **Step 4: Merge `.gitignore` secret protections**

Ensure root `.gitignore` contains:

```gitignore
!.env.example
!.env.template
!.env.sample
*-service-account*.json
*service_account*.json
gcp-*.json
secrets/
apps/*/secrets/
totemic-veld-*.json
```

- [ ] **Step 5: Keep ESLint ignore additions only**

Ensure `apps/ar-web/eslint.config.mjs` still uses current project config, then add ignores for generated/vendor folders if missing:

```js
globalIgnores([
  ".next/**",
  "out/**",
  "build/**",
  "next-env.d.ts",
  "import/**",
  "docs/**",
  "public/ar/libs/**",
])
```

## Task 3: Make Accessibility Use Live Workbench Artwork Data

**Files:**
- Modify: `apps/ar-web/src/components/accessibility/AccessibilityOverlay.tsx`
- Modify: `apps/ar-web/src/data/narrationData.ts`

- [ ] **Step 1: Replace seed-only artwork loading**

In `AccessibilityOverlay.tsx`, replace the direct-only seed usage with manifest loading:

```tsx
import { artworks as defaultArtworks } from '@/data/artworks'
import type { ArtworkConfig } from '@/types/ar'

function normalizeNarrationArtworkId(artwork: ArtworkConfig): string {
  const fingerprint = `${artwork.id} ${artwork.title}`.toLowerCase()
  if (
    fingerprint.includes('starring-night') ||
    fingerprint.includes('starry-night') ||
    fingerprint.includes('starry night')
  ) {
    return 'starry-night'
  }
  return artwork.id
}
```

- [ ] **Step 2: Add runtime manifest state**

Inside `AccessibilityOverlay`, add:

```tsx
const [artworkList, setArtworkList] = useState<ArtworkConfig[]>(defaultArtworks)

useEffect(() => {
  let cancelled = false
  fetch('/api/workbench/artworks', { cache: 'no-store' })
    .then((response) => (response.ok ? response.json() : null))
    .then((manifest: { artworks?: ArtworkConfig[] } | null) => {
      if (cancelled || !manifest?.artworks?.length) return
      setArtworkList(manifest.artworks)
    })
    .catch(() => setArtworkList(defaultArtworks))

  return () => {
    cancelled = true
  }
}, [])
```

- [ ] **Step 3: Use live artwork list everywhere**

Replace:

```tsx
selectedArtwork ?? artworks[0]
artworks.map((artwork) => ...)
```

With:

```tsx
selectedArtwork ?? artworkList[0]
artworkList.map((artwork) => ...)
```

- [ ] **Step 4: Start narration with normalized id**

Replace:

```tsx
start(artwork.id)
```

With:

```tsx
start(normalizeNarrationArtworkId(artwork))
```

- [ ] **Step 5: Add alias support to `narrationData.ts`**

Add:

```ts
export function getNarrationSegments(artworkId: string): NarrationSegment[] {
  const normalizedId =
    artworkId === 'starring-night' || artworkId === 'starrynight'
      ? 'starry-night'
      : artworkId
  return narrationData[normalizedId] ?? []
}
```

Expected: prod `starring-night` continues to receive Starry Night narration.

## Task 4: Prevent Audio And Microphone Collisions

**Files:**
- Modify: `apps/ar-web/src/components/accessibility/AccessibilityOverlay.tsx`
- Modify: `apps/ar-web/src/hooks/accessibility/useArtworkQA.ts`
- Modify: `apps/ar-web/src/hooks/accessibility/useNarrationQueue.ts`

- [ ] **Step 1: Stop existing artwork audio when accessibility starts**

Because `AccessibilityOverlay` is currently separate from `ARExperience`, first use a browser event contract:

In `AccessibilityOverlay.tsx`, before `start(...)`:

```tsx
window.dispatchEvent(new CustomEvent('artify-accessibility-started'))
```

In `apps/ar-web/src/components/ar/ARExperience.tsx`, add:

```tsx
useEffect(() => {
  const onAccessibilityStarted = () => {
    pause()
  }
  window.addEventListener('artify-accessibility-started', onAccessibilityStarted)
  return () => {
    window.removeEventListener('artify-accessibility-started', onAccessibilityStarted)
  }
}, [pause])
```

Expected: Web Speech narration does not overlap the existing artwork audio element.

- [ ] **Step 2: Remove microphone permission request on hook mount**

In `useArtworkQA.ts`, delete the mount-time effect that calls:

```ts
navigator.mediaDevices.getUserMedia({ audio: true })
```

Replace it with this helper:

```ts
async function checkMicrophoneAvailable(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((track) => track.stop())
    return true
  } catch (err) {
    if (err instanceof DOMException && err.name === 'NotAllowedError') {
      audioLogger.log('WARN', 'QA', 'mic permission denied')
    }
    return false
  }
}
```

- [ ] **Step 3: Request microphone only inside `startQA()`**

At the top of `startQA()`:

```ts
const micAvailable = await checkMicrophoneAvailable()
setQaAvailable(micAvailable)
if (!micAvailable) {
  await ttsService.speak('Microphone access is not available. Continuing the tour.')
  return
}
```

Expected: opening `/ar` does not prompt for microphone; Q&A does.

- [ ] **Step 4: Always cancel TTS on unmount**

In `useNarrationQueue.ts` cleanup:

```ts
useEffect(() => {
  return () => {
    abortRef.current = true
    stopPassiveListener()
    ttsService.cancel()
  }
}, [stopPassiveListener, ttsService])
```

Expected: navigating away from `/ar` stops speech synthesis.

## Task 5: Mount Accessibility On `/ar` Without Breaking MindAR UI

**Files:**
- Modify: `apps/ar-web/src/app/ar/page.tsx`
- Modify: `apps/ar-web/src/components/accessibility/AccessibilityOverlay.tsx`
- Modify: `apps/ar-web/src/components/accessibility/AccessibilityAudioBar.tsx`

- [ ] **Step 1: Add overlay to AR page only**

Use:

```tsx
import ARClientLoader from '@/components/ar/ARClientLoader'
import AccessibilityOverlay from '@/components/accessibility/AccessibilityOverlay'

export default function ARPage() {
  return (
    <>
      <ARClientLoader />
      <AccessibilityOverlay />
    </>
  )
}
```

- [ ] **Step 2: Keep toggle button away from existing AR overlay controls**

Set the accessibility toggle to bottom-right when closed:

```tsx
style={{
  position: 'fixed',
  right: '1rem',
  bottom: 'calc(1rem + env(safe-area-inset-bottom))',
  width: 52,
  height: 52,
  borderRadius: '50%',
  zIndex: 996,
}}
```

Expected: it does not cover the top tracking status/mute/low-power controls.

- [ ] **Step 3: Audio bar should not hide fallback selectors completely**

Set audio bar height and safe area:

```tsx
style={{
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  minHeight: 72,
  paddingBottom: 'env(safe-area-inset-bottom)',
  zIndex: 999,
}}
```

Expected: controls stay tappable on phones with home indicators.

## Task 6: Harden API Routes For Missing Cloud Config

**Files:**
- Modify: `apps/ar-web/src/app/api/stt/route.ts`
- Modify: `apps/ar-web/src/app/api/gemini/route.ts`
- Modify: `apps/ar-web/.env.example`

- [ ] **Step 1: Keep Node runtime explicit**

Add to both routes:

```ts
export const runtime = 'nodejs'
```

Expected: Google Cloud Node SDKs do not accidentally run in Edge runtime.

- [ ] **Step 2: Validate Gemini env before client creation**

Keep this behavior:

```ts
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  return NextResponse.json({ error: 'Gemini not configured' }, { status: 503 })
}
if (!process.env.GCP_PROJECT_ID) {
  return NextResponse.json({ error: 'GCP project not configured' }, { status: 503 })
}
```

Expected: missing prod env does not crash the whole page; only Q&A returns 503.

- [ ] **Step 3: Confirm secret files are ignored**

Run:

```powershell
git check-ignore -v apps/ar-web/secrets/gcp-service-account.json
```

Expected:

```text
.gitignore:<line>:apps/*/secrets/ apps/ar-web/secrets/gcp-service-account.json
```

## Task 7: Add Regression Tests For Integration Risks

**Files:**
- Modify: `apps/ar-web/src/hooks/accessibility/__tests__/useArtworkQA.test.ts`
- Modify: `apps/ar-web/src/hooks/accessibility/__tests__/useNarrationQueue.skip.test.ts`
- Add: `apps/ar-web/src/components/accessibility/__tests__/AccessibilityOverlay.test.tsx`

- [ ] **Step 1: Add test that overlay fetches workbench manifest**

Create `AccessibilityOverlay.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AccessibilityOverlay from '../AccessibilityOverlay'

beforeEach(() => {
  jest.clearAllMocks()
  window.speechSynthesis = {
    cancel: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    speak: jest.fn(),
    getVoices: jest.fn(() => []),
    pending: false,
    speaking: false,
    paused: false,
    onvoiceschanged: null,
  } as unknown as SpeechSynthesis
})

test('shows artworks from saved workbench manifest', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      artworks: [
        {
          id: 'starring-night',
          title: 'Starry Night',
          artist: 'Vincent van Gogh',
          year: '1889',
          shortSummary: 'Summary',
          historyText: 'History',
          targetIndex: 1,
          audioUrl: '/ar/audio/starry-night.wav',
          historicalImages: [],
          arSceneType: 'starryNight',
          colors: { primary: '#000', secondary: '#111', accent: '#222' },
          effects: { particleCount: 1, lowPowerParticleCount: 1, intensity: 'low' },
        },
      ],
    }),
  }) as jest.Mock

  render(<AccessibilityOverlay />)
  await userEvent.click(screen.getByLabelText(/open accessibility mode/i))
  await waitFor(() => expect(screen.getByText('Starry Night')).toBeInTheDocument())
  expect(screen.getByText(/Vincent van Gogh/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Add test that `useArtworkQA` does not request mic on mount**

In `useArtworkQA.test.ts`, add:

```ts
test('does not request microphone permission until startQA', async () => {
  const getUserMedia = jest.fn().mockResolvedValue({
    getTracks: () => [{ stop: jest.fn() }],
  })
  Object.defineProperty(global.navigator, 'mediaDevices', {
    writable: true,
    configurable: true,
    value: { getUserMedia },
  })

  renderHook(() => useArtworkQA(makeOptions()))
  expect(getUserMedia).not.toHaveBeenCalled()
})
```

- [ ] **Step 3: Run Jest tests**

Run:

```powershell
npm test -- --runInBand
```

Working directory:

```text
C:\Users\PC\Documents\HackTheSummit\apps\ar-web
```

Expected:

```text
PASS src/services/ai/__tests__/GeminiAPIService.test.ts
PASS src/services/stt/__tests__/GCPSpeechToTextService.test.ts
PASS src/hooks/accessibility/__tests__/useArtworkQA.test.ts
PASS src/components/accessibility/__tests__/AccessibilityOverlay.test.tsx
```

## Task 8: Verify Existing AR And Workbench Still Build

**Files:**
- No code changes unless verification fails.

- [ ] **Step 1: Run existing Starry Night test**

Run:

```powershell
node --test test\starry-night-config.test.mjs
```

Expected:

```text
# pass 2
```

- [ ] **Step 2: Run lint**

Run:

```powershell
npm run lint
```

Expected:

```text
> hackthesummit-app@0.1.0 lint
> eslint
```

No errors.

- [ ] **Step 3: Run production build**

Run:

```powershell
npm run build
```

Expected:

```text
✓ Compiled successfully
Route (app)
├ ƒ /api/gemini
├ ƒ /api/stt
├ ƒ /api/workbench/artworks
├ ƒ /api/workbench/assets
├ ƒ /api/workbench/mind
├ ○ /ar
└ ○ /workbench
```

## Task 9: Manual Browser Verification

**Files:**
- No code changes unless verification fails.

- [ ] **Step 1: Start dev server**

Run:

```powershell
npm run dev -- --port 3287
```

Expected:

```text
Local: http://localhost:3287
```

- [ ] **Step 2: Verify `/ar` start screen**

Open:

```text
http://localhost:3287/ar
```

Expected:

- Start screen appears.
- Accessibility toggle is visible but does not cover Start Image Tracking.
- No camera prompt appears before pressing Start Image Tracking.
- No microphone prompt appears before opening Q&A.

- [ ] **Step 3: Verify fallback preview still works**

Click:

```text
Fallback preview
```

Expected:

- Fallback artwork selector works.
- Existing mute and low-power controls remain visible.
- Accessibility toggle opens artwork picker.

- [ ] **Step 4: Verify accessibility tour**

Click accessibility toggle and choose Mona Lisa.

Expected:

- Browser speaks section label and content.
- Audio bar appears.
- Pause/resume/stop work.
- Skip button only works during content speech.

- [ ] **Step 5: Verify Q&A degradation without cloud env**

With no GCP env configured, open Q&A.

Expected:

- If microphone is denied, tour says microphone is unavailable and continues.
- If microphone works but Gemini/STT env is missing, Q&A speaks an error and returns to the tour.
- The AR page does not crash.

## Task 10: Deployment Safety

**Files:**
- No code changes unless verification fails.

- [ ] **Step 1: Confirm no secrets staged**

Run:

```powershell
git status --short
git diff --cached --name-only
```

Expected:

- No `apps/ar-web/secrets/*`.
- No `*.json` service account files.
- No VM password.

- [ ] **Step 2: Deploy only after local verification passes**

Use the existing VM deployment command, but keep the password in an environment variable only. Never write the VM password into the repo.

- [ ] **Step 3: Verify production routes**

Open:

```text
https://artify.technoboost.ca/ar
https://artify.technoboost.ca/workbench
```

Expected:

- `/ar` loads.
- Start tracking still opens camera on HTTPS mobile.
- Accessibility toggle opens.
- Workbench loads saved manifest and can still save/compile.

## Completion Criteria

- `npm test -- --runInBand` passes.
- `node --test test\starry-night-config.test.mjs` passes.
- `npm run lint` passes.
- `npm run build` passes.
- `/ar` still starts MindAR only after user tap.
- Accessibility mode does not request mic on page load.
- TTS does not overlap the existing artwork audio.
- Workbench-edited artworks appear in accessibility picker.
- `starring-night` and `starry-night` both map to Starry Night narration.
- No GCP secret or VM password is committed.
