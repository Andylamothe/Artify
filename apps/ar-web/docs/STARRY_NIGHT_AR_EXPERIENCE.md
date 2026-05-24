# Starry Night AR Experience

## Implementation Status

This implementation has been added to the repo as a dedicated Starry Night AR experience. It does not replace the MindAR runtime, the workbench save flow, or the existing artwork manifest system.

Implemented pieces:

```text
src/components/ar/scenes/StarryNightScene.tsx
  Switches Starry Night from the old simple A-Frame primitives to the dedicated living-painting component when A-Frame is ready.

src/components/ar/scenes/starry-night/starryNightExperienceConfig.ts
  Defines layer depth, motion speeds, particle budget, low-power behavior, and asset paths.

src/components/ar/scenes/starry-night/createStarryNightExperience.ts
  Creates the Three.js layered scene: base painting, sky, stars, moon glow, cypress, village, spiral accents, and floating particles.

src/components/ar/scenes/starry-night/registerStarryNightExperience.ts
  Registers the A-Frame component named starry-night-experience.

test/starry-night-config.test.mjs
  Verifies the layer order, depth stack, target plane sizing, and low-power reductions.
```

Generated assets:

```text
public/ar/artworks/starry-night/base.webp
public/ar/artworks/starry-night/moon-glow.webp
```

The assets were derived from:

```text
C:\Users\PC\Downloads\photo-hackathon-Hackthesummit\starrynight-.jpg
```

Earlier generated masks for sky, stars, cypress, village, and particles may still exist in the folder, but the runtime no longer uses them. The current scene intentionally keeps only the clean painting plane plus the yellow sun/moon glow overlay.

Verification already run before handoff:

```text
node --test test/starry-night-config.test.mjs
npm run lint
npm run build
```

All three commands completed successfully.

The Starry Night target uses a dedicated A-Frame component backed by Three.js:

```text
StarryNightScene.tsx
  -> registerStarryNightExperience()
  -> createStarryNightExperience()
  -> layered Three.js planes + sprites under the MindAR target entity
```

## Assets

Replace artwork-specific assets in:

```text
public/ar/artworks/starry-night/
  base.webp
  moon-glow.webp
```

Keep these textures mobile-friendly. Prefer WebP at 1024-1400 px wide for the full-frame base and one small transparent glow texture for the sun/moon.

Do not add broad visible overlays for the sky or landscape. The wave/cloud motion is produced by the shader on `base.webp`, so the painting keeps its original look.

## Depth

Depth is configured in:

```text
src/components/ar/scenes/starry-night/starryNightExperienceConfig.ts
```

Layer `position.z` controls how far each plane appears above the tracked image:

```text
base 0.005
sun  0.075
```

Increase the sun `z` only if the glow needs to pop out more. Keep the base close to the tracked target so the painting remains aligned.

## Animation Speeds

Tune motion in `createStarryNightExperienceConfig()`:

```text
motion.skyDrift
motion.waveFlow
motion.spiralRotation
motion.starPulse
motion.particleFloat
```

The base painting uses a shader that samples the sky region with a slow horizontal UV flow plus sine offsets. This creates the impression that the blue waves/clouds move continuously in one direction. The sun/moon overlay only pulses softly.

## Low Power Mode

When `lowPower` is true:

```text
particles stay disabled
the shader stays enabled but uses smaller drift/flow values
the sun/moon pulse is slower and lighter
```

Use low power mode for older phones or if the camera feed drops below the 30 FPS target.

## Deploy Notes

The deploy agent should include these new folders/files in the deployment artifact:

```text
public/ar/artworks/starry-night/
src/components/ar/scenes/starry-night/
src/components/ar/scenes/StarryNightScene.tsx
test/starry-night-config.test.mjs
docs/STARRY_NIGHT_AR_EXPERIENCE.md
```

No new npm dependency was added. The experience uses the existing `three`, A-Frame, and MindAR setup.

The current implementation still depends on the existing Starry Night artwork config:

```text
id: starry-night
targetIndex: 1
targetImageUrl: /ar/images/starry-night-history-1.jpg
```

If the deploy agent recompiles `artworks.mind`, it must keep the Starry Night target index aligned with the saved artwork manifest.

## Replacement Workflow

1. Keep the tracked image in `targetImageUrl` and the compiled `.mind` file aligned with `targetIndex`.
2. Replace the layer assets above with matching transparent WebP exports.
3. Adjust `targetAspect` in `StarryNightScene.tsx` if the artwork image is not 4:3.
4. Test `/ar` on HTTPS mobile, then use low power mode if FPS dips.
