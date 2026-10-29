import { notFound, redirect } from "next/navigation";
import { quienSoy } from "../../../../lib/sesion";
import { importesAMano, leerAcuerdo, puedeGestionarComisiones, puedeVerificarComisiones } from "../../../../lib/comisionesAdmin";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { Salida } from "../../../components/Salida";
import { FormAcuerdo } from "../../../ecobalance/comisiones/[id]/FormAcuerdo";
import { ImportesPorOpp } from "./ImportesPorOpp";

export const dynamic = "force-dynamic";

// COMISIONES A ADMINS › UN ACUERDO (Monica, 29-oct-2026). 1 · el acuerdo (quien cobra, de que, cuanto). 2 · un importe
// distinto en una opp concreta («normalmente son mil, pero en una comunidad mas grande van a ser 1.500»). Los pagos,
// en Ecobalance.

export default async function AcuerdoGestion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/comercial/comisiones-admins/${id}`);
  if (!puedeGestionarComisiones(yo)) redirect("/menu");
  const nuevo = id === "nuevo";
  const a = nuevo ? null : await leerAcuerdo(id);
  if (!nuevo && !a) notFound();
  const importes = a ? await importesAMano(a.id) : [];
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        <Salida href="/comercial/comisiones-admins">← Comisiones a Admins</Salida>
        <h1 className="mt-3 text-3xl font-bold text-carbon">{nuevo ? "Nuevo acuerdo" : (a!.persona ?? "Acuerdo sin persona")}</h1>
        {a && (
          <p className="mt-1 text-[14.5px] text-carbon/65">
            {a.empresas.map((e) => e.nombre).join(", ") || "sin administración"}
            {a.alcance === "lo_suyo" && " · cobra solo lo de su cartera y lo que trae él"}
          </p>
        )}
        <section className="mt-6">
          <h2 className="text-[17px] font-bold text-carbon">1 · El acuerdo</h2>
          <FormAcuerdo acuerdo={a} modo="gestion" puedeVerificar={puedeVerificarComisiones(yo)} />
        </section>
        {a && (
          <section className="mt-8">
            <h2 className="text-[17px] font-bold text-carbon">2 · Un importe distinto en una opp concreta</h2>
            <p className="mt-0.5 text-[13px] text-carbon/55">Manda sobre lo que diga el acuerdo, solo en esa opp. Lo demás sigue con el acuerdo.</p>
            <ImportesPorOpp acuerdoId={a.id} importes={importes} sobres={(["proyecto", "subvenciones", "contrata"] as const).filter((s) => a.condiciones[s])} />
          </section>
        )}
      </main>
    </div>
  );
}
