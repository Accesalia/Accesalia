"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Acuerdo, Sobre } from "../../../../lib/comisionesAdmin";
import { accionBuscarEmpresas, accionBuscarPersonas, accionGuardarAcuerdo } from "../acciones";

// PARTE 1 DE LA FICHA: el acuerdo. Quien cobra, de que administraciones (o «solo
// lo suyo»), y las tres condiciones. «Verificado» lo marca Monica tras revisarlo.

type Cond = { activa: boolean; forma: "eur" | "pct"; valor: string; estado: "pactada" | "pendiente"; enB: boolean; via: "nosotros" | "directo" | null };
const SOBRES: { clave: Sobre; titulo: string; ayuda: string }[] = [
  { clave: "proyecto", titulo: "Sobre proyecto", ayuda: "dentro del precio de la hoja" },
  { clave: "subvenciones", titulo: "Sobre subvenciones", ayuda: "dentro del precio de la hoja" },
  { clave: "contrata", titulo: "Sobre contrata", ayuda: "% del PEM del presupuesto adjudicado" },
];
const campo = "rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-[13.5px] outline-none focus:border-carbon/50";

function Buscador<T extends { id: string; nombre: string }>({ buscar, elegir, placeholder, pinta }: { buscar: (q: string) => Promise<T[]>; elegir: (x: T) => void; placeholder: string; pinta?: (x: T) => string }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<T[]>([]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (q.trim().length < 2) setRes([]);
      else buscar(q).then(setRes);
    }, 250);
    return () => clearTimeout(t);
  }, [q, buscar]);
  return (
    <div className="relative">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className={`${campo} w-[320px]`} />
      {res.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-[260px] w-[420px] overflow-auto rounded-xl border border-black/10 bg-white shadow-lg">
          {res.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => {
                elegir(x);
                setQ("");
                setRes([]);
              }}
              className="block w-full px-3 py-1.5 text-left text-[13.5px] hover:bg-[#f3f6f2]"
            >
              {pinta ? pinta(x) : x.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function FormAcuerdo({ acuerdo: a }: { acuerdo: Acuerdo | null }) {
  const router = useRouter();
  const [persona, setPersona] = useState<{ id: string; nombre: string } | null>(a?.personaId ? { id: a.personaId, nombre: a.persona ?? "" } : null);
  const [alcance, setAlcance] = useState<"empresas" | "lo_suyo">(a?.alcance ?? "empresas");
  const [empresas, setEmpresas] = useState<{ id: string; nombre: string }[]>(a?.alcance === "empresas" ? a.empresas : []);
  const [vigente, setVigente] = useState(a?.vigente ?? true);
  const [noCobra, setNoCobra] = useState(a?.noCobra ?? false);
  const [desde, setDesde] = useState(a?.desde ?? "");
  const [hasta, setHasta] = useState(a?.hasta ?? "");
  const [verificado, setVerificado] = useState(a?.revision === "verificado");
  const [notas, setNotas] = useState(a?.notas ?? "");
  const [conds, setConds] = useState<Record<Sobre, Cond>>(() => {
    const de = (s: Sobre): Cond => {
      const c = a?.condiciones[s];
      return c
        ? { activa: true, forma: c.forma, valor: c.valor == null ? "" : String(c.valor).replace(".", ","), estado: c.estado, enB: c.enB, via: c.via }
        : { activa: false, forma: s === "contrata" ? "pct" : "eur", valor: "", estado: "pactada", enB: false, via: null };
    };
    return { proyecto: de("proyecto"), subvenciones: de("subvenciones"), contrata: de("contrata") };
  });
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState(false);
  const [pendiente, empezar] = useTransition();
  const cambia = (s: Sobre, c: Partial<Cond>) => {
    setHecho(false);
    setConds((x) => ({ ...x, [s]: { ...x[s], ...c } }));
  };

  const guardar = () =>
    empezar(async () => {
      setError(null);
      const r = await accionGuardarAcuerdo(a?.id ?? null, {
        personaId: persona?.id ?? null,
        alcance,
        empresas: empresas.map((e) => e.id),
        vigente,
        desde: desde || null,
        hasta: hasta || null,
        noCobra,
        verificado,
        notas,
        condiciones: Object.fromEntries(
          SOBRES.map(({ clave }) => {
            const c = conds[clave];
            const v = c.valor.trim() === "" ? null : Number(c.valor.replace(/\./g, "").replace(",", "."));
            return [clave, c.activa ? { forma: c.forma, valor: v != null && Number.isFinite(v) ? v : null, estado: c.estado, enB: c.enB, via: c.via } : null];
          }),
        ),
      });
      if (!r.ok) return setError(r.error);
      setHecho(true);
      if (!a) router.push(`/ecobalance/comisiones/${r.id}`);
      else router.refresh();
    });

  return (
    <div className="mt-2 rounded-2xl border border-black/10 bg-white p-5 text-[13.5px] text-carbon">
      {/* QUIEN */}
      <div className="grid grid-cols-[150px_minmax(0,1fr)] items-start gap-x-4 gap-y-3">
        <span className="pt-1.5 font-semibold text-carbon/70">Quién cobra</span>
        <div className="flex flex-wrap items-center gap-2">
          {persona ? (
            <span className="rounded-lg bg-[#f3f6f2] px-2.5 py-1.5 font-semibold">
              {persona.nombre}
              <button type="button" onClick={() => setPersona(null)} className="ml-2 text-carbon/45 hover:text-carbon">
                ✕
              </button>
            </span>
          ) : (
            <Buscador buscar={accionBuscarPersonas} elegir={(p) => setPersona(p)} placeholder="Buscar en la agenda…" pinta={(p) => `${p.nombre}${p.empresa ? ` · ${p.empresa}` : ""}`} />
          )}
          <span className="text-[12px] text-carbon/50">el jefe: sus empleados no deben saber que existe</span>
        </div>

        <span className="pt-1.5 font-semibold text-carbon/70">De qué cobra</span>
        <div>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={alcance === "empresas"} onChange={() => setAlcance("empresas")} className="accent-[#104269]" />
              todo lo de estas administraciones
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={alcance === "lo_suyo"} onChange={() => setAlcance("lo_suyo")} className="accent-[#104269]" />
              solo lo suyo (su cartera y lo que trae él)
            </label>
          </div>
          {alcance === "empresas" && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {empresas.map((e) => (
                <span key={e.id} className="rounded-lg bg-[#f3f6f2] px-2.5 py-1.5">
                  {e.nombre}
                  <button type="button" onClick={() => setEmpresas((x) => x.filter((y) => y.id !== e.id))} className="ml-2 text-carbon/45 hover:text-carbon">
                    ✕
                  </button>
                </span>
              ))}
              <Buscador buscar={accionBuscarEmpresas} elegir={(e) => setEmpresas((x) => (x.some((y) => y.id === e.id) ? x : [...x, e]))} placeholder="+ Añadir administración…" />
            </div>
          )}
        </div>
      </div>

      {/* LAS TRES CONDICIONES */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {SOBRES.map(({ clave, titulo, ayuda }) => {
          const c = conds[clave];
          return (
            <div key={clave} className={`rounded-xl border p-3 ${c.activa ? "border-carbon/25" : "border-black/10 bg-[#fafbf9]"}`}>
              <label className="flex items-center gap-2 font-bold">
                <input type="checkbox" checked={c.activa} onChange={(e) => cambia(clave, { activa: e.target.checked })} className="h-4 w-4 accent-[#104269]" />
                {titulo}
              </label>
              <p className="ml-6 text-[11.5px] text-carbon/50">{ayuda}</p>
              {c.activa && (
                <div className="mt-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <input value={c.valor} onChange={(e) => cambia(clave, { valor: e.target.value })} disabled={c.estado === "pendiente"} className={`${campo} w-[90px] text-right tabular-nums`} />
                    <select value={c.forma} onChange={(e) => cambia(clave, { forma: e.target.value as "eur" | "pct" })} className={campo}>
                      <option value="eur">€ fijos</option>
                      <option value="pct">%</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={c.estado === "pendiente"} onChange={(e) => cambia(clave, { estado: e.target.checked ? "pendiente" : "pactada" })} className="accent-[#104269]" />
                    pendiente de negociar
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={c.enB} onChange={(e) => cambia(clave, { enB: e.target.checked })} className="accent-[#104269]" />
                    en B (sin factura)
                  </label>
                  {clave === "contrata" && (
                    <select value={c.via ?? ""} onChange={(e) => cambia(clave, { via: (e.target.value || null) as Cond["via"] })} className={`${campo} w-full`}>
                      <option value="">cómo llega: sin decir</option>
                      <option value="nosotros">la contrata nos paga y nosotros a él</option>
                      <option value="directo">directo de la contrata a él</option>
                    </select>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* VIGENCIA, VERIFICACION Y NOTAS */}
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={vigente} onChange={(e) => setVigente(e.target.checked)} className="accent-[#104269]" />
          vigente
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={noCobra} onChange={(e) => setNoCobra(e.target.checked)} className="accent-[#104269]" />
          no cobra
        </label>
        <label className="flex items-center gap-1.5">
          desde <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={campo} />
        </label>
        <label className="flex items-center gap-1.5">
          hasta <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={campo} />
        </label>
        <label className="flex items-center gap-1.5 font-semibold">
          <input type="checkbox" checked={verificado} onChange={(e) => setVerificado(e.target.checked)} className="h-4 w-4 accent-[#2f5d14]" />
          verificado por Mónica
        </label>
      </div>
      <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} placeholder="Notas del acuerdo…" className={`${campo} mt-3 w-full`} />

      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={guardar} disabled={pendiente} className="rounded-xl bg-carbon px-4 py-2 font-bold text-white hover:bg-carbon/85 disabled:opacity-50">
          {pendiente ? "Guardando…" : a ? "Guardar cambios" : "Crear acuerdo"}
        </button>
        {error && <span className="text-[#b4441c]">{error}</span>}
        {hecho && !error && <span className="text-[#2f5d14]">Guardado.</span>}
      </div>
    </div>
  );
}
