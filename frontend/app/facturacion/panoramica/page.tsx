import { redirect } from "next/navigation";
import { quienSoy } from "../../../lib/sesion";
import { puedeVerCobros } from "../../../lib/cobros";
import { DESDE_POR_DEFECTO, panoramica } from "../../../lib/panoramica";
import { MarcoDinero } from "../MarcoDinero";
import { Panoramica } from "./Panoramica";

export const dynamic = "force-dynamic";

// VISTA PANORAMICA (Monica, 16-oct-2026): el quinto boton del area del dinero.
// La pagina se pinta una vez; despues, cada filtro es una llamada a ./datos.

export default async function PaginaPanoramica() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion/panoramica");
  if (!puedeVerCobros(yo)) redirect("/menu");
  const inicial = await panoramica({ desde: DESDE_POR_DEFECTO }, yo);
  return (
    <MarcoDinero yo={yo} area="panoramica">
      <Panoramica inicial={inicial} desdeInicial={DESDE_POR_DEFECTO} />
    </MarcoDinero>
  );
}
