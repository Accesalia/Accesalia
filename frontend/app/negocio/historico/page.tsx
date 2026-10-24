import Link from "next/link";
import { redirect } from "next/navigation";
import { quienSoy } from "../../../lib/sesion";
import { historico, type Clave, type PorAno } from "../../../lib/historico";
import { Sali } from "../../components/sali/Sali";
import { BloqueTrabajo, PaginaTrabajo } from "../../components/CabeceraTrabajo";

export const dynamic = "force-dynamic";
// Sali consulta antes de contestar: puede tardar mas de un minuto
export const maxDuration = 300;

// NEGOCIO › HISTÓRICO FACTURADO (Monica, 21-oct-2026). Solo direccion. Ver lib/historico.ts.
// 24-oct-2026, Monica: «no es que la pantalla este mal, es que se queda corta». Separar
// impuestos y lo personal hacia parecer el negocio mejor de lo que es. ARRIBA, su cuenta,
// las dos juntas y con IVA: el resultado del negocio (impuestos incluidos) y lo que queda
// en la cuenta (ademas, lo personal): «si llego o no a fin de mes». DEBAJO, las tablas de
// siempre, en pestañas.

const EUR0 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" });
const e0 = (v: number | null) => (v == null ? "" : `${v < 0 ? "−" : ""}${EUR0.format(Math.abs(Math.round(v)))}`);
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const EMPRESAS: [Clave, string][] = [["accesalia", "Accesalia"], ["daniel", "Daniel"], ["las_dos", "Las dos juntas"]];
type Pestana = "facturado" | "gastos" | "resultado" | "resultadoSinIva" | "impuestos" | "personal" | "internas";
const PESTANAS: { k: Pestana; t: string; sub: (ver: Clave) => string; tono?: "resultado" | "suave"; solo?: Clave[] }[] = [
  { k: "facturado", t: "Facturado", sub: () => "Base sin IVA, con los abonos restados." },
  {
    k: "gastos",
    t: "Gastos",
    sub: (ver) =>
      `Lo que salió del banco y es gasto de la actividad (los gastos llevan IVA).${ver === "accesalia" ? " Incluye lo que le factura Daniel." : ""} Sin impuestos ni lo personal de Daniel, que tienen su pestaña.`,
  },
  { k: "resultado", t: "Resultado", sub: () => "Facturado − gastos, en los meses con extracto. Sin impuestos ni lo personal.", tono: "resultado" },
  {
    k: "resultadoSinIva",
    t: "Resultado sin IVA",
    sub: () =>
      "Lo facturado va sin IVA y los gastos del banco lo llevan: aquí se le quita el 21 % a lo que lleva IVA (proveedores, alquiler, coches, software, material…). Las nóminas, la SS, los préstamos, los seguros, el banco y las tasas se quedan igual.",
    tono: "resultado",
  },
  { k: "impuestos", t: "Impuestos", sub: () => "Lo pagado a Hacienda, en el mes en que se paga: IVA, IRPF, Sociedades, aplazamientos.", tono: "suave" },
  { k: "personal", t: "Personal de Daniel", sub: () => "La casa y los gastos suyos.", tono: "suave" },
  { k: "internas", t: "A Accesalia", sub: () => "Las facturas de Daniel a Accesalia: en «Las dos juntas» no cuentan.", tono: "suave", solo: ["daniel"] },
];

function Tabla({ p, anos, tono }: { p: PorAno; anos: number[]; tono?: "resultado" | "suave" }) {
  const filas = anos.filter((y) => p[y]?.some((v) => v != null)).reverse();
  if (!filas.length) return <p className="px-4 py-3 text-[13px] text-carbon/60">Sin datos.</p>;
  const total = (y: number) => (p[y].some((v) => v != null) ? p[y].reduce<number>((s, v) => s + (v ?? 0), 0) : null);
  const color = (v: number | null) => (tono === "resultado" && v != null ? (v < 0 ? "text-[#b23a2c]" : "text-[#2f6a14]") : "");
  return (
    <table className="w-auto border-collapse tabular-nums">
      <thead className="bg-[#2e3236]">
        <tr className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#f3f4f1]/80">
          <th className="px-2.5 py-2 text-left">Año</th>
          {MESES.map((m) => (
            <th key={m} className="px-2.5 py-2 text-right">{m}</th>
          ))}
          <th className="border-l border-white/15 px-2.5 py-2 text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((y) => (
          <tr key={y} className={`border-t border-black/[0.07] text-[12.5px] ${tono === "suave" ? "text-carbon/75" : ""}`}>
            <td className="px-2.5 py-1.5 font-bold">{y}</td>
            {p[y].map((v, m) => (
              <td key={m} className={`whitespace-nowrap px-2.5 py-1.5 text-right ${color(v)}`}>{e0(v)}</td>
            ))}
            <td className={`whitespace-nowrap border-l border-black/10 px-2.5 py-1.5 text-right font-extrabold ${color(total(y))}`}>{e0(total(y))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const tarjeta = "w-fit max-w-full overflow-x-auto rounded-[7px] bg-white shadow-[0_1px_2px_rgba(0,0,0,.25),0_12px_26px_-14px_rgba(0,0,0,.6)]";
const boton = (activo: boolean) =>
  `rounded-[5px] border px-3 py-1.5 text-[13px] font-bold transition ${activo ? "border-white bg-white text-carbon" : "border-white/20 bg-white/[0.06] text-[#f3f4f1] hover:bg-white/[0.12]"}`;

export default async function Historico({ searchParams }: { searchParams: Promise<{ ver?: string; tabla?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/negocio/historico");
  if (!yo.veTodo) redirect("/menu");
  const sp = await searchParams;
  const ver: Clave = EMPRESAS.some(([k]) => k === sp.ver) ? (sp.ver as Clave) : "accesalia";
  const pestanas = PESTANAS.filter((x) => !x.solo || x.solo.includes(ver));
  const pestana = pestanas.find((x) => x.k === sp.tabla) ?? pestanas[0];
  const h = await historico();
  const c = h.conGastos[ver];
  const juntas = h.conGastos.las_dos;
  const txt = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
  const url = (v: Clave, t: Pestana) => `/negocio/historico?ver=${v}&tabla=${t}`;

  return (
    <PaginaTrabajo
      grupo="direccion"
      area="Negocio"
      salida={{ href: "/negocio", texto: "← Negocio" }}
      titulo="Histórico facturado"
      subtitulo="Si llegamos o no a fin de mes: lo que entra, lo que sale y lo que queda, mes a mes y año a año."
      color="azul"
      icono="historico"
    >
      <BloqueTrabajo
        titulo="Resultado del negocio · las dos juntas"
        color="azul"
        nota={`Lo facturado con su IVA, menos los gastos del negocio, menos los impuestos. Con IVA en todo, como se ve en el banco. Lo que Daniel factura a Accesalia no cuenta, y los traspasos entre cuentas tampoco. Meses con extracto de las dos${juntas ? ` (${txt(juntas.desde)} a ${txt(juntas.hasta)})` : ""}.`}
      >
        <div className={tarjeta}>
          <Tabla p={h.monica.negocio} anos={h.anos} tono="resultado" />
        </div>
      </BloqueTrabajo>

      <BloqueTrabajo titulo="Lo que queda en la cuenta · las dos juntas" color="azul" nota="El resultado del negocio, menos lo personal de Daniel. Es lo que explica cómo está la cuenta.">
        <div className={tarjeta}>
          <Tabla p={h.monica.cuenta} anos={h.anos} tono="resultado" />
        </div>
      </BloqueTrabajo>

      <BloqueTrabajo titulo="El detalle" color="azul" nota={`Cada cosa por separado, por empresa. Gastos y resultado: desde que hay extractos del banco (${c ? `${txt(c.desde)} a ${txt(c.hasta)}` : "—"}).`}>
        <div className="flex flex-wrap gap-1.5">
          {EMPRESAS.map(([k, t]) => (
            <Link key={k} href={url(k, pestana.k)} className={boton(k === ver)}>{t}</Link>
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {pestanas.map((x) => (
            <Link key={x.k} href={url(ver, x.k)} className={boton(x.k === pestana.k)}>{x.t}</Link>
          ))}
        </div>
        <p className="mt-2.5 max-w-[90ch] text-[13px] text-[#f3f4f1]/75">{pestana.sub(ver)}</p>
        <div className={`${tarjeta} mt-3`}>
          <Tabla p={h.e[ver][pestana.k]} anos={h.anos} tono={pestana.tono} />
        </div>
      </BloqueTrabajo>

      <BloqueTrabajo titulo="Pregúntale a Sali" color="azul">
        <div className="rounded-[7px] bg-white p-1">
          <Sali pantalla="Negocio › Histórico facturado" />
        </div>
      </BloqueTrabajo>
    </PaginaTrabajo>
  );
}
