"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EmpresaGasto, Falta, Gasto, GastoLista, ListaGastos } from "../../../../lib/gastosMes";
import { Formulario } from "../Gastos";
import { accionCambiarGasto, accionDejarDeIncluir, accionVolverAIncluir } from "../acciones";

// GESTIONAR LA LISTA DE GASTOS (Monica, 21-oct-2026): todos, toquen este mes o no. Una tabla por empresa, por
// importe. Avisa (se cambia aqui mismo), notas (aqui mismo), lo que le falta a cada uno, y «dejar de incluirlo»
// (como la Ford) con el ultimo mes en que se paga. Pulsando el nombre, el formulario entero.

const EUR0 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" });
const EUR2 = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const NOMBRE: Record<EmpresaGasto, string> = { accesalia: "Accesalia", daniel_autonomo: "Daniel" };
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const mesCorto = (m: string | null) => (m ? `${MESES[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}` : "—");
const fecha = (iso: string) => `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(2, 4)}`;

function cada(g: Gasto) {
  const ms = g.meses?.length ? " · " + g.meses.map((m) => MESES[m - 1]).join(" ") : "";
  switch (g.cada) {
    case "mensual": return "mensual";
    case "trimestral": return "trimestral" + ms;
    case "semestral": return "semestral" + ms;
    case "anual": return "anual" + ms;
    case "una_vez": return "una vez" + (g.desde ? ` · ${mesCorto(g.desde)}` : "");
    case "plazos": return "a plazos" + ms + (g.hasta ? ` · hasta ${mesCorto(g.hasta)}` : "");
  }
}

const FALTA: Record<Falta, string> = {
  revisar_importe: "revisar importe",
  no_reconoce: "no sé reconocerlo en el banco",
  falta_mes: "le falta el mes",
  falta_importe: "le falta el importe",
  falta_dia: "le falta el día",
};

function Fila({ x, editar, baja }: { x: GastoLista; editar: (g: Gasto) => void; baja?: boolean }) {
  const router = useRouter();
  const [pend, empezar] = useTransition();
  const [notas, setNotas] = useState(x.gasto.notas ?? "");
  const [dejar, setDejar] = useState(false);
  const [ultimoMes, setUltimoMes] = useState(new Date().toISOString().slice(0, 7));
  const g = x.gasto;
  const hacer = (f: () => Promise<{ ok: boolean; error?: string }>) =>
    empezar(async () => {
      const r = await f();
      if (!r.ok) alert(r.error);
      router.refresh();
    });
  const TD = "border-t border-black/5 px-2 py-1.5 align-top text-[13px] whitespace-nowrap";
  return (
    <tr className={baja ? "text-carbon/55" : ""}>
      <td className={`${TD} max-w-[230px] whitespace-normal`}>
        <button type="button" onClick={() => editar(g)} className="text-left font-semibold text-carbon hover:underline" title="Cambiar este gasto">{g.concepto}</button>
        {g.solo_direccion && <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-px text-[10.5px] font-semibold text-amber-900/80">dirección</span>}
        {g.accion && <span className="block text-[11.5px] text-carbon/60">→ {g.accion}</span>}
      </td>
      <td className={`${TD} text-[12px] text-carbon/70`}>{cada(g)}</td>
      <td className={`${TD} text-right text-carbon/70`}>{g.dia ?? "—"}</td>
      <td className={`${TD} text-right font-bold tabular-nums`}>{g.importe == null ? "—" : EUR0.format(g.importe)}</td>
      <td className={`${TD} text-right tabular-nums`}>
        {x.mediaPorVez == null ? <span className="text-carbon/40">—</span> : EUR0.format(x.mediaPorVez)}
        {x.faltas.includes("revisar_importe") && !baja && (
          <button type="button" disabled={pend} onClick={() => hacer(() => accionCambiarGasto(g.id, { importe: x.mediaPorVez! }))}
            className="ml-1.5 rounded bg-lima-soft px-1.5 py-px text-[11px] font-bold text-lima-dark ring-1 ring-lima/40 hover:bg-lima/30" title="Poner la media real como previsto">
            poner {EUR0.format(x.mediaPorVez!)}
          </button>
        )}
      </td>
      <td className={`${TD} tabular-nums text-carbon/75`}>{x.ultima ? `${fecha(x.ultima.fecha)} · ${EUR2.format(x.ultima.importe)}` : <span className="text-carbon/40">no ha salido</span>}</td>
      <td className={`${TD} text-carbon/75`}>{baja ? `hasta ${mesCorto(g.hasta)}` : mesCorto(x.proxima)}</td>
      <td className={`${TD} text-right tabular-nums text-carbon/75`}>{x.alAno == null ? "—" : EUR0.format(x.alAno)}</td>
      <td className={`${TD} text-center`}>
        {g.cada !== "mensual" || g.accion ? (
          <input type="checkbox" checked={g.avisar} disabled={pend || baja} onChange={(e) => hacer(() => accionCambiarGasto(g.id, { avisar: e.target.checked }))} className="h-4 w-4 accent-lima" title="Avisar el mes anterior" />
        ) : (
          <span className="text-[11px] text-carbon/40" title="Los de todos los meses no avisan (salvo que tengan algo que hacer)">—</span>
        )}
      </td>
      <td className={`${TD} whitespace-normal`}>
        <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={1}
          onBlur={() => notas !== (g.notas ?? "") && hacer(() => accionCambiarGasto(g.id, { notas: notas.trim() || null }))}
          className="w-[230px] resize-y rounded-md border border-black/10 bg-white px-2 py-1 text-[12px] text-carbon/80 focus:border-lima focus:outline-none" placeholder="nota…" />
      </td>
      <td className={`${TD} whitespace-normal`}>
        {x.faltas.filter((f) => !baja && f !== "revisar_importe").map((f) => (
          <span key={f} className="mb-0.5 mr-1 inline-block whitespace-nowrap rounded bg-amber-50 px-1.5 py-px text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">⚠ {FALTA[f]}</span>
        ))}
        {x.faltas.includes("revisar_importe") && !baja && (
          <span className="mb-0.5 mr-1 inline-block whitespace-nowrap rounded bg-amber-50 px-1.5 py-px text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">⚠ {FALTA.revisar_importe}</span>
        )}
      </td>
      <td className={TD}>
        {baja ? (
          <button type="button" disabled={pend} onClick={() => hacer(() => accionVolverAIncluir(g.id))} className="text-[12px] font-bold text-lima-dark hover:underline">volver a incluirlo</button>
        ) : dejar ? (
          <span className="flex items-center gap-1.5 text-[12px]">
            último mes:
            <input type="month" value={ultimoMes} onChange={(e) => setUltimoMes(e.target.value)} className="rounded border border-black/15 px-1 py-0.5 text-[12px]" />
            <button type="button" disabled={pend || !ultimoMes} onClick={() => hacer(() => accionDejarDeIncluir(g.id, ultimoMes))} className="rounded bg-carbon px-2 py-0.5 font-bold text-white">ok</button>
            <button type="button" onClick={() => setDejar(false)} className="text-carbon/60">×</button>
          </span>
        ) : (
          <button type="button" onClick={() => setDejar(true)} className="text-[12px] font-semibold text-alerta/90 hover:underline">dejar de incluirlo</button>
        )}
      </td>
    </tr>
  );
}

export function Lista({ l }: { l: ListaGastos }) {
  const [form, setForm] = useState<{ gasto: Gasto | null; empresa: EmpresaGasto } | null>(null);
  const [verBajas, setVerBajas] = useState<Record<string, boolean>>({});
  const TH = "px-2 py-1.5 text-left text-[10.5px] font-bold uppercase tracking-wide text-carbon/60 whitespace-nowrap";
  const Cabecera = () => (
    <tr>
      <th className={TH}>Gasto</th><th className={TH}>Cada</th><th className={`${TH} text-right`}>Día</th>
      <th className={`${TH} text-right`}>Previsto</th><th className={`${TH} text-right`} title="Lo pagado en los últimos 12 meses entre las veces que salió">Media real</th>
      <th className={TH}>Última vez</th><th className={TH}>Próxima</th><th className={`${TH} text-right`}>Al año</th>
      <th className={`${TH} text-center`}>Avisa</th><th className={TH}>Notas</th><th className={TH}>Le falta</th><th className={TH} />
    </tr>
  );
  return (
    <>
      <div className="flex flex-col gap-5">
        {l.empresas.map((e) => (
          <section key={e.empresa} className="w-fit rounded-2xl border border-black/10 bg-white px-3 pb-3 pt-3">
            <div className="mb-1 ml-2 flex items-center gap-4">
              <h2 className="text-[13px] font-extrabold uppercase tracking-widest text-carbon/75">{NOMBRE[e.empresa]}</h2>
              <span className="text-[12.5px] text-carbon/65">{e.activos.length} gastos · <b className="text-carbon">{EUR0.format(e.alMes)} al mes</b> · {EUR0.format(e.alAno)} al año</span>
              <button type="button" onClick={() => setForm({ gasto: null, empresa: e.empresa })} className="ml-auto text-[13.5px] font-bold text-lima-dark hover:underline">+ Añadir gasto</button>
            </div>
            <table className="w-auto border-collapse">
              <thead><Cabecera /></thead>
              <tbody>{e.activos.map((x) => <Fila key={x.gasto.id} x={x} editar={(g) => setForm({ gasto: g, empresa: e.empresa })} />)}</tbody>
            </table>
            {e.bajas.length > 0 && (
              <div className="ml-2 mt-2">
                <button type="button" onClick={() => setVerBajas((v) => ({ ...v, [e.empresa]: !v[e.empresa] }))} className="text-[12.5px] font-semibold text-carbon/65 hover:text-carbon">
                  {verBajas[e.empresa] ? "▾" : "▸"} Los que ya no se incluyen · {e.bajas.length}
                </button>
                {verBajas[e.empresa] && (
                  <table className="mt-1 w-auto border-collapse">
                    <tbody>{e.bajas.map((x) => <Fila key={x.gasto.id} x={x} baja editar={(g) => setForm({ gasto: g, empresa: e.empresa })} />)}</tbody>
                  </table>
                )}
              </div>
            )}
          </section>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-carbon/60">
        «Media real»: lo pagado en los últimos 12 meses entre las veces que salió. «Al año»: el previsto por las veces que toca en un año.
      </p>
      {form && <Formulario mes={l.hoy} verSoloDireccion={l.verSoloDireccion} gasto={form.gasto} empresa={form.empresa} cerrar={() => setForm(null)} />}
    </>
  );
}
