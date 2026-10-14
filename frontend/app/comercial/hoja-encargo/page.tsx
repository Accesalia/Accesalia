import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Volver } from "../../components/Volver";
import { quienSoy } from "../../../lib/sesion";
import { datosHoja, oppsParaHoja, puedeHacerHojas, puedeVerOpp } from "../../../lib/hojaEncargo";
import { estadoRevision, puedeRevisar } from "../../../lib/revisionOferta";
import { HojasDeEncargo } from "./HojasDeEncargo";

export const dynamic = "force-dynamic";

// HOJAS DE ENCARGO (Monica, 6-oct-2026), montada sobre su maqueta aprobada tal
// cual: docs/figma/hoja-de-encargo.html.
//
// Se entra desde el bloque 2 de la oportunidad o desde el boton "Hoja de
// encargo" del area comercial; NO va en el menu. Va POR OPORTUNIDAD, no por
// comunidad (Monica, 13-oct-2026): "tener CP no deberia condicionar nada". A
// veces se llega sin oportunidad elegida, y por eso arriba hay un selector con
// buscador. Pueden entrar comercial, secretaria comercial y direccion; un
// comercial solo ve las oportunidades de su cartera.

export default async function PaginaHojas({ searchParams }: { searchParams: Promise<{ opp?: string; nueva?: string }> }) {
  const { opp, nueva } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/hoja-encargo" + (opp ? `?opp=${opp}` : ""));
  if (!puedeHacerHojas(yo)) redirect("/comercial");

  const opciones = await oppsParaHoja(yo);
  const permitida = opp ? await puedeVerOpp(yo, opp) : false;
  const datos = opp && permitida ? await datosHoja(opp) : null;
  // EL OK A LA OFERTA (14-oct-2026): como va, y si quien mira puede darlo.
  const okOferta = datos ? await estadoRevision(datos.opp.id) : null;

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1500px] px-6 pb-20 pt-5 text-sm">
        <Volver siNoHay="/comercial" />
        <HojasDeEncargo
          key={datos?.opp.id ?? "ninguna"}
          opps={opciones}
          datos={datos}
          aviso={opp && !datos ? (permitida ? "Esa oportunidad no existe." : "Esa oportunidad no es de tu cartera.") : null}
          abrirNueva={nueva === "1"}
          okOferta={okOferta}
          puedoRevisar={puedeRevisar(yo)}
        />
      </main>
    </div>
  );
}
