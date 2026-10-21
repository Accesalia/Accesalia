import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { quienSoy } from "../../../lib/sesion";
import { historico, type Clave, type PorAno } from "../../../lib/historico";
import { Sali } from "./Sali";

export const dynamic = "force-dynamic";
// Sali consulta antes de contestar: puede tardar mas de un minuto
export const maxDuration = 300;

// NEGOCIO › HISTÓRICO FACTURADO (Monica, 21-oct-2026). Solo direccion. Ver lib/historico.ts.

const EUR0 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" });
const e0 = (v: number | null) => (v == null ? "" : `${v < 0 ? "−" : ""}${EUR0.format(Math.abs(Math.round(v)))}`);
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const PESTANAS: [Clave, string][] = [["accesalia", "Accesalia"], ["daniel", "Daniel"], ["las_dos", "Las dos juntas"]];

function Tabla({ titulo, sub, p, anos, tono }: { titulo: string; sub?: string; p: PorAno; anos: number[]; tono?: "resultado" | "suave" }) {
  const filas = anos.filter((y) => p[y]?.some((v) => v != null));
  if (!filas.length) return null;
  const total = (y: number) => (p[y].some((v) => v != null) ? p[y].reduce<number>((s, v) => s + (v ?? 0), 0) : null);
  const color = (v: number | null) => (tono === "resultado" && v != null ? (v < 0 ? "text-alerta" : "text-lima-dark") : "");
  return (
    <section className="mt-5 w-fit rounded-2xl border border-black/10 bg-white px-3 pb-3 pt-3">
      <h2 className="ml-2 text-[13px] font-extrabold uppercase tracking-widest text-carbon/75">{titulo}</h2>
      {sub && <p className="mb-1 ml-2 text-[12px] text-carbon/60">{sub}</p>}
      <table className="w-auto border-collapse tabular-nums">
        <thead>
          <tr className="text-[10.5px] font-bold uppercase tracking-wide text-carbon/60">
            <th className="px-2 py-1 text-left">Año</th>
            {MESES.map((m) => <th key={m} className="px-2 py-1 text-right">{m}</th>)}
            <th className="border-l border-black/10 px-2 py-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((y) => (
            <tr key={y} className={`border-t border-black/5 text-[12.5px] ${tono === "suave" ? "text-carbon/70" : ""}`}>
              <td className="px-2 py-1 font-bold">{y}</td>
              {p[y].map((v, m) => <td key={m} className={`whitespace-nowrap px-2 py-1 text-right ${color(v)}`}>{e0(v)}</td>)}
              <td className={`whitespace-nowrap border-l border-black/10 px-2 py-1 text-right font-bold ${color(total(y))}`}>{e0(total(y))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default async function Historico({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/negocio/historico");
  if (!yo.veTodo) redirect("/menu");
  const sp = await searchParams;
  const ver: Clave = PESTANAS.some(([k]) => k === sp.ver) ? (sp.ver as Clave) : "accesalia";
  const h = await historico();
  const x = h.e[ver];
  const c = h.conGastos[ver];
  const txt = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
  const desde = c ? txt(c.desde) : "—";
  const hasta = c ? txt(c.hasta) : "—";

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <Salida href="/negocio">← Negocio</Salida>
        <div className="mt-3 flex flex-wrap items-center gap-6">
          <h1 className="text-3xl font-bold text-carbon sm:text-4xl">Histórico facturado</h1>
          <div className="inline-flex rounded-lg bg-[#e3e6df] p-0.5">
            {PESTANAS.map(([k, t]) => (
              <Link key={k} href={`/negocio/historico?ver=${k}`} className={`rounded-md px-3 py-1 text-[13.5px] font-semibold ${k === ver ? "bg-carbon text-white" : "text-carbon/70 hover:text-carbon"}`}>{t}</Link>
            ))}
          </div>
        </div>
        <p className="mt-1 text-[13px] text-carbon/65">
          Facturado: base sin IVA, con los abonos restados. Gastos y resultado: desde que hay extractos del banco ({desde} a {hasta}).
          {ver === "las_dos" && " Juntas, sin duplicar lo de casa: lo que Daniel factura a Accesalia no es ingreso ni gasto del grupo, y los traspasos entre cuentas no cuentan."}
        </p>

        <Sali pantalla="Negocio › Histórico facturado" />

        <Tabla titulo="Facturado" p={x.facturado} anos={h.anos} />
        {ver === "daniel" && <Tabla titulo="De lo facturado, a Accesalia" sub="Las facturas de Daniel a Accesalia: en «Las dos juntas» no cuentan." p={x.internas} anos={h.anos} tono="suave" />}
        <Tabla titulo="Gastos" sub={`Lo que salió del banco y es gasto de la actividad (los gastos llevan IVA).${ver === "accesalia" ? " Incluye lo que le factura Daniel." : ""} Sin impuestos ni lo personal de Daniel, que van aparte.`} p={x.gastos} anos={h.anos} />
        <Tabla titulo="Resultado" sub="Facturado − gastos, en los meses con extracto." p={x.resultado} anos={h.anos} tono="resultado" />
        <Tabla titulo="Resultado afinado, sin el IVA de los gastos"
          sub="Lo facturado va sin IVA y los gastos del banco lo llevan: aquí se le quita el 21 % a lo que lleva IVA (proveedores, alquiler, coches, software, material…). Las nóminas, la SS, los préstamos, los seguros, el banco y las tasas no llevan IVA y se quedan igual. Da mejor idea de cómo evoluciona el negocio."
          p={x.resultadoSinIva} anos={h.anos} tono="resultado" />
        <Tabla titulo="Impuestos pagados" sub="Aparte: no restan en el resultado (el IVA se cobra al cliente y se pasa a Hacienda)." p={x.impuestos} anos={h.anos} tono="suave" />
        <Tabla titulo="Personal de Daniel" sub="Aparte: la casa y los gastos suyos no son gasto de la actividad." p={x.personal} anos={h.anos} tono="suave" />
      </main>
    </div>
  );
}
