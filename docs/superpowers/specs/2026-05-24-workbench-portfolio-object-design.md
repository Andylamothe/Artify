# Workbench Portfolio Object Design

## Goal

Add a dedicated AR `portfolio` object that represents other works by the artist. The object is created from the workbench palette, edited from the right inspector, and rendered in AR like the official MindAR advanced portfolio panel: title above, active artwork image centered, left/right icon buttons on the sides.

## Requirements

- The workbench palette includes a new `Portfolio` element.
- A portfolio object appears above the target image by default.
- The right inspector lets the user upload new portfolio images.
- The right inspector also lets the user select existing uploaded artwork images.
- Every selected portfolio image has a small title shown above the image in AR.
- The AR runtime uses image carousel behavior directly on the object, not the existing global overlay panel.
- The carousel uses the same visual pattern as the MindAR advanced sample: `a-entity` panel, stacked `a-image` items, left/right image buttons, and A-Frame click handling through `.ar-clickable`.

## Architecture

Extend `ARObjectConfig` with optional `portfolioItems`, each containing `id`, `title`, and `src`. Add `portfolio` to `ARObjectType`. The workbench creates and edits these items, saving them inside `arObjects` with the artwork manifest.

Rendering lives with the existing custom object renderers:

- `ARCustomObjects.tsx` renders the real AR portfolio carousel.
- `MindTargetWorkbench.tsx` renders the workbench preview, inspector controls, and object creation defaults.

The implementation keeps existing `historicalImages` behavior intact. Existing images remain a reusable media pool; selected portfolio items are stored per object so one artwork can have multiple portfolio carousels if needed.

## Testing

Add focused tests for portfolio object creation/config and runtime rendering. Existing lint, Jest, Starry Night config test, and production build must keep passing.
