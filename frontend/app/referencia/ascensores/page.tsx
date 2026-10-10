import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { quienSoy } from "../../../lib/sesion";
import { assetUrl, listarModelos } from "../../../lib/catalogo";

export const dynamic = "force-dynamic";

// MODELOS DE ASCENSOR EN 3D (Monica, 10-oct-2026): "por si sobre la marcha un
// comercial tiene que enseñar uno a una comunidad". Muy sencilla: rejilla a dos
// columnas, miniatura + nombre; se pincha y se entra al modelo.

export default async function Ascensores() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/referencia/ascensores");
  const modelos = await listarModelos();

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1000px] px-4 py-6 sm:px-6">
        <Link href="/referencia" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
          ← Documentación de referencia
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-carbon">Modelos de ascensor en 3D</h1>
        <p className="mt-1 text-carbon/55">Pincha uno para verlo en 3D, con sus imágenes y su plano.</p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {modelos.map((m) => (
            <Link
              key={m.id}
              href={`/referencia/ascensores/${m.codigo}`}
              className="block overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={assetUrl(m.codigo, "thumb.webp")} alt={m.nombre} loading="lazy" className="h-[300px] w-full object-contain p-3" />
              <div className="border-t border-black/5 px-5 py-3 text-[16px] font-semibold text-carbon">
                {m.codigo} · {m.nombre}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
