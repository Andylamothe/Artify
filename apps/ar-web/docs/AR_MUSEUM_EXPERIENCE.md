# AR Museum Experience Implementation Plan

## Goal

Build a mobile-first WebAR museum prototype where scanning an artwork or QR entry point opens an artwork-specific AR experience. The artwork stays central: AR adds context, motion, history, and narration around the original piece instead of generating replacement art.

The first demo supports three artworks:

- Mona Lisa
- Starry Night
- The Scream

The demo must be stable enough for a live hackathon presentation on real phones, with a desktop fallback for judges and development.

## Guiding Principles

- The visitor explores the original artwork. The AR effects must frame, annotate, and enrich it.
- This is not a ChatGPT wrapper and does not generate new artwork.
- Mobile performance is a product requirement, not a cleanup step.
- Every artwork has a unique scene, audio summary, history content, and visual identity.
- Camera, audio, and tracking only start after the visitor taps `Start AR Experience`.
- If AR fails, the fallback mode must still provide a complete demo.

## Target Tech Stack

- Next.js with React and TypeScript
- MindAR image tracking with `maxTrack: 1`
- MindAR + A-Frame for the first implementation path
- Three.js only for custom particles or fallback preview effects that need lower-level render-loop control
- CSS modules or the existing project styling system once the app exists
- Static assets in `public/ar`
- Structured artwork data in `src/data/artworks.ts`

If the project is not scaffolded yet, create a Next.js app first and then add the AR modules below.

## Feasibility Confirmed From Reference Repos

The reference repos in `import/` confirm that the planned experience is realistic:

- MindAR supports image tracking and multi-target image libraries.
- MindAR has an A-Frame integration using `mindar-image` and `mindar-image-target`.
- MindAR supports `maxTrack: 1`, which matches our mobile performance requirement.
- MindAR emits target lifecycle events such as `targetFound`, `targetLost`, `arReady`, and `arError`.
- A-Frame entities attached to `mindar-image-target` can use standard animations.
- Three.js integration exposes `addAnchor(targetIndex)`, where each anchor owns a `group` that follows the detected artwork.

This means the project can show real animated AR content locked to an artwork target. The realistic constraint is not whether animation is possible; the constraint is keeping tracking stable and rendering lightweight enough on phones.

## Real Limitations

### Tracking Limitations

- MindAR image tracking needs visually rich targets. Plain, blurry, dark, reflective, or low-contrast images track poorly.
- Target recognition depends on the exact compiled reference image. Heavy cropping, glare, perspective distortion, or museum lighting can reduce detection quality.
- Image tracking does not understand the artwork semantically. It only matches visual features from the compiled `.mind` target file.
- Multiple artwork targets can exist in one `.mind` file, but we should track only one at a time with `maxTrack: 1`.
- Fast camera movement can cause `targetLost` events. The UI and audio must tolerate short tracking interruptions.
- Very glossy framed prints can be unreliable under overhead lights.

### Browser and Device Limitations

- Camera access requires HTTPS, except for localhost during development.
- iOS Safari has stricter camera and audio behavior than desktop browsers.
- Audio autoplay is blocked unless audio is unlocked from a user gesture.
- Some in-app browsers may block camera access or behave inconsistently.
- Older Android phones may run WebGL and camera processing slowly.
- The app cannot assume a rear camera is always available, even though it should request `facingMode: environment`.

### Next.js Integration Limitations

- MindAR and A-Frame depend on browser globals such as `window`, `document`, `navigator.mediaDevices`, and WebGL.
- AR code must run only on the client. It cannot be imported directly by a server component.
- The `/ar` page should use a small server component wrapper that dynamically loads a client-only AR component.
- A-Frame custom elements should be mounted after client hydration.
- Cleanup is important because navigating away without stopping camera tracks can leave the camera active.

### Rendering and Asset Limitations

- Heavy GLB models, large textures, GIFs, and videos will hurt mobile FPS.
- Transparent planes, particles, sprites, simple meshes, and A-Frame transform animations are safe choices.
- Particle effects must stay small: 50 to 150 particles in normal mode, less in low-power mode.
- Shaders can work, but complex fragment shaders should be avoided for the hackathon demo.
- Historical content should live in the HTML overlay, not inside the AR scene, so it stays readable and cheap to render.

### Demo Limitations

- The live AR path depends on camera permission, lighting, target print quality, and HTTPS.
- The fallback path is not optional; it is the safety net for judges, desktop testing, and bad network/device conditions.
- The judge demo should include printed targets or clearly displayed target images in the same order used by the `.mind` compiler.

## Target File Structure

```text
public/
  ar/
    targets/
      artworks.mind
    audio/
      mona-lisa.mp3
      starry-night.mp3
      the-scream.mp3
    images/
      mona-lisa-history-1.jpg
      starry-night-history-1.jpg
      the-scream-history-1.jpg
src/
  app/
    ar/
      page.tsx
  components/
    ar/
      ARClientLoader.tsx
      ARExperience.tsx
      ArtworkOverlay.tsx
      FallbackMuseumMode.tsx
      PerformanceControls.tsx
      scenes/
        MonaLisaScene.tsx
        StarryNightScene.tsx
        ScreamScene.tsx
      aframe/
        registerMindARComponents.ts
  hooks/
    ar/
      useArtworkAudio.ts
      useLowPowerMode.ts
      useTrackingStatus.ts
  data/
    artworks.ts
  types/
    ar.ts
docs/
  AR_MUSEUM_EXPERIENCE.md
```

If exact files already exist later, adapt to the existing structure instead of creating duplicates.

## Real Integration Architecture

### Recommended Implementation Path

Use MindAR + A-Frame for the production hackathon demo.

Why:

- The MindAR repo already provides A-Frame components for image targets.
- A-Frame gives fast declarative animation with attributes like `animation`.
- Multi-target examples already match our use case.
- It is easier to integrate quickly than building a full custom Three.js AR renderer.

Use Three.js only in two places:

- inside custom A-Frame components if we need particles or procedural meshes;
- inside fallback preview mode if a pure React/CSS preview is not expressive enough.

### Next.js Client Boundary

`src/app/ar/page.tsx` should stay minimal:

```tsx
import dynamic from "next/dynamic";

const ARClientLoader = dynamic(
  () => import("@/components/ar/ARClientLoader"),
  { ssr: false }
);

export default function ARPage() {
  return <ARClientLoader />;
}
```

`ARClientLoader.tsx` owns browser-only setup:

- load A-Frame/MindAR only in the browser;
- show the start screen before mounting AR;
- switch to fallback if imports, camera, or MindAR startup fail;
- unmount cleanly when leaving the page.

### MindAR Scene Contract

The A-Frame scene should be created only after the visitor taps `Start AR Experience`.

Required scene attributes:

```html
<a-scene
  mindar-image="imageTargetSrc: /ar/targets/artworks.mind; autoStart: false; maxTrack: 1; uiLoading: no; uiError: no; uiScanning: no"
  embedded
  color-space="sRGB"
  renderer="colorManagement: true"
  vr-mode-ui="enabled: false"
  device-orientation-permission-ui="enabled: false"
>
```

Required target entities:

```html
<a-entity id="target-mona-lisa" mindar-image-target="targetIndex: 0"></a-entity>
<a-entity id="target-starry-night" mindar-image-target="targetIndex: 1"></a-entity>
<a-entity id="target-the-scream" mindar-image-target="targetIndex: 2"></a-entity>
```

React should listen to target events:

- `targetFound` sets active artwork and starts audio.
- `targetLost` pauses audio and marks scene as inactive.
- `arReady` moves status from loading to scanning.
- `arError` switches to fallback mode.

### Scene Component Contract

Each artwork scene receives:

```ts
interface ArtworkSceneProps {
  artwork: ArtworkConfig;
  active: boolean;
  lowPower: boolean;
}
```

Scene components should render A-Frame entities only:

- no artwork metadata;
- no audio logic;
- no camera control;
- no direct global state.

### Audio Contract

`useArtworkAudio.ts` owns all narration behavior:

- create one `HTMLAudioElement` after the start tap;
- switch source when active artwork changes;
- play only when target is found and mute is off;
- pause when target is lost;
- expose `muted`, `toggleMuted`, `audioError`, and `requiresManualPlay`.

### Fallback Contract

`FallbackMuseumMode.tsx` uses the same `artworks.ts` data and the same `ArtworkOverlay`.

Fallback scene options, in order of preference:

1. lightweight CSS/React animations for fastest reliability;
2. A-Frame preview without camera if we already have reusable scene components;
3. Three.js preview if particles need direct control.

Fallback must not depend on:

- camera permission;
- `.mind` file availability;
- mobile browser support.

## Phase 1: Project Foundation

### Objective

Create or confirm the Next.js foundation and make sure the app can serve an `/ar` route.

### Implementation Steps

1. Check whether `package.json`, `src/app`, and Next.js config files exist.
2. If they do not exist, scaffold a TypeScript Next.js app in the current repository.
3. Add dependencies for MindAR and the selected renderer:
   - `mind-ar`
   - `aframe`
   - `three` only if custom components or fallback preview need it directly.
4. Add a mobile-first `/ar` route.
5. Add baseline metadata for mobile:
   - responsive viewport
   - full-screen camera layout
   - no heavy initial assets
6. Add a client-only loader for AR because MindAR/A-Frame cannot run during server rendering.
7. Confirm `npm run dev` starts locally.

### Done When

- The app loads `/ar`.
- The page shows a start screen.
- No AR or audio is started automatically.

## Phase 2: Artwork Data Model

### Objective

Centralize all artwork-specific content and AR configuration in one typed config file.

### Files

- Create `src/types/ar.ts`
- Create `src/data/artworks.ts`

### Data Shape

Each artwork entry should include:

```ts
export type ArtworkSceneType = "monaLisa" | "starryNight" | "scream";

export interface ArtworkConfig {
  id: string;
  title: string;
  artist: string;
  year: string;
  shortSummary: string;
  historyText: string;
  targetIndex: number;
  audioUrl: string;
  historicalImages: string[];
  arSceneType: ArtworkSceneType;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  effects: {
    particleCount: number;
    intensity: "low" | "medium";
    lowPowerParticleCount: number;
  };
}
```

### Demo Entries

- `mona-lisa`, `targetIndex: 0`
- `starry-night`, `targetIndex: 1`
- `the-scream`, `targetIndex: 2`

### Done When

- All UI, audio, fallback, and scene components read from the shared config.
- No artwork metadata is hardcoded inside scene components except scene-specific visual logic.

## Phase 3: Static Assets and Placeholders

### Objective

Make the app resilient even before final museum assets exist.

### Implementation Steps

1. Create the `public/ar` folder structure.
2. Add documented placeholder image files for history panels if real files are not ready.
3. Add documented placeholder audio paths in the config.
4. Ensure missing audio or image files do not crash the app.
5. Add comments near config entries explaining where final assets should be replaced.

### MindAR Target Asset

Expected final file:

```text
public/ar/targets/artworks.mind
```

During early development, fallback mode must work even if this file is missing.

### Done When

- The app renders with placeholders.
- Missing audio/images show graceful UI states.
- Fallback mode works without a `.mind` file.

## Phase 4: AR Page Flow

### Objective

Create the visitor-facing `/ar` page with clear permission and startup behavior.

### Main States

- `idle`: start screen shown
- `starting`: user tapped start; loading camera/MindAR/audio unlock
- `scanning`: camera active and looking for target
- `detected`: target found and artwork scene active
- `lost`: target was lost; pause audio and animations
- `fallback`: AR unavailable; manual artwork mode active
- `error`: camera or MindAR failed with a clear recovery path

### UI Requirements

- Show a prominent `Start AR Experience` button before camera/audio access.
- Show current tracking status:
  - `Scanning...`
  - `Artwork detected`
  - `Target lost`
- Include a `Use fallback mode` action if camera fails or the visitor is on desktop.
- Keep the original camera/artwork view mostly unobstructed.

### Done When

- Camera starts only after user action.
- Audio is unlocked only after user action.
- Failures route to fallback instead of breaking the page.

## Phase 5: MindAR Integration

### Objective

Recognize multiple artwork targets while tracking only one at a time for mobile performance.

### Requirements

- Use the compiled target file at `/ar/targets/artworks.mind`.
- Configure `maxTrack: 1`.
- Configure `autoStart: false` and start MindAR only after the visitor taps the start button.
- Disable MindAR default overlays with `uiLoading: no`, `uiError: no`, and `uiScanning: no` so React owns the museum UI.
- Register one target entity per artwork.
- Map MindAR target index to `ArtworkConfig.targetIndex`.
- On target found:
  - set active artwork
  - show the matching overlay
  - lazy-load or activate the matching scene
  - start the correct audio if not muted
- On target lost:
  - update status to `Target lost`
  - pause audio
  - pause scene animation where possible

### Cleanup

On unmount:

- stop MindAR
- stop camera tracks
- remove target event listeners
- pause audio
- clear intervals/requestAnimationFrame loops
- dispose Three.js geometries, materials, textures if Three.js is used directly

### Done When

- Each target triggers the correct artwork.
- Only one target is tracked at a time.
- Leaving the page releases camera and audio resources.
- Refreshing or navigating away does not leave the camera active.

## Phase 6: Unique AR Scenes

### Objective

Implement one lightweight, recognizable scene per artwork.

### Shared Scene Rules

- 50 to 150 particles maximum per scene.
- Low-power mode uses fewer particles and simpler animations.
- No GIFs.
- No large GLB models.
- Prefer planes, sprites, particles, simple shaders, and transform animations.
- Pause animation when the target is lost.
- Lazy-load scene modules when possible.

### Mona Lisa Scene

Visual language:

- golden halo behind/around the portrait
- soft Renaissance-style particles
- subtle glowing frame
- optional slow eye/light movement illusion using small moving highlights

Implementation approach:

- one ring or torus-like halo using a plane/ring mesh
- 60 to 100 warm particles
- frame glow with transparent planes or CSS-like material opacity animation
- low-power mode reduces particles to 30 to 50 and disables secondary highlights

### Starry Night Scene

Visual language:

- animated swirling stars
- blue/yellow moving particles
- rotating sky motion
- soft night ambience

Implementation approach:

- circular particle paths or small sprite planes
- 80 to 150 particles in normal mode
- one slow rotating parent group for swirl motion
- low-power mode reduces particles to 50 and disables nested rotations

### The Scream Scene

Visual language:

- red/orange pulse
- wave distortion feel
- shaking particles
- dramatic animated frame

Implementation approach:

- pulsing transparent planes
- 60 to 120 particles with jittered transforms
- frame scale/opacity pulse
- low-power mode reduces jitter frequency and particle count

### Done When

- The three scenes are visually distinct.
- All scenes stay lightweight on mobile.
- Scene animation pauses when target is lost.

## Phase 7: Audio System

### Objective

Provide artwork-specific narration while respecting mobile autoplay restrictions.

### Behavior

- Audio never plays before the visitor taps `Start AR Experience`.
- On start, create or unlock the audio element in response to the user gesture.
- When a target is detected, load/play that artwork's audio.
- When a target is lost, pause audio.
- When another artwork is detected, pause previous audio and switch source.
- Add a mute/unmute button.
- Muted state must persist during the current AR session.

### Error Handling

- If an audio file is missing, show `Audio unavailable` but keep AR running.
- If play fails on iOS, show a small `Tap to play audio` control.

### Done When

- Audio starts only from user-initiated flow.
- Audio follows target detection/loss.
- Mute/unmute is reliable.

## Phase 8: Museum UI Overlay

### Objective

Add a clean museum-style interface that supports exploration without blocking the AR view.

### Overlay Content

- title
- artist and year
- short summary
- history text
- historical image carousel
- `Explore details` button
- mute/unmute button
- low-power mode toggle
- tracking status

### Layout

Mobile:

- bottom sheet style overlay
- compact collapsed state while scanning
- expandable details/history panel after detection
- carousel inside the bottom sheet

Desktop fallback:

- preview area plus side panel
- manual artwork selection
- same content as AR mode

### Done When

- The overlay is readable on phones.
- The artwork/camera area remains the focus.
- The UI does not cover the whole AR view during scanning.

## Phase 9: Fallback Museum Mode

### Objective

Guarantee a working demo when camera, permissions, HTTPS, or MindAR fail.

### Behavior

- Show manual artwork selection for Mona Lisa, Starry Night, and The Scream.
- Display the matching AR-style animation in a non-camera preview surface.
- Show the same overlay content.
- Support the same audio behavior after user interaction.
- Explain the fallback state briefly without making the demo feel broken.

### Done When

- Desktop testing works without camera.
- Judges can see all three artwork experiences without scanning.
- The fallback uses the same artwork config as the AR experience.

## Phase 10: Performance and Mobile Stability

### Objective

Keep the AR demo smooth on mid-range phones.

### Mobile Budget

- Minimum target: stable 30 FPS on mid-range phones.
- `maxTrack: 1` in MindAR.
- 50 to 150 particles maximum per active scene.
- Low-power mode reduces particle counts and animation complexity.
- No 4K textures.
- No large GLB models.
- No GIFs.
- Use compressed images.
- Lazy-load per-artwork scene code.
- Pause inactive scenes.
- Dispose resources on unmount.

### Render Strategy

- Keep all AR visual effects attached to the active target entity only.
- Render HTML information panels outside the WebGL scene.
- Avoid loading all artwork scenes at once. Mount the active scene and keep inactive scenes empty or paused.
- Prefer A-Frame transform animations over JavaScript animation loops for simple motion.
- If using JavaScript animation loops, gate them behind `active === true`.
- Use `requestAnimationFrame` loops only in components that clean up on unmount.

### FPS Fallback

Add a lightweight FPS monitor:

- If FPS stays below 24 for several seconds, suggest low-power mode.
- If FPS remains poor in low-power mode, switch the active scene to static/simple animation mode.

### Done When

- Low-power mode is available.
- Target loss pauses audio and expensive animation.
- The page can run through repeated scans without memory/resource buildup.

## Phase 11: Testing and Verification

### Local Checks

Run:

```bash
npm install
npm run lint
npm run build
npm run dev
```

If the project uses different scripts, use the existing package scripts.

### Functional Tests

- `/ar` loads on desktop.
- Start screen appears first.
- Fallback mode works without camera.
- Manual selection can switch between all three artworks.
- Each artwork shows correct title, history, colors, and scene type.
- Audio controls do not crash when placeholder audio is missing.
- Low-power mode changes scene complexity.

### Mobile Tests

- Open on a real phone over HTTPS or a dev tunnel.
- Tap `Start AR Experience`.
- Confirm camera permission prompt appears.
- Confirm scanning status appears.
- Scan each artwork target.
- Confirm correct scene/audio/overlay appears.
- Move away from target and confirm audio pauses.
- Toggle mute/unmute.
- Toggle low-power mode.
- Confirm no freezing during repeated detection/loss cycles.

### Done When

- Build passes.
- Desktop fallback works.
- Mobile permission errors are handled gracefully.
- Performance limitations are documented.

## Phase 12: MindAR Target Compilation

### Objective

Document and prepare the image target pipeline.

### Target Source Images

Use clear, high-contrast reference images for:

- Mona Lisa
- Starry Night
- The Scream

Avoid blurry, cropped, reflective, or low-detail images.

### Compilation Flow

1. Collect the final target images.
2. Use the MindAR image target compiler from the official tool or the local compiler script.
3. Add images in this order:
   - Mona Lisa -> target index `0`
   - Starry Night -> target index `1`
   - The Scream -> target index `2`
4. Export the compiled file as:

```text
public/ar/targets/artworks.mind
```

5. Confirm `targetIndex` values in `src/data/artworks.ts` match the compiler order.

### Local Compiler Option

The cloned MindAR repo includes a Node example at:

```text
import/mind-ar-js/examples/nodejs/createImageTargetLibrary.js
```

If we use a local compiler flow, create a project script that:

- reads target images from `public/ar/source-targets`;
- compiles them in the exact documented order;
- writes `public/ar/targets/artworks.mind`;
- prints the target index mapping after export.

### Done When

- The `.mind` file exists in `public/ar/targets`.
- Each physical print or reference image maps to the correct scene.
- The target order is documented and matches `src/data/artworks.ts`.

## Phase 13: Judge Demo Flow

### Primary Demo

1. Open `/ar` on a phone.
2. Tap `Start AR Experience`.
3. Scan Mona Lisa.
4. Show golden halo, info panel, history image, and audio.
5. Move away to demonstrate `Target lost` and audio pause.
6. Scan Starry Night.
7. Show animated swirling stars and different narration.
8. Scan The Scream.
9. Show pulse/wave scene and dramatic visual identity.
10. Toggle low-power mode to show mobile performance awareness.

### Backup Demo

1. Open `/ar` on desktop or phone.
2. Choose fallback mode.
3. Manually select all three artworks.
4. Show the same content, audio controls, and AR-style animations.

## Implementation Order Summary

1. Scaffold or confirm Next.js app.
2. Add artwork types and `artworks.ts`.
3. Create `/ar` start screen and state machine.
4. Add fallback mode first so the demo works before camera integration.
5. Add overlay content and audio controls.
6. Add lightweight scene components.
7. Integrate MindAR target detection.
8. Connect detection events to overlay, audio, and scenes.
9. Add low-power mode and FPS fallback.
10. Add placeholder assets and final asset replacement notes.
11. Run lint/build/mobile testing.
12. Compile final MindAR targets.
13. Rehearse judge demo with primary and fallback paths.

## Key Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Camera permissions fail | Provide fallback mode and clear recovery action |
| iOS blocks autoplay | Unlock audio after start tap and provide tap-to-play recovery |
| MindAR target file missing | Keep fallback mode independent from `.mind` |
| Phone performance drops | Use `maxTrack: 1`, low particle counts, low-power mode, static fallback |
| Wrong artwork scene appears | Keep target compiler order documented and matched to `targetIndex` |
| Large assets cause lag | Use compressed images, avoid GIFs, avoid heavy models |
| Live demo environment lacks HTTPS | Use fallback mode or a secure tunnel for mobile camera testing |
| Next.js server rendering crashes on AR imports | Load AR code through a client-only dynamic component with `ssr: false` |
| Poor target recognition under museum lighting | Use high-feature target images, matte prints, and test under demo lighting |
| Target flickers between found/lost | Debounce UI changes lightly and pause audio only after a short loss tolerance |
| In-app browser blocks camera | Ask judges to use Safari on iOS or Chrome on Android, with fallback ready |

## Definition of Done

The AR museum prototype is done when:

- `/ar` provides a complete mobile-first AR flow.
- Mona Lisa, Starry Night, and The Scream each trigger a distinct experience.
- The app has structured artwork data.
- The app has audio behavior tied to target detection.
- The app has a clean museum overlay.
- The app has a fallback mode that works on desktop.
- The app uses `maxTrack: 1`.
- The app includes low-power behavior for older phones.
- The app cleans up camera, audio, listeners, and animation resources.
- `npm run lint` and `npm run build` pass.
- The documentation explains how to add artworks and compile MindAR targets.
- The demo can be presented smoothly even if camera tracking fails.
