import Link from "next/link";
import { redirect } from "next/navigation";
import { comunidadesDeCorreo, datosComunidad, esDireccion, quienEstaEnElPortal, todasLasComunidades } from "../../../../lib/portal";
import { documentacionDe, type Caja, type Estado } from "../../../../lib/portalDocumentacion";
import { BuscadorComunidad } from "../../BuscadorComunidad";
import { MarcoPortal } from "../../Marco";
import { Adjuntar } from "./Adjuntar";

export const dynamic = "force-dynamic";

// LA PAGINA DE UNA COMUNIDAD EN EL PORTAL (Monica, 21-oct-2026), calcada del
// area de hipotecas del Sabadell (maqueta docs/figma/portal-comunidad.html).
// Dos pestañas, y las que vengan: SUBIR DOCUMENTACION (una ventanita por papel,
// la comunidad y cada expediente) y MI EXPEDIENTE («que la comunidad deje de
// llamarnos para preguntar que hay de lo mio»; de momento, lo contratado).
//
// Todos los autorizados de la comunidad ven el ESTADO de cada papel; nadie de
// fuera de Accesalia puede abrirlo ni descargarlo: aqui no hay ningun enlace a
// un fichero.

const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });
const CORTA = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Madrid" });
const EUR = new Intl.NumberFormat("es-ES", { useGrouping: "always", maximumFractionDigits: 2 });
const dia = (iso: string | null) => (iso ? FECHA.format(new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)) : null);

const ACENTO = "text-[#3f7a1c]";

/* ---------------------------------------------------------------- el estado */

const ICONO: Record<Estado, { texto: string; color: string; svg: React.ReactNode }> = {
  pendiente: {
    texto: "pendiente",
    color: "text-[#6f6f6f]",
    svg: <circle cx="22" cy="22" r="19" fill="none" stroke="#9a9a9a" strokeWidth="2.5" />,
  },
  revision: {
    texto: "recibido · en revisión",
    color: "text-[#a16207]",
    svg: (
      <>
        <path d="M22 5L40 37H4z" fill="#fde68a" stroke="#d97706" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M22 16v10" stroke="#92400e" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="22" cy="31.5" r="1.9" fill="#92400e" />
      </>
    ),
  },
  ok: {
    texto: "revisado · todo ok",
    color: "text-[#3a9a4a]",
    svg: (
      <>
        <circle cx="22" cy="22" r="19" fill="none" stroke="#3a9a4a" strokeWidth="2.5" />
        <path d="M12.5 22.5l6.5 7 13-15" fill="none" stroke="#3a9a4a" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  rechazado: {
    texto: "revisado · rechazado",
    color: "text-[#c8102e]",
    svg: (
      <>
        <circle cx="22" cy="22" r="19" fill="none" stroke="#c8102e" strokeWidth="2.5" />
        <path d="M15 15l14 14M29 15L15 29" stroke="#c8102e" strokeWidth="3.2" strokeLinecap="round" />
      </>
    ),
  },
};

function Simbolo({ estado }: { estado: Estado }) {
  const i = ICONO[estado];
  return (
    <span className="flex w-[76px] flex-none flex-col items-center gap-0.5 text-center">
      <svg viewBox="0 0 44 44" className="h-[34px] w-[34px]" aria-hidden>
        {i.svg}
      </svg>
      <span className={"text-[10.5px] font-semibold leading-tight " + i.color}>{i.texto}</span>
    </span>
  );
}

/* ------------------------------------------------------------- la ventanita */

function Ventanita({ c, comunidadId }: { c: Caja; comunidadId: string }) {
  return (
    <div className="flex min-h-[170px] flex-col bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,.14)]">
      <Adjuntar comunidadId={comunidadId} clave={c.clave} hojaId={c.hojaId} oportunidadId={c.oportunidadId} estado={<Simbolo estado={c.estado} />}>
        <h3 className="text-[22px] font-extrabold leading-tight text-[#111]">{c.titulo}</h3>
        {c.explicacion && <p className="mt-1.5 text-[12.5px] text-[#6f6f6f]">{c.explicacion}</p>}
        {c.fichero && (
          <p className="mt-3 truncate text-[12.5px] text-[#555]" title={c.fichero}>
            {c.fichero}
          </p>
        )}
        {c.estado === "revision" && c.cuando && (
          <p className="mt-1 text-[11.5px] font-semibold text-[#b45309]">
            subido por {c.quien} el {CORTA.format(new Date(c.cuando))} · lo estamos revisando
          </p>
        )}
        {c.estado === "ok" && c.cuando && (
          <p className="mt-1 text-[11.5px] font-semibold text-[#3a9a4a]">
            subido por {c.quien} el {CORTA.format(new Date(c.cuando))}
          </p>
        )}
        {c.estado === "rechazado" && (
          <p className="mt-2.5 border-l-[3px] border-[#c8102e] bg-[#fdf1f2] px-2 py-1.5 text-[12px] leading-snug text-[#7a1020]">
            {c.motivo || "No era el documento que necesitamos."} Súbelo otra vez, por favor.
          </p>
        )}
      </Adjuntar>
    </div>
  );
}

function Otros({ comunidadId, oportunidadId = null }: { comunidadId: string; oportunidadId?: string | null }) {
  return (
    <div className="flex min-h-[170px] flex-col border border-[#c8102e] bg-white p-4">
      <Adjuntar comunidadId={comunidadId} clave="otro" oportunidadId={oportunidadId}>
        <h3 className="text-[22px] font-extrabold leading-tight text-[#111]">Otros documentos</h3>
        <p className="mt-1.5 text-[12.5px] text-[#6f6f6f]">lo que no esté en ninguna otra</p>
      </Adjuntar>
    </div>
  );
}

/* ------------------------------------------------------------------ página */

export default async function ComunidadEnElPortal({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ zona?: string; p?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const email = await quienEstaEnElPortal();
  if (!email) redirect("/portal");
  const [coms, direccion] = await Promise.all([comunidadesDeCorreo(email), esDireccion(email)]);
  // Direccion entra en todas, sin aparecer en ninguna lista (12-oct-2026).
  const c = coms.find((x) => x.id === id) ?? (direccion ? await datosComunidad(id) : null);
  if (!c) redirect("/portal");
  const [todas, doc] = await Promise.all([direccion ? todasLasComunidades() : Promise.resolve([]), documentacionDe(id)]);
  if (!doc) redirect("/portal");

  const f = doc.ficha;
  const zona = sp.zona === "expediente" ? "expediente" : "documentacion";
  const exp = doc.expedientes.find((e) => e.id === sp.p) ?? null;
  const url = (q: Record<string, string | null>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) if (v) u.set(k, v);
    const s = u.toString();
    return `/portal/c/${id}${s ? `?${s}` : ""}`;
  };
  const presi = f.presidentes[0] ?? null;
  const gestores = f.administraciones.flatMap((a) => a.gestores.map((g) => g.nombre)).filter(Boolean);
  const cat = f.catastro[0] ?? null;
  const faltan = [...doc.comunidad, ...doc.expedientes.flatMap((e) => e.cajas.map((x) => ({ ...x, titulo: `${x.titulo} · ${e.nombre}` })))];

  return (
    <MarcoPortal email={email} ancho>
      {direccion && <BuscadorComunidad opciones={todas} />}
      {/* Varias comunidades (un administrador): una pestaña por comunidad. */}
      {coms.length > 1 && (
        <nav className="mb-4 flex flex-wrap gap-1.5">
          {coms.map((x) => (
            <Link
              key={x.id}
              href={`/portal/c/${x.id}`}
              className={"rounded-full border px-3 py-1 text-[13px] " + (x.id === id ? "border-white bg-white font-semibold text-[#12305a]" : "border-white/40 text-white/85 hover:border-white")}
            >
              {x.nombre}
            </Link>
          ))}
        </nav>
      )}

      <h1 className="text-[19px] font-bold text-[#f3efe4]">
        {f.nombre}
        {f.municipio && <span className="font-normal text-[#f3efe4]/75"> · {f.municipio}</span>}
      </h1>

      <div className="mt-4 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        {/* ======================= el marco grande ======================= */}
        <section className="min-w-0 bg-[#fdf6dc] px-4 pb-7 sm:px-6">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-2 border-b border-black/10 pt-3">
            {(
              [
                ["documentacion", "Subir documentación"],
                ["expediente", "Mi expediente"],
              ] as const
            ).map(([z, t]) => (
              <Link
                key={z}
                href={url({ zona: z === "expediente" ? "expediente" : null })}
                className={"-mb-px border-b-[3px] px-1 pb-2.5 text-[15px] font-bold " + (zona === z ? "border-[#3f7a1c] text-[#111]" : "border-transparent text-[#6f6f6f] hover:text-[#111]")}
              >
                {t}
              </Link>
            ))}
            {zona === "documentacion" && (
              <span className="mb-2.5 ml-auto text-[12.5px] font-semibold text-[#111]">
                {doc.pendientes === 0 ? "nada pendiente" : `${doc.pendientes} ${doc.pendientes === 1 ? "documento pendiente" : "documentos pendientes"}`}
              </span>
            )}
          </div>

          {zona === "documentacion" ? (
            <>
              {/* la comunidad y cada expediente */}
              <div className="mt-5 flex flex-wrap gap-1.5 border-b border-black/10">
                <Link href={url({})} className={"-mb-px border-b-[3px] px-4 pb-2 pt-1 " + (!exp ? "border-[#3f7a1c]" : "border-transparent")}>
                  <span className={"block text-[16.5px] font-bold " + ACENTO}>La comunidad</span>
                  <span className="block text-[11.5px] text-[#6f6f6f]">papeles de siempre</span>
                </Link>
                {doc.expedientes.map((e) => (
                  <Link key={e.id} href={url({ p: e.id })} className={"-mb-px border-b-[3px] px-4 pb-2 pt-1 " + (exp?.id === e.id ? "border-[#3f7a1c]" : "border-transparent")}>
                    <span className={"block text-[16.5px] font-bold " + ACENTO}>{e.nombre}</span>
                    <span className="block text-[11.5px] text-[#6f6f6f]">{e.codigo}</span>
                  </Link>
                ))}
              </div>

              <p className="mb-3.5 mt-6 text-[15px] text-[#1b1b1b]">
                Documentación solicitada para <b>{exp ? exp.nombre.toUpperCase() : f.nombre.toUpperCase()}</b>
                {exp && <>. Lo de la comunidad (CIF, DNI y acta del presidente) vale para todos sus expedientes: no hace falta subirlo otra vez.</>}
              </p>
              <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
                {(exp ? exp.cajas : doc.comunidad).map((x) => (
                  <Ventanita key={`${x.clave}-${x.hojaId ?? ""}`} c={x} comunidadId={id} />
                ))}
                <Otros comunidadId={id} oportunidadId={exp?.id ?? null} />
              </div>
            </>
          ) : (
            /* ---------------- mi expediente: de momento, lo contratado ---------------- */
            <div className="mt-6 space-y-5">
              {doc.expedientes.length === 0 && <p className="text-[15px] text-[#1b1b1b]">Ahora mismo no hay ningún expediente en marcha.</p>}
              {doc.expedientes.map((e) => (
                <div key={e.id}>
                  <h2 className={"text-[18px] font-bold " + ACENTO}>
                    {e.nombre} <span className="text-[12px] font-normal text-[#6f6f6f]">{e.codigo}</span>
                  </h2>
                  <div className="mt-2.5 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,.14)]">
                    <h3 className="text-[20px] font-extrabold text-[#111]">Lo que habéis contratado</h3>
                    {e.contratado.length === 0 ? (
                      <p className="mt-2 text-[14px] text-[#6f6f6f]">Todavía no hay ninguna hoja de encargo firmada.</p>
                    ) : (
                      <div className="mt-3 space-y-4">
                        {e.contratado.map((h) => (
                          <div key={h.hojaId} className="border-t border-black/10 pt-3 first:border-0 first:pt-0">
                            <div className="text-[14.5px] text-[#1b1b1b]">
                              <b>Hoja de encargo {h.numero}</b>
                              {h.firma && <span className="text-[#6f6f6f]"> · firmada el {dia(h.firma)}</span>}
                            </div>
                            <table className="mt-1.5 w-auto text-[14px]">
                              <tbody>
                                {h.lineas.map((l, i) => (
                                  <tr key={i} className="align-baseline">
                                    <td className="max-w-[34rem] py-0.5 pr-6 text-[#1b1b1b]">{l.que}</td>
                                    <td className="whitespace-nowrap py-0.5 text-right tabular-nums text-[#1b1b1b]">{l.importe !== null ? `${EUR.format(l.importe)} €` : ""}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <p className="text-[13px] text-[#6f6f6f]">
                Aquí iréis viendo cómo avanza cada expediente: el proyecto, el visado, la licencia, los requerimientos y sus respuestas, las actas de obra…
              </p>
            </div>
          )}
        </section>

        {/* ======================= la derecha ======================= */}
        <aside className="space-y-6">
          <section className="bg-[#fdf6dc] p-6">
            <div className="flex items-center gap-8 border-b-[1.5px] border-[#3f7a1c] pb-4">
              <span className="flex h-[60px] w-[60px] flex-none items-center justify-center rounded-full bg-[#bdbdbd] text-[26px] text-white" aria-hidden>
                ⌂
              </span>
              <span>
                <b className={"block text-[17px] " + ACENTO}>Tu comunidad</b>
                <span className="text-[12.5px] text-[#1b1b1b]">
                  {[f.cif && `CIF ${f.cif}`, cat?.viviendas != null && `${cat.viviendas} viviendas`, cat?.anio].filter(Boolean).join(" · ")}
                </span>
              </span>
            </div>
            <dl className="mt-3 text-[14px] leading-relaxed text-[#1b1b1b]">
              <dt className="mt-2.5 text-[11px] font-bold uppercase tracking-wide text-[#6f6f6f]">Administración</dt>
              <dd>{f.administraciones.length ? [f.administraciones.map((a) => a.empresa).join(", "), gestores.join(" y ")].filter(Boolean).join(" · ") : "—"}</dd>
              <dt className="mt-2.5 text-[11px] font-bold uppercase tracking-wide text-[#6f6f6f]">Presidente</dt>
              <dd className={presi ? "" : "text-[#b45309]"}>{presi ? presi.nombre : "sin apuntar: súbenos el acta de nombramiento"}</dd>
              {f.accesos.length > 0 && (
                <>
                  <dt className="mt-2.5 text-[11px] font-bold uppercase tracking-wide text-[#6f6f6f]">Accesos</dt>
                  <dd>{[...new Set(f.accesos.map((a) => a.texto))].join(" · ")}</dd>
                </>
              )}
            </dl>
          </section>

          <section className="bg-[#fdf6dc] p-6">
            <h2 className={"mb-3 text-[17px] font-bold " + ACENTO}>Lo que falta</h2>
            <ul className="space-y-1">
              {faltan.map((x) => (
                <li key={`${x.clave}-${x.hojaId ?? ""}-${x.oportunidadId ?? ""}`} className="flex items-baseline gap-3 text-[15px] font-semibold text-[#1b1b1b]">
                  <span className={"w-3 text-[12px] " + (x.estado === "ok" ? "text-[#3a9a4a]" : x.estado === "revision" ? "text-[#b45309]" : "text-[#c8102e]")}>
                    {x.estado === "ok" ? "✓" : x.estado === "revision" ? "▲" : "●"}
                  </span>
                  {x.titulo}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </MarcoPortal>
  );
}
