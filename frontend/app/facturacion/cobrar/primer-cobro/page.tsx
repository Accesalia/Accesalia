import Link from "next/link";
import { redirect } from "next/navigation";
import { quienSoy } from "../../../../lib/sesion";
import { primerCobro, puedeFacturacion } from "../../../../lib/recorridoHoja";
import { MarcoDinero } from "../../MarcoDinero";
import { ESTILOS_RECORRIDO } from "../estilosRecorrido";

export const dynamic = "force-dynamic";

// COBRAR › PRIMER COBRO (Monica, 25-oct-2026; maqueta validada docs/figma/recorrido-hoja-firmada.html, pantalla 2).
// Lo que ha pasado a cobro desde Nuevas hojas firmadas y espera el pago del primer hito: lo mas importante de cobrar,
// porque es lo que mete la hoja en produccion. Al cobrarse (justificante), la hoja pasa a la bandeja comercial.
// «Preparar el cobro» abre el proceso de siempre (Generar proforma) con su direccion.

const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const hoyMs = () => Date.parse(new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }));
function hace(iso: string) {
  const d = Math.max(0, Math.round((hoyMs() - Date.parse(iso.slice(0, 10))) / 86400000));
  return d === 0 ? "hoy" : `hace ${d} ${d === 1 ? "día" : "días"}`;
}

export default async function PaginaPrimerCobro() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion/cobrar/primer-cobro");
  if (!puedeFacturacion(yo)) redirect("/menu");
  const { alContratar, sinContratar } = await primerCobro();
  return (
    <MarcoDinero yo={yo} area="cobrar" activo="primer-cobro">
      <div className="rh">
        <style dangerouslySetInnerHTML={{ __html: ESTILOS_RECORRIDO }} />
        <div className="cab">
          <div>
            <h1>Primer cobro</h1>
            <p className="sub">Lo que ha pasado a cobro y espera el pago del primer hito. Al subir el justificante, la hoja pasa a la bandeja comercial y empieza la producción.</p>
          </div>
          <div className="der">
            <Link className="enlace" href="/facturacion/cobrar/diario">Diario de trabajo →</Link>
          </div>
        </div>

        <div className="sec-tit">Se cobra al contratar <span className="n">{alContratar.length} {alContratar.length === 1 ? "hoja" : "hojas"}</span></div>
        {alContratar.length ? (
          <div className="caja">
            <table>
              <thead>
                <tr><th>Dirección</th><th>Paga</th><th style={{ textAlign: "right" }}>Al contratar</th><th>Después</th><th>Desde</th><th>Cómo va el cobro</th><th /></tr>
              </thead>
              <tbody>
                {alContratar.map((f) => (
                  <tr key={f.hojaId}>
                    <td><div className="dir">{f.direccion}</div><div className="hoja">{f.hoja}</div></td>
                    <td className="nw">{f.paga}{f.forma && <div className="hoja">{f.forma}</div>}</td>
                    <td className="num"><b>{EUR.format(f.alContratar)} €</b><div className="hoja">{f.alTxt}</div></td>
                    <td className="resto">{f.despues.join(" · ")}</td>
                    <td className="nw">{hace(f.desde)}</td>
                    <td>
                      <span className={`estado-cobro ${f.cobro.como === "sin" ? "e-sin" : f.cobro.como === "factura" ? "e-ok" : "e-env"}`}>{f.cobro.texto}</span>
                      {f.cobro.sinRespuesta && <div><span className="pill p-ambar" style={{ marginTop: 4 }}>sin respuesta en 3 días laborables</span></div>}
                    </td>
                    <td className="acc">
                      {f.cobro.proformaId ? (
                        <Link className="btn peq sec" href={`/facturacion/proforma/${f.cobro.proformaId}`}>Abrir la proforma</Link>
                      ) : f.oppId ? (
                        <Link className="btn peq" href={`/facturacion/cobrar/proforma?opp=${f.oppId}`}>Preparar el cobro</Link>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="nota">Nada esperando el primer cobro. Las hojas llegan aquí desde Nuevas hojas firmadas, con «Pasa a cobro del primer hito».</p>
        )}
        <p className="nota">«Preparar el cobro» abre Generar proforma con su dirección: marcas lo que se factura y sale la proforma.</p>

        {sinContratar.length > 0 && (
          <>
            <div className="sec-tit">Pasadas a cobro sin cobro al contratar <span className="n">esperan a su hito; si es un error, se devuelven desde el diario</span></div>
            <div className="caja">
              <table>
                <thead><tr><th>Dirección</th><th>Paga</th><th>Primer hito</th><th>Desde</th><th /></tr></thead>
                <tbody>
                  {sinContratar.map((f) => (
                    <tr key={f.hojaId}>
                      <td><div className="dir">{f.direccion}</div><div className="hoja">{f.hoja}</div></td>
                      <td className="nw">{f.paga}</td>
                      <td>{f.primerHito}</td>
                      <td className="nw">{hace(f.desde)}</td>
                      <td className="acc"><Link className="enlace" href="/facturacion/cobrar/diario">Ver en el diario</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </MarcoDinero>
  );
}
