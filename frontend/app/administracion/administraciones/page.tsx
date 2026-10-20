import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { puedeEntrar, quienSoy } from "../../../lib/sesion";
import { listaAdministraciones } from "../../../lib/listaAdministraciones";
import { Lista } from "./Lista";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ADMINISTRACIONES DE FINCAS (Monica, 20-oct-2026): la lista de las que
// existen, por administracion o por gestor, para arreglar y completar. La ficha
// de cada una (con editar) va despues: su maqueta esta a medias. Ver
// lib/listaAdministraciones.ts.

export default async function Administraciones() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/administracion/administraciones");
  if (!puedeEntrar(yo, "administracion")) redirect("/menu");
  const { empresas, gestores, comerciales } = await listaAdministraciones();

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1300px] px-4 pb-16 pt-5 sm:px-6">
        <Salida href="/administracion">← Área Administración</Salida>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3 border-b border-black/10 pb-4">
          <h1 className="text-3xl font-bold text-carbon sm:text-4xl">Administraciones de fincas</h1>
          <Link
            href="/administracion/administraciones/nueva"
            className="rounded-xl bg-lima px-4 py-2 text-sm font-bold text-carbon transition hover:bg-lima-dark hover:text-white"
          >
            + Nuevo administrador
          </Link>
        </div>
        <Lista empresas={empresas} gestores={gestores} comerciales={comerciales} />
      </main>
    </div>
  );
}
