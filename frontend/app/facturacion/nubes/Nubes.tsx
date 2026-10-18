"use client";

import { useState, useTransition } from "react";
import { apuntarNube } from "./acciones";

// PROCESO DE NUBES (Monica, 16-oct-2026; maqueta area-dinero-v1, marco 7): la
// pantalla de Abraham, y Alexandra la ve igual. Lo que facturacion ha marcado
// «nube si» y aun no tiene la nube lista: recibida, escaneo previsto, notas,
// escaneado el y nube lista. Al marcar «lista» sale de aqui y pasa a Proyectos.

export type FilaProceso = { oppId: string; nombre: string; recibida: string | null; prevista: string | null; escaneado: string | null; notas: string | null };

const hoyIso = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
const ddmmaa = (v: string | null) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "—");
const IN = "h-8 rounded-[7px] border border-[#d6dad2] bg-white px-2 text-[13px]";
const TH = "border-b border-[#e9ece5] bg-[#fafbf9] px-3.5 py-[11px] text-left text-[11.5px] font-bold uppercase tracking-[.08em] text-[#7b8077]";
const TD = "border-b border-[#f0f2ee] px-3.5 py-3 align-middle";

function useGuardar(oppId: string) {
  const [guardando, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const guardar = (campo: Parameters<typeof apuntarNube>[1], valor: string | null, luego?: () => void) => {
    setError(null);
    empezar(async () => {
      const r = await apuntarNube(oppId, campo, valor);
      if (r.ok) luego?.();
      else setError(r.error ?? "No se guardó");
    });
  };
  return { guardando, error, guardar };
}

function Fila({ f, alSalir }: { f: FilaProceso; alSalir: () => void }) {
  const { guardando, error, guardar } = useGuardar(f.oppId);
  const [prevista, setPrevista] = useState(f.prevista ?? "");
  const [escaneado, setEscaneado] = useState(f.escaneado ?? "");
  const [notas, setNotas] = useState(f.notas ?? "");
  const [sale, setSale] = useState(false);
  return (
    <tr className={`transition-opacity duration-[400ms] ${sale ? "opacity-0" : ""}`}>
      <td className={TD}>
        <b>{f.nombre}</b>
        {error && <div className="text-[12px] text-alerta" title={error}>No se guardó: {error}</div>}
      </td>
      <td className={TD + " whitespace-nowrap"}>{ddmmaa(f.recibida)}</td>
      <td className={TD}>
        <input type="date" className={IN} value={prevista} onChange={(e) => { setPrevista(e.target.value); guardar("fecha_prevista_escaneo", e.target.value || null); }} aria-label="Escaneo previsto" />
      </td>
      <td className={TD}>
        <input
          type="text"
          className={IN + " w-[300px] placeholder:text-carbon/55"}
          value={notas}
          placeholder="Notas…"
          onChange={(e) => setNotas(e.target.value)}
          onBlur={() => notas !== (f.notas ?? "") && guardar("notas", notas)}
          aria-label="Notas"
        />
      </td>
      <td className={TD}>
        <input type="date" className={IN} value={escaneado} onChange={(e) => { setEscaneado(e.target.value); guardar("escaneado_en", e.target.value || null); }} aria-label="Escaneado el" />
      </td>
      <td className={TD + " text-right"}>
        <label className="inline-flex cursor-pointer items-center gap-1.5 font-bold text-lima-dark">
          <input
            type="checkbox"
            disabled={guardando}
            onChange={(e) => e.target.checked && guardar("nube_lista_en", hoyIso(), () => { setSale(true); setTimeout(alSalir, 400); })}
          />{" "}
          lista
        </label>
      </td>
    </tr>
  );
}

export function ProcesoNubes({ filas }: { filas: FilaProceso[] }) {
  const [quedan, setQuedan] = useState(filas);
  return (
    <div className="w-fit overflow-hidden rounded-[14px] border border-[#e3e6df] bg-white">
      {quedan.length ? (
        <table className="w-auto border-collapse text-[14px] tabular-nums">
          <thead>
            <tr>
              <th className={TH}>Dirección</th>
              <th className={TH}>Recibida</th>
              <th className={TH}>Escaneo previsto</th>
              <th className={TH}>Notas</th>
              <th className={TH}>Escaneado el</th>
              <th className={TH + " text-right"}>Nube</th>
            </tr>
          </thead>
          <tbody>
            {quedan.map((f) => (
              <Fila key={f.oppId} f={f} alSalir={() => setQuedan((l) => l.filter((x) => x.oppId !== f.oppId))} />
            ))}
          </tbody>
        </table>
      ) : (
        <p className="p-[26px] text-center text-[#7b8077]">Todo escaneado y con la nube lista.</p>
      )}
    </div>
  );
}
