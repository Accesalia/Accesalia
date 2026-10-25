import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { quienSoy } from "../../../lib/sesion";
import { puedeVerClientesFactusol } from "../../../lib/factusolClientes";
import { cotejoFactusol, type Diferencia } from "../../../lib/factusolCotejo";
import { ESTILOS_COBRO_AJUSTES } from "../estilosCobroAjustes";
import { RevisarAhora } from "./RevisarAhora";

export const dynamic = "force-dynamic";

// COBRAR > AJUSTES > PEDIDOS Y FACTURAS DE FACTUSOL (Monica, 25-oct-2026): lo que la pasada de cada noche copia de
// Factusol, cotejado con la app. Arriba, lo que no casa: facturas que faltan en la app o con otro importe, pedidos hechos
// directamente en Factusol y numeros que chocan con una proforma de la app. Aqui no se cambia nada.

const HORA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const EMPRESA: Record<string, string> = { accesalia: "Accesalia", daniel: "Daniel", ecobalance: "Ecobalance" };

function Tabla({ titulo, explica, filas }: { titulo: string; explica: string; filas: Diferencia[] }) {
  return (
    <>
      <div className="sec-tit">{titulo} <span className="n">{filas.length ? `${filas.length} · ${explica}` : "ninguna"}</span></div>
      {filas.length > 0 && (
        <div className="caja">
          <table>
            <thead><tr><th>Empresa</th><th>Documento</th><th>Fecha</th><th>Referencia</th><th>Cliente</th><th style={{ textAlign: "right" }}>Total</th><th>Qué pasa</th></tr></thead>
            <tbody>
              {filas.map((f) => (
                <tr key={`${f.empresa}${f.doc}`}>
                  <td className="corto">{EMPRESA[f.empresa] ?? f.empresa}</td>
                  <td className="nom">{f.doc}</td>
                  <td className="corto">{f.fecha ? FECHA.format(new Date(f.fecha + "T00:00:00Z")).replace(".", "") : ""}</td>
                  <td className="largo">{f.referencia}</td>
                  <td className="largo">{f.cliente}</td>
                  <td className="corto" style={{ textAlign: "right" }}><b>{EUR.format(f.total)} €</b></td>
                  <td className="largo">{f.dice}{f.enlace && <> <a className="enlace" href={f.enlace}>abrir</a></>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default async function PaginaDocumentosFactusol() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/gestiones/factusol-documentos");
  if (!puedeVerClientesFactusol(yo)) redirect("/menu");
  const c = await cotejoFactusol();
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <div className="cc">
        <style dangerouslySetInnerHTML={{ __html: ESTILOS_COBRO_AJUSTES }} />
        <main className="mx-auto max-w-[1300px] px-4 pb-16 pt-5 sm:px-6">
          <a className="salida" href="/facturacion/cobrar">← Cobrar</a>
          <div className="cab">
            <div>
              <h1>Pedidos y facturas de Factusol</h1>
              <p>Lo que hay en Factusol, copiado cada noche y cotejado con la app. Factusol manda: aquí no se cambia nada.</p>
            </div>
            <div className="der"><RevisarAhora /></div>
          </div>
          <div className="estado">
            <span>Última lectura: <b>{c.leido ? HORA.format(new Date(c.leido)) : "nunca"}</b></span>
            <span>Este año y el anterior: <b>{c.cuentas.pedidos}</b> pedidos, <b>{c.cuentas.facturas}</b> facturas y <b>{c.cuentas.abonos}</b> abonos</span>
            <span>Cada noche a las 4:30</span>
          </div>
          <Tabla titulo="Números que chocan" explica="el pedido de Factusol tiene el mismo número que una proforma de la app distinta" filas={c.choques} />
          <Tabla titulo="Facturas que faltan en la app" explica="están en Factusol y la app no las tiene" filas={c.facturasQueFaltan} />
          <Tabla titulo="Facturas que no casan" explica="otro importe, o anuladas en Factusol y en la app no" filas={c.facturasQueNoCasan} />
          <Tabla titulo="Pedidos hechos directamente en Factusol" explica="no tienen proforma en la app" filas={c.pedidosSinProforma} />
        </main>
      </div>
    </div>
  );
}
