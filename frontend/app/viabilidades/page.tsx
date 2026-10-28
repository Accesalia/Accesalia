import { descartados, pendientesDeRevisar } from "../../lib/revisionPolycam";
import { porHacer, yaFuera } from "../../lib/mesaViabilidades";
import { solicitudesPendientes } from "../../lib/solicitudViabilidad";
import { haceViabilidades } from "./revision-polycam/acciones";
import { Mesa } from "./Mesa";

export const dynamic = "force-dynamic";

// MESA DE VIABILIDADES: la carga de datos. Lo que se ve, y por que, en Mesa.tsx.

export default async function MesaDeViabilidades({ searchParams }: { searchParams: Promise<{ enviada?: string; ver?: string }> }) {
  const yo = await haceViabilidades();
  const { enviada, ver } = await searchParams;
  const [sinVincular, todas, pedidas, fuera, salidas] = await Promise.all([pendientesDeRevisar(), porHacer(), solicitudesPendientes(), descartados(), yaFuera()]);
  const resuelveDaniel = yo.veTodo || yo.funciones.some((f) => f.clave === "responsable_tecnico");
  return <Mesa pedidas={pedidas} todas={todas} sinVincular={sinVincular} descartados={fuera} salidas={salidas} ver={ver} enviada={!!enviada} resuelveDaniel={resuelveDaniel} />;
}

