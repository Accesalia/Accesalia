import Link from "next/link";
import { SECCIONES, type FilaResumen } from "../../../lib/resumenComercial";
import { Grabar } from "./Grabar";

// LA LISTA DEL RESUMEN (Monica, 14-oct-2026). Dos bloques, con las mismas fases:
//   ALERTAS: SE PASAN LOS PLAZOS - "falta mover esto con urgencia"
//   COMO VAN LAS DEMAS - en plazo
// Aparte de la pagina para poder mirarla renderizada con datos de verdad.

const ddmmaa = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`;

export function ListaResumen({ filas }: { filas: FilaResumen[] }) {
  return (
    <>
      <Bloque titulo="Alertas: se pasan los plazos" sub="Falta mover esto con urgencia" filas={filas.filter((f) => f.alerta)} rojo />
      <Bloque titulo="Cómo van las demás" sub="En plazo" filas={filas.filter((f) => !f.alerta)} />
    </>
  );
}

function Bloque({ titulo, sub, filas, rojo }: { titulo: string; sub: string; filas: FilaResumen[]; rojo?: boolean }) {
  return (
    <div className="mt-8">
      <h2 className={"text-[22px] font-bold uppercase tracking-wide " + (rojo ? "text-alerta" : "text-carbon")}>
        {titulo} <span className="text-[15px] font-normal normal-case tracking-normal text-carbon/55">· {filas.length}</span>
      </h2>
      <p className="text-[13.5px] text-carbon/60">{sub}</p>
      {SECCIONES.map((s) => {
        const lista = filas.filter((f) => f.seccion === s.clave);
        if (!lista.length) return null;
        return (
          <section key={s.clave} className="mt-5">
            <h3 className="flex items-baseline gap-3 border-b border-carbon/15 pb-1.5 text-[16px] font-bold text-carbon">
              {s.titulo}
              <span className="text-[13px] font-normal text-carbon/55">{lista.length}</span>
            </h3>
            <ul className="divide-y divide-black/5">
              {lista.map((f) => (
                <li
                  key={f.id}
                  className={
                    "grid gap-x-4 gap-y-1 py-2 pl-2 text-[13.5px] md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)_minmax(0,1.3fr)_minmax(140px,0.6fr)] " +
                    (f.alerta ? "border-l-[3px] border-l-alerta bg-alerta/[0.04]" : "border-l-[3px] border-l-transparent")
                  }
                >
                  <div className="min-w-0">
                    <Link href={`/comercial/oportunidades/${f.id}`} className="font-semibold text-carbon hover:underline">
                      {f.nombre}
                    </Link>
                    {f.alerta && <div className="text-[11.5px] font-semibold text-alerta">{f.alerta}</div>}
                  </div>
                  <div className="min-w-0 text-carbon/80">{f.pasa}</div>
                  <div className="min-w-0 text-carbon/75">
                    {f.llamar.length === 0 ? (
                      <span className="text-carbon/40">— nadie apuntado</span>
                    ) : (
                      f.llamar.map((l, i) => (
                        <div key={i} className={i ? "text-[12px] text-carbon/55" : ""}>
                          <span className="text-carbon/50">{l.papel}: </span>
                          {l.quien}
                          {l.telefono && (
                            <a href={`tel:${l.telefono.split("/")[0].replace(/\s/g, "")}`} className="ml-1.5 whitespace-nowrap tabular-nums font-semibold text-carbon hover:underline">
                              {l.telefono}
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <div>
                    <Grabar oppId={f.id} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** LA LISTA SIN MAS (Monica, 14-oct-2026): "solo las opps que existen para ti,
 *  comercial. Basico: opp - admin - fase - ultimo contacto". */
export function ListaSimple({ filas }: { filas: FilaResumen[] }) {
  const fase = new Map(SECCIONES.map((s) => [s.clave, s.titulo]));
  const orden = [...filas].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return (
    <table className="mt-6 w-full text-left text-[13.5px]">
      <thead>
        <tr className="border-b border-carbon/20 text-[12px] uppercase tracking-wide text-carbon/55">
          <th className="py-1.5 pr-4 font-semibold">Opp</th>
          <th className="py-1.5 pr-4 font-semibold">Administración</th>
          <th className="py-1.5 pr-4 font-semibold">Fase</th>
          <th className="py-1.5 font-semibold">Último contacto</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-black/5">
        {orden.map((f) => {
          const adm = f.llamar.find((l) => l.papel === "administración");
          return (
            <tr key={f.id}>
              <td className="py-1.5 pr-4">
                <Link href={`/comercial/oportunidades/${f.id}`} className="font-semibold text-carbon hover:underline">
                  {f.nombre}
                </Link>
              </td>
              <td className="py-1.5 pr-4 text-carbon/75">{adm?.quien ?? <span className="text-carbon/35">—</span>}</td>
              <td className={"py-1.5 pr-4 " + (f.alerta ? "font-semibold text-alerta" : "text-carbon/75")}>{fase.get(f.seccion)}</td>
              <td className="py-1.5 tabular-nums text-carbon/75">{f.ultima ? ddmmaa(f.ultima) : "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
