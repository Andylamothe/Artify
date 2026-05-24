# Workbench Portfolio Object Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated workbench `Portfolio` AR element with selectable/uploadable artist-work images and MindAR-style left/right carousel rendering.

**Architecture:** Add `portfolio` as a first-class `ARObjectType` and store per-object `portfolioItems`. Reuse the workbench asset upload route, expose selection/title editing in `ObjectInspector`, and render the carousel inside `ARCustomObjects` so it stays attached to the tracked target.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, A-Frame, MindAR, Jest.

---

### Task 1: Add Portfolio Types And Defaults

**Files:**
- Modify: `apps/ar-web/src/types/ar.ts`
- Modify: `apps/ar-web/src/components/workbench/MindTargetWorkbench.tsx`
- Test: `apps/ar-web/test/portfolio-object-config.test.mjs`

- [ ] Write a failing config test that expects the source to contain a `portfolio` object type and default `portfolioItems`.
- [ ] Run `node --test test\portfolio-object-config.test.mjs` and confirm it fails.
- [ ] Add `portfolio` to `ARObjectType`, add `ARPortfolioItem`, and add `portfolioItems?: ARPortfolioItem[]` to `ARObjectConfig`.
- [ ] Add a `Portfolio` palette entry and create default portfolio objects above the artwork.
- [ ] Run the config test and confirm it passes.

### Task 2: Add Inspector Selection And Upload Controls

**Files:**
- Modify: `apps/ar-web/src/components/workbench/MindTargetWorkbench.tsx`

- [ ] Pass `draft.historicalImages` into `ObjectInspector`.
- [ ] Add portfolio inspector UI for upload, existing-image selection, title editing, and removal.
- [ ] Wire uploads through existing `uploadAsset(file, "image")`/asset upload behavior and append uploaded image to the selected portfolio object.
- [ ] Keep existing `historicalImages` manager unchanged.

### Task 3: Render Portfolio In Workbench And AR

**Files:**
- Modify: `apps/ar-web/src/components/workbench/MindTargetWorkbench.tsx`
- Modify: `apps/ar-web/src/components/ar/scenes/ARCustomObjects.tsx`
- Modify: `apps/ar-web/src/components/ar/ARExperience.tsx`

- [ ] Render portfolio preview in the workbench canvas and layer preview.
- [ ] Render the real AR carousel with title, active image, left/right icon assets, and click handlers.
- [ ] Add left/right icon assets to `a-assets` in the AR scene using the official MindAR sample icon paths copied into `public/ar/icons`.
- [ ] Ensure clicking arrows changes only that portfolio object's active item.

### Task 4: Verify

**Files:**
- No code changes unless verification fails.

- [ ] Run `node --test test\portfolio-object-config.test.mjs`.
- [ ] Run `node --test test\starry-night-config.test.mjs`.
- [ ] Run `npm test -- --runInBand`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
