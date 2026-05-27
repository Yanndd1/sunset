export type Location = {
  id: string;
  name: string;
  short: string;
  area: string;
  latitude: number;
  longitude: number;
  // Multiplicative quality bonus reflecting the line of horizon — a plain ≈ 1.0,
  // an exposed hilltop ≈ 1.06, a dense urban setting (obstructed horizon) ≈ 0.97.
  terrainFactor: number;
  terrainNote: string;
};

// Coordinates verified against the Open-Meteo geocoding API. Open-Meteo is
// queried with `timezone=auto`, so each location's sunrise/sunset is reported
// in its own local time.
export const LOCATIONS: Location[] = [
  {
    id: "coudoux",
    name: "Coudoux",
    short: "Coudoux",
    area: "Bouches-du-Rhône (13)",
    latitude: 43.558,
    longitude: 5.24889,
    terrainFactor: 1.02,
    terrainNote: "Plateau provençal, horizon dégagé vers l'ouest et l'est.",
  },
  {
    id: "cadarache",
    name: "Cadarache",
    short: "Cadarache",
    area: "Bouches-du-Rhône (13)",
    latitude: 43.6925,
    longitude: 5.7644,
    terrainFactor: 1.03,
    terrainNote: "Vallée de la Durance, large horizon vers les Préalpes.",
  },
  {
    id: "jonquerettes",
    name: "Jonquerettes",
    short: "Jonquerettes",
    area: "Vaucluse (84)",
    latitude: 43.94655,
    longitude: 4.93286,
    terrainFactor: 1.02,
    terrainNote: "Plaine du Comtat Venaissin, vue dégagée sur 360°.",
  },
  {
    id: "sare",
    name: "Sare",
    short: "Sare",
    area: "Pyrénées-Atlantiques (64)",
    latitude: 43.31267,
    longitude: -1.58023,
    terrainFactor: 1.06,
    terrainNote: "Au pied de la Rhune, vue vers l'Atlantique au coucher.",
  },
  {
    id: "paris",
    name: "Paris",
    short: "Paris",
    area: "Île-de-France (75)",
    latitude: 48.8566,
    longitude: 2.3522,
    terrainFactor: 0.97,
    terrainNote: "Tissu urbain dense, horizon souvent obstrué par les bâtiments.",
  },
  {
    id: "bordeaux",
    name: "Bordeaux",
    short: "Bordeaux",
    area: "Gironde (33)",
    latitude: 44.8378,
    longitude: -0.5792,
    terrainFactor: 0.99,
    terrainNote: "Plaine girondine, fleuve large s'ouvrant vers l'estuaire.",
  },
  {
    id: "lyon",
    name: "Lyon",
    short: "Lyon",
    area: "Rhône (69)",
    latitude: 45.764,
    longitude: 4.8357,
    terrainFactor: 1.0,
    terrainNote:
      "Au confluent du Rhône et de la Saône, colline de Fourvière à l'ouest.",
  },
  {
    id: "marseille",
    name: "Marseille",
    short: "Marseille",
    area: "Bouches-du-Rhône (13)",
    latitude: 43.2965,
    longitude: 5.3698,
    terrainFactor: 1.04,
    terrainNote:
      "Façade méditerranéenne, collines et large horizon marin à l'ouest.",
  },
  {
    id: "nice",
    name: "Nice",
    short: "Nice",
    area: "Alpes-Maritimes (06)",
    latitude: 43.7102,
    longitude: 7.262,
    terrainFactor: 1.05,
    terrainNote:
      "Côte d'Azur, baie des Anges grande ouverte vers le large.",
  },
  {
    id: "rennes",
    name: "Rennes",
    short: "Rennes",
    area: "Ille-et-Vilaine (35)",
    latitude: 48.1173,
    longitude: -1.6778,
    terrainFactor: 0.98,
    terrainNote: "Plaine bretonne, ouvertures vers l'ouest atlantique.",
  },
  {
    id: "strasbourg",
    name: "Strasbourg",
    short: "Strasbourg",
    area: "Bas-Rhin (67)",
    latitude: 48.5734,
    longitude: 7.7521,
    terrainFactor: 0.99,
    terrainNote:
      "Plaine d'Alsace, large vue sur les Vosges au couchant.",
  },
  {
    id: "tokyo",
    name: "Tokyo",
    short: "Tokyo",
    area: "Japon",
    latitude: 35.6762,
    longitude: 139.6503,
    terrainFactor: 0.97,
    terrainNote:
      "Mégapole côtière, baie de Tokyo à l'est, mont Fuji à l'ouest par temps clair.",
  },
];
