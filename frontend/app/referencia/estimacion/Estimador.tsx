"use client";

import { useMemo, useState } from "react";

// ESTIMACION DE COSTES DE OBRA (Monica, 11-oct-2026). Dos areas:
//   1. Estimar el coste de HOY de una obra (tipo + sus caracteristicas).
//   2. Como ha subido en los ultimos años y lo que se espera a 1 y 2 años,
//      para ESE MISMO tipo de obra.
// Y el informe para la comunidad. Los numeros salen de lib/estimacionCostes.ts.

import { CASOS, estimar, TIPOS, type DatosEstimacion as Datos, type TipoObra as Tipo } from "../../../lib/estimacionCalculo";

const eur = (n: number) => Math.round(n).toLocaleString("es-ES") + " €";
const pct = (n: number) => (n * 100).toLocaleString("es-ES", { maximumFractionDigits: 1 }) + " %";
const etq = "block text-[10.5px] font-bold uppercase tracking-[0.06em] text-carbon/60";
const campo =
  "mt-1 h-[40px] w-full rounded-[10px] border border-carbon/25 bg-white px-3 text-[14px] text-carbon outline-none focus:border-lima-dark focus:ring-2 focus:ring-lima/40";
const CAJA = "rounded-2xl border border-black/5 bg-white shadow-sm";


export function Estimador({ d }: { d: Datos }) {
  const [tipo, setTipo] = useState<Tipo>("ascensor");
  const [caso, setCaso] = useState("B");
  const [paradas, setParadas] = useState("6");
  const [comunidad, setComunidad] = useState("");
  const [opp, setOpp] = useState("");

  const est = useMemo(() => estimar(d, tipo, caso, Number(paradas.replace(",", "."))), [tipo, caso, paradas, d]);

  const valido = !!est && Number.isFinite(est.hoy);
  const nombreTipo = TIPOS.find((t) => t.clave === tipo)!.nombre;
  const año = Number(d.hoy.slice(0, 4));
  const en1 = valido ? est!.hoy * (1 + d.subidaAnual) : NaN;
  const en2 = valido ? est!.hoy * (1 + d.subidaAnual) ** 2 : NaN;
  const min1 = valido ? est!.hoy * (1 + d.subidaMinima) : NaN;
  const min2 = valido ? est!.hoy * (1 + d.subidaMinima) ** 2 : NaN;
  const descripcion = tipo === "ascensor" ? `Ascensor, caso ${caso}, ${paradas} paradas` : nombreTipo;

  return (
    <>
      {/* ------------------------------------------------ area 1 */}
      <section className={CAJA + " mt-5 p-5 print:hidden"}>
        <h2 className="text-[17px] font-bold text-carbon">1 · Estimar el coste de hoy</h2>
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
        </div>

        {est && (
          <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-3 border-t border-black/5 pt-4">
            <div>
              <div className={etq}>PEM estimado hoy</div>
              <div className="text-[34px] font-extrabold leading-tight text-carbon">{valido ? eur(est.hoy) : "—"}</div>
            </div>
            {valido && (
              <div className="pb-1 text-[13px] text-carbon/70">
                Lo normal: entre <b>{eur(est.bajo)}</b> y <b>{eur(est.alto)}</b>
                <br />
                según <b>{est.obras}</b> obras nuestras de los últimos 4 años, llevadas a precio de hoy
              </div>
            )}
            {est.nota && <p className="basis-full text-[12.5px] text-amber-800">{est.nota}</p>}
          </div>
        )}
      </section>

      {/* ------------------------------------------------ area 2 */}
      {valido && (
        <section className={CAJA + " mt-4 p-5 print:hidden"}>
          <h2 className="text-[17px] font-bold text-carbon">2 · Cómo sube y qué se espera · {nombreTipo}</h2>
          <p className="mt-1 text-[13px] text-carbon/65">
            Lo que habría costado esta misma obra en los últimos años, lo de hoy y lo que se espera dentro de 1 y 2 años.
            La subida es la de nuestras obras de ascensor: <b>en torno a un {pct(d.subidaAnual)} al año</b>, y como mínimo
            prudente un <b>{pct(d.subidaMinima)}</b>.
          </p>
          <Grafica d={d} hoyValor={est!.hoy} en1={en1} en2={en2} año={año} />
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {(
              [
                [`Hoy (${año})`, est!.hoy, null],
                [`Dentro de 1 año (${año + 1})`, en1, min1],
                [`Dentro de 2 años (${año + 2})`, en2, min2],
              ] as const
            ).map(([k, v, m]) => (
              <div key={k} className="rounded-xl bg-hueso/60 px-4 py-3">
                <div className={etq}>{k}</div>
                <div className="mt-0.5 text-[20px] font-bold text-carbon">{eur(v)}</div>
                {m !== null && (
                  <div className="text-[12px] text-carbon/60">
                    +{eur(v - est!.hoy)} · como mínimo {eur(m)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------ el informe */}
      {valido && (
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
          {/* CON LAS AYUDAS: desde la oportunidad, que es donde se sabe a cuales
              puede acceder el edificio. Sin paradas, salen de Catastro. */}
          <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-black/5 pt-4">
            <label className="block min-w-[260px] flex-1">
              <span className={etq}>Con las ayudas: código de la oportunidad</span>
              <input value={opp} onChange={(e) => setOpp(e.target.value)} placeholder="DAN-2025-277" className={campo} />
            </label>
            <a
              href={
                opp.trim()
                  ? `/referencia/estimacion/informe?${new URLSearchParams({ opp: opp.trim(), tipo, caso, ...(tipo === "ascensor" && paradas ? { paradas } : {}) })}`
                  : undefined
              }
              aria-disabled={!opp.trim()}
              className={
                "inline-flex h-[40px] items-center rounded-xl px-5 text-[14px] font-extrabold transition " +
                (opp.trim() ? "bg-carbon text-white hover:bg-carbon/85" : "pointer-events-none bg-carbon/20 text-white")
              }
            >
              Informe con ayudas
            </a>
          </div>
          <p className="mt-2 text-[12px] text-carbon/50">
            Con las ayudas a las que puede acceder ese edificio, lo que darían para esta obra, cuándo se convocan y cuánto tardan
            en concederse, y lo que habrá subido la obra para entonces.
          </p>
        </section>
      )}

      {valido && (
        <section className="hidden text-[13px] leading-relaxed text-black print:block">
          <h1 className="text-[20px] font-bold">Estimación del coste de la obra</h1>
          <p className="mt-1">
            {comunidad ? <b>{comunidad}</b> : null}
            {comunidad ? " · " : ""}
            {descripcion}
          </p>
          <p className="mt-4">
            A día de hoy, se estima que la obra costará <b>{eur(est!.hoy)}</b> de presupuesto de ejecución material
            (lo normal, entre {eur(est!.bajo)} y {eur(est!.alto)}). La estimación se basa en {est!.obras} obras parecidas
            que hemos proyectado en los últimos años, actualizadas a precios de hoy.
          </p>
          <p className="mt-3">
            Los precios de la construcción no han dejado de subir: en nuestras obras, en torno a un {pct(d.subidaAnual)} al año.
            Si la obra se hace dentro de <b>un año</b>, se espera que suba como mínimo un {pct(d.subidaMinima)}, hasta unos{" "}
            <b>{eur(en1)}</b>. Dentro de <b>dos años</b>, hasta unos <b>{eur(en2)}</b>.
          </p>
          <table className="mt-4 w-full border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="py-1">Cuándo</th>
                <th className="py-1 text-right">Coste estimado</th>
                <th className="py-1 text-right">Diferencia con hoy</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  [`Hoy (${año})`, est!.hoy],
                  [`Dentro de 1 año (${año + 1})`, en1],
                  [`Dentro de 2 años (${año + 2})`, en2],
                ] as const
              ).map(([k, v]) => (
                <tr key={k} className="border-b border-black/30">
                  <td className="py-1">{k}</td>
                  <td className="py-1 text-right">{eur(v)}</td>
                  <td className="py-1 text-right">{v === est!.hoy ? "—" : "+" + eur(v - est!.hoy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-5 border-t border-black/40 pt-2 text-[11.5px]">
            Estimación orientativa, a partir de los datos de nuestras obras. El precio definitivo depende del proyecto, de las
            mediciones reales y de los precios del momento de contratar.
          </p>
        </section>
      )}
    </>
  );
}

/** La linea del tiempo de ESTA obra: los semestres pasados (puntos), hoy
 *  destacado y la prevision a 1 y 2 años (discontinua). Una sola serie: sin
 *  leyenda, la nombra el titulo. Al pasar el raton, su valor. */
function Grafica({ d, hoyValor, en1, en2, año }: { d: Datos; hoyValor: number; en1: number; en2: number; año: number }) {
  const [foco, setFoco] = useState<number | null>(null);
  const xDe = (s: string) => Number(s.slice(0, 4)) + (s.endsWith("S1") ? 0.25 : 0.75);
  const xHoy = año + (new Date(d.hoy).getMonth() + 0.5) / 12;
  type Punto = { x: number; v: number; etiqueta: string; obras: number | null };
  const pasado: Punto[] = d.semestres.map((s) => ({ x: xDe(s.semestre), v: hoyValor * s.nivel, etiqueta: s.semestre.replace("-S1", " · 1er semestre").replace("-S2", " · 2º semestre"), obras: s.obras }));
  const futuro: Punto[] = [
    { x: xHoy, v: hoyValor, etiqueta: "Hoy", obras: null },
    { x: xHoy + 1, v: en1, etiqueta: `Dentro de 1 año (${año + 1})`, obras: null },
    { x: xHoy + 2, v: en2, etiqueta: `Dentro de 2 años (${año + 2})`, obras: null },
  ];
  const todos = [...pasado, ...futuro];
  const W = 720, H = 260, L = 70, R = 20, T = 16, B = 32;
  const x0 = Math.min(...todos.map((p) => p.x)) - 0.15, x1 = Math.max(...todos.map((p) => p.x)) + 0.15;
  const vmin = Math.min(...todos.map((p) => p.v)) * 0.92, vmax = Math.max(...todos.map((p) => p.v)) * 1.05;
  const px = (x: number) => L + ((x - x0) / (x1 - x0)) * (W - L - R);
  const py = (v: number) => T + (1 - (v - vmin) / (vmax - vmin)) * (H - T - B);
  const marcas = Array.from({ length: 4 }, (_, i) => vmin + ((vmax - vmin) * (i + 0.5)) / 4);
  const años = Array.from({ length: Math.floor(x1) - Math.ceil(x0) + 1 }, (_, i) => Math.ceil(x0) + i);
  const linea = (ps: { x: number; v: number }[]) => ps.map((p, i) => `${i ? "L" : "M"}${px(p.x).toFixed(1)},${py(p.v).toFixed(1)}`).join(" ");
  const f = foco !== null ? todos[foco] : null;

  return (
    <div className="relative mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Coste de esta obra en el tiempo, hoy y previsión">
        {marcas.map((m) => (
          <g key={m}>
            <line x1={L} x2={W - R} y1={py(m)} y2={py(m)} stroke="currentColor" className="text-black/5" />
            <text x={L - 8} y={py(m) + 4} textAnchor="end" className="fill-carbon/45 text-[11px]">
              {Math.round(m / 1000).toLocaleString("es-ES")} mil €
            </text>
          </g>
        ))}
        {años.map((a) => (
          <text key={a} x={px(a + 0.5)} y={H - 10} textAnchor="middle" className="fill-carbon/50 text-[11px]">
            {a}
          </text>
        ))}
        <path d={linea(pasado.concat(futuro[0]))} fill="none" stroke="currentColor" strokeWidth={2} className="text-carbon/60" />
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
                  {Math.round(p.v / 1000).toLocaleString("es-ES")} mil €
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
