"use client";

import { useState } from "react";
import type { HitoGestion, TipoGestion } from "../../../../lib/gestionOportunidad";
import { BOTON, CAJA, CAMPO, ROTULO } from "./estilo";

// LAS PIEZAS DE LA PANTALLA DE GESTION (Monica, 28-sep-2026).
//
// Cada bloque se guarda SOLO. Una pantalla con un boton "guardar" abajo del todo
// obliga a repasar seis bloques para cambiar una fecha; aqui se toca lo que se
// toca y se guarda ahi mismo.

export function Titulo({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-[15px] font-bold text-carbon">{children}</h2>
      {extra}
    </div>
  );
}

// -------------------------------------------------------------- una fase

const TINTA_ESTADO: Record<string, string> = {
  pendiente: "border-carbon/20 bg-white text-carbon/60",
  en_curso: "border-[#2B6CB0] bg-[#2B6CB0] text-white",
  hecho: "border-[#237812] bg-[#237812] text-white",
  no_aplica: "border-carbon/20 bg-carbon/10 text-carbon/45",
};

const QUIEN: Record<string, string> = {
  comercial: "lo haces tú",
  arquitecto: "lo hace el arquitecto",
  tecnico_escaneo: "lo hace quien escanea",
  tecnico_3d: "lo hace quien monta el 3D",
};

/** UNA FASE. Es la pieza central de la pantalla: hasta hoy los diez hitos se
 *  creaban con la oportunidad y ahi se quedaban, porque no habia nada que los
 *  tocara. Pedir el 3D es esto: ponerlo EN CURSO y decir a quien se le pide. */
export function Fase({
  h,
  estados,
  equipo,
  guardar,
}: {
  h: HitoGestion;
  estados: readonly { valor: string; texto: string }[];
  equipo: { valor: string; texto: string }[];
  guardar: (fd: FormData) => Promise<void>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState(h.estado);
  const ajeno = !!h.rolQuien && h.rolQuien !== "comercial";

  return (
    <form
      action={guardar}
      className={"border-t border-black/5 px-4 py-3 first:border-t-0 " + (h.estado === "no_aplica" ? "bg-black/[0.02]" : "")}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="w-6 shrink-0 text-[12px] font-bold tabular-nums text-carbon/40">{h.numero ?? "·"}</span>
        <div className="min-w-[190px] flex-1">
          <div className={"text-[14px] font-semibold " + (h.estado === "no_aplica" ? "text-carbon/40" : "text-carbon")}>
            {h.nombre}
          </div>
          {ajeno && <div className="text-[11px] text-[#2B6CB0]">{QUIEN[h.rolQuien!] ?? h.rolQuien}</div>}
        </div>

        {/* Los cuatro estados, a la vista. Un desplegable esconde justo lo que
            hay que ver de un vistazo: en que esta cada fase. */}
        <div className="flex flex-wrap gap-1">
          {estados.map((e) => (
            <label key={e.valor} className="cursor-pointer">
              <input
                type="radio"
                name="estado"
                value={e.valor}
                checked={estado === e.valor}
                onChange={() => setEstado(e.valor)}
                className="peer sr-only"
              />
              <span
                className={
                  "inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold transition peer-focus-visible:ring-2 peer-focus-visible:ring-lima " +
                  (estado === e.valor ? TINTA_ESTADO[e.valor] : "border-carbon/15 bg-white text-carbon/45 hover:border-carbon/35")
                }
              >
                {e.texto}
              </span>
            </label>
          ))}
        </div>

        <button type="button" onClick={() => setAbierto((v) => !v)} className="text-[11px] font-semibold text-[#2B6CB0] hover:underline">
          {abierto ? "cerrar" : "fecha, quién, enlace…"}
        </button>
        <button type="submit" className={BOTON}>Guardar</button>
      </div>

      {/* Lo de dentro solo estorba hasta que hace falta. */}
      {abierto ? (
        <div className="mt-3 flex flex-wrap gap-3 pl-9">
          <label className="block w-[150px]">
            <span className={ROTULO}>Cuándo</span>
            <input type="date" name="fecha" defaultValue={h.fecha ?? ""} className={CAMPO + " mt-1"} />
          </label>
          <label className="block w-[210px]">
            <span className={ROTULO}>Quién lo hace</span>
            <select name="responsable" defaultValue={h.responsableId ?? ""} className={CAMPO + " mt-1"}>
              <option value="">— sin asignar —</option>
              {equipo.map((p) => (
                <option key={p.valor} value={p.valor}>{p.texto}</option>
              ))}
            </select>
          </label>
          <label className="block min-w-[240px] flex-1">
            <span className={ROTULO}>Enlace {h.clave === "polycam" ? "al escaneo / Polycam" : "al documento"}</span>
            <input name="enlace" defaultValue={h.enlace ?? ""} placeholder="https://…" className={CAMPO + " mt-1"} />
          </label>
          <label className="block w-full">
            <span className={ROTULO}>Notas</span>
            <input name="notas" defaultValue={h.notas ?? ""} className={CAMPO + " mt-1"} />
          </label>
        </div>
      ) : (
        <>
          {/* Sin abrir, los valores viajan igual: si no, guardar borraria lo que
              no se ve. */}
          <input type="hidden" name="fecha" value={h.fecha ?? ""} />
          <input type="hidden" name="responsable" value={h.responsableId ?? ""} />
          <input type="hidden" name="enlace" value={h.enlace ?? ""} />
          <input type="hidden" name="notas" value={h.notas ?? ""} />
          {(h.fecha || h.responsableId || h.enlace || h.notas) && (
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 pl-9 text-[12px] text-carbon/60">
              {h.fecha && <span>{h.fecha.split("-").reverse().join("/")}</span>}
              {h.responsableId && <span>{equipo.find((e) => e.valor === h.responsableId)?.texto ?? "asignado"}</span>}
              {h.enlace && (
                <a href={h.enlace} target="_blank" rel="noreferrer" className="font-semibold text-[#2B6CB0] hover:underline">
                  ver el enlace
                </a>
              )}
              {h.notas && <span className="text-carbon/50">{h.notas}</span>}
            </div>
          )}
        </>
      )}
    </form>
  );
}

// --------------------------------------------------------- qué contratan

/** El catalogo de 34 tipos, con su jerarquia. Solo se pueden marcar los
 *  CONTRATABLES: "accesibilidad" es una familia, no algo que se contrate. */
export function QueContratan({
  tipos,
  elegidos,
  guardar,
}: {
  tipos: TipoGestion[];
  elegidos: string[];
  guardar: (fd: FormData) => Promise<void>;
}) {
  const familias = Array.from(new Set(tipos.map((t) => t.padre ?? "Sueltos")));
  return (
    <form action={guardar} className={CAJA + " p-4"}>
      <Titulo extra={<button type="submit" className={BOTON}>Guardar</button>}>Qué contratan</Titulo>
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {familias.map((f) => {
          const dentro = tipos.filter((t) => (t.padre ?? "Sueltos") === f && t.contratable);
          if (dentro.length === 0) return null;
          return (
            <div key={f}>
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-carbon/45">{f}</div>
              <div className="flex flex-col gap-1.5">
                {dentro.map((t) => (
                  <label key={t.id} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      name="tipo"
                      value={t.id}
                      defaultChecked={elegidos.includes(t.id)}
                      className="size-4 shrink-0 accent-[#237812]"
                    />
                    <span className="text-[13px] text-carbon">{t.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </form>
  );
}
