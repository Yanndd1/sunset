import { LOCATIONS } from "./locations";

export type OpenMeteoForecast = {
  latitude: number;
  longitude: number;
  utc_offset_seconds: number;
  timezone: string;
  hourly: {
    time: string[];
    cloud_cover: number[];
    cloud_cover_low: number[];
    cloud_cover_mid: number[];
    cloud_cover_high: number[];
    visibility: number[];
    relative_humidity_2m: number[];
    precipitation_probability: number[];
    pressure_msl: number[];
  };
  daily: {
    time: string[];
    sunrise: string[];
    sunset: string[];
  };
};

export type OpenMeteoAir = {
  latitude: number;
  longitude: number;
  hourly: {
    time: string[];
    aerosol_optical_depth: number[];
    pm2_5: number[];
    dust: number[];
  };
};

const FORECAST_DAYS = 5;
// past_days=1 lets us compute the 24-hour pressure tendency for the earliest
// upcoming events.
const FORECAST_PAST = 1;

const FORECAST_HOURLY = [
  "cloud_cover",
  "cloud_cover_low",
  "cloud_cover_mid",
  "cloud_cover_high",
  "visibility",
  "relative_humidity_2m",
  "precipitation_probability",
  "pressure_msl",
].join(",");

const AIR_HOURLY = ["aerosol_optical_depth", "pm2_5", "dust"].join(",");

function csv(values: number[]): string {
  return values.join(",");
}

// One batched request for all locations (comma-separated coordinates).
export async function fetchForecasts(): Promise<OpenMeteoForecast[]> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", csv(LOCATIONS.map((l) => l.latitude)));
  url.searchParams.set("longitude", csv(LOCATIONS.map((l) => l.longitude)));
  url.searchParams.set("hourly", FORECAST_HOURLY);
  url.searchParams.set("daily", "sunrise,sunset");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", String(FORECAST_DAYS));
  url.searchParams.set("past_days", String(FORECAST_PAST));

  const res = await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) {
    throw new Error(`Open-Meteo forecast a répondu ${res.status}`);
  }
  const data = (await res.json()) as OpenMeteoForecast | OpenMeteoForecast[];
  const list = Array.isArray(data) ? data : [data];
  if (list.length !== LOCATIONS.length) {
    throw new Error("Réponse Open-Meteo forecast inattendue (nombre de lieux)");
  }
  return list;
}

// Air quality (CAMS via Open-Meteo). Optional — if it fails, the score uses
// a neutral aerosol factor of 1.0.
export async function fetchAirQuality(): Promise<OpenMeteoAir[]> {
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.searchParams.set("latitude", csv(LOCATIONS.map((l) => l.latitude)));
  url.searchParams.set("longitude", csv(LOCATIONS.map((l) => l.longitude)));
  url.searchParams.set("hourly", AIR_HOURLY);
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", String(FORECAST_DAYS));

  const res = await fetch(url, { next: { revalidate: 1800 } });
  if (!res.ok) {
    throw new Error(`Open-Meteo air a répondu ${res.status}`);
  }
  const data = (await res.json()) as OpenMeteoAir | OpenMeteoAir[];
  const list = Array.isArray(data) ? data : [data];
  if (list.length !== LOCATIONS.length) {
    throw new Error("Réponse Open-Meteo air inattendue (nombre de lieux)");
  }
  return list;
}
