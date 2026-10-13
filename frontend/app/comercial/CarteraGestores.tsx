"use client";

import Link from "next/link";
import { useState } from "react";
import type { CarteraGestores, GestorCartera, OppDeGestor, Resultado } from "../../lib/carteraGestores";

// LA PESTAÑA "MIS ADMINISTRADORES" (Monica, 13-oct-2026).
//   · Izquierda (60%): la cartera de CONSOLIDADOS: todos sus gestores, con sus
//     oportunidades en curso, ganadas y perdidas; pinchando se despliegan.
//     Arriba, el % de ganadas y los dias medios de la apertura a la firma.
//   · Derecha (40%), apiladas, en lugar del diario: los NO consolidados, la
//     estrella y los que marean.
// Los numeros salen de vistas de la base: al completar datos, se actualizan.

const CAJA = "overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm";
const fecha = (f: string | null) => (f ? f.split("-").reverse().join("/") : "—");

const RESULTADO: Record<Resultado, { texto: string; clase: string }> = {
  en_curso: { texto: "en curso", clase: "border-[#AFBAC4] bg-[#E4E9EE] text-[#104269]" },
  ganada: { texto: "ganadas", clase: "border-lima/60 bg-lima-soft text-lima-dark" },
  perdida: { texto: "perdidas", clase: "border-red-200 bg-red-50 text-red-700" },
};

function Cabecera({ titulo, sub }: { titulo: string; sub: string }) {
  return (
    <div className="border-b border-black/5 px-4 pb-2.5 pt-3">
      <div className="text-[14px] font-bold text-carbon">{titulo}</div>
      <div className="text-[12px] text-carbon/55">{sub}</div>
    </div>
  );
}

function Cifra({ valor, texto }: { valor: string; texto: string }) {
  return (
    <div>
      <div className="text-[20px] font-bold leading-tight tabular-nums text-carbon">{valor}</div>
      <div className="text-[12px] text-carbon/55">{texto}</div>
    </div>
  );
}

function Chip({ r, n }: { r: Resultado; n: number }) {
  if (!n) return null;
  return (
    <span className={"whitespace-nowrap rounded-full border px-2 py-px text-[11px] font-semibold tabular-nums " + RESULTADO[r].clase}>
      {n} {RESULTADO[r].texto}
    </span>
  );
}

function Opps({ opps }: { opps: OppDeGestor[] }) {
  if (!opps.length) return <p className="px-4 pb-3 text-[12px] text-carbon/50">Ninguna oportunidad suya todavía.</p>;
  return (
    <div className="grid gap-3 px-4 pb-3 md:grid-cols-3">
      {(["en_curso", "ganada", "perdida"] as Resultado[]).map((r) => {
        const de = opps.filter((o) => o.resultado === r);
        return (
          <div key={r}>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.05em] text-carbon/55">
              {RESULTADO[r].texto} · {de.length}
            </div>
            {de.length === 0 ? (
              <p className="text-[12px] text-carbon/40">—</p>
            ) : (
              <ul className="space-y-0.5">
                {de.map((o) => (
                  <li key={o.id}>
                    <Link href={`/comercial/oportunidades/${o.id}`} className="block truncate text-[12px] text-carbon/80 hover:text-lima-dark hover:underline">
                      {o.codigo && <span className="font-mono text-carbon/55">{o.codigo} </span>}
                      {o.direccion ?? "(sin dirección)"}
                      {o.firma && <span className="text-carbon/45"> · firmada {fecha(o.firma)}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FilaGestor({ g }: { g: GestorCartera }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <li>
      <button type="button" onClick={() => setAbierta((x) => !x)} className="flex w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-black/[0.02]">
        <span className="w-3 shrink-0 text-[11px] text-carbon/40">{abierta ? "▾" : "▸"}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold text-carbon">{g.nombre}</span>
          <span className="block truncate text-[12px] text-carbon/55">{g.administracion ?? "sin administración"}</span>
        </span>
        <span className="flex shrink-0 flex-wrap justify-end gap-1">
          <Chip r="en_curso" n={g.enCurso} />
          <Chip r="ganada" n={g.ganadas} />
          <Chip r="perdida" n={g.perdidas} />
          {g.total === 0 && <span className="text-[11px] text-carbon/40">sin oportunidades</span>}
        </span>
        <span className="w-[44px] shrink-0 text-right text-[12px] font-bold tabular-nums text-carbon/70">{g.pct === null ? "" : `${g.pct}%`}</span>
      </button>
      {abierta && <Opps opps={g.opps} />}
    </li>
  );
}

/** La columna izquierda: la cartera de consolidados. */
export function CarteraConsolidados({ c, todos }: { c: CarteraGestores; todos: boolean }) {
  const [filtro, setFiltro] = useState("");
  const limpio = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const q = limpio(filtro.trim());
  const lista = q ? c.gestores.filter((g) => limpio(`${g.nombre} ${g.administracion ?? ""}`).includes(q)) : c.gestores;
  return (
    <section className={CAJA}>
      <Cabecera titulo={todos ? "Toda la cartera" : "Mi cartera"} sub="administradores consolidados: con al menos una hoja firmada" />
      <div className="flex flex-wrap gap-x-8 gap-y-2 border-b border-black/5 px-4 py-3">
        <Cifra valor={String(c.resumen.gestores)} texto="administradores" />
        <Cifra valor={String(c.resumen.opps)} texto="oportunidades" />
        <Cifra valor={c.resumen.pct === null ? "—" : `${c.resumen.pct}%`} texto={`ganadas (${c.resumen.ganadas} de ${c.resumen.ganadas + c.resumen.perdidas} decididas)`} />
        <Cifra valor={c.resumen.dias === null ? "—" : `${c.resumen.dias} días`} texto="de la apertura a la firma, de media" />
      </div>
      <div className="border-b border-black/5 px-4 py-2">
        <input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar un administrador o una administración…"
          className="w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm text-carbon outline-none focus:border-lima"
        />
      </div>
      {lista.length === 0 ? (
        <p className="px-4 py-6 text-[13px] text-carbon/55">{c.gestores.length ? "Ninguno coincide." : "Todavía no hay administradores consolidados."}</p>
      ) : (
        <ul className="max-h-[38rem] divide-y divide-black/5 overflow-y-auto">
          {lista.map((g) => (
            <FilaGestor key={g.id} g={g} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Ranking({ filas, tono }: { filas: GestorCartera[]; tono: "bien" | "mal" }) {
  return (
    <ul className="divide-y divide-black/5">
      {filas.map((g, i) => (
        <li key={g.id} className="flex items-center gap-2 px-4 py-2">
          <span className="w-4 shrink-0 text-[12px] font-bold tabular-nums text-carbon/35">{i + 1}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-carbon">{g.nombre}</span>
            <span className="block truncate text-[11px] text-carbon/55">
              {g.administracion ?? "sin administración"} · {g.ganadas} firmadas de {g.ganadas + g.perdidas}
            </span>
          </span>
          <span className={"shrink-0 text-[13px] font-bold tabular-nums " + (tono === "bien" ? "text-lima-dark" : "text-alerta")}>{g.pct}%</span>
        </li>
      ))}
    </ul>
  );
}

/** La columna derecha de esta pestaña: no consolidados, estrella y los que marean. */
export function CarteraLateral({ c }: { c: CarteraGestores }) {
  const [todos, setTodos] = useState(false);
  const posibles = todos ? c.noConsolidados : c.noConsolidados.slice(0, 5);
  return (
    <div className="flex flex-col gap-3">
      <section className={CAJA}>
        <Cabecera titulo={`Admin no consolidados · ${c.noConsolidados.length}`} sub="no has firmado nada con ellos todavía" />
        {c.noConsolidados.length === 0 ? (
          <p className="px-4 py-5 text-[12px] text-carbon/55">Ninguno: todos los que tienes ya han firmado.</p>
        ) : (
          <>
            <ul className="divide-y divide-black/5">
              {posibles.map((p) => (
                <li key={p.id}>
                  <Link href={`/consulta/personas/${p.personaId}`} className="flex items-center gap-2 px-4 py-2 transition hover:bg-black/[0.02]">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-carbon">{p.nombre}</span>
                      <span className="block truncate text-[11px] text-carbon/55">
                        {[p.administracion ?? "sin administración", p.telefono].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] tabular-nums text-carbon/55">creado {fecha(p.creado)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {c.noConsolidados.length > 5 && (
              <button type="button" onClick={() => setTodos((x) => !x)} className="w-full border-t border-black/5 px-4 py-2 text-left text-[12px] font-semibold text-lima-dark hover:underline">
                {todos ? "Ver menos" : `Ver más (${c.noConsolidados.length - 5})`}
              </button>
            )}
          </>
        )}
      </section>

      <section className={CAJA}>
        <Cabecera titulo="Estrella" sub="los que más firman, en proporción · desde enero de 2025" />
        {c.estrella.length ? <Ranking filas={c.estrella} tono="bien" /> : <p className="px-4 py-5 text-[12px] text-carbon/55">Aún no hay ninguno con hojas firmadas.</p>}
      </section>

      <section className={CAJA}>
        <Cabecera titulo="Que marean" sub="peor proporción, con al menos 5 perdidas · desde enero de 2025" />
        {c.marean.length ? (
          <Ranking filas={c.marean} tono="mal" />
        ) : (
          <p className="px-4 py-5 text-[12px] leading-relaxed text-carbon/55">
            Desde enero de 2025 ninguno tiene 5 oportunidades perdidas. Saldrán al cerrar las que no siguen adelante y al apuntar su administrador.
          </p>
        )}
      </section>
    </div>
  );
}
