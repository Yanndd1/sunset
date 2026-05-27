# Sunset

A minimalist sunrise & sunset beauty predictor for 12 locations, inspired by
[kathytzhou.com/sunset](https://www.kathytzhou.com/sunset).

**Live:** [sunset.solicare.fr](https://sunset.solicare.fr)

---

## Inspiration

Kathy T. Zhou's [sunset page](https://www.kathytzhou.com/sunset) shows a single
forecast for one location in a famously elegant minimalist UI — a one-word
verdict (*Beau*, *Superbe*…) floating on a full-bleed dusk gradient. This
project keeps that spirit and extends the idea:

- Predicts **both sunrises and sunsets**, not just sunsets
- Covers **12 locations** at once (mostly France, plus Tokyo)
- Lets you switch between cities with a sticky top tab bar (click, swipe,
  or arrow keys)
- Replaces the single quality factor with a **richer 8-factor algorithm**
- Adds **temporal smoothing** (±1 h) and **uncertainty** (standard deviation
  over a ±2 h window — shown as `Beau 65 ± 6`)
- Shows a **4-day outlook** per city with per-event quality bars
- Includes a built-in **`/methode` page** documenting the algorithm in French
- The **background gradient reflects the predicted quality** of the next
  upcoming event — vivid magenta-to-gold for an exceptional sky, flat grey for
  an overcast one

## Tech

- [Next.js 15](https://nextjs.org) (App Router, Server Components, ISR)
- TypeScript + [Vitest](https://vitest.dev) for the scoring algorithm
- [Open-Meteo](https://open-meteo.com) — Forecast API + Air Quality API (CAMS).
  Free, no API key.
- Deployed on [Vercel](https://vercel.com) with a 30-minute Data Cache

No database, no auth, no secrets. Two batched HTTP calls per cold rendering,
mostly served from the cache.

## How the score works

The deterministic score (0–100) is the product of eight factors, each in
roughly `[0, 1.2]`, clamped to `[0, 100]`:

```
score = canvas × lowBlock × clarity × aerosol × precip × structure × front × terrain
```

| Factor       | Idea                                                           | Source                        |
| ------------ | -------------------------------------------------------------- | ----------------------------- |
| `canvas`     | Mid + high clouds catch the low-angle light — bell at ~50 %    | Open-Meteo forecast           |
| `lowBlock`   | Low clouds block the grazing horizon light — multiplicative    | Open-Meteo forecast           |
| `clarity`    | Visibility + humidity → vividness of colour                    | Open-Meteo forecast           |
| `aerosol`    | Moderate aerosols deepen reds; thick haze mutes                | CAMS via Air Quality          |
| `precip`     | Rain probability penalty                                       | Open-Meteo forecast           |
| `structure`  | Cirrus-like (high + dry) bonus, stratus-like (mid + humid) penalty | Derived                  |
| `front`      | Rising 24 h pressure tendency = clearing front                 | Open-Meteo forecast           |
| `terrain`    | Per-location static bonus (line-of-horizon, urban density)     | [`lib/locations.ts`](./lib/locations.ts) |

All weights, exponents and thresholds live in
[`lib/sunsetScore.ts`](./lib/sunsetScore.ts). Tunable in one place.

Full methodology including formulas, smoothing, uncertainty and tier
thresholds is documented in the live app at
[sunset.solicare.fr/methode](https://sunset.solicare.fr/methode) and rendered
from [`app/methode/page.tsx`](./app/methode/page.tsx).

## Locations

Configured in [`lib/locations.ts`](./lib/locations.ts). Each entry carries
latitude, longitude, a short display label, the administrative area and a
multiplicative terrain bonus. Adding a city is a one-entry edit — coordinates
can be looked up via Open-Meteo's geocoding endpoint:

```
https://geocoding-api.open-meteo.com/v1/search?name=Cadarache&country=FR
```

## Development

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # vitest run — covers every scoring factor
npm run build   # next build
```

## Deploy

```bash
vercel deploy --prod
```

ISR (`export const revalidate = 1800`) keeps the data fresh without any cron
job — Vercel re-fetches Open-Meteo every 30 minutes on demand.

## Credits

- **Concept & visual inspiration:**
  [Kathy T. Zhou — *Sunset*](https://www.kathytzhou.com/sunset)
- **Algorithmic ancestry:**
  [Kevin Xu — *Predicting sunsets with the weather*](https://medium.com/shiftcreatorspace/predicting-sunsets-with-the-weather-9612481a9d77),
  [SunsetWx](https://sunsetwx.com)
- **Weather data:** [Open-Meteo](https://open-meteo.com) — Forecast API + CAMS
  Air Quality API

## License

MIT — see [LICENSE](./LICENSE).
