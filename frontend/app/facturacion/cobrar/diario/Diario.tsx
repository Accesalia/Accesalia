"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Diario as DatosDiario, FilaDiario, Tejado } from "../../../../lib/recorridoHoja";
import { accionDevolver, accionLevantar, accionPausarFacturacion } from "../accionesRecorrido";

// EL DIARIO (maqueta validada): por dias, con filtros. En la fila vigente de cada hoja: «Devolver a la lista» y
// «Pausar»; en una pausa de facturacion, «Levantar la pausa». Arriba, las pausadas a las que les ha llegado un cobro.

const AREAS: Record<string, string> = { PRY: "Proyectos", OBR: "Obra", SUBV: "Subvenciones", IEE: "IEE", CAES: "CAES", FIN: "Financiación", "3PPTOS": "3 presupuestos" };
const TIPO: Record<FilaDiario["tipo"], [string, string]> = {
  a_cobro: ["p-cobro", "A cobro"], a_produccion: ["p-prod", "A producción ya"], devuelta: ["p-dev", "Devuelta a la lista"],
  direccion_comprobada: ["p-area", "Dirección comprobada"], metida_produccion: ["p-prod", "Metida en producción"], pausada: ["p-pausa", "Pausada"],
  pausa_levantada: ["p-pausa", "Pausa levantada"], reanudada: ["p-prod", "Reanudada"], primer_cobro: ["p-cobro", "Primer hito cobrado"],
};
const TEJADO: Record<Tejado, string> = { accesalia: "Accesalia", cliente: "el cliente", tercero: "un tercero" };
const DIA = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" });
const HORA = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
const diaDe = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
const hoy = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" });

type Filtro = "todo" | "facturacion" | "secretaria" | "pausas";

export function Diario({ filas, avisos }: DatosDiario) {
  const [filtro, setFiltro] = useState<Filtro>("todo");
  const [abierto, setAbierto] = useState<{ clave: string; que: "devolver" | "pausar" | "levantar" } | null>(null);
  const [motivo, setMotivo] = useState("");
  const [tejado, setTejado] = useState<Tejado>("tercero");
  const [condicion, setCondicion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();
  const router = useRouter();

  function abrir(clave: string, que: "devolver" | "pausar" | "levantar") {
    setAbierto({ clave, que });
    setMotivo(que === "levantar" ? "Ya han pagado" : "");
    setCondicion("");
    setTejado("tercero");
    setError(null);
  }
  function hacer(p: Promise<{ ok?: boolean; error?: string }>, texto: string) {
    empezar(async () => {
      const r = await p;
      if (r.error) return setError(r.error);
      setAbierto(null);
      setError(null);
      setHecho(texto);
      router.refresh();
    });
  }

  const vis = filas.filter((f) =>
    filtro === "todo" ? true : filtro === "pausas" ? ["pausada", "pausa_levantada", "reanudada"].includes(f.tipo) : f.lado === filtro,
  );
  const porDia = new Map<string, FilaDiario[]>();
  for (const f of vis) (porDia.get(diaDe(f.en)) ?? porDia.set(diaDe(f.en), []).get(diaDe(f.en))!).push(f);

  return (
    <>
      {avisos.map((a) => (
        <div key={a.hojaId} className="banda">
          <span>
            <b>{a.direccion}</b> está en pausa y el {FECHA.format(new Date(a.cobrado + "T00:00:00Z"))} se cobró algo suyo. ¿Levantas la pausa?
          </span>
          <button type="button" className="btn peq" disabled={ocupado} onClick={() => hacer(accionLevantar(a.hojaId, "Ya han pagado"), `${a.direccion}: pausa levantada. Pasa a la bandeja comercial para reanudar.`)}>
            Levantar la pausa
          </button>
        </div>
      ))}
      {hecho && <div className="banda" style={{ background: "var(--lima-soft)", borderColor: "var(--lima-dark)", color: "var(--carbon)" }}>{hecho}</div>}
      <div className="filtros" role="group" aria-label="Qué enseñar">
        {(
          [
            ["todo", "Todo"],
            ["facturacion", "Facturación"],
            ["secretaria", "Secretaria comercial"],
            ["pausas", "Pausas"],
          ] as [Filtro, string][]
        ).map(([k, t]) => (
          <button key={k} type="button" className="chip" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>
            {t}
          </button>
        ))}
      </div>
      {!vis.length && <p className="nota" style={{ marginTop: 16 }}>Nada en los últimos 60 días{filtro !== "todo" ? " con este filtro" : ""}. Aquí sale lo que se haga con cada hoja desde Nuevas hojas firmadas.</p>}
      {[...porDia].map(([d, fs]) => (
        <Fragment key={d}>
          <div className="dia">
            {d === hoy() ? "Hoy, " : ""}
            {DIA.format(new Date(d + "T12:00:00Z"))} <span>· {fs.length} {fs.length === 1 ? "movimiento" : "movimientos"}</span>
          </div>
          <div className="caja">
            <table>
              <thead>
                <tr><th>Hora</th><th>Dirección</th><th>Paga</th><th>Qué se hizo</th><th>Quién</th><th /></tr>
              </thead>
              <tbody>
                {fs.map((f) => {
                  const [cls, txt] = TIPO[f.tipo];
                  const abiertoAqui = abierto?.clave === f.clave;
                  return (
                    <Fragment key={f.clave}>
                      <tr className={f.deshecho ? "deshecha" : abiertoAqui ? "abierto" : undefined}>
                        <td className="nw tab">{f.tipo === "primer_cobro" ? "" : HORA.format(new Date(f.en))}</td>
                        <td><div className="dir">{f.direccion}</div><div className="hoja">{f.hoja}</div></td>
                        <td className="nw">{f.paga}</td>
                        <td className="que">
                          <span className={`pill ${cls}`}>{txt}</span>
                          {f.deshecho && <span className="nota"> deshecho</span>}
                          {f.motivo && <span className="mot">«{f.motivo}»</span>}
                          {f.areas.length > 0 && (
                            <span className="mot">
                              {f.tipo === "pausada" || f.tipo === "devuelta" ? "Áreas paradas" : f.tipo === "reanudada" ? "Se reabren" : "Áreas abiertas"}: {f.areas.map((a) => AREAS[a] ?? a).join(", ")}
                            </span>
                          )}
                          {f.tejado && <span className="mot">Depende de {TEJADO[f.tejado]} · el cobro sigue{f.condicion ? ` · se reanuda: ${f.condicion}` : ""}</span>}
                        </td>
                        <td className="nw">{f.quien}</td>
                        <td className="acc">
                          {f.puede.devolver && <button type="button" className="btn sec peq" onClick={() => abrir(f.clave, "devolver")}>Devolver a la lista</button>}{" "}
                          {f.puede.pausar && <button type="button" className="btn pausa peq" onClick={() => abrir(f.clave, "pausar")}>Pausar</button>}
                          {f.puede.levantar && <button type="button" className="btn peq" onClick={() => abrir(f.clave, "levantar")}>Levantar la pausa</button>}
                        </td>
                      </tr>
                      {abiertoAqui && (
                        <tr className="abierto">
                          <td />
                          <td colSpan={5}>
                            <div className="form-en-fila">
                              {abierto.que === "devolver" && (
                                <div className="ancho">
                                  Vuelve a <b>Nuevas hojas firmadas</b> con sus líneas validadas, para corregir lo que haga falta y volver a elegir.
                                  {f.tipo === "metida_produccion" ? (
                                    <div className="aviso" style={{ marginTop: 6 }}>La secretaria ya abrió áreas de esta hoja: quedarán <b>en pausa</b> hasta que se vuelva a meter en producción.</div>
                                  ) : (
                                    <div className="nota" style={{ marginTop: 4 }}>{f.tipo === "a_cobro" ? "Sale de Primer cobro." : "Sale de la bandeja comercial."}</div>
                                  )}
                                </div>
                              )}
                              {abierto.que === "pausar" && <div className="ancho">Se para el trabajo de <b>esta hoja</b> y de las áreas que abrió. El cobro sigue: proformas, correos y facturas.</div>}
                              {abierto.que === "levantar" && <div className="ancho">La hoja pasa a la bandeja comercial, a «para reanudar»: la secretaria reabre sus áreas.</div>}
                              <div className="ancho">
                                <label className="et" htmlFor={`motivo-${f.clave}`}>{abierto.que === "devolver" ? "Por qué se devuelve" : abierto.que === "pausar" ? "Por qué" : "Por qué se levanta"}</label>
                                <input id={`motivo-${f.clave}`} type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)}
                                  placeholder={abierto.que === "devolver" ? "«Me equivoqué de botón», «el pagador es otro»…" : abierto.que === "pausar" ? "«Un vecino ha denunciado y no pagan hasta el juicio»" : "«Ya han pagado»"} />
                              </div>
                              {abierto.que === "pausar" && (
                                <>
                                  <div>
                                    <span className="et">De quién depende</span>
                                    <div className="opciones">
                                      {(
                                        [
                                          ["accesalia", "Accesalia", "nos toca llamar"],
                                          ["cliente", "El cliente", "se puede insistir"],
                                          ["tercero", "Un tercero", "no pueden"],
                                        ] as [Tejado, string, string][]
                                      ).map(([k, t, s]) => (
                                        <label key={k}>
                                          <input type="radio" name={`tejado-${f.clave}`} checked={tejado === k} onChange={() => setTejado(k)} /> {t} <small>· {s}</small>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <label className="et" htmlFor={`cond-${f.clave}`}>Cuándo se reanuda</label>
                                    <input id={`cond-${f.clave}`} type="text" value={condicion} onChange={(e) => setCondicion(e.target.value)} placeholder="«Cuando salga el juicio y paguen»" />
                                  </div>
                                </>
                              )}
                              {error && <div className="ancho aviso">{error}</div>}
                              <div className="ancho" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                <button type="button" className="btn sec peq" onClick={() => setAbierto(null)}>Cancelar</button>
                                {abierto.que === "devolver" && (
                                  <button type="button" className="btn peq" disabled={ocupado || !motivo.trim()} onClick={() => hacer(accionDevolver(f.hojaId, motivo), `${f.direccion} ha vuelto a Nuevas hojas firmadas.`)}>
                                    Devolver a la lista
                                  </button>
                                )}
                                {abierto.que === "pausar" && (
                                  <button type="button" className="btn pausa peq" disabled={ocupado || !motivo.trim()} onClick={() => hacer(accionPausarFacturacion(f.hojaId, motivo, tejado, condicion), `${f.direccion}: pausada. El cobro sigue.`)}>
                                    Pausar la hoja
                                  </button>
                                )}
                                {abierto.que === "levantar" && (
                                  <button type="button" className="btn peq" disabled={ocupado} onClick={() => hacer(accionLevantar(f.hojaId, motivo), `${f.direccion}: pausa levantada. Pasa a la bandeja comercial para reanudar.`)}>
                                    Levantar la pausa
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Fragment>
      ))}
    </>
  );
}
