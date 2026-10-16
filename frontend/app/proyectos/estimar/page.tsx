import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { quienSoy } from "../../../lib/sesion";
import { datosProyectos, puedeEstimar } from "../../../lib/trabajosTecnico";
import { Estimar } from "./Estimar";

export const dynamic = "force-dynamic";

// PROYECTOS POR ESTIMAR (Monica, 16-oct-2026): la bandeja de Alex (funcion
// estimacion_proyectos), paso previo a asignar. Ver Estimar.tsx y lib/trabajosTecnico.ts.

const frase = (t: string | null) => (t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : "");

export default async function PaginaEstimar() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/proyectos/estimar");
  if (!puedeEstimar(yo)) redirect("/menu");
  const d = await datosProyectos();
  const deOpp = new Map(d.asignar.aProyectos.map((t) => [t.oppId, t]));
  const filas = d.porEstimar.map((p) => {
    const t = deOpp.get(p.oppId);
    return { oppId: p.oppId, direccion: p.direccion, que: [t?.hoja, frase(t?.bloque ?? null)].filter(Boolean).join(" · "), obras: p.obras, calculados: p.diasCalculados };
  });
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1300px] px-4 pb-16 pt-5 text-sm sm:px-6">
        <Salida href="/menu">← Menú</Salida>
        <div className="mb-[22px] mt-3">
          <h1 className="text-[30px] font-[750] leading-[1.1] tracking-[-.5px] text-carbon">Proyectos por estimar</h1>
          <div className="mt-1.5 text-[14.5px] text-carbon/65">
            Con la nube lista o sin nube. Marca la dificultad y los días (vienen los del tipo), y dale OK: pasa a Asignar.
          </div>
        </div>
        <Estimar filas={filas} />
      </main>
    </div>
  );
}
