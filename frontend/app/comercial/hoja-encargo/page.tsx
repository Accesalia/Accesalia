import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Volver } from "../../components/Volver";
import { quienSoy } from "../../../lib/sesion";
import { comunidadesParaHoja, datosHoja, puedeHacerHojas, puedeVerComunidad } from "../../../lib/hojaEncargo";
import { HojasDeEncargo } from "./HojasDeEncargo";

export const dynamic = "force-dynamic";

// HOJAS DE ENCARGO (Monica, 6-oct-2026), montada sobre su maqueta aprobada tal
// cual: docs/figma/hoja-de-encargo.html.
//
// Se entra desde el boton "Hoja de encargo" del area comercial; NO va en el
// menu. A veces se llega sin comunidad elegida, y por eso arriba hay un
// selector con buscador. Pueden entrar comercial, secretaria comercial y
// direccion; un comercial solo ve las comunidades de su cartera.

export default async function PaginaHojas({ searchParams }: { searchParams: Promise<{ comunidad?: string; opp?: string }> }) {
  const { comunidad, opp } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/hoja-encargo" + (comunidad ? `?comunidad=${comunidad}` : ""));
  if (!puedeHacerHojas(yo)) redirect("/comercial");

  const opciones = await comunidadesParaHoja(yo);
  const permitida = comunidad ? await puedeVerComunidad(yo, comunidad) : false;
  const datos = comunidad && permitida ? await datosHoja(comunidad) : null;

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1500px] px-6 pb-20 pt-5 text-sm">
        <Volver siNoHay="/comercial" />
        <HojasDeEncargo
          key={datos?.comunidad.id ?? "ninguna"}
          comunidades={opciones}
          datos={datos}
          oppElegida={opp ?? null}
          aviso={comunidad && !datos ? (permitida ? "Esa comunidad no existe." : "Esa comunidad no es de tu cartera.") : null}
        />
      </main>
    </div>
  );
}
