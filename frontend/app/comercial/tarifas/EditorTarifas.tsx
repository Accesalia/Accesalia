"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DatosTarifas, Forma, Precio } from "../../../lib/tarifas";
import { accionGuardarVarios, type Formulario, type Operacion } from "./acciones";

// MODIFICAR LAS TARIFAS POR BLOQUES LOGICOS (Monica, 17-oct-2026): "si toco el
// precio de SATE, que tenga a la vista TODOS los sitios donde hay SATE". Cada
// bloque enseña una columna por tarifa con sus tramos de viviendas y su casilla,
// y se guarda de una vez. Nada de tocar a trozos.

type Parte = { etiqueta?: string; bloque: string; tipos: string[]; formas: Forma[] };
type BloqueEdicion = { titulo: string; partes: Parte[] };

const SATE = ["SATE envolvente completa", "SATE fachada"];
const PRY = (titulo: string, ...tipos: string[]): BloqueEdicion => ({ titulo, partes: [{ bloque: "REDACCION PROYECTO", tipos, formas: ["fijo"] }] });
/** El SATE puede ir en € o en % del PEM (a partir de 30 viviendas). */
const PRY_PEM = (titulo: string, ...tipos: string[]): BloqueEdicion => ({ titulo, partes: [{ bloque: "REDACCION PROYECTO", tipos, formas: ["fijo", "pct_pem"] }] });
const SOLO = (titulo: string, bloque: string, formas: Forma[] = ["fijo"]): BloqueEdicion => ({ titulo, partes: [{ bloque, tipos: [], formas }] });

// EL INDICE (Monica, 17-oct-2026): area 1, proyectos (ascensor, accesibilidad,
// eficiencia, resto); area 2, servicios (DF, CFO, CAES, subvenciones...). Los
// grupos se despliegan al pincharlos.
type Grupo = { nombre: string; bloques: BloqueEdicion[] };
export const AREAS_EDICION: { area: string; grupos: Grupo[] }[] = [
  {
    area: "Proyectos",
    grupos: [
      {
        nombre: "Ascensor",
        bloques: [
          PRY("Ascensor nuevo (con derribo)", "Ascensor"),
          PRY("Bajada a cota cero", "Cota cero"),
          PRY("Cambio de puertas", "Cambio de puertas"),
          PRY("Cambio de cabina", "Cambio de cabina"),
          PRY("Añadir parada", "Añadir parada"),
          PRY("Sustitución de ascensor", "Sustitución de ascensor"),
        ],
      },
      { nombre: "Accesibilidad", bloques: [PRY("Proyectos de elevadores y plataformas", "Plataforma"), PRY("Rampa", "Rampa"), PRY("Accesibilidad en portal", "Accesibilidad portal")] },
      { nombre: "Eficiencia", bloques: [PRY_PEM("Proyecto SATE (envolvente completa y fachada)", ...SATE), PRY_PEM("Proyecto SATE solo en cubierta", "SATE cubierta"), PRY("Aerotermia", "Aerotermia"), PRY("Fotovoltaica", "Fotovoltaica")] },
      {
        nombre: "Resto",
        bloques: [
          SOLO("Memoria técnica", "MEMORIA TECNICA"),
          SOLO("Informe técnico", "INFORME TECNICO"),
          SOLO("Informe pericial", "INFORME PERICIAL"),
          SOLO("Consulta urbanística", "CONSULTA URBANISTICA"),
          SOLO("Modificación de proyecto", "MODIFICACION DE PROYECTO"),
          SOLO("Mediciones y ciego", "MEDICIONES Y CIEGO"),
          PRY("Arreglo de fachada", "Arreglo fachada"),
          PRY("Arreglo de cubierta", "Arreglo cubierta"),
          PRY("Memoria técnica valorada", "Memoria técnica valorada"),
          PRY("Otros: proyecto técnico", "Otros - proyecto técnico"),
        ],
      },
    ],
  },
  {
    area: "Servicios",
    grupos: [
      { nombre: "Dirección facultativa", bloques: [{ titulo: "DF en SATE", partes: [{ bloque: "DF", tipos: SATE, formas: ["pct_pem", "fijo"] }] }, SOLO("DF en el resto de obras", "DF", ["fijo", "pct_pem"])] },
      { nombre: "Fin de obra (CFO)", bloques: [SOLO("Certificado de fin de obra", "CERTIFICADO FIN DE OBRA")] },
      { nombre: "CSS", bloques: [SOLO("Coordinación de Seguridad y Salud (CSS)", "CSS")] },
      {
        nombre: "Subvenciones",
        bloques: [
          {
            titulo: "Tramitación de subvenciones",
            partes: [
              { etiqueta: "Documentación técnica", bloque: "DOCUMENTACION TECNICA SUBVENCIONES", tipos: [], formas: ["fijo"] },
              { etiqueta: "A éxito, del importe concedido", bloque: "TRAMITACION SUBVENCIONES", tipos: [], formas: ["pct_exito"] },
            ],
          },
        ],
      },
      { nombre: "CAES", bloques: [SOLO("Gestión de CAES", "GESTION DE CAES")] },
      { nombre: "IEE", bloques: [SOLO("Inspección Técnica del Edificio (IEE)", "IEE")] },
      { nombre: "LEE", bloques: [SOLO("Libro del Edificio Existente (LEE)", "LEE")] },
      { nombre: "CEE", bloques: [SOLO("Certificado de eficiencia energética (CEE)", "CEE")] },
      { nombre: "Licencias", bloques: [SOLO("Tramitación de licencias", "TRAMITACION LICENCIAS")] },
    ],
  },
];

const EUR = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2, useGrouping: "always" });
const UNIDAD: Record<Forma, string> = { fijo: "€", pct_pem: "%PEM", pct_exito: "%" };
const MINI = "rounded-[8px] border border-black/15 bg-white px-1.5 py-1 text-[13px] focus:border-lima focus:outline-none";
const BTN = "rounded-xl border border-black/15 bg-white px-3 py-[6px] text-[12.5px] font-semibold text-carbon/80 transition hover:border-carbon disabled:opacity-40";
const BTN_PRIM = "rounded-xl border border-lima bg-lima px-3 py-[6px] text-[12.5px] font-bold text-carbon transition hover:bg-lima-dark hover:text-white disabled:opacity-40";

/** Una fila del editor: un tramo de una parte en una tarifa. */
type Fila = { id: string; antes: Formulario | null; desde: string; hasta: string; forma: Forma; valor: string; incluye: string[]; quitar: boolean; verIncluye: boolean };
type Estado = Record<string, Fila[]>; // clave: tarifaId|parte

let n = 0;
const nuevaId = () => `n${++n}`;

export function EditorTarifas({ datos, alCerrar }: { datos: DatosTarifas; alCerrar: () => void }) {
  // EL GRUPO ELEGIDO (Monica, 17-oct-2026): el indice a la izquierda y, a la
  // derecha, solo el grupo en el que se trabaja; si se abre Subvenciones no se
  // queda abajo del todo, sale en su sitio, solo.
  const [elegido, setElegido] = useState<string>(AREAS_EDICION[0].grupos[0].nombre);
  const grupo = AREAS_EDICION.flatMap((a) => a.grupos).find((g) => g.nombre === elegido)!;
  const area = AREAS_EDICION.findIndex((a) => a.grupos.includes(grupo));
  // Cuantos precios tiene cada grupo, para el indice.
  const cuantos = (g: Grupo) =>
    g.bloques.reduce(
      (n, b) =>
        n +
        b.partes.reduce((m, p) => {
          const bid = datos.bloques.find((x) => x.codigo === p.bloque)?.id;
          const tid = p.tipos[0] ? datos.tipos.find((t) => t.nombre === p.tipos[0])?.id ?? "-" : null;
          return m + datos.precios.filter((x) => x.bloqueId === bid && (x.tipoId ?? null) === tid && (x.vigente || x.proxima)).length;
        }, 0),
      0,
    );
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#e7d27a] bg-form-nuevo/60 px-4 py-2.5">
        <p className="text-[13px] text-carbon/80">
          <b>Modificar tarifas.</b> Cada bloque, con todos los sitios donde está. Lo que guardes vale desde hoy; lo de antes queda en el historial y las hojas ya hechas no cambian.
        </p>
        <button type="button" className={BTN} onClick={alCerrar}>
          Volver a las tarifas
        </button>
      </div>
      <div className="mt-4 grid items-start gap-5 md:grid-cols-[200px_1fr]">
        {/* EL INDICE */}
        <nav className="flex flex-col gap-3 rounded-2xl border border-[#cfcfcf] bg-white p-3 md:sticky md:top-4">
          {AREAS_EDICION.map((a, i) => (
            <div key={a.area}>
              <div className="mb-1 px-2 text-[11px] font-bold uppercase tracking-[.08em] text-carbon/60">
                Área {i + 1} · {a.area}
              </div>
              {a.grupos.map((g) => {
                const n = cuantos(g);
                const este = g.nombre === elegido;
                return (
                  <Fragment key={g.nombre}>
                  <button
                    type="button"
                    onClick={() => setElegido(g.nombre)}
                    className={
                      "flex w-full items-baseline justify-between rounded-lg px-2 py-1 text-left text-[13px] transition " +
                      (este ? "bg-carbon font-semibold text-white" : "text-carbon/80 hover:bg-[#f1f1ee]")
                    }
                  >
                    <span>{g.nombre}</span>
                    <span className={"text-[11px] " + (este ? "text-white/70" : n ? "text-carbon/50" : "text-carbon/30")}>{n || "—"}</span>
                  </button>
                  {/* Lo que lleva dentro el grupo elegido: se ve sin bajar, y lleva a su bloque. */}
                  {este && g.bloques.length > 1 && (
                    <div className="mb-1 ml-3 mt-0.5 flex flex-col border-l border-black/15 pl-2">
                      {g.bloques.map((b) => (
                        <button
                          key={b.titulo}
                          type="button"
                          onClick={() => document.getElementById("bloque-" + b.titulo)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                          className="py-0.5 text-left text-[12px] text-carbon/70 hover:text-carbon"
                        >
                          {b.titulo}
                        </button>
                      ))}
                    </div>
                  )}
                  </Fragment>
                );
              })}
            </div>
          ))}
        </nav>
        {/* EL GRUPO ELEGIDO, solo */}
        <div className="flex flex-col gap-3">
          <div className="text-[12px] font-bold uppercase tracking-[.1em] text-carbon/60">
            Área {area + 1} · {AREAS_EDICION[area].area} · <span className="text-carbon">{grupo.nombre}</span>
          </div>
          {grupo.bloques.map((b) => (
            <div key={grupo.nombre + b.titulo} id={"bloque-" + b.titulo} className="scroll-mt-4">
              <TarjetaBloque bloque={b} datos={datos} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TarjetaBloque({ bloque, datos }: { bloque: BloqueEdicion; datos: DatosTarifas }) {
  const router = useRouter();
  const [ocupado, empezar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const bloqueId = (codigo: string) => datos.bloques.find((x) => x.codigo === codigo)?.id ?? "";
  const tipoId = (nombre: string) => datos.tipos.find((t) => t.nombre === nombre)?.id ?? "";
  const nombre = (id: string) => datos.bloques.find((x) => x.id === id)?.nombre ?? "?";

  const deDatos = (): Estado => {
    const e: Estado = {};
    for (const t of datos.tarifas)
      bloque.partes.forEach((p, i) => {
        const b = bloqueId(p.bloque);
        const tipo = p.tipos[0] ? tipoId(p.tipos[0]) : null;
        e[`${t.id}|${i}`] = datos.precios
          .filter((x: Precio) => x.tarifaId === t.id && x.bloqueId === b && (x.tipoId ?? null) === tipo && (x.vigente || x.proxima))
          .sort((a, c) => (a.desde ?? -1) - (c.desde ?? -1))
          .map((x) => {
            const v = x.vigente ?? x.proxima!;
            const antes: Formulario = {
              tarifaId: t.id,
              bloqueId: b,
              tipoId: tipo ?? "",
              desde: x.desde == null ? "" : String(x.desde),
              hasta: x.hasta == null ? "" : String(x.hasta),
              forma: v.forma,
              valor: EUR.format((v.forma === "fijo" ? v.importe : v.porcentaje) ?? 0),
              incluye: v.incluye,
              nota: v.nota ?? "",
            };
            return { id: x.clave, antes, desde: antes.desde, hasta: antes.hasta, forma: antes.forma, valor: antes.valor, incluye: antes.incluye, quitar: false, verIncluye: false };
          });
      });
    return e;
  };
  const [est, setEst] = useState<Estado>(deDatos);

  const cambiada = (f: Fila) =>
    f.quitar ||
    !f.antes ||
    f.desde !== f.antes.desde ||
    f.hasta !== f.antes.hasta ||
    f.forma !== f.antes.forma ||
    f.valor.trim() !== f.antes.valor ||
    f.incluye.join() !== f.antes.incluye.join();
  const sucio = Object.values(est).some((fs) => fs.some((f) => (f.antes ? cambiada(f) : f.valor.trim() !== "")));

  const poner = (clave: string, id: string, c: Partial<Fila>) => setEst((e) => ({ ...e, [clave]: e[clave].map((f) => (f.id === id ? { ...f, ...c } : f)) }));
  const añadir = (clave: string, forma: Forma) =>
    setEst((e) => ({ ...e, [clave]: [...e[clave], { id: nuevaId(), antes: null, desde: "", hasta: "", forma, valor: "", incluye: [], quitar: false, verIncluye: false }] }));

  const guardar = () =>
    empezar(async () => {
      setMsg(null);
      const ops: Operacion[] = [];
      for (const t of datos.tarifas)
        bloque.partes.forEach((p, i) => {
          const tipos = p.tipos.length ? p.tipos.map(tipoId) : [""];
          for (const f of est[`${t.id}|${i}`]) {
            if (f.antes ? !cambiada(f) : !f.valor.trim()) continue;
            // Una fila nueva que se quita antes de guardar: no hay nada que hacer.
            if (!f.antes && f.quitar) continue;
            // El mismo precio, en cada "que se hace" del bloque (SATE completo y fachada).
            for (const tipo of tipos) {
              const fm: Formulario = { tarifaId: t.id, bloqueId: bloqueId(p.bloque), tipoId: tipo, desde: f.desde, hasta: f.hasta, forma: f.forma, valor: f.valor, incluye: f.incluye, nota: f.antes?.nota ?? "" };
              const antes = f.antes ? { ...f.antes, tipoId: tipo } : null;
              ops.push(f.quitar ? { quitar: true, f: antes!, antes } : { quitar: false, f: fm, antes });
            }
          }
        });
      if (!ops.length) return;
      const r = await accionGuardarVarios(ops);
      if (!r.ok) return setMsg({ ok: false, texto: r.error });
      setMsg({ ok: true, texto: r.mensaje ?? "Guardado." });
      router.refresh();
    });

  return (
    <section className="rounded-2xl border border-[#cfcfcf] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[15px] font-bold text-carbon">{bloque.titulo}</h3>
        <div className="flex items-center gap-2">
          {msg && <span className={"text-[12px] font-semibold " + (msg.ok ? "text-lima-dark" : "text-alerta")}>{msg.texto}</span>}
          <button type="button" className={BTN} disabled={ocupado || !sucio} onClick={() => (setEst(deDatos()), setMsg(null))}>
            Deshacer
          </button>
          <button type="button" className={BTN_PRIM} disabled={ocupado || !sucio} onClick={guardar}>
            {ocupado ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {datos.tarifas.map((t) => (
          <div key={t.id} className="rounded-xl border border-black/10 bg-[#fafaf8] p-2.5">
            <div className="mb-1.5 text-[12px] font-bold uppercase tracking-[.04em] text-carbon/75">{t.nombre}</div>
            {bloque.partes.map((p, i) => {
              const clave = `${t.id}|${i}`;
              const filas = est[clave] ?? [];
              // Los tramos de viviendas solo salen si esta columna tiene alguno
              // (o al añadir otro tramo); un precio unico es solo su cifra.
              const conTramos = filas.length > 1 || filas.some((f) => f.desde || f.hasta);
              return (
                <div key={i} className={i > 0 ? "mt-2 border-t border-black/10 pt-2" : ""}>
                  {p.etiqueta && <div className="mb-1 text-[11px] font-semibold text-carbon/60">{p.etiqueta}</div>}
                  {filas.length === 0 && <div className="text-[12px] italic text-carbon/45">No se ofrece</div>}
                  {filas.map((f) => (
                    <div key={f.id} className={"mb-1 " + (f.quitar ? "opacity-40" : "")}>
                      <div className="flex flex-nowrap items-center gap-1">
                        {conTramos && (<>
                        <input className={MINI + " w-9 px-0.5 text-center"} inputMode="numeric" placeholder="—" title="Viviendas desde" value={f.desde} disabled={f.quitar} onChange={(e) => poner(clave, f.id, { desde: e.target.value })} />
                        <span className="text-[11px] text-carbon/55">a</span>
                        <input className={MINI + " w-9 px-0.5 text-center"} inputMode="numeric" placeholder="—" title="Viviendas hasta (vacío = o más)" value={f.hasta} disabled={f.quitar} onChange={(e) => poner(clave, f.id, { hasta: e.target.value })} />
                        <span className="text-[11px] text-carbon/55">viv.</span>
                        </>)}
                        <input className={MINI + " w-[62px] text-right font-semibold"} inputMode="decimal" placeholder="0" value={f.valor} disabled={f.quitar} onChange={(e) => poner(clave, f.id, { valor: e.target.value })} />
                        {p.formas.length > 1 ? (
                          <select className={MINI + " w-[64px] px-0 text-[11.5px]"} value={f.forma} disabled={f.quitar} onChange={(e) => poner(clave, f.id, { forma: e.target.value as Forma })}>
                            {p.formas.map((fm) => (
                              <option key={fm} value={fm}>
                                {UNIDAD[fm]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[12px] text-carbon/70">{UNIDAD[f.forma]}</span>
                        )}
                        <button
                          type="button"
                          title={f.quitar ? "No quitar" : "Quitar este tramo"}
                          className="ml-auto px-1 text-[14px] text-carbon/40 hover:text-alerta"
                          onClick={() => (f.antes ? poner(clave, f.id, { quitar: !f.quitar }) : setEst((e) => ({ ...e, [clave]: e[clave].filter((x) => x.id !== f.id) })))}
                        >
                          {f.quitar ? "↺" : "×"}
                        </button>
                      </div>
                      {/* Lo que incluye ese precio, plegado */}
                      <button type="button" className={"mt-0.5 text-left text-[11px] hover:underline " + (f.incluye.length ? "text-lima-dark" : "text-carbon/35")} onClick={() => poner(clave, f.id, { verIncluye: !f.verIncluye })}>
                        {f.incluye.length ? `incluye ${f.incluye.map(nombre).join(", ")}` : "incluye…"} {f.verIncluye ? "▴" : "▾"}
                      </button>
                      {f.verIncluye && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {datos.bloques
                            .filter((x) => x.id !== bloqueId(p.bloque))
                            .map((x) => {
                              const on = f.incluye.includes(x.id);
                              return (
                                <button
                                  key={x.id}
                                  type="button"
                                  onClick={() => poner(clave, f.id, { incluye: on ? f.incluye.filter((y) => y !== x.id) : [...f.incluye, x.id] })}
                                  className={"rounded-full border px-2 py-0.5 text-[11px] font-semibold " + (on ? "border-lima bg-lima-soft text-lima-dark" : "border-black/10 bg-white text-carbon/50")}
                                >
                                  {x.nombre}
                                </button>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  ))}
                  <button type="button" className="text-[11.5px] font-semibold text-lima-dark hover:underline" onClick={() => añadir(clave, p.formas[0])}>
                    {filas.length ? "+ otro tramo" : "+ añadir precio"}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
