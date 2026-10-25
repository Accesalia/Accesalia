import Link from "next/link";
import { redirect } from "next/navigation";
import { quienSoy } from "../../../../lib/sesion";
import { puedeVerCobros, puedeVerEcobalance, type Libro } from "../../../../lib/cobros";
import { proformasEmitidas } from "../../../../lib/proformasEmitidas";
import { MarcoDinero } from "../../MarcoDinero";
import { ESTILOS_RECORRIDO } from "../estilosRecorrido";
import { Emitidas } from "./Emitidas";

export const dynamic = "force-dynamic";

// COBRAR › PROFORMAS EMITIDAS (Monica, 25-oct-2026; maqueta validada docs/figma/proformas-emitidas.html).

export default async function PaginaEmitidas({ searchParams }: { searchParams: Promise<{ libro?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion/cobrar/emitidas");
  const veAcc = puedeVerCobros(yo), veEco = puedeVerEcobalance(yo);
  if (!veAcc && !veEco) redirect("/menu");
  const { libro: l } = await searchParams;
  const libro: Libro = l === "ecobalance" && veEco ? "ecobalance" : veAcc ? "accesalia" : "ecobalance";
  const filas = await proformasEmitidas(libro);
  return (
    <MarcoDinero yo={yo} area="cobrar" activo="emitidas">
      <div className="rh">
        <style dangerouslySetInnerHTML={{ __html: ESTILOS_RECORRIDO }} />
        <div className="cab">
          <div>
            <h1>Proformas emitidas</h1>
            <p className="sub">
              Cada proforma, hasta que es factura: a quién se envió, si ha dado el ok y si ya está en Factusol como pedido (con el mismo número). Las de contrata
              no esperan el ok.
            </p>
          </div>
          <div className="der"><Link className="enlace" href="/facturacion/cobrar/cosas">Cosas a facturar →</Link></div>
        </div>
        {veAcc && veEco && (
          <div className="filtros" role="group" aria-label="Libro">
            <Link className="chip" aria-pressed={libro === "accesalia"} href="/facturacion/cobrar/emitidas?libro=accesalia">Accesalia y Daniel</Link>
            <Link className="chip" aria-pressed={libro === "ecobalance"} href="/facturacion/cobrar/emitidas?libro=ecobalance">Ecobalance</Link>
          </div>
        )}
        <Emitidas filas={filas} />
        <p className="nota">Con el ok, en Factusol se pasa el pedido a factura; luego «Enviar factura y registro del cargo», como hasta ahora. Las facturadas salen de aquí.</p>
      </div>
    </MarcoDinero>
  );
}
