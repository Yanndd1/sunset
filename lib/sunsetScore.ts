// Deterministic sunrise/sunset beauty score (0–100).
//
// score = canvas × lowBlock × clarity × aerosol × precip × structure × front × terrain
// Each factor lives roughly in [0, 1.2]; the result is clamped to [0, 100].
//
// All weights/thresholds live here. Inspired by SunsetWx / Kevin Xu
// "Predicting sunsets with the weather", augmented with aerosols (CAMS),
// precipitation, cloud-structure heuristics, frontal-passage signal and a
// per-location terrain bonus.

export type SkyConditions = {
  cloudLow: number; // %
  cloudMid: number; // %
  cloudHigh: number; // %
  visibility: number; // metres
  humidity: number; // %  (2 m relative humidity)
  // Optional factors — the score treats `undefined` as a neutral 1.0.
  aod?: number; // aerosol optical depth (CAMS, typical 0.02–0.6)
  precipProb?: number; // %
  pressureDelta24h?: number; // hPa, current minus 24 h ago
};

export type QualityTier = {
  label: string;
  min: number;
  color: string;
};

// Recalibrated thresholds: more generous than the v1 0/20/40/60/75/90 so the
// higher tiers are reachable on real days. Tunable.
export const QUALITY_TIERS: QualityTier[] = [
  { label: "Médiocre", min: 0, color: "#9aa0b5" },
  { label: "Quelconque", min: 18, color: "#c7a98f" },
  { label: "Correct", min: 35, color: "#e3a85f" },
  { label: "Beau", min: 52, color: "#f08a4b" },
  { label: "Superbe", min: 68, color: "#ef5d56" },
  { label: "Exceptionnel", min: 82, color: "#e23e6b" },
];

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

// ---------- Individual factors (exported for transparency + testing) ----------

// Mid + high clouds catch the low-angle light. Bell peaking near 50 % cover.
export function canvasFactor(cloudMid: number, cloudHigh: number): number {
  const hm = clamp((cloudMid * 1.0 + cloudHigh * 0.7) / 100, 0, 1);
  return Math.max(1 - Math.abs(hm - 0.5) / 0.5, 0.3 * (1 - hm));
}

// Low clouds at the horizon block the grazing light. Multiplicative,
// sub-linear so a few percent barely costs anything while heavy cover is
// devastating.
export function lowBlockFactor(cloudLow: number): number {
  return 1 - Math.pow(clamp(cloudLow, 0, 100) / 100, 0.8);
}

// Air clarity from visibility + 2 m humidity, in [0.7, 1.0].
export function clarityFactor(visibility: number, humidity: number): number {
  const vis = clamp(visibility / 24000, 0, 1);
  const hum = 1 - clamp((humidity - 40) / 55, 0, 1);
  return 0.7 + 0.3 * (0.5 * vis + 0.5 * hum);
}

// Moderate aerosols (Saharan dust, distant smoke) deepen the reds via
// Rayleigh/Mie scattering; thick haze (pollution) mutes everything. Bell
// peaking around AOD ≈ 0.12.
export function aerosolFactor(aod: number | undefined): number {
  if (aod == null || !Number.isFinite(aod)) return 1.0;
  const peak = 0.12;
  const peakVal = 1.16;
  const baseClean = 0.94;
  const minHaze = 0.62;
  if (aod <= peak) {
    return baseClean + (peakVal - baseClean) * (aod / peak);
  }
  return Math.max(
    minHaze,
    peakVal - (peakVal - minHaze) * ((aod - peak) / (0.8 - peak)),
  );
}

// Rain probability kills the show. Slightly super-linear so even a 30–40 %
// chance is meaningful.
export function precipFactor(precipProb: number | undefined): number {
  if (precipProb == null || !Number.isFinite(precipProb)) return 1.0;
  const p = clamp(precipProb, 0, 100) / 100;
  return 1 - 0.55 * Math.pow(p, 1.2);
}

// Cloud structure heuristic: cirrus-like (high + dry air) is great, stratus-
// like (mid + humid) is dull. Multiplicative around 1.0, roughly [0.90, 1.10].
export function structureFactor(c: {
  cloudMid: number;
  cloudHigh: number;
  humidity: number;
}): number {
  let bonus = 0;
  if (c.cloudHigh > 30 && c.humidity < 60) {
    bonus = 0.10 * clamp((c.cloudHigh - 30) / 40, 0, 1);
  }
  let penalty = 0;
  if (c.cloudMid > 60 && c.humidity > 75) {
    penalty = 0.10 * clamp((c.cloudMid - 60) / 30, 0, 1);
  }
  return 1 + bonus - penalty;
}

// Rising pressure (often after a low) brings textured clearing skies. Mild
// bonus, capped at +8 %.
export function frontFactor(pressureDelta24h: number | undefined): number {
  if (pressureDelta24h == null || !Number.isFinite(pressureDelta24h)) {
    return 1.0;
  }
  if (pressureDelta24h <= 3) return 1.0;
  return Math.min(1.08, 1 + (pressureDelta24h - 3) / 60);
}

// ---------- Composite ----------

export function scoreSky(c: SkyConditions, terrainFactor = 1.0): number {
  const canvas = canvasFactor(c.cloudMid, c.cloudHigh);
  const lowBlock = lowBlockFactor(c.cloudLow);
  const clarity = clarityFactor(c.visibility, c.humidity);
  const aerosol = aerosolFactor(c.aod);
  const precip = precipFactor(c.precipProb);
  const structure = structureFactor({
    cloudMid: c.cloudMid,
    cloudHigh: c.cloudHigh,
    humidity: c.humidity,
  });
  const front = frontFactor(c.pressureDelta24h);
  const raw =
    canvas *
    lowBlock *
    clarity *
    aerosol *
    precip *
    structure *
    front *
    terrainFactor;
  return Math.round(100 * clamp(raw, 0, 1));
}

export function tierForScore(score: number): QualityTier {
  let tier = QUALITY_TIERS[0];
  for (const t of QUALITY_TIERS) if (score >= t.min) tier = t;
  return tier;
}
