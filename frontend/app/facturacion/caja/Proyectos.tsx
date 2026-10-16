"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CobroFijo } from "../../../lib/cobros";
import type { Trabajo } from "../../../lib/trabajosTecnico";
import { accionBuscarOpp, accionCorregir, accionOrdenar, accionRequerimiento } from "./acciones";

// ASIGNAR › PROYECTOS (Monica, 16-oct-2026). Sustituye al cronograma del 11-oct,
// que repartia solo: aqui NADA SE PREASIGNA.
//   Arriba, la simulacion: «si asigno asi, a fecha X ¿cuanto cobro?» (proyecto
//   + visado + OK + cargo en cuenta, o los 60 dias de las contratas), lo pactado
//   y vencido (si apretamos, entra), lo que depende de fuera y la cola que aun
//   no se puede asignar (esperando nube, por estimar).
//   Debajo, POR ASIGNAR: lo que Alex ya estimo, y los requerimientos. Se elige
//   el tecnico a mano.
//   Debajo, CADA TECNICO con su lista: se arrastra (o ▲▼) para ordenar o pasar
//   a otro y se cambian dias y dificultad (el tecnico avisa de que tarda mas).
//   Se pliegan uno a uno o todos. Lo HECHO no lo marca nadie: lo pondra la app
//   cuando el tecnico suba los planos en PDF (aun no montado).
// LAS CIFRAS SON BASE IMPONIBLE, con «+ IVA» a la vista (Monica, 16-oct-2026:
// «como minimo dejemos la cifra asi, pero que sea obvio que es BI»).
// Lo que se guarda: tecnico, orden, dias y dificultad. Lo que es
// solo simulacion (quien esta disponible, cuanto tarda cada uno, visado y OK de
// cada fila, la linea de corte), no.

type Tecnico = { id: string; nombre: string };
type Ajustes = { activo: boolean; factor: number };
type Plan = { t: Trabajo; ini: Date; fin: Date; cobro: Date | null };

const EUR = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" });
const DIA = 86400000;
const PX = 7;
const HORIZONTE = 200;
const OK_DIAS = 3;
const iso = (d: Date) => d.toLocaleDateString("sv-SE");
const ddmm = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
const coma = (n: number | null) => (n == null ? "" : String(n).replace(".", ","));
const numero = (v: string) => Number(v.replace(",", "."));

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

const CAMPO = "w-12 rounded-md border border-black/15 bg-white px-1 py-0.5 text-right text-[12px]";
const CHIP = "inline-flex h-[20px] items-center whitespace-nowrap rounded-full px-2 text-[11.5px] font-bold";
const COLOR_DIF = { baja: "bg-[#e3f2d4] text-[#2f5d14]", normal: "bg-[#f0f1ee] text-[#55594f]", alta: "bg-[#f6dfdd] text-[#8e2f2d]" };

export function Proyectos(props: {
  porAsignar: Trabajo[];
  asignados: Trabajo[];
  entregados: Trabajo[];
  tecnicos: Tecnico[];
  fijos: CobroFijo[];
  sinFecha: { importe: number; hitos: number };
  visadoDias: number;
  esperandoNube: number;
  porEstimar: number;
}) {
  const router = useRouter();
  const hoy = useMemo(() => { const x = new Date(); x.setHours(0, 0, 0, 0); return x; }, []);
  const [porAsignar, setPorAsignar] = useState(props.porAsignar);
  const [listas, setListas] = useState(() => agrupar(props.asignados));
  useEffect(() => { setPorAsignar(props.porAsignar); setListas(agrupar(props.asignados)); }, [props.porAsignar, props.asignados]);

  const [ajustes, setAjustes] = useState<Record<string, Ajustes>>(() => Object.fromEntries(props.tecnicos.map((t) => [t.id, { activo: true, factor: 1 }])));
  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set(props.tecnicos.map((t) => t.id)));
  const [verTecnicos, setVerTecnicos] = useState(false);
  const [cobroCargo, setCobroCargo] = useState(2);
  const [cobroContrata, setCobroContrata] = useState(60);
  const [visado, setVisado] = useState<Record<string, number>>({});
  const [ok, setOk] = useState<Record<string, number>>({});
  const [corte, setCorte] = useState(() => iso(new Date(Date.now() + 65 * DIA)));
  const [guardando, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const arrastrando = useRef<string | null>(null);

  const guardar = (hacer: () => Promise<{ ok: boolean; error?: string }>) =>
    empezar(async () => {
      setError(null);
      const r = await hacer();
      if (!r.ok) setError(r.error ?? "No se guardó");
      router.refresh();
    });

  // ------------------------------------------------------------ la simulacion
  const cobroDe = (t: Trabajo, fin: Date) => {
    if (t.tipo === "requerimiento") return null;
    const okFin = masLaborables(masLaborables(fin, visado[t.oppId] ?? props.visadoDias), ok[t.oppId] ?? OK_DIAS);
    return t.contrata ? new Date(okFin.getTime() + cobroContrata * DIA) : masLaborables(okFin, cobroCargo);
  };
  const plan = useMemo(() => {
    const out = new Map<string, Plan[]>();
    for (const tec of props.tecnicos) {
      const a = ajustes[tec.id] ?? { activo: true, factor: 1 };
      let libre = hoy;
      out.set(
        tec.id,
        (listas[tec.id] ?? []).map((t) => {
          const ini = libre;
          const fin = masLaborables(ini, (t.dias ?? 0) * (a.activo ? a.factor : 1));
          libre = fin;
          return { t, ini, fin, cobro: cobroDe(t, fin) };
        }),
      );
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listas, ajustes, props.tecnicos, hoy, cobroCargo, cobroContrata, visado, ok, props.visadoDias]);
  const entregados = props.entregados.map((t) => {
    const fin = new Date(t.terminado!);
    fin.setHours(0, 0, 0, 0);
    return { t, ini: fin, fin, cobro: cobroDe(t, fin) };
  });

  const corteD = new Date(corte + "T00:00:00");
  const activos = props.tecnicos.filter((t) => ajustes[t.id]?.activo !== false);
  const todos = [...activos.flatMap((t) => plan.get(t.id) ?? []), ...entregados];
  const simulado = todos.filter((p) => p.cobro && p.cobro <= corteD).reduce((s, p) => s + p.t.entrega, 0);
  const pactado = props.fijos.filter((c) => c.fecha <= corte && c.fecha >= iso(hoy)).reduce((s, c) => s + c.importe, 0);
  const vencido = props.fijos.filter((c) => c.fecha < iso(hoy)).reduce((s, c) => s + c.importe, 0);
  const sinAsignarEur = porAsignar.reduce((s, t) => s + t.entrega, 0);

  // ------------------------------------------------------------ mover
  const idsDe = (tec: string) => (listas[tec] ?? []).map((t) => t.id!);
  /** Llevar un trabajo a la lista de un tecnico, delante de otro (o al final). */
  const llevar = (id: string, tec: string, delante?: string) => {
    const t = porAsignar.find((x) => x.id === id) ?? Object.values(listas).flat().find((x) => x.id === id);
    if (!t) return;
    const destino = (listas[tec] ?? []).filter((x) => x.id !== id);
    const i = delante ? destino.findIndex((x) => x.id === delante) : -1;
    destino.splice(i < 0 ? destino.length : i, 0, { ...t, tecnicoId: tec });
    const nuevas = Object.fromEntries(Object.entries(listas).map(([k, l]) => [k, l.filter((x) => x.id !== id)]));
    nuevas[tec] = destino;
    setListas(nuevas);
    setPorAsignar((l) => l.filter((x) => x.id !== id));
    guardar(() => accionOrdenar(tec, destino.map((x) => x.id!)));
  };
  const soltar = (id: string) => {
    setListas((ls) => Object.fromEntries(Object.entries(ls).map(([k, l]) => [k, l.filter((x) => x.id !== id)])));
    guardar(() => accionOrdenar(null, [id]));
  };
  const subirBajar = (tec: string, id: string, paso: number) => {
    const l = [...(listas[tec] ?? [])];
    const i = l.findIndex((x) => x.id === id), j = i + paso;
    if (i < 0 || j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]];
    setListas({ ...listas, [tec]: l });
    guardar(() => accionOrdenar(tec, l.map((x) => x.id!)));
  };
  const corregir = (t: Trabajo, cambios: { dias?: number; dificultad?: string }) => {
    const aplicar = (x: Trabajo) => (x.id === t.id ? { ...x, ...cambios, dificultad: (cambios.dificultad ?? x.dificultad) as Trabajo["dificultad"] } : x);
    setListas((ls) => Object.fromEntries(Object.entries(ls).map(([k, l]) => [k, l.map(aplicar)])));
    setPorAsignar((l) => l.map(aplicar));
    guardar(() => accionCorregir(t.id!, cambios));
  };

  const xDe = (dt: Date) => Math.round(((dt.getTime() - hoy.getTime()) / DIA) * PX);
  const meses = useMemo(() => {
    const out: { x: number; t: string }[] = [];
    for (let i = 0; i < HORIZONTE; i++) {
      const dt = new Date(hoy.getTime() + i * DIA);
      if (dt.getDate() === 1 || i === 0) out.push({ x: i * PX, t: dt.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }) });
    }
    return out;
  }, [hoy]);

  // ------------------------------------------------------------ piezas
  const Obras = ({ t }: { t: Trabajo }) =>
    t.tipo === "requerimiento" ? (
      <span className={CHIP + " w-fit max-w-full truncate bg-ajeno-soft text-[#3b5f86]"}>{t.nombre}</span>
    ) : (
      <span className="truncate text-[12px] text-[#7b8077]">{t.obras.join(" + ") || "—"}</span>
    );
  const SelectorTecnico = ({ t, vacio }: { t: Trabajo; vacio: string }) => (
    <select
      value={t.tecnicoId ?? ""}
      disabled={guardando}
      onChange={(e) => (e.target.value ? llevar(t.id!, e.target.value) : soltar(t.id!))}
      className="w-[150px] rounded-md border border-black/15 bg-white px-1 py-1 text-[12.5px]"
      aria-label="Técnico"
    >
      <option value="">{vacio}</option>
      {props.tecnicos.map((x) => (
        <option key={x.id} value={x.id}>{x.nombre}</option>
      ))}
    </select>
  );

  const filaTecnico = (tec: string, p: Plan, i: number, n: number) => {
    const t = p.t;
    return (
      <div
        key={t.id}
        draggable
        onDragStart={() => (arrastrando.current = t.id)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.stopPropagation(); if (arrastrando.current && arrastrando.current !== t.id) llevar(arrastrando.current, tec, t.id!); arrastrando.current = null; }}
        className={"flex border-b border-black/5 hover:bg-lima-soft/30 " + (t.tipo === "requerimiento" ? "bg-ajeno-soft/40" : "")}
      >
        <div className="flex w-[720px] shrink-0 items-center gap-2 px-2 py-1 text-[12.5px]">
          <span className="cursor-grab select-none text-carbon/40" title="Arrastra para ordenar o pasarlo a otro técnico">⋮⋮</span>
          <span className="flex flex-col text-[9px] leading-none text-carbon/50">
            <button type="button" onClick={() => subirBajar(tec, t.id!, -1)} disabled={i === 0} aria-label="Subir">▲</button>
            <button type="button" onClick={() => subirBajar(tec, t.id!, 1)} disabled={i === n - 1} aria-label="Bajar">▼</button>
          </span>
          <span className="flex w-[240px] min-w-0 flex-col">
            <Link href={`/facturacion/${t.oppId}`} className="truncate font-semibold text-carbon hover:underline" title={t.direccion}>{t.direccion}</Link>
            <Obras t={t} />
          </span>
          <select value={t.dificultad} onChange={(e) => corregir(t, { dificultad: e.target.value })} className={`rounded-md border-0 px-1 py-0.5 text-[11.5px] font-bold ${COLOR_DIF[t.dificultad]}`} aria-label="Dificultad">
            <option value="baja">baja</option>
            <option value="normal">normal</option>
            <option value="alta">alta</option>
          </select>
          <input
            key={`${t.id}-${t.dias}`}
            defaultValue={coma(t.dias)}
            inputMode="decimal"
            onBlur={(e) => { const d = numero(e.target.value); if (d > 0 && d !== t.dias) corregir(t, { dias: d }); }}
            className={CAMPO}
            aria-label="Días de redacción"
            title="Días de redacción (se guarda)"
          />
          {t.tipo === "proyecto" ? (
            <>
              <input type="number" min={0} value={visado[t.oppId] ?? props.visadoDias} onChange={(e) => setVisado({ ...visado, [t.oppId]: Number(e.target.value) })} className={CAMPO} title="Visado (simulación)" aria-label="Visado" />
              <input type="number" min={0} value={ok[t.oppId] ?? OK_DIAS} onChange={(e) => setOk({ ...ok, [t.oppId]: Number(e.target.value) })} className={CAMPO} title="OK de la comunidad (simulación)" aria-label="OK" />
            </>
          ) : (
            <span className="w-[104px]" />
          )}
          <span className="w-[70px] text-right tabular-nums">{t.tipo === "requerimiento" ? <span className="text-ajeno">no cobra</span> : `${EUR.format(t.entrega)} €`}</span>
        </div>
        <div className="relative h-9 shrink-0" style={{ width: HORIZONTE * PX }}>
          <Barra x={xDe(p.ini)} w={xDe(p.fin) - xDe(p.ini)} cls={t.tipo === "requerimiento" ? "bg-ajeno" : "bg-lima"} t={`${t.tipo === "requerimiento" ? "Requerimiento" : "Proyecto"} · ${ddmm(p.ini)} → ${ddmm(p.fin)}`} />
          {p.cobro && (
            <>
              <Barra x={xDe(p.fin)} w={xDe(p.cobro) - xDe(p.fin)} cls="bg-black/10" t="Visado, OK y cobro" />
              <span title={`Cobro ${ddmm(p.cobro)} · ${EUR.format(t.entrega)} €`} className={"absolute top-2 h-5 w-1.5 rounded-sm " + (p.cobro <= corteD ? "bg-lima-dark" : "bg-carbon/40")} style={{ left: xDe(p.cobro) }} />
            </>
          )}
          <Corte x={xDe(corteD)} />
        </div>
      </div>
    );
  };

  return (
    <>
      {/* LA SIMULACION */}
      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div className="rounded-2xl border border-lima bg-lima-soft px-4 py-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-lima-dark">Cobrado previsto a</div>
          <div className="flex flex-wrap items-baseline gap-3">
            <input type="date" value={corte} onChange={(e) => e.target.value && setCorte(e.target.value)} className="rounded-md border border-lima/60 bg-white px-2 py-0.5 text-[13px]" />
            <span className="text-2xl font-bold tabular-nums text-carbon">{EUR.format(simulado + pactado)} €<span className="ml-1 text-[13px] font-semibold text-carbon/60">+ IVA</span></span>
          </div>
          <div className="text-[12px] text-carbon/75">
            {EUR.format(simulado)} € de entregas según lo asignado · {EUR.format(pactado)} € de cobros pactados con fecha
          </div>
          <div className="mt-1 text-[12px] text-amber-900/80">Lo que hace falta a esa fecha: lo dirá Prever (faltan nóminas, SS y gastos fijos).</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-carbon/70">Pactado y ya vencido</div>
          <div className="text-xl font-bold tabular-nums">{EUR.format(vencido)} €<span className="ml-1 text-[13px] font-semibold text-carbon/60">+ IVA</span></div>
          <div className="text-[12px] text-carbon/65">lo nuestro está hecho y no se ha cobrado: si apretamos, entra</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-carbon/70">Depende de fuera</div>
          <div className="text-xl font-bold tabular-nums">{EUR.format(props.sinFecha.importe)} €<span className="ml-1 text-[13px] font-semibold text-carbon/60">+ IVA</span></div>
          <div className="text-[12px] text-carbon/65">{props.sinFecha.hitos} hitos de fases posteriores (licencia, CFO, concesión…)</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-[12.5px]">
          <div className="text-[11px] font-bold uppercase tracking-wide text-carbon/70">Cobro tras el OK</div>
          <label className="mt-1 flex items-center gap-2">cargo en cuenta <input type="number" min={0} value={cobroCargo} onChange={(e) => setCobroCargo(Number(e.target.value))} className={CAMPO} /> días lab.</label>
          <label className="mt-1 flex items-center gap-2">contrata (Iberdrola…) <input type="number" min={0} value={cobroContrata} onChange={(e) => setCobroContrata(Number(e.target.value))} className={CAMPO} /> días</label>
          <button type="button" onClick={() => setVerTecnicos(!verTecnicos)} className="mt-2 font-semibold text-[#2f5f8a] hover:underline">
            Técnicos: {activos.length} disponibles {verTecnicos ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {verTecnicos && (
        <div className="mt-3 grid gap-x-6 gap-y-1 rounded-2xl border border-black/10 bg-white p-4 text-[12.5px] sm:grid-cols-2 lg:grid-cols-4">
          {props.tecnicos.map((t) => (
            <label key={t.id} className="flex items-center gap-2">
              <input type="checkbox" checked={ajustes[t.id]?.activo !== false} onChange={(e) => setAjustes({ ...ajustes, [t.id]: { ...(ajustes[t.id] ?? { factor: 1 }), activo: e.target.checked } })} />
              <span className="min-w-0 flex-1 truncate">{t.nombre}</span>
              <span className="text-carbon/60">tarda ×</span>
              <input type="number" step={0.1} min={0.3} value={ajustes[t.id]?.factor ?? 1} onChange={(e) => setAjustes({ ...ajustes, [t.id]: { ...(ajustes[t.id] ?? { activo: true }), factor: Number(e.target.value) || 1 } })} className={CAMPO} />
            </label>
          ))}
        </div>
      )}

      {/* LA COLA QUE AUN NO SE PUEDE ASIGNAR */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-[13px]">
        {props.esperandoNube > 0 && (
          <Link href="/facturacion/nubes" className="rounded-xl border border-ajeno/40 bg-ajeno-soft px-3 py-1.5 font-semibold text-[#3f5f80] hover:border-ajeno">
            {props.esperandoNube} esperando su nube → Proceso de nubes
          </Link>
        )}
        {props.porEstimar > 0 && (
          <span className="rounded-xl border border-black/10 bg-white px-3 py-1.5 font-semibold text-carbon/75">{props.porEstimar} esperando que Alex los estime</span>
        )}
        {guardando && <span className="text-carbon/60">Guardando…</span>}
        {error && <span className="font-semibold text-alerta">No se guardó: {error}</span>}
      </div>

      {/* POR ASIGNAR */}
      <section className="mt-3 overflow-hidden rounded-[14px] border border-[#e3e6df] bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-[#eef0eb] px-5 py-3.5">
          <b className="text-[16px]">
            Por asignar <span className="ml-1 rounded-[10px] bg-black/[.08] px-2 py-px text-[12px] font-extrabold">{porAsignar.length}</span>
          </b>
          <span className="text-[13px] text-carbon/65">{EUR.format(sinAsignarEur)} € + IVA a la entrega esperando técnico</span>
          <NuevoRequerimiento alCrear={() => router.refresh()} />
        </div>
        {porAsignar.length ? (
          porAsignar.map((t) => (
            <div key={t.id} draggable onDragStart={() => (arrastrando.current = t.id)} className="flex items-center gap-3 border-b border-[#f0f2ee] px-5 py-2.5 text-[13px] last:border-0">
              <span className="cursor-grab select-none text-carbon/40" title="Arrastra a la lista de un técnico">⋮⋮</span>
              <span className="flex w-[300px] min-w-0 flex-col">
                <Link href={`/facturacion/${t.oppId}`} className="truncate text-[14px] font-bold text-carbon hover:underline">{t.direccion}</Link>
                <Obras t={t} />
              </span>
              <span className={CHIP + " " + COLOR_DIF[t.dificultad]}>{t.dificultad}</span>
              <span className="w-[70px] text-right tabular-nums">{coma(t.dias)} {t.dias === 1 ? "día" : "días"}</span>
              <span className="h-2 rounded-full bg-lima/70" style={{ width: Math.max(6, (t.dias ?? 0) * 14) }} title={`${coma(t.dias)} días de redacción`} />
              <span className="ml-auto w-[90px] text-right font-bold tabular-nums">{t.tipo === "requerimiento" ? <span className="font-normal text-ajeno">no cobra</span> : `${EUR.format(t.entrega)} €`}</span>
              {t.contrata && <span className={CHIP + " bg-amber-50 text-amber-900/80"}>contrata</span>}
              <SelectorTecnico t={t} vacio="Elegir técnico…" />
            </div>
          ))
        ) : (
          <p className="p-6 text-center text-[#7b8077]">Nada por asignar.</p>
        )}
      </section>

      {/* LOS TECNICOS */}
      <div className="mt-5 flex items-center gap-3">
        <b className="text-[16px]">Técnicos</b>
        <button type="button" onClick={() => setAbiertos(new Set(props.tecnicos.map((t) => t.id)))} className="text-[13px] font-semibold text-[#2f5f8a] hover:underline">desplegar todos</button>
        <button type="button" onClick={() => setAbiertos(new Set())} className="text-[13px] font-semibold text-[#2f5f8a] hover:underline">plegar todos</button>
        <span className="text-[12.5px] text-carbon/65">Arrastra las filas (o ▲▼) para ordenar o pasarlas a otro técnico; todo se recalcula. Días laborables.</span>
      </div>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-black/10 bg-white shadow-sm">
        <div style={{ minWidth: 720 + HORIZONTE * PX }}>
          <div className="sticky top-0 z-10 flex border-b border-black/10 bg-[#f1f1ee] text-[10.5px] font-bold uppercase tracking-wide text-carbon/70">
            <div className="flex w-[720px] shrink-0 gap-2 px-2 py-1.5">
              <span className="w-[268px] pl-8">Trabajo</span><span className="w-[64px]">Dific.</span>
              <span className="w-12 text-right">Pry.</span><span className="w-12 text-right">Vis.</span><span className="w-12 text-right">OK</span>
              <span className="w-[70px] text-right">€ + IVA</span>
            </div>
            <div
              className="relative h-7 shrink-0 cursor-pointer"
              style={{ width: HORIZONTE * PX }}
              onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setCorte(iso(new Date(hoy.getTime() + Math.round((e.clientX - r.left) / PX) * DIA))); }}
              title="Pincha para poner aquí la línea de corte"
            >
              {meses.map((m, i) => <span key={i} className="absolute top-1.5 border-l border-black/15 pl-1" style={{ left: m.x }}>{m.t}</span>)}
            </div>
          </div>

          <div className="flex border-b border-black/10 bg-amber-50/40">
            <div className="w-[720px] shrink-0 px-2 py-1.5 text-[12px] font-semibold text-amber-900">Cobros pactados con fecha ({props.fijos.length})</div>
            <div className="relative h-8 shrink-0" style={{ width: HORIZONTE * PX }}>
              {props.fijos.filter((c) => c.fecha >= iso(hoy)).map((c, i) => (
                <span key={i} title={`${c.nombre} · ${c.fecha} · ${EUR.format(c.importe)} €`} className="absolute top-2 h-4 w-1.5 rounded-sm bg-amber-500" style={{ left: xDe(new Date(c.fecha + "T00:00:00")) }} />
              ))}
              <Corte x={xDe(corteD)} />
            </div>
          </div>

          {entregados.length > 0 && (
            <div className="flex border-b border-black/10 bg-[#f6f6f3]">
              <div className="w-[720px] shrink-0 px-2 py-1.5 text-[12px] text-carbon/75">
                <b>Redacción entregada, esperando visado y OK</b> · {entregados.length} · {EUR.format(entregados.reduce((s, p) => s + p.t.entrega, 0))} € + IVA
              </div>
              <div className="relative h-8 shrink-0" style={{ width: HORIZONTE * PX }}>
                {entregados.map((p) => p.cobro && <span key={p.t.oppId} title={`${p.t.direccion} · cobro ${ddmm(p.cobro)} · ${EUR.format(p.t.entrega)} €`} className={"absolute top-2 h-4 w-1.5 rounded-sm " + (p.cobro <= corteD ? "bg-lima-dark" : "bg-carbon/40")} style={{ left: xDe(p.cobro) }} />)}
                <Corte x={xDe(corteD)} />
              </div>
            </div>
          )}

          {props.tecnicos.map((tec) => {
            const items = plan.get(tec.id) ?? [];
            const a = ajustes[tec.id] ?? { activo: true, factor: 1 };
            const libre = items.length ? items[items.length - 1].fin : null;
            const cobra = items.filter((p) => p.cobro && p.cobro <= corteD).reduce((s, p) => s + p.t.entrega, 0);
            const abierto = abiertos.has(tec.id);
            return (
              <div
                key={tec.id}
                className={"border-b-2 border-black/15 " + (a.activo ? "" : "opacity-50")}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (arrastrando.current) llevar(arrastrando.current, tec.id); arrastrando.current = null; }}
              >
                <div className="flex cursor-pointer bg-[#f6f6f3]" onClick={() => { const n = new Set(abiertos); if (n.has(tec.id)) n.delete(tec.id); else n.add(tec.id); setAbiertos(n); }}>
                  <div className="flex w-[720px] shrink-0 items-baseline gap-2 px-2 py-1.5 text-[12.5px]">
                    <span className="w-4 text-carbon/50">{abierto ? "▾" : "▸"}</span>
                    <b className="text-carbon">{tec.nombre}</b>
                    <span className="text-carbon/65">
                      {items.length} trabajo{items.length === 1 ? "" : "s"}
                      {libre && libre > hoy ? ` · libre el ${ddmm(libre)}` : " · libre ya"}
                      {cobra > 0 ? ` · ${EUR.format(cobra)} € + IVA hasta el corte` : ""}
                      {a.factor !== 1 ? ` · tarda ×${a.factor}` : ""}
                      {!a.activo ? " · no disponible" : ""}
                    </span>
                  </div>
                  <div className="relative h-7 shrink-0" style={{ width: HORIZONTE * PX }}>
                    {items.map((p) => <Barra key={p.t.id} x={xDe(p.ini)} w={xDe(p.fin) - xDe(p.ini)} cls={(p.t.tipo === "requerimiento" ? "bg-ajeno" : "bg-lima") + " opacity-60"} t={p.t.direccion} />)}
                    <Corte x={xDe(corteD)} />
                  </div>
                </div>
                {abierto && items.map((p, i) => filaTecnico(tec.id, p, i, items.length))}
                {abierto && !items.length && <p className="px-3 py-2 text-[12px] text-carbon/55">Sin trabajos: arrastra aquí uno de «Por asignar».</p>}
              </div>
            );
          })}
          {!props.tecnicos.length && <p className="px-4 py-8 text-center text-carbon/60">No hay técnicos con la función de proyecto.</p>}
        </div>
      </div>
      <p className="mt-2 text-[12px] text-carbon/60">Se guarda el técnico, el orden, los días y la dificultad; lo demás (disponibles, «tarda ×», visado, OK y la línea de corte) es simulación.</p>
    </>
  );
}

function agrupar(asignados: Trabajo[]) {
  const out: Record<string, Trabajo[]> = {};
  for (const t of asignados) (out[t.tecnicoId!] ??= []).push(t);
  return out;
}

function NuevoRequerimiento({ alCrear }: { alCrear: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState("");
  const [sug, setSug] = useState<{ id: string; nombre: string; detalle: string }[]>([]);
  const [opp, setOpp] = useState<{ id: string; nombre: string } | null>(null);
  const [nombre, setNombre] = useState("");
  const [dias, setDias] = useState("1");
  const [haciendo, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const turno = useRef(0);
  useEffect(() => {
    const t = q.trim();
    if (opp || t.length < 3) return setSug([]);
    const mio = ++turno.current;
    const id = setTimeout(async () => {
      const r = await accionBuscarOpp(t);
      if (mio === turno.current) setSug(r);
    }, 220);
    return () => clearTimeout(id);
  }, [q, opp]);
  if (!abierto)
    return (
      <button type="button" onClick={() => setAbierto(true)} className="rounded-xl border border-black/15 bg-white px-3 py-1.5 text-[13px] font-semibold text-carbon/80 hover:border-carbon/40">
        + Requerimiento
      </button>
    );
  const crear = () =>
    empezar(async () => {
      setError(null);
      const r = await accionRequerimiento(opp!.id, nombre, numero(dias));
      if (!r.ok) return setError(r.error ?? "No se guardó");
      setAbierto(false); setOpp(null); setQ(""); setNombre(""); setDias("1");
      alCrear();
    });
  return (
    <div className="relative flex flex-wrap items-center gap-2 text-[13px]">
      {opp ? (
        <span className="font-semibold">{opp.nombre} <button type="button" onClick={() => setOpp(null)} className="text-carbon/50">×</button></span>
      ) : (
        <span className="relative">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Dirección…" className="h-8 w-[260px] rounded-md border border-black/15 px-2" />
          {sug.length > 0 && (
            <ul className="absolute left-0 top-full z-30 mt-1 max-h-[300px] w-[420px] overflow-y-auto rounded-xl border border-black/10 bg-white shadow-lg">
              {sug.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => { setOpp({ id: s.id, nombre: s.nombre }); setSug([]); }} className="block w-full px-3 py-2 text-left hover:bg-[#f3f9ec]">
                    <b>{s.nombre}</b> <span className="text-carbon/55">{s.detalle}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </span>
      )}
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Qué pide (RQ Ayto. …)" className="h-8 w-[200px] rounded-md border border-black/15 px-2" />
      <input value={dias} onChange={(e) => setDias(e.target.value)} inputMode="decimal" className="h-8 w-14 rounded-md border border-black/15 px-2 text-right" aria-label="Días" /> días
      <button type="button" disabled={haciendo || !opp || !nombre.trim() || !(numero(dias) > 0)} onClick={crear} className="rounded-[9px] bg-lima px-3 py-1 font-bold text-[#1f3a0c] disabled:opacity-50">Añadir</button>
      <button type="button" onClick={() => setAbierto(false)} className="text-carbon/60 hover:underline">cancelar</button>
      {error && <span className="text-alerta">{error}</span>}
    </div>
  );
}

function Barra({ x, w, cls, t }: { x: number; w: number; cls: string; t: string }) {
  if (x > HORIZONTE * PX) return null;
  return <span title={t} className={"absolute top-2.5 h-4 rounded-sm " + cls} style={{ left: Math.max(0, x), width: Math.max(3, w) }} />;
}

function Corte({ x }: { x: number }) {
  if (x < 0 || x > HORIZONTE * PX) return null;
  return <span className="pointer-events-none absolute inset-y-0 w-0.5 bg-alerta" style={{ left: x }} />;
}
