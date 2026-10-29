"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CarteraGestores, Etiqueta, GestorCartera, OppDeGestor, Resultado } from "../../../lib/carteraGestores";
import type { OppEntrada } from "../../../lib/entradaDiario";
import type { Opcion } from "../../components/Elegir";
import { ModalEntrada } from "../ModalEntrada";
import type { GuardadoEntrada } from "../acciones";
import { accionQuierenDe } from "../accionesCartera";
import { PonerAdmin } from "../CarteraGestores";

// LA CARTERA DE ADMINISTRADORES, ESTETICA NUEVA (Monica, 26-oct-2026; maqueta validada
// docs/figma/cartera-administradores-clara.html). Lo de dentro es lo de CarteraGestores.tsx (mismos datos, filtros,
// orden, etiquetas, grabar nota, sus opps al desplegar, «+ administrador»); cambia la piel:
//   - una sola linea arriba: el camino (Área comercial › Cartera) en verde, el saludo y, para direccion, el selector;
//   - la tarjeta empieza por las CIFRAS, en cristal (degradado de esquina a esquina con los colores del menu, trazo
//     blanco, sombra oscura al 40 %), sobre AZUL PIZARRA, igual que la fila de ordenar y buscar; en medio, la franja
//     crema de los filtros con una linea blanca arriba y abajo;
//   - al desplegar un administrador, sus opps en un bloque gris azulado, centrado y con tope de ancho, chips claros;
//   - a la derecha, las opps sin administrador, con la cabecera en crema oscuro.
// PENDIENTE (Monica): las opps de la lista abriran la FICHA NUEVA de la opp cuando exista; hoy, la de bloques.

const PIZARRA = "bg-[#4f6072]";
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
/** Sobre el gris azulado de la lista desplegada: los mismos chips claros, mas blancos y con el borde mas marcado. */
const RESULTADO_LISTA: Record<Resultado, string> = {
  en_curso: "border-[#8fa1b3] bg-white text-[#104269]",
  ganada: "border-lima bg-[#f6fbf1] text-lima-dark",
  perdida: "border-red-300 bg-[#fff6f6] text-red-700",
};
const UNA: Record<Resultado, string> = { en_curso: "en curso", ganada: "ganada", perdida: "perdida" };

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

/** Una cifra de arriba, en cristal: el color del menu en una esquina que se funde en blanco en la otra. */
function Cristal({ valor, texto, solido, claro }: { valor: string; texto: string; solido: string; claro: string }) {
  return (
    <div
      className="relative w-[94%] justify-self-center overflow-hidden rounded-[14px] border border-white px-3 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_6px_16px_rgba(0,0,0,.40)]"
      style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${claro} 55%, white) 0%, color-mix(in srgb, ${claro} 18%, white) 55%, #ffffff 100%)` }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/55 to-white/0" />
      <div
        className="relative font-[family-name:var(--letra-menu)] text-[22px] font-extrabold leading-tight tabular-nums"
        style={{ color: `color-mix(in srgb, ${solido} 85%, black)` }}
      >
        {valor}
      </div>
      <div className="relative text-[12px] leading-snug text-carbon/70">{texto}</div>
    </div>
  );
}

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

/** Sus opps, desplegadas: centradas, con tope de ancho, sobre gris azulado. */
function SusOpps({ opps, quieren }: { opps: OppDeGestor[]; quieren: Record<string, string[]> | null }) {
  const caja = "mx-auto mb-3 w-[calc(100%-6rem)] max-w-[620px] overflow-hidden rounded-lg border border-[#cfd8e1] bg-[#e8edf2]";
  if (!opps.length) return <p className={caja + " px-3 py-1.5 text-[12px] text-carbon/55"}>Ninguna oportunidad suya todavía.</p>;
  const orden = [...opps].sort((a, b) => (b.apertura ?? "").localeCompare(a.apertura ?? ""));
  return (
    <ul className={caja + " divide-y divide-[#cfd8e1]"}>
      {orden.map((o) => (
        <li key={o.id}>
          <Link href={`/comercial/oportunidades/${o.id}`} className="flex items-center gap-3 px-3 py-1.5 text-[13px] transition hover:bg-white">
            <span className="min-w-0 flex-1 truncate font-semibold text-carbon">
              {o.direccion ?? o.codigo ?? "(sin nombre)"}
              <span className="ml-2 font-normal text-carbon/65">{quieren === null ? "…" : (quieren[o.id] ?? []).join(" · ")}</span>
            </span>
            <span className="shrink-0 tabular-nums text-[12px] text-carbon/65">{fecha(o.apertura)}</span>
            <span className={"w-[78px] shrink-0 rounded-full border px-2 py-px text-center text-[11px] font-semibold " + RESULTADO_LISTA[o.resultado]}>
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

export function CarteraClara({
  c,
  todos,
  saludo,
  carteras,
  grabar,
}: {
  c: CarteraGestores;
  todos: boolean;
  saludo: { nombre: string | null; hoy: string };
  carteras: { elegido: string | null; lista: { id: string; nombre: string }[] } | null;
  grabar: Grabar;
}) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [orden, setOrden] = useState<Orden>("dinero");
  const [busca, setBusca] = useState("");
  const [grabando, setGrabando] = useState<string | null>(null);
  const [leyenda, setLeyenda] = useState(false);

  const limpio = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const q = limpio(busca.trim());
  const cuenta = (f: Filtro) =>
    f === "todos" ? c.gestores.length + c.noConsolidados.length : f === "sin_contacto" ? c.gestores.filter(sinContacto90).length : f === "no_consolidados" ? c.noConsolidados.length : c.gestores.filter((g) => g.etiquetas.includes(f)).length;
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
  const sombraPanel = "shadow-[0_2px_4px_rgba(0,0,0,.18),0_18px_36px_-18px_rgba(0,0,0,.6)]";

  return (
    <>
      {/* UNA LINEA: donde estas, el saludo y (direccion) de quien es la cartera. */}
      <div className="mt-1 flex flex-wrap items-center gap-x-12 gap-y-3">
        <p className="flex items-center gap-2 font-[family-name:var(--letra-menu)] text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#a6dc7e]">
          <span className="h-2 w-2 rounded-full bg-[#a6dc7e]" />
          Área comercial <span className="text-[#f3f4f1]/45">›</span> Cartera de administradores
        </p>
        <p className="text-[14px] text-[#f3f4f1]/70">
          {saludo.nombre ? (
            <>
              Hola, <b className="text-[#f3f4f1]">{saludo.nombre}</b>.{" "}
            </>
          ) : (
            "Todos los comerciales. "
          )}
          {saludo.hoy}.
        </p>
        {carteras && (
          <div className="ml-auto flex flex-wrap gap-1.5">
            {[{ id: null as string | null, nombre: "Todos" }, ...carteras.lista].map((m) => {
              const activo = m.id === carteras.elegido;
              return (
                <Link
                  key={m.id ?? "todos"}
                  href={`/comercial/cartera${m.id ? `?c=${m.id}` : ""}`}
                  className={
                    "rounded-full border px-3.5 py-1.5 text-sm transition " +
                    (activo ? "border-lima bg-lima font-semibold text-carbon" : "border-white/20 text-[#f3f4f1]/75 hover:border-white/50")
                  }
                >
                  {m.nombre}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 grid items-start gap-[18px] xl:grid-cols-[minmax(0,70fr)_minmax(0,30fr)]">
        <section className={"overflow-hidden rounded-2xl border border-black/5 bg-white " + sombraPanel}>
          {/* Las cifras, en cristal sobre la pizarra. */}
          <div className={PIZARRA + " px-4 pb-3.5 pt-3.5"}>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              <Cristal valor={String(c.resumen.gestores)} texto={todos ? "administradores consolidados (todos)" : "administradores consolidados"} solido="#3f8a1c" claro="#a6dc7e" />
              <Cristal valor={String(c.resumen.opps)} texto="opps que me han dado" solido="#2b6cb3" claro="#9cc4ee" />
              <Cristal
                valor={c.resumen.pct === null ? "—" : `${c.resumen.pct}%`}
                texto={`ganadas (${c.resumen.ganadas} de ${c.resumen.ganadas + c.resumen.perdidas} decididas)`}
                solido="#12867a"
                claro="#7fd6cb"
              />
              <Cristal valor={EUROS.format(c.resumen.importe)} texto="firmado con ellos" solido="#6a4fc4" claro="#c3b3f2" />
              <Cristal valor={String(c.sinGestor.length)} texto="opps abiertas sin administrador" solido="#d4860b" claro="#f3c46a" />
            </div>
          </div>

          {/* Los filtros, en su franja crema entre las dos de pizarra. */}
          <div className="flex flex-wrap items-center gap-2 border-y border-white bg-[#F3ECDD] px-4 py-2.5">
            {pildora("todos", "Todos")}
            {pildora("estrella", "⭐ Estrellas")}
            {pildora("dormido", "💤 Dormidos")}
            {pildora("marea", "🌀 Marean")}
            {pildora("nuevo", "🆕 Nuevos")}
            {pildora("sin_contacto", "Sin contacto +90 días")}
            {pildora("no_consolidados", "No consolidados")}
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

          {/* Ordenar y buscar, en la misma pizarra que las cifras. */}
          <div className={PIZARRA + " flex flex-wrap items-center gap-3 border-b border-black/10 px-4 py-2.5"}>
            <label className="flex items-center gap-2.5 text-[15px] font-semibold text-[#f3ecdd]">
              Ordenar por
              <select
                value={orden}
                onChange={(e) => setOrden(e.target.value as Orden)}
                className="rounded-lg border border-white bg-white px-2.5 py-1.5 text-[13.5px] font-medium text-carbon shadow-sm focus:border-lima focus:outline-none"
              >
                {ORDENES.map((o) => (
                  <option key={o.clave} value={o.clave}>
                    {o.texto}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border-2 border-white bg-white px-3 py-1.5 shadow-sm focus-within:border-lima">
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
            <div className="relative ml-auto mb-2 rounded-xl border-2 border-lima bg-lima-soft px-3 py-1.5 text-center text-[12.5px] font-semibold leading-snug text-lima-dark">
              ¿Le llamas?
              <br />
              No olvides guardar
              <br />
              la nota de qué dijo
              <span aria-hidden className="absolute -bottom-[9px] right-10 size-4 rotate-45 border-b-2 border-r-2 border-lima bg-lima-soft" />
            </div>
          </div>

          {filtro === "no_consolidados" ? (
            posibles.length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-carbon/65">Ninguno: todos los que tienes ya han firmado.</p>
            ) : (
              <ul className="max-h-[42rem] divide-y divide-black/20 overflow-y-auto">
                {posibles.map((p) => (
                  <FilaPosible key={p.id} p={p} alGrabar={() => setGrabando(`puesto:${p.id}`)} />
                ))}
              </ul>
            )
          ) : lista.length === 0 && (filtro !== "todos" || posibles.length === 0) ? (
            <p className="px-4 py-6 text-[13px] text-carbon/65">{c.gestores.length ? "Ninguno con este filtro." : "Todavía no hay administradores consolidados."}</p>
          ) : (
            <ul className="max-h-[42rem] divide-y divide-black/20 overflow-y-auto">
              {/* En «Todos» salen tambien los traidos que aun no han firmado, los primeros y con su marca
                  (Monica, 29-oct-2026: Beatriz no encontraba al que acababa de dar de alta). */}
              {filtro === "todos" &&
                posibles.map((p) => <FilaPosible key={p.id} p={p} marca alGrabar={() => setGrabando(`puesto:${p.id}`)} />)}
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

        <SinAdministrador c={c} sombra={sombraPanel} />
      </div>
    </>
  );
}

/** Un administrador traido que aun no ha firmado ninguna hoja (no consolidado). */
function FilaPosible({ p, marca = false, alGrabar }: { p: CarteraGestores["noConsolidados"][number]; marca?: boolean; alGrabar: () => void }) {
  return (
    <li className="flex items-center gap-2 px-4 py-2">
      <Link href={`/consulta/personas/${p.personaId}`} className="min-w-0 flex-1 hover:underline">
        <span className="text-[14px] font-bold text-carbon">{p.nombre}</span>
        <span className="text-[13px] text-carbon/70">
          {" "}
          · {p.administracion ?? "sin administración"}
          {p.telefono ? ` · ${p.telefono}` : ""}
        </span>
      </Link>
      {marca && (
        <span className="shrink-0 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11.5px] font-semibold text-amber-900">sin firmar aún</span>
      )}
      <span className="shrink-0 text-[12px] tabular-nums text-carbon/65">traído el {fecha(p.creado)}</span>
      <button
        type="button"
        onClick={alGrabar}
        className="shrink-0 rounded-lg border border-lima/60 bg-lima-soft px-2.5 py-1 text-[12px] font-bold text-lima-dark hover:bg-lima hover:text-carbon"
      >
        GRABAR NOTA
      </button>
    </li>
  );
}

/** La columna derecha: las opps abiertas SIN administrador, con su cabecera en crema oscuro. */
function SinAdministrador({ c, sombra }: { c: CarteraGestores; sombra: string }) {
  const [todas, setTodas] = useState(false);
  const vistas = todas ? c.sinGestor : c.sinGestor.slice(0, 40);
  return (
    <section className={"overflow-hidden rounded-2xl border border-amber-200 bg-[#fdf6e3] " + sombra}>
      <div className="border-b border-[#d9bf86] bg-[#efdcae] px-4 pb-2.5 pt-3">
        <div className="font-[family-name:var(--letra-menu)] text-[15px] font-extrabold text-amber-950">Opps sin administrador · {c.sinGestor.length}</div>
        <div className="mt-0.5 text-[12px] text-amber-950/75">Pónselo aquí mismo con «+ administrador» y cuenta en tu cartera. Pincha el nombre para ir a la opp.</div>
      </div>
      {c.sinGestor.length === 0 ? (
        <p className="px-4 py-5 text-[12px] text-carbon/65">Ninguna: todas tienen su administrador.</p>
      ) : (
        <>
          <ul className="max-h-[46rem] divide-y divide-amber-200/70 overflow-y-auto">
            {vistas.map((o) => (
              <li key={o.id} className="flex flex-wrap items-start gap-2 px-4 py-1.5 transition hover:bg-white/70">
                <Link href={`/comercial/oportunidades/${o.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-carbon">{o.nombre ?? o.codigo ?? "(sin nombre)"}</span>
                  <span className="block truncate text-[11.5px] text-carbon/70">
                    {[o.quieren.join(" · ") || null, o.apertura ? `abierta el ${fecha(o.apertura)}` : null].filter(Boolean).join(" — ")}
                  </span>
                </Link>
                <PonerAdmin oppId={o.id} />
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
