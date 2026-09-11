import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../../../../components/BarraSuperior";
import { viabilidadPorId, arquitectos } from "../../../../../../lib/viabilidad";
import { bloquesActivos } from "../../../../../../lib/hojas";
import { SelectorConceptos } from "../../../hojas/SelectorConceptos";
import { guardarViabilidad } from "../../acciones";
import { Guardando } from "../../../../../components/Guardando";

export const dynamic = "force-dynamic";

const campo = "mt-1 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-carbon outline-none transition focus:border-lima";
const lab = "text-xs font-medium uppercase tracking-wide text-carbon/45";

export default async function FormViabilidad({
  params,
}: {
  params: Promise<{ id: string; viabId: string }>;
}) {
  const { id, viabId } = await params;
  const [data, arqs, bloques] = await Promise.all([
    viabilidadPorId(viabId),
    arquitectos(),
    bloquesActivos(),
  ]);
  if (!data) notFound();
  const { viab, comunidadNombre } = data;
  const guardar = guardarViabilidad.bind(null, viabId, id);

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Link href={`/comunidades/${id}/comercial`} className="text-sm text-carbon/50 hover:text-carbon">
          ← Volver al cockpit
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-carbon sm:text-3xl">Informe de viabilidad</h1>
        <p className="mt-1 text-carbon/55">{comunidadNombre} · borrador v{viab.version}</p>

        <form action={guardar} className="mt-6 space-y-6">
          <Guardando />
          {/* Cabecera */}
          <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-lima-dark">Cabecera</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={lab}>Arquitecto firmante</span>
                <select name="arquitecto_id" defaultValue={viab.arquitecto_id ?? ""} className={campo}>
                  <option value="">— elegir —</option>
                  {arqs.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}{a.numero_colegiado ? ` (${a.numero_colegiado})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={lab}>Fecha de visita</span>
                <input type="date" name="fecha_visita" defaultValue={viab.fecha_visita ?? ""} className={campo} />
              </label>
            </div>
          </section>

          {/* Cuerpo */}
          <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-lima-dark">Texto del informe</h2>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className={lab}>Objeto del proyecto</span>
                <textarea name="objeto" rows={3} defaultValue={viab.objeto ?? ""} className={campo} placeholder="Instalación de torre de ascensor en corrala…" />
              </label>
              <label className="block">
                <span className={lab}>Descripción de las intervenciones</span>
                <textarea name="descripcion_intervenciones" rows={5} defaultValue={viab.descripcion_intervenciones ?? ""} className={campo} />
              </label>
              <label className="block">
                <span className={lab}>Conclusión</span>
                <textarea name="conclusion" rows={2} defaultValue={viab.conclusion ?? ""} className={campo} placeholder="La actuación es viable y permitirá…" />
              </label>
              <label className="block sm:w-48">
                <span className={lab}>Resultado</span>
                <select name="viable" defaultValue={viab.viable == null ? "" : viab.viable ? "si" : "no"} className={campo}>
                  <option value="">— sin decidir —</option>
                  <option value="si">Viable</option>
                  <option value="no">Inviable</option>
                </select>
              </label>
            </div>
          </section>

          {/* Coste de obra (estimativo, suelto) */}
          <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-lima-dark">Coste de obra (estimativo)</h2>
            <p className="mt-1 text-xs text-carbon/45">Orientación para la comunidad. No es el PEM ni alimenta fases posteriores.</p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:w-96">
              <label className="block">
                <span className={lab}>Importe (€)</span>
                <input type="number" step="0.01" name="coste_obra_base" defaultValue={viab.coste_obra_base ?? ""} className={campo} placeholder="150000" />
              </label>
              <label className="block">
                <span className={lab}>IVA %</span>
                <input type="number" step="0.01" name="coste_obra_iva_porcentaje" defaultValue={viab.coste_obra_iva_porcentaje ?? "10"} className={campo} />
              </label>
            </div>
          </section>

          {/* Tabla de precios: conceptos del catalogo (Arquitecto=Proyecto+DF, CSS, Subvención…) */}
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-lima-dark">Honorarios (tabla de precios)</h2>
              <span className="text-xs text-carbon/40">marca los que aplican y pon su importe</span>
            </div>
            <SelectorConceptos
              bloques={bloques}
              iniciales={viab.conceptos.map((c) => ({ bloque_id: c.bloque_id, importe: c.importe }))}
              ivaInicial={String(viab.conceptos.find((c) => c.iva_porcentaje != null)?.iva_porcentaje ?? 21)}
            />
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button className="rounded-full bg-lima px-6 py-2.5 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white">
              Guardar
            </button>
            <Link href={`/comunidades/${id}/comercial`} className="text-sm text-carbon/50 hover:text-carbon">Cancelar</Link>
            <a href={`/comunidades/${id}/comercial/viabilidad/${viabId}/pdf`} target="_blank" rel="noopener noreferrer" className="ml-auto rounded-full border border-carbon/20 px-4 py-2 text-sm font-semibold text-carbon/70 hover:border-lima hover:text-carbon">Previsualizar PDF ↗</a>
            <span className="text-xs text-carbon/35">(guarda primero para reflejar cambios)</span>
          </div>
        </form>
      </main>
    </div>
  );
}
