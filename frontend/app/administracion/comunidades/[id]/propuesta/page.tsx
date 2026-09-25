import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BarraSuperior } from "../../../../components/BarraSuperior";
import { fichaComunidad, type FichaComunidad } from "../../../../../lib/administracion";
import { puedeEntrar, quienSoy } from "../../../../../lib/sesion";

export const dynamic = "force-dynamic";

// LA FICHA DE COMUNIDAD, reordenada con Monica el 25-sep-2026 sobre su propio
// boceto. Lo que decidio, y por que:
//
//   - LA CABECERA lo dice todo de un golpe: "Mayor 25 Madrid · Álvaro · Ascensor
//     y SATE". La linea de la direccion se desaprovechaba, asi que ademas lleva
//     el comercial que la lleva y lo contratado.
//   - LO PRIMERO de la izquierda son las NOTAS: "si entro, lo primero que
//     quiero ver no es la rutina, sino las excepciones".
//   - LA COMUNIDAD junta lo fiscal y lo del edificio, fijo y variable, y se
//     lleva dentro al PRESIDENTE (con su acta en gris) y, debajo y mas
//     pequeñas, las OTRAS PERSONAS DE CONTACTO, que son la excepcion.
//   - LO CONTRATADO: una tarjeta por hoja de encargo.
//   - A LA DERECHA, primero el ADMINISTRADOR: "si tengo que hablar con el,
//     necesito saber quien es, para quien trabaja y como contactarle".
//   - "Antes la llevaban" solo ocupa sitio cuando de verdad ha cambiado.
//   - Estado y el punto de obra quedan como HUECO declarado: aun no se sabe.

const EUR = new Intl.NumberFormat("es-ES", { useGrouping: "always", maximumFractionDigits: 0 });
const eur = (n: number) => `${EUR.format(n)} €`;
const fecha = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : null);

const ESTADO_HOJA: Record<string, { texto: string; tono: string }> = {
  devuelta_firmada: { texto: "firmada", tono: "bg-lima text-carbon" },
  enviada_comunidad: { texto: "enviada, sin firmar", tono: "bg-amber-50 text-amber-800" },
  borrador: { texto: "borrador", tono: "bg-black/5 text-carbon/60" },
  anulada: { texto: "anulada", tono: "bg-black/5 text-carbon/40" },
};

/* ------------------------------------------------------------------ piezas */

function Tarjeta({ titulo, de, children, tono = "" }: { titulo?: string; de?: string; children: React.ReactNode; tono?: string }) {
  return (
    <section className={"rounded-2xl border border-black/5 bg-white p-5 shadow-sm " + tono}>
      {titulo && (
        <div className="mb-3 flex flex-wrap items-baseline gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-carbon/70">{titulo}</h2>
          {de && <span className="text-xs text-carbon/40">{de}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Una tarjeta de dentro: el mismo lenguaje, medio tono mas apagada. */
function Dentro({ titulo, de, ancho = "", children }: { titulo: string; de?: string; ancho?: string; children: React.ReactNode }) {
  return (
    <div className={"rounded-xl border border-black/5 bg-hueso/70 p-4 " + ancho}>
      <div className="mb-2.5 flex flex-wrap items-baseline gap-2">
        <h3 className="text-sm font-bold text-carbon/85">{titulo}</h3>
        {de && <span className="text-xs text-carbon/40">{de}</span>}
      </div>
      {children}
    </div>
  );
}

/** Un dato: etiqueta pequeña arriba y el valor debajo. El hueco, en suave. */
function Dato({ et, v, ancho = "" }: { et: string; v: React.ReactNode; ancho?: string }) {
  const vacio = v === null || v === undefined || v === "";
  return (
    <div className={"flex min-w-0 items-baseline gap-1.5 " + ancho}>
      <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-carbon/55">{et}:</span>
      <span className={"truncate text-base " + (vacio ? "text-amber-700/50" : "text-carbon/90")}>
        {vacio ? "por completar" : v}
      </span>
    </div>
  );
}

/** El botón de un documento guardado. Todavía no abre nada. */
function Doc({ et, hay }: { et: string; hay?: boolean }) {
  return (
    <span
      title="El archivo de documentos está por montar"
      className={
        "inline-flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-sm font-semibold " +
        (hay ? "border-lima/60 bg-lima-soft text-lima-dark" : "border-black/10 bg-white text-carbon/40")
      }
    >
      <span aria-hidden>📄</span>
      {et}
    </span>
  );
}

/** Lo que todavía no tiene dónde guardarse: en gris, con sus campos nombrados. */
function Hueco({ texto, campos }: { texto: string; campos: string[] }) {
  return (
    <div className="rounded-xl border border-dashed border-black/15 bg-hueso/60 px-4 py-3">
      <p className="text-sm leading-snug text-carbon/50">{texto}</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {campos.map((c) => (
          <li key={c} className="rounded-md border border-dashed border-black/15 bg-white px-2 py-0.5 text-xs text-carbon/45">
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}

function loQueFalta(f: FichaComunidad): string[] {
  const falta: string[] = [];
  if (!f.administradores.some((a) => a.vigente)) falta.push("quién la administra");
  if (!f.cif) falta.push("el CIF");
  if (f.presidentes.length === 0) falta.push("el presidente");
  else if (!f.presidentes.some((p) => p.telefono || p.email)) falta.push("cómo contactar al presidente");
  if (f.edificio.anio === null) falta.push("el año de construcción");
  if (f.edificio.viviendas === null) falta.push("el número de viviendas");
  if (!f.edificio.catastro) falta.push("la referencia catastral");
  return falta;
}

/* ------------------------------------------------------------------ página */

export default async function Ficha({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/administracion/comunidades/${id}/propuesta`);
  if (!puedeEntrar(yo, "administracion")) redirect("/menu");

  const f = await fichaComunidad(id);
  if (!f) notFound();

  const admin = f.administradores.find((a) => a.vigente) ?? null;
  const anteriores = f.administradores.filter((a) => !a.vigente);
  const falta = loQueFalta(f);
  const ultima = f.encargos[0] ?? null;
  const firmadas = f.encargos.filter((e) => e.estado === "devuelta_firmada").length;

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1300px] px-4 pb-16 pt-5 sm:px-6">
        <Link href={`/administracion/comunidades/${id}`} className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
          ← Volver a la ficha de ahora
        </Link>

        {/* ===================== la cabecera: limpia sobre el fondo ===================== */}
        <div className="mt-3 flex flex-wrap items-baseline gap-x-8 gap-y-1 border-b border-black/10 pb-4">
          <h1 className="text-3xl font-bold leading-tight text-carbon sm:text-4xl">{f.nombre}</h1>
          <div className="flex flex-wrap items-baseline gap-x-7 gap-y-1 text-lg">
            <Dato et="Quien la lleva" v={ultima?.comercial} />
            <Dato et="Contratado" v={ultima?.que} />
          </div>
        </div>

        {f.avisos.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-base text-amber-900">
            No se ha podido leer {f.avisos.join(", ")}. El resto de la ficha es correcto.
          </div>
        )}

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          {/* ======================= columna izquierda ======================= */}
          <div className="space-y-5">
            {/* ---- lo primero: las excepciones. Sin tarjeta, y si no hay, una linea ---- */}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-sm font-bold uppercase tracking-wider text-carbon/70">Notas</span>
              <span className="min-w-0 flex-1 rounded-md border border-black/10 bg-white px-3 py-1 text-sm text-carbon/35">
                Escribe aquí lo que no cabe en ningún otro sitio
              </span>
            </div>

            {/* ---- la comunidad, con quien manda dentro ---- */}
            <Tarjeta titulo="Datos Comunidad">
              <div className="flex flex-wrap items-baseline gap-x-7 gap-y-2">
                <Dato et="Nombre fiscal (del CIF)" v={null} ancho="min-w-0 flex-1 basis-80" />
                <Dato et="CIF" v={f.cif} />
                <Doc et="tarjeta CIF" />
              </div>
              <div className="mt-2.5 flex flex-wrap items-baseline gap-x-7 gap-y-2">
                <Dato et="Ref. catastral" v={f.edificio.catastro} />
                <Dato et="Viviendas" v={f.edificio.viviendas} />
                <Dato et="Año" v={f.edificio.anio} />
              </div>

              {/* el presidente, con su acta en gris */}
              <div className="mt-5">
                <Dentro titulo="Presidente">
                  {f.presidentes.length === 0 ? (
                    <p className="text-base text-amber-700/45">por completar</p>
                  ) : (
                    f.presidentes.map((p, i) => (
                      <div key={i} className="flex flex-wrap gap-x-8 gap-y-3 pb-3">
                        <Dato et="Nombre" v={p.nombre} ancho="flex-1 basis-56" />
                        <Dato et="Teléfono" v={p.telefono ? <span className="font-semibold text-lima-dark">{p.telefono}</span> : null} ancho="basis-32" />
                        <Dato et="Correo" v={p.email} ancho="basis-48" />
                        <Dato et="DNI" v={p.documento} ancho="basis-32" />
                        <Doc et="Documento del DNI" />
                      </div>
                    ))
                  )}
                  <Hueco
                    texto="El acta de nombramiento: de aquí sale el aviso cuando caduque el cargo. Con 250 comunidades vivas, a mano es inviable."
                    campos={["📄 Acta de nombramiento", "Fecha del acta", "Vigencia hasta", "Aviso al caducar", "Presidentes anteriores"]}
                  />
                </Dentro>
              </div>

              {/* y las otras personas, mas pequeñas: son la excepcion */}
              <div className="mt-4 max-w-2xl">
                <Dentro titulo="Otras personas de contacto">
                  {f.otrosContactos.length === 0 ? (
                    <p className="text-sm text-carbon/40">Ninguna apuntada.</p>
                  ) : (
                    <ul className="space-y-2">
                      {f.otrosContactos.map((p, i) => (
                        <li key={i} className="flex flex-wrap gap-x-6 gap-y-2">
                          <Dato et="Nombre" v={p.nombre} ancho="basis-44" />
                          <Dato et="Teléfono" v={p.telefono} ancho="basis-32" />
                          <Dato et="Correo" v={p.email} ancho="basis-44" />
                          <Dato et="Por qué está aquí" v={p.notas} ancho="flex-1 basis-52" />
                        </li>
                      ))}
                    </ul>
                  )}
                </Dentro>
              </div>
            </Tarjeta>

            {/* ---- lo contratado: una tarjeta por hoja ---- */}
            <Tarjeta titulo="Datos comerciales">
              {f.encargos.length === 0 ? (
                <p className="text-sm text-carbon/40">No hay ninguna hoja de encargo de esta comunidad.</p>
              ) : (
                <div className="space-y-4">
                  {f.encargos.map((e) => {
                    const est = ESTADO_HOJA[e.estado ?? ""] ?? { texto: e.estado ?? "sin estado", tono: "bg-black/5 text-carbon/60" };
                    const total = e.lineas.reduce((s, l) => s + (l.importe ?? 0), 0);
                    return (
                      <div key={e.id} className="rounded-xl border border-black/5 bg-hueso/70 p-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                          <span className="text-lg font-bold text-carbon">{e.que ?? "sin descripción"}</span>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={"rounded-full px-2.5 py-0.5 text-sm font-bold " + est.tono}>{est.texto}</span>
                            {total > 0 && <span className="text-lg font-bold tabular-nums text-lima-dark">{eur(total)}</span>}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
                          <Dato et="Fecha de la firma" v={fecha(e.versionEnviada ?? e.fecha)} ancho="basis-32" />
                          <Dato et="Quién paga" v={e.pagador} ancho="basis-32" />
                          <Dato et="Lo trajo" v={e.loTrajo} ancho="basis-40" />
                          <Doc et="Hoja firmada" hay={e.firmados > 0} />
                        </div>

                        {e.lineas.length > 0 && (
                          <div className="mt-3">
                            <div className="text-[11px] uppercase tracking-wide text-carbon/40">Conceptos incluidos</div>
                            <ul className="mt-1 flex flex-wrap gap-2">
                              {e.lineas.map((l, i) => (
                                <li key={i} className="rounded-lg border border-black/5 bg-white px-2.5 py-1 text-sm text-carbon/75">
                                  {l.que}
                                  {l.importe !== null && <b className="ml-1.5 tabular-nums text-carbon">{eur(l.importe)}</b>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="mt-3">
                          <Hueco
                            texto="En qué punto está: sale del flujo del proyecto y todavía hay que definirlo."
                            campos={["Escaneo", "Visado", "Licencia", "Obra iniciada", "Obra terminada"]}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Tarjeta>
          </div>

          {/* ======================== columna derecha ======================== */}
          <aside className="space-y-5 lg:sticky lg:top-20">
            {/* lo primero: con quien hay que hablar */}
            <Tarjeta titulo="Administrador de fincas">
              {admin ? (
                <>
                  <div className="space-y-3">
                    <Dato et="Administración" v={admin.empresa} />
                    <div className="flex flex-wrap gap-x-6 gap-y-3">
                      <Dato et="Teléfono general" v={admin.telefono} ancho="flex-1 basis-32" />
                      <Dato et="Desde" v={fecha(admin.desde)} ancho="basis-24" />
                    </div>
                    <div className="border-t border-black/5 pt-3">
                      <Dato et="Persona que la lleva" v={admin.persona?.nombre} />
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-3">
                      <Dato
                        et="Su teléfono"
                        v={admin.persona?.telefono ? <span className="font-semibold text-lima-dark">{admin.persona.telefono}</span> : null}
                        ancho="flex-1 basis-32"
                      />
                      <Dato et="Cargo" v={admin.persona?.cargo} ancho="basis-24" />
                    </div>
                    {admin.notas && <p className="border-t border-black/5 pt-3 text-base text-carbon/70">{admin.notas}</p>}
                  </div>

                  {/* solo ocupa sitio cuando de verdad ha cambiado */}
                  {anteriores.length > 0 && (
                    <div className="mt-4 border-t border-black/5 pt-3">
                      <div className="text-[11px] uppercase tracking-wide text-carbon/40">Antes la llevaban</div>
                      <ul className="mt-1 space-y-1">
                        {anteriores.map((a, i) => (
                          <li key={i} className="text-base text-carbon/75">
                            {a.empresa ?? "sin nombre"}
                            <span className="ml-2 text-sm text-carbon/45">
                              {fecha(a.desde) ?? "?"} — {fecha(a.hasta) ?? "?"}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-1.5 text-xs text-carbon/40">
                        Importa en subvenciones: se tramitan dos o tres años después y puede haber documentación enviada al
                        anterior.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-base text-amber-700/50">
                  Sin administrador asignado. Son 646 de las 1.228: es el hueco más gordo que hay.
                </p>
              )}
            </Tarjeta>

            {/* el estado, todavia sin resolver */}
            <Tarjeta titulo="Estado de la relación">
              <div className="mb-3 flex flex-wrap gap-x-8 gap-y-2">
                <Dato et="Hojas firmadas" v={<b className={firmadas ? "text-lima-dark" : "text-carbon/30"}>{firmadas}</b>} />
                <Dato et="Tiene proyecto" v={<b className={f.conProyecto ? "text-lima-dark" : "text-carbon/30"}>{f.conProyecto ? "sí" : "no"}</b>} />
              </div>
              <Hueco
                texto="Viva o cerrada: se calculará de lo contratado — obra sin CFO, subvención sin resolución, IEE sin su documento — y se podrá reactivar si vuelven a llamar."
                campos={["Viva o cerrada", "Por qué está viva", "Se puede reactivar"]}
              />
            </Tarjeta>

            {/* y lo que le falta, tal cual estaba */}
            {falta.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                <div className="text-sm font-bold uppercase tracking-wider text-amber-800/80">Le falta</div>
                <ul className="mt-2 space-y-1 text-base text-amber-900/80">
                  {falta.map((x) => (
                    <li key={x}>· {x}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs leading-relaxed text-amber-900/50">
                  Sin prisa. Cuando exista el estado, esto solo se marcará en las comunidades activas: si no nos
                  contrataron, no hace falta completarla.
                </p>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
