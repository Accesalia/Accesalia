import Link from "next/link";
import { BarraSuperior } from "../../components/BarraSuperior";
import { listarComerciales, listarAdministraciones } from "../../../lib/comercial";
import { crearAdministrador } from "../acciones";
import { FormularioAdministrador } from "../FormularioAdministrador";

export const dynamic = "force-dynamic";

export default async function NuevoAdministrador() {
  const [comerciales, administraciones] = await Promise.all([
    listarComerciales(),
    listarAdministraciones(),
  ]);

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[860px] px-6 py-10">
        <Link href="/administradores" className="text-sm text-carbon/50 hover:text-carbon">
          ← Cartera de administradores
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-carbon sm:text-3xl">Nuevo administrador</h1>
        <p className="mt-1 text-carbon/50">
          Da de alta a la persona-contacto que trae el trabajo.
        </p>

        <div className="mt-8">
          <FormularioAdministrador
            accion={crearAdministrador}
            comerciales={comerciales}
            administraciones={administraciones}
            textoBoton="Crear administrador"
            hrefCancelar="/administradores"
          />
        </div>
      </main>
    </div>
  );
}
