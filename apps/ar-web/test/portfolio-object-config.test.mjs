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

test("portfolio carousel swaps the active A-Frame image instead of toggling hidden images", () => {
  assert.match(arCustomObjectsSource, /key=\{`\$\{object\.id\}-portfolio-active-\$\{activeItem\.id \|\| activeIndex\}`\}/);
  assert.doesNotMatch(arCustomObjectsSource, /items\.map\(\(item, index\) => \(\s*<a-image[\s\S]*visible=\{index === activeIndex\}/);
  assert.match(arCustomObjectsSource, /id=\{`\$\{object\.id\}-portfolio-left-button`\}[\s\S]*step\(-1\)/);
  assert.match(arCustomObjectsSource, /id=\{`\$\{object\.id\}-portfolio-right-button`\}[\s\S]*step\(1\)/);
});

test("AR portfolio panel also replaces the active photo texture when stepping", async () => {
  const arExperienceSource = await readFile(
    new URL("../src/components/ar/ARExperience.tsx", import.meta.url),
    "utf8",
  );

  assert.match(arExperienceSource, /const activePanelImage = visibleImages\[currentIndex\];/);
  assert.match(arExperienceSource, /key=\{`\$\{artwork\.id\}-portfolio-active-\$\{currentIndex\}-\$\{activePanelImage\}`\}/);
  assert.doesNotMatch(arExperienceSource, /visibleImages\.map\(\(image, index\) => \(\s*<a-image[\s\S]*visible=\{index === currentIndex\}/);
});
