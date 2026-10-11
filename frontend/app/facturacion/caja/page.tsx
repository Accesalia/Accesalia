import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Volver } from "../../components/Volver";
import { quienSoy } from "../../../lib/sesion";
import { datosCaja, puedeVerCobros } from "../../../lib/cobros";
import { Cronograma } from "./Cronograma";

export const dynamic = "force-dynamic";

// CRONOGRAMA Y PREVISION DE CAJA · la semilla (Monica, 11-oct-2026). Junta todo
// lo que consume tiempo de tecnico (proyectos y requerimientos), se arrastra
// arriba o abajo, se asigna el tecnico, y una linea de corte en la fecha que se
// elija dice cuanto se habra cobrado. Las duraciones son las de por defecto y
// se cambian aqui; cuando esten las tablas de proyecto, saldran de alli.

export default async function PaginaCaja() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion/caja");
  if (!puedeVerCobros(yo)) redirect("/menu");
  const d = await datosCaja();
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1700px] px-4 pb-16 pt-5 text-sm sm:px-6">
        <Volver siNoHay="/facturacion" />
        <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-black/10 pb-4">
          <h1 className="text-3xl font-bold leading-tight text-carbon">Cronograma y previsión de caja</h1>
          <span
            className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-carbon/60"
            title="Las duraciones son las de por defecto y lo que se cambia aquí no se guarda todavía: se enganchará a las tablas de proyecto y requerimientos."
          >
            Semilla · no se guarda
          </span>
        </div>
        <Cronograma d={d} />
      </main>
    </div>
  );
}
