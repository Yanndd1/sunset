import { QUALITY_TIERS } from "./sunsetScore";

export type Palette = {
  key: string; // tier label — used to key the background crossfade
  background: string; // full CSS background: horizon glow over a sky gradient
};

// One sky per quality tier (index-aligned with QUALITY_TIERS). The whole sky
// changes character with quality — a flat grey overcast for a poor score, a
// saturated magenta-fire-gold sky for an exceptional one — so the tier reads
// at a glance even where panels cover the middle of the screen.
const SKIES = [
  // Médiocre — flat, colourless overcast
  "linear-gradient(180deg, #3b3e45 0%, #4b4d54 44%, #5c5b60 74%, #6e6a65 100%)",
  // Quelconque — hazy, muted dusk
  "linear-gradient(180deg, #343247 0%, #524a5b 40%, #7c6668 70%, #a18779 100%)",
  // Correct — a soft but real sunset
  "linear-gradient(180deg, #2f2350 0%, #6a3b67 36%, #b16b5f 68%, #e6a873 100%)",
  // Beau — a vivid, colourful sunset
  "linear-gradient(180deg, #2a1a5c 0%, #7d2f7e 32%, #c7506a 56%, #f0824a 80%, #ffc06a 100%)",
  // Superbe — dramatic, fiery, saturated
  "linear-gradient(180deg, #311a6e 0%, #9c2f86 30%, #e24a5f 54%, #ff7a33 78%, #ffc85e 100%)",
  // Exceptionnel — spectacular electric magenta, fire and gold
  "linear-gradient(180deg, #3a1a86 0%, #b32f8e 26%, #f23f60 48%, #ff6a2a 70%, #ffa238 86%, #ffe18c 100%)",
];

// Horizon glow — brighter and warmer as quality rises.
const GLOWS = [
  "rgba(150,152,162,0.18)",
  "rgba(216,176,150,0.42)",
  "rgba(255,182,118,0.60)",
  "rgba(255,158,84,0.78)",
  "rgba(255,142,58,0.90)",
  "rgba(255,172,66,0.95)",
];

export function tierIndexForScore(score: number): number {
  let idx = 0;
  for (let i = 0; i < QUALITY_TIERS.length; i++) {
    if (score >= QUALITY_TIERS[i].min) idx = i;
  }
  return idx;
}

export function paletteFor(score: number): Palette {
  const idx = tierIndexForScore(score);
  const background = `radial-gradient(140% 95% at 50% 106%, ${GLOWS[idx]} 0%, rgba(0,0,0,0) 66%), ${SKIES[idx]}`;
  return { key: QUALITY_TIERS[idx].label, background };
}
