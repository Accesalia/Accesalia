import { redirect } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { Volver } from "../../../components/Volver";
import { quienSoy } from "../../../../lib/sesion";
import { puedeVerLibro } from "../../../../lib/cobros";
import { libroDeEmpresa, prepararProforma } from "../../../../lib/proformas";
import { FormProforma } from "./FormProforma";

export const dynamic = "force-dynamic";

// EMITIR UNA PROFORMA (Monica, 12-oct-2026) desde los hitos o subhitos que se
// marcan en la pantalla de cobro de la oportunidad. De partida, una linea por
// linea facturable con su texto; se edita, se juntan o separan hitos entre
// lineas, y se emite. El codigo lo pone la base al guardar.

export default async function NuevaProforma({ searchParams }: { searchParams: Promise<{ hitos?: string }> }) {
  const { hitos = "" } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion");
  let p;
  try {
    p = await prepararProforma(hitos.split(","));
  } catch (e) {
    return (
      <div className="min-h-screen">
        <BarraSuperior />
        <main className="mx-auto max-w-[900px] px-4 py-6 sm:px-6">
          <Volver siNoHay="/facturacion" />
          <p className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">{(e as Error).message}</p>
        </main>
      </div>
    );
  }
  if (!puedeVerLibro(yo, libroDeEmpresa(p.empresa))) redirect("/menu");
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-5 text-sm sm:px-6">
        <Volver siNoHay={`/facturacion/${p.oppId}`} />
        <h1 className="mt-3 text-3xl font-bold text-carbon">Nueva proforma</h1>
        <p className="mt-1 text-carbon/70">
          {p.donde} · la emite <b>{p.emisora.nombre}</b>. El número ({p.emisora.clave === "daniel" ? "AUT" : p.emisora.clave === "ecobalance" ? "ECO" : "ACC"}-PF-AA-MM-NNNN) se pone al emitirla.
        </p>
        <FormProforma p={p} />
      </main>
    </div>
  );
}
