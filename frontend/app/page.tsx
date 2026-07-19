import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "./components/BarraSuperior";
import { ultimaConvocatoriaConExtraccion } from "@/lib/datos";

export const dynamic = "force-dynamic";

export default async function Home() {
  const convId = await ultimaConvocatoriaConExtraccion();

  if (convId) {
    redirect(`/convocatoria/${convId}`);
  }

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="text-2xl font-bold text-carbon">Todavía no hay convocatorias</h1>
        <p className="mt-3 text-carbon/60">
          Sube tu primera convocatoria y la IA preparará su tablero de documentación.
        </p>
        <Link
          href="/nueva"
          className="mt-6 inline-block rounded-full bg-lima px-5 py-2.5 font-semibold text-carbon hover:bg-lima-dark hover:text-white"
        >
          + Nueva convocatoria
        </Link>
      </div>
    </div>
  );
}
