import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { quienSoy } from "../../../lib/sesion";
import { datosCaja, puedeVerCobros } from "../../../lib/cobros";
import { Nubes } from "./Nubes";

export const dynamic = "force-dynamic";

// NUBES DE PUNTOS (Monica, 12-oct-2026). Entra aqui lo firmado y cobrado que
// tiene la entrega por hacer; sale al cronograma de tecnicos cuando su nube
// esta lista. Ver Nubes.tsx.

export default async function PaginaNubes() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion/nubes");
  if (!puedeVerCobros(yo)) redirect("/menu");
  const d = await datosCaja();
  // Lo cobrado que va a FARO: "una hoja se firma y se marca cobrada", y lo que
  // se cobro es un proyecto tecnico (bloques.va_a_faro), no un IEE ni una subvencion.
  const trabajos = d.trabajos.filter((t) => t.cobradoDesde && t.faro);
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1500px] px-4 pb-16 pt-5 text-sm sm:px-6">
        <Salida href="/facturacion">← Facturación y asignación</Salida>
        <div className="mt-3 border-b border-black/10 pb-4">
          <h1 className="text-3xl font-bold leading-tight text-carbon">Nubes de puntos</h1>
          <p className="mt-1 text-carbon/65">
            Lo firmado y cobrado, hasta que su nube está lista. Entonces pasa al cronograma de técnicos.
          </p>
        </div>
        <Nubes trabajos={trabajos} />
      </main>
    </div>
  );
}
