import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { obtenerModelo, assetUrl, urlsRenders } from "../../../lib/catalogo";
import { VisorRenders } from "./VisorRenders";

export const dynamic = "force-dynamic";

// Visor de un tipo del catalogo: video + renders + plano acotado.
export default async function ModeloPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const m = await obtenerModelo(codigo);
  if (!m) notFound();

  const renders = urlsRenders(m.codigo, m.n_renders);
  const sinMaterial = !m.tiene_video && m.n_renders === 0 && !m.tiene_plano;

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1100px] px-6 py-8">
        {/* Salida: nunca un callejon sin salida. */}
        <Link
          href="/catalogo"
          className="inline-flex items-center gap-1 text-sm font-medium text-carbon/50 hover:text-carbon"
        >
          ← Volver al catálogo
        </Link>

        <div className="mt-3 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-carbon sm:text-3xl">{m.nombre}</h1>
          <span className="shrink-0 rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-carbon/50">
            {m.codigo}
          </span>
        </div>

        {sinMaterial && (
          <p className="mt-6 rounded-2xl border border-dashed border-black/10 bg-white p-6 text-carbon/50">
            Material pendiente de subir para este tipo.
          </p>
        )}

        {/* Video */}
        {m.tiene_video && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-black/5 bg-carbon">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              controls
              preload="metadata"
              poster={assetUrl(m.codigo, "poster.jpg")}
              src={assetUrl(m.codigo, "video.mp4")}
              className="max-h-[75vh] w-full bg-black"
            />
          </div>
        )}

        {/* Renders */}
        {renders.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-carbon/40">
              Renders ({renders.length})
            </h2>
            <VisorRenders urls={renders} />
          </section>
        )}

        {/* Plano acotado */}
        {m.tiene_plano && (
          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-carbon/40">
                Plano acotado
              </h2>
              <a
                href={assetUrl(m.codigo, "plano.pdf")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-lima-dark hover:underline"
              >
                Abrir PDF ↗
              </a>
            </div>
            <iframe
              src={assetUrl(m.codigo, "plano.pdf")}
              title={`Plano ${m.nombre}`}
              className="h-[70vh] w-full rounded-2xl border border-black/5 bg-white"
            />
          </section>
        )}
      </main>
    </div>
  );
}
