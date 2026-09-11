import { TIPO_DOC, type DocRrhh } from "../../lib/rrhhDocumentos";
import { borrarDocumento } from "./accionesDocumentos";

// Lista de documentos de RRHH. "Ver" abre el fichero en el navegador y
// "Bajar" lo descarga con su nombre; los dos pasan por /rrhh/documento/<id>,
// que comprueba quien lo pide. Borrar, solo RRHH y direccion.

const MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mes = (periodo: string) => `${MES[Number(periodo.slice(5, 7)) - 1]} ${periodo.slice(0, 4)}`;
const dia = (ts: string) => new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Madrid" }).format(new Date(ts));

/** Mes anterior al de hoy, YYYY-MM: las nominas se suben a mes vencido. */
export function mesAnterior(hoy: string): string {
  const a = Number(hoy.slice(0, 4));
  const m = Number(hoy.slice(5, 7));
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
}

export function ListaDocumentos({
  docs,
  puedeBorrar,
  volver,
  vacio,
  conTipo = true,
}: {
  docs: DocRrhh[];
  puedeBorrar: boolean;
  volver: string;
  vacio: string;
  conTipo?: boolean;
}) {
  if (docs.length === 0) return <p className="text-sm text-carbon/45">{vacio}</p>;
  return (
    <ul className="divide-y divide-black/5 text-sm">
      {docs.map((d) => (
        <li key={d.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
          <span className="min-w-0">
            <b className="font-semibold text-carbon">
              {conTipo ? TIPO_DOC[d.tipo] : d.titulo}
              {d.tipo === "nomina" && d.periodo && ` · ${mes(d.periodo)}`}
            </b>
            <span className="block truncate text-xs text-carbon/45">
              {conTipo && d.titulo ? `${d.titulo} · ` : ""}subido el {dia(d.creadoEn)}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <a href={`/rrhh/documento/${d.id}`} target="_blank" rel="noopener" className="font-semibold text-lima-dark hover:underline">Ver</a>
            <a href={`/rrhh/documento/${d.id}?bajar=1`} className="text-carbon/55 hover:text-carbon hover:underline">Bajar</a>
            {puedeBorrar && (
              // Con confirmacion: borrar un fichero no se puede deshacer.
              <details className="relative">
                <summary className="cursor-pointer list-none text-xs text-carbon/40 hover:text-alerta [&::-webkit-details-marker]:hidden">Borrar</summary>
                <form action={borrarDocumento} className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-black/10 bg-white p-2.5 text-xs shadow-md">
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="volver" value={volver} />
                  <p className="mb-2 text-carbon/70">Se borra el fichero para siempre.</p>
                  <button type="submit" className="rounded-full bg-alerta px-3 py-1 font-semibold text-white">Sí, borrarlo</button>
                </form>
              </details>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
