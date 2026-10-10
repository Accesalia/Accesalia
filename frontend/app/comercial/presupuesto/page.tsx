import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Volver } from "../../components/Volver";
import { quienSoy } from "../../../lib/sesion";
import { puedeHacerHojas, puedeVerComunidad } from "../../../lib/hojaEncargo";
import { comunidadDeOportunidad, datosPresupuesto } from "../../../lib/presupuesto";
import { Presupuesto } from "./Presupuesto";

export const dynamic = "force-dynamic";

// PRESUPUESTOS (Monica, 10-oct-2026): el tercer documento, junto a la hoja de
// encargo y la viabilidad. Se entra desde la oportunidad (?opp=...); a la
// izquierda se marcan las hojas que entran, a la derecha sale el presupuesto.
// Pueden entrar los mismos que hacen hojas, y un comercial solo los de su
// cartera.

export default async function PaginaPresupuesto({ searchParams }: { searchParams: Promise<{ opp?: string; p?: string }> }) {
  const { opp, p } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=" + encodeURIComponent(`/comercial/presupuesto${opp ? `?opp=${opp}` : ""}`));
  if (!puedeHacerHojas(yo)) redirect("/comercial");

  const comunidad = opp ? await comunidadDeOportunidad(opp) : null;
  const permitida = comunidad ? await puedeVerComunidad(yo, comunidad) : false;
  const datos = comunidad && permitida ? await datosPresupuesto(opp!) : null;

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1500px] px-6 pb-20 pt-5 text-sm">
        <Volver siNoHay={opp ? `/comercial/oportunidades/${opp}` : "/comercial"} />
        {datos ? (
          <Presupuesto key={datos.opp.id} datos={datos} abrir={p ?? null} />
        ) : (
          <>
            <h1 className="mt-2.5 text-[25px] font-bold leading-tight text-carbon">Presupuesto</h1>
            <p className="mt-3 max-w-[640px] rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-amber-900">
              {!opp
                ? "El presupuesto se hace desde una oportunidad: ábrelo desde su ficha o desde el botón Presupuesto del área comercial."
                : !comunidad
                  ? "Esta oportunidad todavía no tiene comunidad, y sin ella no hay a quién hacer el presupuesto."
                  : "Esta oportunidad no es de tu cartera."}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
