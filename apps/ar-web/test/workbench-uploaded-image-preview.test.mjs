import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workbenchSource = await readFile(new URL("../src/components/workbench/MindTargetWorkbench.tsx", import.meta.url), "utf8");
const arObjectsSource = await readFile(new URL("../src/components/ar/scenes/ARCustomObjects.tsx", import.meta.url), "utf8");
const assetRouteSource = await readFile(new URL("../src/app/api/workbench/assets/[...assetPath]/route.ts", import.meta.url), "utf8");
const uploadRouteSource = await readFile(new URL("../src/app/api/workbench/assets/route.ts", import.meta.url), "utf8");

test("uploaded workbench images render through the asset API instead of the static symlink path", () => {
  assert.match(workbenchSource, /const previewImageSrc = workbenchAssetPlaybackUrl\(targetPreview\)/);
  assert.match(workbenchSource, /<img\s+src=\{previewImageSrc\}/);
  assert.match(workbenchSource, /src=\{workbenchAssetPlaybackUrl\(object\.src\)\}/);
  assert.match(workbenchSource, /src=\{workbenchAssetPlaybackUrl\(activeItem\.src\)\}/);
  assert.match(workbenchSource, /src=\{workbenchAssetPlaybackUrl\(imageUrl\)\}/);
  assert.match(arObjectsSource, /workbenchAssetPlaybackUrl/);
  assert.match(arObjectsSource, /src=\{workbenchAssetPlaybackUrl\(object\.src\)\}/);
  assert.match(arObjectsSource, /src=\{workbenchAssetPlaybackUrl\(activeItem\.src\)\}/);
});

test("asset API serves common uploaded image types with browser-decodable content types", () => {
  assert.match(assetRouteSource, /extension === "\.jfif"/);
  assert.match(assetRouteSource, /extension === "\.avif"/);
  assert.match(assetRouteSource, /extension === "\.bmp"/);
  assert.match(assetRouteSource, /extension === "\.svg"/);
  assert.match(uploadRouteSource, /url: `\/api\/workbench\/assets\/\$\{assetPath\}`/);
});
