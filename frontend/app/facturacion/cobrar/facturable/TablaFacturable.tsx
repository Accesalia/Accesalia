import Link from "next/link";
import type { EstadoProforma, Facturable, FilaFacturable, OppFacturable } from "../../../../lib/facturableYa";

// COBRAR › FACTURABLE YA (Monica, 19-oct-2026): UNA tabla, los titulos una vez
// arriba; la opp en la primera columna, ancha, ocupando todas sus filas; una fila
// por hito sin proforma o por proforma. La linea gruesa separa opps; la fina, sus
// filas. Lo que se busca es que se escanee de un vistazo. Pinchar en una fila abre
// la gestion de esa opp.

const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const dia = (iso: string | null) => (iso ? `${Number(iso.slice(8, 10))} ${MES[Number(iso.slice(5, 7)) - 1]}${iso.slice(0, 4) !== new Date().toISOString().slice(0, 4) ? ` ${iso.slice(2, 4)}` : ""}` : "");
const eur = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" } as Intl.NumberFormatOptions);
const eur0 = (n: number) => Math.round(n).toLocaleString("es-ES", { useGrouping: "always" } as Intl.NumberFormatOptions);

const ESTADO: Record<EstadoProforma, { texto: string; clase: string }> = {
  sin_enviar: { texto: "Sin enviar", clase: "bg-amber-50 text-amber-900/80" },
  pendiente: { texto: "Pendiente de validar", clase: "bg-amber-50 text-amber-900/80" },
  se_puede_cobrar: { texto: "Se puede cobrar", clase: "bg-lima-soft text-lima-dark" },
  ok: { texto: "Proforma ok", clase: "bg-lima-soft text-lima-dark" },
  descuadra: { texto: "Descuadra", clase: "bg-[#f6e3e2] text-alerta" },
};

const TH = "whitespace-nowrap px-3 py-2.5 text-left text-[11.5px] font-bold uppercase tracking-wide text-carbon/65";

export function TablaFacturable({ datos, enlace }: { datos: Facturable; enlace: (oppId: string) => string }) {
  const { opps, hitos, porCobrar } = datos;
  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-black/10 pb-4">
        <h1 className="text-[28px] font-bold leading-tight text-carbon">Facturable ya</h1>
        <span className="text-[15px] text-carbon/75">
          <b className="text-carbon">{opps.length}</b> {opps.length === 1 ? "opp" : "opps"} · <b className="text-carbon">{hitos}</b> {hitos === 1 ? "hito" : "hitos"} ·{" "}
          <b className="text-carbon">{eur0(porCobrar)} €</b> + IVA por cobrar
        </span>
        <span
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-[14px] font-semibold text-carbon/45"
          title="Los cobrados de los últimos 80 días, con «nos lo han devuelto». Se monta después."
        >
          Cargos ok
          <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-carbon/40">Próximamente</span>
        </span>
      </div>

      {opps.length === 0 ? (
        <p className="mt-8 text-[15px] text-carbon/70">Nada por facturar. Al día.</p>
      ) : (
        <div className="mt-5 w-fit max-w-full overflow-x-auto rounded-2xl border border-black/10 bg-white">
          <table className="w-auto border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-black/10 bg-hueso">
                <th className={TH}>Opp</th>
                <th className={TH}>Hito alcanzado</th>
                <th className={`${TH} border-l border-black/5`}>Proforma</th>
                <th className={TH}>Estado</th>
                <th className={TH}>Fecha</th>
                <th className={`${TH} border-l border-black/5`}>Factura</th>
                <th className={`${TH} border-l border-black/5`}>Cargo</th>
              </tr>
            </thead>
            <tbody>
              {opps.map((o) => o.filas.map((f, i) => <Fila key={f.clave} o={o} f={f} primera={i === 0} href={enlace(o.oppId)} />))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Fila({ o, f, primera, href }: { o: OppFacturable; f: FilaFacturable; primera: boolean; href: string }) {
  const td = "px-3 py-2.5 align-top";
  const enl = "block hover:no-underline";
  return (
    <tr className={`group ${primera ? "border-t-2 border-carbon/25" : "border-t border-black/5"} hover:bg-[#fafbf9]`}>
      {primera && (
        <td rowSpan={o.filas.length} className={`${td} w-[300px] min-w-[300px] border-r border-black/5 bg-white`}>
          <Link href={href} className={enl}>
            <div className="text-[14.5px] font-bold leading-snug text-carbon hover:underline">{o.nombre}</div>
            {o.hojas.length > 0 && <div className="mt-0.5 text-[12.5px] text-carbon/65">{o.hojas.join(" · ")}</div>}
            {o.paga && <div className="mt-1 text-[13px] text-carbon/80">Paga: {o.paga}</div>}
            {o.comercial && <div className="text-[13px] text-carbon/80">Comercial: {o.comercial}</div>}
          </Link>
        </td>
      )}
      <td className={td}>
        <Link href={href} className={`${enl} space-y-1.5`}>
          {f.hitos.map((h, i) => (
            <div key={i} className="max-w-[340px]">
              <div className="font-semibold text-carbon">{h.que}</div>
              <div className="whitespace-nowrap text-[12.5px] text-carbon/70">
                {dia(h.fecha)}
                {h.fecha && h.importe != null ? " · " : ""}
                {h.importe != null && <span className="tabular-nums">{eur(h.importe)} €</span>}
              </div>
            </div>
          ))}
        </Link>
      </td>
      <td className={`${td} whitespace-nowrap border-l border-black/5 font-mono text-[12.5px] text-carbon`}>
        <Link href={href} className={enl}>{f.proforma?.codigo}</Link>
      </td>
      <td className={`${td} whitespace-nowrap`}>
        {f.proforma && (
          <Link href={href} className={enl}>
            <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${ESTADO[f.proforma.estado].clase}`}>{ESTADO[f.proforma.estado].texto}</span>
            {f.proforma.sinRespuesta && <div className="mt-1 text-[12px] font-semibold text-alerta">⚠ sin respuesta</div>}
          </Link>
        )}
      </td>
      <td className={`${td} whitespace-nowrap text-carbon/80`}>
        <Link href={href} className={enl}>{f.proforma && dia(f.proforma.fecha)}</Link>
      </td>
      <td className={`${td} whitespace-nowrap border-l border-black/5`}>
        {f.factura && (
          <Link href={href} className={enl}>
            <div className="font-semibold text-carbon">{f.factura.numero}</div>
            <div className="text-[12.5px] text-carbon/70">{dia(f.factura.fecha)}</div>
          </Link>
        )}
      </td>
      <td className={`${td} whitespace-nowrap border-l border-black/5`}>
        {f.cargo && (
          <Link href={href} className={enl}>
            {f.cargo.estado === "devuelto" ? (
              <div className="font-bold uppercase text-alerta">Devuelto</div>
            ) : (
              <div className="font-semibold text-amber-900/80">Pendiente</div>
            )}
            {f.cargo.fecha && <div className="text-[12.5px] text-carbon/70">{dia(f.cargo.fecha)}</div>}
          </Link>
        )}
      </td>
    </tr>
  );
}
