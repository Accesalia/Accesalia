"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PorSaber, ResultadoCuenta } from "../../../lib/extractos";
import { accionDecirQueEs, accionSubirExtractos } from "./acciones";

// SUBIR EL EXTRACTO (marco 4 de la maqueta validada). Se sueltan los Excel tal cual vienen del banco; la app cose por
// el saldo, clasifica lo que conoce y pregunta solo lo que no. Lo que se conteste queda como regla.

const EUR2 = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const fecha = (iso: string | null) => (iso ? `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}` : "—");
const NOMBRE_CUENTA: Record<string, string> = { caixa_accesalia: "Caixa Accesalia", bbva_accesalia: "BBVA Accesalia", caixa_daniel: "Caixa Daniel" };
const EMPRESA_DE_CUENTA: Record<string, string> = { caixa_accesalia: "accesalia", bbva_accesalia: "accesalia", caixa_daniel: "daniel_autonomo" };

type Props = {
  cuentas: { clave: string; nombre: string; hasta: string | null }[];
  pendientes: PorSaber[];
  gastos: { id: string; empresa: string; concepto: string }[];
  tipos: string[];
};

function Pregunta({ m, gastos, tipos }: { m: PorSaber; gastos: Props["gastos"]; tipos: string[] }) {
  const router = useRouter();
  const [pend, empezar] = useTransition();
  const [que, setQue] = useState("");
  const [repite, setRepite] = useState<"si" | "no" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const propios = gastos.filter((g) => g.empresa === EMPRESA_DE_CUENTA[m.cuenta]);
  const guardar = () =>
    empezar(async () => {
      setError(null);
      const g = propios.find((x) => x.concepto.toLowerCase() === que.trim().toLowerCase());
      const r = await accionDecirQueEs(m.id, { tipo: g ? g.concepto.toUpperCase() : que.trim().toUpperCase(), seRepite: repite, gastoId: g?.id ?? null, patron: m.concepto });
      if (!r.ok) return setError(r.error);
      router.refresh();
    });
  const SEG = (on: boolean) => `rounded-md border px-2 py-0.5 text-[12.5px] font-semibold ${on ? "border-carbon bg-carbon text-white" : "border-black/15 bg-white text-carbon/75"}`;
  return (
    <tr className="border-t border-black/5 align-middle text-[13px]">
      <td className="whitespace-nowrap px-2 py-1.5 text-carbon/70">{fecha(m.fecha).slice(0, 5)}</td>
      <td className="whitespace-nowrap px-2 py-1.5 text-carbon/70">{NOMBRE_CUENTA[m.cuenta]}</td>
      <td className="max-w-[340px] px-2 py-1.5">{m.concepto}{m.mas_datos && <span className="text-carbon/60"> · {m.mas_datos}</span>}</td>
      <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{EUR2.format(m.importe)}</td>
      <td className="px-2 py-1.5">
        <input list={`que-${m.id}`} value={que} onChange={(e) => setQue(e.target.value)} placeholder="elegir un gasto o escribir qué es…"
          className="w-[260px] rounded-md border border-black/15 bg-white px-2 py-1 text-[13px] focus:border-lima focus:outline-none" />
        <datalist id={`que-${m.id}`}>
          {propios.map((g) => <option key={g.id} value={g.concepto} />)}
          {tipos.map((t) => <option key={t} value={t} />)}
        </datalist>
      </td>
      <td className="whitespace-nowrap px-2 py-1.5">
        {m.importe < 0 && (
          <span className="flex gap-1">
            <button type="button" className={SEG(repite === "si")} onClick={() => setRepite("si")}>sí</button>
            <button type="button" className={SEG(repite === "no")} onClick={() => setRepite("no")}>no</button>
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-2 py-1.5">
        <button type="button" disabled={pend || !que.trim()} onClick={guardar} className="rounded-md bg-lima px-3 py-1 text-[12.5px] font-bold text-carbon disabled:opacity-40">
          {pend ? "…" : "Guardar"}
        </button>
        {error && <span className="ml-2 text-[12px] text-alerta">{error}</span>}
      </td>
    </tr>
  );
}

export function Subir({ cuentas, pendientes, gastos, tipos }: Props) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pend, empezar] = useTransition();
  const [encima, setEncima] = useState(false);
  const [res, setRes] = useState<ResultadoCuenta[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subir = (files: FileList | null) => {
    if (!files?.length) return;
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append("ficheros", f);
    empezar(async () => {
      setError(null);
      setRes(null);
      const r = await accionSubirExtractos(fd);
      if (!r.ok) return setError(r.error);
      setRes(r.resultados);
      router.refresh();
    });
  };

  return (
    <>
      <div
        onDragOver={(e) => { e.preventDefault(); setEncima(true); }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => { e.preventDefault(); setEncima(false); subir(e.dataTransfer.files); }}
        onClick={() => input.current?.click()}
        className={`mb-4 flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed px-5 py-4 ${encima ? "border-lima bg-lima-soft" : "border-lima/60 bg-form"}`}
      >
        <span className="text-[28px]">{pend ? "⏳" : "⬆"}</span>
        <div>
          <b className="text-[14.5px] text-carbon">{pend ? "Leyendo y cosiendo…" : "Suelte aquí los Excel del banco, tal cual se descargan (o pulse para elegirlos)"}</b>
          <div className="text-[12.5px] text-carbon/65">
            La Caixa (Movimientos_cuenta_….xls) y BBVA (Histórico movimientos….xlsx), de las tres cuentas a la vez si quiere. Da igual que se pisen con lo ya subido: no se duplica nada.
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 text-[12px] text-carbon/60">
            {cuentas.map((c) => <span key={c.clave}>{c.nombre}: hasta el {fecha(c.hasta)}</span>)}
          </div>
        </div>
        <input ref={input} type="file" multiple accept=".xls,.xlsx" className="hidden" onChange={(e) => { subir(e.target.files); e.target.value = ""; }} />
      </div>

      {error && <p className="mb-3 rounded-lg border border-alerta/30 bg-white px-3 py-2 text-[13px] text-alerta">{error}</p>}

      {res && (
        <div className="mb-4 flex flex-wrap gap-3">
          {res.map((r, i) => (
            <div key={i} className="min-w-[280px] rounded-xl border border-black/10 bg-white px-4 py-3">
              <b className="block text-[14px] text-carbon">{NOMBRE_CUENTA[r.cuenta] ?? r.fichero}</b>
              {r.error ? (
                <p className="mt-1 text-[12.5px] font-semibold text-alerta">✗ {r.error}</p>
              ) : (
                <>
                  <span className="text-[12.5px] font-bold text-lima-dark">✓ el saldo cuadra con lo anterior</span>
                  <p className="mt-0.5 text-[12.5px] text-carbon/75">
                    {r.aviso ?? `${r.nuevos} movimientos nuevos · ${r.reconocidos} reconocidos`}
                    {r.porSaber > 0 && <b className="text-amber-800"> · {r.porSaber} por saber</b>}
                    {r.hasta && <span className="text-carbon/55"> · ya llega hasta el {fecha(r.hasta)}</span>}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <section className="w-fit rounded-2xl border border-black/10 bg-white px-3 pb-3 pt-3">
        <h2 className="mb-1 ml-2 text-[13px] font-extrabold uppercase tracking-widest text-carbon/75">Lo que no conozco · {pendientes.length}</h2>
        {pendientes.length ? (
          <>
            <table className="w-auto border-collapse">
              <thead>
                <tr className="text-[10.5px] font-bold uppercase tracking-wide text-carbon/60">
                  <th className="px-2 py-1 text-left">Fecha</th><th className="px-2 py-1 text-left">Cuenta</th><th className="px-2 py-1 text-left">Lo que pone el banco</th>
                  <th className="px-2 py-1 text-right">Importe</th><th className="px-2 py-1 text-left">¿Qué es?</th><th className="px-2 py-1 text-left">¿Se repite?</th><th />
                </tr>
              </thead>
              <tbody>{pendientes.map((m) => <Pregunta key={m.id} m={m} gastos={gastos} tipos={tipos} />)}</tbody>
            </table>
            <p className="ml-2 mt-2 text-[12px] text-carbon/60">
              Si elige uno de sus gastos, el cargo pasa a contar en su «Real». Lo que conteste se guarda: el mes que viene ya no se lo pregunto.
            </p>
          </>
        ) : (
          <p className="ml-2 text-[13px] text-carbon/65">Nada pendiente: todo lo subido está reconocido.</p>
        )}
      </section>
    </>
  );
}
