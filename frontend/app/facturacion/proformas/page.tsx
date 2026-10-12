import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Volver } from "../../components/Volver";
import { quienSoy } from "../../../lib/sesion";
import { puedeVerCobros, puedeVerEcobalance, type Libro } from "../../../lib/cobros";
import { listaProformas } from "../../../lib/proformas";

export const dynamic = "force-dynamic";

// LAS PROFORMAS DEL MES (Monica, 12-oct-2026): "por meses, por facilidad a la
// hora de agruparlo luego". Cada libro las suyas: Alexandra, Accesalia y
// Daniel; Ana, Ecobalance. Las que siguen sin factura, a la vista.

const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const MES = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function Proformas({ searchParams }: { searchParams: Promise<{ mes?: string; libro?: string }> }) {
  const sp = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion/proformas");
  const veAcc = puedeVerCobros(yo), veEco = puedeVerEcobalance(yo);
  if (!veAcc && !veEco) redirect("/menu");
  const libro: Libro = sp.libro === "ecobalance" && veEco ? "ecobalance" : veAcc ? "accesalia" : "ecobalance";
  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }).slice(0, 7);
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : hoy;
  const lista = await listaProformas(libro, { mes });
  const [a, m] = mes.split("-").map(Number);
  const otro = (d: number) => {
    const f = new Date(Date.UTC(a, m - 1 + d, 1));
    return `${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  const enlace = (x: { mes?: string; libro?: Libro }) => `/facturacion/proformas?mes=${x.mes ?? mes}&libro=${x.libro ?? libro}`;
  const sinFactura = lista.filter((p) => p.estado === "emitida" && !p.facturada);
  const th = "px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-wide text-carbon/60";

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-5 text-sm sm:px-6">
        <Volver siNoHay="/facturacion" />
        <h1 className="mt-3 text-3xl font-bold text-carbon">Proformas</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {veAcc && veEco && (
            <nav className="flex gap-1">
              {(["accesalia", "ecobalance"] as Libro[]).map((l) => (
                <Link key={l} href={enlace({ libro: l })} className={"rounded-full border px-3 py-1 text-[13px] " + (l === libro ? "border-carbon bg-carbon font-semibold text-white" : "border-carbon/25 bg-white")}>
                  {l === "accesalia" ? "Accesalia y Daniel" : "Ecobalance"}
                </Link>
              ))}
            </nav>
          )}
          <div className="flex items-center gap-2">
            <Link href={enlace({ mes: otro(-1) })} className="rounded-lg border border-black/15 bg-white px-2 py-0.5">
              ‹
            </Link>
            <span className="min-w-[140px] text-center font-semibold capitalize">{MES.format(new Date(Date.UTC(a, m - 1, 1)))}</span>
            <Link href={enlace({ mes: otro(1) })} className="rounded-lg border border-black/15 bg-white px-2 py-0.5">
              ›
            </Link>
          </div>
          <span className="text-carbon/65">
            {lista.length} proformas · {EUR.format(lista.filter((p) => p.estado === "emitida").reduce((s, p) => s + p.total, 0))} € · {sinFactura.length} sin factura
          </span>
        </div>
        <p className="mt-2 text-[12.5px] text-carbon/65">Se emiten desde la pantalla de cobro de cada oportunidad, marcando sus hitos.</p>

        {lista.length === 0 ? (
          <p className="mt-6 text-carbon/65">Ninguna proforma este mes.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10 bg-white shadow-sm">
            <table className="w-full text-[13.5px]">
              <thead className="border-b border-black/10">
                <tr>
                  <th className={th}>Proforma</th>
                  <th className={th}>Fecha</th>
                  <th className={th}>Dirección</th>
                  <th className={th}>A quién</th>
                  <th className={th + " text-right"}>Total</th>
                  <th className={th}>Factura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {lista.map((p) => (
                  <tr key={p.id} className={p.estado === "anulada" ? "text-carbon/45 line-through" : ""}>
                    <td className="px-3 py-2">
                      <Link href={`/facturacion/proforma/${p.id}`} className="font-mono font-semibold hover:underline">
                        {p.codigo}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{p.fecha.split("-").reverse().join("/")}</td>
                    <td className="px-3 py-2">{p.donde}</td>
                    <td className="px-3 py-2">{p.pagador}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{EUR.format(p.total)} €</td>
                    <td className="px-3 py-2">
                      {p.estado === "anulada" ? "anulada" : p.facturada ?? <span className="font-semibold text-amber-800">sin factura</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
