"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DocCajon, GrupoTipos } from "../../../../lib/cajonDocumentos";
import { accionApuntarCajon, accionArchivarEnCajon, accionPermisosCajon } from "./acciones";

// EL CAJON DE DOCUMENTOS DE LA OPP (Monica, 25-oct-2026; maqueta validada docs/figma/recorrido-hoja-firmada.html), con
// la forma del apartado de fotos. Se suelta lo que llega (PDF, fotos, Word, Excel, correos) y queda SIN ARCHIVAR hasta
// que alguien dice que es: aqui mismo, o la secretaria comercial en su bandeja. Debajo, en pequeño, lo ya archivado.
// Sin nada: «Nada subido»; con todo archivado: «Todo archivado».

const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" });
const ACEPTA = ".pdf,.doc,.docx,.xls,.xlsx,.odt,.ods,.txt,.csv,.eml,.msg,image/*";
const MAX = 25 * 1024 * 1024;

export function CajonOpp({ oppId, docs, tipos }: { oppId: string; docs: DocCajon[]; tipos: GrupoTipos[] }) {
  const router = useRouter();
  const elegir = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(0);
  const [encima, setEncima] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();

  const pendientes = docs.filter((d) => !d.tipo);
  const archivados = docs.filter((d) => d.tipo);

  async function subir(ficheros: File[]) {
    const grandes = ficheros.filter((f) => f.size > MAX);
    const buenos = ficheros.filter((f) => f.size <= MAX).slice(0, 20);
    if (!buenos.length) return setError(grandes.length ? "Cada documento puede pesar como mucho 25 MB." : "No hay nada que subir.");
    setError(grandes.length ? `No se suben (más de 25 MB): ${grandes.map((f) => f.name).join(", ")}.` : null);
    setSubiendo(buenos.length);
    try {
      const p = await accionPermisosCajon(oppId, buenos.map((f) => f.name));
      if (!p.ok) throw new Error(p.error);
      await Promise.all(
        buenos.map(async (f, i) => {
          const r = await fetch(p.permisos[i].url, { method: "PUT", headers: { "Content-Type": f.type || "application/octet-stream", "x-upsert": "false" }, body: f });
          if (!r.ok) throw new Error(`No se ha podido subir «${f.name}».`);
        }),
      );
      const r = await accionApuntarCajon(oppId, buenos.map((f, i) => ({ ruta: p.permisos[i].ruta, nombre: f.name })));
      if (!r.ok) throw new Error(r.error);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubiendo(0);
    }
  }

  function archivar(docId: string, tipoId: string) {
    if (!tipoId) return;
    empezar(async () => {
      const r = await accionArchivarEnCajon(oppId, docId, tipoId);
      if (!r.ok) return setError(r.error);
      setError(null);
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-2 rounded-[10px] border border-[#d9d9d9] bg-white px-[13px] py-[11px]">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#8a8a8a]">Documentos · {docs.length}</div>
        {docs.length > 0 && !pendientes.length && <span className="text-[12.5px] font-bold text-lima-dark">✓ Todo archivado</span>}
        <input
          ref={elegir}
          type="file"
          accept={ACEPTA}
          multiple
          className="hidden"
          onChange={(e) => {
            const fs = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (fs.length) subir(fs);
          }}
        />
        <button
          type="button"
          disabled={subiendo > 0}
          onClick={() => elegir.current?.click()}
          className="ml-auto rounded-lg border border-dashed border-lima/70 bg-white px-3 py-1 text-[12px] font-semibold text-lima-dark transition hover:border-lima-dark disabled:opacity-60"
        >
          {subiendo ? `Subiendo ${subiendo}…` : "📎 Subir documentos desde el PC"}
        </button>
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setEncima(true);
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => {
          e.preventDefault();
          setEncima(false);
          const fs = Array.from(e.dataTransfer.files ?? []);
          if (fs.length) subir(fs);
        }}
        className={`rounded-[10px] border-[1.5px] border-dashed px-3 py-2.5 text-center text-[12.5px] ${encima ? "border-lima-dark bg-lima-soft text-lima-dark" : "border-black/15 bg-[#fafbf9] text-carbon/65"}`}
      >
        o arrástralos aquí: PDF, fotos, Word, Excel o correos
      </div>
      {error && <p className="text-[12px] text-alerta">{error}</p>}
      {!docs.length && (
        <p className="text-[12.5px] text-carbon/65">
          <b>Nada subido.</b> Lo que sueltes aquí (la orden de compra, el presupuesto de la contrata, un contrato…) lo archiva quien sepa qué es: tú mismo, o la
          secretaria comercial.
        </p>
      )}
      {pendientes.length > 0 && (
        <>
          <div className="mt-1 text-[10.5px] font-extrabold uppercase tracking-[.07em] text-carbon/65">Sin archivar · {pendientes.length}</div>
          {pendientes.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-[#ecdcae] bg-[#fdf8ec] px-2.5 py-1.5">
              <div className="min-w-0 flex-[1_1_280px]">
                <Enlace d={d} />{" "}
                <span className="text-[12px] text-carbon/65">
                  {d.subidoPor ?? "alguien"} · {FECHA.format(new Date(d.subido)).replace(".", "")}
                </span>
              </div>
              <select
                aria-label="Archivar como"
                defaultValue=""
                disabled={ocupado}
                onChange={(e) => archivar(d.id, e.target.value)}
                className="max-w-full rounded-lg border border-black/15 bg-white px-2.5 py-1 text-[13px] text-carbon"
              >
                <option value="">Archivar como…</option>
                {tipos.map((g) => (
                  <optgroup key={g.grupo} label={g.grupo}>
                    {g.tipos.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          ))}
        </>
      )}
      {archivados.length > 0 && (
        <>
          <div className="mt-1 text-[10.5px] font-extrabold uppercase tracking-[.07em] text-carbon/65">Archivados · {archivados.length}</div>
          {archivados.map((d) => (
            <div key={d.id} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-[12.5px] text-carbon/70">
              <Enlace d={d} pequeño />
              <span>
                como <b>{d.tipo}</b>
              </span>
              <span className="text-[12px] text-carbon/65">
                {d.archivadoPor ?? "alguien"}
                {d.archivado ? ` · ${FECHA.format(new Date(d.archivado)).replace(".", "")}` : ""}
              </span>
            </div>
          ))}
        </>
      )}
    </section>
  );
}

function Enlace({ d, pequeño }: { d: DocCajon; pequeño?: boolean }) {
  const clase = pequeño
    ? "font-bold text-lima-dark hover:underline"
    : "inline-flex items-center gap-1.5 rounded-full border border-lima-dark bg-lima-soft px-2.5 py-0.5 text-[13px] font-bold text-lima-dark hover:underline";
  return d.url ? (
    <a href={d.url} target="_blank" rel="noreferrer" className={clase}>
      📄 {d.nombre}
    </a>
  ) : (
    <span className={clase}>📄 {d.nombre}</span>
  );
}
