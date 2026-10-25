"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { accionDescartar, accionModificar } from "./acciones";

/** Lo que se hace con una version guardada: un borrador se DESCARTA (solo lo que no ha salido de casa); una hoja ya
 *  emitida se MODIFICA (nace la version siguiente, diciendo quien pide el cambio y por que). Monica, 25-oct-2026. */
export function AccionesVersion({ oppId, versionId, estado, emitida, abierta }: { oppId: string; versionId: string; estado: string; emitida: boolean; abierta: boolean }) {
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
