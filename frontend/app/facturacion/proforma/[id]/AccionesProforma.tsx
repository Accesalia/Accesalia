"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ParaEnviarProforma } from "../../../../lib/proformas";
import { accionAnularProforma, accionEnviarProforma } from "../acciones";

// Enviar la proforma por correo (los de la comunidad marcados, o uno nuevo) y anularla.

const CAMPO = "w-full rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-lima";
const BTN = "rounded-lg border border-black/15 bg-white px-2.5 py-1 text-[12px] font-semibold text-carbon/75 hover:border-carbon/40 disabled:opacity-50";

export function Copiar({ texto }: { texto: string }) {
  const [hecho, setHecho] = useState(false);
  return (
    <button
      type="button"
      className={BTN + " shrink-0"}
      onClick={() => navigator.clipboard.writeText(texto).then(() => (setHecho(true), setTimeout(() => setHecho(false), 1500)))}
    >
      {hecho ? "Copiado" : "Copiar"}
    </button>
  );
}

export function AccionesProforma({ id, envio, facturada }: { id: string; envio: ParaEnviarProforma; facturada: boolean }) {
  const router = useRouter();
  const [marcados, setMarcados] = useState<string[]>(envio.destinatarios.slice(0, 1).map((d) => d.email));
  const [otro, setOtro] = useState("");
  const [asunto, setAsunto] = useState(envio.asunto);
  const [cuerpo, setCuerpo] = useState(envio.cuerpo);
  const [anular, setAnular] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();

  const para = [...marcados, ...otro.split(/[,;\s]+/).filter(Boolean)];
  const correr = (f: () => Promise<{ ok: boolean; error?: string }>, hecho: string) =>
    empezar(async () => {
      setError(null);
      setAviso(null);
      const r = await f();
      if (!r.ok) return setError(r.error ?? "Error");
      setAviso(hecho);
      setAnular(null);
      router.refresh();
    });

  return (
    <>
      <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
        <h2 className="text-[12px] font-bold uppercase tracking-wide text-carbon/70">Enviar por correo</h2>
        <p className="mt-1 text-[12px] text-carbon/65">
          Sale de {envio.buzon}, con el PDF adjunto, y queda en el diario de la oportunidad.
        </p>
        {!envio.buzonListo && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
            El buzón {envio.buzon} aún no está configurado (falta su clave en Vercel): de momento no se puede enviar. Descarga el PDF si corre prisa.
          </p>
        )}
        <div className="mt-2 space-y-1">
          {envio.destinatarios.map((d) => (
            <label key={d.email} className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={marcados.includes(d.email)}
                onChange={(e) => setMarcados(e.target.checked ? [...marcados, d.email] : marcados.filter((x) => x !== d.email))}
              />
              <span>{d.email}</span>
              <span className="text-carbon/60">· {d.quien}</span>
            </label>
          ))}
          {!envio.destinatarios.length && <p className="text-[12.5px] text-carbon/65">No tenemos ningún correo de esta comunidad: escríbelo abajo.</p>}
        </div>
        <input value={otro} onChange={(e) => setOtro(e.target.value)} placeholder="Otro correo (o varios, separados por coma)" className={CAMPO + " mt-2"} />
        <input value={asunto} onChange={(e) => setAsunto(e.target.value)} className={CAMPO + " mt-2"} />
        <textarea value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} rows={7} className={CAMPO + " mt-2 resize-y"} />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            disabled={ocupado || !envio.buzonListo || !para.length}
            onClick={() => correr(() => accionEnviarProforma(id, para, asunto, cuerpo), "Enviada.")}
            className="rounded-lg bg-lima px-4 py-1.5 text-[13px] font-bold text-carbon hover:bg-lima-dark hover:text-white disabled:opacity-50"
          >
            {ocupado ? "Enviando…" : `Enviar a ${para.length || "…"}`}
          </button>
        </div>
      </section>

      {!facturada && (
        <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          {anular === null ? (
            <button type="button" className={BTN} onClick={() => setAnular("")}>
              Anular la proforma
            </button>
          ) : (
            <>
              <textarea value={anular} onChange={(e) => setAnular(e.target.value)} rows={2} placeholder="Por qué se anula (el número queda gastado)" className={CAMPO + " resize-y"} />
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" className={BTN} onClick={() => setAnular(null)}>
                  Cancelar
                </button>
                <button type="button" disabled={ocupado} className={BTN + " border-alerta/50 text-alerta"} onClick={() => correr(() => accionAnularProforma(id, anular), "Anulada.")}>
                  Anular
                </button>
              </div>
            </>
          )}
        </section>
      )}
      {error && <p className="text-[13px] font-semibold text-alerta">{error}</p>}
      {aviso && <p className="text-[13px] font-semibold text-lima-dark">{aviso}</p>}
    </>
  );
}
