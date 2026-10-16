import type { Pago } from "../../lib/fiscalTextos";
import type { CobroFijo } from "../../lib/cobros";

// PREVER › ¿LLEGAMOS? (Monica, 16-oct-2026), la pantalla de la maqueta validada
// (docs/figma/area-dinero-v1.html, marco 6): el saldo mes a mes contra el minimo,
// que entra y que sale, y que palanca mover en Asignar si no llega.
// Con lo que hay HOY en la base: entra lo de los hitos con fecha prevista por
// facturar; sale lo de los impuestos con importe (los plazos de lo fraccionado).
// Lo demas (el saldo del banco, nominas, gastos fijos, proveedores, las entregas
// del cronograma) son HUECOS en ambar, con lo que les falta: no se inventa nada.

export type MesPrever = { mes: string; entra: number; hitos: number; sale: number; porSaber: number };

const EUR0 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" });
const MES_CORTO = new Intl.DateTimeFormat("es-ES", { month: "short", timeZone: "UTC" });
const MES_LARGO = new Intl.DateTimeFormat("es-ES", { month: "long", timeZone: "UTC" });
const mayus = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const fechaMes = (m: string) => new Date(m + "-01T00:00:00Z");
const mil = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}` : n > 0 ? "<1" : "0");

export function mesesPrever(hoy: string, n: number) {
  return Array.from({ length: n }, (_, i) => new Date(Date.UTC(Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7)) - 1 + i, 1)).toISOString().slice(0, 7));
}

/** Junta por mes lo que entra (hitos con fecha) y lo que sale (impuestos). */
export function porMes(meses: string[], fijos: CobroFijo[], impuestos: Pago[], hoy: string): MesPrever[] {
  return meses.map((m) => {
    const ent = fijos.filter((f) => f.fecha.startsWith(m) && f.fecha >= hoy);
    const sal = impuestos.filter((p) => p.fecha.startsWith(m) && p.estado === "pendiente" && !p.sinCargo && p.fecha >= hoy);
    return {
      mes: m,
      entra: ent.reduce((s, f) => s + f.importe, 0),
      hitos: ent.length,
      sale: sal.reduce((s, p) => s + (p.importe ?? 0), 0),
      porSaber: sal.filter((p) => p.importe == null).length,
    };
  });
}

const PANEL = "overflow-hidden rounded-[14px] border border-[#e3e6df] bg-white";
const PTIT = "flex items-center justify-between gap-3 border-b border-[#eef0eb] px-5 py-4";
const TH = "border-b border-[#e9ece5] bg-[#fafbf9] px-3.5 py-[11px] text-left text-[11.5px] font-bold uppercase tracking-[.08em] text-[#7b8077]";
const TD = "border-b border-[#f0f2ee] px-3.5 py-3 align-top";

function Kpi({ titulo, valor, nota, hueco }: { titulo: string; valor: string; nota: React.ReactNode; hueco?: boolean }) {
  return (
    <div className={`rounded-[14px] border px-5 py-[18px] ${hueco ? "border-amber-200 bg-amber-50/60" : "border-[#e3e6df] bg-white"}`}>
      <div className={`text-[12px] font-bold uppercase tracking-[.08em] ${hueco ? "text-amber-800/80" : "text-[#7b8077]"}`}>{titulo}</div>
      <div className={`mt-1 text-[32px] font-[750] tabular-nums tracking-[-.6px] ${hueco ? "text-amber-900/50" : "text-carbon"}`}>{valor}</div>
      <div className={`mt-0.5 text-[13px] ${hueco ? "text-amber-900/80" : "text-carbon/65"}`}>{nota}</div>
    </div>
  );
}

/** Las barras de entra y sale de cada mes. La linea del saldo y el minimo, cuando haya saldo. */
function Grafico({ meses }: { meses: MesPrever[] }) {
  const tope = Math.max(1000, ...meses.map((m) => Math.max(m.entra, m.sale)));
  const paso = tope > 40000 ? 20000 : tope > 20000 ? 10000 : 5000;
  const techo = Math.ceil(tope / paso) * paso;
  const y0 = 270, alto = 240;
  const y = (v: number) => y0 - (v / techo) * alto;
  const ancho = 880 / meses.length;
  const marcas = Array.from({ length: techo / paso + 1 }, (_, i) => i * paso);
  return (
    <svg width="100%" viewBox="0 0 1000 340" className="block" role="img" aria-label="Lo que entra y lo que sale cada mes">
      {marcas.map((v) => (
        <g key={v}>
          <line x1="100" x2="980" y1={y(v)} y2={y(v)} stroke="#eef0eb" />
          <text x="88" y={y(v) + 4} fontSize="12" fill="#7b8077" textAnchor="end">{EUR0.format(v)}</text>
        </g>
      ))}
      {meses.map((m, i) => {
        const cx = 100 + ancho * i + ancho / 2;
        return (
          <g key={m.mes}>
            <rect x={cx - 24} y={y(m.entra)} width="22" height={y0 - y(m.entra)} fill="#c6e5a8"><title>{`Entra ${EUR0.format(m.entra)} € · ${m.hitos} hitos con fecha`}</title></rect>
            <rect x={cx + 2} y={y(m.sale)} width="22" height={y0 - y(m.sale)} fill="#e9b9b6"><title>{`Sale ${EUR0.format(m.sale)} € en impuestos ya sabidos${m.porSaber ? ` + ${m.porSaber} por saber` : ""}`}</title></rect>
            <text x={cx} y="296" fontSize="13" textAnchor="middle" fill={i === 0 ? "#2b2b2b" : "#55594f"} fontWeight={i === 0 ? 700 : 400}>
              {MES_CORTO.format(fechaMes(m.mes)).replace(".", "")}{i === 0 ? " · hoy" : ""}
            </text>
            <text x={cx} y="316" fontSize="12" textAnchor="middle" fill="#7b8077">+{mil(m.entra)} −{mil(m.sale)}{m.porSaber ? " +?" : ""}</text>
          </g>
        );
      })}
      <text x="100" y="336" fontSize="12" fill="#7b8077">miles de € · entra (verde) y sale (rojo) cada mes, con lo que ya está en la base</text>
    </svg>
  );
}

function FilaHueco({ que, falta }: { que: string; falta: string }) {
  return (
    <tr className="bg-amber-50/60">
      <td className={TD}>
        {que}
        <div className="text-[12.5px] text-amber-900/80">{falta}</div>
      </td>
      <td className={TD + " text-right text-amber-700/70"}>sin dato</td>
    </tr>
  );
}

export function Llegamos({ meses, vencido, porCobrar, sinFecha }: {
  meses: MesPrever[];
  /** Hitos con fecha ya pasada y sin facturar. */
  vencido: { importe: number; hitos: number };
  /** Facturas emitidas que no se han cobrado todavia. */
  porCobrar: { importe: number; facturas: number; sinJustificante: { importe: number; facturas: number } };
  /** Hitos que dependen de fuera (licencia, CFO, concesion...), sin fecha. */
  sinFecha: { importe: number; hitos: number };
}) {
  const entra = meses.reduce((s, m) => s + m.entra, 0);
  const hitos = meses.reduce((s, m) => s + m.hitos, 0);
  const sale = meses.reduce((s, m) => s + m.sale, 0);
  const porSaber = meses.reduce((s, m) => s + m.porSaber, 0);
  const sig = meses[1] ?? meses[0];
  return (
    <>
      <div className="mb-6 grid grid-cols-4 gap-4">
        <Kpi hueco titulo="Saldo a fin de mes" valor="—" nota="falta el saldo del banco: sin él no hay saldo previsto" />
        <Kpi hueco titulo="Peor momento" valor="—" nota="falta el saldo del banco y el saldo mínimo" />
        <Kpi
          titulo={`Entra en ${meses.length} meses`}
          valor={`${EUR0.format(entra)} €`}
          nota={`de ${hitos} hitos con fecha prevista · y ${EUR0.format(porCobrar.importe)} € facturados sin cobrar`}
        />
        <Kpi
          titulo={`Sale en ${meses.length} meses`}
          valor={`${EUR0.format(sale)} €`}
          nota={`solo impuestos ya sabidos${porSaber ? ` · ${porSaber} más por saber` : ""} · nóminas, SS, fijos: sin dato`}
        />
      </div>

      <div className="grid items-start gap-[22px]" style={{ gridTemplateColumns: "1fr 520px" }}>
        <div className={PANEL}>
          <div className={PTIT}>
            <b className="text-[16px]">Lo que entra y lo que sale</b>
            <span className="text-[12.5px] text-carbon/65">la línea del saldo y la del mínimo, cuando esté el saldo del banco</span>
          </div>
          <div className="px-5 pb-2 pt-[18px]">
            <Grafico meses={meses} />
          </div>
          <div className="flex gap-[22px] px-5 pb-4 text-[13px] text-[#55594f]">
            <span className="inline-flex items-center gap-[7px]"><i className="inline-block h-2.5 w-[18px] rounded-sm bg-[#c6e5a8]" />Entra</span>
            <span className="inline-flex items-center gap-[7px]"><i className="inline-block h-2.5 w-[18px] rounded-sm bg-[#e9b9b6]" />Sale</span>
          </div>
          <div className="mx-5 mb-5 rounded-[10px] border border-amber-200 bg-amber-50/60 px-3.5 py-3 text-[13.5px] text-amber-900/80">
            Fuera del gráfico, porque no tienen mes: <b>{EUR0.format(porCobrar.importe)} €</b> en {porCobrar.facturas} facturas emitidas sin cobrar,{" "}
            <b>{EUR0.format(vencido.importe)} €</b> en {vencido.hitos} hitos con la fecha ya pasada y sin facturar, y <b>{EUR0.format(sinFecha.importe)} €</b> en{" "}
            {sinFecha.hitos} hitos que dependen de fuera (licencia, CFO, concesión…).
            {porCobrar.sinJustificante.facturas > 0 && (
              <>
                {" "}No cuentan como entrada {EUR0.format(porCobrar.sinJustificante.importe)} € en {porCobrar.sinJustificante.facturas} facturas que Factusol da por
                cobradas sin justificante subido.
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className={PANEL}>
            <div className={PTIT}>
              <b className="text-[16px]">{mayus(MES_LARGO.format(fechaMes(sig.mes)))}, qué entra y qué sale</b>
              <span className="font-bold tabular-nums">{sig.entra - sig.sale >= 0 ? "+" : "−"}{EUR0.format(Math.abs(sig.entra - sig.sale))} € + ?</span>
            </div>
            <table className="w-full border-collapse text-[14px] tabular-nums">
              <tbody>
                <tr><th className={TH}>Sale</th><th className={TH + " text-right"}>{EUR0.format(sig.sale)} + ?</th></tr>
                <FilaHueco que="Nóminas" falta="engancharlas a las nóminas de RRHH" />
                <FilaHueco que="Seguros sociales" falta="su importe de cada mes" />
                <tr>
                  <td className={TD}>Impuestos <span className="text-[12.5px] text-[#7b8077]">(plazos ya sabidos{sig.porSaber ? ` · y ${sig.porSaber} por saber` : ""})</span></td>
                  <td className={TD + " text-right"}>{EUR0.format(sig.sale)}</td>
                </tr>
                <FilaHueco que="Gastos fijos" falta="la lista de Pagar › Gastos fijos (alquiler, coches, FARO, GMA…)" />
                <FilaHueco que="Proveedores" falta="dónde se apuntan las facturas recibidas" />
                <tr><th className={TH}>Entra</th><th className={TH + " text-right"}>{EUR0.format(sig.entra)} + ?</th></tr>
                <tr>
                  <td className={TD}>{sig.hitos} {sig.hitos === 1 ? "hito" : "hitos"} con fecha prevista</td>
                  <td className={TD + " text-right"}>{EUR0.format(sig.entra)}</td>
                </tr>
                <FilaHueco que="Entregas del cronograma" falta="que Asignar guarde las fechas previstas de cada entrega" />
                <FilaHueco que="Retraso de cada pagador" falta="cuánto tarda en pagar cada uno (Supuestos)" />
              </tbody>
            </table>
          </div>
          <div className="overflow-hidden rounded-[14px] border-2 border-amber-200 bg-amber-50/60">
            <div className="flex items-center justify-between gap-3 border-b border-amber-200 px-5 py-4">
              <b className="text-[16px] text-carbon">Para no bajar del mínimo</b>
              <span className="text-[12.5px] text-amber-900/80">desde Asignar</span>
            </div>
            <p className="px-5 py-4 text-[14px] text-amber-900/80">
              Aquí saldrá qué entrega adelantar, qué pasar antes o qué fraccionar, y cuánto daría cada cosa. Falta: el saldo del banco, el
              saldo mínimo, las salidas que aún no tienen dato y que Asignar guarde su plan.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
