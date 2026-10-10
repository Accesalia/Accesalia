"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DatosPresupuesto, HojaElegible, PresupuestoResumen } from "../../../lib/presupuesto";
import { EMISOR, IVA, TEXTO_FORMA_PAGO, lineasDelPresupuesto, totales, type Cliente, type FormaPago } from "../../../lib/motorPresupuesto";
import { estadoDeHoja } from "../../../lib/estadoHoja";
import { accionBorrar, accionGuardar } from "./acciones";

// LA PANTALLA DE CONSTRUIR EL PRESUPUESTO (Monica, 10-oct-2026):
//   a la izquierda, las hojas de encargo de la oportunidad, cada una con un
//   desglose minimo de lo que lleva ("para saber elegir") y su casilla de
//   "incluir"; a la derecha, el presupuesto que sale, que cambia a medida que se
//   marcan. Abajo, guardar como borrador o generar el PDF.
// Los datos del cliente se pueden corregir aqui (a la comunidad le falta a
// menudo el CIF o el domicilio): se guardan en el presupuesto, no en la ficha.

const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const EUR0 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2, useGrouping: "always" });
const PCT = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });
const fecha = (f: string | null) => (f ? f.slice(0, 10).split("-").reverse().join("/") : "");

const TARJETA = "rounded-2xl border border-[#cfcfcf] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.04)]";
const TITULO = "text-xs font-bold uppercase tracking-[.08em] text-carbon/70";
const BTN_PRIM = "rounded-xl border border-lima bg-lima px-3.5 py-[7px] text-[13px] font-bold text-carbon transition hover:bg-lima-dark hover:text-white disabled:opacity-50";
const BTN_SEC = "rounded-xl border border-black/15 bg-white px-3.5 py-[7px] text-[13px] font-semibold text-carbon/70 transition hover:border-carbon/40 disabled:opacity-50";
const ENLACE = "font-semibold text-[#2f5f8a] underline-offset-2 hover:underline";
const CAMPO = "w-full rounded-md border border-black/15 bg-white px-2 py-1 text-[12.5px] focus:border-carbon/50 focus:outline-none";
const CAB = "bg-[#e6e6e6] px-2 py-1 text-[10px] font-bold uppercase tracking-[.04em] text-carbon/75";

type Edicion = { id: string | null; hojaIds: string[]; cliente: Cliente; formaPago: FormaPago };

export function Presupuesto({ datos, abrir }: { datos: DatosPresupuesto; abrir: string | null }) {
  const router = useRouter();
  const nuevo = (): Edicion => ({ id: null, hojaIds: [], cliente: datos.cliente, formaPago: "cargo_en_cuenta" });
  const desde = (p: PresupuestoResumen): Edicion => ({ id: p.id, hojaIds: p.hojaIds, cliente: p.cliente, formaPago: p.formaPago });
  const inicial = datos.presupuestos.find((p) => p.id === abrir);
  const [ed, setEd] = useState<Edicion>(inicial ? desde(inicial) : nuevo());
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();

  const abierto = datos.presupuestos.find((p) => p.id === ed.id) ?? null;
  const generado = !!abierto && !abierto.borrador;
  const elegidas = datos.hojas.filter((h) => ed.hojaIds.includes(h.id));
  const lineas = useMemo(() => lineasDelPresupuesto(elegidas, datos.direccion), [elegidas, datos.direccion]);
  const t = totales(lineas);

  const marcar = (id: string) =>
    setEd((e) => ({ ...e, hojaIds: e.hojaIds.includes(id) ? e.hojaIds.filter((x) => x !== id) : [...e.hojaIds, id] }));
  const cambiarCliente = (k: keyof Cliente, v: string) => setEd((e) => ({ ...e, cliente: { ...e.cliente, [k]: v } }));

  const guardar = (borrador: boolean) =>
    empezar(async () => {
      setError(null);
      setHecho(null);
      const r = await accionGuardar({ presupuestoId: ed.id, oportunidadId: datos.opp.id, hojaIds: ed.hojaIds, cliente: ed.cliente, formaPago: ed.formaPago, borrador });
      if (!r.ok) return setError(r.error);
      setHecho(borrador ? "Borrador guardado." : `Generado: ${r.codigo}.`);
      router.replace(`/comercial/presupuesto?opp=${datos.opp.id}&p=${r.id}`, { scroll: false });
      router.refresh();
      setEd((e) => ({ ...e, id: r.id }));
      if (!borrador) window.open(`/comercial/presupuesto/pdf/${r.id}`, "_blank");
    });

  const borrar = (id: string) =>
    empezar(async () => {
      if (!confirm("¿Borrar este borrador?")) return;
      const r = await accionBorrar(id);
      if (!r.ok) return setError(r.error);
      if (ed.id === id) setEd(nuevo());
      router.refresh();
    });

  return (
    <>
      <h1 className="mt-2.5 text-[25px] font-bold leading-tight text-carbon">Presupuesto</h1>
      <p className="mt-1 text-[13px] text-carbon/65">
        {datos.opp.codigo && <b>{datos.opp.codigo}</b>} · {datos.direccion} ·{" "}
        <a href={`/comercial/oportunidades/${datos.opp.id}`} className={ENLACE}>
          ir a la oportunidad
        </a>
      </p>

      {/* ------------------------------ los presupuestos que ya tiene */}
      <div className={TARJETA + " mt-4"}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className={TITULO}>Presupuestos de esta oportunidad</h2>
          <button type="button" className={BTN_SEC} onClick={() => { setEd(nuevo()); setError(null); setHecho(null); router.replace(`/comercial/presupuesto?opp=${datos.opp.id}`, { scroll: false }); }}>
            + Nuevo presupuesto
          </button>
        </div>
        {datos.presupuestos.length === 0 ? (
          <p className="mt-2 text-[12.5px] text-carbon/55">Todavía no hay ninguno hecho en la app. Los anteriores están en Factusol, con su número.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[#eee]">
            {datos.presupuestos.map((p) => (
              <li key={p.id} className={"flex flex-wrap items-center gap-x-4 gap-y-1 py-1.5 text-[12.5px] " + (p.id === ed.id ? "font-semibold" : "")}>
                <span className="w-[110px]">{p.codigo ?? "Borrador"}</span>
                <span className="w-[80px]">{fecha(p.fecha)}</span>
                <span className="w-[90px] text-right">{EUR.format(p.base)} €</span>
                <span className="min-w-0 flex-1 truncate text-carbon/60">{p.cliente.nombre}</span>
                <span className="flex gap-3">
                  {!p.borrador && (
                    <a href={`/comercial/presupuesto/pdf/${p.id}`} target="_blank" rel="noreferrer" className={ENLACE}>
                      ver PDF
                    </a>
                  )}
                  <button type="button" className={ENLACE} onClick={() => { setEd(desde(p)); setError(null); setHecho(null); }}>
                    {p.borrador ? "seguir" : "abrir"}
                  </button>
                  {p.borrador && (
                    <button type="button" className={ENLACE + " text-red-700"} onClick={() => borrar(p.id)}>
                      borrar
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[420px_1fr]">
        {/* ------------------------------ las hojas, para elegir */}
        <div className={TARJETA}>
          <h2 className={TITULO}>Hojas de encargo · marca las que entran</h2>
          {datos.hojas.length === 0 && (
            <p className="mt-2 text-[12.5px] text-amber-900/80">Esta oportunidad no tiene ninguna hoja de encargo generada.</p>
          )}
          <ul className="mt-2 space-y-2">
            {datos.hojas.map((h) => (
              <HojaCasilla key={h.id} h={h} marcada={ed.hojaIds.includes(h.id)} bloqueada={generado} alMarcar={() => marcar(h.id)} />
            ))}
          </ul>
        </div>

        {/* ------------------------------ el presupuesto que sale */}
        <div className={TARJETA}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className={TITULO}>{generado ? `Presupuesto ${abierto!.codigo}` : ed.id ? "Borrador" : "Presupuesto nuevo"}</h2>
            {generado && (
              <span className="text-[12px] text-carbon/60">
                Generado: ya no se cambia. Si hace falta otro, «+ Nuevo presupuesto».
              </span>
            )}
          </div>

          {generado ? (
            <iframe src={`/comercial/presupuesto/pdf/${abierto!.id}#view=FitH`} title={`Presupuesto ${abierto!.codigo}`} className="mt-3 h-[900px] w-full rounded-lg border border-black/10" />
          ) : (
            <>
              <div className="mt-3 rounded-lg border border-black/10 p-4 text-[12.5px]">
                {/* cabecera: emisor y cliente */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="leading-snug">
                    <div className="font-bold">{EMISOR.nombre}</div>
                    <div>{EMISOR.domicilio}</div>
                    <div>{EMISOR.cp} {EMISOR.poblacion} {EMISOR.provincia}</div>
                    <div>{EMISOR.telefono} · {EMISOR.nif}</div>
                  </div>
                  <div className="space-y-1 rounded-md border border-black/15 p-2">
                    <input className={CAMPO + " font-semibold"} value={ed.cliente.nombre} onChange={(e) => cambiarCliente("nombre", e.target.value)} placeholder="Cliente" aria-label="Cliente" />
                    <input className={CAMPO} value={ed.cliente.domicilio} onChange={(e) => cambiarCliente("domicilio", e.target.value)} placeholder="Domicilio" aria-label="Domicilio" />
                    <div className="grid grid-cols-[80px_1fr] gap-1">
                      <input className={CAMPO} value={ed.cliente.cp} onChange={(e) => cambiarCliente("cp", e.target.value)} placeholder="CP" aria-label="Código postal" />
                      <input className={CAMPO} value={ed.cliente.poblacion} onChange={(e) => cambiarCliente("poblacion", e.target.value)} placeholder="Población" aria-label="Población" />
                    </div>
                    <input className={CAMPO} value={ed.cliente.provincia} onChange={(e) => cambiarCliente("provincia", e.target.value)} placeholder="Provincia" aria-label="Provincia" />
                  </div>
                </div>

                {/* documento, numero, fecha · NIF y forma de pago */}
                <div className="mt-3 grid grid-cols-4 border border-black/15">
                  {["Documento", "Número", "Página", "Fecha"].map((x) => (
                    <div key={x} className={CAB}>{x}</div>
                  ))}
                  <div className="px-2 py-1">Presupuesto</div>
                  <div className="px-2 py-1 text-carbon/55">PR-… al generar</div>
                  <div className="px-2 py-1">1</div>
                  <div className="px-2 py-1 text-carbon/55">la del día que se genere</div>
                  <div className={CAB}>N.I.F.</div>
                  <div className={CAB + " col-span-3"}>Forma de pago</div>
                  <div className="p-1">
                    <input className={CAMPO} value={ed.cliente.nif} onChange={(e) => cambiarCliente("nif", e.target.value)} placeholder="NIF" aria-label="NIF del cliente" />
                  </div>
                  <div className="col-span-3 p-1">
                    <select className={CAMPO} value={ed.formaPago} onChange={(e) => setEd((x) => ({ ...x, formaPago: e.target.value as FormaPago }))} aria-label="Forma de pago">
                      {(Object.keys(TEXTO_FORMA_PAGO) as FormaPago[]).map((f) => (
                        <option key={f} value={f}>{TEXTO_FORMA_PAGO[f]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* las lineas */}
                <div className="mt-3 border border-black/15">
                  <div className="grid grid-cols-[1fr_70px_90px_90px]">
                    <div className={CAB}>Descripción</div>
                    <div className={CAB + " text-right"}>Cantidad</div>
                    <div className={CAB + " text-right"}>Precio ud.</div>
                    <div className={CAB + " text-right"}>Total</div>
                  </div>
                  {lineas.length === 0 ? (
                    <p className="px-2 py-4 text-center text-carbon/50">Marca a la izquierda las hojas que entran.</p>
                  ) : (
                    lineas.map((l, i) => (
                      <div key={i} className="grid grid-cols-[1fr_70px_90px_90px] border-t border-black/10">
                        <div className="px-2 py-1.5 leading-snug">{l.concepto}</div>
                        <div className="px-2 py-1.5 text-right">1,00</div>
                        <div className="px-2 py-1.5 text-right">{EUR.format(l.importe)}</div>
                        <div className="px-2 py-1.5 text-right">{EUR.format(l.importe)}</div>
                      </div>
                    ))
                  )}
                </div>

                {/* IVA y total */}
                <div className="mt-3 grid grid-cols-4 border border-black/15">
                  {["Tipo I.V.A.", "Base", "I.V.A.", "Total"].map((x) => (
                    <div key={x} className={CAB}>{x}</div>
                  ))}
                  <div className="px-2 py-1">{EUR.format(IVA)} %</div>
                  <div className="px-2 py-1">{EUR.format(t.base)}</div>
                  <div className="px-2 py-1">{EUR.format(t.cuota)}</div>
                  <div className="px-2 py-1">{EUR.format(t.total)}</div>
                </div>
                <div className="mt-2 text-right text-[15px] font-bold">TOTAL {EUR.format(t.total)} €</div>
              </div>

              {error && <p className="mt-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-[13px] text-red-800">{error}</p>}
              {hecho && <p className="mt-3 rounded-xl border border-lima/60 bg-lima-soft px-3 py-2 text-[13px] text-lima-dark">{hecho}</p>}
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button type="button" className={BTN_SEC} disabled={ocupado} onClick={() => router.push(`/comercial/oportunidades/${datos.opp.id}`)}>
                  Cancelar
                </button>
                <button type="button" className={BTN_SEC} disabled={ocupado} onClick={() => guardar(true)}>
                  Guardar como borrador
                </button>
                <button type="button" className={BTN_PRIM} disabled={ocupado || !lineas.some((l) => l.importe > 0)} onClick={() => guardar(false)}>
                  {ocupado ? "Un momento…" : "Generar PDF"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/** Una hoja con su casilla y lo minimo para saber si entra: que se cobra (con
 *  su precio), que va a exito y que va incluido. */
function HojaCasilla({ h, marcada, bloqueada, alMarcar }: { h: HojaElegible; marcada: boolean; bloqueada: boolean; alMarcar: () => void }) {
  const e = estadoDeHoja(h.estado, false);
  const conPrecio = h.cobra.filter((x) => x.importe);
  const aExito = h.cobra.filter((x) => !x.importe || x.pct);
  return (
    <li>
      <label
        className={
          "block cursor-pointer rounded-xl border p-3 transition " +
          (marcada ? "border-lima bg-lima-soft/60" : "border-black/10 hover:border-carbon/30") +
          (bloqueada ? " pointer-events-none opacity-70" : "")
        }
      >
        <div className="flex items-start gap-2.5">
          <input type="checkbox" className="mt-0.5 size-4 accent-[#7a9a01]" checked={marcada} onChange={alMarcar} disabled={bloqueada} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
              <b>{h.codigo ?? "Sin código"}</b>
              <span className={`rounded-[20px] border px-2 py-px text-[10.5px] ${e.clase}`}>{e.texto}</span>
              {h.sustituida && <span className="rounded-[20px] border border-amber-300 bg-amber-50 px-2 py-px text-[10.5px] text-amber-900">sustituida</span>}
              <span className="text-carbon/55">{fecha(h.fecha)}</span>
              <span className="ml-auto font-semibold">{EUR0.format(h.importe)} €</span>
            </div>
            <div className="mt-0.5 text-[12.5px] text-carbon/80">{h.titulo}</div>
            <ul className="mt-1.5 space-y-0.5 text-[11.5px] leading-snug text-carbon/70">
              {conPrecio.map((x, i) => (
                <li key={i}>
                  <span className="font-semibold text-carbon/85">Se cobra:</span> {x.nombre} · {EUR0.format(Number(x.importe))} €
                </li>
              ))}
              {aExito.map((x, i) => (
                <li key={"e" + i}>
                  <span className="font-semibold text-carbon/85">A éxito:</span> {x.nombre}
                  {x.pct ? ` · ${PCT.format(x.pct)} %` : ""}
                </li>
              ))}
              {h.incluidos.length > 0 && (
                <li>
                  <span className="font-semibold text-carbon/85">Incluye:</span> {h.incluidos.join(" · ")}
                </li>
              )}
              {h.cobra.length === 0 && <li className="text-amber-900/80">No tiene nada que se cobre.</li>}
            </ul>
          </div>
        </div>
      </label>
    </li>
  );
}
