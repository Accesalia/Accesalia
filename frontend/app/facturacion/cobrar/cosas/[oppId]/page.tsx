import Link from "next/link";
import { redirect } from "next/navigation";
import { quienSoy } from "../../../../../lib/sesion";
import { puedeFacturacion } from "../../../../../lib/recorridoHoja";
import { detalleCosas } from "../../../../../lib/cosasAFacturar";
import { MarcoDinero } from "../../../MarcoDinero";
import { ESTILOS_COSAS } from "../estilosCosas";
import { Cosas } from "./Cosas";

export const dynamic = "force-dynamic";

// COSAS A FACTURAR › UNA DIRECCION (maqueta validada docs/figma/cosas-a-facturar.html): los cuatro pasos.

export default async function PaginaCosasOpp({ params }: { params: Promise<{ oppId: string }> }) {
  const { oppId } = await params;
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/facturacion/cobrar/cosas/${oppId}`);
  if (!puedeFacturacion(yo)) redirect("/menu");
  const d = await detalleCosas(oppId);
  return (
    <MarcoDinero yo={yo} area="cobrar" activo="cosas">
      <div className="rh">
        <style dangerouslySetInnerHTML={{ __html: ESTILOS_COSAS }} />
        <Link className="salida" href="/facturacion/cobrar/cosas">← Cosas a facturar</Link>
        {!d ? (
          <p className="nota" style={{ marginTop: 16 }}>No se encuentra esa dirección.</p>
        ) : (
          <>
            <div className="cab">
              <div>
                <h1>{d.direccion}</h1>
                <p className="sub">
                  {d.pagadores.length ? `Paga ${d.pagadores.map((p) => p.nombre).join(" y ")} · ` : ""}
                  {d.hojas.map((h) => h.numero).join(" · ")}
                </p>
              </div>
              <div className="der">
                <Link className="enlace" href={`/facturacion/${oppId}`}>Ver la ficha de facturación →</Link>
              </div>
            </div>
            {d.hojas.length ? <Cosas d={d} /> : <p className="nota" style={{ marginTop: 16 }}>Esta dirección no tiene nada por facturar: sus hojas aún no han salido de Nuevas hojas firmadas, o ya está todo facturado.</p>}
          </>
        )}
      </div>
    </MarcoDinero>
  );
}
