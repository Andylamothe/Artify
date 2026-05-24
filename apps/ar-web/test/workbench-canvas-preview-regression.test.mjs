import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workbenchSource = await readFile(
  new URL("../src/components/workbench/MindTargetWorkbench.tsx", import.meta.url),
  "utf8",
);

test("canvas object previews stay visible even when objects are not selected", () => {
  assert.doesNotMatch(workbenchSource, /if \(!selected\) return null/);
  assert.match(workbenchSource, /function ObjectPreview\(\{ object \}: \{ object: ARObjectConfig \}\)/);
  assert.match(workbenchSource, /if \(object\.type === "text"\) return <span>\{object\.text \|\| "Text"\}<\/span>/);
});
