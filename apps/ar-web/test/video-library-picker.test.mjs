import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workbenchSource = await readFile(
  new URL("../src/components/workbench/MindTargetWorkbench.tsx", import.meta.url),
  "utf8",
);
const assetsRouteSource = await readFile(new URL("../src/app/api/workbench/assets/route.ts", import.meta.url), "utf8");

test("assets API exposes the artwork video library", () => {
  assert.match(assetsRouteSource, /export async function GET/);
  assert.match(assetsRouteSource, /typeParam === "video"/);
  assert.match(assetsRouteSource, /videoExtensions/);
  assert.match(assetsRouteSource, /\/api\/workbench\/assets\/\$\{assetPath\}/);
});

test("video inspector can select an existing server video", () => {
  assert.match(workbenchSource, /artworkId=\{draft\.id\}/);
  assert.match(workbenchSource, /function VideoLibraryPicker/);
  assert.match(workbenchSource, /Use from library/);
  assert.match(workbenchSource, /\/api\/workbench\/assets\?artworkId=/);
  assert.match(workbenchSource, /selectVideoFromLibrary/);
  assert.match(workbenchSource, /applyMediaAspectRatio\(\{ \.\.\.object, src: item\.url \}/);
});
