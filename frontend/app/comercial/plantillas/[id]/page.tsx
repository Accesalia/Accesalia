import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { quienSoy } from "../../../../lib/sesion";
import { plantilla, puedeTocar, puedeVerPlantillas } from "../../../../lib/plantillasCorreo";
import { accionGuardar, accionQuitar } from "../acciones";
import { FormPlantilla } from "../FormPlantilla";

export const dynamic = "force-dynamic";

// VER UNA PLANTILLA, y desde aqui editarla (Monica, 12-oct-2026).

const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });

export default async function VerPlantilla({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ editar?: string; falta?: string }> }) {
  const { id } = await params;
  const { editar, falta } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/comercial/plantillas/${id}`);
  if (!puedeVerPlantillas(yo)) redirect("/menu");
  const p = await plantilla(id, yo);
  if (!p) notFound();
  const toca = puedeTocar(yo, p);

  if (editar && toca) {
    return (
      <div className="min-h-screen bg-form">
        <BarraSuperior />
        <main className="mx-auto max-w-[1000px] px-4 pb-16 pt-5 sm:px-6">
          <FormPlantilla
            titulo="Retocar la plantilla"
            accion={accionGuardar.bind(null, id)}
            cancelar={`/comercial/plantillas/${id}`}
            inicial={p}
            elegirClase={false}
            falta={!!falta}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1000px] px-4 pb-16 pt-5 sm:px-6">
        <Link href="/comercial/plantillas" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
          ← Plantillas de mail
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-carbon">{p.nombre}</h1>
            <p className="mt-1 text-carbon/65">
              {p.propietario_id ? `Personal de ${p.propietario?.nombre ?? "—"}` : "General, para todos"} · retocada el{" "}
              {FECHA.format(new Date(p.actualizado_en))}
              {p.retoco ? ` por ${p.retoco.nombre}` : ""}
            </p>
          </div>
          {toca && (
            <div className="flex gap-2.5">
              <form action={accionQuitar.bind(null, id)}>
                <button type="submit" className="rounded-lg border border-alerta/40 bg-white px-4 py-2 text-sm font-bold text-alerta transition hover:bg-alerta/5">
                  Quitar
                </button>
              </form>
              <Link href={`/comercial/plantillas/${id}?editar=1`} className="rounded-lg bg-lima px-5 py-2 text-sm font-extrabold text-carbon transition hover:bg-lima-dark hover:text-white">
                Editar
              </Link>
            </div>
          )}
        </div>

        <article className="mt-5 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-carbon/65">Asunto</div>
          <p className="mt-0.5 text-[16px] font-semibold text-carbon">{p.asunto}</p>
          <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.06em] text-carbon/65">Texto</div>
          <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-carbon">{p.texto}</p>
        </article>
      </main>
    </div>
  );
}
