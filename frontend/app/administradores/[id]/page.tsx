import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import {
  administradorPorId,
  resumenAdmin,
  interaccionesDeAdministrador,
  ORIGEN_LABEL,
  TIPO_EVENTO_LABEL,
} from "../../../lib/comercial";

export const dynamic = "force-dynamic";

function fechaCorta(v: string | null): string {
  if (!v) return "";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-carbon/40">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm text-carbon">{valor || <span className="text-carbon/30">—</span>}</dd>
    </div>
  );
}

export default async function FichaPersona({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await administradorPorId(id);
  if (!res) notFound();
  const { admin, administracion } = res;
  const [resumen, diario] = await Promise.all([resumenAdmin(id), interaccionesDeAdministrador(id, 20)]);

  const volver = administracion ? `/administraciones/${administracion.id}` : "/administraciones";

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[800px] px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={volver} className="text-sm text-carbon/50 hover:text-carbon">
            ← {administracion ? administracion.nombre : "Cartera"}
          </Link>
          <Link
            href={`/administradores/${admin.id}/editar`}
            className="rounded-full bg-lima px-4 py-1.5 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white"
          >
            Editar
          </Link>
        </div>

        <div className="mt-6">
          <h1 className="text-2xl font-bold text-carbon sm:text-3xl">{admin.nombre}</h1>
          <p className="mt-1 text-carbon/60">
            {admin.cargo && <span>{admin.cargo}</span>}
            {admin.cargo && administracion && <span> · </span>}
            {administracion && (
              <Link href={`/administraciones/${administracion.id}`} className="hover:text-lima-dark">
                {administracion.nombre}
              </Link>
            )}
          </p>
        </div>

        {/* Sali: cómo va la relación con esta persona (resumen vivo) */}
        <section className="mt-6 rounded-2xl border border-lima/30 bg-lima-soft/30 p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-lima-dark/80">
            Sali · cómo vas con {admin.nombre.split(" ")[0]}
          </div>
          {resumen ? (
            <>
              <p className="mt-1.5 text-[15px] leading-relaxed text-carbon/85">{resumen.texto}</p>
              <p className="mt-2 text-[11px] text-carbon/40">Al día a {fechaCorta(resumen.actualizado_en.slice(0, 10))}</p>
            </>
          ) : (
            <p className="mt-1.5 text-sm text-carbon/50">
              Aún no hay resumen. Sali lo escribirá en cuanto registres un contacto con esta persona.
            </p>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <dl className="grid grid-cols-2 gap-4">
            <Dato etiqueta="Teléfono" valor={admin.telefono} />
            <Dato etiqueta="Email" valor={admin.email} />
          </dl>
          {admin.notas && (
            <div className="mt-4 border-t border-black/5 pt-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-carbon/40">Notas</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-carbon/70">{admin.notas}</dd>
            </div>
          )}
        </section>

        {/* Diario: las interacciones con esta persona */}
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-carbon/35">Diario ({diario.length})</h2>
            <Link href="/comercial/contacto" className="text-xs font-semibold text-lima-dark hover:underline">+ Grabar contacto</Link>
          </div>
          <div className="mt-3 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
            {diario.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-carbon/40">Aún no hay contactos con esta persona.</p>
            ) : (
              <ul className="divide-y divide-black/5">
                {diario.map((i) => (
                  <li key={i.id} className="transition hover:bg-black/[0.015]">
                    <Link href={`/comercial/interaccion/${i.id}`} className="block px-5 py-3">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-carbon/50">
                        <span className="font-semibold text-carbon/70">{fechaCorta(i.fecha_evento) || fechaCorta(i.creado_en.slice(0, 10))}</span>
                        <span className="rounded-full bg-black/5 px-2 py-0.5 font-semibold">{TIPO_EVENTO_LABEL[i.tipo_evento] ?? i.tipo_evento}</span>
                        <span>{ORIGEN_LABEL[i.origen] ?? i.origen}</span>
                        {i.requiere_humano && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">revisar</span>}
                      </div>
                      {i.transcripcion && <p className="mt-1 line-clamp-2 text-sm text-carbon/75">{i.transcripcion}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
