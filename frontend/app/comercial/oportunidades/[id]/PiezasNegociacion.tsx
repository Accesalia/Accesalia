"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { accionApuntar, accionDatosJunta, accionDondeCambio, accionQuitarApunte } from "./acciones";
import type { Apartado, Apunte, JuntaNegociacion } from "../../../../lib/negociacion";

// LO QUE SE APUNTA EN EL BLOQUE 3 SOBRE LA MARCHA (Monica, 28-oct-2026): «dejar el hueco para que el comercial, sobre
// esta misma pantalla, vaya anotando cosas». Los apuntes de la negociacion, lo de dentro de la junta y donde se pidio
// cada cambio.

const CAMPO = "rounded-[6px] border border-[#cfcfcf] bg-white px-2 py-1 text-[12.5px] placeholder:text-carbon/55";
const BOTON = "rounded-[6px] bg-lima px-3 py-1 text-[12px] font-bold text-white transition hover:bg-lima-dark disabled:opacity-50";
const dia = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

function useAccion() {
  const router = useRouter();
  const [ocupado, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const hacer = (f: () => Promise<{ ok: true } | { ok: false; error: string }>, despues?: () => void) =>
    empezar(async () => {
      setError(null);
      const r = await f();
      if (!r.ok) return setError(r.error);
      despues?.();
      router.refresh();
    });
  return { ocupado, error, hacer };
}

/** Un apartado de «Quien es quien» que se rellena aqui: presidente, comision de obras, vecinos, contrata, competencia. */
export function ApuntesApartado({
  oppId,
  apartado,
  titulo,
  pista,
  apuntes,
}: {
  oppId: string;
  apartado: Apartado;
  titulo: string;
  pista: string;
  apuntes: Apunte[];
}) {
  const { ocupado, error, hacer } = useAccion();
  const [texto, setTexto] = useState("");
  const [postura, setPostura] = useState<"a_favor" | "en_contra" | null>(null);
  const esVecino = apartado === "vecino";
  return (
    <div className={"rounded-[12px] border px-4 py-3 " + (apuntes.length ? "border-[#d9d9d9]" : "border-dashed border-[#cfcfcf] bg-[#fcfcfa]")}>
      <div className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-carbon/65">{titulo}</div>
      {apuntes.length > 0 && (
        <ul className="mt-1 divide-y divide-[#f0f0f0]">
          {apuntes.map((a) => (
            <li key={a.id} className="flex items-baseline gap-2 py-1 text-[12.5px]">
              {a.postura && <b className={a.postura === "a_favor" ? "text-lima-dark" : "text-alerta"}>{a.postura === "a_favor" ? "A favor" : "En contra"}</b>}
              <span className="flex-1 whitespace-pre-line">{a.texto}</span>
              <span className="text-[11px] text-carbon/50">{dia(a.creadoEn)}{a.autor && ` · ${a.autor.split(" ")[0]}`}</span>
              <button type="button" title="Quitar" disabled={ocupado} onClick={() => confirm("¿Quitas este apunte?") && hacer(() => accionQuitarApunte(oppId, a.id))} className="text-[12px] text-carbon/40 hover:text-alerta">
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {esVecino && (
          <>
            <label className="flex items-center gap-1 text-[12px]"><input type="radio" name={`p-${apartado}`} checked={postura === "a_favor"} onChange={() => setPostura("a_favor")} /> a favor</label>
            <label className="flex items-center gap-1 text-[12px]"><input type="radio" name={`p-${apartado}`} checked={postura === "en_contra"} onChange={() => setPostura("en_contra")} /> en contra</label>
          </>
        )}
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={`✎ ${pista}`} className={CAMPO + " min-w-[200px] flex-1"} />
        <button
          type="button"
          className={BOTON}
          disabled={ocupado || !texto.trim() || (esVecino && !postura)}
          onClick={() => hacer(() => accionApuntar(oppId, { apartado, texto, postura }), () => { setTexto(""); setPostura(null); })}
        >
          Apuntar
        </button>
      </div>
      {error && <p className="mt-1 text-[12px] font-semibold text-alerta">{error}</p>}
    </div>
  );
}

/** Lo de dentro de la junta: documentacion llevada, quorum y votos (del acta, si votan si). */
export function DatosJunta({ oppId, j }: { oppId: string; j: JuntaNegociacion }) {
  const { ocupado, error, hacer } = useAccion();
  const [d, setD] = useState({
    documentacion: j.documentacion ?? "",
    quorum: j.quorum ?? "",
    favor: j.votosFavor == null ? "" : String(j.votosFavor),
    contra: j.votosContra == null ? "" : String(j.votosContra),
  });
  const num = (x: string) => (x.trim() === "" ? null : Math.max(0, Math.round(Number(x)) || 0));
  const cambiado =
    d.documentacion !== (j.documentacion ?? "") || d.quorum !== (j.quorum ?? "") || num(d.favor) !== j.votosFavor || num(d.contra) !== j.votosContra;
  const R = "text-[10.5px] font-bold uppercase tracking-[0.06em] text-carbon/60";
  return (
    <div className="mt-2">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_90px_90px]">
        <label><span className={R}>Documentación llevada</span><input value={d.documentacion} onChange={(e) => setD({ ...d, documentacion: e.target.value })} placeholder="3D, viabilidad, presupuestos…" className={CAMPO + " mt-0.5 w-full"} /></label>
        <label><span className={R}>Quórum (del acta)</span><input value={d.quorum} onChange={(e) => setD({ ...d, quorum: e.target.value })} placeholder="12 de 16, 75 %" className={CAMPO + " mt-0.5 w-full"} /></label>
        <label><span className={R}>A favor</span><input inputMode="numeric" value={d.favor} onChange={(e) => setD({ ...d, favor: e.target.value })} className={CAMPO + " mt-0.5 w-full"} /></label>
        <label><span className={R}>En contra</span><input inputMode="numeric" value={d.contra} onChange={(e) => setD({ ...d, contra: e.target.value })} className={CAMPO + " mt-0.5 w-full"} /></label>
      </div>
      {cambiado && (
        <button
          type="button"
          className={BOTON + " mt-1.5"}
          disabled={ocupado}
          onClick={() => hacer(() => accionDatosJunta(oppId, j.id, { documentacion: d.documentacion, quorum: d.quorum, votosFavor: num(d.favor), votosContra: num(d.contra) }))}
        >
          Guardar la junta
        </button>
      )}
      {error && <p className="mt-1 text-[12px] font-semibold text-alerta">{error}</p>}
    </div>
  );
}

const DONDE = [
  { valor: "", texto: "¿dónde se pidió?" },
  { valor: "junta", texto: "en junta" },
  { valor: "telefono", texto: "por teléfono" },
  { valor: "correo", texto: "por correo" },
  { valor: "reunion", texto: "en una reunión" },
  { valor: "otro", texto: "otro" },
];

/** Donde se pidio un cambio. */
export function DondeCambio({ oppId, estadoId, donde }: { oppId: string; estadoId: string; donde: string | null }) {
  const { ocupado, error, hacer } = useAccion();
  return (
    <>
      <select
        value={donde ?? ""}
        disabled={ocupado}
        onChange={(e) => hacer(() => accionDondeCambio(oppId, estadoId, e.target.value || null))}
        className={CAMPO + " py-0.5"}
      >
        {DONDE.map((x) => <option key={x.valor} value={x.valor}>{x.texto}</option>)}
      </select>
      {error && <span className="ml-1 text-[12px] font-semibold text-alerta">{error}</span>}
    </>
  );
}
