"use client";

import { useMemo, useState } from "react";
import {
  CASOS,
  dentroDe,
  esSate,
  estimar,
  indiceDe,
  TIPOS,
  tresPrecios,
  type DatosEstimacion as Datos,
  type Indice,
  type TipoObra as Tipo,
} from "../../../lib/estimacionCalculo";
import type { EntradaCostes } from "../../../lib/informeCostes";
import { EmitirInforme } from "./EmitirInforme";

type Opcion = { valor: string; texto: string; pista?: string };

// ESTIMACION DE COSTES DE OBRA (Monica, 11-oct-2026). Contesta "yo como vecino,
// ¿cuanto tengo que soltar?". Dos areas:
//   1. Lo que cuesta HOY una obra (tipo + sus caracteristicas), con sus tres
//      precios: PEM -> sin IVA -> lo que se paga.
//   2. Como ha subido en los ultimos años y lo que se espera a 1 y 2 años, para
//      ESE MISMO tipo de obra (el SATE tiene su propia subida).
// Y el informe para la comunidad. Los numeros salen de lib/estimacionCostes.ts;
// las cuentas, de lib/estimacionCalculo.ts.

const eur = (n: number) => Math.round(n).toLocaleString("es-ES") + " €";
const pct = (n: number) => (n * 100).toLocaleString("es-ES", { maximumFractionDigits: 1 }) + " %";
const num = (s: string) => Number(s.replace(/\./g, "").replace(",", ".")) || 0;
const etq = "block text-[10.5px] font-bold uppercase tracking-[0.06em] text-carbon/60";
const campo =
  "mt-1 h-[40px] w-full rounded-[10px] border border-carbon/25 bg-white px-3 text-[14px] text-carbon outline-none focus:border-lima-dark focus:ring-2 focus:ring-lima/40";
const CAJA = "rounded-2xl border border-black/5 bg-white shadow-sm";

export function Estimador({
  d,
  oportunidades,
  personas,
  tipos,
  puedeCrear,
  comerciales,
}: {
  d: Datos;
  oportunidades: Opcion[];
  personas: Opcion[];
  tipos: Opcion[];
  puedeCrear: boolean;
  comerciales: Opcion[] | null;
}) {
  const [tipo, setTipo] = useState<Tipo>("ascensor");
  const [caso, setCaso] = useState("B");
  const [paradas, setParadas] = useState("6");
  const [m2f, setM2f] = useState("");
  const [m2c, setM2c] = useState("");
  const [comunidad, setComunidad] = useState("");

  const entrada = { caso, paradas: num(paradas), m2Fachada: num(m2f), m2Cubierta: num(m2c) };
  const est = useMemo(() => estimar(d, tipo, entrada), [d, tipo, caso, paradas, m2f, m2c]); // eslint-disable-line react-hooks/exhaustive-deps
  const valido = !!est && Number.isFinite(est.hoy);
  const ind = indiceDe(d, tipo);
  const nombreTipo = TIPOS.find((t) => t.clave === tipo)!.nombre;
  const año = Number(d.hoy.slice(0, 4));
  const hoy = valido ? tresPrecios(d, est!.hoy) : null;
  const precio = (pem: number) => tresPrecios(d, pem).conIva;
  const en1 = valido ? dentroDe(est!.hoy, 12, ind.subidaAnual) : NaN;
  const en2 = valido ? dentroDe(est!.hoy, 24, ind.subidaAnual) : NaN;
  const min1 = valido ? dentroDe(est!.hoy, 12, ind.subidaMinima) : NaN;
  const min2 = valido ? dentroDe(est!.hoy, 24, ind.subidaMinima) : NaN;
  const descripcion =
    tipo === "ascensor"
      ? `Ascensor, caso ${caso}, ${paradas} paradas`
      : esSate(tipo)
        ? `${nombreTipo}: ${[tipo !== "cubierta" && m2f ? `${m2f} m² de fachada` : null, tipo !== "fachada" && m2c ? `${m2c} m² de cubierta` : null].filter(Boolean).join(" y ")}`
        : nombreTipo;
  // Lo que se estima, para emitir el informe (null si aun no se puede).
  const paraInforme: EntradaCostes | null = valido
    ? { tipo, caso, paradas: tipo === "ascensor" ? num(paradas) || null : null, m2f: num(m2f), m2c: num(m2c) }
    : null;

  return (
    <>
      {/* ------------------------------------------------ area 1 */}
      <section className={CAJA + " mt-5 p-5 print:hidden"}>
        <h2 className="text-[17px] font-bold text-carbon">1 · Lo que cuesta hoy</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className={etq}>Tipo de obra</span>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)} className={campo}>
              {TIPOS.map((t) => (
                <option key={t.clave} value={t.clave}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </label>
          {tipo === "ascensor" && (
            <>
              <label className="block">
                <span className={etq}>Caso de actuación</span>
                <select value={caso} onChange={(e) => setCaso(e.target.value)} className={campo}>
                  {CASOS.map(([c, n]) => (
                    <option key={c} value={c}>
                      {n} ({(d.ascensorPorCaso[c] ?? []).length} obras)
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={etq}>Número de paradas</span>
                <input value={paradas} onChange={(e) => setParadas(e.target.value)} inputMode="numeric" className={campo} />
                <span className="mt-1 block text-[11.5px] text-carbon/50">
                  Baja + X plantas = X + 1 paradas. Súmale garaje, sótano o terraza si los cubre.
                </span>
              </label>
            </>
          )}
          {esSate(tipo) && (
            <>
              {tipo !== "cubierta" && (
                <label className="block">
                  <span className={etq}>m² de fachada</span>
                  <input value={m2f} onChange={(e) => setM2f(e.target.value)} inputMode="decimal" placeholder="Ej.: 1.000" className={campo} />
                </label>
              )}
              {tipo !== "fachada" && (
                <label className="block">
                  <span className={etq}>m² de cubierta</span>
                  <input value={m2c} onChange={(e) => setM2c(e.target.value)} inputMode="decimal" placeholder="Ej.: 300" className={campo} />
                </label>
              )}
            </>
          )}
        </div>

        {est && hoy && (
          <div className="mt-5 border-t border-black/5 pt-4">
            <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
              <div>
                <div className={etq}>Lo que pagan los vecinos (con IVA)</div>
                <div className="text-[34px] font-extrabold leading-tight text-carbon">{eur(hoy.conIva)}</div>
              </div>
              <div className="pb-1 text-[13px] text-carbon/70">
                Lo normal: entre <b>{eur(precio(est.bajo))}</b> y <b>{eur(precio(est.alto))}</b>
                <br />
                según <b>{est.obras}</b> obras nuestras de los últimos 4 años, llevadas a precio de hoy
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[12.5px] text-carbon/65">
              <span>
                PEM (ejecución material): <b className="text-carbon/85">{eur(hoy.pem)}</b>
              </span>
              <span>
                + {pct(d.gastosBeneficio)} gastos generales y beneficio: <b className="text-carbon/85">{eur(hoy.sinIva)}</b>
              </span>
              <span>
                + {pct(d.iva)} IVA: <b className="text-carbon/85">{eur(hoy.conIva)}</b>
              </span>
            </div>
            <p className="mt-2 text-[12px] text-carbon/50">Sin honorarios técnicos, tasas ni licencia.</p>
            {esSate(tipo) && (
              <p className="mt-1 text-[12px] text-carbon/50">
                Unos {eur(hoy.pem / Math.max(1, entrada.m2Fachada + d.kCubierta * entrada.m2Cubierta))}/m² de PEM; la cubierta sale un{" "}
                {Math.round((d.kCubierta - 1) * 100)} % más cara por m² que la fachada.
              </p>
            )}
            {est.nota && <p className="mt-1 text-[12.5px] text-amber-800">{est.nota}</p>}
          </div>
        )}
      </section>

      {/* ------------------------------------------------ area 2 */}
      {est && hoy && (
        <section className={CAJA + " mt-4 p-5 print:hidden"}>
          <h2 className="text-[17px] font-bold text-carbon">2 · Cómo sube y qué se espera · {nombreTipo}</h2>
          <p className="mt-1 text-[13px] text-carbon/65">
            Lo que habría costado esta misma obra en los últimos años, lo de hoy y lo que se espera dentro de 1 y 2 años (con
            IVA). Sube <b>en torno a un {pct(ind.subidaAnual)} al año</b>, y como mínimo prudente un{" "}
            <b>{pct(ind.subidaMinima)}</b> (según {ind.base}).
          </p>
          <Grafica ind={ind} hoyValor={hoy.conIva} en1={precio(en1)} en2={precio(en2)} año={año} hoyIso={d.hoy} />
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {(
              [
                [`Hoy (${año})`, hoy.conIva, null],
                [`Dentro de 1 año (${año + 1})`, precio(en1), precio(min1)],
                [`Dentro de 2 años (${año + 2})`, precio(en2), precio(min2)],
              ] as const
            ).map(([k, v, m]) => (
              <div key={k} className="rounded-xl bg-hueso/60 px-4 py-3">
                <div className={etq}>{k}</div>
                <div className="mt-0.5 text-[20px] font-bold text-carbon">{eur(v)}</div>
                {m !== null && (
                  <div className="text-[12px] text-carbon/60">
                    +{eur(v - hoy.conIva)} · como mínimo {eur(m)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------ el informe */}
      {est && hoy && (
        <section className={CAJA + " mt-4 p-5 print:hidden"}>
          <h2 className="text-[17px] font-bold text-carbon">Informe para la comunidad</h2>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="block min-w-[260px] flex-1">
              <span className={etq}>Comunidad (opcional)</span>
              <input value={comunidad} onChange={(e) => setComunidad(e.target.value)} placeholder="CP …" className={campo} />
            </label>
            <button
              type="button"
              onClick={() => window.print()}
              className="h-[40px] rounded-xl bg-lima px-5 text-[14px] font-extrabold text-carbon transition hover:bg-lima-dark hover:text-white"
            >
              Imprimir informe
            </button>
          </div>
          {/* CON LAS AYUDAS: el informe se EMITE para una direccion -nuestra o
              nueva- y se guarda tal cual (12-oct-2026). */}
          <EmitirInforme entrada={paraInforme} oportunidades={oportunidades} personas={personas} tipos={tipos} puedeCrear={puedeCrear} comerciales={comerciales} />
          <p className="mt-2 text-[12px] text-carbon/65">
            Con las ayudas a las que puede acceder ese edificio, lo que darían para esta obra, cuándo se convocan y cuánto tardan
            en concederse, y lo que habrá subido la obra para entonces. Queda guardado: en su oportunidad o, si no es de nadie, en
            «Direcciones vistas».
          </p>
        </section>
      )}

      {est && hoy && (
        <section className="hidden text-[13px] leading-relaxed text-black print:block">
          <h1 className="text-[20px] font-bold">Estimación del coste de la obra</h1>
          <p className="mt-1">
            {comunidad ? <b>{comunidad}</b> : null}
            {comunidad ? " · " : ""}
            {descripcion}
          </p>
          <p className="mt-4">
            A día de hoy, se estima que la obra costará a la comunidad unos <b>{eur(hoy.conIva)}</b> con IVA (lo normal, entre{" "}
            {eur(precio(est.bajo))} y {eur(precio(est.alto))}). La estimación se basa en {est.obras} obras parecidas que hemos
            proyectado en los últimos años, actualizadas a precios de hoy.
          </p>
          <p className="mt-3">
            Los precios de este tipo de obra siguen subiendo: en nuestras obras, en torno a un {pct(ind.subidaAnual)} al año. Si la
            obra se hace dentro de <b>un año</b>, se espera que suba como mínimo un {pct(ind.subidaMinima)}, hasta unos{" "}
            <b>{eur(precio(en1))}</b>. Dentro de <b>dos años</b>, hasta unos <b>{eur(precio(en2))}</b>.
          </p>
          <table className="mt-4 w-full border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="py-1">Cuándo</th>
                <th className="py-1 text-right">Coste estimado (con IVA)</th>
                <th className="py-1 text-right">Más que hoy</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  [`Hoy (${año})`, hoy.conIva],
                  [`Dentro de 1 año (${año + 1})`, precio(en1)],
                  [`Dentro de 2 años (${año + 2})`, precio(en2)],
                ] as const
              ).map(([k, v]) => (
                <tr key={k} className="border-b border-black/30">
                  <td className="py-1">{k}</td>
                  <td className="py-1 text-right">{eur(v)}</td>
                  <td className="py-1 text-right">{v === hoy.conIva ? "—" : "+" + eur(v - hoy.conIva)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-5 border-t border-black/40 pt-2 text-[11.5px]">
            Estimación orientativa, a partir de los datos de nuestras obras: precio de la obra con gastos generales, beneficio
            industrial e IVA ({pct(d.iva)}). No incluye honorarios técnicos, tasas ni licencia. El precio definitivo depende del
            proyecto, de las mediciones reales y de los precios del momento de contratar.
          </p>
        </section>
      )}
    </>
  );
}

/** La linea del tiempo de ESTA obra: los periodos pasados (puntos), hoy
 *  destacado y la prevision a 1 y 2 años (discontinua). Una sola serie: sin
 *  leyenda, la nombra el titulo. Al pasar el raton, su valor. */
function Grafica({ ind, hoyValor, en1, en2, año, hoyIso }: { ind: Indice; hoyValor: number; en1: number; en2: number; año: number; hoyIso: string }) {
  const [foco, setFoco] = useState<number | null>(null);
  type Punto = { x: number; v: number; etiqueta: string; obras: number | null };
  const xHoy = año + (new Date(hoyIso).getMonth() + 0.5) / 12;
  const pasado: Punto[] = ind.periodos.map((p) => ({ x: p.x, v: hoyValor * p.nivel, etiqueta: p.etiqueta, obras: p.obras }));
  const futuro: Punto[] = [
    { x: xHoy, v: hoyValor, etiqueta: "Hoy", obras: null },
    { x: xHoy + 1, v: en1, etiqueta: `Dentro de 1 año (${año + 1})`, obras: null },
    { x: xHoy + 2, v: en2, etiqueta: `Dentro de 2 años (${año + 2})`, obras: null },
  ];
  const todos = [...pasado, ...futuro];
  const W = 720, H = 260, L = 70, R = 20, T = 22, B = 32;
  const x0 = Math.min(...todos.map((p) => p.x)) - 0.15, x1 = Math.max(...todos.map((p) => p.x)) + 0.15;
  const vmin = Math.min(...todos.map((p) => p.v)) * 0.92, vmax = Math.max(...todos.map((p) => p.v)) * 1.05;
  const px = (x: number) => L + ((x - x0) / (x1 - x0)) * (W - L - R);
  const py = (v: number) => T + (1 - (v - vmin) / (vmax - vmin)) * (H - T - B);
  const marcas = Array.from({ length: 4 }, (_, i) => vmin + ((vmax - vmin) * (i + 0.5)) / 4);
  const años = Array.from({ length: Math.floor(x1) - Math.ceil(x0) + 1 }, (_, i) => Math.ceil(x0) + i);
  const linea = (ps: Punto[]) => ps.map((p, i) => `${i ? "L" : "M"}${px(p.x).toFixed(1)},${py(p.v).toFixed(1)}`).join(" ");
  const f = foco !== null ? todos[foco] : null;
  const fmt = (v: number) => Math.round(v / 1000).toLocaleString("es-ES") + " mil €";

  return (
    <div className="relative mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Coste de esta obra en el tiempo, hoy y previsión">
        {marcas.map((m) => (
          <g key={m}>
            <line x1={L} x2={W - R} y1={py(m)} y2={py(m)} stroke="currentColor" className="text-black/5" />
            <text x={L - 8} y={py(m) + 4} textAnchor="end" className="fill-carbon/45 text-[11px]">
              {fmt(m)}
            </text>
          </g>
        ))}
        {años.map((a) => (
          <text key={a} x={px(a + 0.5)} y={H - 10} textAnchor="middle" className="fill-carbon/50 text-[11px]">
            {a}
          </text>
        ))}
        {pasado.length > 0 && <path d={linea([...pasado, futuro[0]])} fill="none" stroke="currentColor" strokeWidth={2} className="text-carbon/60" />}
        <path d={linea(futuro)} fill="none" stroke="currentColor" strokeWidth={2} strokeDasharray="6 5" className="text-lima-dark" />
        {todos.map((p, i) => {
          const esHoy = i === pasado.length;
          return (
            <g key={i} onMouseEnter={() => setFoco(i)} onMouseLeave={() => setFoco(null)}>
              <circle cx={px(p.x)} cy={py(p.v)} r={16} fill="transparent" />
              <circle
                cx={px(p.x)}
                cy={py(p.v)}
                r={esHoy ? 7 : 4.5}
                stroke="white"
                strokeWidth={2}
                className={esHoy ? "fill-lima-dark" : i > pasado.length ? "fill-lima" : "fill-carbon/60"}
              />
              {(esHoy || i > pasado.length) && (
                <text x={px(p.x)} y={py(p.v) - 13} textAnchor="middle" className="fill-carbon text-[11.5px] font-bold">
                  {fmt(p.v)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {f && (
        <div
          className="pointer-events-none absolute rounded-lg border border-black/10 bg-white px-3 py-2 text-[12px] shadow-md"
          style={{ left: `${(px(f.x) / W) * 100}%`, top: 0, transform: "translateX(-50%)" }}
        >
          <div className="font-bold text-carbon">{f.etiqueta}</div>
          <div className="text-carbon/80">{eur(f.v)}</div>
          {f.obras !== null && <div className="text-carbon/50">{f.obras} obras ese semestre</div>}
        </div>
      )}
    </div>
  );
}
