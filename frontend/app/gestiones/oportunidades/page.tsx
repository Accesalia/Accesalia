import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { quienSoy } from "../../../lib/sesion";
import { todasLasOpps } from "../../../lib/todasLasOpps";
import { TodasLasOpps } from "./TodasLasOpps";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// TODAS LAS OPPS (Monica, 20-oct-2026): el listado entero, con filtros y
// buscador, y desde aqui mismo cambiar el comercial o el estado. Es de
// direccion. Ver lib/todasLasOpps.ts.

export default async function PaginaTodasLasOpps() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/gestiones/oportunidades");
  if (!yo.veTodo) redirect("/gestiones");
  const { filas, comerciales } = await todasLasOpps();

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1300px] px-4 pb-16 pt-5 sm:px-6">
        <Salida href="/gestiones">← Gestiones de la app</Salida>
        <h1 className="mt-3 border-b border-black/10 pb-4 text-3xl font-bold text-carbon sm:text-4xl">Todas las oportunidades</h1>
        <TodasLasOpps filas={filas} comerciales={comerciales} />
      </main>
    </div>
  );
}
