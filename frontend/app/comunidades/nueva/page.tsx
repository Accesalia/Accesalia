import Link from "next/link";
import { BarraSuperior } from "../../components/BarraSuperior";
import { crearComunidad } from "../acciones";
import { FormComunidad } from "../FormComunidad";

export const dynamic = "force-dynamic";

export default async function NuevaComunidad() {
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/comunidades" className="text-sm text-carbon/50 hover:text-carbon">
          ← Comunidades
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-carbon sm:text-3xl">Nueva comunidad</h1>
        <p className="mt-1 text-carbon/55">
          La ficha base del edificio. De ella colgarán las hojas de encargo, subvenciones, obra y facturación.
        </p>
        <FormComunidad accion={crearComunidad} textoBoton="Crear comunidad" />
      </main>
    </div>
  );
}
