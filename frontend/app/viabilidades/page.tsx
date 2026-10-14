import { pendientesDeRevisar } from "../../lib/revisionPolycam";
import { porHacer } from "../../lib/mesaViabilidades";
import { haceViabilidades } from "./revision-polycam/acciones";
import { Mesa } from "./Mesa";

export const dynamic = "force-dynamic";

// MESA DE VIABILIDADES: la carga de datos. Lo que se ve, y por que, en Mesa.tsx.

export default async function MesaDeViabilidades({ searchParams }: { searchParams: Promise<{ enviada?: string; ver?: string }> }) {
  const yo = await haceViabilidades();
  const { enviada, ver } = await searchParams;
  const [sinVincular, todas] = await Promise.all([pendientesDeRevisar(), porHacer()]);
  const resuelveDaniel = yo.veTodo || yo.funciones.some((f) => f.clave === "responsable_tecnico");
  return <Mesa todas={todas} sinVincular={sinVincular} ver={ver} enviada={!!enviada} resuelveDaniel={resuelveDaniel} />;
}

