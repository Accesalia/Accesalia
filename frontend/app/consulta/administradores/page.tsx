import Link from "next/link";
import { redirect } from "next/navigation";
import { quienSoy } from "../../../lib/sesion";
import { comercialesConsulta, listadoAdministradores, type FilaAdmin } from "../../../lib/consulta";
import { CAJA, ENLACE, FiltroComercial, Marco, fechaCorta } from "../Marco";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// EL LISTADO DE ADMINISTRADORES, DE UN VISTAZO (Monica, 7-oct-2026): nombre de
// la empresa, cuantas oportunidades han generado y la fecha del ultimo
// contacto. Por comercial o todos. Se ordena pinchando la cabecera.
//
// Su ficha esta por rehacer (Monica la revisa en Figma): mientras, pinchar un
// administrador lleva a SUS oportunidades.

const ORDEN: Record<string, (a: FilaAdmin, b: FilaAdmin) => number> = {
  nombre: (a, b) => a.nombre.localeCompare(b.nombre, "es"),
  opps: (a, b) => b.opps - a.opps || a.nombre.localeCompare(b.nombre, "es"),
  contacto: (a, b) => (b.ultimoContacto ?? "").localeCompare(a.ultimoContacto ?? "") || a.nombre.localeCompare(b.nombre, "es"),
};

export default async function ListadoAdministradores({ searchParams }: { searchParams: Promise<{ c?: string; orden?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/consulta/administradores");
  const { c, orden } = await searchParams;
  const [filas, comerciales] = await Promise.all([listadoAdministradores(), comercialesConsulta()]);

  const por = ORDEN[orden ?? ""] ? orden! : "nombre";
  const lista = (c ? filas.filter((f) => f.comerciales.includes(c)) : filas).sort(ORDEN[por]);
  const cuenta = (id: string | null) => (id ? filas.filter((f) => f.comerciales.includes(id)).length : filas.length);
  const cabecera = (clave: string, texto: string, derecha = false) => (
    <th className={"border-b border-[#d9d9d9] px-3 py-2 font-bold " + (derecha ? "text-right" : "")}>
      <Link
        href={`/consulta/administradores?${[c ? `c=${c}` : "", clave === "nombre" ? "" : `orden=${clave}`].filter(Boolean).join("&")}`}
        className={por === clave ? "text-carbon" : "hover:text-carbon"}
      >
        {texto}
        {por === clave ? " ▾" : ""}
      </Link>
    </th>
  );

  return (
    <Marco aqui="/consulta/administradores">
      <FiltroComercial base="/consulta/administradores" comerciales={comerciales} elegido={c ?? null} cuenta={cuenta} extra={por !== "nombre" ? `orden=${por}` : ""} />

      <section className={CAJA + " mt-3 overflow-hidden"}>
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 bg-[#f4f4f1]">
            <tr className="text-left text-[10px] uppercase tracking-[0.07em] text-[#6e6e6e]">
              {cabecera("nombre", `Administración · ${lista.length}`)}
              {cabecera("opps", "Oportunidades generadas", true)}
              {cabecera("contacto", "Último contacto", true)}
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-carbon/60">
                  No hay ninguna.
                </td>
              </tr>
            )}
            {lista.map((f) => (
              <tr key={f.id} className="odd:bg-white even:bg-[#fafaf8] hover:bg-[#f1f5ee]">
                <td className="border-b border-[#f0f0f0] px-3 py-1.5">
                  {f.opps > 0 ? (
                    <Link href={`/consulta/oportunidades?admin=${f.id}`} className={ENLACE} title="Ver sus oportunidades">
                      {f.nombre}
                    </Link>
                  ) : (
                    <span className="font-semibold text-carbon/80">{f.nombre}</span>
                  )}
                </td>
                <td className="border-b border-[#f0f0f0] px-3 py-1.5 text-right tabular-nums">
                  {f.opps === 0 ? (
                    <span className="text-[#8a8a8a]">0</span>
                  ) : (
                    <>
                      <b>{f.opps}</b>
                      {f.vivas > 0 && <span className="ml-1.5 text-[11px] text-[#6e6e6e]">({f.vivas} vivas)</span>}
                    </>
                  )}
                </td>
                <td className="border-b border-[#f0f0f0] px-3 py-1.5 text-right tabular-nums text-carbon/80">{fechaCorta(f.ultimoContacto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Marco>
  );
}
