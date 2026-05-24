import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const typesSource = await readFile(new URL("../src/types/ar.ts", import.meta.url), "utf8");
const workbenchSource = await readFile(
  new URL("../src/components/workbench/MindTargetWorkbench.tsx", import.meta.url),
  "utf8",
);
const arCustomObjectsSource = await readFile(
  new URL("../src/components/ar/scenes/ARCustomObjects.tsx", import.meta.url),
  "utf8",
);

test("portfolio object is a first-class AR object with titled image items", () => {
  assert.match(typesSource, /ARObjectType = .*"portfolio"/s);
  assert.match(typesSource, /interface ARPortfolioItem/);
  assert.match(typesSource, /portfolioItems\?: ARPortfolioItem\[\]/);
});

test("workbench creates portfolio objects above the artwork", () => {
  assert.match(workbenchSource, /type: "portfolio"/);
  assert.match(workbenchSource, /label: "Portfolio"/);
  assert.match(workbenchSource, /portfolioItems: \[\]/);
  assert.match(workbenchSource, /type === "portfolio"[\s\S]*\{ x: 0, y: 0\.6, z: 0\.82 \}/);
});

test("AR renderer draws a MindAR-style portfolio carousel with icon arrows", () => {
  assert.match(arCustomObjectsSource, /function PortfolioObject/);
  assert.match(arCustomObjectsSource, /src="#icon-left"/);
  assert.match(arCustomObjectsSource, /src="#icon-right"/);
  assert.match(arCustomObjectsSource, /portfolioItems/);
});
