import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import {
  administradorPorId,
  listarComerciales,
  listarAdministraciones,
} from "../../../../lib/comercial";
import { actualizarAdministrador } from "../../acciones";
import { FormularioAdministrador } from "../../FormularioAdministrador";

export const dynamic = "force-dynamic";

export default async function EditarAdministrador({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [ficha, comerciales, administraciones] = await Promise.all([
    administradorPorId(id),
    listarComerciales(),
    listarAdministraciones(),
  ]);
  if (!ficha) notFound();

  const accion = actualizarAdministrador.bind(null, id);

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[860px] px-6 py-10">
        <Link href={`/administradores/${id}`} className="text-sm text-carbon/50 hover:text-carbon">
          ← Ficha de {ficha.admin.nombre}
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-carbon sm:text-3xl">Editar administrador</h1>

        <div className="mt-8">
          <FormularioAdministrador
            accion={accion}
            admin={ficha.admin}
            comerciales={comerciales}
            administraciones={administraciones}
            textoBoton="Guardar cambios"
            hrefCancelar={`/administradores/${id}`}
          />
        </div>
      </main>
    </div>
  );
}
