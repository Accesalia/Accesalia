import type { Ficha, HitoFicha, LineaFicha, Vista } from "../../../lib/fichaFinanciera";
import type { Condicion, Deuda, Sobre } from "../../../lib/comisionesAdmin";
import "./ficha2.css";

// LA FICHA FINANCIERA (Monica, 17/18-oct-2026): su ficha de 2025 con la
// estructura y los conceptos de entonces y el contenido de ahora, a dos columnas.
// A la izquierda lo que se mira siempre (direccion, resumen, hojas con sus
// hitos, notas); a la derecha los datos (proyecto, administrador, contrata,
// financiacion, subvenciones, CAES y el comercial «donde menos estorbe»).
// Cada seccion sale solo si quien mira puede verla (lib/fichaFinanciera.ts).
// La version anterior sigue en ./anterior.

const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const eur = (n: number | null | undefined) => (n == null ? "" : `${EUR.format(n)} €`);
const fecha = (f: string | null | undefined) => (f ? f.slice(0, 10).split("-").reverse().join("/").replace(/\/(\d\d)(\d\d)$/, "/$2") : "");
const minuscula = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

const PASO: Record<NonNullable<Deuda["paso"]>, string> = {
  le_debemos: "le debemos",
  pedir_factura: "pedirle factura",
  su_factura: "tenemos su factura",
  pagada: "pagada",
  la_paga_la_contrata: "la paga la contrata",
};
const SOBRE: Record<Sobre, string> = { proyecto: "proyecto", subvenciones: "subvenciones", contrata: "contrata" };

function Caja({ si }: { si: boolean }) {
  return <span className={si ? "caja si" : "caja"} />;
}
function SiNo({ si }: { si: boolean | null }) {
  return (
    <>
      <Caja si={si === true} />
      Sí &nbsp;
      <Caja si={si === false} />
      No
    </>
  );
}
function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="panel">
      <h2>{titulo}</h2>
      {children}
    </div>
  );
}

function importeLinea(l: LineaFicha) {
  if (l.exito) return `${l.exito.porcentaje ?? "?"} %${l.exito.sobre ? ` ${/PEM/i.test(l.exito.sobre) ? "PEM" : ""}` : ""}`.trim();
  return eur(l.base);
}
function queHito(h: HitoFicha) {
  return `${h.porcentaje != null ? `${h.porcentaje} % ` : ""}${minuscula(h.que)}`;
}
function detalleHito(h: HitoFicha) {
  if (h.subhitos.length) return "";
  if (h.detalle.length)
    return h.detalle.map((d) => `${d.numero} · ${fecha(d.fecha)} · ${d.cobrada ? "cobrada" : "sin cobrar"}`).join(" · ");
  if (h.estado === "a éxito") return "a éxito";
  if (h.estado === "completado") return "hecho, sin factura enlazada";
  if (h.estado === "anulado") return "anulado";
  return h.fecha ? `previsto ${fecha(h.fecha)}` : "";
}

/** Lo pactado con el administrador, en cristiano. */
function pacto(c: Condicion | undefined, sobre: Sobre) {
  if (!c) return null;
  if (c.estado === "pendiente") return "pendiente de negociar";
  if (c.valor == null) return "sin cantidad";
  return c.forma === "eur" ? `${eur(c.valor)} fijo` : `${EUR.format(c.valor).replace(",00", "")} % ${sobre === "contrata" ? "del PEM" : "de lo facturado"}`;
}

export function FichaFinancieraV2({ f, vista }: { f: Ficha; vista: Vista }) {
  const iva = 1 + f.ivaPct / 100;
  const de = (filtro: (l: LineaFicha) => boolean) => f.lineas.filter(filtro);
  const subv = de((l) => l.area === "SUBV");
  const tresPptos = de((l) => l.area === "3PPTOS");
  const caes = de((l) => l.area === "CAES" || /caes/i.test(l.bloque));
  const verLineas = f.lineas.filter((l) => (l.ecobalance ? vista.ecobalance : vista.accesalia));
  const previsto = verLineas.reduce((s, l) => s + (l.exito ? 0 : (l.base ?? 0)), 0);
  const sueltas = f.sueltas.filter((x) => (x.ecobalance ? vista.ecobalance : vista.accesalia));
  const facturado = (vista.accesalia ? f.facturado.accesalia : 0) + (vista.ecobalance ? f.facturado.ecobalance : 0) + sueltas.reduce((s, x) => s + x.base, 0);
  const cobrado = (vista.accesalia ? f.cobrado.accesalia : 0) + (vista.ecobalance ? f.cobrado.ecobalance : 0) + sueltas.filter((x) => x.cobrada).reduce((s, x) => s + x.base, 0);

  // Las variables: lo que solo se cobra si sale bien. Subvenciones y CAES siempre, con «no hay».
  const exito = verLineas.filter((l) => l.exito);
  const variables: [string, string][] = exito.map((l) => [l.bloque, `${l.exito!.porcentaje ?? "?"} %${l.exito!.sobre ? ` ${/PEM/i.test(l.exito!.sobre) ? "del PEM" : `de ${minuscula(l.exito!.sobre)}`}` : ""}, a éxito`]);
  if (!exito.some((l) => l.area === "SUBV")) variables.push(["Subvenciones", subv.length ? "no hay a éxito" : "no hay"]);
  if (!exito.some((l) => caes.includes(l))) variables.push(["CAES", "no hay"]);

  // Las comisiones: las del administrador (Ecobalance) y la del comercial (direccion).
  const adm = vista.ecobalance ? f.comisionAdmin : null;
  const comisiones: [string, string][] = [];
  let comisionesSuma = 0, comisionesPagadas = 0, faltan = false;
  if (adm)
    for (const d of adm.deudas) {
      const c = adm.condiciones[d.sobre];
      if (d.importe != null) {
        comisionesSuma += d.importe;
        if (d.pagada) comisionesPagadas += d.importe;
        comisiones.push([`Administrador, ${SOBRE[d.sobre]}`, eur(d.importe)]);
      } else if (c && c.estado === "pactada") {
        faltan = true;
        comisiones.push([`Administrador, ${SOBRE[d.sobre]}`, pacto(c, d.sobre) ?? ""]);
      }
    }
  // EL COMERCIAL: su % de lo facturado de importe fijo (lo de a exito no comisiona, de momento);
  // lo gana cuando Accesalia cobra. Solo lo de Accesalia.
  const fijoAccesalia = f.lineas.filter((l) => !l.ecobalance && !l.exito).reduce((s, l) => s + (l.base ?? 0), 0);
  const cobradoAccesalia = f.cobrado.accesalia + f.sueltas.filter((x) => !x.ecobalance && x.cobrada).reduce((s, x) => s + x.base, 0);
  const pctCom = f.comercial?.pct ?? null;
  const comComercial = pctCom != null ? Math.round(fijoAccesalia * pctCom) / 100 : null;
  const comDevengada = pctCom != null ? Math.round(Math.min(cobradoAccesalia, fijoAccesalia) * pctCom) / 100 : null;
  if (vista.todo && f.comercial) {
    const quien = `Comercial (${f.comercial.nombre.split(" ")[0]})`;
    if (comComercial != null) {
      comisionesSuma += comComercial;
      comisiones.push([quien, eur(comComercial)]);
    } else {
      faltan = true;
      comisiones.push([quien, "sin % guardado"]);
    }
  }

  const adjudicada = f.contrata;
  const firmas = f.hojasInfo.filter((h) => h.firma);
  let n = 0;
  const num = () => `${++n}.`;

  return (
    <div className="ff2">
      {/* La letra de su Figma (no esta en next/font). */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=42dot+Sans:wght@400;700&display=swap" precedence="default" />
      <div className="hoja">
        {/* ===================== COLUMNA 1 ===================== */}
        <div className="col">
          <div className="dir">
            <span className="v">{f.opp.nombre}</span>
            {f.opp.codigo && <div className="c">{f.opp.codigo}</div>}
          </div>

          <div className="res">
            <h2>{num()} Resumen financiero</h2>
            <div className="caja-res">
              <div className="f">
                <span className="k">Ingresos previstos (sin IVA):</span>
                <span className="v grande">{eur(previsto)}</span>
              </div>
              <div className="rosa">
                <div className="f"><span className="k">Facturados:</span><span className="v medio">{eur(facturado)}</span></div>
                <div className="f"><span className="k">Cobrados:</span><span className="v medio">{eur(cobrado)}</span></div>
                <div className="f"><span className="k">Pendiente de facturar:</span><span className="v medio">{eur(Math.max(0, previsto - facturado))}</span></div>
                <div className="f">
                  <span className="k">Variables:</span>
                  <span className="v">
                    {variables.map(([a, b]) => (
                      <span key={a} className="sub"><span>{a}</span><b>{b}</b></span>
                    ))}
                  </span>
                </div>
              </div>
              {(vista.ecobalance || vista.todo) && (
                <>
                  <div className="f grueso">
                    <span className="k">Comisiones previstas:</span>
                    <span className="v">
                      <span className="medio">{eur(comisionesSuma)}</span>
                      {comisiones.map(([a, b]) => (
                        <span key={a} className="sub"><span>{a}</span><b>{b}</b></span>
                      ))}
                      {!comisiones.length && <span className="sub"><span>{adm === null && vista.ecobalance ? "sin acuerdo con el administrador" : "ninguna"}</span></span>}
                    </span>
                  </div>
                  <div className="f"><span className="k">Comisiones pagadas:</span><span className="v medio">{eur(comisionesPagadas)}</span></div>
                </>
              )}
              {vista.todo && (
                <div className="f grueso final">
                  <span className="k">Beneficio neto esperado:</span>
                  <span className="v">
                    <span className="grande">{eur(previsto - comisionesSuma)}</span>
                    <br />
                    <span className="peq">sin descontar las horas de técnico{faltan ? " ni las comisiones sin calcular" : ""}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          <Seccion titulo={`${num()} Hojas de encargo e hitos de facturación`}>
            <table className="he">
              <colgroup>
                <col style={{ width: "50%" }} />
                <col style={{ width: "16%" }} />
                <col />
              </colgroup>
              <tbody>
                {f.hojasInfo.map((h, i) => {
                  const ls = verLineas.filter((l) => l.hoja === h.numero);
                  return [
                    <tr key={`h${i}`} className={i === 0 ? "primera" : undefined}>
                      <td className="cab" colSpan={3}>
                        {h.numero ?? "Hoja"} <span>· firmada el {fecha(h.firma)} · paga {minuscula(h.paga)}</span>
                      </td>
                    </tr>,
                    ...ls.flatMap((l) => [
                      <tr key={l.id} className="linea">
                        <td className="que">
                          {l.bloque}
                          {l.ecobalance && <span className="eco">ECOBALANCE</span>}
                        </td>
                        <td className="n cuanto">{importeLinea(l)}</td>
                        <td className="n peq">{l.exito ? (l.area === "3PPTOS" ? "a éxito, si gana la nuestra" : "a éxito") : `${eur((l.base ?? 0) * iva)} con IVA`}</td>
                      </tr>,
                      ...l.hitos.flatMap((hi, j) => [
                        <tr key={`${l.id}-${j}`} className="hito">
                          <td className="que">
                            <Caja si={hi.estado === "cobrado"} />
                            {queHito(hi)}
                            {hi.subhitos.length > 1 ? `, en ${hi.subhitos.length} facturas` : ""}
                          </td>
                          <td className="n cuanto">{eur(hi.importe)}</td>
                          <td className="peq det">
                            {l.area === "3PPTOS" && hi.estado !== "cobrado" && adjudicada && !adjudicada.pem ? `falta el PEM de ${adjudicada.nombre}` : detalleHito(hi)}
                          </td>
                        </tr>,
                        ...hi.subhitos.map((s, k) => (
                          <tr key={`${l.id}-${j}-${k}`} className="hito parte">
                            <td className="que">{k + 1}ª parte</td>
                            <td className="n cuanto">{eur(s.importe)}</td>
                            <td className="peq det">{detalleHito(s)}</td>
                          </tr>
                        )),
                      ]),
                    ]),
                    ...(h.incluido.length
                      ? [
                          <tr key={`i${i}`} className="incl">
                            <td className="peq" colSpan={3}>Incluido sin cobrar aparte: {h.incluido.join(", ")}.</td>
                          </tr>,
                        ]
                      : []),
                  ];
                })}
                {sueltas.length > 0 && [
                  <tr key="sueltas"><td className="cab" colSpan={3}>Facturas sin hito <span>· de esta dirección, sueltas o por casar</span></td></tr>,
                  ...sueltas.map((x) => (
                    <tr key={x.numero} className="hito">
                      <td className="que"><Caja si={x.cobrada} />{x.numero}</td>
                      <td className="n cuanto">{eur(x.base)}</td>
                      <td className="peq det">{fecha(x.fecha)} · {x.cobrada ? "cobrada" : "sin justificante"}</td>
                    </tr>
                  )),
                ]}
                {!f.hojasInfo.length && <tr><td className="peq" colSpan={3}>Sin hojas firmadas.</td></tr>}
              </tbody>
            </table>
          </Seccion>

          <div>
            <h2>Notas / incidencias</h2>
            <div className="caja-notas">
              {f.notas.length ? (
                <ul>
                  {f.notas.slice(0, 12).map((x, i) => (
                    <li key={i}>
                      <span className="peq">{fecha(x.fecha)}{x.autor ? ` · ${x.autor}` : ""}{x.tipo === "duda" ? " · duda" : ""} — </span>
                      {x.texto}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="peq">Sin notas de facturación.</span>
              )}
            </div>
          </div>
        </div>

        {/* ===================== COLUMNA 2 ===================== */}
        <div className="col">
          <div className="panel">
            <table>
              <tbody>
                <tr><td className="et" style={{ width: 165 }}>Categoría:</td><td className="dato">{(f.categoriasProyecto.length ? f.categoriasProyecto : f.categorias).join(" · ")}</td></tr>
                <tr><td className="et">Tipo de proyecto:</td><td className="dato">{(f.obrasProyecto.length ? f.obrasProyecto : f.obras).join(" + ").toUpperCase()}</td></tr>
                <tr><td className="et">Quién lo paga:</td><td className="dato">{f.pagadores.join(" · ")}</td></tr>
                <tr>
                  <td className="et">Firma hoja encargo:</td>
                  <td className="dato">
                    {fecha(firmas[0]?.firma) || "—"}
                    {firmas.slice(1).map((h) => <span key={h.numero} className="peq"> · y el {fecha(h.firma)}</span>)}
                  </td>
                </tr>
                <tr><td className="et">Administrador:</td><td className="dato">{f.administrador ?? <span className="hueco">sin administrador</span>}</td></tr>
                <tr><td className="et">Contrata que ejecuta:</td><td className="dato">{adjudicada?.nombre ?? ""}</td></tr>
              </tbody>
            </table>
          </div>

          {vista.ecobalance && (
            <Seccion titulo={`${num()} Administrador`}>
              <table>
                <tbody>
                  {adm ? (
                    <>
                      <tr><td className="dato" colSpan={2}>{adm.persona} <span className="peq">· {adm.verificado ? "acuerdo verificado" : "acuerdo por revisar"}</span></td></tr>
                      {(["proyecto", "subvenciones", "contrata"] as Sobre[]).map((s) => {
                        const c = adm.condiciones[s];
                        const d = adm.deudas.find((x) => x.sobre === s);
                        return (
                          <tr key={s}>
                            <td className="et" style={{ width: 160 }}>Sobre {SOBRE[s]}:</td>
                            <td className="dato">
                              {c ? (
                                <>
                                  {d?.importe != null && c.forma === "pct" ? `${eur(d.importe)} ` : ""}
                                  {pacto(c, s)}
                                  {d && (d.paso || d.aviso) && <span className="peq"> · {d.paso ? PASO[d.paso] : s === "contrata" && adjudicada && !adjudicada.pem ? "falta el PEM" : d.aviso}</span>}
                                </>
                              ) : (
                                <span className="peq">no pactada</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {adm.deudas.filter((d) => d.importe != null || adm.condiciones[d.sobre]?.estado === "pactada").map((d) => (
                        <tr key={`p${d.sobre}`}>
                          <td className="et">Pagada {SOBRE[d.sobre]}:</td>
                          <td className="et"><Caja si={d.pagada} />Fecha: <span className="dato">{fecha(d.fechaPago)}</span></td>
                        </tr>
                      ))}
                      <tr className="notas"><td colSpan={2}><span className="et">Notas:</span><span className="dato">{adm.nota ?? ""}</span></td></tr>
                    </>
                  ) : (
                    <tr><td className="peq" colSpan={2}>{f.administrador ? "Sin acuerdo de comisión con este administrador." : "Sin administrador."}</td></tr>
                  )}
                </tbody>
              </table>
            </Seccion>
          )}

          {vista.ecobalance && (
            <Seccion titulo={`${num()} Contrata`}>
              <table>
                <tbody>
                  <tr><td className="et" style={{ width: 160 }}>Contrata elegida:</td><td className="dato">{adjudicada?.nombre ?? ""}</td></tr>
                  <tr><td className="et">PEM adjudicado:</td><td className="dato">{eur(adjudicada?.pem)}</td></tr>
                  <tr>
                    <td className="et">Nos paga:</td>
                    <td className="dato">
                      {tresPptos.length ? tresPptos.map(importeLinea).join(" · ") : ""}
                      {tresPptos.length > 0 && <span className="peq"> · 3 presupuestos{tresPptos.some((l) => l.exito) ? ", a éxito" : ""}</span>}
                    </td>
                  </tr>
                  <tr><td className="et">Cuándo:</td><td className="dato">{tresPptos.flatMap((l) => l.hitos).map((h) => minuscula(h.que)).join(" · ")}</td></tr>
                  <tr>
                    <td className="et">Cobrada:</td>
                    <td className="et">
                      <Caja si={tresPptos.length > 0 && tresPptos.every((l) => l.hitos.every((h) => h.estado === "cobrado"))} />
                      Fecha: <span className="dato">{fecha(tresPptos.flatMap((l) => l.hitos.flatMap((h) => h.detalle)).map((d) => d.fecha).filter(Boolean).sort().pop())}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Seccion>
          )}

          {vista.accesalia && (
            <Seccion titulo={`${num()} Financiación`}>
              <table>
                <tbody>
                  {f.financiacion.length ? (
                    f.financiacion.map((x, i) => (
                      <tr key={i}>
                        <td className="et" style={{ width: 160 }}>{x.entidad}</td>
                        <td className="dato">
                          {x.estado}
                          {x.importe ? ` · ${eur(x.importe)}` : ""}
                          {x.firma ? ` · firmada el ${fecha(x.firma)}` : ""}
                          {x.notas ? <span className="peq"> · {x.notas}</span> : null}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <>
                      <tr><td className="et" style={{ width: 160 }}>Cdad quiere financiación</td><td className="et"><SiNo si={null} /></td></tr>
                      <tr><td className="et">Firmada</td><td className="et"><SiNo si={null} /></td></tr>
                      <tr><td className="et">Entidad:</td><td /></tr>
                    </>
                  )}
                </tbody>
              </table>
            </Seccion>
          )}

          {vista.accesalia && (
            <Seccion titulo={`${num()} Subvenciones`}>
              <table>
                <tbody>
                  {subv.length ? (
                    subv.map((l) => {
                      const h = f.hojasInfo.find((x) => x.numero === l.hoja);
                      const hs = l.hitos.flatMap((x) => (x.subhitos.length ? x.subhitos : [x]));
                      const todo = hs.length > 0 && hs.every((x) => x.estado === "cobrado");
                      const ultima = hs.flatMap((x) => x.detalle).map((d) => d.fecha).filter(Boolean).sort().pop();
                      return [
                        <tr key={`${l.id}a`}><td className="et" style={{ width: 160 }}>Contratada con:</td><td className="dato">{h?.paga ?? ""}</td></tr>,
                        <tr key={`${l.id}b`}>
                          <td className="et">Precio pactado:</td>
                          <td className="et">
                            <Caja si={!l.exito} /><span className="dato">Fijo{!l.exito ? ` ${eur(l.base)}` : ""}</span> &nbsp;
                            <Caja si={!!l.exito} />A éxito{l.exito ? ` ${l.exito.porcentaje ?? "?"} %` : ""}
                          </td>
                        </tr>,
                        <tr key={`${l.id}c`}><td className="et">Contratación:</td><td className="dato">{fecha(h?.firma)}</td></tr>,
                        <tr key={`${l.id}d`}><td className="et">Cobrado honorario:</td><td className="et"><Caja si={todo} />Fecha <span className="dato">{todo ? fecha(ultima) : ""}</span></td></tr>,
                        <tr key={`${l.id}e`} className="notas">
                          <td colSpan={2}>
                            <span className="et">Notas:</span>
                            <span className="dato">{l.hitos.some((x) => x.subhitos.length > 1) ? `Cobrado en ${hs.length} facturas.` : ""}</span>
                          </td>
                        </tr>,
                      ];
                    })
                  ) : (
                    <tr><td className="et" style={{ width: 160 }}>Contratada:</td><td className="et"><SiNo si={false} /></td></tr>
                  )}
                </tbody>
              </table>
            </Seccion>
          )}

          {(vista.ecobalance || caes.some((l) => !l.ecobalance)) && (
            <Seccion titulo={`${num()} CAES`}>
              <table>
                <tbody>
                  <tr><td className="et" style={{ width: 160 }}>Cesión CAES contratada:</td><td className="et"><SiNo si={caes.length > 0} /></td></tr>
                  {caes.length > 0 && <tr><td className="et">Qué:</td><td className="dato">{caes.map((l) => `${l.bloque} · ${importeLinea(l)}`).join(" · ")}</td></tr>}
                  <tr><td className="et">Contrato firmado:</td><td className="et"><SiNo si={null} /></td></tr>
                </tbody>
              </table>
            </Seccion>
          )}

          {vista.todo && (
            <Seccion titulo={`${num()} Comercial interno`}>
              <table>
                <tbody>
                  {f.comercial ? (
                    <>
                      <tr><td className="et" style={{ width: 160 }}>Comercial:</td><td className="dato">{f.comercial.nombre}</td></tr>
                      <tr>
                        <td className="et">Comisión:</td>
                        <td className="dato">{pctCom != null ? <>{EUR.format(pctCom).replace(",00", "")} % de lo facturado <span className="peq">· solo importes fijos</span></> : <span className="hueco">sin % guardado</span>}</td>
                      </tr>
                      <tr><td className="et">Importe:</td><td className="dato">{eur(comComercial)}</td></tr>
                      <tr>
                        <td className="et">Devengada:</td>
                        <td className="dato">
                          {eur(comDevengada)}
                          {comComercial != null && comDevengada != null && <span className="peq"> · {comDevengada >= comComercial ? "todo cobrado" : `pendiente ${eur(comComercial - comDevengada)}`}</span>}
                        </td>
                      </tr>
                      <tr><td className="et">Pagada:</td><td className="et"><Caja si={false} />Fecha:</td></tr>
                    </>
                  ) : (
                    <tr><td className="peq" colSpan={2}>Sin comercial.</td></tr>
                  )}
                </tbody>
              </table>
            </Seccion>
          )}
        </div>
      </div>
    </div>
  );
}
