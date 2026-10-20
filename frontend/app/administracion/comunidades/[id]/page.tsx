import { notFound, redirect } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { Salida } from "../../../components/Salida";
import { fichaComunidad, type Ficha, type Papel } from "../../../../lib/fichaComunidad";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { autorizadosDe } from "../../../../lib/portal";
import { accionAutorizar, accionQuitarAutorizado } from "./accionesPortal";
import { Papel as Doc } from "./Papel";

export const dynamic = "force-dynamic";

// LA FICHA DE COMUNIDAD (Monica, 20-oct-2026). Es la «propuesta» del 25-sep
// (que sigue en ./propuesta) con lo que le faltaba: lo de la ficha antigua
// (./anterior: CP, municipio, provincia, IBAN, su pagina de documentacion) y lo
// hablado el 20-oct. Maqueta: docs/figma/ficha-comunidad.html.
//
// Lo que manda, de la propuesta: las NOTAS primero ("lo primero que quiero ver
// son las excepciones"); el ADMINISTRADOR arriba a la derecha; los huecos en
// ambar suave, nunca en rojo. De la comunidad SOLO sus datos: lo contratado se
// enseña por sus opps (las HOJAS, agrupadas por opp) y el acta de votacion es de
// la opp. SUS COLORES (Figma, 20-oct), SOLO EN ESTA PANTALLA: el fondo #DDE6D0 y
// las tarjetas de dentro (#F0F5E9; la opp #E6ECDC; el presidente con borde
// #9A9C96), por contraste.
//
// Solo se mira: la abre cualquiera que haya entrado (es el destino del buscador).

const EUR = new Intl.NumberFormat("es-ES", { useGrouping: "always", maximumFractionDigits: 0 });
const eur = (n: number) => `${EUR.format(n)} €`;
const fecha = (iso: string | null | undefined) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : null);
const ESTADO_HOJA: Record<string, { texto: string; tono: string }> = {
  devuelta_firmada: { texto: "firmada", tono: "bg-lima text-carbon" },
  enviada_comunidad: { texto: "enviada, sin firmar", tono: "bg-amber-50 text-amber-800" },
  borrador: { texto: "borrador", tono: "bg-black/5 text-carbon/60" },
};

/* ------------------------------------------------------------------ piezas */

function Tarjeta({ titulo, de, der, children }: { titulo: string; de?: React.ReactNode; der?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-baseline gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-carbon/70">{titulo}</h2>
        {de && <span className="text-xs text-carbon/55">{de}</span>}
        {der && <span className="ml-auto">{der}</span>}
      </div>
      {children}
    </section>
  );
}

/** Una tarjeta de dentro, con SU verde de contraste. */
function Dentro({ titulo, de, borde = "border-lima/25", children }: { titulo: string; de?: string; borde?: string; children: React.ReactNode }) {
  return (
    <div className={"rounded-xl border bg-[#F0F5E9] p-4 " + borde}>
      <h3 className="mb-2.5 flex flex-wrap items-baseline gap-2 text-sm font-bold text-carbon/85">
        {titulo}
        {de && <span className="text-xs font-normal text-carbon/55">{de}</span>}
      </h3>
      {children}
    </div>
  );
}

/** Un dato: etiqueta pequeña y el valor al lado. El hueco, en suave. */
function Dato({ et, v, falta = "por completar", ancho = "" }: { et?: string; v: React.ReactNode; falta?: string; ancho?: string }) {
  const vacio = v === null || v === undefined || v === "";
  return (
    <span className={"inline-flex min-w-0 items-baseline gap-1.5 " + ancho}>
      {et && <span className="shrink-0 whitespace-nowrap text-[11px] font-bold uppercase tracking-wide text-carbon/55">{et}:</span>}
      <span className={vacio ? "text-amber-700/60" : "text-carbon/90"}>{vacio ? falta : v}</span>
    </span>
  );
}

function Linea({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={"flex flex-wrap items-baseline gap-x-7 gap-y-2 " + className}>{children}</div>;
}

function Pildora({ children, tono }: { children: React.ReactNode; tono: string }) {
  return <span className={"inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-bold " + tono}>{children}</span>;
}

function Pronto({ title }: { title?: string }) {
  return (
    <span title={title} className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-carbon/45">
      Próximamente
    </span>
  );
}

/* ----------------------------------------------- la validez del presidente */

/** El cargo dura un año salvo que los estatutos digan otra cosa: si el acta no
 *  trae su caducidad, se cuenta un año desde la fecha del acta. */
function vigenciaActa(acta: Papel): string | null {
  if (!acta) return null;
  if (acta.caduca) return acta.caduca;
  if (!acta.emision) return null;
  const d = new Date(acta.emision);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function AvisoActa({ acta }: { acta: Papel }) {
  const hasta = vigenciaActa(acta);
  if (!acta) return <Pildora tono="border border-alerta/30 bg-[#fbeaea] text-alerta">sin acta, no se sabe si sigue</Pildora>;
  if (!hasta) return <Pildora tono="bg-amber-50 text-amber-800">el acta no tiene fecha</Pildora>;
  const dias = Math.round((new Date(hasta).getTime() - Date.now()) / 86_400_000);
  if (dias < 0) return <Pildora tono="border border-alerta/30 bg-[#fbeaea] text-alerta">cargo caducado el {fecha(hasta)}</Pildora>;
  if (dias <= 60) return <Pildora tono="bg-amber-50 text-amber-800">caduca el {fecha(hasta)}</Pildora>;
  return null;
}

/* ------------------------------------------------------------ lo que falta */

function loQueFalta(f: Ficha): string[] {
  const falta: string[] = [];
  if (!f.administraciones.length) falta.push("quién la administra");
  if (!f.razonSocial) falta.push(f.tarjeta ? "el nombre fiscal (está en la tarjeta)" : "el nombre fiscal");
  if (!f.cif) falta.push("el CIF");
  if (!f.tarjeta) falta.push("la tarjeta del CIF");
  if (!f.presidentes.length) falta.push("el presidente y su acta");
  else if (!f.presidentes.some((p) => p.acta)) falta.push("el acta del presidente");
  const gestores = f.administraciones.flatMap((a) => a.gestores);
  if (gestores.length && !gestores.some((g) => g.telefono)) falta.push("el teléfono de los gestores");
  if (f.cuenta && !f.certificado) falta.push("el certificado de la cuenta");
  return falta;
}

/* ------------------------------------------------------------------ página */

export default async function FichaComunidad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/administracion/comunidades/${id}`);

  const f = await fichaComunidad(id);
  if (!f) notFound();
  const autorizados = await autorizadosDe(id).catch(() => []);
  // sube papeles quien puede dar acceso a su pagina de documentacion
  const sube = !!(yo.veTodo || puedeEntrar(yo, "comercial", "trabajar") || puedeEntrar(yo, "administracion", "trabajar"));

  const hojas = f.opps.flatMap((o) => o.hojas);
  const firmadas = hojas.filter((h) => h.estado === "devuelta_firmada");
  const contratado = firmadas.reduce((s, h) => s + h.total, 0);
  const abiertas = f.opps.filter((o) => o.estado === "abierta").length;
  const falta = loQueFalta(f);
  const gestores = f.administraciones.flatMap((a) => a.gestores);
  const cat = f.catastro[0] ?? null;

  return (
    <div className="min-h-screen bg-[#DDE6D0]">
      <BarraSuperior />
      <main className="mx-auto max-w-[1300px] px-4 pb-16 pt-5 sm:px-6">
        <Salida href="/administracion/comunidades">← Comunidades</Salida>

        {/* ===================== la cabecera, sobre el fondo ===================== */}
        <div className="mt-3 border-b border-black/10 pb-4">
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
            <h1 className="min-w-0 text-3xl font-bold leading-tight text-carbon sm:text-4xl">{f.nombre}</h1>
            <div className="ml-auto flex flex-wrap items-baseline gap-x-7 text-lg">
              <Dato et="Comercial" v={f.comercial && <b className="font-semibold">{f.comercial}</b>} />
              <Dato et="Tipo" v={f.tipos.length ? f.tipos.join(" + ") : null} />
            </div>
          </div>
          <Linea className="mt-2 text-[15px]">
            <Dato et="CP" v={f.cp} />
            <Dato et="Municipio" v={f.municipio} />
            <Dato et="Provincia" v={f.provincia} />
            {f.opps.length > 0 && (
              <Pildora tono="border border-lima/40 bg-lima-soft text-lima-dark">
                {f.opps.length} {f.opps.length === 1 ? "opp" : "opps"} · {abiertas} {abiertas === 1 ? "abierta" : "abiertas"}
              </Pildora>
            )}
          </Linea>
        </div>

        {f.avisos.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-base text-amber-900">
            No se ha podido leer {f.avisos.join(", ")}. El resto de la ficha es correcto.
          </div>
        )}

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          {/* ======================= columna izquierda ======================= */}
          <div className="min-w-0 space-y-5">
            {/* lo primero: las excepciones */}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-sm font-bold uppercase tracking-wider text-carbon/70">Notas</span>
              <span className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md border border-lima/30 bg-white px-3 py-2.5">
                <span className="text-sm text-carbon/50">Lo que haya que saber de esta comunidad y no salga en ningún otro sitio…</span>
                <Pronto title="Las notas de la comunidad todavía no tienen dónde guardarse" />
              </span>
            </div>

            {/* ---------------- datos de la comunidad ---------------- */}
            <Tarjeta titulo="Datos Comunidad">
              <Linea>
                <Dato et="Nombre" v={f.nombre} />
                {!f.razonSocial && <Pildora tono="border border-amber-200 bg-amber-50 px-2 py-px text-[11px] text-amber-900">provisional</Pildora>}
              </Linea>
              <Linea className="mt-2.5">
                <Dato et="Nombre fiscal (del CIF)" v={f.razonSocial} ancho="min-w-0 flex-1 basis-80" />
                <Dato et="CIF" v={f.cif} />
                <Doc et="Tarjeta CIF" clave="tarjeta" p={f.tarjeta} comunidadId={f.id} puedeSubir={sube} />
              </Linea>
              <Linea className="mt-2.5">
                <Dato et="Domicilio fiscal" v={f.domicilioFiscal} />
              </Linea>

              <div className="my-4 border-t border-black/5" />
              <Linea>
                <Dato et="IBAN" v={f.cuenta?.iban && <span className="tabular-nums">{f.cuenta.iban}</span>} />
                {f.cuenta && <Dato et="Desde" v={fecha(f.cuenta.desde)} />}
                {f.cuenta?.origen && <span className="text-[13px] text-carbon/65">sale de la {f.cuenta.origen}</span>}
                <Doc et="Certificado de titularidad" clave="certificado" p={f.certificado} comunidadId={f.id} puedeSubir={sube} />
                {f.certificado && <Dato et="Fecha cert." v={fecha(f.certificado.emision)} falta="—" />}
              </Linea>

              {/* el presidente, con su acta y su validez */}
              <div className="mt-5">
                <Dentro titulo="Presidente" de="el cargo dura un año salvo que los estatutos digan otra cosa" borde="border-[#9A9C96]">
                  {f.presidentes.length === 0 ? (
                    <>
                      <Linea>
                        <span className="text-amber-700/60">nombre por completar</span>
                        <Doc et="DNI" clave="dni" p={f.dniSuelto} comunidadId={f.id} puedeSubir={sube} />
                      </Linea>
                      <Linea className="mt-2.5">
                        <Doc et="Acta de nombramiento" clave="acta" p={f.actaSuelta} comunidadId={f.id} puedeSubir={sube} />
                        <Dato et="Fecha del acta" v={fecha(f.actaSuelta?.emision)} falta="—" />
                        <Dato et="Vigente hasta" v={fecha(vigenciaActa(f.actaSuelta))} falta="—" />
                        <AvisoActa acta={f.actaSuelta} />
                      </Linea>
                    </>
                  ) : (
                    f.presidentes.map((p) => (
                      <div key={p.puestoId} className="pb-3 last:pb-0">
                        <Linea>
                          <b className="min-w-44 font-semibold text-carbon">{p.nombre}</b>
                          {p.telefono ? <span className="font-semibold text-lima-dark">{p.telefono}</span> : <span className="text-amber-700/60">sin teléfono</span>}
                          {p.email ? <span className="text-carbon/80">{p.email}</span> : <span className="text-amber-700/60">sin correo</span>}
                          <Dato et="DNI" v={p.documento} />
                          <Doc et="DNI" clave="dni" p={p.dni} puestoId={p.puestoId} comunidadId={f.id} puedeSubir={sube} />
                        </Linea>
                        <Linea className="mt-2.5">
                          <Doc et="Acta de nombramiento" clave="acta" p={p.acta} puestoId={p.puestoId} comunidadId={f.id} puedeSubir={sube} />
                          <Dato et="Fecha del acta" v={fecha(p.acta?.emision)} falta="—" />
                          <Dato et="Vigente hasta" v={fecha(vigenciaActa(p.acta))} falta="—" />
                          <AvisoActa acta={p.acta} />
                        </Linea>
                      </div>
                    ))
                  )}
                  <div className="mt-2.5 border-t border-black/5 pt-2 text-[13px] text-carbon/65">
                    {f.presidentesAnteriores.length === 0
                      ? "Presidentes anteriores: ninguno apuntado"
                      : <>Presidentes anteriores: {f.presidentesAnteriores.map((a) => `${a.nombre} (${fecha(a.desde) ?? "?"} — ${fecha(a.hasta) ?? "?"})`).join(" · ")}</>}
                  </div>
                </Dentro>
              </div>

              {/* otros cargos y contactos: la excepcion, mas pequeño */}
              <div className="mt-4 flex flex-wrap items-start gap-4">
                <Dentro titulo="Otros cargos">
                  <table className="w-auto">
                    <tbody>
                      {[
                        ["Vicepresidente", f.vicepresidentes],
                        ["Secretario", f.secretarios],
                      ].map(([et, ps]) => (
                        <tr key={et as string} className="border-t border-black/5 first:border-0">
                          <td className="py-1.5 pr-4 text-[11px] font-bold uppercase tracking-wide text-carbon/55">{et as string}</td>
                          <td className="py-1.5 pr-4">
                            {(ps as Ficha["secretarios"]).length ? (
                              (ps as Ficha["secretarios"]).map((p) => (
                                <span key={p.puestoId} className="mr-4">
                                  <b className="font-semibold">{p.nombre}</b>
                                  {p.telefono && <span className="ml-2 font-semibold text-lima-dark">{p.telefono}</span>}
                                </span>
                              ))
                            ) : (
                              <span className="text-amber-700/60">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Dentro>
                <Dentro titulo="Otras personas de contacto">
                  {f.otros.length === 0 ? (
                    <p className="text-[13px] text-carbon/65">Ninguna apuntada.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {f.otros.map((p) => (
                        <li key={p.puestoId} className="flex flex-wrap gap-x-5 gap-y-1">
                          <b className="font-semibold">{p.nombre}</b>
                          {p.rol && <span className="text-[13px] text-carbon/65">{p.rol}</span>}
                          {p.telefono && <span className="font-semibold text-lima-dark">{p.telefono}</span>}
                          {p.email && <span className="text-carbon/80">{p.email}</span>}
                          {p.notas && <span className="text-[13px] text-carbon/65">{p.notas}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </Dentro>
              </div>

              <Linea className="mt-4">
                <Dato et="Mancomunidad" v={f.mancomunidades.length ? f.mancomunidades.join(", ") : "no forma parte de ninguna"} />
                <Dato et="Subcomunidades" v={f.subcomunidades.length ? f.subcomunidades.join(", ") : "ninguna"} />
              </Linea>
            </Tarjeta>

            {/* ---------------- accesos y edificio ---------------- */}
            <Tarjeta titulo="Accesos y edificio" de="los portales que votan con esta comunidad" der={<Pronto title="Bloque a pensar" />}>
              {f.accesos.length === 0 ? (
                <p className="text-[13px] text-amber-700/70">Ningún acceso enlazado a esta comunidad.</p>
              ) : (
                <table className="w-auto">
                  <thead>
                    <tr className="border-b border-black/5 text-left text-[11px] font-bold uppercase tracking-wide text-carbon/55">
                      <th className="py-1.5 pr-5">Acceso</th>
                      <th className="py-1.5 pr-5">Escalera</th>
                      <th className="py-1.5 pr-5">Ref. catastral</th>
                      <th className="py-1.5 pr-5">En la opp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {f.accesos.map((a, i) => (
                      <tr key={i} className="border-t border-black/5">
                        <td className="whitespace-nowrap py-1.5 pr-5">{a.texto}</td>
                        <td className="py-1.5 pr-5">{a.escalera || "—"}</td>
                        <td className="py-1.5 pr-5 tabular-nums">{a.ref ?? <span className="text-amber-700/60">—</span>}</td>
                        <td className="py-1.5 pr-5 text-[13px] text-carbon/65">{a.opps.join(", ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="mt-4 space-y-2">
                <Desplegable nombre="Catastro" resumen={cat ? [cat.ref, cat.anio, cat.viviendas !== null && `${cat.viviendas} viviendas`, cat.inmuebles !== null && `${cat.inmuebles} inmuebles`].filter(Boolean).join(" · ") : null} abierto>
                  {f.catastro.map((c) => (
                    <div key={c.ref} className="space-y-2 pt-2">
                      {f.catastro.length > 1 && <div className="text-sm font-semibold tabular-nums">{c.ref}</div>}
                      <Linea>
                        <Dato et="Año" v={c.anio} />
                        <Dato et="Viviendas" v={c.viviendas} />
                        <Dato et="Inmuebles" v={c.inmuebles} />
                        <Dato et="Superficie" v={c.superficie !== null ? `${EUR.format(c.superficie)} m²` : null} />
                        <Dato et="Plantas" v={c.plantas} />
                      </Linea>
                      <Linea>
                        <Dato et="Usos" v={c.usos} />
                      </Linea>
                      <Linea>
                        <Dato et="Ascensor" v={c.ascensor === null ? null : c.ascensor ? "sí" : "no"} falta="sin ver" />
                        <Dato et="Portal accesible" v={c.portalAccesible === null ? null : c.portalAccesible ? "sí" : "no"} falta="sin ver" />
                      </Linea>
                    </div>
                  ))}
                </Desplegable>
                <Desplegable
                  nombre="Protección y condicionantes"
                  resumen={f.proteccion.length ? f.proteccion.map((p) => p.grado ?? p.tipo).filter(Boolean).join(" · ") : f.condicionantes.length ? `${f.condicionantes.length} condicionantes` : null}
                  vacio="sin protección en el catálogo"
                >
                  {f.proteccion.map((p, i) => (
                    <p key={i} className="pt-2">
                      <b className="font-semibold">{p.grado ?? "—"}</b> {p.denominacion && <span className="text-carbon/70">· {p.denominacion}</span>}
                    </p>
                  ))}
                  {f.condicionantes.map((t, i) => (
                    <p key={`c${i}`} className="pt-2 text-carbon/80">{t}</p>
                  ))}
                </Desplegable>
                <Desplegable
                  nombre="IEE"
                  resumen={f.iee[0] ? [fecha(f.iee[0].emision), f.iee[0].valoracion].filter(Boolean).join(" · ") || "registrado" : null}
                  vacio="no consta"
                >
                  {f.iee.map((x, i) => (
                    <Linea key={i} className="pt-2">
                      <Dato et="Código" v={x.codigo} falta="—" />
                      <Dato et="Emitido" v={fecha(x.emision)} falta="—" />
                      <Dato et="Valoración" v={x.valoracion} falta="—" />
                      <Dato et="Validez" v={x.validez} falta="—" />
                      <Dato et="Accesibilidad" v={x.accesibilidad} falta="—" />
                    </Linea>
                  ))}
                </Desplegable>
                <Desplegable
                  nombre="Subvenciones"
                  resumen={f.subvenciones.length ? `${f.subvenciones.length} en el registro público · ${eur(f.subvenciones.reduce((s, x) => s + (x.importe ?? 0), 0))}` : null}
                  vacio="ninguna en el registro público"
                >
                  <table className="mt-1 w-auto">
                    <tbody>
                      {f.subvenciones.map((s, i) => (
                        <tr key={i} className="border-t border-black/5 first:border-0">
                          <td className="py-1.5 pr-5">{s.convocatoria ?? "—"}</td>
                          <td className="py-1.5 pr-5 tabular-nums">{fecha(s.fecha) ?? "—"}</td>
                          <td className="py-1.5 pr-5 text-right font-bold tabular-nums">{s.importe !== null ? eur(s.importe) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Desplegable>
              </div>
            </Tarjeta>

            {/* ---------------- lo contratado: hojas agrupadas por opp ---------------- */}
            <Tarjeta
              titulo="Datos comerciales"
              de={
                <span className="text-sm font-black text-carbon">
                  {f.opps.length} {f.opps.length === 1 ? "opp" : "opps"} · {hojas.length} {hojas.length === 1 ? "hoja" : "hojas"} de encargo
                  {hojas.length > 0 && firmadas.length === hojas.length ? ", todas firmadas" : `, ${firmadas.length} firmadas`}
                  {contratado > 0 && ` · ${eur(contratado)}`}
                </span>
              }
            >
              {f.opps.length === 0 ? (
                <p className="text-[13px] text-carbon/65">Esta comunidad no está en ninguna oportunidad.</p>
              ) : (
                <div className="space-y-3.5">
                  {f.opps.map((o) => {
                    const total = o.hojas.filter((h) => h.estado === "devuelta_firmada").reduce((s, h) => s + h.total, 0);
                    return (
                      <div key={o.id} className="rounded-[14px] border border-lima/35 bg-[#E6ECDC] p-4">
                        <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5">
                          <a href={`/comercial/oportunidades/${o.id}`} className="text-[13px] font-bold text-carbon/55 hover:underline">{o.codigo}</a>
                          <a href={`/comercial/oportunidades/${o.id}`} className="text-lg font-bold text-carbon hover:underline">{o.nombre}</a>
                          {o.fase && <Pildora tono="border border-lima/40 bg-lima-soft text-lima-dark">{o.fase}</Pildora>}
                          {total > 0 && <span className="ml-auto text-lg font-bold tabular-nums text-lima-dark">{eur(total)}</span>}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm text-carbon/70">
                          {o.apertura && <span>abierta el {fecha(o.apertura)}</span>}
                          {o.comercial && <span>comercial: <b className="text-carbon/85">{o.comercial}</b></span>}
                          {o.accesos.length > 0 && <span>accesos: {o.accesos.join(", ")}</span>}
                          <Doc et="Acta de votación" clave="votacion" p={o.votacion} oportunidadId={o.id} comunidadId={f.id} puedeSubir={sube} />
                        </div>
                        {o.hojas.length === 0 ? (
                          <p className="mt-2.5 text-[13px] text-carbon/65">Sin hojas de encargo.</p>
                        ) : (
                          <div className="mt-2.5 overflow-x-auto rounded-[10px] border border-black/5 bg-white px-3 py-1">
                            <table className="w-auto text-sm">
                              <thead>
                                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-carbon/55">
                                  <th className="py-1.5 pr-4">Hoja</th>
                                  <th className="py-1.5 pr-4">Qué</th>
                                  <th className="py-1.5 pr-4">Firma</th>
                                  <th className="py-1.5 pr-4">Paga</th>
                                  <th className="py-1.5 pr-4 text-right">Importe</th>
                                  <th className="py-1.5" />
                                </tr>
                              </thead>
                              <tbody>
                                {o.hojas.map((h) => {
                                  const est = ESTADO_HOJA[h.estado ?? ""] ?? { texto: h.estado ?? "sin estado", tono: "bg-black/5 text-carbon/60" };
                                  return (
                                    <tr key={h.id} className="border-t border-black/5 align-baseline">
                                      <td className="whitespace-nowrap py-1.5 pr-4 tabular-nums">{h.numero ?? "—"}</td>
                                      <td className="max-w-[30rem] py-1.5 pr-4" title={h.lineas.map((l) => l.que).join(" + ")}>
                                        {h.lineas.length ? h.lineas.map((l) => l.que).join(" + ") : h.que ?? "sin descripción"}
                                      </td>
                                      <td className="whitespace-nowrap py-1.5 pr-4 tabular-nums">{fecha(h.firma) ?? "—"}</td>
                                      <td className="whitespace-nowrap py-1.5 pr-4">{h.pagador ?? "—"}</td>
                                      <td className="whitespace-nowrap py-1.5 pr-4 text-right font-bold tabular-nums">{h.total > 0 ? eur(h.total) : "—"}</td>
                                      <td className="whitespace-nowrap py-1.5">
                                        {h.firmada ? (
                                          <a
                                            href={`/administracion/comunidades/${f.id}/hoja/${h.id}/${h.firmada.versionId}`}
                                            target="_blank"
                                            rel="noopener"
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-lima/60 bg-lima-soft px-2.5 py-0.5 text-sm font-semibold text-lima-dark hover:bg-lima/30"
                                          >
                                            <span aria-hidden>📄</span>firmada
                                          </a>
                                        ) : (
                                          <Pildora tono={est.tono}>{est.texto}</Pildora>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Tarjeta>

            {/* ---------------- su pagina de documentacion (12-oct) ---------------- */}
            <div id="portal">
              <Tarjeta titulo="Su página de documentación" de="quién de la comunidad puede entrar a su portal y subir">
                {/* CUATRO GRUPOS EXPLICITOS (Monica, 20-oct-2026), para que no se
                    confunda con quien de Accesalia ve la ficha. Del comercial, SOLO
                    el nombre: «no queremos que lo bombardeen porque ya que está
                    ahí, se lo mando también por mail». */}
                <div className="grid w-fit grid-cols-[auto_auto] gap-x-6 text-[14px]">
                  {(
                    [
                      ["Comercial de Accesalia", "comercial", "ninguno: no tiene opps abiertas"],
                      ["Administrador de la finca", "administrador", "sin correo apuntado"],
                      ["Presidente en activo de la comunidad", "presidente", "sin correo apuntado"],
                      ["Otras personas autorizadas", "manual", "ninguna"],
                    ] as const
                  ).map(([et, rol, vacio]) => {
                    const suyos = autorizados.filter((a) => a.rol === rol);
                    return (
                      <div key={rol} className="col-span-2 grid grid-cols-subgrid border-t border-black/5 py-2 first:border-0">
                        <span className="pt-0.5 text-[11px] font-bold uppercase tracking-wide text-carbon/55">{et}</span>
                        <ul className="space-y-1">
                          {suyos.length === 0 && <li className="text-amber-700/60">{vacio}</li>}
                          {rol === "comercial"
                            ? suyos.length > 0 && <li className="font-semibold text-carbon">{[...new Set(suyos.map((a) => a.nombre ?? "sin nombre"))].join(", ")}</li>
                            : suyos.map((a) => (
                                <li key={a.email} className="flex flex-wrap items-baseline gap-x-2">
                                  {a.nombre && <b className="font-semibold text-carbon">{a.nombre}</b>}
                                  <span className="text-carbon/80">{a.email}</span>
                                  {a.motivo && <span className="text-[13px] text-carbon/60">· {a.motivo}</span>}
                                  {rol === "manual" && a.id && (
                                    <form action={accionQuitarAutorizado.bind(null, id, a.id)}>
                                      <button type="submit" className="text-[12.5px] text-alerta underline">quitar</button>
                                    </form>
                                  )}
                                </li>
                              ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
                <form action={accionAutorizar.bind(null, id)} className="mt-3 grid gap-2 border-t border-black/5 pt-3 sm:grid-cols-[1.3fr_1fr_1fr_auto]">
                  <input name="email" type="email" required placeholder="correo" className="rounded-lg border border-carbon/30 px-2.5 py-1.5 text-sm" />
                  <input name="nombre" placeholder="nombre" className="rounded-lg border border-carbon/30 px-2.5 py-1.5 text-sm" />
                  <input name="motivo" placeholder="por qué (la nuera del presidente…)" className="rounded-lg border border-carbon/30 px-2.5 py-1.5 text-sm" />
                  <button type="submit" className="rounded-lg bg-lima px-3 py-1.5 text-sm font-bold text-carbon hover:bg-lima-dark hover:text-white">
                    Dar acceso
                  </button>
                </form>
                <p className="mt-2 text-xs text-carbon/60">
                  Entran con su correo en {`${process.env.URL_PUBLICA ?? "https://accesalia-crm.vercel.app"}/portal`}: les llega un enlace de un solo uso.
                </p>
              </Tarjeta>
            </div>
          </div>

          {/* ======================== columna derecha ======================== */}
          <aside className="space-y-5 lg:sticky lg:top-20">
            {/* lo primero: con quien hay que hablar */}
            <Tarjeta titulo="Administrador de fincas">
              {f.administraciones.length === 0 ? (
                <p className="text-amber-700/70">Sin administrador asignado.</p>
              ) : (
                f.administraciones.map((a, i) => (
                  <div key={i} className={i ? "mt-4 border-t border-black/5 pt-4" : ""}>
                    <div className="text-lg font-semibold text-carbon">{a.empresa ?? "sin nombre"}</div>
                    <div className="mt-1.5">
                      <Dato et="Tel. general" v={a.telefono && <span className="font-semibold text-lima-dark">{a.telefono}</span>} />
                    </div>
                    {a.direccion && <div className="mt-0.5 text-[13px] text-carbon/65">{a.direccion}</div>}
                    <div className="mt-1.5">
                      <Dato et="Desde" v={fecha(a.desde)} />
                    </div>

                    <div className="mt-3 border-t border-black/5 pt-3">
                      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-carbon/55">
                        {a.gestores.length === 1 ? "Gestor que la lleva" : `Gestores que la llevan (${a.gestores.length})`}
                      </div>
                      {a.gestores.length === 0 && <p className="text-amber-700/60">por completar</p>}
                      {a.gestores.map((g, j) => (
                        <div key={j} className={j ? "mt-2.5 border-t border-black/5 pt-2.5" : ""}>
                          <div className="font-semibold">
                            {g.nombre}
                            {g.cargo && <span className="ml-2 text-[13px] font-normal text-carbon/65">{g.cargo}</span>}
                          </div>
                          <div className="mt-0.5 flex flex-wrap gap-x-5">
                            {g.telefono ? <span className="font-semibold text-lima-dark">{g.telefono}</span> : <span className="text-amber-700/60">sin teléfono</span>}
                            {g.email ? <span className="break-all text-carbon/80">{g.email}</span> : <span className="text-amber-700/60">sin correo</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}

              {f.adminAnteriores.length > 0 && (
                <div className="mt-4 border-t border-black/5 pt-3">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-carbon/55">Antes la llevaban</div>
                  <ul className="mt-1 space-y-1">
                    {f.adminAnteriores.map((a, i) => (
                      <li key={i} className="text-carbon/80">
                        {a.empresa ?? "sin nombre"}
                        <span className="ml-2 text-sm text-carbon/55">{fecha(a.desde) ?? "?"} — {fecha(a.hasta) ?? "?"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 border-t border-black/5 pt-3">
                <Dato et="Comercial Accesalia" v={f.comercial && <b className="font-semibold">{f.comercial}</b>} />
                {f.comercial && gestores.some((g) => g.comercial === f.comercial) && (
                  <div className="mt-0.5 text-[13px] text-carbon/65">
                    de la cartera de {gestores.filter((g) => g.comercial === f.comercial).map((g) => g.nombre).join(" y ")}
                  </div>
                )}
              </div>
            </Tarjeta>

            {/* el estado */}
            <Tarjeta titulo="Estado de la relación">
              <ul className="space-y-1.5">
                <Fila et="Opps" v={f.opps.length ? `${abiertas} ${abiertas === 1 ? "abierta" : "abiertas"}${f.opps.length > abiertas ? ` de ${f.opps.length}` : ""}` : "ninguna"} />
                <Fila et="Hojas firmadas" v={String(firmadas.length)} verde={firmadas.length > 0} />
                <Fila et="Contratado" v={contratado > 0 ? eur(contratado) : "—"} />
                <Fila et="Tiene proyecto" v={f.conProyecto ? "sí" : "no"} verde={f.conProyecto} />
                <Fila et="Último contacto" v={fecha(f.ultimoContacto) ?? "—"} />
              </ul>
              <div className="mt-3 space-y-2 border-t border-black/5 pt-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-carbon/65">Nos debe</span>
                  <Pronto title="Saldrá de la facturación de sus opps" />
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-carbon/65">Viva o cerrada</span>
                  <Pronto title="Se calculará de lo contratado" />
                </div>
              </div>
            </Tarjeta>

            {/* los papeles con fecha */}
            <Tarjeta titulo="Papeles y validez">
              <ul className="space-y-2">
                <li className="flex items-center justify-between gap-3">
                  <Doc et="Tarjeta CIF" clave="tarjeta" p={f.tarjeta} comunidadId={f.id} puedeSubir={sube} />
                  <span className="text-[13px] text-carbon/65">{f.tarjeta ? "subida" : "no caduca"}</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <Doc et="Acta presidente" clave="acta" p={f.presidentes[0]?.acta ?? f.actaSuelta} puestoId={f.presidentes[0]?.puestoId ?? null} comunidadId={f.id} puedeSubir={sube} />
                  <span className="text-[13px] text-carbon/65">{fecha(vigenciaActa(f.presidentes[0]?.acta ?? f.actaSuelta)) ? `hasta ${fecha(vigenciaActa(f.presidentes[0]?.acta ?? f.actaSuelta))}` : "caduca al año"}</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <Doc et="DNI presidente" clave="dni" p={f.presidentes[0]?.dni ?? f.dniSuelto} puestoId={f.presidentes[0]?.puestoId ?? null} comunidadId={f.id} puedeSubir={sube} />
                  <span className="text-[13px] text-carbon/65">{(f.presidentes[0]?.dni ?? f.dniSuelto)?.caduca ? `hasta ${fecha((f.presidentes[0]?.dni ?? f.dniSuelto)!.caduca)}` : "caduca"}</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <Doc et="Cert. de la cuenta" clave="certificado" p={f.certificado} comunidadId={f.id} puedeSubir={sube} />
                  <span className="text-[13px] text-carbon/65">{f.certificado?.emision ? `del ${fecha(f.certificado.emision)}` : "reciente"}</span>
                </li>
              </ul>
            </Tarjeta>

            {/* lo que falta */}
            {falta.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                <div className="text-sm font-bold uppercase tracking-wider text-amber-800/80">Le falta</div>
                <ul className="mt-2 space-y-1 text-base text-amber-900/80">
                  {falta.map((x) => (
                    <li key={x}>· {x}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs leading-relaxed text-amber-900/60">Sin prisa. Solo hace falta en las comunidades activas.</p>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function Fila({ et, v, verde = false }: { et: string; v: string; verde?: boolean }) {
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span className="text-carbon/65">{et}</span>
      <b className={"tabular-nums " + (verde ? "text-lima-dark" : "text-carbon")}>{v}</b>
    </li>
  );
}

/** Un desplegable con su resumen a la vista: el dato se ve sin abrirlo. */
function Desplegable({ nombre, resumen, vacio = "sin datos", abierto = false, children }: {
  nombre: string; resumen: string | null; vacio?: string; abierto?: boolean; children: React.ReactNode;
}) {
  const hay = !!resumen;
  return (
    <details open={abierto && hay} className="group rounded-xl border border-black/10 bg-white">
      <summary className={"flex list-none items-baseline gap-3.5 px-3.5 py-2.5 [&::-webkit-details-marker]:hidden " + (hay ? "cursor-pointer" : "cursor-default")}>
        <span className="w-3 text-[13px] text-carbon/40">{hay ? <><span className="group-open:hidden">▸</span><span className="hidden group-open:inline">▾</span></> : "·"}</span>
        <span className="min-w-[13rem] text-[15px] font-bold">{nombre}</span>
        <span className={"text-sm " + (hay ? "text-carbon/75" : "text-amber-700/60")}>{resumen ?? vacio}</span>
      </summary>
      {hay && <div className="border-t border-black/5 px-3.5 pb-3.5 pl-10 text-[15px]">{children}</div>}
    </details>
  );
}
