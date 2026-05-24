# Artify Full Stack

This document lists the stack used in the Artify project and what each part is used for.

## Repository Structure

```text
apps/ar-web/
  Main WebAR app, AR route, workbench, MindAR integration, AI motion tools.

apps/social-artify/
  Social/discovery app with auth-style flows, profiles, likes, saved artworks, and onboarding.

apps/landing-page/
  Static landing page prototype/assets.

docs/
  Technical documentation, handoff notes, implementation plans, and stack summaries.
```

## Main Frontend Stack

### Next.js

Used in:

```text
apps/ar-web
apps/social-artify
```

Purpose:

- App Router pages;
- API routes;
- local development server;
- production build;
- static and dynamic rendering;
- serving workbench/AR pages.

Current project rule:

```text
Read node_modules/next/dist/docs before writing code because this Next.js version has breaking changes.
```

### React

Used for:

- AR page UI state;
- workbench UI;
- modals;
- overlays;
- social app pages;
- component composition.

### TypeScript

Used across the Next.js apps for:

- artwork config types;
- AR object types;
- API route types;
- service interfaces;
- safer workbench editing.

## AR Stack

### MindAR

Used in:

```text
apps/ar-web/public/ar/libs/
apps/ar-web/src/components/ar/ARExperience.tsx
```

Purpose:

- image tracking;
- `.mind` target loading;
- camera frame processing;
- target recognition;
- pose estimation;
- `targetFound` / `targetLost` lifecycle.

Important config:

```text
imageTargetSrc: /ar/targets/artworks.mind
maxTrack: 1
autoStart: false
uiLoading: no
uiError: no
uiScanning: no
```

### A-Frame

Used for:

- declarative AR scene;
- `a-scene`;
- `a-camera`;
- `a-entity`;
- `a-image`;
- `a-video`;
- `a-text`;
- `a-plane`;
- click/raycast interactions;
- simple mobile-friendly animations.

MindAR registers A-Frame components:

```text
mindar-image
mindar-image-target
mindar-image-system
```

### Three.js

Used indirectly through A-Frame and directly for special/custom effects.

Purpose:

- scene graph;
- matrices;
- 3D transforms;
- custom Starry Night experience layers/effects.

## Image Target Stack

### `.mind` Files

Used for:

- compiled MindAR tracking databases.

Main target file:

```text
apps/ar-web/public/ar/targets/artworks.mind
```

The `.mind` file contains precomputed image features, descriptors, dimensions, and tracking data.

### Workbench Target Compiler

Used in:

```text
apps/ar-web/src/components/workbench/MindTargetWorkbench.tsx
apps/ar-web/src/app/api/workbench/mind
```

Purpose:

- upload artwork target image;
- compile MindAR targets;
- keep `targetIndex` order aligned;
- write generated target data into the right public folder.

## AR Content Config Stack

### Artwork Manifest

Used in:

```text
apps/ar-web/public/ar/workbench/artworks.json
apps/ar-web/src/data/artworks.ts
apps/ar-web/src/types/ar.ts
```

Purpose:

- title;
- artist;
- year;
- summary;
- history;
- audio URL;
- target index;
- target image URL;
- historical images;
- AR scene type;
- custom AR objects.

### AR Object Model

Supported object types:

```text
text
image
gif
video
model3d
button
panel
portfolio
brush
```

Each AR object stores:

```text
position
rotation
scale
width
height
opacity
color
src
action type
portfolio items
motion brush data
```

## Workbench Stack

Used in:

```text
apps/ar-web/src/components/workbench/MindTargetWorkbench.tsx
```

Purpose:

- create/edit artworks;
- upload target images;
- compile `.mind`;
- place AR objects visually;
- edit object size/position/color/text/src;
- preview A-Frame-style layout;
- upload portfolio images;
- attach videos/images;
- use AI Living Art modal;
- use Motion Brush modal.

### Motion Brush

Used in:

```text
apps/ar-web/src/components/workbench/MotionBrushModal.tsx
apps/ar-web/public/vendor/wasm-webp/
```

Purpose:

- paint animated areas;
- define motion paths;
- preview motion;
- export animated WebP;
- use exported WebP as a normal image asset in AR.

### Animated WebP Vendor Runtime

Used in:

```text
apps/ar-web/public/vendor/wasm-webp/
```

Purpose:

- encode animated WebP client-side;
- keep result usable as a normal image in A-Frame.

## AI Stack

### Google Vertex AI / Gemini

Used in:

```text
apps/ar-web/src/app/api/gemini/route.ts
apps/ar-web/src/app/api/workbench/ai-motion/route.ts
apps/ar-web/src/services/ai/
```

Purpose:

- artwork Q&A;
- prompt creation for Living Art;
- analyze artwork image and suggest what parts should move;
- generate better Veo prompt text.

Configured with:

```text
GOOGLE_APPLICATION_CREDENTIALS
GCP_PROJECT_ID
VERTEX_AI_LOCATION
VERTEX_AI_MODEL
```

Secrets are not committed. Only `.env.example` is committed.

### Veo / Video Generation Flow

Used through the AI motion API route.

Purpose:

- generate a living-art video from an artwork image and prompt;
- save generated video to the server/public asset folder;
- assign the generated video back to the selected artwork object.

## Audio And Accessibility Stack

### Web Speech API / TTS

Used in:

```text
apps/ar-web/src/services/tts/
apps/ar-web/src/components/accessibility/
```

Purpose:

- browser speech synthesis;
- voice assistant narration;
- accessibility overlay.

### Google Cloud Speech-To-Text

Used in:

```text
apps/ar-web/src/app/api/stt/route.ts
apps/ar-web/src/services/stt/
```

Purpose:

- transcribe microphone audio;
- support voice Q&A flow.

### Audio Narration

Used in:

```text
apps/ar-web/src/hooks/ar/useArtworkAudio.ts
apps/ar-web/src/data/narrationData.ts
apps/ar-web/public/ar/audio/
```

Purpose:

- play artwork summaries;
- pause on target lost;
- mute/unmute;
- handle mobile autoplay restrictions.

## Asset Stack

### Public AR Assets

Used in:

```text
apps/ar-web/public/ar/
```

Contains:

- MindAR libs;
- target files;
- target source images;
- audio;
- artwork images;
- workbench uploaded assets;
- icons.

### API Asset Serving

Used in:

```text
apps/ar-web/src/app/api/workbench/assets/
apps/ar-web/src/app/api/workbench/assets/[...assetPath]/route.ts
```

Purpose:

- upload assets from the workbench;
- serve videos/images with correct headers;
- support video byte ranges;
- avoid broken video preview/download.

## Social App Stack

Used in:

```text
apps/social-artify/
```

Purpose:

- discovery feed;
- artwork cards;
- onboarding;
- auth-like flows;
- profile;
- saved artworks;
- likes/dislikes;
- artist upload/generation pages.

Tech:

- Next.js;
- React;
- TypeScript;
- API routes;
- local JSON file storage for prototype data;
- bcrypt for password hashing in prototype auth routes.

Runtime local user data is ignored from Git:

```text
apps/social-artify/data/users.json
```

## Styling Stack

### CSS

Used in:

```text
apps/ar-web/src/app/globals.css
apps/social-artify/src/app/globals.css
apps/social-artify/src/components/landing/LandingExperience.module.css
apps/landing-page/styles.css
```

Purpose:

- responsive mobile-first UI;
- AR overlay styling;
- workbench layout;
- landing pages;
- social app components.

## Testing Stack

### Jest

Used in:

```text
apps/ar-web/jest.config.js
apps/ar-web/jest.setup.ts
apps/ar-web/src/**/__tests__/
```

Purpose:

- service tests;
- accessibility component tests;
- Gemini/STT route tests.

### Node Test Scripts

Used in:

```text
apps/ar-web/test/
```

Purpose:

- config checks;
- Starry Night config validation;
- portfolio object config validation;
- MindAR stabilization config validation;
- video aspect ratio lock validation.

## Deployment Stack

### VM Deployment

Production app currently deployed behind reverse proxy:

```text
https://artify.technoboost.ca
```

Stable service:

```text
hackthesummit-ar
```

Stable internal port:

```text
3287
```

Deployment uses a local script under `apps/ar-web/scripts/`, but scripts are excluded from Git.

### Reverse Proxy

Used for:

- HTTPS;
- public domain;
- camera permission support;
- routing traffic to the Next.js app.

HTTPS matters because camera access requires a secure context on real devices.

## Package Managers And Runtime

### Node.js / npm

Used for:

- installing dependencies;
- running Next.js dev/build/start;
- package lock files.

Common commands:

```bash
cd apps/ar-web
npm install
npm run build
```

```bash
cd apps/social-artify
npm install
npm run build
```

## Most Important Runtime Flow

```text
Visitor opens /ar
  -> taps Start
  -> A-Frame + MindAR load
  -> MindAR loads artworks.mind
  -> browser opens camera
  -> MindAR recognizes targetIndex
  -> React selects matching artwork config
  -> A-Frame renders AR objects under the target
  -> audio/video/panels run
```

## Stack Summary

```text
Next.js        -> app shell, pages, API routes, build
React          -> UI state/components
TypeScript     -> typed data/contracts
MindAR         -> image tracking
A-Frame        -> AR scene/entities/interactions
Three.js       -> underlying 3D engine/custom effects
TensorFlow.js  -> internal MindAR browser-side vision compute
Google Gemini  -> AI prompt/Q&A/living-art analysis
Veo flow       -> living-art video generation
Web Speech API -> browser TTS
Google STT     -> speech-to-text
CSS            -> responsive UI/workbench/landing styling
Jest           -> tests
VM + proxy     -> production deployment with HTTPS
```
