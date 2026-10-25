"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { accionDescartar, accionModificar, accionOkDaniel } from "./acciones";

/** Lo que se hace con una version guardada: un borrador se DESCARTA (solo lo que no ha salido de casa); una hoja ya
 *  emitida se MODIFICA (nace la version siguiente, diciendo quien pide el cambio y por que); la que espera el ok, quien
 *  revisa ofertas le da el OK o PIDE CAMBIOS. Lo generado se ve en PDF (hoja y presupuesto). Monica, 25-oct-2026. */
export function AccionesVersion(props: { oppId: string; versionId: string; estado: string; emitida: boolean; abierta: boolean; puedoRevisar: boolean }) {
  const { versionId, estado } = props;
  const pdf = `/gestiones/hoja-prueba/pdf/${versionId}`;
  return (
    <>
      {!["borrador"].includes(estado) && (
        <>
          <a className="ml-3 font-semibold text-carbon underline" href={pdf} target="_blank" rel="noreferrer">Ver la hoja</a>
          <a className="ml-3 font-semibold text-carbon underline" href={`${pdf}?que=presupuesto`} target="_blank" rel="noreferrer">Ver el presupuesto</a>
        </>
      )}
      {estado === "pendiente_ok_daniel" ? (props.puedoRevisar ? <OkDaniel versionId={versionId} /> : <span className="ml-3 text-carbon/60">(espera el ok de Daniel)</span>) : <Otras {...props} />}
    </>
  );
}

/** El ok de Daniel: ok, o cambios con nota (la misma version vuelve al comercial). */
function OkDaniel({ versionId }: { versionId: string }) {
  const router = useRouter();
  const [ocupado, empezar] = useTransition();
  const [nota, setNota] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const enlace = "ml-3 font-semibold text-carbon underline disabled:opacity-50";
  const resolver = (decision: "ok" | "cambios") =>
    empezar(async () => {
      setMsg(null);
      const r = await accionOkDaniel(versionId, decision, nota);
      if (!r.ok) return setMsg(r.error);
      setMsg(r.avisos.join(" · ") || null);
      router.refresh();
    });
  return (
    <span className="mt-1 flex flex-wrap items-center gap-2">
      <input type="text" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Si pides cambios, di cuáles…" className="min-w-[280px] flex-1 rounded border border-black/20 px-2 py-1" />
      <button type="button" className={enlace} disabled={ocupado} onClick={() => resolver("ok")}>Dar el ok</button>
      <button type="button" className={enlace} disabled={ocupado || !nota.trim()} onClick={() => resolver("cambios")}>Pedir cambios</button>
      {msg && <span className="text-carbon/80">{msg}</span>}
    </span>
  );
}

function Otras({ oppId, versionId, estado, emitida, abierta }: { oppId: string; versionId: string; estado: string; emitida: boolean; abierta: boolean }) {
  const router = useRouter();
  const [ocupado, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(false);
  const [pide, setPide] = useState<"comunidad" | "comercial" | "">("");
  const [nota, setNota] = useState("");
  const enlace = "ml-3 font-semibold text-carbon underline disabled:opacity-50";

  if (estado === "borrador")
    return (
      <>
        <button type="button" className={enlace} disabled={ocupado}
          onClick={() => {
            if (!confirm(emitida ? "¿Descartas este borrador? La versión anterior sigue valiendo." : "¿Descartas este borrador? Nunca se generó: se borra entero.")) return;
            empezar(async () => {
              setError(null);
              const r = await accionDescartar(versionId);
              if (!r.ok) return setError(r.error);
              if (abierta) router.replace(`/gestiones/hoja-prueba?opp=${oppId}`);
              else router.refresh();
            });
          }}>
          Descartar borrador
        </button>
        {error && <span className="ml-2 text-red-800">{error}</span>}
      </>
    );
  if (!emitida || ["sustituida", "anulada", "no_firmada"].includes(estado)) return null;
  return (
    <>
      <button type="button" className={enlace} disabled={ocupado} onClick={() => setForm(!form)}>Modificar</button>
      {form && (
        <span className="mt-1 flex flex-wrap items-center gap-2">
          <span>¿Quién pide el cambio?</span>
          {(["comunidad", "comercial"] as const).map((x) => (
            <label key={x} className="flex items-center gap-1"><input type="radio" name={`pide-${versionId}`} checked={pide === x} onChange={() => setPide(x)} /> {x === "comunidad" ? "la comunidad" : "el comercial"}</label>
          ))}
          <input type="text" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Qué cambia y por qué" className="min-w-[280px] flex-1 rounded border border-black/20 px-2 py-1" />
          <button type="button" className={enlace} disabled={ocupado || !pide || !nota.trim()}
            onClick={() => empezar(async () => {
              setError(null);
              const r = await accionModificar(versionId, pide as "comunidad" | "comercial", nota);
              if (!r.ok) return setError(r.error);
              router.replace(`/gestiones/hoja-prueba?opp=${oppId}&borrador=${r.id}`);
            })}>
            Crear la versión nueva
          </button>
          {error && <span className="text-red-800">{error}</span>}
        </span>
      )}
    </>
  );
}
