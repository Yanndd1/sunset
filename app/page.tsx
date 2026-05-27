import { SunsetApp } from "@/components/SunsetApp";
import { getForecasts } from "@/lib/forecast";

export const revalidate = 1800;

export default async function Page() {
  let data;
  try {
    data = await getForecasts();
  } catch {
    return (
      <div className="error">
        <p>
          Prévisions indisponibles pour le moment. Réessayez dans quelques
          minutes.
        </p>
      </div>
    );
  }

  return <SunsetApp forecast={data} />;
}
