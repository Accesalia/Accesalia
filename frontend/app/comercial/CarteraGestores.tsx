"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CarteraGestores, Etiqueta, GestorCartera, OppDeGestor, Resultado } from "../../lib/carteraGestores";
import type { OppEntrada } from "../../lib/entradaDiario";
import type { Opcion } from "../components/Elegir";
import { ModalEntrada } from "./ModalEntrada";
import type { GuardadoEntrada } from "./acciones";
import { accionQuierenDe } from "./accionesCartera";

// LA CARTERA DE ADMINISTRADORES, HERRAMIENTA DE TRABAJO (Monica, 15-oct-2026).
// Habla de la cartera, no de las opps: "a quien mimar y a quien ignorar". Lo que
// quiere ver el comercial: cuantos tengo y cuales me hacen ganar dinero.
//   - Arriba: cuantos administradores, cuantas opps me han dado, el % de ganadas,
//     lo firmado y las opps sin administrador. Y la LEYENDA de las etiquetas
//     ("arriba, o se perderan").
//   - Filtros (estrellas, dormidos, marean, nuevos, sin contacto) y orden (por
//     dinero, el de entrada; por opps, por la mas reciente, por contacto, por %).
//   - Cada administrador en una tarjeta COMPACTA de dos lineas: quien es; y lo
//     firmado, su ultima opp nueva, el ultimo contacto (en color) y la proxima
//     cita. Y "Grabar nota". Al pinchar, sus opps, como las de la misma
//     direccion en la cabecera de bloques, y cada una lleva a la suya.
// A la derecha (CarteraLateral): las opps sin administrador, para completar.

const fecha = (f: string | null) => (f ? f.slice(0, 10).split("-").reverse().join("/") : "—");
const EUROS = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0, useGrouping: "always" });
const CITA = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
const dias = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
function hace(iso: string | null): string {
  if (!iso) return "nunca";
  const d = dias(iso);
  if (d === 0) return "hoy";
  if (d === 1) return "ayer";
  if (d < 45) return `hace ${d} días`;
  const m = Math.round(d / 30.4);
  return m < 18 ? `hace ${m} meses` : `hace ${(d / 365).toFixed(1).replace(".", ",")} años`;
}

const RESULTADO: Record<Resultado, { texto: string; clase: string }> = {
  en_curso: { texto: "en curso", clase: "border-[#AFBAC4] bg-[#E4E9EE] text-[#104269]" },
  ganada: { texto: "ganadas", clase: "border-lima/60 bg-lima-soft text-lima-dark" },
  perdida: { texto: "perdidas", clase: "border-red-200 bg-red-50 text-red-700" },
};
const UNA: Record<Resultado, string> = { en_curso: "en curso", ganada: "ganada", perdida: "perdida" };

/** LAS ETIQUETAS, con su leyenda: icono, etiqueta y explicacion. */
const ETIQUETAS: Record<Etiqueta, { icono: string; nombre: string; explica: string }> = {
  estrella: { icono: "⭐", nombre: "Estrella", explica: "de los que más firman, en proporción (desde 2025)" },
  dormido: { icono: "💤", nombre: "Dormido", explica: "ha firmado con nosotros y lleva 3 meses sin darnos nada nuevo: llámale" },
  marea: { icono: "🌀", nombre: "Marea", explica: "muchas perdidas y poca firma (desde 2025)" },
  nuevo: { icono: "🆕", nombre: "Nuevo", explica: "consolidado hace menos de 3 meses: cuídalo" },
};

type Filtro = "todos" | Etiqueta | "sin_contacto" | "no_consolidados";
type Orden = "dinero" | "opps" | "reciente" | "contacto" | "pct";
const ORDENES: { clave: Orden; texto: string }[] = [
  { clave: "dinero", texto: "Más dinero firmado" },
  { clave: "opps", texto: "Más opps" },
  { clave: "reciente", texto: "Opp nueva más reciente" },
  { clave: "contacto", texto: "Más tiempo sin contacto" },
  { clave: "pct", texto: "Mejor % de firma" },
];
const ordenar: Record<Orden, (a: GestorCartera, b: GestorCartera) => number> = {
  dinero: (a, b) => b.importe - a.importe || b.total - a.total,
  opps: (a, b) => b.total - a.total || b.importe - a.importe,
  reciente: (a, b) => (b.ultimaOpp ?? "").localeCompare(a.ultimaOpp ?? ""),
  contacto: (a, b) => (a.ultimoContacto ?? "").localeCompare(b.ultimoContacto ?? ""),
  pct: (a, b) => (b.pct ?? -1) - (a.pct ?? -1) || b.ganadas - a.ganadas,
};
const sinContacto90 = (g: GestorCartera) => !g.ultimoContacto || dias(g.ultimoContacto) > 90;

/** El ultimo contacto, en color: verde menos de un mes, ambar hasta tres, rojo mas. */
function Contacto({ g }: { g: GestorCartera }) {
  const d = g.ultimoContacto ? dias(g.ultimoContacto) : Infinity;
  const tono = d <= 30 ? "text-lima-dark" : d <= 90 ? "text-amber-700" : "text-alerta";
  const de = { diario: "diario", correo: "correo", fases: "movimiento en una opp" }[g.fuenteContacto ?? "diario"];
  return (
    <span title={g.ultimoContacto ? `Último contacto conocido: ${fecha(g.ultimoContacto)} (${de})` : "Sin contacto apuntado"}>
      Último contacto: <b className={"font-semibold " + tono}>{hace(g.ultimoContacto)}</b>
    </span>
  );
}

function Chip({ r, n }: { r: Resultado; n: number }) {
  return (
    <span className={"whitespace-nowrap rounded-full border px-2 py-px text-[11px] font-semibold tabular-nums " + RESULTADO[r].clase + (n ? "" : " opacity-40")}>
      {n} {n === 1 ? UNA[r] : RESULTADO[r].texto}
    </span>
  );
}

/** Sus opps, desplegadas: nombre, de que iba, apertura y resultado en color. */
function SusOpps({ opps, quieren }: { opps: OppDeGestor[]; quieren: Record<string, string[]> | null }) {
  if (!opps.length) return <p className="px-4 pb-3 pl-10 text-[12px] text-carbon/55">Ninguna oportunidad suya todavía.</p>;
  const orden = [...opps].sort((a, b) => (b.apertura ?? "").localeCompare(a.apertura ?? ""));
  return (
    <ul className="mx-4 mb-3 ml-10 divide-y divide-black/5 rounded-lg border border-black/5 bg-hueso/60">
      {orden.map((o) => (
        <li key={o.id}>
          <Link href={`/comercial/oportunidades/${o.id}`} className="flex items-center gap-3 px-3 py-1.5 text-[13px] transition hover:bg-white">
            <span className="min-w-0 flex-1 truncate font-semibold text-carbon">
              {o.direccion ?? o.codigo ?? "(sin nombre)"}
              <span className="ml-2 font-normal text-carbon/65">{quieren === null ? "…" : (quieren[o.id] ?? []).join(" · ")}</span>
            </span>
            <span className="shrink-0 tabular-nums text-[12px] text-carbon/65">{fecha(o.apertura)}</span>
            <span className={"w-[78px] shrink-0 rounded-full border px-2 py-px text-center text-[11px] font-semibold " + RESULTADO[o.resultado].clase}>
              {UNA[o.resultado]}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Tarjeta({ g, alGrabar }: { g: GestorCartera; alGrabar: () => void }) {
  const [abierta, setAbierta] = useState(false);
  const [quieren, setQuieren] = useState<Record<string, string[]> | null>(null);
  const abrir = () => {
    setAbierta((x) => !x);
    if (quieren === null) accionQuierenDe(g.opps.map((o) => o.id)).then(setQuieren).catch(() => setQuieren({}));
  };
  return (
    <li>
      <div className="flex items-start gap-2 px-4 py-2">
        <button type="button" onClick={abrir} aria-expanded={abierta} className="min-w-0 flex-1 text-left">
          {/* línea 1: quién es */}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="w-3 shrink-0 text-[11px] text-carbon/55">{abierta ? "▾" : "▸"}</span>
            <span className="text-[15px] font-bold text-carbon">{g.nombre}</span>
            <span className="text-[13px] text-carbon/70">· {g.administracion ?? "sin administración"}</span>
            {g.telefono && <span className="text-[13px] tabular-nums text-carbon/70">· {g.telefono}</span>}
            {g.etiquetas.map((e) => (
              <span key={e} title={`${ETIQUETAS[e].nombre}: ${ETIQUETAS[e].explica}`} className="text-[14px]">
                {ETIQUETAS[e].icono}
              </span>
            ))}
            <span className="ml-auto flex shrink-0 items-center gap-1">
              <Chip r="ganada" n={g.ganadas} />
              <Chip r="perdida" n={g.perdidas} />
              <Chip r="en_curso" n={g.enCurso} />
              <span className="w-[40px] text-right text-[12px] font-bold tabular-nums text-carbon/75">{g.pct === null ? "" : `${g.pct}%`}</span>
            </span>
          </div>
          {/* línea 2: lo que importa para vender */}
          <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 pl-5 text-[12.5px] text-carbon/75">
            <span>
              Firmado: <b className="font-semibold tabular-nums text-carbon">{g.importe ? EUROS.format(g.importe) : "—"}</b>
            </span>
            <span>
              Última opp nueva: <b className="font-semibold text-carbon">{hace(g.ultimaOpp)}</b>
            </span>
            <Contacto g={g} />
            {g.cita && (
              <span className="font-semibold text-[#3f5f80]" title={g.cita.asunto ?? undefined}>
                📅 {g.cita.tipo ?? "Cita"}
                {g.cita.con.length ? ` con él y ${g.cita.con.join(", ")}` : ""} el {CITA.format(new Date(g.cita.inicio))}
              </span>
            )}
          </div>
        </button>
        <button
          type="button"
          onClick={alGrabar}
          title="¿Le llamas? No olvides guardar la nota de qué dijo"
          className="mt-0.5 shrink-0 rounded-lg border border-lima/60 bg-lima-soft px-2.5 py-1 text-[12px] font-bold text-lima-dark transition hover:bg-lima hover:text-carbon"
        >
          GRABAR NOTA
        </button>
      </div>
      {abierta && <SusOpps opps={g.opps} quieren={quieren} />}
    </li>
  );
}

type Grabar = {
  hoy: string;
  canales: readonly { valor: string; texto: string }[];
  oportunidades: OppEntrada[];
  personas: Opcion[];
  miComercialId: string | null;
  guardar: (fd: FormData) => Promise<GuardadoEntrada>;
};

/** La columna izquierda: la cartera, como herramienta. */
export function CarteraConsolidados({ c, todos, grabar }: { c: CarteraGestores; todos: boolean; grabar: Grabar }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [orden, setOrden] = useState<Orden>("dinero");
  const [busca, setBusca] = useState("");
  const [grabando, setGrabando] = useState<string | null>(null);
  // La leyenda, plegada tras la (i): se abre al pulsarla (Monica, 15-oct-2026).
  const [leyenda, setLeyenda] = useState(false);

  const limpio = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const q = limpio(busca.trim());
  const cuenta = (f: Filtro) =>
    f === "todos" ? c.gestores.length : f === "sin_contacto" ? c.gestores.filter(sinContacto90).length : f === "no_consolidados" ? c.noConsolidados.length : c.gestores.filter((g) => g.etiquetas.includes(f)).length;
  const lista = useMemo(() => {
    const vale = (g: GestorCartera) =>
      filtro === "todos" ? true : filtro === "sin_contacto" ? sinContacto90(g) : filtro === "no_consolidados" ? false : g.etiquetas.includes(filtro);
    return c.gestores
      .filter(vale)
      .filter((g) => !q || limpio(`${g.nombre} ${g.administracion ?? ""}`).includes(q))
      .sort(ordenar[orden]);
  }, [c.gestores, filtro, orden, q]);
  const posibles = c.noConsolidados.filter((p) => !q || limpio(`${p.nombre} ${p.administracion ?? ""}`).includes(q));

  const pildora = (f: Filtro, texto: string) => (
    <button
      key={f}
      type="button"
      onClick={() => setFiltro(f)}
      className={
        "rounded-full border px-3 py-1 text-[12.5px] font-semibold transition " +
        (filtro === f ? "border-[#104269] bg-[#104269] text-white" : "border-black/10 bg-white text-carbon/75 hover:border-[#104269]")
      }
    >
      {texto} <span className={filtro === f ? "text-white/75" : "text-carbon/55"}>{cuenta(f)}</span>
    </button>
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      <div className="border-b border-black/5 px-4 pb-3 pt-3">
        <div className="text-[15px] font-bold text-carbon">{todos ? "Toda la cartera" : "Mi cartera de administradores"}</div>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          <Cifra valor={String(c.resumen.gestores)} texto="administradores consolidados" />
          <Cifra valor={String(c.resumen.opps)} texto="opps que me han dado" />
          <Cifra valor={c.resumen.pct === null ? "—" : `${c.resumen.pct}%`} texto={`ganadas (${c.resumen.ganadas} de ${c.resumen.ganadas + c.resumen.perdidas} decididas)`} />
          <Cifra valor={EUROS.format(c.resumen.importe)} texto="firmado con ellos" />
          <Cifra valor={String(c.sinGestor.length)} texto="opps abiertas sin administrador" alerta={c.sinGestor.length > 0} />
        </div>
      </div>

      {/* La fila de los filtros con icono, sobre un crema tostado sutil que le da
          soporte (Monica, 15-oct-2026). */}
      <div className="flex flex-wrap items-center gap-2 border-y border-[#E2D6BE] bg-[#F3ECDD] px-4 py-2.5">
        {pildora("todos", "Todos")}
        {pildora("estrella", "⭐ Estrellas")}
        {pildora("dormido", "💤 Dormidos")}
        {pildora("marea", "🌀 Marean")}
        {pildora("nuevo", "🆕 Nuevos")}
        {pildora("sin_contacto", "Sin contacto +90 días")}
        {pildora("no_consolidados", "No consolidados")}
        {/* LA LEYENDA, tras la (i): plegada, se abre al pulsar (15-oct-2026). */}
        <button
          type="button"
          onClick={() => setLeyenda((x) => !x)}
          aria-expanded={leyenda}
          title="Qué significa cada icono"
          className={
            "ml-auto grid size-7 place-items-center rounded-full border-2 font-serif text-[14px] font-bold italic transition " +
            (leyenda ? "border-[#104269] bg-[#104269] text-white" : "border-[#104269]/60 text-[#104269] hover:bg-[#104269]/10")
          }
        >
          i
        </button>
        {leyenda && (
          <div className="mt-1 grid w-full gap-1 rounded-xl border border-[#104269]/20 bg-[#E4E9EE]/60 px-3 py-2 text-[12.5px] text-carbon/85 sm:grid-cols-2">
            {(Object.keys(ETIQUETAS) as Etiqueta[]).map((e) => (
              <span key={e}>
                {ETIQUETAS[e].icono} <b className="font-semibold text-carbon">{ETIQUETAS[e].nombre}</b>: {ETIQUETAS[e].explica}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-b border-black/5 px-4 py-2">
        <label className="flex items-center gap-2 text-[12.5px] text-carbon/75">
          Ordenar por
          <select value={orden} onChange={(e) => setOrden(e.target.value as Orden)} className="rounded-lg border border-black/15 bg-white px-2 py-1 text-[13px] text-carbon focus:border-lima focus:outline-none">
            {ORDENES.map((o) => (
              <option key={o.clave} value={o.clave}>{o.texto}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border-2 border-black/20 bg-white px-3 py-1.5 focus-within:border-lima">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0 text-carbon/60">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar un administrador o una administración"
            placeholder="Buscar un administrador o una administración…"
            className="w-full min-w-0 bg-transparent text-sm text-carbon outline-none placeholder:text-carbon/55"
          />
        </label>
        {/* EL BOCADILLO (15-oct-2026), con su rabito hacia los botones de la lista. */}
        <div className="relative ml-auto mb-2 rounded-xl border-2 border-lima/70 bg-lima-soft px-3 py-1.5 text-center text-[12.5px] font-semibold leading-snug text-lima-dark">
          ¿Le llamas?
          <br />
          No olvides guardar
          <br />
          la nota de qué dijo
          <span aria-hidden className="absolute -bottom-[9px] right-10 size-4 rotate-45 border-b-2 border-r-2 border-lima/70 bg-lima-soft" />
        </div>
      </div>

      {filtro === "no_consolidados" ? (
        posibles.length === 0 ? (
          <p className="px-4 py-6 text-[13px] text-carbon/65">Ninguno: todos los que tienes ya han firmado.</p>
        ) : (
          <ul className="max-h-[42rem] divide-y divide-black/20 overflow-y-auto">
            {posibles.map((p) => (
              <li key={p.id} className="flex items-center gap-2 px-4 py-2">
                <Link href={`/consulta/personas/${p.personaId}`} className="min-w-0 flex-1 hover:underline">
                  <span className="text-[14px] font-bold text-carbon">{p.nombre}</span>
                  <span className="text-[13px] text-carbon/70"> · {p.administracion ?? "sin administración"}{p.telefono ? ` · ${p.telefono}` : ""}</span>
                </Link>
                <span className="shrink-0 text-[12px] tabular-nums text-carbon/65">traído el {fecha(p.creado)}</span>
                <button
                  type="button"
                  onClick={() => setGrabando(`puesto:${p.id}`)}
                  className="shrink-0 rounded-lg border border-lima/60 bg-lima-soft px-2.5 py-1 text-[12px] font-bold text-lima-dark hover:bg-lima hover:text-carbon"
                >
                  GRABAR NOTA
                </button>
              </li>
            ))}
          </ul>
        )
      ) : lista.length === 0 ? (
        <p className="px-4 py-6 text-[13px] text-carbon/65">{c.gestores.length ? "Ninguno con este filtro." : "Todavía no hay administradores consolidados."}</p>
      ) : (
        <ul className="max-h-[42rem] divide-y divide-black/20 overflow-y-auto">
          {lista.map((g) => (
            <Tarjeta key={g.id} g={g} alGrabar={() => setGrabando(`puesto:${g.id}`)} />
          ))}
        </ul>
      )}

      <ModalEntrada
        abierto={grabando !== null}
        hoy={grabar.hoy}
        canales={grabar.canales}
        oportunidades={grabar.oportunidades}
        personas={grabar.personas}
        miComercialId={grabar.miComercialId}
        alCerrar={() => setGrabando(null)}
        guardar={grabar.guardar}
        conInicial={grabando ?? undefined}
        canalInicial="llamada"
      />
    </section>
  );
}

/** Una cifra de arriba, en su bloque: discreto pero evidente, centrado. */
function Cifra({ valor, texto, alerta }: { valor: string; texto: string; alerta?: boolean }) {
  return (
    <div className={"rounded-xl border px-3 py-2 text-center " + (alerta ? "border-amber-300 bg-amber-50/70" : "border-black/10 bg-[#F4F6F8]")}>
      <div className={"text-[20px] font-bold leading-tight tabular-nums " + (alerta ? "text-amber-700" : "text-carbon")}>{valor}</div>
      <div className="text-[12px] leading-snug text-carbon/70">{texto}</div>
    </div>
  );
}

/** La columna derecha: las opps abiertas SIN administrador, para completar
 *  (Monica, 15-oct-2026: "a la derecha, los pendientes"). Sin el, no cuentan en
 *  la cartera de nadie. */
export function CarteraLateral({ c }: { c: CarteraGestores }) {
  const [todas, setTodas] = useState(false);
  const vistas = todas ? c.sinGestor : c.sinGestor.slice(0, 40);
  return (
    <section className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/60">
      <div className="border-b border-amber-200 px-4 pb-2.5 pt-3">
        <div className="text-[14px] font-bold text-amber-900">Opps sin administrador · {c.sinGestor.length}</div>
        <div className="text-[12px] text-amber-900/80">Pónselo y cuentan en tu cartera. Pincha para ir a la opp.</div>
      </div>
      {c.sinGestor.length === 0 ? (
        <p className="px-4 py-5 text-[12px] text-carbon/65">Ninguna: todas tienen su administrador.</p>
      ) : (
        <>
          <ul className="max-h-[46rem] divide-y divide-amber-200/70 overflow-y-auto">
            {vistas.map((o) => (
              <li key={o.id}>
                <Link href={`/comercial/oportunidades/${o.id}`} className="block px-4 py-1.5 transition hover:bg-white/70">
                  <span className="block truncate text-[13px] font-semibold text-carbon">{o.nombre ?? o.codigo ?? "(sin nombre)"}</span>
                  <span className="block truncate text-[11.5px] text-carbon/70">
                    {[o.quieren.join(" · ") || null, o.apertura ? `abierta el ${fecha(o.apertura)}` : null].filter(Boolean).join(" — ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {c.sinGestor.length > 40 && (
            <button type="button" onClick={() => setTodas((x) => !x)} className="w-full border-t border-amber-200 px-4 py-2 text-left text-[12px] font-semibold text-amber-900 hover:underline">
              {todas ? "Ver menos" : `Ver todas (${c.sinGestor.length})`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
