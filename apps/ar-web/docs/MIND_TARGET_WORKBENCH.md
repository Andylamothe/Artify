# Mind Target Workbench

The AR web app includes a local MindAR target compiler and artwork editor at `/workbench`.

## Flow

1. Open `/workbench`.
2. Select an existing artwork or click `+` to create a new one.
3. Fill the artwork metadata, scene effect, colors, particle counts, audio, and historical images.
4. Upload a target image for each artwork that should be part of the next `.mind` file.
5. Click `Compile and install .mind`.
6. The app writes the generated file to `public/ar/targets/artworks.mind`.
7. The app writes the artwork runtime config to `public/ar/workbench/artworks.json`.

## Target Image Rules

- Use the same artwork image that visitors will scan.
- Prefer sharp JPG/PNG/WebP images with texture, contrast, and many visual details.
- Avoid flat posters, blank borders, repeated simple patterns, glare, blur, and very dark photos.
- Resize very large images before compiling. A longest side around 1000-1600px is enough for the hackathon demo.
- Do not change target order after the `.mind` file is generated unless you also update the artwork config.

## How It Works

The workbench loads the local MindAR image bundle from:

`public/ar/libs/mindar-image.prod.js`

That bundle exposes:

`window.MINDAR.IMAGE.Compiler`

The compiler runs in the browser, extracts image features, and exports a binary `.mind` file. The workbench then posts that file back to the local Next.js API, which writes it into the public AR target folder.

The artwork editor saves config through:

- `GET/POST /api/workbench/artworks`
- `POST /api/workbench/mind`
- `POST /api/workbench/assets`

The AR runtime fetches `/api/workbench/artworks` on startup. If no workbench config exists, it falls back to the bundled demo artworks from `src/data/artworks.ts`.

## A-Frame Effect Model

The workbench does not generate arbitrary A-Frame code. It chooses safe mobile presets already implemented in the app:

- `monaLisa`: glowing frame, halo, soft particles
- `starryNight`: rotating stars and moving particles
- `scream`: pulsing frame, shake/wave style particles

Each preset reads the artwork colors and particle counts from the saved config. This keeps the live AR page fast and prevents admins from accidentally creating heavy scenes.

## Limitations

- Compilation can freeze older phones or weak laptops for large images.
- Use a desktop browser for preparing targets.
- The `.mind` file is compiled from the queued target images only. If you want one `.mind` file to support five artworks, queue target images for all five before compiling.
- Runtime edits made on the deployed VM are stored under the app's public AR folders. The deployment script preserves `public/ar/workbench` and `public/ar/targets` through the shared deployment folder.
- A target that compiles successfully can still track poorly if the physical scan image has glare, low contrast, or a different crop.

## Demo Setup

For judges, prepare a final `artworks.mind` before the live demo and commit/deploy it with the matching artwork config. The workbench is useful to show that admins can prepare new targets, but the AR scan should use a precompiled target for speed and reliability.
