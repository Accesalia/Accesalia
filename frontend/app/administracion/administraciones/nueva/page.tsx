import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { opcionesAdministracion } from "../../../../lib/altaAdministracion";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { Formulario } from "./Formulario";
import { guardarAdministracion } from "./acciones";
import { Salida } from "../../../components/Salida";

export const dynamic = "force-dynamic";

// DAR DE ALTA UNA ADMINISTRACION DE FINCAS (Monica, 26-sep-2026).
// Lo obligatorio es una persona con una forma de contacto, no la empresa: a
// veces solo se sabe el nombre del que llama.

export default async function NuevaAdministracion({
  searchParams,
}: {
  searchParams: Promise<{ falta?: string }>;
}) {
  const { falta } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/administracion/administraciones/nueva");
  // TAMBIEN EL COMERCIAL (28-oct-2026): su portada le ofrece «+ Alta nuevo
  // Administrador» y esta pantalla le echaba si no tenia el area de administracion.
  if (!puedeEntrar(yo, "administracion") && !puedeEntrar(yo, "comercial", "trabajar")) redirect("/menu");

  const opciones = await opcionesAdministracion(yo.id);

  return (
    <div className="min-h-screen bg-form">
      <BarraSuperior />
      <main className="mx-auto max-w-[1300px] px-4 pb-20 pt-5 sm:px-6">
        <Salida href="/administracion">
          ← Área Administración
        </Salida>

        {falta && (
          <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-base text-amber-900">
            No se ha guardado: hacía falta al menos una persona y una forma de contacto suya.
          </p>
        )}

        <div className="mt-3">
          <Formulario
            opciones={opciones}
            accion={guardarAdministracion}
            volver="/administracion"
          />
        </div>
      </main>
    </div>
  );
}
