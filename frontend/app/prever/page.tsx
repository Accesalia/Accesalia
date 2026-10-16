import { redirect } from "next/navigation";
import { quienSoy } from "../../lib/sesion";
import { calendarioFiscal } from "../../lib/fiscal";
import { datosCaja } from "../../lib/cobros";
import { MarcoDinero } from "../facturacion/MarcoDinero";
import { Llegamos, mesesPrever, porMes } from "./Llegamos";

export const dynamic = "force-dynamic";

// PREVER › ¿LLEGAMOS? (Monica, 12-oct-2026: "una pantalla que avise: este mes,
// gastos previstos... e ingresos estimados, para saber si llegamos. ¿Tenemos
// caja para hacer frente a todo o tocamos asignaciones para adelantar
// proyectos?"). Desde el 16-oct, la pantalla de la maqueta validada dentro del
// marco comun del dinero; lo que aun no tiene dato, hueco. Ver Llegamos.tsx.
// Es del libro de Accesalia y Daniel.

const hoyMadrid = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());

/** Las facturas emitidas de Accesalia y Daniel (2025-26) que quedan por cobrar.
 *  COBRADO = JUSTIFICANTE SUBIDO (Monica, 16-oct-2026): lo que falta es el total
 *  menos sus cobros (tabla cobros; negativo en las devoluciones). Un cobro con el
 *  importe sin leer cuenta como cobrado (el justificante esta). Las que Factusol
 *  da por cobradas sin justificante NO son dinero por entrar: van aparte. */
async function porCobrar() {
  const r = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/facturas?select=total,estado,cobros(importe)&tipo=eq.factura&estado=neq.anulada&empresa_emisora=in.(accesalia,daniel)&fecha=gte.2025-01-01`,
    { headers: { apikey: process.env.SUPABASE_SECRET_KEY ?? "", Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY ?? ""}` }, cache: "no-store" },
  );
  if (!r.ok) throw new Error(`Supabase facturas ${r.status}: ${await r.text()}`);
  const filas = (await r.json()) as { total: number | null; estado: string; cobros: { importe: number | null }[] }[];
  const out = { importe: 0, facturas: 0, sinJustificante: { importe: 0, facturas: 0 } };
  for (const f of filas) {
    if (f.cobros.some((c) => c.importe == null)) continue;
    const falta = Number(f.total ?? 0) - f.cobros.reduce((s, c) => s + Number(c.importe), 0);
    if (falta <= 1) continue;
    const a = f.estado === "cobrada" ? out.sinJustificante : out;
    a.importe += falta;
    a.facturas++;
  }
  return out;
}

export default async function PaginaPrever() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/prever");
  if (!(yo.veTodo || yo.funciones.some((f) => f.clave === "facturacion"))) redirect("/menu");
  const hoy = hoyMadrid();
  const [impuestos, caja, cobrar] = await Promise.all([calendarioFiscal("accesalia"), datosCaja(), porCobrar()]);
  const meses = porMes(mesesPrever(hoy, 6), caja.fijos, impuestos, hoy);
  const pasados = caja.fijos.filter((f) => f.fecha < hoy);
  const vencido = { importe: pasados.reduce((s, f) => s + f.importe, 0), hitos: pasados.length };
  return (
    <MarcoDinero yo={yo} area="prever" activo="llegamos">
      <div className="mb-[22px] flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[30px] font-[750] leading-[1.1] tracking-[-.5px] text-carbon">¿Llegamos?</h1>
          <div className="mt-1.5 text-[14.5px] text-carbon/65">
            Accesalia y Daniel juntos · saldo de hoy en banco: <span className="font-semibold text-amber-800/80">sin dato todavía</span>
          </div>
        </div>
        <div className="flex gap-2.5">
          <span className="inline-flex h-10 items-center rounded-[9px] border border-[#d6dad2] bg-white px-[18px] text-[14px] font-bold text-carbon-soft">Próximos 6 meses</span>
          <span className="inline-flex h-10 cursor-default items-center gap-2 rounded-[9px] bg-carbon px-[18px] text-[14px] font-bold text-white opacity-50" title="Se monta cuando estén los supuestos">
            Escenario: tal como va <span className="text-[10px] font-semibold uppercase tracking-wide">luego</span>
          </span>
        </div>
      </div>
      <Llegamos meses={meses} vencido={vencido} porCobrar={cobrar} sinFecha={caja.sinFecha} />
    </MarcoDinero>
  );
}
