import { LOCATIONS, type Location } from "./locations";
import {
  fetchAirQuality,
  fetchForecasts,
  type OpenMeteoAir,
  type OpenMeteoForecast,
} from "./openMeteo";
import { scoreSky, tierForScore, type SkyConditions } from "./sunsetScore";

export type EventKind = "sunrise" | "sunset";

export type ScoredEvent = {
  kind: EventKind;
  instantMs: number;
  dateKey: string;
  dayLabel: string;
  timeLabel: string;
  score: number;
  uncertainty: number; // standard deviation of the score across the ±2 h window
  confidence: number; // 0..1 — derived from uncertainty
  tierLabel: string;
  tierColor: string;
  summary: string;
};

export type OutlookSlot = {
  timeLabel: string;
  score: number;
  uncertainty: number;
  tierLabel: string;
  tierColor: string;
};

export type OutlookDay = {
  dateKey: string;
  dayLabel: string;
  sunrise?: OutlookSlot;
  sunset?: OutlookSlot;
};

export type LocationForecast = {
  location: Location;
  nextSunrise?: ScoredEvent;
  nextSunset?: ScoredEvent;
  outlook: OutlookDay[];
};

export type ForecastResult = {
  generatedAt: string;
  locations: LocationForecast[];
  airAvailable: boolean;
};

const OUTLOOK_DAYS = 4;
// ±1 h smoothing for the displayed conditions/score, ±2 h sampling for the
// uncertainty (standard deviation of hourly scores around the event).
const SMOOTH_RADIUS = 1;
const SPREAD_RADIUS = 2;

// ---------- time helpers ----------

// Parse an offset-less local wall-clock ISO as if it were UTC. Used only for
// comparisons within a single location, where the constant offset cancels out.
function wallMs(iso: string): number {
  const withSeconds = iso.length === 16 ? `${iso}:00` : iso;
  return Date.parse(`${withSeconds}Z`);
}

// True UTC instant of a local wall-clock time, given the location's offset.
function instantMs(iso: string, utcOffsetSeconds: number): number {
  return wallMs(iso) - utcOffsetSeconds * 1000;
}

function dayLabel(dateKey: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

function nearestHourIndex(hourMs: number[], targetMs: number): number {
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < hourMs.length; i++) {
    const diff = Math.abs(hourMs[i] - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return best;
}

// ---------- value helpers ----------

function readMean(
  arr: (number | null | undefined)[] | undefined,
  lo: number,
  hi: number,
  fallback: number,
): number {
  if (!arr) return fallback;
  let sum = 0;
  let n = 0;
  for (let i = lo; i <= hi; i++) {
    const v = arr[i];
    if (v != null && Number.isFinite(v)) {
      sum += v;
      n++;
    }
  }
  return n > 0 ? sum / n : fallback;
}

function readMeanOpt(
  arr: (number | null | undefined)[] | undefined,
  lo: number,
  hi: number,
): number | undefined {
  if (!arr) return undefined;
  let sum = 0;
  let n = 0;
  for (let i = lo; i <= hi; i++) {
    const v = arr[i];
    if (v != null && Number.isFinite(v)) {
      sum += v;
      n++;
    }
  }
  return n > 0 ? sum / n : undefined;
}

function summarise(c: SkyConditions): string {
  const parts = [
    `Nuages bas ${Math.round(c.cloudLow)} %`,
    `moyens ${Math.round(c.cloudMid)} %`,
    `hauts ${Math.round(c.cloudHigh)} %`,
  ];
  if (c.precipProb != null && c.precipProb >= 10) {
    parts.push(`pluie ${Math.round(c.precipProb)} %`);
  }
  parts.push(`vis. ${Math.round(c.visibility / 1000)} km`);
  parts.push(`hum. ${Math.round(c.humidity)} %`);
  if (c.aod != null && Number.isFinite(c.aod)) {
    parts.push(`aérosols ${c.aod.toFixed(2)}`);
  }
  return parts.join(" · ");
}

// ---------- orchestration ----------

function buildLocationForecast(
  location: Location,
  forecast: OpenMeteoForecast,
  air: OpenMeteoAir | undefined,
  nowMs: number,
): LocationForecast {
  const h = forecast.hourly;
  if (!h?.time) return { location, outlook: [] };
  const hourMs = h.time.map(wallMs);
  const hLast = h.time.length - 1;

  const airTime = air?.hourly?.time;
  const airMs = airTime ? airTime.map(wallMs) : undefined;
  const aLast = airTime ? airTime.length - 1 : -1;

  const events: ScoredEvent[] = [];
  const days = forecast.daily?.time ?? [];

  for (let d = 0; d < days.length; d++) {
    const pairs: Array<[EventKind, string | undefined]> = [
      ["sunrise", forecast.daily.sunrise?.[d]],
      ["sunset", forecast.daily.sunset?.[d]],
    ];
    for (const [kind, iso] of pairs) {
      if (!iso) continue;
      const inst = instantMs(iso, forecast.utc_offset_seconds);
      if (inst < nowMs) continue;

      const eventWall = wallMs(iso);
      const idx = nearestHourIndex(hourMs, eventWall);
      const sLo = Math.max(0, idx - SMOOTH_RADIUS);
      const sHi = Math.min(hLast, idx + SMOOTH_RADIUS);

      // Pressure tendency: pressure at event - pressure 24 h before.
      const idx24 = nearestHourIndex(hourMs, eventWall - 24 * 3600 * 1000);
      const pNow = h.pressure_msl?.[idx];
      const pOld = h.pressure_msl?.[idx24];
      const pressureDelta24h =
        pNow != null &&
        pOld != null &&
        Number.isFinite(pNow) &&
        Number.isFinite(pOld)
          ? pNow - pOld
          : undefined;

      // Air-quality window aligned with the event.
      let airLo = -1;
      let airHi = -1;
      let airCenter = -1;
      if (airMs && aLast >= 0) {
        airCenter = nearestHourIndex(airMs, eventWall);
        airLo = Math.max(0, airCenter - SMOOTH_RADIUS);
        airHi = Math.min(aLast, airCenter + SMOOTH_RADIUS);
      }

      // Smoothed conditions over the central ±1 h window.
      const conditions: SkyConditions = {
        cloudLow: readMean(h.cloud_cover_low, sLo, sHi, 0),
        cloudMid: readMean(h.cloud_cover_mid, sLo, sHi, 0),
        cloudHigh: readMean(h.cloud_cover_high, sLo, sHi, 0),
        visibility: readMean(h.visibility, sLo, sHi, 24000),
        humidity: readMean(h.relative_humidity_2m, sLo, sHi, 60),
        precipProb: readMean(h.precipitation_probability, sLo, sHi, 0),
        aod:
          airLo >= 0
            ? readMeanOpt(air?.hourly?.aerosol_optical_depth, airLo, airHi)
            : undefined,
        pressureDelta24h,
      };
      const score = scoreSky(conditions, location.terrainFactor);

      // Uncertainty: score at each hour in the ±2 h window, then std dev.
      const samples: number[] = [];
      for (let off = -SPREAD_RADIUS; off <= SPREAD_RADIUS; off++) {
        const i = idx + off;
        if (i < 0 || i > hLast) continue;
        const ai =
          airCenter >= 0
            ? Math.max(0, Math.min(aLast, airCenter + off))
            : -1;
        const cs: SkyConditions = {
          cloudLow: h.cloud_cover_low?.[i] ?? 0,
          cloudMid: h.cloud_cover_mid?.[i] ?? 0,
          cloudHigh: h.cloud_cover_high?.[i] ?? 0,
          visibility: h.visibility?.[i] ?? 24000,
          humidity: h.relative_humidity_2m?.[i] ?? 60,
          precipProb: h.precipitation_probability?.[i] ?? 0,
          aod:
            ai >= 0
              ? air?.hourly?.aerosol_optical_depth?.[ai] ?? undefined
              : undefined,
          pressureDelta24h,
        };
        samples.push(scoreSky(cs, location.terrainFactor));
      }
      let uncertainty = 0;
      if (samples.length > 1) {
        const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
        const variance =
          samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
        uncertainty = Math.sqrt(variance);
      }
      // 0 spread → confidence 1; ~30 spread → confidence ~0.
      const confidence = Math.max(0.4, Math.min(1, 1 - uncertainty / 30));

      const tier = tierForScore(score);
      const dateKey = iso.slice(0, 10);
      events.push({
        kind,
        instantMs: inst,
        dateKey,
        dayLabel: dayLabel(dateKey),
        timeLabel: iso.slice(11, 16),
        score,
        uncertainty: Math.round(uncertainty),
        confidence: Math.round(confidence * 100) / 100,
        tierLabel: tier.label,
        tierColor: tier.color,
        summary: summarise(conditions),
      });
    }
  }

  events.sort((a, b) => a.instantMs - b.instantMs);

  const byDay = new Map<string, OutlookDay>();
  for (const e of events) {
    let day = byDay.get(e.dateKey);
    if (!day) {
      day = { dateKey: e.dateKey, dayLabel: e.dayLabel };
      byDay.set(e.dateKey, day);
    }
    const slot: OutlookSlot = {
      timeLabel: e.timeLabel,
      score: e.score,
      uncertainty: e.uncertainty,
      tierLabel: e.tierLabel,
      tierColor: e.tierColor,
    };
    if (e.kind === "sunrise") day.sunrise = slot;
    else day.sunset = slot;
  }

  return {
    location,
    nextSunrise: events.find((e) => e.kind === "sunrise"),
    nextSunset: events.find((e) => e.kind === "sunset"),
    outlook: [...byDay.values()].slice(0, OUTLOOK_DAYS),
  };
}

export async function getForecasts(): Promise<ForecastResult> {
  const nowMs = Date.now();

  // Air quality is optional — if it fails we still render with a neutral
  // aerosol factor.
  const [forecastSettled, airSettled] = await Promise.allSettled([
    fetchForecasts(),
    fetchAirQuality(),
  ]);
  if (forecastSettled.status !== "fulfilled") {
    throw forecastSettled.reason;
  }
  const forecasts = forecastSettled.value;
  const air = airSettled.status === "fulfilled" ? airSettled.value : undefined;

  const locations = LOCATIONS.map((loc, i) =>
    buildLocationForecast(loc, forecasts[i], air?.[i], nowMs),
  );

  const generatedAt = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(nowMs));

  return { generatedAt, locations, airAvailable: !!air };
}
