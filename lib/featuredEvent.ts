import type { LocationForecast, ScoredEvent } from "./forecast";

// The most striking upcoming event for a location — the higher-scoring of the
// next sunrise and next sunset. Drives the background palette and the nav dot,
// so a city looks vivid whenever a beautiful sky is on the way.
// Type-only import keeps the data-fetching code out of the client bundle.
export function featuredEvent(lf: LocationForecast): ScoredEvent | undefined {
  const { nextSunrise, nextSunset } = lf;
  if (!nextSunrise) return nextSunset;
  if (!nextSunset) return nextSunrise;
  return nextSunrise.score >= nextSunset.score ? nextSunrise : nextSunset;
}
