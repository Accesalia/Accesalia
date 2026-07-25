import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../../../components/BarraSuperior";
import { comunidadPorId, ROLES } from "../../../../../lib/comunidades";
import { crearPersonaComunidad } from "../../../acciones";

export const dynamic = "force-dynamic";

export default async function NuevaPersonaComunidad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await comunidadPorId(id);
  if (!ficha) notFound();

  const crear = crearPersonaComunidad.bind(null, id);
  const clase = "mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-carbon outline-none transition focus:border-lima";

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-xl px-6 py-10">
        <Link href={`/comunidades/${id}`} className="text-sm text-carbon/50 hover:text-carbon">
          ← {ficha.comunidad.nombre}
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-carbon sm:text-3xl">Añadir persona</h1>
        <p className="mt-1 text-carbon/55">Presidente, vecino de contacto, secretario…</p>

        <form action={crear} className="mt-8 space-y-5">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-carbon/45">Nombre *</span>
            <input name="nombre" required className={clase} placeholder="DELFÍN DURÁN VILLANUEVA" />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-carbon/45">Rol</span>
              <select name="rol" defaultValue="presidente" className={clase}>
                {Object.entries(ROLES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-carbon/45">DNI / NIE</span>
              <input name="documento" className={clase} placeholder="51625135W" />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-carbon/45">Teléfono</span>
              <input name="telefono" className={clase} />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-carbon/45">Email</span>
              <input name="email" type="email" className={clase} />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-carbon/45">Notas</span>
            <textarea name="notas" rows={2} className={clase} />
          </label>
          <label className="flex items-center gap-2 text-sm text-carbon/70">
            <input type="checkbox" name="es_contacto_principal" className="h-4 w-4 rounded border-black/20 text-lima focus:ring-lima" />
            Es el contacto principal de la comunidad
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-full bg-lima px-6 py-2.5 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white"
            >
              Añadir persona
            </button>
            <Link href={`/comunidades/${id}`} className="text-sm text-carbon/50 hover:text-carbon">
              Cancelar
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
