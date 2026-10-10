"use client";

import { useMemo, useState } from "react";
import { aplica, calcular, CONCEPTO, eur, FORMA_BONIF, MOMENTO, type Canal, type Obra, type Regla, type Via } from "../../../lib/calculoTasas";
import type { Tramite } from "../../../lib/tasas";

// TASAS DE UN MUNICIPIO (Monica, 10-oct-2026): la consulta ("cuanto es el ICIO
// en Fuenlabrada") y la CALCULADORA para una obra concreta, que se imprime
// como FICHA PARA LOS VECINOS: cuanto, cuando y como se pide, con sus avisos
// (la fianza "sujeta al calculo de residuos"; el ICIO, provisional).
// Lo que no se puede calcular todavia se dice, no se inventa.

const TIPOS = [
  { clave: "ascensor", nombre: "Ascensor" },
  { clave: "accesibilidad", nombre: "Accesibilidad (rampa, plataforma, portal…)" },
  { clave: "eficiencia_energetica", nombre: "SATE / eficiencia energética" },
  { clave: "intervenciones_exterior", nombre: "Fachada o cubierta (arreglo)" },
];
const VIA = { licencia: "Licencia", declaracion_responsable: "Declaración responsable" } as const;

const etq = "block text-[10.5px] font-bold uppercase tracking-[0.06em] text-carbon/60";
const campo =
  "mt-1 h-[38px] w-full rounded-[10px] border border-carbon/25 bg-white px-3 text-[14px] text-carbon outline-none focus:border-lima-dark focus:ring-2 focus:ring-lima/40";
const CAJA = "rounded-2xl border border-black/5 bg-white shadow-sm";

const numero = (s: string) => {
  const n = Number(s.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""));
  return s.trim() && Number.isFinite(n) ? n : null;
};

export function Calculadora({
  municipio,
  reglas,
  tramites,
  arbol,
}: {
  municipio: string;
  reglas: Regla[];
  tramites: Tramite[];
  arbol: { clave: string; padre: string | null }[];
}) {
  const padre = useMemo(() => new Map(arbol.map((t) => [t.clave, t.padre])), [arbol]);
  /** Una clave y sus antepasados. */
  const familia = useMemo(
    () => (clave: string) => {
      const l: string[] = [];
      for (let c: string | null | undefined = clave; c; c = padre.get(c)) l.push(c);
      return l;
    },
    [padre],
  );
  const hayEcu = reglas.some((r) => r.canal === "ecu");

  const [tipo, setTipo] = useState("ascensor");
  const viasDelTipo = (t: string) =>
    tramites.filter((x) => !x.tipos.length || x.tipos.some((k) => familia(t).includes(k) || familia(k).includes(t))).map((x) => x.via);
  const [via, setVia] = useState<Via>(viasDelTipo("ascensor")[0] ?? "licencia");
  const [canal, setCanal] = useState<Canal>(hayEcu ? "ecu" : "directo");
  const [importe, setImporte] = useState("");
  const [esPem, setEsPem] = useState(true);
  const [m2, setM2] = useState("");
  const [m3, setM3] = useState("");
  const [conBonificacion, setConBonificacion] = useState(true);

  const bruto = numero(importe);
  const obra: Obra = {
    tipo,
    via,
    canal,
    pem: bruto === null ? null : esPem ? bruto : bruto / 1.19,
    m2: numero(m2),
    m3: numero(m3),
    conBonificacion,
  };
  const aplicables = reglas.filter((r) => aplica(r, obra, familia));
  // Las que no se calculan solas (no se exige, la pide la constructora, falta
  // la tarifa...) no van en la tabla como "por calcular": van debajo, dichas.
  const lineas = aplicables.filter((r) => r.metodo !== "no_aplica").map((r) => calcular(r, obra));
  const ademas = aplicables.filter((r) => r.metodo === "no_aplica");
  const tramite =
    tramites.find((t) => t.via === via && (t.canal === canal || !hayEcu) && viasDelTipo(tipo).includes(t.via)) ??
    tramites.find((t) => t.via === via);
  const necesitaM2 = lineas.some((l) => l.adelanto === null && l.explicacion.includes("m²"));
  const necesitaM3 = lineas.some((l) => l.adelanto === null && l.explicacion.includes("m³"));
  const total = (k: "adelanto" | "final") => lineas.reduce((s, l) => s + (l[k] ?? 0), 0);
  const sinCifra = lineas.filter((l) => l.adelanto === null);
  const tipoNombre = TIPOS.find((t) => t.clave === tipo)?.nombre ?? tipo;

  return (
    <>
      {/* ---------------------------------------------- la calculadora */}
      <section className={CAJA + " mt-5 p-5 print:hidden"}>
        <h2 className="text-[17px] font-bold text-carbon">Calcular para una obra</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className={etq}>Tipo de obra</span>
            <select
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value);
                const v = viasDelTipo(e.target.value);
                if (v.length && !v.includes(via)) setVia(v[0]);
              }}
              className={campo}
            >
              {TIPOS.map((t) => (
                <option key={t.clave} value={t.clave}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={etq}>Vía</span>
            <select value={via} onChange={(e) => setVia(e.target.value as Via)} className={campo}>
              <option value="licencia">Licencia</option>
              <option value="declaracion_responsable">Declaración responsable</option>
            </select>
          </label>
          {hayEcu && (
            <label className="block">
              <span className={etq}>Tramitación</span>
              <select value={canal} onChange={(e) => setCanal(e.target.value as Canal)} className={campo}>
                <option value="ecu">Por ECU</option>
                <option value="directo">Directa al Ayuntamiento</option>
              </select>
            </label>
          )}
          <label className="block">
            <span className={etq}>
              {esPem ? "PEM (ejecución material)" : "Precio de la obra sin IVA"}
              <button type="button" onClick={() => setEsPem(!esPem)} className="ml-2 normal-case tracking-normal text-[#2B6CB0] hover:underline">
                {esPem ? "o precio sin IVA" : "o PEM"}
              </button>
            </span>
            <input value={importe} onChange={(e) => setImporte(e.target.value)} inputMode="decimal" placeholder="Ej.: 120.000" className={campo} />
          </label>
          {(necesitaM2 || m2) && (
            <label className="block">
              <span className={etq}>Superficie afectada (m²)</span>
              <input value={m2} onChange={(e) => setM2(e.target.value)} inputMode="decimal" className={campo} />
            </label>
          )}
          {(necesitaM3 || m3) && (
            <label className="block">
              <span className={etq}>Residuos (m³), del estudio</span>
              <input value={m3} onChange={(e) => setM3(e.target.value)} inputMode="decimal" className={campo} />
            </label>
          )}
        </div>
        {!esPem && obra.pem !== null && (
          <p className="mt-2 text-[12px] text-carbon/55">PEM = precio sin IVA ÷ 1,19 = {eur(obra.pem)}</p>
        )}
        <label className="mt-3 flex items-center gap-2 text-[13px] text-carbon/80">
          <input type="checkbox" checked={conBonificacion} onChange={(e) => setConBonificacion(e.target.checked)} className="accent-lima-dark" />
          Aplicar las bonificaciones (si la obra cumple sus requisitos)
        </label>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-black/10 text-left text-[11px] uppercase tracking-wider text-carbon/45">
                <th className="py-2 pr-3 font-bold">Concepto</th>
                <th className="py-2 pr-3 font-bold">Cuándo</th>
                <th className="py-2 pr-3 text-right font-bold">Se adelanta</th>
                <th className="py-2 text-right font-bold">Coste final</th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((l) => (
                <tr key={l.regla.id} className="border-b border-black/5 align-top">
                  <td className="py-2 pr-3">
                    <div className="font-semibold text-carbon">
                      {CONCEPTO[l.regla.concepto] ?? l.regla.concepto}
                      {l.regla.subtipo && <span className="font-normal text-carbon/55"> · {l.regla.subtipo}</span>}
                    </div>
                    <div className="text-[12px] text-carbon/55">{l.explicacion}</div>
                  </td>
                  <td className="py-2 pr-3 text-carbon/70">{l.regla.momento ? MOMENTO[l.regla.momento] : "—"}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{l.adelanto === null ? <span className="text-carbon/40">—</span> : eur(l.adelanto)}</td>
                  <td className="py-2 text-right font-semibold tabular-nums">{l.final === null ? <span className="text-carbon/40">—</span> : eur(l.final)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="py-2 pr-3" colSpan={2}>
                  Total calculado{sinCifra.length ? <span className="font-normal text-carbon/55"> (sin lo que está por calcular)</span> : null}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{eur(total("adelanto"))}</td>
                <td className="py-2 text-right tabular-nums">{eur(total("final"))}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {ademas.length > 0 && (
          <div className="mt-3 text-[12.5px] text-carbon/70">
            <div className="text-[11px] font-bold uppercase tracking-wider text-carbon/45">Además, según el caso</div>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {ademas.map((r) => (
                <li key={r.id}>
                  <b>{CONCEPTO[r.concepto] ?? r.concepto}:</b> {r.formula}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => window.print()}
            disabled={obra.pem === null}
            className="rounded-xl bg-lima px-5 py-2 text-[14px] font-extrabold text-carbon transition hover:bg-lima-dark hover:text-white disabled:opacity-50"
            title={obra.pem === null ? "Pon antes el importe de la obra" : undefined}
          >
            Imprimir ficha para los vecinos
          </button>
        </div>
      </section>

      {/* ---------------------------------------------- la ficha (solo al imprimir) */}
      <section className="hidden text-[12px] text-black print:block">
        <h1 className="text-[20px] font-bold">Tasas e impuestos municipales de la obra</h1>
        <p className="mt-1">
          <b>{municipio}</b> · {tipoNombre} · {VIA[via]}
          {hayEcu ? ` · ${canal === "ecu" ? "por ECU" : "directa al Ayuntamiento"}` : ""}
          {obra.pem !== null ? ` · Presupuesto de ejecución material estimado: ${eur(obra.pem)}` : ""}
        </p>
        <table className="mt-4 w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th className="py-1 pr-2">Concepto</th>
              <th className="py-1 pr-2">Cuándo se paga</th>
              <th className="py-1 pr-2 text-right">Se adelanta</th>
              <th className="py-1 text-right">Coste final</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l) => (
              <tr key={l.regla.id} className="border-b border-black/30 align-top">
                <td className="py-1.5 pr-2">
                  <b>{CONCEPTO[l.regla.concepto] ?? l.regla.concepto}</b>
                  <div>{l.regla.formula ?? l.explicacion}</div>
                  {l.regla.bonificacionPct && conBonificacion ? (
                    <div>
                      Bonificación del {l.regla.bonificacionPct.toLocaleString("es-ES")} %
                      {l.regla.bonificacionForma ? `: ${FORMA_BONIF[l.regla.bonificacionForma]}` : ""}.
                      {l.regla.bonificacionRequisitos ? ` ${l.regla.bonificacionRequisitos}` : ""}
                    </div>
                  ) : null}
                  {l.regla.aviso && <div className="mt-0.5 italic">⚠ {l.regla.aviso}</div>}
                </td>
                <td className="py-1.5 pr-2">{l.regla.momento ? MOMENTO[l.regla.momento] : "—"}</td>
                <td className="py-1.5 pr-2 text-right">{l.adelanto === null ? "por calcular" : eur(l.adelanto)}</td>
                <td className="py-1.5 text-right">{l.final === null ? "por calcular" : eur(l.final)}</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="py-1.5" colSpan={2}>
                Total estimado{sinCifra.length ? " (sin los conceptos por calcular)" : ""}
              </td>
              <td className="py-1.5 pr-2 text-right">{eur(total("adelanto"))}</td>
              <td className="py-1.5 text-right">{eur(total("final"))}</td>
            </tr>
          </tbody>
        </table>
        {ademas.length > 0 && (
          <div className="mt-3">
            <b>Además, según el caso:</b>
            <ul className="list-disc pl-5">
              {ademas.map((r) => (
                <li key={r.id}>
                  {CONCEPTO[r.concepto] ?? r.concepto}: {r.formula}
                </li>
              ))}
            </ul>
          </div>
        )}

        {tramite && (
          <>
            <h2 className="mt-5 text-[15px] font-bold">Cómo se tramita</h2>
            <ol className="mt-1 list-decimal pl-5">
              {tramite.pasos.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>
            {tramite.plazoTipico && <p className="mt-2"><b>Plazo habitual:</b> {tramite.plazoTipico}</p>}
            {tramite.habilitaInicio && <p><b>Se puede empezar la obra con:</b> {tramite.habilitaInicio}</p>}
          </>
        )}

        <p className="mt-5 border-t border-black/40 pt-2">
          Las tasas del ayuntamiento son una estimación: se calculan sobre el coste estimado de la intervención y dependerán
          de las medidas reales del proyecto y de la normativa tributaria vigente en el momento de pagarlas.
        </p>
      </section>

      {/* ---------------------------------------------- como se pide */}
      <section className="mt-8 print:hidden">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-carbon/45">Cómo se pide</h2>
        <div className="mt-2 space-y-3">
          {tramites.map((t) => (
            <article key={t.id} className={CAJA + " px-5 py-4" + (t.id === tramite?.id ? " ring-2 ring-lima/60" : "")}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-[16px] font-bold text-carbon">{t.nombre}</h3>
                {!t.validada && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold uppercase text-amber-800">sin validar</span>}
              </div>
              <dl className="mt-2 grid gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-[170px_1fr]">
                {(
                  [
                    ["Dónde", t.dondeSePresenta],
                    ["Quién firma", t.quienFirma],
                    ["Plazo habitual", t.plazoTipico],
                    ["Se empieza con", t.habilitaInicio],
                    ["Requerimientos típicos", t.requerimientos],
                    ["Preguntar el estado", t.contacto],
                    ["Normativa", t.normativa],
                  ] as const
                )
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="font-semibold text-carbon/55">{k}</dt>
                      <dd className="text-carbon/85">{v}</dd>
                    </div>
                  ))}
              </dl>
              {t.avisos && (
                <p className="mt-2 rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
                  <b>Avisos:</b> {t.avisos}
                </p>
              )}
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {t.pasos.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-carbon/45">Pasos</div>
                    <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-[13px] text-carbon/85">
                      {t.pasos.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {t.documentos.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-carbon/45">Documentos</div>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] text-carbon/85">
                      {t.documentos.map((d) => (
                        <li key={d.nombre}>
                          {d.nombre}
                          {!d.obligatorio && <span className="text-carbon/45"> (si hace falta)</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {t.evidencia && <p className="mt-2 text-[11.5px] text-carbon/40">Sale de: {t.evidencia}</p>}
            </article>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------- todas las reglas */}
      <section className="mt-8 print:hidden">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-carbon/45">Todas las reglas de {municipio}</h2>
        <div className="mt-2 space-y-2">
          {reglas.map((r) => (
            <article key={r.id} className={CAJA + " px-5 py-3"}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-[14px] font-bold text-carbon">
                  {CONCEPTO[r.concepto] ?? r.concepto}
                  {r.subtipo && <span className="font-normal text-carbon/55"> · {r.subtipo}</span>}
                  <span className="ml-2 text-[12px] font-normal text-carbon/50">
                    {[
                      r.via === "ambas" ? null : VIA[r.via],
                      r.canal === "ambos" ? null : r.canal === "ecu" ? "por ECU" : "directa",
                      r.tipos.length ? r.tipos.map((k) => TIPOS.find((t) => t.clave === k)?.nombre ?? k).join(", ") : null,
                      r.organismo,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                {!r.validada && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold uppercase text-amber-800">sin validar</span>}
              </div>
              {r.formula && <p className="mt-1 text-[13px] text-carbon/85">{r.formula}</p>}
              {r.bonificacionPct ? (
                <p className="mt-1 text-[12.5px] text-carbon/75">
                  <b>Bonificación {r.bonificacionPct.toLocaleString("es-ES")} %</b>
                  {r.bonificacionForma ? ` (${FORMA_BONIF[r.bonificacionForma]})` : ""}
                  {r.bonificacionAlcance ? `. ${r.bonificacionAlcance}` : ""}
                  {r.bonificacionRequisitos ? `. ${r.bonificacionRequisitos}` : ""}
                  {r.bonificacionPlazo ? ` ${r.bonificacionPlazo}` : ""}
                  {r.requiereDescargo ? " Requiere descargo firmado por la comunidad." : ""}
                </p>
              ) : null}
              {r.notas && <p className="mt-1 text-[12.5px] text-carbon/60">{r.notas}</p>}
              <p className="mt-1 text-[11.5px] text-carbon/40">
                {[r.normativa, r.evidencia ? `Sale de: ${r.evidencia}` : null].filter(Boolean).join(" · ")}
              </p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
