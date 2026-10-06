"use client";

import { useMemo, useRef, useState, useTransition, type CSSProperties, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DocViabilidad, LineaTasa } from "../../../../lib/viabilidadComercial";
import { loQueFalta } from "../../../../lib/viabilidadReglas";
import { accionGenerar, accionGuardar } from "./acciones";

// EL DOCUMENTO TAL CUAL SALDRA (maqueta del 3-oct, docs/figma/viabilidad.html):
// las medidas y colores del papel son los suyos, copiados de la maqueta. Lo que
// toca el comercial se escribe encima del propio papel; lo que no es suyo (la
// obra de Alex, los honorarios de la hoja) se ve pero no se toca aqui.
//
// A la derecha, el margen: como las notas de la maqueta, pero con lo que hay que
// saber para generarlo.

const PAPEL = `
.vb-pagina{width:794px;min-height:1123px;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.12);padding:40px 46px 34px;position:relative;flex:none;color:#2b2b2b;font-family:"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.vb-franja{position:absolute;left:0;right:0;top:0;height:10px;background:#8fae5e}
.vb-cab{display:flex;justify-content:space-between;align-items:flex-start}
.vb-logo{font-size:30px;font-weight:300;color:#4d7a2a;letter-spacing:.02em;font-style:italic;padding-top:6px}
.vb-logo b{font-weight:800;color:#7ac943}
.vb-empresa{text-align:right;font-size:11px;line-height:1.45;color:rgba(43,43,43,.85)}
.vb-titulo{display:inline-block;margin-top:22px;background:#c9dea6;border-radius:22px;padding:9px 34px;font-size:16px;letter-spacing:.02em}
.vb-arriba{display:grid;grid-template-columns:1fr 250px;gap:22px;margin-top:18px;align-items:start}
.vb-datos{list-style:none;font-size:14px;line-height:1.9;padding-left:6px}
.vb-datos li::before{content:"•";margin-right:10px}
.vb-datos b{font-weight:600}
.vb-captura{border:2px solid #c6dc9f;border-radius:4px;overflow:hidden;background:#fffaf0;height:180px;display:flex;align-items:center;justify-content:center}
.vb-captura img{width:100%;height:100%;object-fit:cover;display:block}
.vb-raya{height:4px;background:#c6dc9f;margin:18px 0 14px}
.vb-lead{font-size:14px;margin-bottom:12px}
.vb-pagina h3{font-family:"Times New Roman",Georgia,serif;font-size:14px;font-weight:700;text-transform:uppercase;margin:14px 0 6px}
.vb-cuerpo{font-family:"Times New Roman",Georgia,serif;font-size:13.5px;line-height:1.45;text-align:justify}
.vb-escalera{font-family:"Times New Roman",Georgia,serif;font-size:13.5px;font-weight:700;margin:8px 0 3px}
.vb-pem{font-family:"Times New Roman",Georgia,serif;font-size:14px}
.vb-costes{width:100%;border-collapse:collapse;margin-top:6px;font-size:13px}
.vb-costes th{background:#c9dea6;text-align:left;padding:8px 10px;font-size:14px;border:1px solid #555}
.vb-costes td{border:1px solid #555;padding:7px 10px;vertical-align:top}
.vb-costes td.imp{width:270px;white-space:nowrap}
.vb-costes .sub{display:block;font-size:11.5px;color:rgba(43,43,43,.8)}
.vb-costes .iva{font-size:10.5px;color:rgba(43,43,43,.75)}
.vb-costes tr.dentro td:first-child{padding-left:26px}
.vb-costes tr.total td{font-weight:800;font-size:14px}
.vb-nota{font-size:11px;color:rgba(43,43,43,.75);margin-top:6px}
.vb-clausulas{margin-top:18px;font-size:10px;line-height:1.45}
.vb-clausulas p{margin-bottom:7px}
.vb-pie{display:flex;justify-content:space-between;align-items:flex-end;margin-top:26px}
.vb-contacto{font-size:12px;line-height:1.6}
.vb-firma{text-align:right;font-size:15px;line-height:1.5}
.vb-sello{display:inline-block;border:1px dashed #a9a9a9;color:#8a8a8a;font-size:10px;padding:6px 10px;margin-right:14px;vertical-align:middle}
.vb-escribe{width:100%;resize:none;background:#fbfdf7;border:1px dashed #b9c9a3;border-radius:4px;padding:3px 5px;outline:none;color:inherit}
.vb-escribe:focus{border-style:solid;border-color:#7ac943;background:#fff}
.vb-escribe::placeholder{color:rgba(43,43,43,.55);font-style:italic}
`;
// Que el recuadro crezca con lo escrito, sin barra de desplazamiento dentro del papel.
const CRECE = { fieldSizing: "content", minHeight: "3.2em" } as CSSProperties;

// Sin decimales si es redondo; si no, los dos (como el PDF).
const num = (n: number) => {
  const d = Number.isInteger(Math.round(n * 100) / 100) ? 0 : 2;
  return new Intl.NumberFormat("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: "always" }).format(n);
};
const eur = (n: number) => new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" }).format(n) + " €";
const fechaCorta = (f: string | null) => (f ? f.slice(0, 10).split("-").reverse().join("/") : "");
const leerImporte = (t: string): number | null => {
  const limpio = t.replace(/[€\s]/g, "").replace(/\./g, "").replace(",", ".");
  return limpio && !Number.isNaN(Number(limpio)) ? Number(limpio) : null;
};

type Tasa = LineaTasa & { clave: number; texto: string };

/** Enter pasa al campo siguiente, nunca envia (guia de estilo, regla 9). */
function siguiente(e: KeyboardEvent<HTMLInputElement>) {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const campos = Array.from(document.querySelectorAll<HTMLElement>("[data-vb-campo]"));
  campos[campos.indexOf(e.currentTarget) + 1]?.focus();
}

export function Documento({ d }: { d: DocViabilidad }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [objeto, setObjeto] = useState(d.objeto);
  const [descripcion, setDescripcion] = useState(d.descripcion);
  const [conclusion, setConclusion] = useState(d.conclusion);
  const [escaleras, setEscaleras] = useState(d.escaleras);
  const [conHonorarios, setConHonorarios] = useState(d.conHonorarios);
  const clave = useRef(0);
  const nueva = (t: Partial<LineaTasa> = {}): Tasa => ({
    clave: ++clave.current,
    concepto: t.concepto ?? "",
    importe: t.importe ?? null,
    texto: t.importe != null ? num(t.importe) : "",
  });
  // Tasas e ICIO van SIEMPRE: si aun no hay ninguna, se deja la fila puesta.
  const [tasas, setTasas] = useState<Tasa[]>(() => (d.tasas.length ? d.tasas.map(nueva) : [nueva({ concepto: "Tasas urbanísticas e ICIO" })]));

  const datos = () => ({
    objeto,
    descripcion,
    conclusion,
    escaleras: escaleras.map((e) => ({ accesoId: e.accesoId, texto: e.texto })),
    tasas: tasas.map((t) => ({ concepto: t.concepto, importe: t.importe })),
    conHonorarios,
  });

  const honorarios = conHonorarios ? d.honorarios : [];
  const tasasConImporte = tasas.filter((t) => t.importe);
  const total = useMemo(
    () =>
      d.obra.reduce((s, l) => s + l.total, 0) +
      tasas.reduce((s, t) => s + (t.importe ?? 0), 0) +
      honorarios.reduce((s, h) => s + h.total, 0),
    [d.obra, tasas, honorarios],
  );
  const falta = loQueFalta({ capturaUrl: d.capturaUrl, objeto, obra: d.obra, tasas, conHonorarios, honorarios: d.honorarios });
  const obraTotal = d.obra.reduce((s, l) => s + l.total, 0);
  const unaObra = d.obra.length === 1 ? d.obra[0] : null;
  const ultimaVacia = tasas.length > 0 && !tasas.at(-1)!.concepto.trim() && tasas.at(-1)!.importe === null;
  const pdf = `/comercial/viabilidad/${d.id}/pdf`;
  const hoja = d.comunidadId ? `/comercial/hoja-encargo?comunidad=${d.comunidadId}&opp=${d.oppId}` : null;

  const guardar = () =>
    empezar(async () => {
      setError(null);
      const r = await accionGuardar(d.id, datos());
      if (!r.ok) setError(r.error);
      else setAviso("Guardado.");
    });
  const generar = () =>
    empezar(async () => {
      setError(null);
      setAviso(null);
      const r = await accionGenerar(d.id, datos());
      if (!r.ok) return setError(r.error);
      router.refresh();
    });

  const cambiaTasa = (k: number, c: Partial<Tasa>) => setTasas((ts) => ts.map((t) => (t.clave === k ? { ...t, ...c } : t)));

  return (
    <div>
      <style>{PAPEL}</style>

      {/* ---------- la cabecera: titulo, y Guardar / Generar arriba a la derecha (regla 1) */}
      <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-black/10 pb-4">
        <h1 className="text-[25px] font-bold leading-tight text-carbon">Viabilidad · {d.ubicacion}</h1>
        <span className="text-[13px] text-carbon/65">
          {d.numero ? `${d.numero} v${d.version}` : "Sin generar todavía"}
          {d.rematada && ` · generada el ${fechaCorta(d.rematada.cuando)}${d.rematada.quien ? ` por ${d.rematada.quien}` : ""}`}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={guardar} disabled={pendiente} className="rounded-xl border border-black/15 bg-white px-4 py-2 text-[13px] font-semibold text-carbon/75 transition hover:border-carbon/40 disabled:opacity-40">
            Guardar
          </button>
          <button
            type="button"
            onClick={generar}
            disabled={pendiente || falta.length > 0}
            title={falta.length ? `Falta ${falta.join(", ")}` : undefined}
            className="rounded-xl bg-lima px-5 py-2 text-[13px] font-bold text-carbon transition hover:bg-lima-dark hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pendiente ? "Un momento…" : d.generada ? `Generar v${d.version + 1}` : "Generar viabilidad"}
          </button>
        </div>
      </div>

      {d.superadaPor && (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900/80">
          <b>Modificada en hoja de encargo {d.superadaPor}.</b> Esta viabilidad ya no es la vigente: si se vuelve a mandar, genérala de nuevo.
        </div>
      )}
      {error && <div className="mt-4 rounded-xl border border-alerta/40 bg-alerta/5 px-4 py-2.5 text-[13px] text-alerta">{error}</div>}
      {aviso && !error && <div className="mt-4 text-[13px] font-semibold text-lima-dark">{aviso}</div>}

      <div className="mt-5 flex items-start gap-[22px]">
        {/* ================================================= el papel */}
        <div className="flex flex-col gap-6">
          {/* ---------------- pagina 1 · quien, donde y que */}
          <div className="vb-pagina">
            <div className="vb-franja" />
            <div className="vb-cab">
              <div className="vb-logo">
                accesali<b>a</b>
              </div>
              <div className="vb-empresa">
                SOLUCIONES DE ACCESIBILIDAD Y<br />
                ECOEFICIENCIA ACCESALIA S.L.
                <br />
                c/ Alhambra, 24. (28047) Madrid. / B86374055
              </div>
            </div>
            <div className="vb-titulo">ESTUDIO DE VIABILIDAD Y COSTES</div>

            <div className="vb-arriba">
              <ul className="vb-datos">
                <li><b>Proyecto:</b> {d.proyecto || <span className="text-amber-700/70">por completar</span>}</li>
                <li><b>Ubicación:</b> {d.ubicacion}</li>
                <li><b>Arquitecto:</b> {d.arquitecto}</li>
                <li><b>Fecha de visita:</b> {fechaCorta(d.fechaVisita)}</li>
              </ul>
              <div className="vb-captura">
                {d.capturaUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="Captura del 3D" src={d.capturaUrl} />
                ) : (
                  <span className="px-4 text-center text-[12px] text-amber-800/80">Falta la captura del 3D: la guarda Alex en la mesa</span>
                )}
              </div>
            </div>

            <div className="vb-raya" />
            <p className="vb-lead">La intervención en el edificio ubicado en {d.ubicacion}, consistirá en:</p>

            <h3>Objeto del proyecto:</h3>
            <textarea className="vb-escribe vb-cuerpo" style={CRECE} value={objeto} onChange={(e) => setObjeto(e.target.value)} placeholder="Qué se va a hacer" />

            <h3>Descripción de las intervenciones:</h3>
            <textarea
              className="vb-escribe vb-cuerpo"
              style={CRECE}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder={escaleras.length ? "Lo común a todas las escaleras (si hay algo)" : "Cómo se va a hacer"}
            />
            {escaleras.map((e) => (
              <div key={e.accesoId}>
                <p className="vb-escalera">{e.nombre}:</p>
                <textarea
                  className="vb-escribe vb-cuerpo"
                  style={CRECE}
                  value={e.texto}
                  onChange={(ev) => setEscaleras((es) => es.map((x) => (x.accesoId === e.accesoId ? { ...x, texto: ev.target.value } : x)))}
                />
              </div>
            ))}

            <h3>Presupuesto de ejecución material estimado:</h3>
            <p className="vb-pem">
              <b>{eur(d.pem)}</b> (IVA no incluido)
            </p>
            {d.obra.length > 1 &&
              d.obra.map((l, i) => (
                <p key={i} className="vb-pem pl-3 text-[13px]">
                  {l.concepto}: {eur(l.pem)}
                </p>
              ))}

            <h3>Conclusión:</h3>
            <textarea className="vb-escribe vb-cuerpo" style={CRECE} value={conclusion} onChange={(e) => setConclusion(e.target.value)} placeholder="¿Es viable? En una o dos frases" />
          </div>

          {/* ---------------- pagina 2 · cuanto cuesta y en que condiciones */}
          <div className="vb-pagina">
            <div className="vb-franja" />
            <table className="vb-costes">
              <tbody>
                <tr><th colSpan={2}>COSTES</th></tr>

                {honorarios.map((h, i) => (
                  <tr key={`h${i}`}>
                    <td>
                      {h.rotulo.toUpperCase()} <span className="iva">(IVA {num(h.ivaPct)}%)</span>
                      {h.detalle && <span className="sub">{h.detalle}</span>}
                    </td>
                    <td className="imp">
                      {num(h.base)} + {num(h.total - h.base)} IVA = <b>{eur(h.total)}</b>
                    </td>
                  </tr>
                ))}

                {unaObra ? (
                  <tr>
                    <td>
                      COSTE DE OBRA <span className="iva">(contrata · IVA {num(unaObra.ivaPct)}%)</span>
                      <span className="sub">
                        {unaObra.concepto && `${unaObra.concepto}. `}PEM {num(unaObra.pem)} + {num(unaObra.biPct)}% de beneficio industrial = {num(unaObra.sinIva)} sin IVA. Varía según la empresa contratista.
                      </span>
                    </td>
                    <td className="imp">
                      {num(unaObra.sinIva)} + {num(unaObra.total - unaObra.sinIva)} IVA = <b>{eur(unaObra.total)}</b>
                    </td>
                  </tr>
                ) : d.obra.length ? (
                  <>
                    <tr>
                      <td>
                        COSTE DE EJECUCIÓN DE OBRA <span className="iva">(contrata · IVA incluido)</span>
                        <span className="sub">Varía según la empresa contratista.</span>
                      </td>
                      <td className="imp"><b>{eur(obraTotal)}</b></td>
                    </tr>
                    {d.obra.map((l, i) => (
                      <tr key={`o${i}`} className="dentro">
                        <td>
                          {l.concepto || "Obra"}
                          <span className="sub">PEM {num(l.pem)} + {num(l.biPct)}% de beneficio industrial = {num(l.sinIva)} sin IVA</span>
                        </td>
                        <td className="imp">
                          {num(l.sinIva)} + {num(l.total - l.sinIva)} IVA = <b>{eur(l.total)}</b>
                        </td>
                      </tr>
                    ))}
                  </>
                ) : (
                  <tr>
                    <td colSpan={2} className="bg-amber-50/60 text-amber-900/80">COSTE DE OBRA — falta: lo estima Alex en la mesa de viabilidades</td>
                  </tr>
                )}

                {/* Las tasas son lo que escribe aqui el comercial: sin IVA, siempre. */}
                <tr>
                  <td>
                    TASAS URBANÍSTICAS E ICIO <span className="iva">(no aplica IVA)</span>
                    <span className="sub">Estimación. Depende del Ayuntamiento (ver cláusulas 2 y 3).</span>
                  </td>
                  <td className="imp"><b>{eur(tasasConImporte.reduce((s, t) => s + (t.importe ?? 0), 0))}</b></td>
                </tr>
                {tasas.map((t) => (
                  <tr key={t.clave} className="dentro">
                    <td>
                      <div className="flex items-center gap-2">
                        <input
                          data-vb-campo
                          className="vb-escribe"
                          value={t.concepto}
                          placeholder="Licencia, ICIO…"
                          onChange={(e) => cambiaTasa(t.clave, { concepto: e.target.value })}
                          onKeyDown={siguiente}
                        />
                        <button
                          type="button"
                          aria-label="Quitar esta tasa"
                          onClick={() => setTasas((ts) => ts.filter((x) => x.clave !== t.clave))}
                          className="shrink-0 text-[15px] leading-none text-carbon/50 hover:text-alerta"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                    <td className="imp">
                      <input
                        data-vb-campo
                        className="vb-escribe text-right"
                        inputMode="decimal"
                        value={t.texto}
                        placeholder="0,00"
                        onChange={(e) => cambiaTasa(t.clave, { texto: e.target.value, importe: leerImporte(e.target.value) })}
                        onBlur={() => t.importe != null && cambiaTasa(t.clave, { texto: num(t.importe) })}
                        onKeyDown={siguiente}
                      />
                    </td>
                  </tr>
                ))}
                <tr className="dentro">
                  <td colSpan={2} className="!py-1">
                    <button
                      type="button"
                      disabled={ultimaVacia}
                      onClick={() => setTasas((ts) => [...ts, nueva()])}
                      className="text-[12px] font-semibold text-lima-dark hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      + Añadir otra tasa
                    </button>
                  </td>
                </tr>

                <tr className="total">
                  <td>
                    COSTE ESTIMADO TOTAL <span className="iva font-normal">(IVA incluido)</span>
                  </td>
                  <td className="imp">{eur(total)}</td>
                </tr>
              </tbody>
            </table>

            {conHonorarios && d.hojas.length > 0 && (
              <p className="vb-nota">
                Honorarios calculados según lo ofertado en{" "}
                {d.hojas
                  .map((h) => (h.borrador || !h.codigo ? "la hoja de encargo en preparación" : `la hoja de encargo ${h.codigo} v${h.version}${h.fecha ? `, de ${fechaCorta(h.fecha)}` : ""}`))
                  .join("; ")}
                .
              </p>
            )}

            <div className="vb-raya" />

            <div className="vb-clausulas">
              {d.clausulas.map((c, i) => (
                <p key={i}>
                  <b>
                    {i + 1}.{c.titulo ? ` ${c.titulo}:` : ""}
                  </b>
                  {c.titulo ? <br /> : " "}
                  {c.texto}
                </p>
              ))}
            </div>

            <div className="vb-pie">
              <div className="vb-contacto">
                www.accesalia.com<br />accesalia@accesalia.es<br />(+34) 644 482 971<br />Accesalia
              </div>
              <div className="vb-firma">
                <span className="vb-sello">firma digital</span>Madrid, {new Date().toLocaleDateString("es-ES")}
                <br />Fdo.: {d.firmante}
              </div>
            </div>
          </div>

          {/* ---------------- pagina 3 · el anexo, el mismo que va en el PDF */}
          <iframe
            src={`/comercial/oportunidades/${d.oppId}/anexo#view=FitH&toolbar=0`}
            title="Anexo: ficha del edificio"
            className="h-[1123px] w-[794px] border-0 bg-white shadow-[0_2px_10px_rgba(0,0,0,.12)]"
          />
        </div>

        {/* ================================================= el margen */}
        <aside className="sticky top-4 flex min-w-0 flex-1 flex-col gap-3 text-[13px]">
          {d.generada && (
            <div className="rounded-2xl border border-lima/60 bg-lima-soft p-4">
              <p className="font-bold text-carbon/85">📄 {d.numero} v{d.version}</p>
              <div className="mt-2 flex gap-3">
                <a href={pdf} target="_blank" rel="noreferrer" className="font-semibold text-lima-dark hover:underline">Abrir</a>
                <a href={`${pdf}?descargar=1`} className="font-semibold text-lima-dark hover:underline">Descargar</a>
              </div>
            </div>
          )}

          {falta.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-amber-900/80">
              <p className="font-bold text-amber-800/80">Para generarla falta</p>
              <ul className="mt-1.5 list-disc pl-4 leading-snug">
                {falta.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-[#bfbfbf] bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-carbon/70">Honorarios</p>
            <label className="mt-2 flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={!conHonorarios} onChange={(e) => setConHonorarios(!e.target.checked)} className="accent-lima-dark" />
              <span>Sin honorarios <span className="text-carbon/65">(«no me pases precio»)</span></span>
            </label>
            {conHonorarios && (
              <p className="mt-2 leading-snug text-carbon/70">
                {d.hojas.length
                  ? "Salen de la hoja de encargo: para cambiarlos, cámbialos allí."
                  : "Esta oportunidad no tiene hoja de encargo con importes."}
              </p>
            )}
            {hoja && (
              <Link href={hoja} className="mt-2 inline-block font-semibold text-lima-dark hover:underline">
                {d.hojas.length ? "Ir a la hoja de encargo →" : "Preparar la hoja de encargo →"}
              </Link>
            )}
          </div>

          <div className="rounded-2xl border border-[#bfbfbf] bg-white p-4 leading-relaxed">
            <p className="text-[11px] font-bold uppercase tracking-wide text-carbon/70">Quién</p>
            <p>
              <span className="text-carbon/65">Redacta:</span> {d.redacta ?? "—"}
              {!d.alexTermino && <span className="ml-1 text-amber-800/80">(aún no te la ha enviado)</span>}
            </p>
            <p><span className="text-carbon/65">Remata:</span> {d.rematada?.quien ?? "quien la genere"}</p>
            <p><span className="text-carbon/65">Firma:</span> {d.firmante}</p>
            <p className="mt-2 text-carbon/65">La obra (coste estimado, 19% y IVA) es de Alex: se cambia en su mesa.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
