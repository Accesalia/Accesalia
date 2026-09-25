import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { listarComunidades } from "../../../lib/administracion";
import { puedeEntrar, quienSoy } from "../../../lib/sesion";

export const dynamic = "force-dynamic";

// CONSULTAR COMUNIDADES. Se busca por el texto de la direccion, que es UN solo
// campo y no lleva el tipo de via: "Mayor 34 Leganes", no "Calle Mayor 34". Por
// eso escribir "mayor" discrimina de verdad (Monica, 25-sep-2026).

export default async function Comunidades({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/administracion/comunidades");
  if (!puedeEntrar(yo, "administracion")) redirect("/menu");

  const { filas } = await listarComunidades(q);

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-5 sm:px-6">
        <Link href="/administracion" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
          ← Área Administración
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-carbon sm:text-4xl">Comunidades de vecinos</h1>
            <p className="mt-1 text-lg text-carbon/60">Busca por la dirección: «mayor 15», «ganapanes», «leganés».</p>
          </div>
          <Link
            href="/administracion/comunidades/nueva"
            className="inline-flex items-center gap-2 rounded-full bg-lima px-5 py-2.5 text-base font-bold text-carbon transition hover:bg-lima-dark hover:text-white"
          >
            + Dar de alta una comunidad
          </Link>
        </div>

        {/* buscador: una sola linea, sin formulario kilometrico */}
        <form className="mt-6 flex flex-wrap gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Escribe parte de la dirección…"
            autoFocus
            className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-base text-carbon outline-none transition focus:border-lima"
          />
          <button type="submit" className="rounded-xl bg-lima px-5 py-2.5 text-base font-bold text-carbon transition hover:bg-lima-dark hover:text-white">
            Buscar
          </button>
          {q && (
            <Link href="/administracion/comunidades" className="rounded-xl border border-black/10 px-4 py-2.5 text-base text-carbon/60 transition hover:border-lima">
              Limpiar
            </Link>
          )}
        </form>

        <p className="mt-3 text-sm text-carbon/50">
          {q.trim().length >= 2
            ? `${filas.length} ${filas.length === 1 ? "comunidad" : "comunidades"} con «${q.trim()}»${filas.length === 60 ? " (se muestran las 60 primeras)" : ""}`
            : "Las 60 primeras por orden alfabético. Escribe para buscar."}
        </p>

        <div className="mt-4 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          {filas.length === 0 ? (
            <p className="px-5 py-10 text-center text-base text-carbon/50">No hay ninguna que coincida.</p>
          ) : (
            <ul className="divide-y divide-black/5">
              {filas.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/administracion/comunidades/${c.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 transition hover:bg-hueso/60"
                  >
                    <span className="min-w-0 flex-1 text-base font-semibold text-carbon">{c.nombre}</span>
                    <span className="shrink-0 text-sm text-carbon/50">
                      {c.administrador ?? <span className="text-amber-700/70">sin administrador</span>}
                    </span>
                    <span className="w-16 shrink-0 text-right text-sm tabular-nums text-carbon/40">{c.cp ?? "—"}</span>
                    <span className="w-24 shrink-0 text-right text-sm">
                      {c.conHojaFirmada ? (
                        <span className="font-semibold text-lima-dark">firmada</span>
                      ) : c.conProyecto ? (
                        <span className="text-carbon/50">con proyecto</span>
                      ) : (
                        <span className="text-carbon/25">—</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
