import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { administracionPorId, nombreComercial, ESTADOS } from "../../../lib/comercial";

export const dynamic = "force-dynamic";

const PROPOSITOS: Record<string, string> = {
  facturacion: "Facturación",
  obra: "Obra",
  documentacion: "Documentación",
  general: "General",
  comercial: "Comercial",
};

function fecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

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

export default async function FichaAdministracion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await administracionPorId(id);
  if (!ficha) notFound();

  const { administracion: a, comercial, titular, personas, contactos, origen } = ficha;
  const est = ESTADOS[a.estado];

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1000px] px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/administraciones" className="text-sm text-carbon/50 hover:text-carbon">
            ← Cartera de administraciones
          </Link>
          <Link
            href={`/administraciones/${a.id}/editar`}
            className="rounded-full bg-lima px-4 py-1.5 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white"
          >
            Editar
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-carbon sm:text-3xl">{a.nombre}</h1>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${est.clase}`}>{est.label}</span>
        </div>
        {a.municipio && <p className="mt-1 text-carbon/60">{a.municipio}</p>}

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Tarjeta titulo="Datos">
              <dl className="grid grid-cols-2 gap-4">
                <Dato etiqueta="Teléfono" valor={a.telefono} />
                <Dato etiqueta="Email" valor={a.email} />
                <Dato etiqueta="CIF" valor={a.cif} />
                <Dato etiqueta="Dirección" valor={a.direccion} />
              </dl>
            </Tarjeta>

            <Tarjeta
              titulo={`Personas (${personas.length})`}
              accion={
                <Link href={`/administraciones/${a.id}/persona/nueva`} className="text-xs font-medium text-lima-dark hover:underline">
                  + Añadir persona
                </Link>
              }
            >
              {personas.length === 0 ? (
                <p className="text-sm text-carbon/40">Sin personas registradas (contacto directo con la administración).</p>
              ) : (
                <ul className="divide-y divide-black/5">
                  {personas.map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-2">
                      <Link href={`/administradores/${p.id}`} className="min-w-0 text-sm text-carbon hover:text-lima-dark">
                        {p.nombre}
                        {p.cargo && <span className="text-carbon/45"> · {p.cargo}</span>}
                        {titular?.id === p.id && (
                          <span className="ml-2 rounded-full bg-lima-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-lima-dark">
                            Titular
                          </span>
                        )}
                      </Link>
                      <span className="text-xs text-carbon/50">{p.telefono ?? p.email ?? ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>

            <Tarjeta titulo={`Contactos por asunto (${contactos.length})`}>
              {contactos.length === 0 ? (
                <p className="text-sm text-carbon/40">Sin contactos por asunto. Útil en administraciones grandes.</p>
              ) : (
                <ul className="divide-y divide-black/5">
                  {contactos.map((c) => (
                    <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-carbon">
                        <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-carbon/50">
                          {PROPOSITOS[c.proposito] ?? c.proposito}
                        </span>{" "}
                        {c.nombre}
                      </span>
                      <span className="text-xs text-carbon/50">{c.telefono ?? c.email ?? ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>

            {origen.length > 0 && (
              <Tarjeta titulo="Origen">
                <ul className="space-y-2">
                  {origen.map((o) => (
                    <li key={o.id} className="text-sm">
                      <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-carbon/50">
                        {o.tipo_origen}
                      </span>
                      {o.condiciona_oferta && (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                          Condiciona oferta
                        </span>
                      )}
                      {o.notas && <p className="mt-0.5 text-carbon/60">{o.notas}</p>}
                    </li>
                  ))}
                </ul>
              </Tarjeta>
            )}
          </div>

          <div className="space-y-6">
            <Tarjeta titulo="Cartera">
              <dl className="space-y-4">
                <Dato etiqueta="Comercial dueño" valor={nombreComercial(comercial)} />
                <Dato etiqueta="Titular" valor={titular?.nombre} />
                <Dato etiqueta="Alta en cartera" valor={fecha(a.fecha_alta_cartera)} />
              </dl>
            </Tarjeta>

            <Tarjeta titulo="Seguimiento">
              <dl className="space-y-4">
                <Dato etiqueta="Último contacto" valor={fecha(a.fecha_ultimo_contacto)} />
                <Dato etiqueta="Último encargo" valor={fecha(a.fecha_ultimo_encargo)} />
                {(a.estado === "cliente_descontento" || a.estado === "cliente_baneado") && (
                  <>
                    <Dato etiqueta="Motivo de baja" valor={a.motivo_fin} />
                    <Dato etiqueta="Fecha de baja" valor={fecha(a.fecha_fin)} />
                  </>
                )}
              </dl>
            </Tarjeta>

            {a.notas && (
              <Tarjeta titulo="Notas">
                <p className="whitespace-pre-wrap text-sm text-carbon/70">{a.notas}</p>
              </Tarjeta>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
