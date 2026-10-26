import { redirect } from "next/navigation";
import { quienSoy } from "../../../../lib/sesion";
import { porJustificar, puedeSubirJustificantes, TIPOS_COBRO } from "../../../../lib/justificantes";
import { MarcoDinero } from "../../MarcoDinero";
import { SubirJustificante } from "./SubirJustificante";

export const dynamic = "force-dynamic";

// COBRAR › SUBIR JUSTIFICANTES DE COBRO (Monica y Alexandra, 26-oct-2026; maqueta validada docs/figma/subir-justificante.html).
// Se llega desde «Facturas sin justificante» (solo VER) con un unico boton; aqui se gestiona desde cero.

export default async function Pagina() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion/cobrar/justificantes");
  if (!puedeSubirJustificantes(yo)) redirect("/menu");
  const facturas = await porJustificar();
  return (
    <MarcoDinero yo={yo} area="cobrar" activo="sin-justificante">
      <SubirJustificante facturas={facturas} tipos={TIPOS_COBRO.map(([v, t]) => ({ v, t }))} />
    </MarcoDinero>
  );
}
