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

// ------------------------------------------------------- la serie de intentos

/** EL PATRON QUE SE REPITE (Monica, 29-sep-2026).
 *
 *  Hay dos clases de cosa en esta pantalla y mezclarlas es lo que la hacia
 *  farragosa:
 *
 *    - LAS FASES: diez casillas, una de cada, en linea. Dicen POR DONDE VA.
 *    - LAS COSAS CON VIDA PROPIA: la junta, la hoja de encargo, la viabilidad,
 *      el 3D. De cada una puede haber VARIAS, con su fecha y su estado, y se
 *      rehacen. Dicen QUE HAY Y COMO ESTA.
 *
 *  Una casilla solo sabe hecho / no hecho. Debajo de la casilla "junta" caben
 *  tres juntas: la que se aplazo, la que pidio mas presupuestos y la que salio
 *  favorable. Toda esa historia -los dos plantones- se perderia si solo se
 *  guardara la ultima. Y es informacion de venta.
 *
 *  UN INTENTO = UNA LINEA. Por eso cabe: tres juntas son tres lineas.
 *  Y se dibuja IGUAL para las cuatro, asi que se aprende una vez. */
export function Serie({
  titulo,
  pie,
  intentos,
  estados,
  guardar,
  vacio,
}: {
  titulo: string;
  pie: string;
  intentos: {
    id: string;
    fecha: string | null;
    estado: string | null;
    detalle: string | null;
    marca: boolean;
    marcaTexto: string;
  }[];
  estados: readonly { valor: string; texto: string }[];
  /** null = uno nuevo. */
  guardar: (id: string | null, fd: FormData) => Promise<void>;
  vacio: string;
}) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const dd = (f: string | null) => (f ? f.split("-").reverse().join("/") : "sin fecha");

  return (
    <section className={CAJA + " p-4"}>
      <Titulo extra={<span className="text-[11px] text-carbon/50">{pie}</span>}>{titulo}</Titulo>

      {intentos.length === 0 ? (
        <p className="py-2 text-[13px] text-carbon/50">{vacio}</p>
      ) : (
        <ol className="mb-3">
          {intentos.map((i, n) => (
            <li key={i.id} className="border-t border-black/5 first:border-t-0">
              {/* Una linea. Lo de dentro solo se abre si se toca. */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="w-5 shrink-0 text-[12px] font-bold tabular-nums text-carbon/35">{n + 1}</span>
                <span className="w-[92px] shrink-0 text-[13px] font-semibold tabular-nums text-carbon">{dd(i.fecha)}</span>
                <span className="shrink-0 rounded-full border border-black/10 bg-hueso px-2 py-0.5 text-[11px] font-bold uppercase text-carbon/70">
                  {estados.find((e) => e.valor === i.estado)?.texto ?? "—"}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-carbon/65">{i.detalle ?? ""}</span>
                <span className="w-[72px] shrink-0 text-right">
                  {i.marca && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold uppercase text-amber-700">
                      {i.marcaTexto}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setAbierto(abierto === i.id ? null : i.id)}
                  className="w-[52px] shrink-0 text-right text-[11px] font-semibold text-[#2B6CB0] hover:underline"
                >
                  {abierto === i.id ? "cerrar" : "cambiar"}
                </button>
              </div>
              {abierto === i.id && (
                <form action={guardar.bind(null, i.id)} className="pb-3 pl-8">
                  <Campos estados={estados} v={i} />
                </form>
              )}
            </li>
          ))}
        </ol>
      )}

      {/* Y otro mas. Aplazada, piden mas presupuestos, vuelven a votar. */}
      <details>
        <summary className="cursor-pointer list-none text-[12px] font-bold uppercase tracking-wide text-[#2B6CB0]">
          + Añadir otra
        </summary>
        <form action={guardar.bind(null, null)} className="mt-2">
          <Campos estados={estados} v={null} />
        </form>
      </details>
    </section>
  );
}

function Campos({
  estados,
  v,
}: {
  estados: readonly { valor: string; texto: string }[];
  v: { fecha: string | null; estado: string | null; detalle: string | null; marca: boolean } | null;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="block w-[145px]">
        <span className={ROTULO}>Cuándo</span>
        <input type="date" name="fecha" defaultValue={v?.fecha ?? ""} className={CAMPO + " mt-1"} />
      </label>
      <label className="block w-[210px]">
        <span className={ROTULO}>Cómo salió</span>
        <select name="resultado" defaultValue={v?.estado ?? "pendiente"} className={CAMPO + " mt-1"}>
          {estados.map((e) => (
            <option key={e.valor} value={e.valor}>{e.texto}</option>
          ))}
        </select>
      </label>
      <label className="block min-w-[240px] flex-1">
        <span className={ROTULO}>Qué pasó exactamente</span>
        <input name="detalle" defaultValue={v?.detalle ?? ""} className={CAMPO + " mt-1"} />
      </label>
      <label className="flex h-[34px] cursor-pointer items-center gap-2">
        <input type="checkbox" name="seguimiento" defaultChecked={v?.marca ?? false} className="size-4 accent-[#237812]" />
        <span className="text-[13px] text-carbon">Perseguirla</span>
      </label>
      <input type="hidden" name="celebrada" value="" />
      <button className={BOTON}>Guardar</button>
    </div>
  );
}
