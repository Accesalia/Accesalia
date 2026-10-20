"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { accionPermisoPapel, accionRegistrarPapel } from "./accionesPapeles";
import type { ClavePapel, Papel as DatoPapel } from "../../../../lib/fichaComunidad";

// UN PAPEL DE LA FICHA (Monica, 20-oct-2026): «poner que falta sin dar opcion
// de subirla, mala cosa». Siempre con cara de documento: si esta, se abre; si
// falta, se suelta encima o se pulsa para elegirlo del ordenador. Si ya esta,
// «cambiar» sube la version siguiente (la anterior no se borra).
// Los que llevan fecha (el acta, el certificado, la caducidad del DNI) la piden
// antes de guardar: la vigencia del presidente sale de ahi.

const FECHA: Partial<Record<ClavePapel, { et: string; obligatoria: boolean }>> = {
  acta: { et: "Fecha del acta", obligatoria: true },
  dni: { et: "Caduca el", obligatoria: false },
  certificado: { et: "Fecha del certificado", obligatoria: false },
  votacion: { et: "Fecha de la junta", obligatoria: false },
};

const BASE = "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-0.5 text-sm font-semibold transition ";

export function Papel({
  comunidadId, clave, et, p, puestoId = null, oportunidadId = null, puedeSubir,
}: {
  comunidadId: string; clave: ClavePapel; et: string; p: DatoPapel;
  puestoId?: string | null; oportunidadId?: string | null; puedeSubir: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [encima, setEncima] = useState(false);
  const [fichero, setFichero] = useState<File | null>(null);
  const [fecha, setFecha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [subiendo, empezar] = useTransition();
  const pideFecha = FECHA[clave];

  const subir = (f: File, dia: string | null) => {
    setError(null);
    empezar(async () => {
      const perm = await accionPermisoPapel(comunidadId, clave, f.name, f.type, f.size);
      if (!perm.ok) return setError(perm.error);
      const put = await fetch(perm.url, { method: "PUT", headers: { "Content-Type": f.type || "application/octet-stream", "x-upsert": "false" }, body: f });
      if (!put.ok) return setError("No se ha podido subir el fichero. Vuelve a intentarlo.");
      const r = await accionRegistrarPapel({ comunidadId, clave, ruta: perm.ruta, fecha: dia, puestoId, oportunidadId });
      if (!r.ok) return setError(r.error);
      setFichero(null);
      setFecha("");
      router.refresh();
    });
  };

  const elegido = (f: File | undefined) => {
    if (!f) return;
    setError(null);
    if (pideFecha) setFichero(f);
    else subir(f, null);
  };

  const soltar = {
    onDragOver: (e: React.DragEvent) => {
      if (!puedeSubir) return;
      e.preventDefault();
      setEncima(true);
    },
    onDragLeave: () => setEncima(false),
    onDrop: (e: React.DragEvent) => {
      if (!puedeSubir) return;
      e.preventDefault();
      setEncima(false);
      elegido(e.dataTransfer.files?.[0]);
    },
  };

  const elegir = <input ref={input} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => elegido(e.target.files?.[0] ?? undefined)} />;

  // elegido el fichero, falta su fecha
  if (fichero && pideFecha)
    return (
      <span className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-lima bg-lima-soft px-2.5 py-1 text-sm">
        <span aria-hidden>📄</span>
        <span className="max-w-[14rem] truncate font-semibold text-lima-dark" title={fichero.name}>{fichero.name}</span>
        <label className="inline-flex items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-carbon/60">{pideFecha.et}</span>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="rounded-md border border-black/15 bg-white px-1.5 py-0.5 text-sm" />
        </label>
        <button
          type="button"
          disabled={subiendo || (pideFecha.obligatoria && !fecha)}
          onClick={() => subir(fichero, fecha || null)}
          className="rounded-md bg-lima px-2.5 py-0.5 font-bold text-carbon hover:bg-lima-dark hover:text-white disabled:opacity-40"
        >
          {subiendo ? "Subiendo…" : "Guardar"}
        </button>
        <button type="button" disabled={subiendo} onClick={() => { setFichero(null); setFecha(""); setError(null); }} className="text-carbon/60 underline">
          cancelar
        </button>
        {error && <span className="basis-full text-[13px] font-semibold text-alerta">{error}</span>}
      </span>
    );

  // ya esta: se abre, y se puede cambiar
  if (p)
    return (
      <span className="inline-flex items-center gap-1.5" {...soltar}>
        {p.enAlmacen ? (
          <a
            href={`/administracion/comunidades/${comunidadId}/papel/${p.id}`}
            target="_blank"
            rel="noopener"
            className={BASE + (encima ? "border-lima bg-lima/30 text-lima-dark" : "border-lima/60 bg-lima-soft text-lima-dark hover:bg-lima/30")}
          >
            <span aria-hidden>📄</span>
            {et}
          </a>
        ) : (
          <span className={BASE + "border-lima/60 bg-lima-soft text-lima-dark"} title="Está apuntado, pero el fichero no está en el almacén">
            <span aria-hidden>📄</span>
            {et}
          </span>
        )}
        {puedeSubir && (
          <button type="button" onClick={() => input.current?.click()} disabled={subiendo} className="text-[12px] font-semibold text-carbon/55 underline hover:text-carbon" title="Subir uno nuevo: el de ahora se guarda como versión anterior">
            {subiendo ? "subiendo…" : "cambiar"}
          </button>
        )}
        {elegir}
        {error && <span className="text-[13px] font-semibold text-alerta">{error}</span>}
      </span>
    );

  // falta: se suelta encima o se pulsa
  if (!puedeSubir)
    return (
      <span className={BASE + "border-lima/30 bg-white text-lima-dark/55"} title="Todavía no está subido">
        <span aria-hidden>📄</span>
        {et}
        <span className="font-medium text-amber-700/70">(falta)</span>
      </span>
    );
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        {...soltar}
        onClick={() => input.current?.click()}
        disabled={subiendo}
        title="Arrástralo aquí o pulsa para elegirlo. PDF o foto, hasta 25 MB."
        className={BASE + "border-dashed " + (encima ? "border-lima bg-lima-soft text-lima-dark" : "border-lima/50 bg-white text-lima-dark/70 hover:border-lima hover:bg-lima-soft")}
      >
        <span aria-hidden>📄</span>
        {et}
        <span className="font-medium text-amber-700/70">{subiendo ? "subiendo…" : "(falta)"}</span>
        <span className="font-bold text-lima-dark">⤒ subir</span>
      </button>
      {elegir}
      {error && <span className="text-[13px] font-semibold text-alerta">{error}</span>}
    </span>
  );
}
