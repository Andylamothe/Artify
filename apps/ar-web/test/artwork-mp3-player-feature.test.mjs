import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const typeSource = await readFile(new URL("../src/types/ar.ts", import.meta.url), "utf8");
const routeSource = await readFile(new URL("../src/app/api/workbench/artworks/route.ts", import.meta.url), "utf8");
const workbenchSource = await readFile(new URL("../src/components/workbench/MindTargetWorkbench.tsx", import.meta.url), "utf8");
const audioHookSource = await readFile(new URL("../src/hooks/ar/useArtworkAudio.ts", import.meta.url), "utf8");
const arExperienceSource = await readFile(new URL("../src/components/ar/ARExperience.tsx", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("artwork configs can enable or disable uploaded guide audio", () => {
  assert.match(typeSource, /audioEnabled: boolean/);
  assert.match(routeSource, /audioEnabled: typeof artwork\.audioEnabled === "boolean" \? artwork\.audioEnabled : Boolean\(artwork\.audioUrl\)/);
});

test("workbench lets an artwork upload and activate an mp3 audio guide", () => {
  assert.match(workbenchSource, /stage-audio-button/);
  assert.match(workbenchSource, /stage-audio-panel/);
  assert.match(workbenchSource, /audio controls/);
  assert.match(workbenchSource, /Audio guide active/);
  assert.match(workbenchSource, /accept="audio\/mpeg,audio\/mp3,\.mp3,audio\/wav"/);
  assert.match(workbenchSource, /onDraftChange\("audioEnabled", event\.target\.checked\)/);
});

test("scanned artworks show a mobile timeline player for enabled audio", () => {
  assert.match(audioHookSource, /activeArtwork\.audioEnabled/);
  assert.match(audioHookSource, /currentTime/);
  assert.match(audioHookSource, /seekBy/);
  assert.match(audioHookSource, /seekToRatio/);
  assert.match(arExperienceSource, /<ArtworkAudioPlayer/);
  assert.match(arExperienceSource, /onSeekBackward/);
  assert.match(arExperienceSource, /onSeekForward/);
  assert.match(cssSource, /\.artwork-audio-player/);
  assert.match(cssSource, /\.audio-timeline/);
});
