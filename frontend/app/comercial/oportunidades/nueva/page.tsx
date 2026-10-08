import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { opcionesOportunidad } from "../../../../lib/altaOportunidad";
import { eligeComercialAlDarDeAlta, puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { Formulario } from "./Formulario";
import { guardarOportunidad } from "./acciones";

export const dynamic = "force-dynamic";

// DAR DE ALTA UNA OPORTUNIDAD (Monica, 27-sep-2026).
//
// Una accion, dos puertas: el comercial la abre desde su pantalla sin entrar en
// Administracion, y desde Administracion se llega a la misma. Gira alrededor de
// la ENTRADA DEL DIARIO, que es lo unico que no puede faltar.

export default async function NuevaOportunidad({
  searchParams,
}: {
  searchParams: Promise<{ falta?: string; nota?: string; direccion?: string; fecha?: string }>;
}) {
  const { falta, nota, direccion, fecha } = await searchParams;
  // Desde "Grabar entrada", con la direccion que no estaba en la lista.
  const inicial =
    nota || direccion
      ? { nota: nota ?? "", direccion: direccion ?? "", fecha: fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null }
      : undefined;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/oportunidades/nueva");
  if (!puedeEntrar(yo, "comercial") && !puedeEntrar(yo, "administracion")) redirect("/menu");

  const { elige, mio } = await eligeComercialAlDarDeAlta(yo);
  const opciones = await opcionesOportunidad(yo.id, mio?.id ?? null);

  return (
    <div className="min-h-screen bg-alta-opp">
      <BarraSuperior />
      <main className="mx-auto max-w-[1300px] px-4 pb-20 pt-5 sm:px-6">
        <Link href="/comercial" className="text-sm font-semibold text-white/75 transition hover:text-white">
          ← Área Comercial
        </Link>

        {falta && (
          <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-base text-amber-900">
            No se ha guardado: hacían falta qué te han contado, un comercial, el siguiente paso, con quién hablas a
            partir de ahora, y al menos una de estas — dirección, administrador, teléfono o correo.
          </p>
        )}

        <div className="mt-3">
          <Formulario opciones={opciones} eligeComercial={elige} accion={guardarOportunidad} volver="/comercial" inicial={inicial} />
        </div>
      </main>
    </div>
  );
}
