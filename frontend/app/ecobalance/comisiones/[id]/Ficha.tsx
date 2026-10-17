import { notFound } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { Salida } from "../../../components/Salida";
import { leerAcuerdo, oppsDelAcuerdo } from "../../../../lib/comisionesAdmin";
import { FormAcuerdo } from "./FormAcuerdo";
import { OppsDelAcuerdo } from "./OppsDelAcuerdo";

// COMISIONES › LA FICHA DE UN ADMINISTRADOR (Monica, 17-oct-2026).
// Arriba quien es, su empresa y sus notas. Parte 1: el acuerdo general (cuanto se
// lleva de proyecto, de subvenciones y de contrata). Parte 2: las opps firmadas con
// el (las de sus administraciones, o solo las suyas), con lo que se le debe en cada
// una, lo nuestro aparte de lo de la contrata, y si esta pagado y cuando.

/** El contenido, sin el permiso (lo pone quien lo pinta). */
export async function FichaComisionContenido({ id }: { id: string }) {
  const nuevo = id === "nuevo";
  const a = nuevo ? null : await leerAcuerdo(id);
  if (!nuevo && !a) notFound();
  const opps = a ? await oppsDelAcuerdo(a) : [];
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        <Salida href="/ecobalance/comisiones">← Comisiones</Salida>
        <h1 className="mt-3 text-3xl font-bold text-carbon">{nuevo ? "Nuevo acuerdo" : (a!.persona ?? "Acuerdo sin persona")}</h1>
        {a && (
          <p className="mt-1 text-[14.5px] text-carbon/65">
            {a.empresas.map((e) => e.nombre).join(", ") || "sin administración"}
            {a.alcance === "lo_suyo" && " · cobra solo lo de su cartera"}
            {a.revision !== "verificado" && <span className="ml-2 rounded-full bg-[#fbefd0] px-2 py-0.5 text-[12px] font-bold text-[#875f07]">por revisar</span>}
          </p>
        )}

        <section className="mt-6">
          <h2 className="text-[17px] font-bold text-carbon">1 · El acuerdo</h2>
          <FormAcuerdo acuerdo={a} />
        </section>

        {a && (
          <section className="mt-8">
            <h2 className="text-[17px] font-bold text-carbon">2 · Las opps firmadas con él</h2>
            <p className="mt-0.5 text-[13px] text-carbon/55">
              {a.alcance === "empresas"
                ? "Las de las comunidades que hoy llevan sus administraciones."
                : "Las de las comunidades de su cartera y las que nos ha traído él."}{" "}
              Lo nuestro se calcula con lo facturado; lo de la contrata, con el PEM del presupuesto adjudicado.
            </p>
            <OppsDelAcuerdo acuerdoId={a.id} opps={opps} />
          </section>
        )}
      </main>
    </div>
  );
}
