"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DetalleCosas, HitoCosas, ItemCheck, PagadorCosas } from "../../../../../lib/cosasAFacturar";
import type { FormaCobro } from "../../../../../lib/condicionesCobro";
import { accionCif, accionCodigo, accionEmisor, accionEmitir, accionEnviar, accionIban } from "../acciones";

// LOS CUATRO PASOS (maqueta validada): 1 ¿lo tengo todo?, 2 ¿que facturo?, 3 ¿quien factura?, 4 la proforma, vista
// antes de emitirla y partida sola por pagador y empresa. Emitida: el correo, con la proforma y la hoja firmada.

const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const eur = (n: number) => `${EUR.format(n)} €`;
const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const fecha = (iso: string | null) => (iso ? FECHA.format(new Date(iso.slice(0, 10) + "T00:00:00Z")).replace(".", "") : "");
const FORMAS: [FormaCobro, string][] = [["cargo_cuenta", "Cargo en cuenta"], ["transferencia", "Transferencia"], ["confirming", "Confirming"]];
const EMPRESA = { accesalia: "Accesalia", daniel: "Daniel" } as const;
const min = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const rellenar = (t: string, h: Record<string, string>) => Object.entries(h).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), t);

type Resp = Promise<{ ok: true; datos?: unknown } | { ok: false; error: string }>;
/** Lo emitido, con lo que hace falta para enviarlo (la pantalla se recarga y esos hitos ya no estan para facturar). */
type Emitida = {
  id: string; codigo: string; empresa: "accesalia" | "daniel"; total: number; hitos: HitoCosas[];
  destinatarios: PagadorCosas["destinatarios"]; hojas: { id: string; numero: string; pdf: string | null }[];
};

export function Cosas({ d }: { d: DetalleCosas }) {
  const router = useRouter();
  const [ocupado, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const todos = useMemo(() => d.hojas.flatMap((h) => h.hitos), [d]);
  const [sel, setSel] = useState<Set<string>>(() => new Set(todos.filter((x) => x.ya).map((x) => x.id)));
  const [importe, setImporte] = useState<Record<string, string>>({});
  const [antes, setAntes] = useState<Record<string, { motivo: string; correo: string }>>({});
  const [formas, setFormas] = useState<Record<string, FormaCobro>>({});
  const [emitidas, setEmitidas] = useState<Emitida[]>([]);
  const empresaDe = (lineaId: string) => d.lineas.find((l) => l.id === lineaId)?.empresa ?? "accesalia";

  function hacer(p: Resp, luego?: (datos: unknown) => void) {
    empezar(async () => {
      const r = await p;
      if (!r.ok) return setError(r.error);
      setError(null);
      luego?.(r.datos);
      router.refresh();
    });
  }

  const elegidos = todos.filter((x) => sel.has(x.id));
  const imp = (x: HitoCosas) => {
    const t = importe[x.id];
    if (t != null && t.trim()) return Number(t.replace(/\./g, "").replace(",", ".")) || 0;
    return x.importe ?? 0;
  };
  // Una proforma = un pagador + una empresa.
  const grupos = useMemo(() => {
    const g = new Map<string, HitoCosas[]>();
    for (const x of elegidos) {
      const k = `${x.pagador}|${empresaDe(x.lineaId)}`;
      g.set(k, [...(g.get(k) ?? []), x]);
    }
    return [...g.entries()].map(([k, xs]) => ({ pagador: d.pagadores.find((p) => p.clave === k.split("|")[0]) ?? null, empresa: k.split("|")[1] as "accesalia" | "daniel", xs }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elegidos, d]);
  const faltaPaso1 = grupos.flatMap((g) => g.pagador?.checklist.filter((c) => !c.ok) ?? []);
  const sinMotivo = elegidos.filter((x) => !x.ya && !antes[x.id]?.motivo?.trim());
  const sinImporte = elegidos.filter((x) => !(imp(x) > 0));
  const bloqueo = !elegidos.length ? "Marca qué facturas." : faltaPaso1.length ? `Falta completar el paso 1 (${faltaPaso1.length}).`
    : sinMotivo.length ? "Falta el motivo de lo que se factura antes de tiempo." : sinImporte.length ? "Falta el importe de algún hito (los de a éxito se escriben a mano)." : null;

  function emitir() {
    hacer(
      accionEmitir(d.oppId, {
        hitos: elegidos.map((x) => ({ id: x.id, importe: imp(x), motivo: antes[x.id]?.motivo, correo: antes[x.id]?.correo })),
        formas,
      }),
      (datos) => {
        const hechas = datos as { id: string; codigo: string }[];
        setEmitidas(hechas.map((h, i) => {
          const g = grupos[i];
          const base = g.xs.reduce((s, x) => s + imp(x), 0);
          const irpf = d.emisoras[g.empresa].irpf;
          const hojas = [...new Set(g.xs.map((x) => x.hojaId))].map((id) => {
            const x = d.hojas.find((y) => y.id === id)!;
            return { id, numero: x.numero, pdf: x.pdf };
          });
          return { ...h, empresa: g.empresa, total: base + (base * d.ivaPct) / 100 - (base * irpf) / 100, hitos: g.xs, destinatarios: g.pagador?.destinatarios ?? [], hojas };
        }));
        setSel(new Set());
      },
    );
  }

  return (
    <div className="pasos" style={{ marginTop: 14 }}>
      <div className="col">
        {/* 1 · ¿LO TENGO TODO? */}
        {d.pagadores.map((p) => (
          <Paso1 key={p.clave} p={p} oppId={d.oppId} hacer={hacer} ocupado={ocupado} ordenes={d.ordenesDeCompra} varios={d.pagadores.length > 1} />
        ))}

        {/* 2 · ¿QUE FACTURO? */}
        <div className="paso-c">
          <h3><span className="num">2</span>¿Qué facturo? <span className="nota" style={{ fontWeight: 400 }}>{sel.size} {sel.size === 1 ? "hito" : "hitos"}</span></h3>
          {d.hojas.map((h) => (
            <div key={h.id} className="hoja-g">
              <div className="hc">
                <span><b>{h.numero}</b>{h.firma ? ` · firmada el ${fecha(h.firma)}` : ""}</span>
                {h.pdf && <a href={h.pdf} target="_blank" rel="noreferrer">Ver la hoja firmada ↗</a>}
              </div>
              {h.hitos.map((x) => {
                const on = sel.has(x.id);
                return (
                  <div key={x.id} className={`hito-f${x.ya ? "" : " antes"}`}>
                    <input type="checkbox" checked={on} aria-label="Facturar"
                      onChange={() => setSel((s) => { const n = new Set(s); if (n.has(x.id)) n.delete(x.id); else n.add(x.id); return n; })} />
                    <span className="que">
                      {x.que}
                      <small>{x.linea} · {x.ya ? <><b style={{ color: "var(--lima-dark)" }}>alcanzado</b>{x.porque ? ` · ${x.porque}` : ""}</> : "aún no alcanzado"}</small>
                    </span>
                    {x.importe == null || importe[x.id] != null ? (
                      <input type="text" className="imp" style={{ width: 110, textAlign: "right" }} placeholder="a éxito: €" value={importe[x.id] ?? ""}
                        onChange={(e) => setImporte((m) => ({ ...m, [x.id]: e.target.value }))} aria-label="Importe" />
                    ) : (
                      <button type="button" className="imp" style={{ border: 0, background: "none", cursor: "text" }} title="Pulsa para facturar otra cantidad"
                        onClick={() => setImporte((m) => ({ ...m, [x.id]: EUR.format(x.importe!) }))}>{eur(x.importe)}</button>
                    )}
                    {on && !x.ya && (
                      <div className="antes-form">
                        <b style={{ fontSize: 12.5 }}>Facturar antes de tiempo</b>
                        <input type="text" placeholder="Por qué: «lo pide el administrador para cerrar el ejercicio»" value={antes[x.id]?.motivo ?? ""}
                          onChange={(e) => setAntes((a) => ({ ...a, [x.id]: { motivo: e.target.value, correo: a[x.id]?.correo ?? "" } }))} />
                        <textarea placeholder="Pega aquí el correo en el que lo piden (opcional)" value={antes[x.id]?.correo ?? ""}
                          onChange={(e) => setAntes((a) => ({ ...a, [x.id]: { motivo: a[x.id]?.motivo ?? "", correo: e.target.value } }))} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* 3 · ¿QUIEN FACTURA? */}
        <div className="paso-c">
          <h3><span className="num">3</span>¿Quién factura?</h3>
          {(() => {
            const ls = d.lineas.filter((l) => elegidos.some((x) => x.lineaId === l.id));
            if (!ls.length) return <p className="nota">Marca algo en el paso 2.</p>;
            const avisos = ls.flatMap((l) => {
              const pag = d.pagadores.find((p) => p.clave === elegidos.find((x) => x.lineaId === l.id)?.pagador);
              const out: string[] = [];
              if (pag?.emisorContrata && pag.emisorContrata !== l.empresa) out.push(`${pag.nombre} pide que le facture ${EMPRESA[pag.emisorContrata]}`);
              if (l.ultimaProforma && l.ultimaProforma !== l.empresa) out.push(`la última proforma de «${l.linea}» la emitió ${EMPRESA[l.ultimaProforma]}`);
              return out;
            });
            return (
              <>
                {ls.map((l) => (
                  <div key={l.id} className="quien-f">
                    <span className="grow">{l.linea}</span>
                    <span className="seg" role="group" aria-label="Quién factura">
                      {(["accesalia", "daniel"] as const).map((e) => (
                        <button key={e} type="button" aria-pressed={l.empresa === e} disabled={ocupado} onClick={() => l.empresa !== e && hacer(accionEmisor(d.oppId, l.id, e))}>
                          {EMPRESA[e]}
                        </button>
                      ))}
                    </span>
                  </div>
                ))}
                <div className="aviso-q">
                  Se va a emitir como <b>{[...new Set(ls.map((l) => EMPRESA[l.empresa]))].join(" y ")}</b>: es lo que dice la hoja firmada
                  {avisos.length ? <>, <b>pero {avisos.join(" y ")}</b></> : ""}. ¿Es correcto? Si no, cámbialo arriba.
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* 4 · LA PROFORMA */}
      <div className="col">
        <div className="paso-c">
          <h3><span className="num">4</span>La proforma {grupos.length > 1 && <span className="mal">se parte en {grupos.length}: una por pagador y empresa</span>}</h3>
          {emitidas.length ? (
            emitidas.map((e) => <Correo key={e.id} e={e} d={d} hacer={hacer} ocupado={ocupado} />)
          ) : (
            <>
              {grupos.map((g, i) => (
                <Papel key={i} g={g} n={i + 1} de={grupos.length} d={d} imp={imp}
                  forma={(g.pagador && (formas[g.pagador.clave] ?? g.pagador.forma)) || "transferencia"}
                  cambiarForma={(f) => g.pagador && setFormas((m) => ({ ...m, [g.pagador!.clave]: f }))} />
              ))}
              {!grupos.length && <p className="nota">Marca qué facturas y aquí la ves.</p>}
              {error && <div className="aviso">{error}</div>}
              <div className="cierre">
                <span className="que-pasa">{bloqueo ?? "Al emitirla le toca su número y ya no se cambia (se anula y se hace otra)."}</span>
                <button type="button" className="btn" disabled={!!bloqueo || ocupado} onClick={emitir}>
                  {grupos.length > 1 ? `Emitir las ${grupos.length} proformas` : "Emitir la proforma"}
                </button>
              </div>
            </>
          )}
          {emitidas.length > 0 && error && <div className="aviso">{error}</div>}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ 1 · ¿lo tengo todo?

function Paso1({ p, oppId, hacer, ocupado, ordenes, varios }: { p: PagadorCosas; oppId: string; hacer: (r: Resp) => void; ocupado: boolean; ordenes: DetalleCosas["ordenesDeCompra"]; varios: boolean }) {
  const faltan = p.checklist.filter((c) => !c.ok).length;
  return (
    <div className="paso-c">
      <h3>
        <span className="num">1</span>¿Lo tengo todo?{varios ? ` · ${p.nombre}` : ""}{" "}
        {faltan ? <span className="mal">falta {faltan === 1 ? "1 cosa" : `${faltan} cosas`}</span> : <span className="ok">✓ todo</span>}
      </h3>
      {p.checklist.map((c) => <Item key={c.clave} c={c} p={p} oppId={oppId} hacer={hacer} ocupado={ocupado} />)}
      {p.tipo === "contrata" && ordenes.length > 0 && (
        <div className="aviso-q">
          En el cajón de la opp: {ordenes.map((o) => (o.url ? <a key={o.id} className="doc" href={o.url} target="_blank" rel="noreferrer" style={{ marginRight: 6 }}>📄 {o.nombre}</a> : <span key={o.id} className="doc">📄 {o.nombre}</span>))} ábrelo para copiar los códigos.
        </div>
      )}
      <div className="nota">¿Falta un papel (la tarjeta del CIF, el certificado de la cuenta…)? Suéltalo en el cajón de documentos de la opp y archívalo allí.</div>
    </div>
  );
}

function Item({ c, p, oppId, hacer, ocupado }: { c: ItemCheck; p: PagadorCosas; oppId: string; hacer: (r: Resp) => void; ocupado: boolean }) {
  const [v, setV] = useState("");
  const guardar = () => {
    if (!v.trim()) return;
    if (c.editar === "codigo" && c.hojaId && c.codigo) hacer(accionCodigo(oppId, c.hojaId, c.codigo, v));
    else if (c.editar === "cif" && p.comunidadId) hacer(accionCif(oppId, p.comunidadId, v));
    else if (c.editar === "iban" && p.comunidadId) hacer(accionIban(oppId, p.comunidadId, v));
  };
  return (
    <div className={`chk${c.ok ? "" : " falta"}`}>
      <span className={`s ${c.ok ? "si" : "no"}`}>{c.ok ? "✓" : "!"}</span>
      <span className="q">{c.que}</span>
      <span className="v">
        {c.ok ? (
          <>
            {c.valor}
            {c.editar === "codigo" && (
              <button type="button" className="enlace" style={{ marginLeft: 8, fontSize: 12 }} onClick={() => hacer(accionCodigo(oppId, c.hojaId!, c.codigo!, ""))}>cambiar</button>
            )}
          </>
        ) : c.editar ? (
          <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
            <input type="text" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && guardar()}
              placeholder={c.editar === "codigo" ? `El «${c.codigo}» que pide ${p.nombre}` : c.editar === "iban" ? "ES00 0000 0000 0000 0000 0000" : "H00000000"} />
            <button type="button" className="btn peq" disabled={ocupado || !v.trim()} onClick={guardar}>Guardar</button>
          </span>
        ) : c.enlace ? (
          <a className="enlace" href={c.enlace}>{c.valor ?? "Falta: complétalo en su ficha"}</a>
        ) : (
          <span className="nota">falta</span>
        )}
      </span>
    </div>
  );
}

// ------------------------------------------------------------ 4 · la proforma, en papel

function Papel({ g, n, de, d, imp, forma, cambiarForma }: {
  g: { pagador: PagadorCosas | null; empresa: "accesalia" | "daniel"; xs: HitoCosas[] }; n: number; de: number; d: DetalleCosas; imp: (x: HitoCosas) => number;
  forma: FormaCobro; cambiarForma: (f: FormaCobro) => void;
}) {
  const em = d.emisoras[g.empresa];
  const base = g.xs.reduce((s, x) => s + imp(x), 0);
  const iva = (base * d.ivaPct) / 100, irpf = (base * em.irpf) / 100;
  const hoja = (id: string) => d.hojas.find((h) => h.id === id);
  const ciegas = g.pagador?.tipo === "contrata"
    ? [...new Set(g.xs.map((x) => x.hojaId))].map((hid) => g.pagador!.checklist.filter((c) => c.editar === "codigo" && c.hojaId === hid).map((c) => `${c.codigo}: ${c.valor ?? "—"}`).join(" · ")).filter(Boolean)
    : [];
  const cuenta = forma === "cargo_cuenta" ? g.pagador?.iban : forma === "transferencia" ? em.iban : null;
  return (
    <>
      <div className="nota">
        Forma de pago{g.pagador ? `: la de las condiciones de cobro de ${g.pagador.nombre}` : ""}.{" "}
        <select aria-label="Forma de pago" style={{ width: "auto" }} value={forma} onChange={(e) => cambiarForma(e.target.value as FormaCobro)}>
          {FORMAS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
        </select>
      </div>
      <div className="pf-cab">
        <span>{de > 1 ? `Proforma ${n} de ${de} · ` : ""}{EMPRESA[g.empresa]}</span>
        <span className="nota" style={{ fontWeight: 400 }}>se ve antes de emitirla</span>
      </div>
      <div className="papel-pf">
        <div className="top">
          <div>
            <h4>PROFORMA</h4>
            <span className="sin">sin emitir · vista previa</span>
            <div style={{ marginTop: 6 }}>{em.nombre}<br />NIF {em.nif}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <b>{g.pagador?.nombre ?? "—"}</b><br />{g.pagador?.nif ? `NIF ${g.pagador.nif}` : "sin NIF"}<br />{g.pagador?.domicilio ?? ""}
          </div>
        </div>
        <table>
          <thead><tr><th>Concepto</th><th style={{ textAlign: "right" }}>Base</th></tr></thead>
          <tbody>
            {g.xs.map((x) => (
              <tr key={x.id}>
                <td>Según hoja de encargo {hoja(x.hojaId)?.numero}: {min(x.que)} por {min(x.linea)} en {d.direccion}.{!x.ya ? " Facturado antes del hito, a petición del cliente." : ""}</td>
                <td className="n">{eur(imp(x))}</td>
              </tr>
            ))}
            {ciegas.map((c) => <tr key={c}><td className="ciega">{c}</td><td className="n">0,00 €</td></tr>)}
          </tbody>
        </table>
        <div className="tot">
          <span>Base</span><b>{eur(base)}</b>
          <span>IVA {EUR.format(d.ivaPct)} %</span><b>{eur(iva)}</b>
          {irpf > 0 && <><span>IRPF {EUR.format(em.irpf)} %</span><b>− {eur(irpf)}</b></>}
          <span><b>Total</b></span><b>{eur(base + iva - irpf)}</b>
        </div>
        <div className="pie-pf">
          <b>Forma de pago:</b>{" "}
          {forma === "cargo_cuenta" ? `cargo en cuenta${cuenta ? `, ${cuenta}` : " (falta el IBAN)"}` : forma === "confirming" ? "confirming" : `transferencia${cuenta ? ` a la cuenta ${cuenta}` : ""}`}
        </div>
      </div>
    </>
  );
}

// ------------------------------------------------------------ emitida: el correo

function Correo({ e, d, hacer, ocupado }: { e: Emitida; d: DetalleCosas; hacer: (r: Resp, luego?: (x: unknown) => void) => void; ocupado: boolean }) {
  const [para, setPara] = useState<string[]>(() => e.destinatarios.map((x) => x.email));
  const [otro, setOtro] = useState("");
  const loQueSeCobra = [...new Set(e.hitos.map((x) => min(x.que)))].join(" y ");
  const huecos = { "dirección": d.direccion, "lo que se cobra": loQueSeCobra, "código": e.codigo, total: EUR.format(e.total), empresa: EMPRESA[e.empresa] };
  const [asunto, setAsunto] = useState(() => (d.plantilla ? rellenar(d.plantilla.asunto, { ...huecos, "dirección": d.direccion.toUpperCase() }) : `${d.direccion.toUpperCase()} – FACTURA ${loQueSeCobra}`));
  const [cuerpo, setCuerpo] = useState(() => (d.plantilla ? rellenar(d.plantilla.texto, huecos) : ""));
  const [adjHojas, setAdjHojas] = useState<string[]>(e.hojas.filter((h) => h.pdf).map((h) => h.id));
  const [enviada, setEnviada] = useState(false);
  const todos = [...para, ...otro.split(/[,;\s]+/).filter(Boolean)];
  return (
    <div className="correo-c">
      <div className="pf-cab">
        <span>Proforma {e.codigo} · {EMPRESA[e.empresa]} · {eur(e.total)}</span>
        <span className="pill p-cobro">Emitida</span>
      </div>
      {enviada ? (
        <div>Enviada. Queda en el diario de la opp; el siguiente paso es el ok del cliente.</div>
      ) : (
        <>
          <div>
            <span className="et">Para</span>
            <div className="dest">
              {e.destinatarios.map((x) => (
                <label key={x.email}>
                  <input type="checkbox" checked={para.includes(x.email)} onChange={(ev) => setPara(ev.target.checked ? [...para, x.email] : para.filter((y) => y !== x.email))} />
                  {x.quien} <span className="nota">{x.email}</span>
                </label>
              ))}
            </div>
            <input type="text" style={{ marginTop: 6 }} value={otro} onChange={(ev) => setOtro(ev.target.value)} placeholder="Otro correo (o varios, separados por coma)" />
          </div>
          <div><label className="et" htmlFor={`as-${e.id}`}>Asunto</label><input id={`as-${e.id}`} type="text" value={asunto} onChange={(ev) => setAsunto(ev.target.value)} /></div>
          <div><label className="et" htmlFor={`cu-${e.id}`}>Texto</label><textarea id={`cu-${e.id}`} rows={6} value={cuerpo} onChange={(ev) => setCuerpo(ev.target.value)} /></div>
          <div className="adj">
            <span className="et" style={{ width: "100%" }}>Adjuntos</span>
            <a className="doc" href={`/facturacion/proforma/${e.id}/pdf`} target="_blank" rel="noreferrer">📄 Proforma {e.codigo}.pdf</a>
            {e.hojas.filter((h) => h.pdf).map((h) => (
              <label key={h.id} className="doc">
                <input type="checkbox" checked={adjHojas.includes(h.id)} onChange={(ev) => setAdjHojas(ev.target.checked ? [...adjHojas, h.id] : adjHojas.filter((y) => y !== h.id))} /> 📄 Hoja de encargo firmada {h.numero}.pdf
              </label>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <a className="btn sec peq" href={`/facturacion/proforma/${e.id}/pdf?descargar=1`}>Descargar el PDF</a>
            <button type="button" className="btn peq" disabled={ocupado || !todos.length || !asunto.trim() || !cuerpo.trim()}
              onClick={() => hacer(accionEnviar(d.oppId, e.id, todos, asunto, cuerpo, adjHojas), () => setEnviada(true))}>
              {ocupado ? "Enviando…" : `Enviar a ${todos.length || "…"}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
