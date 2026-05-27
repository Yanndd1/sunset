import type { Metadata } from "next";
import Link from "next/link";
import { LOCATIONS } from "@/lib/locations";
import { QUALITY_TIERS } from "@/lib/sunsetScore";

export const metadata: Metadata = {
  title: "Méthode — Levers & couchers de soleil",
  description:
    "Comment la qualité des levers et couchers de soleil est calculée : sources de données, formule du score, lissage, incertitude et limites.",
};

// A subdued dusk gradient as a static backdrop for the methodology page —
// gives it the same atmosphere as the main app without depending on a
// real-time score.
const METHODE_BG =
  "radial-gradient(140% 95% at 50% 106%, rgba(255,180,116,0.36) 0%, rgba(0,0,0,0) 66%), linear-gradient(180deg, #221737 0%, #3d2553 36%, #6a3a5f 70%, #94606a 100%)";

export default function MethodPage() {
  return (
    <>
      <div className="bg" aria-hidden="true">
        <div className="bg__layer" style={{ background: METHODE_BG }} />
      </div>
      <div className="scrim" aria-hidden="true" />

      <div className="app">
        <nav className="nav" aria-label="Navigation">
          <div className="nav__list">
            <Link href="/" className="tab tab--back">
              <span aria-hidden="true">←</span> Retour aux villes
            </Link>
          </div>
        </nav>

        <div className="stage">
          <main className="screen method">
            <header className="screen__head">
              <p className="screen__kicker">Documentation</p>
              <h1 className="screen__name">Comment ça marche</h1>
              <p className="screen__area">
                Méthodologie complète, sources de données et facteurs pris en
                compte
              </p>
            </header>

            <article className="method__body">
              <section className="method__section">
                <h2>D&apos;où viennent les données</h2>
                <p>
                  Toutes les prévisions sont fournies par{" "}
                  <strong>Open-Meteo</strong>, qui agrège les sorties des
                  modèles météo numériques globaux (ECMWF, GFS, ICON,
                  Météo-France ARPEGE/AROME…) sans clé d&apos;API. Deux
                  endpoints sont interrogés :
                </p>
                <ul>
                  <li>
                    <strong>Forecast API</strong> — couverture nuageuse par
                    altitude (basse, moyenne, haute), visibilité, humidité,
                    pression au niveau de la mer, probabilité de précipitations,
                    horaires de lever et coucher
                  </li>
                  <li>
                    <strong>Air Quality API</strong> — épaisseur optique des
                    aérosols, PM2.5, poussières désertiques (modèle CAMS /
                    Copernicus). Optionnel : si l&apos;appel échoue, le score
                    est calculé sans bonus aérosols
                  </li>
                </ul>
                <p>
                  Un seul appel par endpoint, batché pour les 5 villes. Réponse
                  mise en cache <strong>30 minutes</strong> via Vercel ISR puis
                  revalidée automatiquement.
                </p>
              </section>

              <section className="method__section">
                <h2>La formule du score</h2>
                <p>
                  Pour chaque lever et chaque coucher à venir, le score (entier
                  de 0 à 100) est le produit de huit facteurs multiplicatifs :
                </p>
                <pre className="method__code">
{`score = canvas × lowBlock × clarity × aerosol × precip × structure × front × terrain`}
                </pre>
                <p>
                  Chaque facteur vit à peu près dans <code>[0, 1.2]</code>. Le
                  résultat est écrêté à <code>[0, 100]</code>.
                </p>

                <h3>1. Toile nuageuse · <code>canvas</code></h3>
                <p>
                  Les nuages <strong>moyens</strong> (3–8&nbsp;km) et{" "}
                  <strong>hauts</strong> (cirrus, &gt;8&nbsp;km) captent la
                  lumière rasante et la diffusent — ce sont eux qui peignent le
                  ciel. Trop peu de nuages = ciel plat ; trop = couverture
                  uniforme sans relief.
                </p>
                <pre className="method__code">
{`hm     = (cloud_mid × 1.0 + cloud_high × 0.7) / 100
canvas = max( 1 − |hm − 0.5| / 0.5 ,  0.3 × (1 − hm) )`}
                </pre>
                <p>
                  Courbe en cloche centrée sur 50 % de couverture combinée, avec
                  un plancher <code>0.3 × (1 − hm)</code> pour qu&apos;un ciel
                  parfaitement clair reste un pastel et ne tombe pas à zéro.
                </p>

                <h3>2. Blocage par les nuages bas · <code>lowBlock</code></h3>
                <p>
                  À l&apos;horizon, le soleil rasant doit pouvoir éclairer{" "}
                  <em>par en dessous</em> les nuages moyens et hauts. Un plafond
                  bas bloque cette lumière avant qu&apos;elle ne peigne le ciel.
                </p>
                <pre className="method__code">
{`lowBlock = 1 − (cloud_low / 100)^0.8`}
                </pre>
                <p>
                  <strong>Multiplicatif</strong> : 100 % de nuages bas →{" "}
                  <code>lowBlock = 0</code> → score = 0 quoi qu&apos;il arrive
                  ailleurs. L&apos;exposant 0.8 (sub-linéaire) fait que 5 % de
                  bas ne pénalise quasiment pas, mais 50 % divise déjà le score
                  par deux.
                </p>

                <h3>3. Clarté de l&apos;air · <code>clarity</code></h3>
                <p>
                  Air sec et limpide = teintes vives. Brume, humidité forte =
                  couleurs ternes.
                </p>
                <pre className="method__code">
{`vis     = clamp( visibility / 24000 , 0 , 1 )       // 0 à 24 km
hum     = 1 − clamp( (humidity − 40) / 55 , 0 , 1 )  // 1 si ≤40 %, 0 si ≥95 %
clarity = 0.7 + 0.3 × ( 0.5 × vis + 0.5 × hum )`}
                </pre>
                <p>
                  Plage : <code>[0.7, 1.0]</code>. La clarté peut amplifier ou
                  atténuer mais jamais annuler.
                </p>

                <h3>4. Aérosols · <code>aerosol</code></h3>
                <p>
                  Des aérosols <strong>modérés</strong> (sable saharien, fumée
                  lointaine, brume sèche) <strong>intensifient les rouges</strong>{" "}
                  par diffusion Rayleigh-Mie — c&apos;est ce qui fait les
                  couchers spectaculaires après un coup de vent du Sud. Trop
                  d&apos;aérosols (pollution dense) ternissent au contraire. La
                  cloche a son sommet à <code>AOD ≈ 0.12</code>.
                </p>
                <pre className="method__code">
{`si AOD ≤ 0.12  :  aerosol = 0.94 + (1.16 − 0.94) × (AOD / 0.12)
sinon          :  aerosol = max( 0.62 , 1.16 − (1.16 − 0.62) × (AOD − 0.12) / 0.68 )`}
                </pre>
                <p>
                  Plage : <code>[0.62, 1.16]</code>. Source : modèle CAMS /
                  Copernicus via Open-Meteo Air Quality.
                </p>

                <h3>5. Précipitations · <code>precip</code></h3>
                <p>
                  Pluie en cours = ciel chargé. Pénalité non-linéaire selon la
                  probabilité de précipitations à l&apos;heure de
                  l&apos;événement.
                </p>
                <pre className="method__code">
{`precip = 1 − 0.55 × (probabilité_pluie / 100)^1.2`}
                </pre>
                <p>
                  À 50 % de probabilité → <code>0.76</code>. À 100 % →{" "}
                  <code>0.45</code>.
                </p>

                <h3>6. Structure nuageuse · <code>structure</code></h3>
                <p>
                  Distinction qualitative entre <strong>cirrus</strong>{" "}
                  (haut + air sec = texturé et lumineux, comme un voile peint)
                  et <strong>stratus</strong> (mid + air humide = plat et
                  uniforme).
                </p>
                <pre className="method__code">
{`si cloud_high > 30 % et humidité < 60 % :
    bonus    += 0.10 × ((cloud_high − 30) / 40)
si cloud_mid > 60 % et humidité > 75 % :
    pénalité += 0.10 × ((cloud_mid − 60) / 30)
structure = 1 + bonus − pénalité`}
                </pre>
                <p>
                  Plage approximative : <code>[0.90, 1.10]</code>.
                </p>

                <h3>7. Passage de front · <code>front</code></h3>
                <p>
                  Une pression qui remonte fortement après une dépression
                  annonce souvent un ciel spectaculaire : résidus de nuages,
                  lumière qui revient. Calculé comme la{" "}
                  <strong>
                    différence de pression au sol entre l&apos;événement et 24 h
                    avant
                  </strong>
                  .
                </p>
                <pre className="method__code">
{`si Δp (24 h) ≤ 3 hPa  :  front = 1.0
sinon                 :  front = min( 1.08 , 1 + (Δp − 3) / 60 )`}
                </pre>
                <p>
                  Plage : <code>[1.0, 1.08]</code>. Effet modeste, conçu comme
                  un bonus.
                </p>

                <h3>8. Bonus géographique · <code>terrain</code></h3>
                <p>
                  Multiplicateur statique par lieu reflétant la ligne
                  d&apos;horizon — à météo strictement égale, un site bien
                  dégagé voit beaucoup plus de ciel qu&apos;un site enclavé.
                </p>
                <table className="method__table">
                  <thead>
                    <tr>
                      <th>Lieu</th>
                      <th>Facteur</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LOCATIONS.map((l) => (
                      <tr key={l.id}>
                        <td>{l.name}</td>
                        <td>
                          <code>{l.terrainFactor.toFixed(2)}</code>
                        </td>
                        <td>{l.terrainNote}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className="method__section">
                <h2>Lissage temporel</h2>
                <p>
                  Un golden hour dure environ 30 minutes, pas une seconde. Pour
                  éviter qu&apos;un voile bas passager fasse osciller
                  violemment le score, les variables météo sont{" "}
                  <strong>moyennées sur ±1 h</strong> autour de l&apos;événement
                  (T−1, T, T+1) avant d&apos;entrer dans la formule.
                </p>
                <p>
                  Effet pratique : un score qui changeait toutes les demi-heures
                  parce qu&apos;un nuage passait à T+30 reste désormais stable
                  si la situation globale autour de l&apos;heure dorée est
                  similaire.
                </p>
              </section>

              <section className="method__section">
                <h2>Incertitude affichée</h2>
                <p>
                  On calcule en plus le score à <strong>chaque heure dans une
                  fenêtre ±2 h</strong> (T−2 à T+2), puis l&apos;écart-type de
                  ces cinq scores. Plus la météo change vite autour de
                  l&apos;événement, plus l&apos;incertitude est élevée — et
                  c&apos;est ce <code>±</code> qui s&apos;affiche à côté du
                  score.
                </p>
                <p>
                  Un score « <strong>Beau 64 ± 12</strong> » assume que la
                  prévision pourrait basculer entre Correct et Superbe selon le
                  timing exact d&apos;un voile nuageux. Un score{" "}
                  « <strong>Superbe 78 ± 2</strong> » est en revanche très
                  fiable.
                </p>
              </section>

              <section className="method__section">
                <h2>Niveaux de qualité</h2>
                <p>
                  Seuils ajustés sur la distribution attendue des scores réels.
                  Les couleurs reprennent celles du dégradé de fond.
                </p>
                <table className="method__table">
                  <thead>
                    <tr>
                      <th>Score</th>
                      <th>Libellé</th>
                      <th>Teinte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {QUALITY_TIERS.map((t, i) => {
                      const next = QUALITY_TIERS[i + 1];
                      const range = next
                        ? `${t.min}–${next.min - 1}`
                        : `${t.min}–100`;
                      return (
                        <tr key={t.label}>
                          <td>
                            <code>{range}</code>
                          </td>
                          <td>{t.label}</td>
                          <td>
                            <span
                              className="method__swatch"
                              style={{ background: t.color }}
                              aria-hidden="true"
                            />
                            <code>{t.color}</code>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p>
                  Le fond d&apos;écran reflète le tier du{" "}
                  <strong>meilleur</strong> des deux prochains événements
                  (lever ou coucher), pour que la ville s&apos;illumine dès
                  qu&apos;un beau ciel arrive — pas seulement le prochain
                  créneau.
                </p>
              </section>

              <section className="method__section">
                <h2>Limites et marges de progression</h2>
                <ul>
                  <li>
                    Les <strong>nuages bas</strong> sont la variable la plus mal
                    prédite à 3–4 jours, et c&apos;est aussi celle qui peut
                    faire passer un Superbe à Médiocre. L&apos;incertitude se
                    réduit beaucoup à H−12.
                  </li>
                  <li>
                    Pas de <strong>calibration empirique</strong> : tous les
                    coefficients sont des choix heuristiques. Un jeu
                    d&apos;observations réelles (photos + notes) permettrait
                    d&apos;ajuster les poids par régression.
                  </li>
                  <li>
                    Pas d&apos;<strong>imagerie satellite temps-réel</strong>.
                    Utile seulement pour la dernière heure avant
                    l&apos;événement — peu pertinent pour planifier à plusieurs
                    jours.
                  </li>
                  <li>
                    L&apos;humidité est mesurée <strong>à 2 m seulement</strong>.
                    L&apos;humidité en altitude serait plus pertinente pour
                    distinguer cirrus et stratus, mais Open-Meteo ne l&apos;
                    expose pas directement dans la Forecast API.
                  </li>
                  <li>
                    Le <strong>vent à l&apos;horizon</strong> (vers où poussent
                    les nuages) pourrait affiner la prédiction — variable
                    présente dans Open-Meteo, à intégrer dans une prochaine
                    version.
                  </li>
                </ul>
              </section>

              <section className="method__section">
                <h2>Code source</h2>
                <p>
                  Le score est entièrement déterministe et tient dans{" "}
                  <code>lib/sunsetScore.ts</code>. Tous les seuils, exposants et
                  coefficients y sont centralisés pour faciliter le réglage —
                  un changement, un rechargement, et les 40 prochains
                  événements sont re-notés.
                </p>
              </section>
            </article>
          </main>
        </div>
      </div>
    </>
  );
}
