import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const arExperienceSource = await readFile(
  new URL("../src/components/ar/ARExperience.tsx", import.meta.url),
  "utf8",
);

test("AR scene passes MindAR smoothing and target-loss tolerance config", () => {
  assert.match(arExperienceSource, /filterMinCF: 0\.0005/);
  assert.match(arExperienceSource, /filterBeta: 0\.1/);
  assert.match(arExperienceSource, /warmupTolerance: 8/);
  assert.match(arExperienceSource, /missTolerance: 24/);
});
