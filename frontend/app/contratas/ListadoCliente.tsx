"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

// Listado de contratas, con la misma forma que el de administraciones: un
// buscador unico que cuenta en los dos lados, conmutador empresa/personas y
// filtros que responden a preguntas de verdad.
//
// Lo que cambia es el contenido: aqui manda la obra (en marcha, sin empezar) y
// los presupuestos pedidos, no las comunidades ni el ultimo contacto.
export type FilaContrata = {
  id: string;
  nombre: string;
  ojo: boolean;
  tipoLabel: string;
  tipoClase: string;
  especialidad: string | null;
  cif: boolean;
  personas: number;
  enCurso: number;
  sinEmpezar: number;
  terminadas: number;
  presupuestos: number;
  pendiente: boolean;
};

export type FilaPersonaContrata = {
  puestoId: string;
  nombre: string;
  contrata: string;
  cargo: string | null;
  contacto: string | null;
  etapas: number;
  pendiente: boolean;
};

const sinA = (s: string | null) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const FILTROS_EMP = [
  { k: "curso", l: "Con obra en marcha", f: (c: FilaContrata) => c.enCurso > 0 },
  { k: "espera", l: "Esperando a empezar", f: (c: FilaContrata) => c.sinEmpezar > 0 },
  { k: "pres", l: "Con presupuesto pedido", f: (c: FilaContrata) => c.presupuestos > 0 },
  { k: "gente", l: "Con gente registrada", f: (c: FilaContrata) => c.personas > 0 },
  { k: "sincif", l: "Sin CIF", f: (c: FilaContrata) => !c.cif, av: true },
  { k: "ojo", l: "Marcadas con ⛔", f: (c: FilaContrata) => c.ojo, av: true },
];

const FILTROS_PER = [
  { k: "com", l: "Comerciales", f: (p: FilaPersonaContrata) => /comercial/i.test(p.cargo ?? "") },
  { k: "jefe", l: "Jefes de obra", f: (p: FilaPersonaContrata) => /jefe de obra/i.test(p.cargo ?? "") },
  { k: "duenos", l: "Dueños y socios", f: (p: FilaPersonaContrata) => /propietari|socio|directiv/i.test(p.cargo ?? "") },
  { k: "varias", l: "Han cambiado de empresa", f: (p: FilaPersonaContrata) => p.etapas > 1 },
  { k: "pdte", l: "A medias", f: (p: FilaPersonaContrata) => p.pendiente, av: true },
];

export function ListadoCliente({
  contratas,
  personas,
}: {
  contratas: FilaContrata[];
  personas: FilaPersonaContrata[];
}) {
  const [q, setQ] = useState("");
  const [modo, setModo] = useState<"emp" | "per">("emp");
  const [filtro, setFiltro] = useState<string | null>(null);

  const b = sinA(q.trim());

  const cuentaEmp = useMemo(
    () => (b ? contratas.filter((c) => sinA(c.nombre).includes(b) || sinA(c.especialidad).includes(b)).length : contratas.length),
    [b, contratas],
  );
  const cuentaPer = useMemo(
    () => (b ? personas.filter((p) => sinA(p.nombre).includes(b) || sinA(p.contrata).includes(b) || sinA(p.cargo).includes(b)).length : personas.length),
    [b, personas],
  );

  // Un solo buscador: si donde estas no hay nada y enfrente si, se salta.
  const modoReal = (b && modo === "emp" && cuentaEmp === 0 && cuentaPer > 0) ? "per"
    : (b && modo === "per" && cuentaPer === 0 && cuentaEmp > 0) ? "emp" : modo;

  const visiblesEmp = useMemo(() => {
    const F = FILTROS_EMP.find((f) => f.k === filtro);
    return contratas.filter((c) => (!F || F.f(c)) && (!b || sinA(c.nombre).includes(b) || sinA(c.especialidad).includes(b)));
  }, [contratas, b, filtro]);

  const visiblesPer = useMemo(() => {
    const F = FILTROS_PER.find((f) => f.k === filtro);
    return personas.filter((p) => (!F || F.f(p)) && (!b || sinA(p.nombre).includes(b) || sinA(p.contrata).includes(b) || sinA(p.cargo).includes(b)));
  }, [personas, b, filtro]);

  const esEmp = modoReal === "emp";
  const filtros = esEmp ? FILTROS_EMP : FILTROS_PER;

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-black/10 bg-hueso p-1">
          {(["emp", "per"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setModo(m); setFiltro(null); }}
              aria-pressed={modoReal === m}
              className={
                "rounded-full px-4 py-1.5 text-base transition " +
                (modoReal === m ? "bg-carbon font-semibold text-white" : "text-carbon/70 hover:text-carbon")
              }
            >
              {m === "emp" ? "Contratas" : "Personas"}
              {b && <span className="ml-1.5 text-sm opacity-70">{m === "emp" ? cuentaEmp : cuentaPer}</span>}
            </button>
          ))}
        </div>

        <label className="flex min-w-[260px] flex-1 items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 shadow-sm sm:max-w-xs sm:flex-none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="shrink-0 text-carbon/55">
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => { setQ(e.target.value); setFiltro(null); }}
            placeholder="Buscar una contrata o una persona…"
            className="w-full bg-transparent text-base outline-none placeholder:text-carbon/50"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {filtros.map((f) => (
          <button
            key={f.k}
            onClick={() => setFiltro(filtro === f.k ? null : f.k)}
            aria-pressed={filtro === f.k}
            className={
              "rounded-full border px-3 py-1 text-sm transition " +
              (filtro === f.k
                ? "av" in f && f.av
                  ? "border-amber-300 bg-amber-50 font-semibold text-amber-700"
                  : "border-lima bg-lima-soft font-semibold text-lima-dark"
                : "border-black/10 bg-white text-carbon/70 hover:border-lima")
            }
          >
            {f.l}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
        {esEmp ? (
          <table className="w-full min-w-[720px] text-base">
            <thead>
              <tr className="border-b border-black/10 text-xs uppercase tracking-wider text-carbon/60">
                <th className="px-4 py-3 text-left font-bold">Contrata</th>
                <th className="px-4 py-3 text-left font-bold">Tipo</th>
                <th className="px-4 py-3 text-right font-bold">Gente</th>
                <th className="px-4 py-3 text-right font-bold">En marcha</th>
                <th className="px-4 py-3 text-right font-bold">Sin empezar</th>
                <th className="px-4 py-3 text-right font-bold">Pptos.</th>
                <th className="px-4 py-3 text-right font-bold">Hechas</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visiblesEmp.map((c) => (
                <tr key={c.id} className="border-b border-black/5 last:border-0 hover:bg-hueso/70">
                  <td className="px-4 py-3">
                    <Link href={`/contratas/${c.id}`} className="font-semibold text-carbon hover:text-lima-dark">
                      {c.ojo && <span className="mr-1 text-red-600">⛔</span>}
                      {c.nombre}
                    </Link>
                    {c.especialidad && <span className="ml-2 text-sm text-carbon/55">{c.especialidad}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={"rounded-full px-2 py-0.5 text-sm font-medium " + c.tipoClase}>{c.tipoLabel}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.personas || <span className="text-carbon/30">—</span>}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {c.enCurso ? <span className="text-lima-dark">{c.enCurso}</span> : <span className="text-carbon/30">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {c.sinEmpezar ? <span className="font-semibold text-amber-700">{c.sinEmpezar}</span> : <span className="text-carbon/30">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.presupuestos || <span className="text-carbon/30">—</span>}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-carbon/50">{c.terminadas || "—"}</td>
                  <td className="px-4 py-3">
                    {c.pendiente && <span title="Tiene algo pendiente" className="font-bold text-amber-600">◆</span>}
                    {!c.cif && <span title="Sin CIF" className="ml-1 font-bold text-amber-600">·</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[720px] text-base">
            <thead>
              <tr className="border-b border-black/10 text-xs uppercase tracking-wider text-carbon/60">
                <th className="px-4 py-3 text-left font-bold">Persona</th>
                <th className="px-4 py-3 text-left font-bold">Contrata</th>
                <th className="px-4 py-3 text-left font-bold">Cargo</th>
                <th className="px-4 py-3 text-left font-bold">Contacto</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visiblesPer.map((p) => (
                <tr key={p.puestoId} className="border-b border-black/5 last:border-0 hover:bg-hueso/70">
                  <td className="px-4 py-3">
                    <Link href={`/contratas/persona/${p.puestoId}`} className="font-semibold text-carbon hover:text-lima-dark">
                      {p.nombre}
                    </Link>
                    {p.etapas > 1 && (
                      <span className="ml-2 rounded-full border border-black/10 px-2 py-0.5 text-sm text-carbon/60">
                        {p.etapas} etapas
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-carbon/75">{p.contrata}</td>
                  <td className="px-4 py-3 text-carbon/75">
                    {p.cargo ?? <span className="italic text-carbon/40">sin cargo</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-carbon/65">
                    {p.contacto ?? <span className="text-carbon/30">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {p.pendiente && <span title="Tiene algo pendiente" className="font-bold text-amber-600">◆</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {(esEmp ? visiblesEmp : visiblesPer).length === 0 && (
          <div className="px-4 py-12 text-center text-carbon/60">
            {q ? <>Nada que coincida con <b>{q}</b> en {esEmp ? "contratas" : "personas"}.</> : "Nada con ese filtro."}
          </div>
        )}
      </div>

      <p className="mt-3 text-sm text-carbon/55">
        {esEmp
          ? `${visiblesEmp.length} de ${contratas.length} contratas`
          : `${visiblesPer.length} de ${personas.length} personas`}
      </p>
    </>
  );
}
