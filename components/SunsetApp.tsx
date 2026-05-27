"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ForecastResult } from "@/lib/forecast";
import { featuredEvent } from "@/lib/featuredEvent";
import { paletteFor } from "@/lib/palette";
import { CityNav } from "./CityNav";
import { CityScreen } from "./CityScreen";

type Layer = { id: number; background: string };

export function SunsetApp({ forecast }: { forecast: ForecastResult }) {
  const cities = forecast.locations;
  const [selected, setSelected] = useState(0);

  const current = cities[selected];
  const score = featuredEvent(current)?.score ?? 30;
  const palette = paletteFor(score);

  // Background crossfade: the newest layer fades in over the previous one.
  const layerId = useRef(1);
  const [layers, setLayers] = useState<Layer[]>([
    { id: 0, background: palette.background },
  ]);

  useEffect(() => {
    setLayers((prev) => {
      if (prev[prev.length - 1]?.background === palette.background) return prev;
      return [
        ...prev,
        { id: layerId.current++, background: palette.background },
      ].slice(-2);
    });
  }, [palette.background]);

  const go = useCallback(
    (dir: number) => {
      setSelected((s) => (s + dir + cities.length) % cities.length);
    },
    [cities.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // Swipe between cities (only on the screen area, not the nav).
  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.changedTouches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 55) go(dx < 0 ? 1 : -1);
  };

  return (
    <>
      <div className="bg" aria-hidden="true">
        {layers.map((layer, i) => (
          <div
            key={layer.id}
            className={
              i === layers.length - 1
                ? "bg__layer bg__layer--enter"
                : "bg__layer"
            }
            style={{ background: layer.background }}
          />
        ))}
      </div>
      <div className="scrim" aria-hidden="true" />

      <div className="app">
        <CityNav cities={cities} selected={selected} onSelect={setSelected} />
        <div
          className="stage"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <CityScreen
            key={current.location.id}
            forecast={current}
            generatedAt={forecast.generatedAt}
          />
        </div>
      </div>
    </>
  );
}
