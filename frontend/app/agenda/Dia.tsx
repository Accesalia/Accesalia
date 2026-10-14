"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type DragEvent } from "react";
import type { CitaDelDia, ConQuienNuevo } from "../../lib/citas";
import type { Opcion } from "../components/Elegir";
import { FormCita } from "./NuevaCita";
import { accionEditarCita, accionEnlaceAdjunto, accionMoverCita } from "./acciones";

// EL PAPEL DE RAYAS (Monica, 14-oct-2026): una raya cada media hora; cada cita
// en la suya, ocupando las de su duracion. Lo que se ve sin abrirla: la hora, el
// asunto y el PARA QUE. Al pincharla se despliega su ficha (de que es, con quien,
// donde, notas y adjuntos). Hecha a mano, sin paquete.
//
// Dos vistas: el DIA y la SEMANA (siete columnas; en la semana la ficha se abre
// en una ventana, porque en una columna no cabe). En las dos se crea pinchando una
// raya, y se mueve una cita ARRASTRANDOLA a otra raya u otro dia (Monica,
// 14-oct-2026). En el movil se mueve abriendola y cambiando fecha y hora.

/** Una cita con su dia ("AAAA-MM-DD") y sus minutos desde las 00:00, en Madrid. */
export type CitaEnRaya = CitaDelDia & { dia: string; desde: number; hasta: number };

/** Para tocar la agenda (crear, editar, mover). Sin esto, solo se mira. */
export type Editable = { deQuien: string; personas: Opcion[] };

const RAYA = 44; // alto de media hora, en px
const MEDIA = 30;

const hhmm = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
const hhmm0 = (min: number) => hhmm(min).padStart(5, "0");

/** El papel va de 8:00 a 20:00, y se alarga si hay citas antes o despues. */
function margenes(citas: CitaEnRaya[]) {
  const primera = Math.min(8 * 60, ...citas.map((c) => Math.floor(c.desde / MEDIA) * MEDIA));
  const ultima = Math.min(24 * 60, Math.max(20 * 60, ...citas.map((c) => Math.ceil(c.hasta / MEDIA) * MEDIA)));
  return { primera, ultima };
}

/** Las citas que se pisan van juntas, una al lado de otra. */
function enGrupos(citas: CitaEnRaya[]) {
  const grupos: { desde: number; hasta: number; citas: CitaEnRaya[] }[] = [];
  for (const c of [...citas].sort((a, b) => a.desde - b.desde)) {
    const g = grupos.at(-1);
    if (g && c.desde < g.hasta) {
      g.citas.push(c);
      g.hasta = Math.max(g.hasta, c.hasta);
    } else grupos.push({ desde: c.desde, hasta: c.hasta, citas: [c] });
  }
  return grupos;
}

function Hora({ min }: { min: number }) {
  const enPunto = min % 60 === 0;
  return (
    <div style={{ height: RAYA }} className={"pr-3 pt-1 text-right tabular-nums " + (enPunto ? "text-[13px] font-bold text-carbon/80" : "text-[11px] text-carbon/65")}>
      {hhmm(min)}
    </div>
  );
}

// ------------------------------------------------------------ la ficha

const ENLACE = "font-semibold text-lima-dark underline decoration-lima/40 underline-offset-2 hover:decoration-lima-dark";

function Adjunto({ a, oppId }: { a: CitaDelDia["adjuntos"][number]; oppId: string | null }) {
  const href = a.tipo === "hoja" && oppId ? `/comercial/hoja-encargo?opp=${oppId}` : a.tipo === "viabilidad" ? `/viabilidades/${a.id}` : null;
  const caja = "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-semibold";
  const vivo = caja + " border-lima/60 bg-lima-soft text-lima-dark hover:border-lima-dark";
  if (href) return <Link href={href} className={vivo}>📄 {a.nombre}</Link>;
  // Un fichero del almacen se abre con un enlace firmado que caduca: se pide al pulsar.
  if (a.tipo === "fichero")
    return (
      <button
        type="button"
        className={vivo}
        onClick={async () => {
          const ventana = window.open("", "_blank");
          const url = await accionEnlaceAdjunto(a.id).catch(() => null);
          if (url && ventana) ventana.location.href = url;
          else ventana?.close();
        }}
      >
        📄 {a.nombre}
      </button>
    );
  return (
    <span title="Abrir este adjunto desde la agenda está por montar" className={caja + " border-lima/30 bg-white text-lima-dark/70"}>📄 {a.nombre}</span>
  );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-[80px] shrink-0 pt-0.5 text-[11px] font-bold uppercase tracking-wide text-carbon/70">{etiqueta}</span>
      <div className="min-w-0 flex-1 text-[14px] text-carbon/90">{children}</div>
    </div>
  );
}

/** Con quien, como lo pide la accion de guardar: los de la agenda por su id, los
 *  escritos a mano con lo escrito. */
export function conQuienDeVuelta(c: CitaDelDia): ConQuienNuevo[] {
  return c.conQuien.map((p) =>
    p.tipo === "a_mano" ? { tipo: "a_mano", nombre: p.nombre, telefono: p.telefono, papel: p.papel } : { tipo: p.tipo, id: p.id, papel: p.papel },
  );
}

/** Lo que se ve al abrir una cita, con sus botones si se puede tocar. */
function Ficha({ c, alEditar }: { c: CitaEnRaya; alEditar?: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function ponerEstado(estado: CitaDelDia["estado"]) {
    setOcupado(true);
    setError(null);
    const r = await accionEditarCita(c.id, {
      local: `${c.dia}T${hhmm0(c.desde)}`,
      minutos: c.minutos,
      asunto: c.asunto,
      paraQue: c.paraQue,
      direccion: c.direccion ?? "",
      notas: c.notas,
      conQuien: conQuienDeVuelta(c),
      estado,
    }).catch((e: Error) => ({ ok: false as const, error: e.message }));
    setOcupado(false);
    if (!r.ok) return setError(r.error);
    router.refresh();
  }

  const boton = "rounded-lg border border-black/10 bg-white px-3 py-1 text-[12px] font-semibold text-carbon/75 hover:border-lima hover:text-carbon disabled:opacity-50";
  return (
    <div className="space-y-2 rounded-xl border border-black/10 bg-white p-3">
      {c.deQue && (
        <Dato etiqueta="De qué">
          {c.deQue.tipo === "opp" ? (
            <Link href={`/comercial/oportunidades/${c.deQue.id}`} className={ENLACE}>
              {c.deQue.texto}
            </Link>
          ) : (
            c.deQue.texto
          )}
          {c.deQue.codigo && <span className="ml-2 text-[12px] text-carbon/65">{c.deQue.codigo}</span>}
        </Dato>
      )}
      <Dato etiqueta="Con quién">
        {c.conQuien.length === 0 ? (
          <span className="text-amber-700/70">por completar</span>
        ) : (
          <ul className="space-y-0.5">
            {c.conQuien.map((p, i) => (
              <li key={i}>
                <span className="font-semibold">{p.nombre}</span>
                {p.papel && <span className="text-carbon/70">, {p.papel.toLowerCase()}</span>}
                {p.telefono && (
                  <a href={`tel:${p.telefono.replace(/\s/g, "")}`} className={"ml-2 tabular-nums " + ENLACE}>
                    {p.telefono}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Dato>
      <Dato etiqueta="Dónde">
        {c.direccion ? (
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.direccion)}`} target="_blank" rel="noreferrer" className={ENLACE}>
            {c.direccion}
          </a>
        ) : (
          <span className="text-amber-700/70">por completar</span>
        )}
      </Dato>
      {c.notas && (
        <Dato etiqueta="Notas">
          <p className="whitespace-pre-line">{c.notas}</p>
        </Dato>
      )}
      {c.adjuntos.length > 0 && (
        <Dato etiqueta="Adjuntos">
          <div className="flex flex-wrap gap-1.5">
            {c.adjuntos.map((a) => (
              <Adjunto key={a.tipo + a.id} a={a} oppId={c.oportunidadId} />
            ))}
          </div>
        </Dato>
      )}
      {c.origen === "app" && <p className="text-[12px] text-carbon/65">La apuntó la app.</p>}
      {alEditar && (
        <div className="flex flex-wrap items-center gap-2 border-t border-black/5 pt-2">
          <button type="button" onClick={alEditar} className={boton}>Editar</button>
          {c.estado !== "hecha" && (
            <button type="button" disabled={ocupado} onClick={() => ponerEstado("hecha")} className={boton}>✓ Hecha</button>
          )}
          {c.estado !== "anulada" && (
            <button type="button" disabled={ocupado} onClick={() => ponerEstado("anulada")} className={boton}>Anular</button>
          )}
          {c.estado !== "pendiente" && (
            <button type="button" disabled={ocupado} onClick={() => ponerEstado("pendiente")} className={boton}>Volver a pendiente</button>
          )}
          {error && <span className="text-[12px] text-alerta">{error}</span>}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------ como se ve una cita

function tonos(c: CitaDelDia) {
  return c.estado === "anulada"
    ? "border-l-carbon/25 bg-white/70 opacity-60"
    : c.estado === "hecha"
      ? "border-l-carbon/40 bg-hueso"
      : "border-l-lima bg-lima-soft";
}

function Cabecilla({ c }: { c: CitaEnRaya }) {
  return (
    <>
      <span className="tabular-nums">{hhmm(c.desde)}–{hhmm(c.hasta % (24 * 60))}</span>
      <span>· {c.tipoNombre}</span>
      {c.estado === "hecha" && <span className="text-lima-dark">· ✓ hecha</span>}
      {c.estado === "anulada" && <span className="text-alerta">· anulada</span>}
    </>
  );
}

/** Arrastrar una cita: lleva su id; al soltarla en una raya, se mueve ahi. */
const AL_COGER = (c: CitaEnRaya) => (e: DragEvent) => {
  e.dataTransfer.setData("text/x-cita", c.id);
  e.dataTransfer.effectAllowed = "move";
};

/** La cita en la vista de DIA: se despliega en su sitio. */
function CitaDia({ c, editable, alEditar }: { c: CitaEnRaya; editable: boolean; alEditar: () => void }) {
  const [abierta, setAbierta] = useState(false);
  const anulada = c.estado === "anulada";
  return (
    <div
      draggable={editable}
      onDragStart={AL_COGER(c)}
      style={{ minHeight: Math.max(1, Math.ceil((c.hasta - c.desde) / MEDIA)) * RAYA - 4 }}
      className={"min-w-0 flex-1 rounded-lg border border-black/10 border-l-4 shadow-sm " + tonos(c) + (editable ? " cursor-grab active:cursor-grabbing" : "")}
    >
      <button type="button" onClick={() => setAbierta(!abierta)} aria-expanded={abierta} className="block w-full px-3 py-1.5 text-left">
        <div className="flex items-baseline gap-2 text-[11px] font-bold uppercase tracking-wide text-carbon/70">
          <Cabecilla c={c} />
          <span className="ml-auto text-[14px] leading-none text-carbon/65">{abierta ? "▲" : "▼"}</span>
        </div>
        <p className={"text-[15px] font-bold leading-snug text-carbon " + (anulada ? "line-through" : "")}>{c.asunto}</p>
        <p className={"text-[14px] leading-snug text-carbon/85 " + (anulada ? "line-through" : "")}>{c.paraQue}</p>
      </button>
      {abierta && (
        <div className="mx-3 mb-3 mt-1">
          <Ficha c={c} alEditar={editable ? alEditar : undefined} />
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------ lo comun a las dos vistas

type Ventana = { nueva: { dia: string; hora: string } } | { editar: CitaEnRaya } | { ver: CitaEnRaya } | null;

function useAgenda(citas: CitaEnRaya[], editable?: Editable) {
  const router = useRouter();
  const [ventana, setVentana] = useState<Ventana>(null);
  const [moviendo, setMoviendo] = useState<string | null>(null);

  const pinchar = (dia: string, min: number) => editable && setVentana({ nueva: { dia, hora: hhmm0(min) } });
  // Soltar una cita arrastrada en una raya: se mueve ahi, con su misma duracion.
  const soltar = (dia: string, min: number) => async (e: DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/x-cita");
    const c = citas.find((x) => x.id === id);
    if (!c || (c.dia === dia && c.desde === min)) return;
    setMoviendo(null);
    const r = await accionMoverCita(id, `${dia}T${hhmm0(min)}`).catch((x: Error) => ({ ok: false as const, error: x.message }));
    if (!r.ok) window.alert(`No se ha podido mover la cita: ${r.error}`);
    router.refresh();
  };
  const raya = (dia: string, min: number) =>
    editable
      ? {
          onClick: () => pinchar(dia, min),
          onDragOver: (e: DragEvent) => {
            if (!e.dataTransfer.types.includes("text/x-cita")) return;
            e.preventDefault();
            setMoviendo(`${dia}|${min}`);
          },
          onDragLeave: () => setMoviendo((m) => (m === `${dia}|${min}` ? null : m)),
          onDrop: soltar(dia, min),
          title: `Nueva cita a las ${hhmm(min)}`,
          className: "cursor-pointer transition hover:bg-lima-soft/60 " + (moviendo === `${dia}|${min}` ? "bg-lima/30" : ""),
        }
      : { className: "" };

  const ventanas = (
    <>
      {editable && ventana && "nueva" in ventana && (
        <FormCita dia={ventana.nueva.dia} hora={ventana.nueva.hora} deQuien={editable.deQuien} personas={editable.personas} alCerrar={() => setVentana(null)} />
      )}
      {editable && ventana && "editar" in ventana && (
        <FormCita
          dia={ventana.editar.dia}
          hora={hhmm0(ventana.editar.desde)}
          deQuien={editable.deQuien}
          personas={editable.personas}
          cita={ventana.editar}
          alCerrar={() => setVentana(null)}
        />
      )}
      {ventana && "ver" in ventana && (
        <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-carbon/40 px-4 py-10" onMouseDown={(e) => e.target === e.currentTarget && setVentana(null)}>
          <div className={"w-full max-w-[620px] rounded-2xl border border-black/10 border-l-4 p-4 shadow-xl " + tonos(ventana.ver)}>
            <div className="flex items-baseline gap-2 text-[11px] font-bold uppercase tracking-wide text-carbon/70">
              <Cabecilla c={ventana.ver} />
              <button type="button" onClick={() => setVentana(null)} className="ml-auto rounded-lg border border-black/10 bg-white px-3 py-1 text-[12px] font-semibold normal-case tracking-normal text-carbon/70 hover:text-carbon">
                Cerrar
              </button>
            </div>
            <p className="mt-1 text-[17px] font-bold leading-snug text-carbon">{ventana.ver.asunto}</p>
            <p className="mb-3 text-[15px] leading-snug text-carbon/85">{ventana.ver.paraQue}</p>
            <Ficha c={ventana.ver} alEditar={editable ? () => setVentana({ editar: (ventana as { ver: CitaEnRaya }).ver }) : undefined} />
          </div>
        </div>
      )}
    </>
  );
  return { raya, setVentana, ventanas };
}

// ------------------------------------------------------------ el dia

export function Dia({ dia, citas, editable }: { dia: string; citas: CitaEnRaya[]; editable?: Editable }) {
  const { raya, setVentana, ventanas } = useAgenda(citas, editable);
  const { primera, ultima } = margenes(citas);
  const grupos = enGrupos(citas);

  const filas: React.ReactNode[] = [];
  for (let t = primera; t < ultima; ) {
    const g = grupos.find((x) => x.desde >= t && x.desde < t + MEDIA);
    if (!g) {
      const r = raya(dia, t);
      filas.push(
        <div key={t} {...r} className={"grid grid-cols-[64px_1fr] border-b border-ajeno/20 " + r.className}>
          <Hora min={t} />
          <div />
        </div>,
      );
      t += MEDIA;
      continue;
    }
    // Pinchar (o soltar) en la hora de una raya ocupada tambien vale.
    const fin = Math.max(t + MEDIA, Math.ceil(g.hasta / MEDIA) * MEDIA);
    const horas = [];
    for (let h = t; h < fin; h += MEDIA)
      horas.push(
        <div key={h} {...raya(dia, h)}>
          <Hora min={h} />
        </div>,
      );
    filas.push(
      <div key={t} className="relative grid grid-cols-[64px_1fr] border-b border-ajeno/20">
        {/* las rayas de dentro siguen dibujadas por detras de la cita */}
        <div className="pointer-events-none absolute inset-x-0 top-0">
          {horas.slice(1).map((_, i) => (
            <div key={i} style={{ top: (i + 1) * RAYA }} className="absolute inset-x-0 border-t border-ajeno/20" />
          ))}
        </div>
        <div>{horas}</div>
        <div className="relative flex gap-2 py-0.5 pr-2">
          {g.citas.map((c) => (
            <CitaDia key={c.id} c={c} editable={!!editable} alEditar={() => setVentana({ editar: c })} />
          ))}
        </div>
      </div>,
    );
    t = fin;
  }

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
      {/* el margen del cuaderno */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-[64px] border-l-2 border-alerta/30" />
        <div className="border-b border-ajeno/20" style={{ height: 10 }} />
        {filas}
      </div>
      {ventanas}
    </section>
  );
}

// ------------------------------------------------------------ la semana

const DIA_CORTO = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", timeZone: "UTC" });

/** Carriles: las citas que se pisan en un mismo dia se reparten el ancho. */
function enCarriles(citas: CitaEnRaya[]) {
  const sitio = new Map<string, { carril: number; carriles: number }>();
  for (const g of enGrupos(citas)) {
    const finDe: number[] = [];
    for (const c of g.citas) {
      let k = finDe.findIndex((f) => f <= c.desde);
      if (k < 0) k = finDe.push(0) - 1;
      finDe[k] = c.hasta;
      sitio.set(c.id, { carril: k, carriles: 0 });
    }
    for (const c of g.citas) sitio.get(c.id)!.carriles = finDe.length;
  }
  return sitio;
}

export function Semana({
  dias,
  hoy,
  enlacesDia,
  citas,
  editable,
}: {
  /** Los siete dias, de lunes a domingo. */
  dias: string[];
  hoy: string;
  /** A donde lleva pinchar la cabecera de cada dia: a su vista de dia. */
  enlacesDia: string[];
  citas: CitaEnRaya[];
  editable?: Editable;
}) {
  const { raya, setVentana, ventanas } = useAgenda(citas, editable);
  const { primera, ultima } = margenes(citas);
  const medias: number[] = [];
  for (let t = primera; t < ultima; t += MEDIA) medias.push(t);

  return (
    <section className="mt-5 overflow-x-auto rounded-2xl border border-black/10 bg-white shadow-sm">
      <div className="min-w-[760px]">
        {/* las cabeceras de los dias */}
        <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-black/10">
          <div />
          {dias.map((d, i) => (
            <Link
              key={d}
              href={enlacesDia[i]}
              className={
                "border-l border-black/5 px-2 py-2 text-center text-[12px] font-bold uppercase tracking-wide first-letter:uppercase hover:bg-lima-soft " +
                (d === hoy ? "bg-lima-soft text-lima-dark" : "text-carbon/75")
              }
            >
              {DIA_CORTO.format(new Date(`${d}T12:00:00Z`))}
            </Link>
          ))}
        </div>

        <div className="relative grid grid-cols-[64px_repeat(7,minmax(0,1fr))]">
          <div>
            {medias.map((t) => (
              <div key={t} className="border-b border-ajeno/20">
                <Hora min={t} />
              </div>
            ))}
          </div>
          {dias.map((d) => {
            const delDia = citas.filter((c) => c.dia === d);
            const sitio = enCarriles(delDia);
            return (
              <div key={d} className={"relative border-l border-black/10 " + (d === hoy ? "bg-lima-soft/30" : "")}>
                {medias.map((t) => {
                  const r = raya(d, t);
                  return <div key={t} {...r} style={{ height: RAYA + 1 }} className={"border-b border-ajeno/20 " + r.className} />;
                })}
                {delDia.map((c) => {
                  const s = sitio.get(c.id)!;
                  const alto = Math.max(RAYA / 2, ((c.hasta - c.desde) / MEDIA) * (RAYA + 1) - 3);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      draggable={!!editable}
                      onDragStart={AL_COGER(c)}
                      onClick={() => setVentana({ ver: c })}
                      title={`${c.asunto} — ${c.paraQue}`}
                      style={{
                        top: ((c.desde - primera) / MEDIA) * (RAYA + 1) + 1,
                        height: alto,
                        left: `calc(${(s.carril / s.carriles) * 100}% + 2px)`,
                        width: `calc(${100 / s.carriles}% - 4px)`,
                      }}
                      className={
                        "absolute flex flex-col justify-start overflow-hidden rounded-md border border-black/10 border-l-4 px-1.5 py-0.5 text-left shadow-sm hover:z-10 hover:shadow-md " +
                        tonos(c) +
                        (editable ? " cursor-grab active:cursor-grabbing" : "")
                      }
                    >
                      <p className="w-full shrink-0 text-[10px] font-bold tabular-nums text-carbon/70">{hhmm(c.desde)}</p>
                      <p className={"w-full shrink-0 truncate text-[12px] font-bold leading-tight text-carbon " + (c.estado === "anulada" ? "line-through" : "")}>{c.asunto}</p>
                      <p className="w-full line-clamp-3 text-[11px] leading-tight text-carbon/80">{c.paraQue}</p>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {ventanas}
    </section>
  );
}
