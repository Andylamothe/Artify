# MindAR Runtime And A-Frame Engine Flow

This document explains how the MindAR runtime connects image recognition to A-Frame rendering.

This is mostly about the MindAR engine and official A-Frame integration, not Artify-specific UI.

## Official Source Areas To Read

In the MindAR repo:

```text
src/image-target/controller.js
src/image-target/aframe.js
src/image-target/detector/*
src/image-target/tracker/*
src/image-target/matching/*
```

The A-Frame integration registers:

```text
mindar-image-system
mindar-image
mindar-image-target
```

These are the key pieces that make image tracking become AR objects.

## Runtime Responsibilities

The runtime is split into layers:

```text
Browser camera
  -> MindAR image controller
  -> detector / matcher / tracker
  -> targetIndex + worldMatrix
  -> A-Frame target entity
  -> rendered child objects
```

MindAR does not directly "draw the AR museum experience."

MindAR finds and tracks the target. A-Frame renders the objects.

## A-Frame Components

### `mindar-image-system`

This is the A-Frame system that owns the MindAR image controller.

Its responsibilities:

- store registered target entities;
- load UI settings;
- open the camera;
- create the MindAR controller;
- load the `.mind` target data;
- process video frames;
- update registered A-Frame target entities.

Conceptually:

```text
mindar-image-system
  -> has controller
  -> has video element
  -> has anchorEntities[]
```

### `mindar-image`

This is the scene-level A-Frame component.

It is placed on `<a-scene>`:

```html
<a-scene mindar-image="imageTargetSrc: /targets/artworks.mind; maxTrack: 1">
</a-scene>
```

Its job:

- read config from the scene attribute;
- call `mindar-image-system.setup(...)`;
- optionally auto-start tracking on render start.

Important properties:

```text
imageTargetSrc
maxTrack
filterMinCF
filterBeta
warmupTolerance
missTolerance
autoStart
uiLoading
uiScanning
uiError
```

### `mindar-image-target`

This is the target/anchor component.

It is placed on an entity:

```html
<a-entity mindar-image-target="targetIndex: 0">
  <a-box></a-box>
</a-entity>
```

Its job:

- register itself with `mindar-image-system`;
- declare which compiled target index it represents;
- stay invisible until target is found;
- receive matrix updates from MindAR;
- emit `targetFound`;
- emit `targetLost`.

## How A Target Entity Is Registered

When A-Frame initializes:

```text
<a-entity mindar-image-target="targetIndex: 1">
```

the `mindar-image-target` component calls the system:

```text
registerAnchor(entity, targetIndex)
```

The system stores:

```text
anchorEntities = [
  { el: entity0, targetIndex: 0 },
  { el: entity1, targetIndex: 1 },
  { el: entity2, targetIndex: 2 }
]
```

Later, when MindAR detects target `1`, only the entity registered with `targetIndex: 1` receives the matrix update.

## Starting The Runtime

Runtime startup is roughly:

```text
scene exists
  -> mindar-image component setup
  -> mindar-image-system.start()
  -> getUserMedia({ video: { facingMode: "environment" } })
  -> camera video metadata loads
  -> controller is created with video dimensions
  -> image targets are loaded from .mind
  -> dummy run / warmup
  -> process camera frames
```

A common bug is starting too early.

If `mindar-image-system.start()` is called before `mindar-image` has run setup, the system may not have `ui`, `imageTargetSrc`, or config initialized. The engine then fails before camera/tracking is ready.

Correct logic:

```text
wait until scene exists
wait until mindar-image-system exists
wait until setup has imageTargetSrc and ui
then call start()
```

## Camera Frames

MindAR creates a hidden or background video element.

The browser feeds camera frames into that video element.

The controller processes that video:

```text
controller.processVideo(video)
```

Each processed frame can produce one of several update results:

```text
processDone
updateMatrix
```

The important one for rendering is:

```text
updateMatrix
```

## `targetIndex`

`targetIndex` is the index of the matched target inside the compiled `.mind` file.

Example:

```text
.mind file was compiled with:
  [imageA, imageB, imageC]

Runtime:
  imageA detected -> targetIndex 0
  imageB detected -> targetIndex 1
  imageC detected -> targetIndex 2
```

The renderer should not guess. It should attach each AR scene to the correct `targetIndex`.

## `worldMatrix`

`worldMatrix` is the computed transform for the detected target.

It represents:

- target position;
- target rotation;
- target scale / perspective orientation;
- relationship between the physical image plane and the camera.

The A-Frame integration receives it and applies it to the target entity's Object3D matrix.

Conceptually:

```text
targetEntity.object3D.matrix = worldMatrix * postMatrix
```

`postMatrix` adjusts the raw target matrix into A-Frame's expected plane coordinate system.

## Target Found / Target Lost

MindAR toggles entity visibility based on whether the matrix exists.

If previous state was invisible and a matrix arrives:

```text
emit targetFound
visible = true
```

If previous state was visible and matrix becomes null:

```text
emit targetLost
visible = false
```

This is the lifecycle app code should use for:

- start audio;
- pause audio;
- start video textures;
- pause video textures;
- show/hide status;
- reset UI panels if needed.

## How A-Frame Content Follows The Image

A-Frame uses a scene graph.

If a child is inside a tracked target entity:

```html
<a-entity mindar-image-target="targetIndex: 0">
  <a-plane></a-plane>
  <a-text></a-text>
  <a-video></a-video>
</a-entity>
```

then the child inherits the target entity transform.

So when the target entity receives `worldMatrix`, every child appears attached to the real image.

This is the fundamental trick:

```text
tracking happens on parent
rendered AR content is child of parent
```

## Target Coordinate System

Inside a target entity:

```text
x = horizontal over the target plane
y = vertical over the target plane
z = distance out from the target plane
```

Examples:

```html
<!-- centered on artwork -->
<a-plane position="0 0 0.05"></a-plane>

<!-- slightly above artwork -->
<a-text position="0 0.7 0.1"></a-text>

<!-- floating to the right -->
<a-image position="1.1 0 0.2"></a-image>
```

Values are in A-Frame world units after MindAR's target scaling.

## Rendering Images

A normal A-Frame image:

```html
<a-image src="/image.webp" width="1" height="0.7"></a-image>
```

This creates a textured plane.

For AR, it should be inside the target:

```html
<a-entity mindar-image-target="targetIndex: 0">
  <a-image src="/image.webp" position="0 0 0.05"></a-image>
</a-entity>
```

## Rendering Video

For video, the reliable A-Frame pattern is:

```html
<a-assets>
  <video
    id="my-video"
    src="/video.mp4"
    muted
    loop
    playsinline
    preload="auto"
  ></video>
</a-assets>

<a-entity mindar-image-target="targetIndex: 0">
  <a-video src="#my-video" width="1" height="0.6"></a-video>
</a-entity>
```

Why use `<a-assets>`?

Because A-Frame resolves `#my-video` as an actual HTML video element and uses it as a texture.

Direct video URLs in `<a-video>` are less reliable across mobile browsers.

## Rendering Buttons

A-Frame click handling usually uses:

```html
<a-camera
  cursor="rayOrigin: mouse; fuse: false"
  raycaster="objects: .clickable"
></a-camera>
```

Then clickable entities use:

```html
<a-plane class="clickable"></a-plane>
```

Touch/click becomes a raycast from the camera into the 3D scene.

If the ray hits the object, A-Frame emits click events.

## A-Frame Animations

A-Frame can animate AR child objects declaratively:

```html
<a-plane
  animation="property: rotation; to: 0 0 360; loop: true; dur: 4000"
></a-plane>
```

Because the animated object is still a child of the tracked target, the animation runs relative to the detected artwork.

That means:

```text
target tracking controls parent transform
animation controls child local transform
```

## HTML UI Is Not AR

A normal React/HTML overlay is not tracked.

Example:

```html
<div class="overlay">History</div>
```

This stays on the screen, not on the artwork.

If a panel must physically follow the artwork, it needs to be an A-Frame entity under:

```html
<a-entity mindar-image-target="targetIndex: X">
```

## Engine-Level Full Flow

```text
1. Load A-Frame.
2. Load MindAR A-Frame integration.
3. A-Frame registers mindar-image-system.
4. Scene mounts with mindar-image attribute.
5. Target entities mount with mindar-image-target attributes.
6. Each target entity registers itself with the MindAR system.
7. Runtime starts after user gesture.
8. Browser opens camera stream.
9. MindAR loads compiled .mind target data.
10. MindAR processes camera frames.
11. Detector/matcher finds target candidates.
12. Tracker estimates/updates target pose.
13. Controller emits updateMatrix(targetIndex, worldMatrix).
14. A-Frame target entity receives matrix.
15. Entity visibility becomes true.
16. targetFound event fires.
17. Child A-Frame objects render attached to the physical image.
18. If tracking is lost, matrix becomes null.
19. Entity visibility becomes false.
20. targetLost event fires.
```

## Why The Engine Can Show 3D

MindAR does not create 3D art by itself.

It estimates the target image plane pose.

Once the pose is known, any 3D renderer can draw objects in that coordinate space.

A-Frame is a wrapper around Three.js, so when MindAR updates an A-Frame entity matrix, all Three.js children under that entity render as if they are attached to the image.

That is why this works:

```html
<a-entity mindar-image-target="targetIndex: 0">
  <a-box position="0 0 0.2"></a-box>
</a-entity>
```

The box is not in the `.mind` file. The `.mind` file only lets MindAR know where the image is. A-Frame draws the box at that location.

## Summary

MindAR runtime:

```text
camera pixels -> feature matching -> targetIndex + worldMatrix
```

A-Frame runtime:

```text
worldMatrix -> target entity transform -> render child objects
```

The bridge between both is:

```text
mindar-image-system + mindar-image-target
```

That bridge is what makes scanned flat images become interactive AR anchors.
