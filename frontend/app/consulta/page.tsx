import Link from "next/link";
import { redirect } from "next/navigation";
import { quienSoy } from "../../lib/sesion";
import { buscar, listasBuscador, type QueBuscar } from "../../lib/consulta";
import { BuscadorVivo } from "./BuscadorVivo";
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
  const que: QueBuscar = sp.que === "admin" || sp.que === "contrata" ? sp.que : "direccion";
  // 12-oct-2026: el desplegable filtra al escribir; "Buscar" saca la lista entera.
  const [resultados, listas] = await Promise.all([q ? buscar(q, que) : Promise.resolve([]), listasBuscador()]);

  return (
    <Marco aqui="/consulta">
      <div className={CAJA + " p-4"}>
        <BuscadorVivo listas={listas} que={que} q={q} />
      </div>

      {q && (
        <section className={CAJA + " mt-3 p-4"}>
          <div className={ROT}>
            {resultados.length === 0 ? "Nada con eso" : `${resultados.length === 60 ? "Las 60 primeras" : resultados.length}`} ·{" "}
            {que === "admin" ? "administraciones" : que === "contrata" ? "contratas" : "comunidades"} con «{q}»
          </div>
          {resultados.length === 0 && que === "direccion" && (
            <p className="mt-2 text-[13px] text-carbon/65">Prueba con menos palabras: solo la calle, o la calle y el número.</p>
          )}
          <ul className="mt-2 divide-y divide-[#f0f0f0]">
            {resultados.map((r) => (
              <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 py-1.5 text-[14px]">
                {r.tipo === "contrata" ? (
                  // La ficha de la contrata aun no existe.
                  <span className="font-semibold text-carbon">{r.nombre}</span>
                ) : (
                  <Link href={r.tipo === "comunidad" ? `/administracion/comunidades/${r.id}` : `/consulta/oportunidades?admin=${r.id}`} className={ENLACE}>
                    {r.nombre}
                  </Link>
                )}
                {r.detalle && <span className="text-[12px] text-[#6e6e6e]">{r.detalle}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </Marco>
  );
}
