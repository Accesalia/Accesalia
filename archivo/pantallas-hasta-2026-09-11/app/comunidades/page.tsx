import Link from "next/link";
import { BarraSuperior } from "../components/BarraSuperior";
import { PestanasMaestros } from "../components/PestanasMaestros";
import { listarComunidades, contarComunidades } from "../../lib/comunidades";
import { BuscadorLista } from "./BuscadorLista";

export const dynamic = "force-dynamic";

export default async function Comunidades() {
  const [comunidades, total] = await Promise.all([listarComunidades(), contarComunidades()]);

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <PestanasMaestros activa="comunidades" />
      <main className="mx-auto max-w-[1000px] px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-carbon sm:text-3xl">Datos administrativos</h1>
            <p className="mt-1 text-carbon/55">{total.toLocaleString("es-ES")} comunidades · identidad, dirección, presidencia y administración</p>
          </div>
          <Link
            href="/comunidades/nueva"
            className="rounded-full bg-lima px-5 py-2 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white"
          >
            + Nueva comunidad
          </Link>
        </div>

        <BuscadorLista inicial={comunidades} />
      </main>
    </div>
  );
}
