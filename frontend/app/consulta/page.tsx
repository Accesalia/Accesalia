import Link from "next/link";
import { redirect } from "next/navigation";
import { quienSoy } from "../../lib/sesion";
import { buscar } from "../../lib/consulta";
import { CAJA, ENLACE, Marco, ROT } from "./Marco";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// EL BUSCADOR (Monica, 7-oct-2026): "arriba un cuadro de busqueda: buscar
// direccion / buscar administrador. La idea es hacer facil la busqueda y la
// navegacion: ahora mismo cuesta entrar y buscar una direccion y ver que
// tiene." Transversal: cualquiera de la casa.
//
// Encuentra por trozos de palabra, sin tildes ni mayusculas. La direccion lleva
// a la ficha de la comunidad; el administrador, a sus oportunidades (su ficha
// esta por rehacer).

export default async function Buscador({ searchParams }: { searchParams: Promise<{ q?: string; que?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/consulta");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const que = sp.que === "admin" ? "admin" : "direccion";
  const resultados = q ? await buscar(q, que) : [];

  return (
    <Marco aqui="/consulta">
      <form action="/consulta" className={CAJA + " flex flex-wrap items-center gap-3 p-4"}>
        <input type="hidden" name="que" value={que} />
        <div className="flex overflow-hidden rounded-lg border border-carbon/30">
          {(
            [
              ["direccion", "Buscar dirección"],
              ["admin", "Buscar administrador"],
            ] as const
          ).map(([v, t]) => (
            <Link
              key={v}
              href={`/consulta?que=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={"px-3.5 py-2 text-[13px] font-semibold " + (que === v ? "bg-carbon text-white" : "bg-white text-carbon/70 hover:text-carbon")}
            >
              {t}
            </Link>
          ))}
        </div>
        <input
          name="q"
          defaultValue={q}
          autoFocus
          placeholder={que === "admin" ? "nombre de la administración" : "calle y número: ronda segovia 5"}
          className="min-w-[280px] flex-1 rounded-lg border border-carbon/40 bg-white px-3.5 py-2 text-[15px] text-carbon outline-none placeholder:text-carbon/55 focus:border-lima"
        />
        <button className="rounded-lg bg-lima px-6 py-2 text-[14px] font-bold text-carbon transition hover:bg-lima-dark hover:text-white">Buscar</button>
      </form>

      {q && (
        <section className={CAJA + " mt-3 p-4"}>
          <div className={ROT}>
            {resultados.length === 0 ? "Nada con eso" : `${resultados.length === 60 ? "Las 60 primeras" : resultados.length}`} ·{" "}
            {que === "admin" ? "administraciones" : "comunidades"} con «{q}»
          </div>
          {resultados.length === 0 && que === "direccion" && (
            <p className="mt-2 text-[13px] text-carbon/65">Prueba con menos palabras: solo la calle, o la calle y el número.</p>
          )}
          <ul className="mt-2 divide-y divide-[#f0f0f0]">
            {resultados.map((r) => (
              <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 py-1.5 text-[14px]">
                <Link href={r.tipo === "comunidad" ? `/administracion/comunidades/${r.id}` : `/consulta/oportunidades?admin=${r.id}`} className={ENLACE}>
                  {r.nombre}
                </Link>
                {r.detalle && <span className="text-[12px] text-[#6e6e6e]">{r.detalle}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </Marco>
  );
}
