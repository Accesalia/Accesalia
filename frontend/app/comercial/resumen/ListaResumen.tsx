import Link from "next/link";
import { SECCIONES, type FilaResumen } from "../../../lib/resumenComercial";
import { Grabar } from "./Grabar";

// La lista del resumen, por secciones. Aparte de la pagina para poder mirarla
// renderizada con datos de verdad sin entrar con usuario.
export function ListaResumen({ filas }: { filas: FilaResumen[] }) {
  return (
    <>
        {SECCIONES.map((s) => {
        const lista = filas.filter((f) => f.seccion === s.clave);
        const enAlerta = lista.filter((f) => f.alerta).length;
        return (
          <section key={s.clave} className="mt-7">
            <h2 className="flex items-baseline gap-3 border-b border-carbon/15 pb-1.5 text-[17px] font-bold text-carbon">
              {s.titulo}
              <span className="text-[13px] font-normal text-carbon/55">
                {lista.length}
                {enAlerta > 0 && <b className="ml-1.5 font-semibold text-alerta">· {enAlerta} en alerta</b>}
              </span>
            </h2>
            {lista.length === 0 ? (
              <p className="py-2 text-[13px] text-carbon/45">Ninguna.</p>
            ) : (
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
            )}
          </section>
        );
      })}
    </>
  );
}
