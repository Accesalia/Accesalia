import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { fichaComunidad, type FichaComunidad } from "../../../../lib/administracion";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";

export const dynamic = "force-dynamic";

// LA FICHA DE COMUNIDAD. Estructura dictada por Monica el 25-sep-2026.
//
// PRINCIPIO DE DISEÑO SUYO, que manda en toda la pantalla: "eso de poner campos
// apilados y tener que hacer scroll kilometrico lo vamos a evitar". Un codigo
// postal son cinco cifras y no ocupa una linea. Por eso: columna izquierda
// ancha con los datos en lineas compuestas, y columna derecha estrecha con las
// "zonas calientes" (estado, lo que falta, notas).
//
// ORDEN DE LAS SECCIONES: hoy es este, pero ella avisa de que no es fijo y de
// que cada perfil podra ver primero unas u otras ("lo que necesita saber un
// tecnico, o el director de obra, o la chica de facturacion es diferente").
//
// LOS HUECOS SE AVISAN EN SUAVE, no en rojo: "que se pueda trabajar sin estres
// en fichas incompletas". Y solo deberian marcarse en las comunidades ACTIVAS,
// porque hay huecos que nunca se rellenaran (si no nos contrataron, ¿para que
// queremos el acta del presidente?). El estado de la relacion aun no existe en
// la base, asi que de momento se avisa de eso mismo.

const EUR = new Intl.NumberFormat("es-ES", { useGrouping: "always", maximumFractionDigits: 0 });
const eur = (n: number) => `${EUR.format(n)} €`;
const fecha = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : null);

const ESTADO_HOJA: Record<string, { texto: string; tono: string }> = {
  devuelta_firmada: { texto: "firmada", tono: "bg-lima text-carbon" },
  enviada_comunidad: { texto: "enviada, sin firmar", tono: "bg-amber-50 text-amber-800" },
  borrador: { texto: "borrador", tono: "bg-black/5 text-carbon/60" },
  anulada: { texto: "anulada", tono: "bg-black/5 text-carbon/40" },
};

function Seccion({ n, titulo, nota, children }: { n: number; titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <div className="mb-2 flex flex-wrap items-baseline gap-2">
        <span className="text-sm font-bold tabular-nums text-carbon/25">{n}</span>
        <h2 className="text-sm font-bold uppercase tracking-wider text-carbon/60">{titulo}</h2>
        {nota && <span className="text-xs text-carbon/40">{nota}</span>}
      </div>
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">{children}</div>
    </section>
  );
}

/** Un dato en una linea compartida. Si falta, se dice en suave, sin alarmar. */
function Dato({ etiqueta, valor, ancho = "" }: { etiqueta: string; valor: React.ReactNode; ancho?: string }) {
  const vacio = valor === null || valor === undefined || valor === "";
  return (
    <div className={ancho}>
      <div className="text-xs uppercase tracking-wide text-carbon/40">{etiqueta}</div>
      <div className={"text-base " + (vacio ? "text-amber-700/45" : "text-carbon/85")}>{vacio ? "por completar" : valor}</div>
    </div>
  );
}

function Fila({ children, cols }: { children: React.ReactNode; cols: string }) {
  return <div className={"grid gap-x-6 gap-y-3 border-b border-black/5 py-3 first:pt-0 last:border-0 last:pb-0 " + cols}>{children}</div>;
}

function Hueco({ texto, campos }: { texto: string; campos?: string[] }) {
  return (
    <div className="rounded-xl border border-dashed border-black/15 bg-hueso/40 px-4 py-3">
      <p className="text-sm text-carbon/50">{texto}</p>
      {campos && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {campos.map((c) => (
            <li key={c} className="rounded-md border border-dashed border-black/15 bg-white px-2 py-0.5 text-xs text-carbon/40">
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Lo que le falta a esta ficha, en tono suave: es una lista de tareas, no un reproche. */
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

export default async function Ficha({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/administracion/comunidades/${id}`);
  if (!puedeEntrar(yo, "administracion")) redirect("/menu");

  const f = await fichaComunidad(id);
  if (!f) notFound();

  const admin = f.administradores.find((a) => a.vigente) ?? null;
  const anteriores = f.administradores.filter((a) => !a.vigente);
  const falta = loQueFalta(f);
  const firmadas = f.encargos.filter((e) => e.estado === "devuelta_firmada").length;

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1300px] px-4 pb-16 pt-5 sm:px-6">
        <Link href="/administracion/comunidades" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
          ← Comunidades
        </Link>
        <Link
          href={`/administracion/comunidades/${id}/propuesta`}
          className="ml-4 text-sm font-semibold text-lima-dark transition hover:underline"
        >
          Ver la propuesta nueva →
        </Link>

        {/* ===================== LA DIRECCION, cabecera absoluta ===================== */}
        {/* Es UN solo campo de texto y no se descompone, a proposito. Al lado, lo
            que ocupa poco: CP, municipio y provincia. */}
        <div className="mt-3 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-black/10 pb-4">
          <h1 className="text-3xl font-bold leading-tight text-carbon sm:text-4xl">{f.nombre}</h1>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <Dato etiqueta="Código postal" valor={f.cp} />
            <Dato etiqueta="Municipio" valor={f.municipio} />
            <Dato etiqueta="Provincia" valor={f.provincia} />
          </div>
        </div>

        {f.avisos.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-base text-amber-900">
            No se ha podido leer {f.avisos.join(", ")}. El resto de la ficha es correcto.
          </div>
        )}

        {/* ===================== izquierda ancha | derecha caliente ===================== */}
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div>
            {/* --------------------------- 1. el edificio --------------------------- */}
            <Seccion n={1} titulo="Datos del edificio" nota="lo que no cambia nunca">
              <Fila cols="sm:grid-cols-3">
                <Dato etiqueta="Año de construcción" valor={f.edificio.anio} />
                <Dato etiqueta="Número de viviendas" valor={f.edificio.viviendas} />
                <Dato etiqueta="Referencia catastral" valor={f.edificio.catastro} />
              </Fila>
            </Seccion>

            {/* ------------------------ 2. el administrador ------------------------ */}
            <Seccion n={2} titulo="Administrador de fincas">
              {admin ? (
                <>
                  <Fila cols="sm:grid-cols-[1.4fr_1fr_1fr]">
                    <Dato etiqueta="Administración" valor={admin.empresa} />
                    <Dato etiqueta="Teléfono" valor={admin.telefono} />
                    <Dato etiqueta="Desde" valor={fecha(admin.desde)} />
                  </Fila>
                  <Fila cols="sm:grid-cols-[1.4fr_1fr_1fr]">
                    <Dato etiqueta="Persona que la lleva" valor={admin.persona?.nombre} />
                    <Dato etiqueta="Cargo" valor={admin.persona?.cargo} />
                    <Dato etiqueta="Su teléfono" valor={admin.persona?.telefono} />
                  </Fila>
                  {admin.notas && <p className="pt-3 text-base text-carbon/70">{admin.notas}</p>}
                </>
              ) : (
                <Hueco texto="Esta comunidad no tiene administrador asignado. Son 646 de las 1.228, así que es el hueco más gordo que hay." />
              )}

              {anteriores.length > 0 && (
                <div className="mt-4 border-t border-black/5 pt-3">
                  <div className="text-xs uppercase tracking-wide text-carbon/40">Antes la llevaban</div>
                  <ul className="mt-1.5 space-y-1">
                    {anteriores.map((a, i) => (
                      <li key={i} className="flex flex-wrap items-baseline gap-x-3 text-base text-carbon/70">
                        <span className="font-semibold">{a.empresa ?? "sin nombre"}</span>
                        <span className="text-sm text-carbon/45">
                          {fecha(a.desde) ?? "?"} — {fecha(a.hasta) ?? "?"}
                        </span>
                        {a.notas && <span className="text-sm text-carbon/50">{a.notas}</span>}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-carbon/40">
                    Importante en subvenciones: se tramitan dos o tres años después, y puede haber documentación enviada
                    al administrador anterior.
                  </p>
                </div>
              )}
            </Seccion>

            {/* ------------------------- 3. la comunidad --------------------------- */}
            <Seccion n={3} titulo="La comunidad de vecinos">
              <Fila cols="sm:grid-cols-[1.6fr_1fr_1fr]">
                <Dato etiqueta="Nombre fiscal (el de la tarjeta del CIF)" valor={null} />
                <Dato etiqueta="CIF" valor={f.cif} />
                <Dato etiqueta="Tarjeta del CIF" valor={null} />
              </Fila>

              <div className="border-b border-black/5 py-3">
                <div className="text-xs uppercase tracking-wide text-carbon/40">Presidente</div>
                {f.presidentes.length === 0 ? (
                  <p className="text-base text-amber-700/45">por completar</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {f.presidentes.map((p, i) => (
                      <li key={i} className="grid gap-x-6 gap-y-1 sm:grid-cols-[1.4fr_1fr_1fr_0.8fr]">
                        <span className="text-base font-semibold text-carbon">{p.nombre}</span>
                        <span className={"text-base " + (p.telefono ? "text-lima-dark" : "text-amber-700/45")}>
                          {p.telefono ?? "sin teléfono"}
                        </span>
                        <span className={"truncate text-base " + (p.email ? "text-carbon/70" : "text-amber-700/45")}>
                          {p.email ?? "sin correo"}
                        </span>
                        <span className={"text-base " + (p.documento ? "text-carbon/70" : "text-amber-700/45")}>
                          {p.documento ?? "sin DNI"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3">
                  <Hueco
                    texto="El acta de nombramiento todavía no tiene dónde guardarse. Es la que hace falta para avisar cuando caduque el cargo."
                    campos={["Acta de nombramiento", "Fecha del acta", "Vigencia hasta", "Aviso al caducar", "Presidentes anteriores"]}
                  />
                </div>
              </div>

              <div className="py-3">
                <div className="text-xs uppercase tracking-wide text-carbon/40">Otras personas de contacto</div>
                {f.otrosContactos.length === 0 ? (
                  <p className="mt-1 text-sm text-carbon/40">
                    Ninguna. Aquí van la vecina, el cuñado o el hijo del presidente que es quien de verdad lo lleva, con
                    una nota de por qué está ahí.
                  </p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {f.otrosContactos.map((p, i) => (
                      <li key={i} className="grid gap-x-6 sm:grid-cols-[1.2fr_1fr_1fr_1.4fr]">
                        <span className="text-base text-carbon">{p.nombre}</span>
                        <span className="text-base text-lima-dark">{p.telefono ?? "—"}</span>
                        <span className="truncate text-base text-carbon/70">{p.email ?? "—"}</span>
                        <span className="text-sm text-carbon/55">{p.notas ?? p.rol ?? ""}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Seccion>

            {/* -------------------------- 4. lo comercial -------------------------- */}
            <Seccion n={4} titulo="Datos comerciales" nota={`${f.encargos.length} ${f.encargos.length === 1 ? "encargo" : "encargos"}`}>
              {f.encargos.length === 0 ? (
                <Hueco texto="No hay ninguna hoja de encargo de esta comunidad." />
              ) : (
                <ul className="divide-y divide-black/5">
                  {f.encargos.map((e) => {
                    const est = ESTADO_HOJA[e.estado ?? ""] ?? { texto: e.estado ?? "sin estado", tono: "bg-black/5 text-carbon/60" };
                    const total = e.lineas.reduce((s, l) => s + (l.importe ?? 0), 0);
                    return (
                      <li key={e.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <span className="text-lg font-bold text-carbon">{e.que ?? "sin descripción"}</span>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={"rounded-full px-2.5 py-0.5 text-sm font-bold " + est.tono}>{est.texto}</span>
                            {total > 0 && <span className="text-lg font-bold tabular-nums text-lima-dark">{eur(total)}</span>}
                          </div>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-carbon/55">
                          {e.fecha && <span>creada {fecha(e.fecha)}</span>}
                          {e.versionEnviada && <span>enviada {fecha(e.versionEnviada)}</span>}
                          {e.comercial && <span>comercial: <b className="text-carbon/75">{e.comercial}</b></span>}
                          {e.loTrajo && <span>lo trajo: <b className="text-carbon/75">{e.loTrajo}</b></span>}
                          <span>
                            paga: <b className="text-carbon/75">{e.pagador ?? "sin decir"}</b>
                          </span>
                          <span className={e.firmados > 0 ? "font-semibold text-lima-dark" : "text-carbon/35"}>
                            {e.firmados > 0 ? `${e.firmados} PDF firmado${e.firmados === 1 ? "" : "s"}` : "sin PDF firmado"}
                          </span>
                        </div>
                        {e.lineas.length > 0 && (
                          <ul className="mt-2 flex flex-wrap gap-2">
                            {e.lineas.map((l, i) => (
                              <li key={i} className="rounded-lg border border-black/5 bg-hueso/60 px-2.5 py-1 text-sm text-carbon/75">
                                {l.que}
                                {l.importe !== null && <b className="ml-1.5 tabular-nums text-carbon">{eur(l.importe)}</b>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Seccion>

            {/* ---------------------- 5. datos economicos -------------------------- */}
            <Seccion n={5} titulo="Datos económicos" nota="solo facturación">
              <Fila cols="sm:grid-cols-[1.5fr_1fr]">
                <Dato etiqueta="IBAN de la comunidad" valor={f.iban} />
                <Dato etiqueta="Desde cuándo esta cuenta" valor={null} />
              </Fila>
              <p className="pt-3 text-xs text-carbon/40">
                El IBAN cambia: las comunidades cambian de cuenta. Habrá que guardar desde cuándo vale cada uno.
              </p>
            </Seccion>
          </div>

          {/* ======================= la columna caliente ======================= */}
          <aside className="space-y-4 lg:sticky lg:top-20">
            <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
              <div className="text-sm font-bold uppercase tracking-wider text-carbon/60">Estado</div>
              <ul className="mt-2 space-y-1.5 text-base">
                <li className="flex items-baseline justify-between gap-3">
                  <span className="text-carbon/60">Hojas firmadas</span>
                  <b className={firmadas > 0 ? "text-lima-dark" : "text-carbon/30"}>{firmadas}</b>
                </li>
                <li className="flex items-baseline justify-between gap-3">
                  <span className="text-carbon/60">Tiene proyecto</span>
                  <b className={f.conProyecto ? "text-lima-dark" : "text-carbon/30"}>{f.conProyecto ? "sí" : "no"}</b>
                </li>
              </ul>
              <p className="mt-3 border-t border-black/5 pt-3 text-xs leading-relaxed text-carbon/45">
                Falta el estado de la relación: viva o cerrada. Se calculará de lo contratado —obra sin CFO, subvención
                sin resolución, IEE sin su documento— y se podrá reactivar si vuelven a llamar.
              </p>
            </div>

            {falta.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
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

            <div className="rounded-2xl border border-dashed border-black/15 bg-hueso/40 p-4">
              <div className="text-sm font-bold uppercase tracking-wider text-carbon/45">Notas</div>
              <p className="mt-1.5 text-sm text-carbon/45">Todavía no hay dónde escribirlas.</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
