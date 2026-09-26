import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { opcionesAlta } from "../../../../lib/alta";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { Formulario } from "./Formulario";
import { guardarAlta } from "./acciones";

export const dynamic = "force-dynamic";

// DAR DE ALTA (Monica, 25-sep-2026). Es la puerta por la que entra el proceso
// comercial: nace la comunidad (si hay direccion), su oportunidad y la primera
// nota del diario, con su fecha y su autor.

export default async function NuevaComunidad({ searchParams }: { searchParams: Promise<{ falta?: string }> }) {
  const { falta } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/administracion/comunidades/nueva");
  if (!puedeEntrar(yo, "administracion")) redirect("/menu");

  const opciones = await opcionesAlta();

  return (
    <div className="min-h-screen bg-form">
      <BarraSuperior />
      <main className="mx-auto max-w-[1300px] px-4 pb-20 pt-5 sm:px-6">
        <Link href="/administracion/comunidades" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
          ← Comunidades de vecinos
        </Link>


        {falta && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-800">
            No se ha guardado: hacía falta la dirección, el administrador o la nota.
          </p>
        )}

        <div className="mt-3">
          <Formulario opciones={opciones} accion={guardarAlta} volver="/administracion/comunidades" />
        </div>
      </main>
    </div>
  );
}
