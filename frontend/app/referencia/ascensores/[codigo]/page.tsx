import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { Visor3D } from "../../../components/Visor3D";
import { quienSoy } from "../../../../lib/sesion";
import { assetUrl, obtenerModelo, urlsRenders } from "../../../../lib/catalogo";
import { Imagenes } from "./Imagenes";

export const dynamic = "force-dynamic";

// UN MODELO DEL CATALOGO: "todo el material, mas o menos lo que hay ahora en
// Dropbox" (Monica, 10-oct-2026). El 3D para girarlo, la lamina, las imagenes y
// el plano, todo a la vista sin tener que pinchar para descubrirlo. El video no
// esta: pesa cientos de megas y el 3D lo sustituye.

const ROT = "text-[11px] font-bold uppercase tracking-wider text-carbon/45";

export default async function Modelo({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/referencia/ascensores/${codigo}`);
  const m = await obtenerModelo(codigo);
  if (!m || !m.activo) notFound();
  const imagenes = urlsRenders(m.codigo, m.n_renders);

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        <Link href="/referencia/ascensores" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
          ← Modelos de ascensor en 3D
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-carbon">
          {m.codigo} · {m.nombre}
        </h1>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="relative h-[560px] overflow-hidden rounded-2xl border border-ajeno/30 bg-[#fffaf0]">
            <Visor3D url={assetUrl(m.codigo, "modelo.glb")} />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assetUrl(m.codigo, "thumb.webp")}
            alt={`Sección y plantas de ${m.codigo}`}
            className="w-full self-start rounded-2xl border border-black/5 bg-white object-contain p-2"
          />
        </div>

        {imagenes.length > 0 && (
          <section className="mt-8">
            <h2 className={ROT}>Imágenes</h2>
            <Imagenes urls={imagenes} />
          </section>
        )}

        {m.tiene_plano && (
          <section className="mt-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className={ROT}>Plano</h2>
              <a
                href={assetUrl(m.codigo, "plano.pdf")}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] font-semibold text-[#2B6CB0] hover:underline"
              >
                Abrir en grande
              </a>
            </div>
            <iframe
              src={assetUrl(m.codigo, "plano.pdf")}
              title={`Plano de ${m.codigo}`}
              className="mt-2 h-[700px] w-full rounded-2xl border border-black/5 bg-white"
            />
          </section>
        )}
      </main>
    </div>
  );
}
