import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { administradorPorId, nombreComercial } from "../../../lib/comercial";
import { cambiarActivoAdministrador } from "../acciones";

export const dynamic = "force-dynamic";

function fecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-carbon/40">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm text-carbon">{valor || <span className="text-carbon/30">—</span>}</dd>
    </div>
  );
}

function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-lima-dark">{titulo}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function FichaAdministrador({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ficha = await administradorPorId(id);
  if (!ficha) notFound();

  const { admin, administracion, companeros, comunidades, oportunidades } = ficha;
  const toggleActivo = cambiarActivoAdministrador.bind(null, admin.id, !admin.activo);

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1000px] px-6 py-10">
        {/* Migas + acciones */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/administradores" className="text-sm text-carbon/50 hover:text-carbon">
            ← Cartera de administradores
          </Link>
          <div className="flex items-center gap-2">
            <form action={toggleActivo}>
              <button
                type="submit"
                className="rounded-full border border-black/10 px-4 py-1.5 text-sm font-medium text-carbon/70 transition hover:bg-black/5"
              >
                {admin.activo ? "Dar de baja" : "Reactivar"}
              </button>
            </form>
            <Link
              href={`/administradores/${admin.id}/editar`}
              className="rounded-full bg-lima px-4 py-1.5 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white"
            >
              Editar
            </Link>
          </div>
        </div>

        {/* Cabecera */}
        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-carbon sm:text-3xl">{admin.nombre}</h1>
            <p className="mt-1 text-carbon/60">
              {admin.cargo && <span>{admin.cargo}</span>}
              {admin.cargo && (administracion || admin.empresa) && <span> · </span>}
              {administracion ? (
                <span>{administracion.nombre}</span>
              ) : admin.empresa ? (
                <span>{admin.empresa}</span>
              ) : (
                <span className="text-carbon/40">Administrador autónomo</span>
              )}
            </p>
          </div>
          {!admin.activo && (
            <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold uppercase text-carbon/40">
              De baja
            </span>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Columna principal */}
          <div className="space-y-6 lg:col-span-2">
            <Tarjeta titulo="Contacto">
              <dl className="grid grid-cols-2 gap-4">
                <Dato etiqueta="Teléfono" valor={admin.telefono} />
                <Dato etiqueta="Email" valor={admin.email} />
              </dl>
            </Tarjeta>

            {administracion && (
              <Tarjeta titulo="Administración de fincas">
                <dl className="grid grid-cols-2 gap-4">
                  <Dato etiqueta="Nombre" valor={administracion.nombre} />
                  <Dato etiqueta="CIF" valor={administracion.cif} />
                  <Dato etiqueta="Teléfono" valor={administracion.telefono} />
                  <Dato etiqueta="Email" valor={administracion.email} />
                  <Dato etiqueta="Municipio" valor={administracion.municipio} />
                  <Dato etiqueta="Dirección" valor={administracion.direccion} />
                </dl>
                {companeros.length > 0 && (
                  <div className="mt-5 border-t border-black/5 pt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-carbon/40">
                      Otras personas de esta administración
                    </p>
                    <ul className="mt-2 space-y-1">
                      {companeros.map((c) => (
                        <li key={c.id}>
                          <Link
                            href={`/administradores/${c.id}`}
                            className="text-sm text-carbon hover:text-lima-dark"
                          >
                            {c.nombre}
                            {c.cargo && <span className="text-carbon/45"> · {c.cargo}</span>}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Tarjeta>
            )}

            <Tarjeta titulo={`Comunidades (${comunidades.length})`}>
              {comunidades.length === 0 ? (
                <p className="text-sm text-carbon/40">
                  Todavía no hay comunidades asociadas a este administrador.
                </p>
              ) : (
                <ul className="divide-y divide-black/5">
                  {comunidades.map((c) => (
                    <li key={c.id} className="py-2 text-sm">
                      <span className="text-carbon">{c.nombre}</span>
                      {c.municipio && <span className="text-carbon/45"> · {c.municipio}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>

            <Tarjeta titulo={`Oportunidades (${oportunidades.length})`}>
              {oportunidades.length === 0 ? (
                <p className="text-sm text-carbon/40">Sin oportunidades comerciales registradas.</p>
              ) : (
                <ul className="divide-y divide-black/5">
                  {oportunidades.map((o) => (
                    <li key={o.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-carbon">
                        {o.comunidad_provisional ?? "Comunidad sin materializar"}
                      </span>
                      <span className="rounded-full bg-lima-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-lima-dark">
                        {o.estado}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>
          </div>

          {/* Columna lateral: cartera + fechas (enchufes de IA) */}
          <div className="space-y-6">
            <Tarjeta titulo="Cartera">
              <dl className="space-y-4">
                <Dato etiqueta="Comercial dueño" valor={nombreComercial(admin.comercial)} />
                <Dato
                  etiqueta="Comisión por defecto"
                  valor={
                    admin.comision_por_defecto != null
                      ? `${admin.comision_por_defecto} €`
                      : null
                  }
                />
                <Dato etiqueta="Alta en cartera" valor={fecha(admin.fecha_alta_administrador)} />
              </dl>
            </Tarjeta>

            <Tarjeta titulo="Seguimiento">
              <dl className="space-y-4">
                <Dato etiqueta="Último contacto" valor={fecha(admin.fecha_ultimo_contacto)} />
                <Dato etiqueta="Último encargo" valor={fecha(admin.fecha_ultimo_encargo)} />
              </dl>
            </Tarjeta>
          </div>
        </div>
      </main>
    </div>
  );
}
