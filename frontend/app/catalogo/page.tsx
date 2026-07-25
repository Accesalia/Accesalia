import Link from "next/link";
import { BarraSuperior } from "../components/BarraSuperior";
import { listarModelos, assetUrl } from "../../lib/catalogo";

export const dynamic = "force-dynamic";

// Rejilla del catalogo de soluciones 3D genericas de venta. Cada tarjeta abre su
// visor (video + renders + plano acotado).
export default async function CatalogoPage() {
  const modelos = await listarModelos();
  const conAssets = modelos.filter((m) => m.tiene_video || m.n_renders > 0).length;

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-carbon sm:text-3xl">
              Catálogo de soluciones 3D
            </h1>
            <p className="mt-1 text-carbon/50">
              Modelos genéricos de venta. Abre cualquiera para ver el 3D, los renders y el plano acotado.
            </p>
          </div>
          <span className="hidden shrink-0 rounded-full bg-lima-soft px-3 py-1 text-xs font-semibold text-lima-dark sm:inline">
            {conAssets}/{modelos.length} con material
          </span>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modelos.map((m) => {
            const tieneMedia = m.tiene_video || m.n_renders > 0;
            return (
              <Link
                key={m.codigo}
                href={`/catalogo/${m.codigo}`}
                className="group block overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-video overflow-hidden bg-carbon/5">
                  {m.n_renders > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={assetUrl(m.codigo, "thumb.webp")}
                      alt={m.nombre}
                      className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-carbon/25">
                      <span className="text-4xl">▤</span>
                    </div>
                  )}
                  {m.tiene_video && (
                    <span className="absolute bottom-2 right-2 rounded-full bg-carbon/80 px-2 py-0.5 text-[11px] font-semibold text-white">
                      ▶ vídeo
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-semibold text-carbon">{m.nombre}</h2>
                    <span className="shrink-0 text-xs font-medium text-carbon/35">
                      {m.codigo}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                    {m.n_renders > 0 && (
                      <span className="rounded-full bg-lima-soft px-2 py-0.5 font-semibold text-lima-dark">
                        {m.n_renders} renders
                      </span>
                    )}
                    {m.tiene_plano && (
                      <span className="rounded-full bg-black/5 px-2 py-0.5 font-semibold text-carbon/60">
                        plano acotado
                      </span>
                    )}
                    {!tieneMedia && (
                      <span className="rounded-full bg-black/5 px-2 py-0.5 font-medium text-carbon/40">
                        material pendiente
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
