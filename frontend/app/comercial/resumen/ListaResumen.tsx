import Link from "next/link";
import { ACCIONES, SECCIONES, type Accion, type FilaResumen } from "../../../lib/resumenComercial";
import { Grabar } from "./Grabar";

// EL RESUMEN SOLO ENSEÑA ALERTAS (Monica, 15-oct-2026): "aqui SOLO las alertas;
// en Opps por fases estan todas". Agrupadas por COMO SE DESBLOQUEAN, porque
// "cada item no puede ser una excepcion": llamar al administrador mueve opps de
// tres fases a la vez.
//   accion (plegada, con su numero)  >  administracion o fase  >  opp
// Dentro, las fases mas cerca del final primero y lo mas muerto arriba. "Una
// lista de mas de 15 es ruido": cada grupo se pliega, y dentro hace scroll.

const ddmmaa = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`;
/** Del final del flujo hacia atras: lo mas cerca de cobrar, arriba. */
const ORDEN_FASE = [...SECCIONES].reverse();

export function ListaResumen({ filas }: { filas: FilaResumen[] }) {
  const alertas = filas.filter((f) => f.alerta);
  if (!alertas.length) return <p className="mt-8 text-carbon/60">Ninguna alerta: todo va en plazo.</p>;
  return (
    <div className="mt-4 space-y-3">
      {ACCIONES.map((a) => {
        const suyas = alertas.filter((f) => f.accion === a.clave);
        if (!suyas.length) return null;
        return (
          <details key={a.clave} className="group rounded-xl border border-carbon/15 bg-white">
            <summary className="flex cursor-pointer list-none items-baseline gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="text-carbon/40 transition group-open:rotate-90">▸</span>
              <span className="text-[17px] font-bold text-carbon">{a.titulo}</span>
              <span className="rounded-full bg-alerta px-2 py-px text-[12.5px] font-bold tabular-nums text-white">{suyas.length}</span>
              <span className="ml-auto hidden text-[12.5px] text-carbon/55 md:inline">{a.sub}</span>
            </summary>
            <div className="max-h-[560px] overflow-y-auto border-t border-carbon/10 pb-2">
              {a.clave === "admin" ? <PorAdministracion filas={suyas} /> : <PorFase filas={suyas} accion={a.clave} />}
            </div>
          </details>
        );
      })}
    </div>
  );
}

/** "Llamar al administrador": una llamada mueve todas las suyas. Agrupado por
 *  ADMINISTRACION (la empresa); en cada opp, su gestor y su telefono. Primero las
 *  administraciones con mas opps paradas. */
function PorAdministracion({ filas }: { filas: FilaResumen[] }) {
  const grupos = new Map<string, FilaResumen[]>();
  for (const f of filas) {
    const k = f.admin?.empresa ?? f.admin?.quien ?? "";
    grupos.set(k, [...(grupos.get(k) ?? []), f]);
  }
  const orden = [...grupos.entries()].sort(
    ([ka, a], [kb, b]) => Number(!ka) - Number(!kb) || b.length - a.length || Math.max(...b.map((f) => f.diasFase)) - Math.max(...a.map((f) => f.diasFase)),
  );
  return (
    <>
      {orden.map(([k, fs]) => (
        <section key={k || "sin"} className="pt-3">
          <h4 className="pl-9 pr-4 text-[14px] font-bold text-carbon">
            {k || <span className="text-carbon/50">Sin administración apuntada</span>}
            <span className="ml-2 text-[12.5px] font-normal text-carbon/50">· {fs.length} {fs.length === 1 ? "opp" : "opps"}</span>
          </h4>
          <Filas filas={ordenFase(fs)} gestor />
        </section>
      ))}
    </>
  );
}

function PorFase({ filas, accion }: { filas: FilaResumen[]; accion: Accion }) {
  return (
    <>
      {ORDEN_FASE.map((s) => {
        const fs = filas.filter((f) => f.seccion === s.clave);
        if (!fs.length) return null;
        return (
          <section key={s.clave} className="pt-3">
            <h4 className="pl-9 pr-4 text-[14px] font-bold text-carbon">
              {s.titulo} <span className="text-[12.5px] font-normal text-carbon/50">· {fs.length}</span>
            </h4>
            <Filas filas={fs} contacto={accion === "polycam"} enCasa={accion === "interno"} />
          </section>
        );
      })}
    </>
  );
}

const ordenFase = (fs: FilaResumen[]) =>
  [...fs].sort((a, b) => ORDEN_FASE.findIndex((s) => s.clave === a.seccion) - ORDEN_FASE.findIndex((s) => s.clave === b.seccion) || b.diasFase - a.diasFase);

/** Una linea por opp: opp · lo que pasa · dias parada · ultimo contacto · grabar. */
function Filas({ filas, gestor, contacto, enCasa }: { filas: FilaResumen[]; gestor?: boolean; contacto?: boolean; enCasa?: boolean }) {
  return (
    <ul className="mt-1">
      {filas.map((f) => {
        // a quien se llama: el gestor de la administracion, o el contacto de la comunidad
        const com = gestor ? (f.admin ? { quien: f.admin.persona ?? "", telefono: f.admin.telefono } : null) : contacto ? f.llamar.find((l) => l.papel !== "administración") : null;
        return (
          <li
            key={f.id}
            className="grid items-baseline gap-x-4 py-1 pl-14 pr-4 text-[13.5px] hover:bg-hueso/60 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)_56px_84px_minmax(80px,auto)]"
          >
            <Link href={`/comercial/oportunidades/${f.id}`} className="truncate font-semibold text-carbon hover:underline" title={f.nombre}>
              {f.nombre}
            </Link>
            <span className="min-w-0 text-carbon/75">
              {f.pasa}
              {com && (com.quien || com.telefono) && (
                <span className="ml-1.5 whitespace-nowrap text-carbon/55">
                  · {com.quien}
                  {com.telefono && <a href={`tel:${com.telefono.replace(/\s/g, "")}`} className="ml-1 font-semibold tabular-nums text-carbon hover:underline">{com.telefono}</a>}
                </span>
              )}
              {enCasa && f.enCasa && <span className="ml-1.5 text-carbon/55">· preguntar a {f.enCasa}</span>}
            </span>
            <span className="text-right font-bold tabular-nums text-alerta" title={`Plazo de la fase: ${f.plazo} días`}>
              {f.diasFase} d
            </span>
            <span className="tabular-nums text-[12.5px] text-carbon/55" title="Último contacto grabado">
              {f.contacto ? ddmmaa(f.contacto) : "sin contacto"}
            </span>
            <span>
              <Grabar oppId={f.id} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
