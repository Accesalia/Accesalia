"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { accionApuntar, accionBuscarPersonas, accionDatosJunta, accionDondeCambio, accionQuitarApunte } from "./acciones";
import type { OpcionPersona } from "../../../../lib/datosCabecera";
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

type Nueva = { nombre: string; telefono: string; correo: string; otro: string };
const ENLACE = "text-[12px] font-semibold text-[#104269] underline-offset-2 hover:underline";

/** Un apartado de «Quien es quien» que se rellena aqui: presidente, comision de obras, vecinos, contrata, competencia.
 *  LA PERSONA, DE LA AGENDA (Monica, 29-oct-2026: «todo es campos de texto, no se selecciona de agenda. Eso es un
 *  error»): se busca como en la cabecera o se crea nueva en su caja amarilla; la nota es opcional. */
export function ApuntesApartado({
  oppId,
  apartado,
  titulo,
  pista,
  apuntes,
  enAgenda = [],
}: {
  oppId: string;
  apartado: Apartado;
  titulo: string;
  pista: string;
  apuntes: Apunte[];
  /** Quien ya figura en la agenda de la comunidad con ese papel (el presidente, la comision de obras): 29-oct-2026,
   *  «aunque hay presidente, en quien es quien no sale». */
  enAgenda?: { nombre: string; telefono: string | null; papel: string | null }[];
}) {
  const { ocupado, error, hacer } = useAccion();
  const [texto, setTexto] = useState("");
  const [postura, setPostura] = useState<"a_favor" | "en_contra" | null>(null);
  const [q, setQ] = useState("");
  const [lista, setLista] = useState<OpcionPersona[]>([]);
  const [elegida, setElegida] = useState<OpcionPersona | null>(null);
  const [nueva, setNueva] = useState<Nueva | null>(null);
  const esVecino = apartado === "vecino";

  useEffect(() => {
    if (elegida || nueva || q.trim().length < 2) return setLista([]);
    const t = setTimeout(() => accionBuscarPersonas(oppId, q, "contacto").then(setLista), 250);
    return () => clearTimeout(t);
  }, [q, elegida, nueva, oppId]);

  const limpiar = () => {
    setTexto("");
    setPostura(null);
    setQ("");
    setElegida(null);
    setNueva(null);
    setLista([]);
  };
  const hayPersona = !!elegida || !!nueva?.nombre.trim();
  const apuntar = () =>
    hacer(
      () =>
        accionApuntar(oppId, {
          apartado,
          texto,
          postura,
          persona: elegida
            ? { valor: elegida.valor, nueva: null }
            : nueva?.nombre.trim()
              ? { valor: null, nueva: { nombre: nueva.nombre, telefono: nueva.telefono.trim() || null, correo: nueva.correo.trim() || null, que: null, otro: nueva.otro.trim() || null, contrataId: null } }
              : null,
        }),
      limpiar,
    );

  return (
    <div className={"rounded-[12px] border px-4 py-3 " + (apuntes.length || enAgenda.length ? "border-[#5d646c] bg-white" : "border-dashed border-[#9aa0a6] bg-[#fcfcfa]")}>
      <div className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-carbon/65">{titulo}</div>
      {enAgenda.length > 0 && (
        <ul className="mt-1">
          {enAgenda.map((c, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-2 py-0.5 text-[12.5px]">
              <b>{c.nombre}</b>
              {c.papel && <span className="text-carbon/65">{c.papel}</span>}
              {c.telefono && <span className="tabular-nums text-carbon/70">· {c.telefono}</span>}
              <span className="rounded-[4px] bg-[#eef2f6] px-1.5 text-[10.5px] font-semibold text-[#104269]">en la agenda</span>
            </li>
          ))}
        </ul>
      )}
      {apuntes.length > 0 && (
        <ul className="mt-1 divide-y divide-[#f0f0f0]">
          {apuntes.map((a) => (
            <li key={a.id} className="flex items-baseline gap-2 py-1 text-[12.5px]">
              {a.postura && <b className={a.postura === "a_favor" ? "text-lima-dark" : "text-alerta"}>{a.postura === "a_favor" ? "A favor" : "En contra"}</b>}
              <span className="flex-1 whitespace-pre-line">
                {a.persona && <b>{a.persona}</b>}
                {a.persona && a.texto && " · "}
                {a.texto}
              </span>
              <span className="text-[11px] text-carbon/50">
                {dia(a.creadoEn)}
                {a.autor && ` · ${a.autor.split(" ")[0]}`}
              </span>
              <button
                type="button"
                title="Quitar"
                disabled={ocupado}
                onClick={() => confirm("¿Quitas este apunte?") && hacer(() => accionQuitarApunte(oppId, a.id))}
                className="text-[12px] text-carbon/40 hover:text-alerta"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* LA PERSONA: de la agenda, o nueva */}
      <div className="mt-1.5">
        {elegida ? (
          <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
            <b>{elegida.texto}</b>
            <span className="text-carbon/60">{elegida.pista}</span>
            <button type="button" className={ENLACE} onClick={() => setElegida(null)}>
              cambiar
            </button>
          </div>
        ) : nueva ? (
          <div className="rounded-[8px] border border-[#ecd27a] bg-[#fff5cc] p-2">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[#6b4a00]">{titulo}: persona nueva</div>
            <div className="grid gap-1.5">
              <input autoFocus value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} placeholder="Nombre y apellidos" className={CAMPO} />
              <div className="grid grid-cols-2 gap-1.5">
                <input value={nueva.telefono} onChange={(e) => setNueva({ ...nueva, telefono: e.target.value })} placeholder="Teléfono" className={CAMPO} />
                <input value={nueva.correo} onChange={(e) => setNueva({ ...nueva, correo: e.target.value })} placeholder="Correo" className={CAMPO} />
              </div>
              {(esVecino || apartado === "competencia") && (
                <input
                  value={nueva.otro}
                  onChange={(e) => setNueva({ ...nueva, otro: e.target.value })}
                  placeholder={esVecino ? "Su papel o su piso: 3.º B, secretaria… (si no, vecino)" : "De qué empresa es"}
                  className={CAMPO}
                />
              )}
            </div>
            <button type="button" className={ENLACE + " mt-1.5"} onClick={() => setNueva(null)}>
              volver a buscar en la agenda
            </button>
          </div>
        ) : (
          <div className="relative">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca en la agenda por nombre o apellidos…" className={CAMPO + " w-full"} />
            {lista.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[220px] overflow-y-auto rounded-[8px] border border-[#cfcfcf] bg-white p-1 shadow-lg">
                {lista.map((o) => (
                  <li key={o.valor}>
                    <button type="button" onClick={() => setElegida(o)} className="block w-full rounded-[5px] px-2 py-1 text-left text-[12.5px] hover:bg-[#eef2f6]">
                      {o.texto} <span className="text-carbon/60">· {o.pista}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px]">
              {q.trim().length >= 2 && !lista.length && <span className="text-carbon/60">No hay nadie con ese nombre.</span>}
              <button type="button" className={ENLACE} onClick={() => setNueva({ nombre: q, telefono: "", correo: "", otro: "" })}>
                + Es nueva: crearla
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {esVecino && (
          <>
            <label className="flex items-center gap-1 text-[12px]">
              <input type="radio" name={`p-${apartado}`} checked={postura === "a_favor"} onChange={() => setPostura("a_favor")} /> a favor
            </label>
            <label className="flex items-center gap-1 text-[12px]">
              <input type="radio" name={`p-${apartado}`} checked={postura === "en_contra"} onChange={() => setPostura("en_contra")} /> en contra
            </label>
          </>
        )}
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={`✎ Nota (opcional): ${pista}`} className={CAMPO + " min-w-[200px] flex-1"} />
        <button type="button" className={BOTON} disabled={ocupado || (!hayPersona && !texto.trim()) || (esVecino && !postura)} onClick={apuntar}>
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
