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

const QUIEN: Record<string, string> = {
  comercial: "lo haces tú",
  arquitecto: "lo hace el arquitecto",
  tecnico_escaneo: "lo hace quien escanea",
  tecnico_3d: "lo hace quien monta el 3D",
};

/** LAS DIEZ FASES EN UNA LINEA, y abierta solo la que toca.
 *
 *  La barra es la misma que ella ya lee sin pensar en las tarjetas del cuadro:
 *  verde lo hecho, azul lo que esta en marcha, gris lo que falta, y a rayas lo
 *  que no aplica. Pulsando una se abre debajo.
 *
 *  Arranca abierta por la que esta EN CURSO -o la primera pendiente-, que es la
 *  respuesta a "¿y ahora que hago?". */
export function Fases({ hitos }: { hitos: HitoGestion[] }) {
  // Las fases NO se tocan: salen solas de los datos (Monica, 9-oct-2026). Aqui
  // solo se ve por donde va, y al pulsar una, de donde sale.
  const ahora = hitos.find((h) => h.estado === "pendiente" && !h.ramal) ?? hitos[0];
  const [abierta, setAbierta] = useState<string | null>(ahora?.clave ?? null);
  const h = hitos.find((x) => x.clave === abierta) ?? null;

  const tramo = (x: HitoGestion) => {
    if (x.estado === "saltado") return "h-2 border border-dashed border-black/20 bg-transparent";
    if (x.estado === "hecho") return "h-2 bg-lima";
    if (x.clave === ahora?.clave) return "h-3.5 bg-[#2B6CB0]";
    return "h-2 bg-black/10";
  };

  return (
    <section className={CAJA + " p-4"}>
      <Titulo extra={<span className="text-[11px] text-carbon/50">Se marcan solas, con lo que va llegando</span>}>Por dónde va</Titulo>

      {/* La barra. Rejilla de columnas iguales, no flex: con flex cada tramo se
          ajusta a su texto y salen de distinto largo, que es lo que lo hacia
          parecer dentado. */}
      <div className="grid items-end gap-1" style={{ gridTemplateColumns: `repeat(${hitos.length}, minmax(0,1fr))` }}>
        {hitos.map((x) => (
          <button
            key={x.clave}
            type="button"
            onClick={() => setAbierta(abierta === x.clave ? null : x.clave)}
            title={x.nombre}
            className="flex flex-col gap-1 rounded pb-1 text-left transition hover:opacity-70"
          >
            <span className={"rounded-full " + tramo(x) + (abierta === x.clave ? " ring-2 ring-carbon/40 ring-offset-1" : "")} />
            <span
              className={
                "truncate text-[10px] leading-tight " +
                (x.estado === "saltado" ? "text-carbon/30" : abierta === x.clave ? "font-bold text-carbon" : "text-carbon/55")
              }
            >
              {x.numero ? x.numero + " · " : ""}
              {x.nombre}
            </span>
          </button>
        ))}
      </div>

      {h && (
        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-black/5 pt-3">
          <div className="text-[15px] font-bold text-carbon">
            {h.numero ? h.numero + " · " : ""}
            {h.nombre}
          </div>
          {h.rolQuien && h.rolQuien !== "comercial" && (
            <div className="text-[11px] text-[#2B6CB0]">{QUIEN[h.rolQuien] ?? h.rolQuien}</div>
          )}
          <div className="text-[13px] text-carbon/70">
            {h.estado === "hecho"
              ? `Hecho${h.fecha ? " el " + new Date(h.fecha).toLocaleDateString("es-ES") : ""}.`
              : h.estado === "saltado"
                ? "Saltado: ya se pasó a una fase posterior. Sigue abierto: si llega, se marca solo."
                : "Pendiente."}{" "}
            <span className="text-carbon/45">{DE_DONDE[h.clave] ?? ""}</span>
          </div>
        </div>
      )}
    </section>
  );
}

/** De donde sale cada fase: lo que la marca como hecha (fases_oportunidad). */
const DE_DONDE: Record<string, string> = {
  primer_contacto: "Sale de la primera nota del diario.",
  visita: "Sale del Polycam: si se recibe el escaneo, hubo visita.",
  polycam: "Sale del escaneo recibido y vinculado a sus portales.",
  viabilidad_arquitecto: "Sale de la viabilidad con su PDF generado.",
  preparacion_documentos: "Sale de la hoja de encargo generada en PDF.",
  envio_documentos: "Sale de la hoja enviada a la comunidad.",
  tresd: "Sale del 3D entregado.",
  junta: "Sale de la junta celebrada.",
  firma: "Sale de la hoja devuelta firmada.",
  cobro: "Saldrá de facturación: cuando esté pagada.",
};

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
  const marcados = tipos.filter((t) => elegidos.includes(t.id));
  const [abierto, setAbierto] = useState(elegidos.length === 0);
  return (
    <form action={guardar} className={CAJA + " p-4"}>
      <Titulo
        extra={
          <button type="button" onClick={() => setAbierto((v) => !v)} className="text-[11px] font-semibold text-[#2B6CB0] hover:underline">
            {abierto ? "cerrar" : "cambiar"}
          </button>
        }
      >
        Qué contratan
      </Titulo>

      {/* Cerrado, solo lo marcado: es una decision que se toma una vez y luego se
          consulta. Desplegado eran tres columnas de casillas siempre a la vista. */}
      {!abierto && (
        <p className="text-[13px] text-carbon">
          {marcados.length === 0 ? (
            <span className="text-carbon/45">Sin definir todavía.</span>
          ) : (
            marcados.map((t) => t.nombre).join(" · ")
          )}
        </p>
      )}

      <div className={"grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 " + (abierto ? "" : "hidden")}>
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
      {abierto && (
        <div className="mt-3 flex justify-end">
          <button type="submit" className={BOTON}>Guardar</button>
        </div>
      )}
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
