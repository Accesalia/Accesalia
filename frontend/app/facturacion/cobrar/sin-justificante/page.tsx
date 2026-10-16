import { redirect } from "next/navigation";
import { quienSoy } from "../../../../lib/sesion";
import { puedeVerCobros } from "../../../../lib/cobros";
import { facturasEmitidas } from "../../../../lib/facturasEmitidas";
import { MarcoDinero } from "../../MarcoDinero";
import { FacturasEmitidas } from "../facturas/FacturasEmitidas";

export const dynamic = "force-dynamic";

// COBRAR › FACTURAS SIN JUSTIFICANTE (Monica, 16-oct-2026): las emitidas que aun
// no tienen su justificante de cobro subido ("cobrado = justificante subido").
// Es la lista de Facturas emitidas con ese filtro puesto de entrada.

export default async function Pagina({ searchParams }: { searchParams: Promise<{ anio?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion/cobrar/sin-justificante");
  if (!puedeVerCobros(yo)) redirect("/menu");
  const { anio: a } = await searchParams;
  const hoy = Number(new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }).slice(0, 4));
  const anio = a === "todos" ? null : Number(a) || hoy;
  const facturas = await facturasEmitidas(anio);
  const sin = facturas.filter((f) => f.estadoCobro === "sin_justificante").length;
  return (
    <MarcoDinero yo={yo} area="cobrar" activo="sin-justificante" cuentas={{ sinJustificante: sin }}>
      <FacturasEmitidas
        facturas={facturas}
        anio={anio}
        anios={[hoy, hoy - 1]}
        titulo="Facturas sin justificante"
        filtroInicial="sin-justificante"
        ruta="/facturacion/cobrar/sin-justificante"
      />
    </MarcoDinero>
  );
}
