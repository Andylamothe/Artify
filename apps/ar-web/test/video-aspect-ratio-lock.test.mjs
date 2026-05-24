import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const typesSource = await readFile(new URL("../src/types/ar.ts", import.meta.url), "utf8");
const workbenchSource = await readFile(
  new URL("../src/components/workbench/MindTargetWorkbench.tsx", import.meta.url),
  "utf8",
);
const artworksApiSource = await readFile(
  new URL("../src/app/api/workbench/artworks/route.ts", import.meta.url),
  "utf8",
);

test("video layers persist their detected media aspect ratio", () => {
  assert.match(typesSource, /mediaAspectRatio\?: number/);
  assert.match(typesSource, /mediaFit\?: "contain" \| "cover"/);
  assert.match(artworksApiSource, /mediaAspectRatio: clampFloat\(object\.mediaAspectRatio, 0\.05, 20, 0\)/);
  assert.match(artworksApiSource, /mediaFit: object\.mediaFit === "contain" \? "contain" : "cover"/);
});

test("workbench locks video sizing to the detected aspect ratio", () => {
  assert.match(workbenchSource, /function resizeObjectWithAspectLock/);
  assert.match(workbenchSource, /mediaAspectRatio: aspect/);
  assert.match(workbenchSource, /mediaFit: "cover"/);
  assert.match(workbenchSource, /resizeObjectWithAspectLock\(object, "width", value\)/);
  assert.match(workbenchSource, /resizeObjectWithAspectLock\(object, "height", value\)/);
  assert.match(workbenchSource, /resizeBoundsWithAspectLock\(object, horizontal, vertical, drag\.handle\)/);
});
