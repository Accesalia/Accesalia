"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { TrabajoCaja } from "../../../lib/cobros";
import { apuntarNube, apuntarVarias } from "./acciones";

// NUBES DE PUNTOS (Monica, 12-oct-2026). La lista operativa del escaneo: una
// hoja firmada y cobrada entra aqui; se apunta cuando se va a escanear (lo que
// mas limita: quedar con alguien de la comunidad que abra puertas, patios y
// sotanos), cuando se escaneo y cuando quedo la nube lista. Con la nube lista
// pasa al cronograma de tecnicos.

type Campo = "fecha_prevista_escaneo" | "escaneado_en" | "nube_lista_en";
const EUR = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" });
const hoyIso = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
const dias = (desde: string | null) => (desde ? Math.max(0, Math.round((Date.now() - new Date(desde + "T00:00:00").getTime()) / 864e5)) : null);
const ddmmaa = (v: string | null) => (v ? v.split("-").reverse().join("/") : "");
const FECHA = "h-[30px] rounded-md border border-black/20 bg-white px-1.5 text-[12.5px]";

function CeldaFecha({ oppId, campo, valor, conHoy }: { oppId: string; campo: Campo; valor: string | null; conHoy?: boolean }) {
  const [v, setV] = useState(valor ?? "");
  const [guardando, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const guardar = (nuevo: string) => {
    setV(nuevo);
    setError(null);
    empezar(async () => {
      const r = await apuntarNube(oppId, campo, nuevo || null);
      if (!r.ok) setError(r.error ?? "No se guardó");
    });
  };
  return (
    <span className="flex items-center gap-1.5">
      <input type="date" value={v} onChange={(e) => guardar(e.target.value)} className={FECHA + (v ? "" : " text-carbon/45")} aria-label={campo} />
      {conHoy && !v && (
        <button type="button" onClick={() => guardar(hoyIso())} className="text-[12px] font-semibold text-lima-dark hover:underline">
          hoy
        </button>
      )}
      {v && !conHoy ? null : null}
      {guardando && <span className="text-[11px] text-carbon/55">…</span>}
      {error && <span className="text-[11px] text-alerta" title={error}>no se guardó</span>}
    </span>
  );
}

export function Nubes({ trabajos }: { trabajos: TrabajoCaja[] }) {
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [fechaBloque, setFechaBloque] = useState(hoyIso());
  const [verListas, setVerListas] = useState(false);
  const [haciendo, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Primero lo que espera; lo que ya tiene la nube lista, aparte (ya esta en el cronograma).
  const enCola = trabajos.filter((t) => !t.nube?.lista).sort((a, b) => (a.cobradoDesde ?? "").localeCompare(b.cobradoDesde ?? ""));
  const listas = trabajos.filter((t) => t.nube?.lista);
  const sinFecha = enCola.filter((t) => !t.nube?.prevista && !t.nube?.escaneado).length;
  const escaneadas = enCola.filter((t) => t.nube?.escaneado).length;

  const enBloque = (campo: Campo) => {
    setError(null);
    empezar(async () => {
      const r = await apuntarVarias(marcadas, campo, fechaBloque);
      if (r.ok) setMarcadas([]);
      else setError(r.error ?? "No se guardó");
    });
  };
  const alterna = (id: string) => setMarcadas((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const tabla = (lista: TrabajoCaja[], conMarca: boolean) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-black/10 text-[10.5px] font-bold uppercase tracking-wide text-carbon/65">
            {conMarca && (
              <th className="w-8 pl-3">
                <input
                  type="checkbox"
                  aria-label="Marcar todas"
                  checked={marcadas.length > 0 && marcadas.length === lista.length}
                  onChange={(e) => setMarcadas(e.target.checked ? lista.map((t) => t.oppId) : [])}
                />
              </th>
            )}
            <th className="px-3 py-2">Trabajo</th>
            <th className="px-3 py-2">En la lista desde</th>
            <th className="px-3 py-2">Escaneo previsto</th>
            <th className="px-3 py-2">Escaneado</th>
            <th className="px-3 py-2">Nube lista</th>
            <th className="px-3 py-2 text-right">Hito de entrega</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((t) => {
            const espera = dias(t.cobradoDesde);
            return (
              <tr key={t.oppId} className={"border-b border-black/5 " + (marcadas.includes(t.oppId) ? "bg-lima-soft/60" : "")}>
                {conMarca && (
                  <td className="pl-3">
                    <input type="checkbox" checked={marcadas.includes(t.oppId)} onChange={() => alterna(t.oppId)} aria-label={`Marcar ${t.nombre}`} />
                  </td>
                )}
                <td className="px-3 py-1.5">
                  <Link href={`/facturacion/${t.oppId}`} className="font-semibold text-carbon hover:underline">
                    {t.nombre}
                  </Link>
                  {t.codigo && <span className="text-carbon/60"> · {t.codigo}</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5">
                  {t.cobradoDesde ? (
                    <>
                      {ddmmaa(t.cobradoDesde)}
                      {espera !== null && <span className={"ml-1.5 " + (espera > 30 ? "font-bold text-alerta" : "text-carbon/60")}>· {espera} días</span>}
                    </>
                  ) : (
                    <span className="text-carbon/50">—</span>
                  )}
                </td>
                <td className="px-3 py-1.5">
                  <CeldaFecha oppId={t.oppId} campo="fecha_prevista_escaneo" valor={t.nube?.prevista ?? null} />
                </td>
                <td className="px-3 py-1.5">
                  <CeldaFecha oppId={t.oppId} campo="escaneado_en" valor={t.nube?.escaneado ?? null} conHoy />
                </td>
                <td className="px-3 py-1.5">
                  <CeldaFecha oppId={t.oppId} campo="nube_lista_en" valor={t.nube?.lista ?? null} conHoy />
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">{EUR.format(t.entrega)} €</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-carbon/70">Esperando nube</div>
          <div className="text-2xl font-bold tabular-nums">{enCola.length}</div>
          <div className="text-[12px] text-carbon/65">{sinFecha} sin fecha de escaneo · {escaneadas} escaneados, montando la nube</div>
        </div>
        <div className="rounded-2xl border border-lima bg-lima-soft px-4 py-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-lima-dark">Con la nube lista</div>
          <div className="text-2xl font-bold tabular-nums">{listas.length}</div>
          <div className="text-[12px] text-carbon/70">
            ya en el{" "}
            <Link href="/facturacion/caja" className="font-semibold underline">
              cronograma de técnicos
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-[12.5px] text-carbon/75">
          Escanear y montar la nube son unos 2 días; lo que más limita es quedar con alguien de la comunidad que abra puertas, patios y
          sótanos. Por eso la fecha prevista se apunta en cuanto se queda.
        </div>
      </div>

      {/* VARIAS A LA VEZ: sobre todo para ponerse al dia la primera vez */}
      {marcadas.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2.5 rounded-xl border border-black/10 bg-white px-3 py-2 text-[13px]">
          <b>{marcadas.length} marcados</b>
          <span className="text-carbon/65">con fecha</span>
          <input type="date" value={fechaBloque} onChange={(e) => setFechaBloque(e.target.value)} className={FECHA} />
          <button type="button" disabled={haciendo || !fechaBloque} onClick={() => enBloque("fecha_prevista_escaneo")} className="rounded-lg border border-black/20 bg-white px-3 py-1 font-semibold hover:border-carbon/50 disabled:opacity-50">
            Escaneo previsto
          </button>
          <button type="button" disabled={haciendo || !fechaBloque} onClick={() => enBloque("escaneado_en")} className="rounded-lg border border-black/20 bg-white px-3 py-1 font-semibold hover:border-carbon/50 disabled:opacity-50">
            Escaneados
          </button>
          <button type="button" disabled={haciendo || !fechaBloque} onClick={() => enBloque("nube_lista_en")} className="rounded-lg bg-lima px-3 py-1 font-bold text-carbon hover:bg-lima-dark hover:text-white disabled:opacity-50">
            Nube lista → al cronograma
          </button>
          {haciendo && <span className="text-carbon/60">Guardando…</span>}
          {error && <span className="font-semibold text-alerta">{error}</span>}
        </div>
      )}

      <section className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
        <h2 className="px-4 pt-3 text-sm font-bold uppercase tracking-wider text-carbon/70">Esperando la nube · {enCola.length}</h2>
        {enCola.length ? tabla(enCola, true) : <p className="px-4 py-6 text-carbon/65">Nada esperando: todo tiene la nube lista.</p>}
      </section>

      {listas.length > 0 && (
        <section className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
          <button type="button" onClick={() => setVerListas(!verListas)} className="w-full px-4 py-3 text-left text-sm font-bold uppercase tracking-wider text-carbon/70">
            Con la nube lista · {listas.length} {verListas ? "▲" : "▼"}
          </button>
          {verListas && tabla(listas, false)}
        </section>
      )}
    </>
  );
}
