import Link from "next/link";
import type { LocationForecast } from "@/lib/forecast";
import { featuredEvent } from "@/lib/featuredEvent";

export function CityNav({
  cities,
  selected,
  onSelect,
}: {
  cities: LocationForecast[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  return (
    <nav className="nav" aria-label="Navigation">
      <div className="nav__list">
        {cities.map((city, i) => {
          const event = featuredEvent(city);
          const active = i === selected;
          return (
            <button
              key={city.location.id}
              type="button"
              className={active ? "tab tab--active" : "tab"}
              aria-current={active ? "true" : undefined}
              onClick={() => onSelect(i)}
            >
              <span
                className="tab__dot"
                style={{
                  background: event?.tierColor ?? "rgba(253,243,231,0.4)",
                }}
              />
              {city.location.short}
            </button>
          );
        })}
        <Link
          href="/methode"
          className="tab tab--meta"
          aria-label="Comment ça marche"
        >
          <span className="tab__dot tab__dot--meta" aria-hidden="true">
            ?
          </span>
          Méthode
        </Link>
      </div>
    </nav>
  );
}
