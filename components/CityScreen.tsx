import type { CSSProperties } from "react";
import type {
  LocationForecast,
  OutlookDay,
  OutlookSlot,
  ScoredEvent,
} from "@/lib/forecast";

const KIND_LABEL: Record<ScoredEvent["kind"], string> = {
  sunrise: "Prochain lever",
  sunset: "Prochain coucher",
};

function EventPanel({
  kind,
  event,
}: {
  kind: ScoredEvent["kind"];
  event?: ScoredEvent;
}) {
  if (!event) {
    return (
      <div className="panel panel--empty">
        <span className="panel__kind">{KIND_LABEL[kind]}</span>
        <p className="panel__none">Aucune donnée disponible</p>
      </div>
    );
  }
  return (
    <div className="panel" style={{ "--tier": event.tierColor } as CSSProperties}>
      <div className="panel__top">
        <span className="panel__kind">{KIND_LABEL[kind]}</span>
        <span className="panel__time">
          {event.dayLabel} · {event.timeLabel}
        </span>
      </div>
      <div className="panel__verdict">
        <span className="panel__label">{event.tierLabel}</span>
        <span className="panel__score">
          {event.score}
          {event.uncertainty >= 2 && (
            <span
              className="panel__pm"
              aria-label={`incertitude plus ou moins ${event.uncertainty}`}
            >
              &nbsp;± {event.uncertainty}
            </span>
          )}
          <span className="panel__max"> / 100</span>
        </span>
      </div>
      <div className="meter" aria-hidden="true">
        <div
          className="meter__fill"
          style={{ width: `${event.score}%`, background: event.tierColor }}
        />
      </div>
      <p className="panel__summary">{event.summary}</p>
    </div>
  );
}

function OutlookRow({ label, slot }: { label: string; slot?: OutlookSlot }) {
  return (
    <div className="orow">
      <span className="orow__label">{label}</span>
      <span className="orow__bar" aria-hidden="true">
        {slot && (
          <span
            className="orow__fill"
            style={{ width: `${slot.score}%`, background: slot.tierColor }}
          />
        )}
      </span>
      <span
        className="orow__score"
        style={slot ? { color: slot.tierColor } : undefined}
      >
        {slot ? slot.score : "—"}
      </span>
    </div>
  );
}

function OutlookCard({ day }: { day: OutlookDay }) {
  return (
    <div className="ocard">
      <span className="ocard__date">{day.dayLabel}</span>
      <OutlookRow label="Lever" slot={day.sunrise} />
      <OutlookRow label="Coucher" slot={day.sunset} />
    </div>
  );
}

export function CityScreen({
  forecast,
  generatedAt,
}: {
  forecast: LocationForecast;
  generatedAt: string;
}) {
  const { location, nextSunrise, nextSunset, outlook } = forecast;
  return (
    <main className="screen">
      <header className="screen__head">
        <p className="screen__kicker">Levers &amp; couchers de soleil</p>
        <h1 className="screen__name">{location.name}</h1>
        <p className="screen__area">{location.area}</p>
      </header>

      <div className="events">
        <EventPanel kind="sunrise" event={nextSunrise} />
        <EventPanel kind="sunset" event={nextSunset} />
      </div>

      {outlook.length > 0 && (
        <section className="outlook">
          <h2 className="outlook__title">
            Perspective sur {outlook.length} jours
          </h2>
          <div className="outlook__grid">
            {outlook.map((day) => (
              <OutlookCard key={day.dateKey} day={day} />
            ))}
          </div>
        </section>
      )}

      <footer className="foot">
        <p className="foot__line">
          Score 0–100 d’après la couverture nuageuse par altitude, la visibilité
          et l’humidité. Nuages moyens et hauts = couleurs ; nuages bas =
          lumière rasante bloquée ; air sec et limpide = teintes vives.
        </p>
        <p className="foot__meta">
          Données Open-Meteo · actualisé toutes les 30 min · {generatedAt}
        </p>
      </footer>
    </main>
  );
}
