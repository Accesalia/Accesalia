import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { quienSoy } from "../../../lib/sesion";
import { datosAsignar, puedeDecidirNube, puedeVerNubes } from "../../../lib/nubes";
import { MarcoDinero } from "../MarcoDinero";
import { ProcesoNubes } from "./Nubes";

export const dynamic = "force-dynamic";

// ASIGNAR › PROCESO DE NUBES (Monica, 16-oct-2026; maqueta area-dinero-v1,
// marco 7): lo que facturacion marco «nube si» hasta que la nube esta lista.
// Abraham (funcion escaneo) y Alexandra lo ven igual; a quien no lleva el area
// del dinero se le pinta sin su marco.

export default async function PaginaNubes() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion/nubes");
  if (!puedeVerNubes(yo)) redirect("/menu");
  const { enNube } = await datosAsignar();
  const filas = enNube.map((t) => ({
    oppId: t.oppId, nombre: t.nombre, recibida: t.decision?.decidida ?? null, prevista: t.decision?.prevista ?? null,
    escaneado: t.decision?.escaneado ?? null, notas: t.decision?.notas ?? null,
  }));
  const cuerpo = (
    <>
      <div className="mb-[22px]">
        <h1 className="text-[30px] font-[750] leading-[1.1] tracking-[-.5px] text-carbon">Proceso de nubes</h1>
        <div className="mt-1.5 text-[14.5px] text-carbon/65">
          Lo pendiente de escanear y de tener la nube lista · al marcar «nube lista», sale de aquí y pasa a Proyectos a asignar
        </div>
      </div>
      <ProcesoNubes filas={filas} />
    </>
  );
  if (!puedeDecidirNube(yo))
    return (
      <div className="min-h-screen">
        <BarraSuperior />
        <main className="mx-auto w-full max-w-[1500px] px-4 pb-16 pt-5 text-sm sm:px-6">
          <Salida href="/menu">← Menú</Salida>
          <div className="mt-3">{cuerpo}</div>
        </main>
      </div>
    );
  return (
    <MarcoDinero yo={yo} area="asignar">
      <div className="mb-3.5 flex items-center gap-3.5">
        <Link href="/facturacion/caja" className="inline-flex h-8 items-center rounded-[9px] border border-[#d6dad2] bg-white px-3 text-[13px] font-bold text-carbon-soft hover:border-carbon/40">
          ← Volver a Nube / Proyectos
        </Link>
        <span className="text-[12.5px] text-carbon/65">Alexandra lo ve exactamente igual que Abraham</span>
      </div>
      {cuerpo}
    </MarcoDinero>
  );
}
