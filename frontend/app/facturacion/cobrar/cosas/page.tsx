import Link from "next/link";
import { redirect } from "next/navigation";
import { quienSoy } from "../../../../lib/sesion";
import { puedeFacturacion } from "../../../../lib/recorridoHoja";
import { listaCosas } from "../../../../lib/cosasAFacturar";
import { MarcoDinero } from "../../MarcoDinero";
import { ESTILOS_RECORRIDO } from "../estilosRecorrido";

export const dynamic = "force-dynamic";

// COBRAR › COSAS A FACTURAR (Monica, 25-oct-2026; maqueta validada docs/figma/cosas-a-facturar.html): lo que ya se puede
// facturar, por direccion. Sustituye a «Facturable ya» y a «Generar proforma».

const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const hoyMs = () => Date.parse(new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }));
const hace = (iso: string | null) => {
  if (!iso) return "";
  const d = Math.max(0, Math.round((hoyMs() - Date.parse(iso.slice(0, 10))) / 86400000));
  return d === 0 ? "hoy" : `hace ${d} ${d === 1 ? "día" : "días"}`;
};

export default async function PaginaCosas() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion/cobrar/cosas");
  if (!puedeFacturacion(yo)) redirect("/menu");
  const filas = await listaCosas();
  return (
    <MarcoDinero yo={yo} area="cobrar" activo="cosas">
      <div className="rh">
        <style dangerouslySetInnerHTML={{ __html: ESTILOS_RECORRIDO }} />
        <div className="cab">
          <div>
            <h1>Cosas a facturar</h1>
            <p className="sub">
              Lo que ya se puede facturar, por dirección: hitos alcanzados de hojas que ya salieron de Nuevas hojas firmadas y aún sin proforma. Al abrir una:
              ¿lo tengo todo?, ¿qué facturo?, ¿quién factura? y la proforma.
            </p>
          </div>
          <div className="der">
            <Link className="enlace" href="/facturacion/cobrar/emitidas">Proformas emitidas →</Link>
          </div>
        </div>
        {filas.length ? (
          <div className="caja" style={{ marginTop: 14 }}>
            <table>
              <thead>
                <tr><th>Dirección</th><th>Paga</th><th>Lo que toca</th><th style={{ textAlign: "right" }}>Importe</th><th>Desde</th><th>¿Lo tengo todo?</th><th /></tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.oppId}>
                    <td><div className="dir">{f.direccion}</div></td>
                    <td className="nw">{f.paga}</td>
                    <td>{f.hitos} {f.hitos === 1 ? "hito" : "hitos"} · {f.queToca}</td>
                    <td className="num"><b>{EUR.format(f.importe)} €</b></td>
                    <td className="nw">{hace(f.desde)}</td>
                    <td>{f.falta.length ? <span className="estado-cobro e-sin">falta {f.falta.join(", ")}</span> : <span className="estado-cobro e-ok">✓ todo</span>}</td>
                    <td className="acc"><Link className="btn peq" href={`/facturacion/cobrar/cosas/${f.oppId}`}>Abrir</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="nota" style={{ marginTop: 16 }}>Nada por facturar ahora mismo.</p>
        )}
      </div>
    </MarcoDinero>
  );
}
