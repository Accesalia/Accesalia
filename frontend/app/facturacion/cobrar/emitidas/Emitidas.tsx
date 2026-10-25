"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FilaEmitida, ParaFactusol } from "../../../../lib/proformasEmitidas";
import { accionEnviarFactusol, accionNota, accionOk, accionParaFactusol } from "./acciones";

// LA LISTA (maqueta validada): sin pedido en Factusol / con pedido. En cada fila: «Enviar a Factusol» (con sus
// comprobaciones a la vista), «Ok recibido» (el correo pegado) y «Nota».

const EXTRA = `
.rh .panel { background: var(--nuevo); border: 1px solid var(--nuevo-borde); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; max-width: 860px; }
.rh .chk { display: grid; grid-template-columns: 22px minmax(140px, 200px) minmax(0, 1fr); gap: 4px 10px; align-items: baseline; font-size: 13px; padding: 4px 0; border-bottom: 1px solid var(--linea); }
.rh .chk:last-child { border-bottom: 0; }
.rh .chk .s { font-weight: 800; }
.rh .chk .s.si { color: var(--lima-dark); }
.rh .chk .s.no { color: var(--ambar-txt); }
.rh .chk .q { color: var(--carbon-70); font-weight: 600; }
.rh .ficheros { display: flex; gap: 6px; flex-wrap: wrap; }
.rh .carpeta { font-family: ui-monospace, "Cascadia Mono", Consolas, monospace; font-size: 12.5px; background: var(--tarjeta); border: 1px solid var(--borde); border-radius: 6px; padding: 3px 8px; overflow-wrap: anywhere; }
.rh .fs-ok { color: var(--lima-dark); font-weight: 800; white-space: nowrap; }
.rh .fs-no { color: var(--carbon-65); white-space: nowrap; }
.rh td.acc { white-space: normal; min-width: 150px; }
.rh td .nota-p { display: block; font-size: 12px; color: var(--carbon-65); margin-top: 2px; max-width: 34ch; }
`;
const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const CORTA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" });
const corta = (iso: string) => CORTA.format(new Date(iso)).replace(".", "");
const hoy = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

type Abierto = { id: string; que: "factusol" | "ok" | "nota" } | null;

export function Emitidas({ filas }: { filas: FilaEmitida[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState<Abierto>(null);
  const [plan, setPlan] = useState<ParaFactusol | null>(null);
  const [texto, setTexto] = useState("");
  const [fecha, setFecha] = useState(hoy());
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<{ id: string; texto: string } | null>(null);
  const [ocupado, empezar] = useTransition();

  function abrir(f: FilaEmitida, que: "factusol" | "ok" | "nota") {
    setError(null);
    setPlan(null);
    setAbierto({ id: f.id, que });
    setTexto(que === "nota" ? (f.notas ?? "") : "");
    setFecha(hoy());
    if (que === "factusol")
      empezar(async () => {
        const r = await accionParaFactusol(f.id);
        if (!r.ok) setError(r.error);
        else setPlan(r.datos ?? null);
      });
  }
  function hacer(p: Promise<{ ok: true; datos?: unknown } | { ok: false; error: string }>, luego: (d: unknown) => void) {
    empezar(async () => {
      const r = await p;
      if (!r.ok) return setError(r.error);
      setError(null);
      setAbierto(null);
      luego(r.datos);
      router.refresh();
    });
  }

  const sin = filas.filter((f) => !f.pedido);
  const con = filas.filter((f) => f.pedido);
  const tabla = (lista: FilaEmitida[]) => (
    <div className="caja">
      <table>
        <thead>
          <tr><th>Proforma</th><th>Dirección · paga</th><th style={{ textAlign: "right" }}>Total</th><th>Enviada</th><th>Ok</th><th>Factusol</th><th /></tr>
        </thead>
        <tbody>
          {lista.map((f) => {
            const on = abierto?.id === f.id;
            return (
              <Fragment key={f.id}>
                <tr className={on ? "abierto" : undefined}>
                  <td className="nw">
                    <b>{f.codigo}</b>
                    <div className="hoja"><a className="enlace" href={`/facturacion/proforma/${f.id}`}>abrir</a> · <a className="enlace" href={`/facturacion/proforma/${f.id}/pdf`} target="_blank" rel="noreferrer">PDF</a></div>
                  </td>
                  <td>
                    <div className="dir">{f.direccion}</div>
                    <span className="nota-p">{f.paga}{f.contrata ? " · contrata" : ""}</span>
                    {f.notas && <span className="nota-p"><b>{f.notas}</b></span>}
                  </td>
                  <td className="num"><b>{EUR.format(f.total)} €</b></td>
                  <td style={{ maxWidth: "24ch" }}>{f.enviada ? `${corta(f.enviada.en)} · ${f.enviada.para.join(", ")}` : <span className="nota">sin enviar desde la app</span>}</td>
                  <td>
                    {f.ok ? (
                      <span className="estado-cobro e-ok" title={f.ok.correo ?? ""}>✓ {corta(f.ok.en)}{f.ok.correo ? " · correo guardado" : ""}</span>
                    ) : f.contrata ? (
                      <span className="nota">contrata: no espera ok</span>
                    ) : f.sinRespuesta ? (
                      <span className="pill p-ambar">sin respuesta en 3 días laborables</span>
                    ) : (
                      <span className="nota">esperando</span>
                    )}
                  </td>
                  <td>
                    {f.pedido ? <span className="fs-ok">✓ {f.pedido.texto}{f.pedido.como === "ya_estaba" ? " · ya estaba" : ""}</span> : <span className="fs-no">sin pedido</span>}
                    {f.choque && <div><span className="pill p-dev" style={{ marginTop: 4, whiteSpace: "normal" }}>{f.choque}</span></div>}
                    {hecho?.id === f.id && <div className="nota">{hecho.texto}</div>}
                  </td>
                  <td className="acc">
                    {!f.pedido && <button type="button" className="btn peq" onClick={() => abrir(f, "factusol")}>Enviar a Factusol</button>}{" "}
                    {f.pedido?.como === "enviado" && <a className="btn sec peq" href={`/facturacion/proforma/${f.id}/factusol`}>Bajar el zip</a>}{" "}
                    {!f.ok && !f.contrata && <button type="button" className="btn sec peq" onClick={() => abrir(f, "ok")}>Ok recibido</button>}{" "}
                    <button type="button" className="btn sec peq" onClick={() => abrir(f, "nota")}>Nota</button>
                  </td>
                </tr>
                {on && (
                  <tr className="abierto">
                    <td />
                    <td colSpan={6}>
                      {abierto.que === "factusol" && (
                        <div className="panel">
                          <b>Enviar a Factusol como pedido</b>
                          {!plan && !error && <span className="nota">Comprobando…</span>}
                          {plan && (
                            <>
                              {plan.comprobaciones.map((c) => (
                                <div key={c.que} className="chk">
                                  <span className={`s ${c.ok ? "si" : "no"}`}>{c.ok ? "✓" : "!"}</span>
                                  <span className="q">{c.que}</span>
                                  <span>{c.texto}{c.enlace && <> <a className="enlace" href={c.enlace}>Ver los clientes de Factusol</a></>}</span>
                                </div>
                              ))}
                              <div><span className="et">Los ficheros que importa Factusol</span>
                                <div className="ficheros">{plan.ficheros.map((x) => <span key={x} className="doc">📄 {x}</span>)}</div></div>
                              <div><span className="et">A dónde van</span>
                                <div className="carpeta">Dropbox / Factusol – importar / {plan.carpeta} /</div>
                                <div className="nota" style={{ marginTop: 4 }}>
                                  {plan.dropbox ? "Se dejan en esa carpeta del Dropbox." : "La app aún no tiene su acceso al Dropbox: se descarga un zip con esa carpeta dentro."} Se guarda una copia junto a la proforma.
                                </div></div>
                              <div className="nota">En Factusol: Utilidades › Importaciones, elegir la carpeta. El pedido queda con el mismo número que la proforma.</div>
                            </>
                          )}
                          {error && <div className="aviso">{error}</div>}
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                            <button type="button" className="btn sec peq" onClick={() => setAbierto(null)}>Cancelar</button>
                            <button type="button" className="btn peq" disabled={!plan?.listo || ocupado}
                              onClick={() => hacer(accionEnviarFactusol(f.id), (d) => {
                                const r = d as { dropbox: boolean };
                                if (!r.dropbox) window.location.href = `/facturacion/proforma/${f.id}/factusol`;
                                setHecho({ id: f.id, texto: r.dropbox ? "Dejado en el Dropbox." : "Zip descargado." });
                              })}>
                              {plan && !plan.listo ? "Falta algo: mira arriba" : plan?.dropbox ? "Dejarlo en el Dropbox y marcar «Enviada a Factusol»" : "Descargar el zip y marcar «Enviada a Factusol»"}
                            </button>
                          </div>
                        </div>
                      )}
                      {abierto.que === "ok" && (
                        <div className="panel">
                          <b>Ok recibido</b>
                          <div className="form-en-fila">
                            <div className="ancho"><label className="et" htmlFor={`ok-${f.id}`}>El correo del ok (pégalo entero)</label>
                              <textarea id={`ok-${f.id}`} rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="«Buenos días, adelante con el cargo…»" /></div>
                            <div><label className="et" htmlFor={`okf-${f.id}`}>Cuándo</label><input id={`okf-${f.id}`} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
                          </div>
                          <div className="nota">Queda guardado en la proforma: quién dio el ok y cuándo.</div>
                          {error && <div className="aviso">{error}</div>}
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button type="button" className="btn sec peq" onClick={() => setAbierto(null)}>Cancelar</button>
                            <button type="button" className="btn peq" disabled={ocupado || !texto.trim()} onClick={() => hacer(accionOk(f.id, texto, fecha), () => null)}>Guardar el ok</button>
                          </div>
                        </div>
                      )}
                      {abierto.que === "nota" && (
                        <div className="panel">
                          <label className="et" htmlFor={`nt-${f.id}`}>Nota de la proforma</label>
                          <input id={`nt-${f.id}`} type="text" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="«Enviada también por correo postal»" />
                          {error && <div className="aviso">{error}</div>}
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button type="button" className="btn sec peq" onClick={() => setAbierto(null)}>Cancelar</button>
                            <button type="button" className="btn peq" disabled={ocupado} onClick={() => hacer(accionNota(f.id, texto), () => null)}>Guardar</button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: EXTRA }} />
      <div className="sec-tit">Sin pedido en Factusol <span className="n">{sin.length}{sin.length ? " · hay que mandarlas a Factusol" : ""}</span></div>
      {sin.length ? tabla(sin) : <p className="nota">Todas tienen su pedido.</p>}
      <div className="sec-tit">Con pedido en Factusol, esperando para facturar <span className="n">{con.length}</span></div>
      {con.length ? tabla(con) : <p className="nota">Ninguna.</p>}
    </>
  );
}
