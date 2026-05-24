import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const arExperienceSource = await readFile(
  new URL("../src/components/ar/ARExperience.tsx", import.meta.url),
  "utf8",
);
const globalCssSource = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("/ar start screen is a polished scan landing with real CTAs and steps", () => {
  assert.match(arExperienceSource, /<ARStartLanding/);
  assert.match(arExperienceSource, /Scan an artwork/);
  assert.match(arExperienceSource, /Watch it come alive/);
  assert.match(arExperienceSource, /Start scanning/);
  assert.doesNotMatch(arExperienceSource, /Preview demo/);
  assert.doesNotMatch(arExperienceSource, /onPreview/);
  assert.match(arExperienceSource, /Point camera/);
  assert.match(arExperienceSource, /Detect artwork/);
  assert.match(arExperienceSource, /Explore AR layers/);
  assert.match(arExperienceSource, /ar-start-scan-frame/);
  assert.match(arExperienceSource, /ar-start-pulse/);
  assert.match(globalCssSource, /\/ar\/images\/ar-scan-hero/);
  assert.match(globalCssSource, /\.ar-start-landing/);
  assert.match(globalCssSource, /\.ar-start-steps/);
  assert.match(globalCssSource, /--ar-social-burgundy: #810B38/);
  assert.match(globalCssSource, /--ar-social-beige: #F1E2D1/);
  assert.match(globalCssSource, /--ar-social-brown: #6B4A36/);
  assert.match(globalCssSource, /font-family: "Playfair Display", Georgia, serif/);
  assert.match(globalCssSource, /@keyframes arScanSweep/);
  assert.match(globalCssSource, /@keyframes arHeroDrift/);
  assert.match(globalCssSource, /padding-top: 18svh/);
});

test("/ar start screen palette keeps AA contrast for readable foreground pairs", () => {
  assert.equal(contrastRatio("#F1E2D1", "#810B38") >= 4.5, true);
  assert.equal(contrastRatio("#F1E2D1", "#6B4A36") >= 4.5, true);
  assert.equal(contrastRatio("#F1E2D1", "#11100E") >= 4.5, true);
  assert.equal(contrastRatio("#810B38", "#F1E2D1") >= 4.5, true);
  assert.equal(contrastRatio("#6B4A36", "#F1E2D1") >= 4.5, true);
});

function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const light = Math.max(foregroundLuminance, backgroundLuminance);
  const dark = Math.min(foregroundLuminance, backgroundLuminance);
  return (light + 0.05) / (dark + 0.05);
}

function relativeLuminance(hexColor) {
  const [red, green, blue] = hexColor
    .slice(1)
    .match(/.{2}/g)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
