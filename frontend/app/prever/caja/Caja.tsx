import type { CajaMes, LineaCaja } from "../../../lib/cajaMes";
import type { Empresa } from "../../../lib/fiscalTextos";

// LA CAJA DEL MES (Monica, 17-oct-2026): arriba lo que sale (por Accesalia, por
// Daniel y de las dos) y lo que entra; debajo los impuestos y los gastos en
// columnas por empresa, y los ingresos en un solo saco. Tranquila, como la
// nueva de Impuestos: letra pequeña, el color solo para lo que importa.

const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const EUR0 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" });
const DIA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" });
const dia = (iso: string | null) => (iso ? DIA.format(new Date(iso.slice(0, 10) + "T00:00:00Z")).replace(".", "") : "");
const NOMBRE: Record<Empresa, string> = { accesalia: "Accesalia", daniel_autonomo: "Daniel", ecobalance: "Ecobalance" };

const suma = (l: LineaCaja[]) => l.reduce((s, x) => s + (x.importe ?? 0), 0);
const faltan = (l: LineaCaja[]) => l.filter((x) => x.importe == null).length;
const conQ = (n: number, q: number) => `${EUR0.format(n)} €${q ? " + ?" : ""}`;

function Cifra({ titulo, valor, pie, fuerte }: { titulo: string; valor: string; pie?: string; fuerte?: boolean }) {
  return (
    <div className={`w-[200px] rounded-xl border px-4 py-3 ${fuerte ? "border-carbon/30 bg-white" : "border-black/10 bg-white"}`}>
      <div className="text-[11px] font-bold uppercase tracking-wide text-carbon/55">{titulo}</div>
      <div className={`mt-0.5 tabular-nums text-carbon ${fuerte ? "text-[22px] font-bold" : "text-[19px] font-semibold"}`}>{valor}</div>
      {pie && <div className="text-[12px] text-carbon/60">{pie}</div>}
    </div>
  );
}

/** Una tabla con una columna por empresa y el total. */
function Tabla({ titulo, lineas, empresas, vacio }: { titulo: string; lineas: LineaCaja[]; empresas: Empresa[]; vacio: string }) {
  const varias = empresas.length > 1;
  return (
    <section className="w-fit rounded-xl border border-black/10 bg-white px-4 py-3">
      <h3 className="text-[14.5px] font-bold text-carbon">{titulo}</h3>
      {!lineas.length ? (
        <p className="mt-1 text-[12.5px] text-carbon/60">{vacio}</p>
      ) : (
        <table className="mt-1.5 w-auto border-collapse text-[12.5px] tabular-nums">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-wide text-carbon/50">
              <th className="w-14 py-1 text-left font-semibold">Día</th>
              <th className="py-1 text-left font-semibold">Concepto</th>
              {empresas.map((e) => (
                <th key={e} className="w-28 py-1 text-right font-semibold">{NOMBRE[e]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lineas.map((x, i) => (
              <tr key={i} className="border-t border-black/5 text-carbon">
                <td className="py-1 text-carbon/60">{dia(x.fecha)}</td>
                <td className="max-w-[300px] py-1 pr-4" title={x.nota ?? undefined}>
                  {x.concepto}
                  {x.nota && <span className="ml-1 text-carbon/40">ⓘ</span>}
                </td>
                {empresas.map((e) => (
                  <td key={e} className="py-1 text-right">
                    {x.empresa !== e ? "" : x.importe == null ? <span className="text-carbon/45">por saber</span> : `${x.estimado ? "≈ " : ""}${EUR.format(x.importe)}`}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-black/15 font-bold text-carbon">
              <td />
              <td className="py-1.5">Total{varias ? ` · las dos: ${conQ(suma(lineas), faltan(lineas))}` : ""}</td>
              {empresas.map((e) => {
                const de = lineas.filter((x) => x.empresa === e);
                return (
                  <td key={e} className="py-1.5 text-right">{conQ(suma(de), faltan(de))}</td>
                );
              })}
            </tr>
          </tbody>
        </table>
      )}
    </section>
  );
}

export function Caja({ c }: { c: CajaMes }) {
  const sale = [...c.impuestos, ...c.gastos];
  const entra = c.ingresos.reduce((s, x) => s + x.importe, 0);
  const total = suma(sale);
  const varias = c.empresas.length > 1;
  return (
    <>
      <div className="mb-5 flex flex-wrap gap-3">
        {varias &&
          c.empresas.map((e) => {
            const de = sale.filter((x) => x.empresa === e);
            return <Cifra key={e} titulo={`Sale · ${NOMBRE[e]}`} valor={conQ(suma(de), faltan(de))} />;
          })}
        <Cifra fuerte titulo={varias ? "Sale · las dos" : "Sale"} valor={conQ(total, faltan(sale))} pie="impuestos y gastos" />
        <Cifra titulo="Entra (previsto)" valor={`${EUR0.format(entra)} €`} pie={`${c.ingresos.length} hito${c.ingresos.length === 1 ? "" : "s"} con fecha · de momento solo eso`} />
        <Cifra titulo="Queda" valor={`${entra - total >= 0 ? "" : "−"}${EUR0.format(Math.abs(entra - total))} €`} pie="lo que entra menos lo que sale" />
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex flex-col gap-4">
          <Tabla titulo="Impuestos" lineas={c.impuestos} empresas={c.empresas} vacio="Este mes no se paga ningún impuesto." />
          <section className="w-[520px] rounded-xl border border-black/10 bg-white px-4 py-3">
            <h3 className="text-[14.5px] font-bold text-carbon">Ingresos previstos</h3>
            {c.ingresos.length ? (
              <ul className="mt-1 text-[12.5px] tabular-nums">
                {c.ingresos.map((x, i) => (
                  <li key={i} className="flex gap-2 border-t border-black/5 py-1 first:border-0">
                    <span className="w-14 shrink-0 text-carbon/60">{dia(x.fecha)}</span>
                    <span className="w-[340px] truncate">{x.concepto}</span>
                    <span className="w-20 text-right">{EUR.format(x.importe)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[12.5px] text-carbon/60">Ningún hito con fecha de cobro este mes.</p>
            )}
            <p className="mt-2 rounded-md bg-amber-50/70 px-2 py-1.5 text-[12px] text-amber-900/80">
              De momento, solo los hitos con fecha pactada. Lo que se cobrará al entregar los proyectos vendrá de Asignar, cuando estén las demás áreas.
            </p>
          </section>
        </div>
        <Tabla titulo="Gastos" lineas={c.gastos} empresas={c.empresas} vacio="No hay gastos habituales cargados para este libro." />
      </div>
      <p className="mt-3 text-[12px] text-carbon/60">
        ≈ previsto. Los gastos salen de tu Excel de impuestos y se contrastarán con los extractos del banco; ⓘ al pasar el ratón, su nota.
      </p>
    </>
  );
}
