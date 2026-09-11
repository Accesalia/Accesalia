import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { comunidadPorId } from "../../../../lib/comunidades";
import { actualizarComunidad } from "../../acciones";
import { FormComunidad } from "../../FormComunidad";

export const dynamic = "force-dynamic";

export default async function EditarComunidad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await comunidadPorId(id);
  if (!ficha) notFound();

  const actualizar = actualizarComunidad.bind(null, id);

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link href={`/comunidades/${id}`} className="text-sm text-carbon/50 hover:text-carbon">
          ← {ficha.comunidad.nombre}
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-carbon sm:text-3xl">Editar comunidad</h1>
        <FormComunidad
          accion={actualizar}
          comunidad={ficha.comunidad}
          textoBoton="Guardar cambios"
          hrefCancelar={`/comunidades/${id}`}
        />
      </main>
    </div>
  );
}
