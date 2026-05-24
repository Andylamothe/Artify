import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import ts from "typescript";

async function importTypeScriptModule(path) {
  const source = await readFile(path, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const encoded = encodeURIComponent(compiled.outputText);
  return import(`data:text/javascript;charset=utf-8,${encoded}`);
}

test("Starry Night config keeps only the painting and sun overlay visible", async () => {
  const moduleUrl = pathToFileURL(
    "src/components/ar/scenes/starry-night/starryNightExperienceConfig.ts",
  );
  const { createStarryNightExperienceConfig } = await importTypeScriptModule(moduleUrl);

  const config = createStarryNightExperienceConfig({
    lowPower: false,
    targetAspect: 4 / 3,
  });

  assert.deepEqual(
    config.layers.map((layer) => layer.id),
    ["base", "sun"],
  );
  assert.ok(config.layers[0].position.z < config.layers.at(-1).position.z);
  assert.equal(config.layers.find((layer) => layer.id === "sun")?.parallax, 0.018);
  assert.equal(config.plane.width, 1.6);
  assert.equal(config.plane.height, 1.2);
  assert.equal(config.particles.count, 0);
  assert.equal(config.shader.enabled, true);
  assert.equal(config.shader.animatedLayer, "base");
});

test("Starry Night low power config keeps the wave shader cheap", async () => {
  const moduleUrl = pathToFileURL(
    "src/components/ar/scenes/starry-night/starryNightExperienceConfig.ts",
  );
  const { createStarryNightExperienceConfig } = await importTypeScriptModule(moduleUrl);

  const normal = createStarryNightExperienceConfig({ lowPower: false, targetAspect: 4 / 3 });
  const lowPower = createStarryNightExperienceConfig({ lowPower: true, targetAspect: 4 / 3 });

  assert.equal(lowPower.particles.count, 0);
  assert.equal(lowPower.shader.enabled, true);
  assert.ok(lowPower.motion.skyDrift < normal.motion.skyDrift);
  assert.ok(lowPower.motion.waveFlow < normal.motion.waveFlow);
});
