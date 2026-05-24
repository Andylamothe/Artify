# MindAR Engine And `.mind` File Internals

This document is about MindAR itself, not our Artify implementation.

Goal: understand what a `.mind` file is, how it is compiled, and how the image-tracking engine uses it.

## Official Sources Read

- MindAR repository: `https://github.com/hiukim/mind-ar-js`
- MindAR docs installation page: `https://hiukim.github.io/mind-ar-js-doc/installation/`
- MindAR A-Frame docs: `https://hiukim.github.io/mind-ar-js-doc/installation/#aframe-installation`
- MindAR source areas to study:
  - `src/image-target/compiler-base.js`
  - `src/image-target/image-list.js`
  - `src/image-target/detector/*`
  - `src/image-target/matching/*`
  - `src/image-target/tracker/*`
  - `src/image-target/controller.js`
  - `src/image-target/aframe.js`

## What A `.mind` File Is

A `.mind` file is a compiled image-target database.

It is not just the original artwork image saved in another extension.

It contains precomputed computer-vision data extracted from one or more target images. The browser loads this data so it can compare live camera frames against known targets quickly.

Conceptually:

```text
source images
  -> feature extraction
  -> descriptor generation
  -> multi-scale image data
  -> matching/tracking metadata
  -> binary .mind file
```

The `.mind` file lets MindAR answer:

```text
"Does this camera frame contain one of my known image targets?"
```

and then:

```text
"Where is that image target in 3D camera space?"
```

## What Goes Into The `.mind` File

From the MindAR source structure, a compiled target stores data similar to:

- target image dimensions;
- multiple scaled versions / pyramid data;
- keypoints or feature points;
- feature descriptors;
- matching metadata;
- tracking data.

The exact output is produced by the MindAR compiler, then serialized into an exported binary. In JavaScript usage, the compiler flow is effectively:

```js
const compiler = new window.MINDAR.IMAGE.Compiler();
const dataList = await compiler.compileImageTargets([image1, image2, image3]);
const exportedBuffer = await compiler.exportData();
```

`exportedBuffer` is then saved as:

```text
artworks.mind
```

## Why Compilation Exists

Doing the full feature extraction from every source artwork on every visitor phone would be too slow.

Compilation moves expensive work ahead of time.

At demo/runtime time, the phone only needs to:

1. load the already compiled target data;
2. read camera frames;
3. extract camera-frame features;
4. compare them against precomputed target features;
5. estimate the target transform.

This is why the `.mind` file must be prepared before scanning.

## High-Level Compilation Pipeline

The compiler receives normal images:

```text
mona-lisa.jpg
starry-night.jpg
the-scream.jpg
```

It outputs one multi-target file:

```text
artworks.mind
```

The target order matters:

```text
compile list[0] -> targetIndex 0
compile list[1] -> targetIndex 1
compile list[2] -> targetIndex 2
```

MindAR does not know the artwork title. It only knows target indexes.

If `starry-night.jpg` is the second image passed into the compiler, MindAR will report:

```text
targetIndex = 1
```

when it sees Starry Night.

## What Feature Extraction Means

Feature extraction means finding visually stable points in the image.

A good feature point is something like:

- a corner;
- a high-contrast blob;
- a unique edge intersection;
- a textured brush-stroke detail;
- a small local pattern that is not repeated everywhere.

Bad feature areas:

- flat color;
- smooth gradients;
- blurry regions;
- repeated identical patterns;
- reflections;
- low-resolution noise.

The compiler does not simply say "this image is blue and yellow." It finds many small local visual fingerprints that can still be matched when the image is:

- farther away;
- closer;
- rotated;
- partially perspective-skewed;
- under slightly different lighting.

## Descriptors

After finding feature points, the engine builds descriptors.

A descriptor is a compact numeric fingerprint of the area around one feature point.

At runtime, MindAR can compare descriptors from the camera frame against descriptors stored in the `.mind` file.

That gives candidate matches:

```text
camera feature A looks like target feature 23
camera feature B looks like target feature 91
camera feature C looks like target feature 104
```

One match is not enough. The engine needs many matches that agree geometrically.

## Matching

Matching is the first runtime stage after camera-frame analysis.

The engine:

1. extracts camera frame features;
2. compares them to compiled target features;
3. gets many candidate point pairs;
4. rejects weak or inconsistent matches;
5. checks whether the remaining matches form the same geometric plane.

For image tracking, the target is a flat plane. A painting, poster, or printed card is basically planar.

The engine therefore estimates a planar transform, usually described as a homography.

## Homography

A homography maps points from the target image plane to points in the camera frame.

Example:

```text
target image corner / feature point
  -> appears at this pixel in the camera frame
```

If enough feature matches agree on one homography, the engine can say:

```text
"This target is present."
```

and:

```text
"This is its perspective transform in the current frame."
```

## RANSAC-Style Rejection

Real camera frames are messy.

Some feature matches will be wrong. The engine needs to reject bad matches.

MindAR source includes matching logic that follows the classic image-tracking strategy:

- generate candidate matches;
- test geometric consistency;
- keep inliers;
- reject outliers;
- accept the target only if enough matches support the same transform.

This is why a target can fail even when it is visible: if the camera frame does not produce enough consistent feature matches, MindAR refuses detection.

## Tracking After Detection

Detection answers:

```text
"I found target 1 in this frame."
```

Tracking answers:

```text
"Keep following target 1 frame after frame smoothly."
```

MindAR has detector and tracker stages.

Detection is heavier because it searches for targets.

Tracking can be lighter once a target is found, because the engine already knows approximately where the image was in the previous frame.

This is why AR may feel more stable after it locks on, and why sudden movement can break tracking.

## TensorFlow.js / WebGL Role

MindAR runs in the browser.

It uses browser-side compute, including TensorFlow.js/WebGL-backed operations in the image-target package. That is why it can run without a server.

Important practical meaning:

- camera frames stay on the device;
- recognition happens locally;
- performance depends on mobile browser, GPU, WebGL, and camera resolution;
- low-end phones can struggle if targets are bad or too many targets are tracked;
- `maxTrack: 1` helps performance.

We do not need to manually call TensorFlow.js. MindAR wraps the internal processing.

## Runtime Engine Flow

At runtime the MindAR image controller does roughly this:

```text
load .mind file
  -> create image target database
  -> open camera stream
  -> read video frames
  -> process current frame
  -> extract frame features
  -> match against compiled targets
  -> estimate target transform
  -> update target world matrix
```

In the A-Frame integration, the important update is:

```text
onUpdate({
  type: "updateMatrix",
  targetIndex,
  worldMatrix
})
```

`targetIndex` identifies which compiled image was found.

`worldMatrix` tells the renderer where the target is in 3D space.

## What `worldMatrix` Means

The matrix contains the position, rotation, and scale/orientation of the detected target relative to the camera.

A renderer does not need to understand feature matching. It only needs the matrix.

That matrix is applied to an anchor/group/entity:

```text
target entity world transform = worldMatrix * correction matrix
```

Then every child object follows the target.

## Why Some Images Track Better Than Others

MindAR does not recognize "art" semantically.

It recognizes local visual features.

Good artwork targets:

- detailed brushwork;
- visible edges;
- high contrast;
- many unique shapes;
- high enough resolution;
- not over-compressed.

Weak artwork targets:

- too abstract with flat color;
- repeated geometric patterns;
- low-contrast dark painting;
- glossy/reflected photo;
- cropped differently from the compiled target.

## Why Cropping And Aspect Ratio Matter

The compiled target has a known width/height and known feature positions.

If the physical scanned image is cropped, stretched, or printed with a different aspect ratio, the feature geometry no longer matches perfectly.

Small differences are okay. Big differences break matching.

This is especially important for museum demos:

```text
the scanned print should match the exact file compiled into .mind
```

## Why Multiple Targets Must Be Compiled Together

One `.mind` file can contain multiple image targets.

The index comes from compile order:

```text
Compiler input array:
  [monaLisaImage, starryNightImage, screamImage]

Runtime target indexes:
  Mona Lisa    -> 0
  Starry Night -> 1
  The Scream   -> 2
```

If later you compile only a new artwork alone, it becomes index `0` in that new `.mind` file.

That can break all old mappings.

Correct workflow:

```text
collect every scannable target image
  -> compile all together
  -> update every artwork targetIndex to match compile order
```

## What The `.mind` File Does Not Contain

The `.mind` file does not contain:

- artwork title;
- artist;
- history text;
- audio URL;
- AR panel layout;
- A-Frame objects;
- animations;
- videos;
- buttons.

Those belong to the app's artwork config.

The `.mind` file only supports recognition/tracking.

## Mental Model

MindAR has two jobs:

```text
Recognition:
  "Which target image is in the camera frame?"

Pose estimation:
  "Where is that target image in 3D space?"
```

Everything else is app logic.

The `.mind` file is the precomputed knowledge MindAR needs to do those two jobs quickly in the browser.
