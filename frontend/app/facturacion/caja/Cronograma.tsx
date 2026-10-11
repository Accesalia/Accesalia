"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { DatosCaja } from "../../../lib/cobros";

// LA SEMILLA DEL CRONOGRAMA (Monica, 11-oct-2026).
//
// "Que esa pantalla JUNTE proyectos y requerimientos y permita arrastrar un
//  proyecto arriba o abajo en la fila, para el recalculo... o incluso asignar
//  aqui el tecnico que lo va a llevar (cada tecnico tarda mas o menos)."
//
// Lo que conlleva tiempo hasta cobrar el hito de la entrega: el escaneo FARO, la
// redaccion del proyecto, el visado, el OK de la comunidad a facturar y el cargo
// en cuenta (2 dias; Iberdrola paga a 60). El calculo, en dias laborables:
//   escaneo (una cola, la del escaneo) -> redaccion (el tecnico, por su factor)
//   -> visado -> OK -> cobro.
// Los requerimientos ocupan tecnico y no cobran. La linea de corte suma lo que
// se habra cobrado hasta esa fecha: lo simulado y lo ya pactado con fecha.
//
// Todo lo de aqui es en memoria: nada se guarda todavia.

type Fila = {
  k: string;
  tipo: "proyecto" | "rq";
  nombre: string;
  oppId: string | null;
  euros: number;
  contrata: boolean;
  tecnico: string; // "" = el primero que quede libre
  escaneo: number;
  redaccion: number;
  visado: number;
  ok: number;
};
type Tecnico = { id: string; nombre: string; activo: boolean; factor: number };

const EUR = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" });
const DIA = 86400000;
const PX = 7; // pixeles por dia natural
const HORIZONTE = 200; // dias que se pintan
const iso = (d: Date) => d.toISOString().slice(0, 10);
const ddmm = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

/** Sumar dias LABORABLES (sin sabados ni domingos) a una fecha. Admite medios dias. */
function masLaborables(d: Date, n: number): Date {
  const r = new Date(d);
  let quedan = n;
  while (quedan > 0) {
    const paso = Math.min(1, quedan);
    r.setTime(r.getTime() + paso * DIA);
    while (r.getDay() === 0 || r.getDay() === 6) r.setTime(r.getTime() + DIA);
    quedan -= paso;
  }
  return r;
}
const max = (a: Date, b: Date) => (a > b ? a : b);

export function Cronograma({ d }: { d: DatosCaja }) {
  const hoy = useMemo(() => { const x = new Date(); x.setHours(0, 0, 0, 0); return x; }, []);
  const [filas, setFilas] = useState<Fila[]>(() =>
    d.trabajos.map((t) => ({
      k: t.oppId, tipo: "proyecto", nombre: t.nombre, oppId: t.oppId, euros: t.entrega, contrata: t.contrata,
      tecnico: "", escaneo: 2, redaccion: 3, visado: 5, ok: 3,
    })),
  );
  const [tecnicos, setTecnicos] = useState<Tecnico[]>(() => d.tecnicos.map((t) => ({ ...t, activo: false, factor: 1 })).map((t) => ({ ...t, activo: true })));
  const [cobroCargo, setCobroCargo] = useState(2);
  const [cobroContrata, setCobroContrata] = useState(60);
  const [corte, setCorte] = useState(() => iso(new Date(Date.now() + 65 * DIA)));
  const [verTecnicos, setVerTecnicos] = useState(false);
  const arrastrando = useRef<string | null>(null);

  // ------------------------------------------------------------ el calculo
  const plan = useMemo(() => {
    const libres = new Map(tecnicos.filter((t) => t.activo).map((t) => [t.id, hoy]));
    let escaneoLibre = hoy;
    return filas.map((f) => {
      let escIni = null as Date | null, escFin = null as Date | null;
      let inicio = hoy;
      if (f.tipo === "proyecto" && f.escaneo > 0) {
        escIni = escaneoLibre; escFin = masLaborables(escIni, f.escaneo); escaneoLibre = escFin; inicio = escFin;
      }
      // el tecnico: el asignado o el primero que quede libre
      let tec = f.tecnico && libres.has(f.tecnico) ? f.tecnico : "";
      if (!tec) tec = [...libres.entries()].sort((a, b) => a[1].getTime() - b[1].getTime())[0]?.[0] ?? "";
      const factor = tecnicos.find((t) => t.id === tec)?.factor ?? 1;
      const redIni = max(inicio, libres.get(tec) ?? hoy);
      const redFin = masLaborables(redIni, f.redaccion * factor);
      if (tec) libres.set(tec, redFin);
      if (f.tipo === "rq") return { f, tec, escIni, escFin, redIni, redFin, cobro: null as Date | null };
      const okFin = masLaborables(masLaborables(redFin, f.visado), f.ok);
      const cobro = f.contrata ? new Date(okFin.getTime() + cobroContrata * DIA) : masLaborables(okFin, cobroCargo);
      return { f, tec, escIni, escFin, redIni, redFin, cobro };
    });
  }, [filas, tecnicos, hoy, cobroCargo, cobroContrata]);

  const corteD = new Date(corte + "T00:00:00");
  const simulado = plan.filter((p) => p.cobro && p.cobro <= corteD).reduce((a, p) => a + p.f.euros, 0);
  const pactado = d.fijos.filter((c) => c.fecha <= corte && c.fecha >= iso(hoy)).reduce((a, c) => a + c.importe, 0);
  const vencido = d.fijos.filter((c) => c.fecha < iso(hoy)).reduce((a, c) => a + c.importe, 0);
  const nombreTec = (id: string) => tecnicos.find((t) => t.id === id)?.nombre.split(" ")[0] ?? "—";

  // ------------------------------------------------------------ mover filas
  const mover = (k: string, a: string) =>
    setFilas((fs) => {
      const de = fs.findIndex((x) => x.k === k), aI = fs.findIndex((x) => x.k === a);
      if (de < 0 || aI < 0 || de === aI) return fs;
      const n = [...fs]; const [x] = n.splice(de, 1); n.splice(aI, 0, x); return n;
    });
  const subirBajar = (k: string, paso: number) =>
    setFilas((fs) => {
      const i = fs.findIndex((x) => x.k === k), j = i + paso;
      if (j < 0 || j >= fs.length) return fs;
      const n = [...fs]; [n[i], n[j]] = [n[j], n[i]]; return n;
    });
  const cambiar = (k: string, c: Partial<Fila>) => setFilas((fs) => fs.map((x) => (x.k === k ? { ...x, ...c } : x)));
  const nuevoRq = () =>
    setFilas((fs) => [{ k: "rq" + Date.now(), tipo: "rq", nombre: "Requerimiento", oppId: null, euros: 0, contrata: false, tecnico: "", escaneo: 0, redaccion: 1, visado: 0, ok: 0 }, ...fs]);

  const xDe = (dt: Date) => Math.round(((dt.getTime() - hoy.getTime()) / DIA) * PX);
  const meses = useMemo(() => {
    const out: { x: number; t: string }[] = [];
    for (let i = 0; i < HORIZONTE; i++) {
      const dt = new Date(hoy.getTime() + i * DIA);
      if (dt.getDate() === 1 || i === 0) out.push({ x: i * PX, t: dt.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }) });
    }
    return out;
  }, [hoy]);

  const CAMPO = "w-12 rounded-md border border-black/15 bg-white px-1 py-0.5 text-right text-[12px]";
  return (
    <>
      {/* la cifra y la linea de corte */}
      <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div className="rounded-2xl border border-lima bg-lima-soft px-4 py-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-lima-dark">Cobrado previsto a</div>
          <div className="flex flex-wrap items-baseline gap-3">
            <input type="date" value={corte} onChange={(e) => e.target.value && setCorte(e.target.value)}
              className="rounded-md border border-lima/60 bg-white px-2 py-0.5 text-[13px]" />
            <span className="text-2xl font-bold tabular-nums text-carbon">{EUR.format(simulado + pactado)} €</span>
          </div>
          <div className="text-[12px] text-carbon/75">
            {EUR.format(simulado)} € de entregas simuladas · {EUR.format(pactado)} € de cobros pactados con fecha
          </div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-carbon/70">Pactado y ya vencido</div>
          <div className="text-xl font-bold tabular-nums">{EUR.format(vencido)} €</div>
          <div className="text-[12px] text-carbon/65">hitos con fecha pasada sin facturar</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-carbon/70">Depende de fuera</div>
          <div className="text-xl font-bold tabular-nums">{EUR.format(d.sinFecha.importe)} €</div>
          <div className="text-[12px] text-carbon/65">{d.sinFecha.hitos} hitos sin fecha (licencia, CFO, concesión…)</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-[12.5px]">
          <div className="text-[11px] font-bold uppercase tracking-wide text-carbon/70">Cobro tras el OK</div>
          <label className="mt-1 flex items-center gap-2">cargo en cuenta <input type="number" min={0} value={cobroCargo} onChange={(e) => setCobroCargo(Number(e.target.value))} className={CAMPO} /> días lab.</label>
          <label className="mt-1 flex items-center gap-2">contrata (Iberdrola…) <input type="number" min={0} value={cobroContrata} onChange={(e) => setCobroContrata(Number(e.target.value))} className={CAMPO} /> días</label>
          <button type="button" onClick={() => setVerTecnicos(!verTecnicos)} className="mt-2 font-semibold text-[#2f5f8a] hover:underline">
            Técnicos: {tecnicos.filter((t) => t.activo).length} disponibles {verTecnicos ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {verTecnicos && (
        <div className="mt-3 grid gap-x-6 gap-y-1 rounded-2xl border border-black/10 bg-white p-4 text-[12.5px] sm:grid-cols-2 lg:grid-cols-4">
          {tecnicos.map((t) => (
            <label key={t.id} className="flex items-center gap-2">
              <input type="checkbox" checked={t.activo} onChange={(e) => setTecnicos(tecnicos.map((x) => (x.id === t.id ? { ...x, activo: e.target.checked } : x)))} className="accent-[#7a9a01]" />
              <span className="min-w-0 flex-1 truncate">{t.nombre}</span>
              <span className="text-carbon/60">tarda ×</span>
              <input type="number" step={0.1} min={0.3} value={t.factor} onChange={(e) => setTecnicos(tecnicos.map((x) => (x.id === t.id ? { ...x, factor: Number(e.target.value) || 1 } : x)))} className={CAMPO} />
            </label>
          ))}
          {!tecnicos.length && <span className="text-carbon/60">No hay técnicos con la función de proyecto.</span>}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={nuevoRq} className="rounded-xl border border-black/15 bg-white px-3 py-1.5 text-[13px] font-semibold text-carbon/80 hover:border-carbon/40">
          + Requerimiento
        </button>
        <span className="text-[12.5px] text-carbon/65">Arrastra las filas (o ▲▼) para cambiar el orden; todo se recalcula. Días en laborables.</span>
      </div>

      {/* la lista y el cronograma, fila a fila */}
      <div className="mt-2 overflow-x-auto rounded-2xl border border-black/10 bg-white shadow-sm">
        <div style={{ minWidth: 640 + HORIZONTE * PX }}>
          <div className="sticky top-0 z-10 flex border-b border-black/10 bg-[#f1f1ee] text-[10.5px] font-bold uppercase tracking-wide text-carbon/70">
            <div className="flex w-[640px] shrink-0 gap-2 px-2 py-1.5">
              <span className="w-[230px]">Trabajo</span><span className="w-[110px]">Técnico</span>
              <span className="w-12 text-right">Esc.</span><span className="w-12 text-right">Pry.</span><span className="w-12 text-right">Vis.</span><span className="w-12 text-right">OK</span>
              <span className="flex-1 text-right">€ hito</span>
            </div>
            <div className="relative h-7 shrink-0" style={{ width: HORIZONTE * PX }}
              onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setCorte(iso(new Date(hoy.getTime() + Math.round((e.clientX - r.left) / PX) * DIA))); }}
              title="Pincha para poner aquí la línea de corte">
              {meses.map((m, i) => <span key={i} className="absolute top-1.5 border-l border-black/15 pl-1" style={{ left: m.x }}>{m.t}</span>)}
            </div>
          </div>

          {/* cobros pactados con fecha */}
          <div className="flex border-b border-black/10 bg-amber-50/40">
            <div className="w-[640px] shrink-0 px-2 py-1.5 text-[12px] font-semibold text-amber-900">Cobros pactados con fecha ({d.fijos.length})</div>
            <div className="relative h-8 shrink-0" style={{ width: HORIZONTE * PX }}>
              {d.fijos.filter((c) => c.fecha >= iso(hoy)).map((c, i) => (
                <span key={i} title={`${c.nombre} · ${c.fecha} · ${EUR.format(c.importe)} €`} className="absolute top-2 h-4 w-1.5 rounded-sm bg-amber-500" style={{ left: xDe(new Date(c.fecha + "T00:00:00")) }} />
              ))}
              <Corte x={xDe(corteD)} />
            </div>
          </div>

          {plan.map((p, i) => {
            const f = p.f;
            return (
              <div key={f.k} draggable onDragStart={() => (arrastrando.current = f.k)} onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (arrastrando.current) mover(arrastrando.current, f.k); arrastrando.current = null; }}
                className={"flex border-b border-black/5 hover:bg-lima-soft/30 " + (f.tipo === "rq" ? "bg-ajeno-soft/40" : "")}>
                <div className="flex w-[640px] shrink-0 items-center gap-2 px-2 py-1 text-[12.5px]">
                  <span className="flex w-[230px] items-center gap-1">
                    <span className="cursor-grab select-none text-carbon/40" title="Arrastra">⋮⋮</span>
                    <span className="flex flex-col text-[9px] leading-none text-carbon/50">
                      <button type="button" onClick={() => subirBajar(f.k, -1)} disabled={i === 0}>▲</button>
                      <button type="button" onClick={() => subirBajar(f.k, 1)} disabled={i === plan.length - 1}>▼</button>
                    </span>
                    {f.tipo === "rq" ? (
                      <>
                        <input value={f.nombre} onChange={(e) => cambiar(f.k, { nombre: e.target.value })} className="min-w-0 flex-1 rounded-md border border-black/15 bg-white px-1 py-0.5 text-[12px]" />
                        <button type="button" className="text-alerta" title="Quitar" onClick={() => setFilas(filas.filter((x) => x.k !== f.k))}>×</button>
                      </>
                    ) : (
                      <Link href={`/facturacion/${f.oppId}`} className="min-w-0 flex-1 truncate font-medium text-carbon hover:underline" title={f.nombre}>{f.nombre}</Link>
                    )}
                  </span>
                  <select value={f.tecnico} onChange={(e) => cambiar(f.k, { tecnico: e.target.value })} className="w-[110px] rounded-md border border-black/15 bg-white px-1 py-0.5 text-[12px]">
                    <option value="">{p.tec ? `auto: ${nombreTec(p.tec)}` : "auto"}</option>
                    {tecnicos.filter((t) => t.activo).map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                  {(["escaneo", "redaccion", "visado", "ok"] as const).map((c) => (
                    <input key={c} type="number" min={0} step={0.5} value={f[c]} disabled={f.tipo === "rq" && c !== "redaccion"}
                      onChange={(e) => cambiar(f.k, { [c]: Number(e.target.value) } as Partial<Fila>)} className={CAMPO + " disabled:opacity-30"} />
                  ))}
                  <span className="flex-1 text-right tabular-nums">{f.tipo === "rq" ? <span className="text-ajeno">no cobra</span> : `${EUR.format(f.euros)} €`}</span>
                </div>
                <div className="relative h-8 shrink-0" style={{ width: HORIZONTE * PX }}>
                  {p.escIni && p.escFin && <Barra x={xDe(p.escIni)} w={xDe(p.escFin) - xDe(p.escIni)} cls="bg-ajeno/70" t="Escaneo" />}
                  <Barra x={xDe(p.redIni)} w={xDe(p.redFin) - xDe(p.redIni)} cls={f.tipo === "rq" ? "bg-ajeno" : "bg-lima"} t={`${f.tipo === "rq" ? "Requerimiento" : "Proyecto"} · ${nombreTec(p.tec)}`} />
                  {p.cobro && (
                    <>
                      <Barra x={xDe(p.redFin)} w={xDe(p.cobro) - xDe(p.redFin)} cls="bg-black/10" t="Visado, OK y cobro" />
                      <span title={`Cobro ${ddmm(p.cobro)} · ${EUR.format(f.euros)} €`} className={"absolute top-1.5 h-5 w-1.5 rounded-sm " + (p.cobro <= corteD ? "bg-lima-dark" : "bg-carbon/40")} style={{ left: xDe(p.cobro) }} />
                    </>
                  )}
                  <Corte x={xDe(corteD)} />
                </div>
              </div>
            );
          })}
          {!plan.length && <p className="px-4 py-8 text-center text-carbon/60">No hay proyectos con la entrega por facturar.</p>}
        </div>
      </div>
    </>
  );
}

function Barra({ x, w, cls, t }: { x: number; w: number; cls: string; t: string }) {
  if (x > HORIZONTE * PX) return null;
  return <span title={t} className={"absolute top-2 h-4 rounded-sm " + cls} style={{ left: Math.max(0, x), width: Math.max(3, w) }} />;
}

function Corte({ x }: { x: number }) {
  if (x < 0 || x > HORIZONTE * PX) return null;
  return <span className="pointer-events-none absolute inset-y-0 w-0.5 bg-alerta" style={{ left: x }} />;
}
