import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { comunidadPorId, ROLES } from "../../../lib/comunidades";

export const dynamic = "force-dynamic";

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-carbon/40">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm text-carbon">{valor || <span className="text-carbon/30">—</span>}</dd>
    </div>
  );
}

function Tarjeta({ titulo, accion, children }: { titulo: string; accion?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-lima-dark">{titulo}</h2>
        {accion}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function FichaComunidad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await comunidadPorId(id);
  if (!ficha) notFound();

  const { comunidad: c, administracion, personas, numHojas } = ficha;
  const dir2 = [c.cp, c.municipio].filter(Boolean).join(" ");
  const subtitulo = [c.direccion, dir2, c.provincia].filter(Boolean).join(" · ");

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1000px] px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/comunidades" className="text-sm text-carbon/50 hover:text-carbon">
            ← Datos administrativos
          </Link>
          <Link
            href={`/comunidades/${c.id}/editar`}
            className="rounded-full bg-lima px-4 py-1.5 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white"
          >
            Editar
          </Link>
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-lima-dark">Datos administrativos</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-carbon sm:text-3xl">{c.nombre}</h1>
          {!c.activa && (
            <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold uppercase text-carbon/40">Inactiva</span>
          )}
        </div>
        {subtitulo && <p className="mt-1 text-carbon/60">{subtitulo}</p>}

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Tarjeta titulo="Identidad">
              <dl className="grid grid-cols-2 gap-4">
                <Dato etiqueta="CIF" valor={c.cif_comunidad} />
                <Dato etiqueta="Ref. catastral" valor={c.referencia_catastral} />
                <Dato etiqueta="Año construcción" valor={c.anio_construccion} />
                <Dato etiqueta="Nº viviendas" valor={c.num_viviendas} />
                <Dato etiqueta="IBAN" valor={c.iban} />
              </dl>
            </Tarjeta>

            <Tarjeta titulo="Dirección">
              <dl className="grid grid-cols-2 gap-4">
                <Dato etiqueta="Dirección" valor={c.direccion} />
                <Dato etiqueta="Código postal" valor={c.cp} />
                <Dato etiqueta="Municipio" valor={c.municipio} />
                <Dato etiqueta="Provincia" valor={c.provincia} />
              </dl>
            </Tarjeta>

            <Tarjeta
              titulo={`Personas (${personas.length})`}
              accion={
                <Link href={`/comunidades/${c.id}/persona/nueva`} className="text-xs font-medium text-lima-dark hover:underline">
                  + Añadir persona
                </Link>
              }
            >
              {personas.length === 0 ? (
                <p className="text-sm text-carbon/40">Sin personas registradas (presidente, vecino de contacto…).</p>
              ) : (
                <ul className="divide-y divide-black/5">
                  {personas.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm text-carbon">
                          {p.nombre}
                          <span className="ml-2 rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-carbon/50">
                            {ROLES[p.rol]}
                          </span>
                          {p.es_contacto_principal && (
                            <span className="ml-1.5 rounded-full bg-lima-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-lima-dark">
                              Contacto
                            </span>
                          )}
                        </p>
                        {p.documento && <p className="text-xs text-carbon/45">DNI {p.documento}</p>}
                      </div>
                      <span className="shrink-0 text-xs text-carbon/50">{p.telefono ?? p.email ?? ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>
          </div>

          <div className="space-y-6">
            <Tarjeta titulo="Administración de fincas">
              {administracion ? (
                <div className="space-y-3">
                  <Link href={`/administraciones/${administracion.id}`} className="text-sm font-medium text-carbon hover:text-lima-dark">
                    {administracion.nombre}
                  </Link>
                  <dl className="space-y-3">
                    <Dato etiqueta="Teléfono" valor={administracion.telefono} />
                    <Dato etiqueta="Email" valor={administracion.email} />
                  </dl>
                </div>
              ) : (
                <p className="text-sm text-carbon/40">Sin administración asignada (contacto directo con la comunidad).</p>
              )}
            </Tarjeta>

            {/* Puerta al aglutinador: el tablero 360 de todas las areas. */}
            <Link
              href={`/expediente/${c.id}`}
              className="block rounded-2xl bg-carbon p-5 text-white shadow-sm transition hover:bg-carbon/90"
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-lima">
                <span className="text-lg">◉</span> Expediente virtual
              </div>
              <p className="mt-2 text-sm text-white/80">
                Ver el tablero 360 de esta comunidad: datos, comercial, obra, subvenciones… todas las áreas de un vistazo.
              </p>
              <span className="mt-3 inline-block text-sm font-semibold text-lima">Abrir expediente →</span>
            </Link>

            <Tarjeta titulo="Hojas de encargo">
              <div className="flex items-center justify-between">
                <span className="text-sm text-carbon/60">
                  {numHojas > 0 ? `${numHojas} hoja(s)` : "Sin hojas todavía"}
                </span>
                <Link
                  href={`/comunidades/${c.id}/hojas`}
                  className="text-xs font-medium text-lima-dark hover:underline"
                >
                  Ver / crear →
                </Link>
              </div>
            </Tarjeta>
          </div>
        </div>
      </main>
    </div>
  );
}
