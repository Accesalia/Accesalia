import { redirect } from "next/navigation";
import { quienSoy } from "../../../../lib/sesion";
import { diario, puedeFacturacion } from "../../../../lib/recorridoHoja";
import { MarcoDinero } from "../../MarcoDinero";
import { ESTILOS_RECORRIDO } from "../estilosRecorrido";
import { Diario } from "./Diario";

export const dynamic = "force-dynamic";

// COBRAR › DIARIO DE TRABAJO (Monica, 25-oct-2026; maqueta validada docs/figma/recorrido-hoja-firmada.html). Lo que se
// ha hecho con cada hoja firmada, dia a dia: lo que decide facturacion y lo que hace despues la secretaria comercial
// (con las areas que abrio), para que Alexandra revise que no se salta nada. Desde aqui se devuelve una hoja a la
// lista y se pausa o se levanta una pausa. Los ultimos 60 dias.

export default async function PaginaDiario() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion/cobrar/diario");
  if (!puedeFacturacion(yo)) redirect("/menu");
  const d = await diario();
  return (
    <MarcoDinero yo={yo} area="cobrar" activo="diario">
      <div className="rh">
        <style dangerouslySetInnerHTML={{ __html: ESTILOS_RECORRIDO }} />
        <div className="cab">
          <div>
            <h1>Diario de trabajo</h1>
            <p className="sub">
              Lo que se ha hecho con cada hoja firmada, día a día: lo que decide facturación y lo que hace después la secretaria comercial. Desde aquí se
              devuelve una hoja a la lista y se pausa o se levanta una pausa.
            </p>
          </div>
        </div>
        <Diario filas={d.filas} avisos={d.avisos} />
      </div>
    </MarcoDinero>
  );
}
