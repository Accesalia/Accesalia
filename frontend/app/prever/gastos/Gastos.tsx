"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Apunte, Aviso, BloqueEmpresa, Cada, DatosGasto, EmpresaGasto, FilaGasto, Gasto, GastosMes } from "../../../lib/gastosMes";
import { accionGuardarGasto, accionQuitarGasto } from "./acciones";

// PREVER › GASTOS DEL MES (maqueta validada: docs/figma/gastos-del-mes.html). Lo pagado, en verde con ✓; lo
// pendiente, con el dia en que suele salir; «¿no pasó?» si ya tocaba. Debajo de cada empresa, pagado y lo que queda.

const EUR0 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" });
const EUR2 = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const e0 = (v: number | null) => (v == null ? "—" : EUR0.format(v));
const NOMBRE: Record<EmpresaGasto, string> = { accesalia: "Accesalia", daniel_autonomo: "Daniel" };
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mesDe = (m: string) => MES_LARGO[Number(m.slice(5, 7)) - 1];
const fecha = (iso: string) => `${iso.slice(8, 10)}-${iso.slice(5, 7)}`;

/** En la tabla del mes, corto (Monica, 21-oct: «pongamos solo trimestral»): los meses se ven en la lista de gastos. */
const CADA_CORTO: Record<Cada, string> = { mensual: "mensual", trimestral: "trimestral", semestral: "semestral", anual: "anual", una_vez: "una vez", plazos: "a plazos" };

function cadaTexto(g: Gasto) {
  const ms = g.meses?.length ? " · " + g.meses.map((m) => MESES[m - 1]).join(" ") : "";
  switch (g.cada) {
    case "mensual": return "mes";
    case "trimestral": return "3 meses" + ms;
    case "semestral": return "6 meses" + ms;
    case "anual": return "año" + (ms || " · ¿mes?");
    case "una_vez": return "una vez" + (g.desde ? " · " + MESES[Number(g.desde.slice(5, 7)) - 1] + " " + g.desde.slice(0, 4) : "");
    case "plazos": return "plazos" + ms;
  }
}

const Chip = ({ children, tono = "ambar", title }: { children: React.ReactNode; tono?: "ambar" | "dir"; title?: string }) => (
  <span title={title} className={`ml-1.5 inline-block whitespace-nowrap rounded px-1.5 py-px text-[10.5px] font-semibold ${tono === "dir" ? "bg-amber-100 text-amber-900/80" : "bg-amber-50 text-amber-800/90 ring-1 ring-amber-200"}`}>
    {children}
  </span>
);

// ------------------------------------------------------------------------------------------------ arriba
function Saldos({ g }: { g: GastosMes }) {
  if (!g.saldos.length) return null;
  return (
    <div className="mb-3 flex flex-wrap items-stretch gap-2">
      {g.saldos.map((s) => (
        <div key={s.clave} className="flex items-baseline gap-2 rounded-xl border border-black/10 bg-white px-3.5 py-2">
          <span className="text-[10.5px] font-bold uppercase tracking-wide text-carbon/60">{s.nombre}</span>
          <span className={`text-[16px] font-bold tabular-nums ${s.saldo < 0 ? "text-alerta" : "text-carbon"}`}>{EUR0.format(s.saldo)}</span>
          {s.limite != null && <span className="text-[12px] text-carbon/65">línea de crédito: quedan {EUR0.format(s.limite + s.saldo)} de {EUR0.format(s.limite)}</span>}
          <span className="text-[11.5px] text-carbon/55">a {fecha(s.fecha)}</span>
        </div>
      ))}
    </div>
  );
}

function LineaAviso({ a, conMes }: { a: Aviso; conMes?: boolean }) {
  return (
    <li className="flex items-baseline gap-2 py-0.5 text-[13.5px] text-amber-950/85">
      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
      <span>
        <b className="font-bold text-carbon">{a.gasto.concepto}</b>
        <span className="text-carbon/70"> · {cadaTexto(a.gasto)}{conMes ? ` · en ${mesDe(a.mes)}` : ""}</span>
        {a.gasto.accion && <span className="block text-[12.5px] text-amber-900/80">→ {a.gasto.accion}</span>}
      </span>
      <span className="ml-auto whitespace-nowrap pl-4 font-bold tabular-nums text-carbon">{a.importe == null ? "—" : `~${EUR0.format(a.importe)}`}</span>
    </li>
  );
}

function Cartel({ g }: { g: GastosMes }) {
  const { este, siguiente, despues, sinMes } = g.cartel;
  const Titulo = ({ children }: { children: React.ReactNode }) => (
    <h3 className="mb-1 text-[11.5px] font-extrabold uppercase tracking-widest text-amber-800/90">{children}</h3>
  );
  return (
    <div className="mb-4 grid gap-6 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3.5 md:grid-cols-2">
      <div>
        <Titulo>Este mes · {mesDe(g.mes)}</Titulo>
        {este.length ? <ul>{este.map((a) => <LineaAviso key={a.gasto.id} a={a} />)}</ul> : <p className="text-[13.5px] text-amber-900/80">Nada fuera de lo de todos los meses.</p>}
        {sinMes.length > 0 && (
          <ul className="mt-1">
            {sinMes.map((x) => (
              <li key={x.id} className="flex items-baseline gap-2 py-0.5 text-[13.5px] text-amber-950/85">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                <span>
                  <b className="font-bold text-carbon">{x.concepto}</b>
                  <Chip>¿en qué mes se renueva?</Chip>
                  {x.accion && <span className="block text-[12.5px] text-amber-900/80">→ {x.accion}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <Titulo>El mes que viene · {mesDe(siguiente[0]?.mes ?? g.mes.slice(0, 5) + String((Number(g.mes.slice(5, 7)) % 12) + 1).padStart(2, "0"))}</Titulo>
        {siguiente.length ? <ul>{siguiente.map((a) => <LineaAviso key={a.gasto.id} a={a} />)}</ul> : <p className="text-[13.5px] text-amber-900/80">Nada fuera de lo de todos los meses.</p>}
        {despues.length > 0 && (
          <>
            <h3 className="mb-1 mt-2.5 text-[11.5px] font-extrabold uppercase tracking-widest text-amber-800/90">Y después</h3>
            <ul>{despues.map((a) => <LineaAviso key={a.gasto.id + a.mes} a={a} conMes />)}</ul>
          </>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ las tablas
function Real({ f, g }: { f: FilaGasto; g: GastosMes }) {
  if (f.estado === "pagado") return <>{EUR0.format(f.real!)}</>;
  if (f.estado === "no_toca") return <span className="font-normal text-carbon/40">—</span>;
  const dia = f.gasto.dia;
  if (f.estado === "no_paso")
    return <span className="whitespace-nowrap rounded bg-amber-100 px-1.5 py-px text-[11px] font-semibold text-amber-900">¿no pasó?{dia ? ` · día ${dia}` : ""}</span>;
  return g.futuro && !dia ? (
    <span className="font-normal text-carbon/40">—</span>
  ) : (
    <span className="whitespace-nowrap rounded bg-amber-50 px-1.5 py-px text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">{dia ? `día ${dia}` : "por pasar"}</span>
  );
}

function Tabla({ b, g, editar, ponerSinPrever }: { b: BloqueEmpresa; g: GastosMes; editar: (x: Gasto | null, e: EmpresaGasto, a?: Apunte) => void; ponerSinPrever: boolean }) {
  const [verSin, setVerSin] = useState(false);
  const sinTotal = b.sinPrever.reduce((s, a) => s + a.importe, 0);
  const TH = "px-2 py-1.5 text-left text-[10.5px] font-bold uppercase tracking-wide text-carbon/60 whitespace-nowrap";
  const TD = "px-2 py-1.5 border-t border-black/5 text-[13.5px] whitespace-nowrap";
  return (
    <section className="w-fit rounded-2xl border border-black/10 bg-white px-3 pb-3 pt-3">
      <h2 className="mb-1 ml-2 text-[13px] font-extrabold uppercase tracking-widest text-carbon/75">{NOMBRE[b.empresa]}</h2>
      <table className="w-auto border-collapse tabular-nums">
        <thead>
          <tr>
            <th className={TH}>Gasto</th>
            <th className={TH}>Cada</th>
            <th className={`${TH} text-right`}>Previsto</th>
            <th className={`${TH} text-right`}>Real</th>
            {g.cerrado && <th className={`${TH} text-right`}>Diferencia</th>}
          </tr>
        </thead>
        <tbody>
          {b.filas.map((f) => {
            const pagado = f.estado === "pagado";
            const dif = f.real != null && f.previsto != null ? f.real - f.previsto : null;
            return (
              <tr key={f.gasto.id} className={pagado ? "bg-lima-soft/70" : ""}>
                <td className={`${TD} max-w-[260px] whitespace-normal`}>
                  <button type="button" onClick={() => editar(f.gasto, b.empresa)} className="text-left hover:underline" title="Cambiar este gasto">
                    {pagado && <span className="mr-1 font-extrabold text-lima-dark">✓</span>}
                    {f.gasto.concepto}
                  </button>
                  {f.gasto.solo_direccion && <Chip tono="dir">dirección</Chip>}
                  {f.apuntes > 1 && f.gasto.cada === "mensual" && <Chip title="Salió más de una vez este mes">{f.apuntes} cargos</Chip>}
                </td>
                <td className={`${TD} text-[12px] text-carbon/65`}>{CADA_CORTO[f.gasto.cada]}</td>
                <td className={`${TD} text-right ${g.cerrado ? "text-carbon/55" : "text-carbon"}`}>{e0(f.previsto)}</td>
                <td className={`${TD} text-right font-bold ${pagado ? "text-lima-dark" : ""}`}><Real f={f} g={g} /></td>
                {g.cerrado && (
                  <td className={`${TD} text-right text-[12px] font-bold ${dif != null && dif > 0 ? "text-alerta" : "text-lima-dark"}`}>
                    {dif != null && Math.abs(dif) >= Math.max(50, (f.previsto ?? 0) * 0.1) ? `${dif > 0 ? "+" : "−"}${EUR0.format(Math.abs(dif))}` : ""}
                  </td>
                )}
              </tr>
            );
          })}
          {b.sinPrever.length > 0 && (
            <tr className="bg-amber-50/70">
              <td className={`${TD} max-w-[260px] whitespace-normal font-semibold text-amber-900/90`}>Sin prever (salió del banco y no es de ningún gasto)</td>
              <td className={TD}>
                <button type="button" onClick={() => setVerSin(!verSin)} className="text-[12px] font-bold text-lima-dark hover:underline">
                  {verSin ? "ocultar" : `ver ${b.sinPrever.length} →`}
                </button>
              </td>
              <td className={`${TD} text-right text-carbon/40`}>—</td>
              <td className={`${TD} text-right font-bold`}>{EUR0.format(sinTotal)}</td>
              {g.cerrado && <td className={TD} />}
            </tr>
          )}
          {verSin &&
            b.sinPrever.map((a) => (
              <tr key={a.id} className="bg-amber-50/40 text-[12.5px]">
                <td className="max-w-[260px] whitespace-normal border-t border-black/5 py-1 pl-5 pr-2 text-carbon/80" title={a.tipo ?? undefined}>
                  <span className="text-carbon/55">{fecha(a.fecha)}</span> {a.concepto}
                  {a.mas_datos && <span className="text-carbon/55"> · {a.mas_datos}</span>}
                </td>
                <td className="border-t border-black/5 px-2 py-1 text-[11.5px] text-carbon/60">
                  {ponerSinPrever && (
                    <button type="button" onClick={() => editar(null, b.empresa, a)} className="font-semibold text-lima-dark hover:underline">+ hacerlo gasto</button>
                  )}
                </td>
                <td className="border-t border-black/5" />
                <td className="border-t border-black/5 px-2 py-1 text-right">{EUR2.format(a.importe)}</td>
                {g.cerrado && <td className="border-t border-black/5" />}
              </tr>
            ))}
          {!g.futuro && !g.cerrado && (
            <tr>
              <td className={`${TD} font-semibold`}>
                <span className="text-lima-dark">✓ Pagado</span> · <span className="text-amber-800">Queda por pagar</span>
              </td>
              <td className={TD} />
              <td className={TD} />
              <td className={`${TD} text-right font-bold`}>
                <span className="text-lima-dark">{EUR0.format(b.pagado)}</span> · <span className="text-amber-800">{EUR0.format(b.quedaPorPagar)}</span>
              </td>
            </tr>
          )}
          <tr className="border-t-2 border-carbon">
            <td className="px-2 pt-2 text-[14.5px] font-extrabold">Total {NOMBRE[b.empresa]}</td>
            <td />
            <td className="px-2 pt-2 text-right text-[14.5px] font-extrabold">{EUR0.format(b.previsto)}</td>
            <td className="px-2 pt-2 text-right text-[14.5px] font-extrabold">{g.futuro ? "—" : EUR0.format(b.real)}</td>
            {g.cerrado && (
              <td className={`px-2 pt-2 text-right text-[12.5px] font-bold ${b.real > b.previsto ? "text-alerta" : "text-lima-dark"}`}>
                {`${b.real > b.previsto ? "+" : "−"}${EUR0.format(Math.abs(b.real - b.previsto))}`}
              </td>
            )}
          </tr>
        </tbody>
      </table>
      <button type="button" onClick={() => editar(null, b.empresa)} className="ml-2 mt-2.5 text-[13.5px] font-bold text-lima-dark hover:underline">
        + Añadir gasto
      </button>
    </section>
  );
}

function Total({ g }: { g: GastosMes }) {
  const p = g.bloques.reduce((s, b) => s + b.previsto, 0);
  const pag = g.bloques.reduce((s, b) => s + b.pagado, 0);
  const queda = g.bloques.reduce((s, b) => s + b.quedaPorPagar, 0);
  const Par = ({ v, l, color }: { v: number; l: string; color?: string }) => (
    <span className="flex flex-col">
      <span className={`text-[22px] font-extrabold tabular-nums ${color ?? "text-white"}`}>{EUR0.format(v)}</span>
      <span className="whitespace-nowrap text-[12px] text-white/65">{l}</span>
    </span>
  );
  return (
    <div>
      <div className="mt-4 inline-flex items-end gap-6 rounded-2xl bg-carbon px-5 py-3">
        <span className="self-center whitespace-nowrap text-[11.5px] font-extrabold uppercase tracking-widest text-white/75">Total de las dos</span>
        <Par v={p} l="previsto" />
        {!g.futuro && (g.cerrado ? <Par v={pag} l="real" /> : <><Par v={pag} l="pagado" color="text-[#a8e07a]" /><Par v={queda} l="queda por pagar este mes" color="text-[#f2d27a]" /></>)}
      </div>
      <p className="mt-2 text-[12.5px] text-carbon/65">Los impuestos no van aquí: están en Pagar › Impuestos.</p>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ el formulario
const CADAS: { v: Cada; t: string }[] = [
  { v: "una_vez", t: "Una vez" }, { v: "mensual", t: "Cada mes" }, { v: "trimestral", t: "Cada 3 meses" },
  { v: "semestral", t: "Cada 6 meses" }, { v: "anual", t: "Cada año" }, { v: "plazos", t: "A plazos" },
];

function Formulario({ g, gasto, empresa, apunte, cerrar }: { g: GastosMes; gasto: Gasto | null; empresa: EmpresaGasto; apunte?: Apunte; cerrar: () => void }) {
  const router = useRouter();
  const [pend, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [d, setD] = useState<DatosGasto>({
    empresa: gasto?.empresa ?? empresa,
    concepto: gasto?.concepto ?? "",
    importe: gasto?.importe ?? (apunte ? Math.round(apunte.importe * 100) / 100 : null),
    cada: gasto?.cada ?? "mensual",
    meses: gasto?.meses ?? (apunte ? [Number(apunte.fecha.slice(5, 7))] : null),
    dia: gasto?.dia ?? (apunte ? Number(apunte.fecha.slice(8, 10)) : null),
    desde: gasto?.desde ?? (apunte ? apunte.fecha.slice(0, 7) + "-01" : null),
    hasta: gasto?.hasta ?? null,
    como_aparece: gasto?.como_aparece?.join(", ") ?? (apunte ? apunte.concepto.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑÜ0-9 .]/g, " ").replace(/\s+/g, " ").trim() : ""),
    accion: gasto?.accion ?? "",
    avisar: gasto?.avisar ?? true,
    solo_direccion: gasto?.solo_direccion ?? false,
  });
  const [importeTxt, setImporteTxt] = useState(d.importe == null ? "" : String(d.importe).replace(".", ","));
  const pon = <K extends keyof DatosGasto>(k: K, v: DatosGasto[K]) => setD((x) => ({ ...x, [k]: v }));
  const conMeses = d.cada !== "mensual" && d.cada !== "una_vez";
  const conFechas = d.cada === "una_vez" || d.cada === "plazos";
  const CAMPO = "w-full rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm focus:border-lima focus:outline-none";
  const ETQ = "mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-carbon/70";
  const SEG = (on: boolean) => `rounded-lg border px-2.5 py-1 text-[13px] font-semibold ${on ? "border-carbon bg-carbon text-white" : "border-black/15 bg-white text-carbon/80 hover:border-carbon/40"}`;
  const guardar = () =>
    empezar(async () => {
      setError(null);
      const limpio = importeTxt.replace(/[€\s]/g, "").replace(/\./g, "").replace(",", ".");
      const importe = limpio === "" ? null : Number(limpio);
      if (importe != null && Number.isNaN(importe)) return setError("El importe no es un número.");
      const r = await accionGuardarGasto({ ...d, importe }, gasto?.id ?? null);
      if (!r.ok) return setError(r.error);
      cerrar();
      router.refresh();
    });
  const quitar = () =>
    gasto &&
    confirm(`¿Dejar de prever «${gasto.concepto}» desde ${mesDe(g.mes)}? Lo que ya salió del banco se queda.`) &&
    empezar(async () => {
      const r = await accionQuitarGasto(gasto.id, g.mes);
      if (!r.ok) return setError(r.error);
      cerrar();
      router.refresh();
    });
  // Enter pasa al campo siguiente, nunca guarda (guia de estilo, regla 9)
  const siguiente = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Enter" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
    e.preventDefault();
    const todos = Array.from((e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>("input,textarea"));
    todos[todos.indexOf(e.target as HTMLElement) + 1]?.focus();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/25 px-4 py-16" onClick={cerrar}>
      <div className="w-full max-w-[780px] rounded-2xl border border-black/20 bg-form-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()} onKeyDown={siguiente}>
        <div className="mb-4 flex items-center gap-3">
          <b className="text-[17px] text-carbon">{gasto ? "Cambiar gasto" : "Nuevo gasto"}</b>
          {error && <span className="text-[13px] font-semibold text-alerta">{error}</span>}
          <div className="ml-auto flex gap-2">
            {gasto && (
              <button type="button" disabled={pend} onClick={quitar} className="rounded-lg border border-black/15 bg-white px-3 py-1.5 text-[13px] font-semibold text-alerta hover:border-alerta/50">
                Dejar de preverlo
              </button>
            )}
            <button type="button" disabled={pend} onClick={guardar} className="rounded-lg bg-lima px-4 py-1.5 text-[13px] font-bold text-carbon hover:bg-lima-dark hover:text-white disabled:opacity-60">
              {pend ? "Guardando…" : "Guardar"}
            </button>
            <button type="button" onClick={cerrar} className="rounded-lg border border-black/15 bg-white px-3 py-1.5 text-[13px] font-semibold text-carbon/70">Cancelar</button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[2fr_auto_1fr_90px]">
          <label><span className={ETQ}>Nombre</span>
            <input className={CAMPO} value={d.concepto} onChange={(e) => pon("concepto", e.target.value)} placeholder="cómo saldrá en la lista" autoFocus />
          </label>
          <div><span className={ETQ}>Es de</span>
            <div className="flex gap-1.5">
              {(["accesalia", "daniel_autonomo"] as EmpresaGasto[]).map((x) => (
                <button key={x} type="button" className={SEG(d.empresa === x)} onClick={() => pon("empresa", x)}>{NOMBRE[x]}</button>
              ))}
            </div>
          </div>
          <label><span className={ETQ}>Importe esperado</span>
            <input className={CAMPO} inputMode="decimal" value={importeTxt} placeholder="€ (vacío = por saber)" onChange={(e) => setImporteTxt(e.target.value)} />
          </label>
          <label><span className={ETQ}>Día</span>
            <input className={CAMPO} inputMode="numeric" value={d.dia ?? ""} placeholder="1-31"
              onChange={(e) => pon("dia", e.target.value === "" ? null : Math.min(31, Math.max(1, Number(e.target.value) || 1)))} />
          </label>
        </div>

        <div className="mt-3"><span className={ETQ}>Cada cuánto</span>
          <div className="flex flex-wrap gap-1.5">
            {CADAS.map((c) => <button key={c.v} type="button" className={SEG(d.cada === c.v)} onClick={() => pon("cada", c.v)}>{c.t}</button>)}
          </div>
        </div>
        {conMeses && (
          <div className="mt-3"><span className={ETQ}>En qué {d.cada === "anual" ? "mes" : "meses"}</span>
            <div className="flex flex-wrap gap-1">
              {MESES.map((m, i) => {
                const on = !!d.meses?.includes(i + 1);
                return (
                  <button key={m} type="button" onClick={() => pon("meses", on ? (d.meses ?? []).filter((x) => x !== i + 1) : [...(d.meses ?? []), i + 1].sort((a, b) => a - b))}
                    className={`rounded-md border px-2 py-0.5 text-[12.5px] font-semibold ${on ? "border-lima bg-lima text-carbon" : "border-black/15 bg-white text-carbon/75"}`}>{m}</button>
                );
              })}
            </div>
          </div>
        )}
        {conFechas && (
          <div className="mt-3 grid max-w-[420px] gap-3 sm:grid-cols-2">
            <label><span className={ETQ}>{d.cada === "una_vez" ? "En qué mes" : "Desde"}</span>
              <input type="month" className={CAMPO} value={d.desde?.slice(0, 7) ?? ""} onChange={(e) => pon("desde", e.target.value ? e.target.value + "-01" : null)} />
            </label>
            {d.cada === "plazos" && (
              <label><span className={ETQ}>Hasta</span>
                <input type="month" className={CAMPO} value={d.hasta?.slice(0, 7) ?? ""}
                  onChange={(e) => pon("hasta", e.target.value ? new Date(Date.UTC(Number(e.target.value.slice(0, 4)), Number(e.target.value.slice(5, 7)), 0)).toISOString().slice(0, 10) : null)} />
              </label>
            )}
          </div>
        )}

        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label><span className={ETQ}>En el banco aparece como</span>
            <input className={CAMPO} value={d.como_aparece ?? ""} onChange={(e) => pon("como_aparece", e.target.value)} placeholder="lo que pone el extracto: SIEMENS FINANCIAL, FARO EUROPE…" />
            <span className="mt-1 block text-[11.5px] text-carbon/60">Con esto la app sabe qué cargos suman en «Real». Varios, separados por comas.</span>
          </label>
          <label><span className={ETQ}>Qué hay que hacer antes</span>
            <textarea className={`${CAMPO} min-h-[64px] resize-y`} value={d.accion ?? ""} onChange={(e) => pon("accion", e.target.value)} placeholder="pedir la renovación, revisar cuántos puestos hacen falta…" />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-5 text-[13.5px] text-carbon/85">
          <label className="flex items-center gap-2"><input type="checkbox" checked={d.avisar} onChange={(e) => pon("avisar", e.target.checked)} className="h-4 w-4 accent-lima" /> Avisar el mes anterior</label>
          {g.verSoloDireccion && (
            <label className="flex items-center gap-2"><input type="checkbox" checked={d.solo_direccion} onChange={(e) => pon("solo_direccion", e.target.checked)} className="h-4 w-4 accent-lima" /> Solo lo ve dirección</label>
          )}
        </div>
        {gasto?.notas && <p className="mt-3 text-[12px] text-carbon/60">{gasto.notas}</p>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ la pantalla
export function Gastos({ g }: { g: GastosMes }) {
  const [form, setForm] = useState<{ gasto: Gasto | null; empresa: EmpresaGasto; apunte?: Apunte } | null>(null);
  const editar = (gasto: Gasto | null, empresa: EmpresaGasto, apunte?: Apunte) => setForm({ gasto, empresa, apunte });
  return (
    <>
      <Saldos g={g} />
      <Cartel g={g} />
      <div className="flex flex-wrap items-start gap-4">
        <Tabla b={g.bloques[0]} g={g} editar={editar} ponerSinPrever />
        <div>
          <Tabla b={g.bloques[1]} g={g} editar={editar} ponerSinPrever />
          <Total g={g} />
        </div>
      </div>
      {form && <Formulario g={g} gasto={form.gasto} empresa={form.empresa} apunte={form.apunte} cerrar={() => setForm(null)} />}
    </>
  );
}
