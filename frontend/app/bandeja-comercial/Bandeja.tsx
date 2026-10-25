"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Bandeja as DatosBandeja, EnPausa, HojaBandeja, Tejado } from "../../lib/recorridoHoja";
import { accionDireccionOk, accionMeter, accionPausarSecretaria, accionReanudar } from "../facturacion/cobrar/accionesRecorrido";

// LA BANDEJA (maqueta validada): la lista por hoja; al abrir una, la hoja firmada a un lado y al otro lo que hay que
// hacer. Las areas salen puestas segun el bloque de cada linea; se quitan pulsandolas y se añade otra. Un area que
// ya esta abierta en la opp por otra hoja sale «ya activa» y no se vuelve a abrir.

const AREAS: Record<string, string> = { PRY: "Proyectos", OBR: "Obra", SUBV: "Subvenciones", IEE: "IEE", CAES: "CAES", FIN: "Financiación", "3PPTOS": "3 presupuestos" };
const nombre = (a: string) => AREAS[a] ?? a;
const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const CORTA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" });
const TEJADO: Record<Tejado, string> = { accesalia: "Accesalia", cliente: "el cliente", tercero: "un tercero" };
const hace = (iso: string) => {
  const d = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 86400000));
  return d === 0 ? "hoy" : `hace ${d} ${d === 1 ? "día" : "días"}`;
};

type Resp = Promise<{ ok?: boolean; error?: string }>;

export function Bandeja({ datos }: { datos: DatosBandeja }) {
  const [abierta, setAbierta] = useState<string | null>(datos.porMeter[0]?.hojaId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();
  const router = useRouter();

  function hacer(p: Resp, texto: string, luego?: () => void) {
    empezar(async () => {
      const r = await p;
      if (r.error) return setError(r.error);
      setError(null);
      setHecho(texto);
      luego?.();
      router.refresh();
    });
  }

  return (
    <>
      {hecho && <div className="banda" style={{ background: "var(--lima-soft)", borderColor: "var(--lima-dark)", color: "var(--carbon)" }}>{hecho}</div>}
      <div className="sec-tit">Por meter en producción <span className="n">{datos.porMeter.length} {datos.porMeter.length === 1 ? "hoja" : "hojas"}</span></div>
      <div className="bandeja">
        {datos.porMeter.map((b) => {
          const on = abierta === b.hojaId;
          return (
            <div key={b.hojaId}>
              <button type="button" className={`b-fila${on ? " on" : ""}`} onClick={() => { setAbierta(on ? null : b.hojaId); setError(null); }}>
                <div>
                  <div className="dir">{b.direccion}</div>
                  <div className="meta">{b.hoja} · paga {b.paga}{b.firma ? ` · firmada el ${FECHA.format(new Date(b.firma + "T00:00:00Z"))}` : ""}</div>
                </div>
                <div className="por"><span className={`pill ${b.por === "a_produccion" ? "p-prod" : "p-cobro"}`}>{b.por === "a_produccion" ? "A producción ya" : "Cobrado el primer hito"}</span></div>
              </button>
              {on && <Abierta b={b} hacer={hacer} ocupado={ocupado} error={error} />}
            </div>
          );
        })}
        {!datos.porMeter.length && <div className="pie-lista">Nada por meter en producción.</div>}
      </div>

      <div className="sec-tit">Pausas levantadas, para reanudar <span className="n">facturación ya ha levantado su pausa: falta reabrir las áreas</span></div>
      <div className="bandeja">
        {datos.paraReanudar.map((r) => (
          <div key={r.hojaId} className="b-fila" style={{ cursor: "default" }}>
            <div>
              <div className="dir">{r.direccion}</div>
              <div className="meta">{r.hoja} · paga {r.paga}</div>
              <div className="pausada-caja" style={{ marginTop: 8 }}>
                <span>Pausada por {r.quien} el {CORTA.format(new Date(r.desde))}: «{r.motivo}»</span>
                {r.levantada && <b>Levantada por {r.levantada.quien} el {CORTA.format(new Date(r.levantada.en))}{r.levantada.motivo ? `: «${r.levantada.motivo}»` : ""}</b>}
                {r.areas.length > 0 && <span>Áreas paradas: {r.areas.map((a) => <span key={a} className="area pausada" style={{ marginRight: 4 }}>{nombre(a)}</span>)}</span>}
              </div>
            </div>
            <div className="por">
              <button type="button" className="btn" disabled={ocupado} onClick={() => hacer(accionReanudar(r.hojaId), `${r.direccion}: reanudada${r.areas.length ? `. Se reabren ${r.areas.map(nombre).join(", ")}` : ""}.`)}>
                Reanudar
              </button>
            </div>
          </div>
        ))}
        {!datos.paraReanudar.length && <div className="pie-lista">Nada para reanudar.</div>}
      </div>

      <div className="sec-tit">En pausa <span className="n">el cobro sigue; el trabajo de estas hojas está parado</span></div>
      {datos.enPausa.length ? (
        <div className="caja">
          <table>
            <thead><tr><th>Dirección</th><th>Áreas paradas</th><th>Por qué</th><th>Quién la puso</th><th>Desde</th><th /></tr></thead>
            <tbody>
              {datos.enPausa.map((p) => <FilaPausa key={p.hojaId} p={p} hacer={hacer} ocupado={ocupado} />)}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="nota">Ninguna hoja en pausa.</p>
      )}
    </>
  );
}

function FilaPausa({ p, hacer, ocupado }: { p: EnPausa; hacer: (r: Resp, t: string) => void; ocupado: boolean }) {
  return (
    <tr>
      <td><div className="dir">{p.direccion}</div><div className="hoja">{p.hoja}</div></td>
      <td>{p.areas.map((a) => <span key={a} className="pill p-pausa" style={{ marginRight: 4 }}>{nombre(a)}</span>)}</td>
      <td className="que">{p.motivo}{p.tejado && <span className="mot">Depende de {TEJADO[p.tejado]}{p.condicion ? ` · se reanuda: ${p.condicion}` : ""}</span>}</td>
      <td className="nw">{p.quien}</td>
      <td className="nw">{hace(p.desde)}</td>
      <td className="acc">
        {p.lado === "facturacion" ? (
          <span className="nota">la levanta facturación</span>
        ) : (
          <button type="button" className="btn sec peq" disabled={ocupado} onClick={() => hacer(accionReanudar(p.hojaId), `${p.direccion}: reanudada.`)}>
            Levantar y reanudar
          </button>
        )}
      </td>
    </tr>
  );
}

function Abierta({ b, hacer, ocupado, error }: { b: HojaBandeja; hacer: (r: Resp, t: string, luego?: () => void) => void; ocupado: boolean; error: string | null }) {
  // Las areas de cada linea: las del bloque, encendidas; las ya activas en la opp no se tocan.
  const [elegidas, setElegidas] = useState<Record<string, Record<string, boolean>>>(() =>
    Object.fromEntries(b.lineas.map((l) => [l.id, Object.fromEntries(l.areas.filter((a) => !a.ya).map((a) => [a.area, true]))])),
  );
  const [otra, setOtra] = useState<string | null>(null);
  const [pausando, setPausando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [tejado, setTejado] = useState<Tejado>("cliente");
  const [condicion, setCondicion] = useState("");

  const ya = (l: HojaBandeja["lineas"][number]) => l.areas.filter((a) => a.ya);
  const conArea = (l: HojaBandeja["lineas"][number]) => ya(l).length > 0 || Object.values(elegidas[l.id] ?? {}).some(Boolean);
  const todas = b.lineas.every(conArea);
  const abre = [...new Set(b.lineas.flatMap((l) => Object.entries(elegidas[l.id] ?? {}).filter(([, v]) => v).map(([a]) => a)))];
  const yaActivas = [...new Set(b.lineas.flatMap((l) => ya(l).map((a) => a.area)))].filter((a) => !abre.includes(a));
  const listo = b.direccionOk && todas;
  const falta = [!b.direccionOk && "comprobar la dirección", !todas && "un área en cada línea"].filter(Boolean).join(", ");

  return (
    <div className="b-abierta">
      <div className="lado-pdf">
        <div className="cabpdf">
          <b>Hoja de encargo firmada · {b.hoja}</b>
          {b.pdf && <a href={b.pdf} target="_blank" rel="noreferrer">Abrir aparte ↗</a>}
        </div>
        {b.pdf ? (
          <iframe src={b.pdf} title={`Hoja firmada ${b.hoja}`} style={{ width: "100%", height: 720, border: 0, borderRadius: 4, background: "#fff" }} />
        ) : (
          <div className="papel" style={{ minHeight: 120 }}>Esta hoja no tiene el PDF firmado subido.</div>
        )}
      </div>
      <div className="trabajo">
        <div className="tarj" style={{ background: b.por === "a_produccion" ? "var(--ajeno-soft)" : "var(--lima-soft)" }}>
          <div className="grow">
            <b>{b.por === "a_produccion" ? "A producción ya" : "Cobrado el primer hito"}</b>
            {b.motivo && b.por === "a_produccion" ? ` · «${b.motivo}»` : b.por === "cobrado" ? ` · ${b.motivo.replace("Cobrado el primer hito", "").trim()}` : ""}
            <div className="nota">{b.quien} · {CORTA.format(new Date(b.cuando))}</div>
          </div>
        </div>

        <div className="paso">
          <h4>La dirección {b.direccionOk && <span className="hecho">✓ comprobada</span>}</h4>
          <div className="tarj">
            <div className="grow">{b.direccion}</div>
            {!b.direccionOk && (
              <>
                {b.oppId && <Link className="btn sec peq" href={`/comercial/oportunidades/${b.oppId}`}>Corregir en la opp</Link>}
                <button type="button" className="btn peq" disabled={ocupado} onClick={() => hacer(accionDireccionOk(b.hojaId), `${b.direccion}: dirección comprobada.`)}>
                  Es correcta
                </button>
              </>
            )}
          </div>
        </div>

        <div className="paso">
          <h4>Lo que ha soltado el comercial en la opp</h4>
          {b.documentos.length ? (
            b.documentos.map((d) => (
              <div key={d.id} className="tarj">
                <div className="grow">
                  <span className="doc">📄 {d.nombre}</span> <small className="nota">{d.tipo} · {CORTA.format(new Date(d.cuando))}</small>
                </div>
              </div>
            ))
          ) : (
            <div className="tarj"><span className="vacio">Nada subido</span></div>
          )}
        </div>

        <div className="paso">
          <h4>Las líneas y sus áreas</h4>
          {b.lineas.map((l) => (
            <div key={l.id} className="b-linea">
              <div className="arriba">
                <span className="con">{l.concepto}</span>
                {l.importe != null && <span className="imp tab">{EUR.format(l.importe)} €</span>}
              </div>
              <div className="hit">{l.hitos}</div>
              <div className="areas">
                {ya(l).map((a) => (
                  <span key={a.area} className="area ya">{nombre(a.area)} <small>· ya activa, desde la {a.ya}</small></span>
                ))}
                {Object.entries(elegidas[l.id] ?? {}).map(([a, on]) => (
                  <button key={a} type="button" className={`area${on ? " si" : ""}`} aria-pressed={on}
                    onClick={() => setElegidas((e) => ({ ...e, [l.id]: { ...e[l.id], [a]: !on } }))}>
                    {on ? "✓ " : ""}Incluye {nombre(a)}
                  </button>
                ))}
                {otra === l.id ? (
                  <select aria-label="Otra área" style={{ width: "auto" }} defaultValue=""
                    onChange={(ev) => { const a = ev.target.value; if (a) setElegidas((e) => ({ ...e, [l.id]: { ...e[l.id], [a]: true } })); setOtra(null); }}>
                    <option value="">Elige el área…</option>
                    {Object.entries(AREAS).filter(([k]) => !(k in (elegidas[l.id] ?? {}))).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                ) : (
                  <button type="button" className="otra-area" onClick={() => setOtra(l.id)}>+ otra área</button>
                )}
              </div>
            </div>
          ))}
          <p className="nota">Las áreas salen puestas según el bloque de cada línea. Pulsa una para quitarla.</p>
        </div>

        {pausando && (
          <div className="confirmar">
            <div>Se para el trabajo de <b>esta hoja</b>. El cobro sigue. La pausa la levantas tú.</div>
            <div className="form-en-fila">
              <div className="ancho">
                <label className="et" htmlFor={`pm-${b.hojaId}`}>Por qué</label>
                <input id={`pm-${b.hojaId}`} type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="«La comunidad no ha pagado las tasas del ayuntamiento»" />
              </div>
              <div>
                <span className="et">De quién depende</span>
                <div className="opciones">
                  {(["accesalia", "cliente", "tercero"] as Tejado[]).map((k) => (
                    <label key={k}><input type="radio" name={`pt-${b.hojaId}`} checked={tejado === k} onChange={() => setTejado(k)} /> {TEJADO[k].replace(/^./, (c) => c.toUpperCase())}</label>
                  ))}
                </div>
              </div>
              <div>
                <label className="et" htmlFor={`pc-${b.hojaId}`}>Cuándo se reanuda</label>
                <input id={`pc-${b.hojaId}`} type="text" value={condicion} onChange={(e) => setCondicion(e.target.value)} placeholder="«Cuando paguen las tasas»" />
              </div>
            </div>
            <div className="botones">
              <button type="button" className="btn sec peq" onClick={() => setPausando(false)}>Cancelar</button>
              <button type="button" className="btn pausa peq" disabled={ocupado || !motivo.trim()}
                onClick={() => hacer(accionPausarSecretaria(b.hojaId, motivo, tejado, condicion), `${b.direccion}: pausada.`, () => setPausando(false))}>
                Pausar la hoja
              </button>
            </div>
          </div>
        )}
        {error && <div className="aviso">{error}</div>}
        <div className="cierre">
          <span className="que-pasa">
            {listo ? (
              <>
                {abre.length ? <>Abre <b>{abre.map(nombre).join(", ")}</b></> : "No abre ningún área nueva"}
                {yaActivas.length ? ` · ${yaActivas.map(nombre).join(", ")} ya estaba activa` : ""}. Hoy eso es Asignar.
              </>
            ) : (
              `Falta: ${falta}.`
            )}
          </span>
          {!pausando && <button type="button" className="btn pausa peq" onClick={() => setPausando(true)}>Pausar</button>}
          <button type="button" className="btn" disabled={!listo || ocupado}
            onClick={() => hacer(accionMeter(b.hojaId, abre), `${b.direccion}: metida en producción${abre.length ? ` (${abre.map(nombre).join(", ")})` : ""}.`)}>
            Meter en producción
          </button>
        </div>
      </div>
    </div>
  );
}

