"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FilaFase } from "../../lib/oppsPorFases";
import { FASES, ORDEN_EN_FASE, PASOS, type Clave, type Fase } from "../../lib/pasosEscalera";
import { Grabar } from "./resumen/Grabar";

// OPPS POR FASES (Monica, 15-oct-2026). Un indice siempre visible:
//   fase (con su numero de opps)  >  copy (aunque este a cero)  >  opps
// "Un esqueleto siempre visible y relleno con lo que toque". Se pliega por fase
// o por copy. Cada opp en UNA linea: nombre · dias en esta fase · ultimo
// contacto · administrador (o "falta completar") · grabar.
// A la derecha, en un tercio, el mapa de Daniel con SOLO lo que esta abierto a
// la izquierda: "filtrando en el mapa lo que se ve en pantalla".

const ESTILO = "https://tiles.openfreemap.org/styles/positron";
const AZUL = "#2f6fd6";
const VERDE = "#3f9b2f";
const ddmmaa = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`;
const TITULO = new Map(PASOS.map((p) => [p.clave, p.titulo]));
const FASE_DE = new Map(PASOS.map((p) => [p.clave, p.fase]));
/** Las fases que tienen copys: primer contacto y el 3D nunca son paso actual. */
const INDICE = FASES.filter((f) => ORDEN_EN_FASE.some((c) => FASE_DE.get(c) === f.clave));

export function FasesConMapa({ filas }: { filas: FilaFase[] }) {
  const [fasesAbiertas, setFases] = useState<Set<Fase>>(new Set());
  const [copysCerrados, setCopys] = useState<Set<Clave>>(new Set());
  const conmuta = <T,>(set: Set<T>, x: T) => {
    const n = new Set(set);
    if (n.has(x)) n.delete(x);
    else n.add(x);
    return n;
  };

  const porClave = useMemo(() => {
    const m = new Map<Clave, FilaFase[]>();
    for (const f of filas) m.set(f.clave, [...(m.get(f.clave) ?? []), f]);
    for (const l of m.values()) l.sort((a, b) => b.dias - a.dias); // lo mas parado arriba
    return m;
  }, [filas]);

  // Lo que se ve: las opps de los copys abiertos de las fases abiertas. Sin nada
  // abierto, el mapa enseña todas.
  const visibles = useMemo(() => {
    if (!fasesAbiertas.size) return filas;
    return filas.filter((f) => fasesAbiertas.has(f.fase) && !copysCerrados.has(f.clave));
  }, [filas, fasesAbiertas, copysCerrados]);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="min-w-0 rounded-2xl bg-white px-4 py-3">
        <div className="mb-2 grid gap-x-3 border-b border-carbon/15 pb-1.5 pl-12 pr-1 text-[11px] font-semibold uppercase tracking-wide text-carbon/50 md:grid-cols-[minmax(0,1fr)_52px_84px_minmax(0,1.15fr)_70px]">
          <span>Opp</span>
          <span className="text-right">Días</span>
          <span className="whitespace-nowrap">Últ. contacto</span>
          <span>Administrador</span>
          <span />
        </div>
        <ul>
          {INDICE.map((fase) => {
            const copys = ORDEN_EN_FASE.filter((c) => FASE_DE.get(c) === fase.clave);
            const total = copys.reduce((n, c) => n + (porClave.get(c)?.length ?? 0), 0);
            const abierta = fasesAbiertas.has(fase.clave);
            return (
              <li key={fase.clave} className="border-b border-black/5 last:border-0">
                <button
                  type="button"
                  onClick={() => setFases((s) => conmuta(s, fase.clave))}
                  className="flex w-full items-baseline gap-2 py-2 text-left hover:bg-hueso/60"
                >
                  <span className={"w-4 text-carbon/40 transition " + (abierta ? "rotate-90" : "")}>▸</span>
                  <span className="w-5 text-right text-[13px] font-bold tabular-nums text-carbon/45">{fase.n}</span>
                  <span className="text-[15.5px] font-bold text-carbon">{fase.nombre}</span>
                  <span className={"ml-1 rounded-full px-2 py-px text-[12px] font-bold tabular-nums " + (total ? "bg-[#104269] text-white" : "bg-black/5 text-carbon/40")}>
                    {total}
                  </span>
                </button>
                {abierta && (
                  <ul className="pb-2">
                    {copys.map((c) => {
                      const ops = porClave.get(c) ?? [];
                      const cerrado = copysCerrados.has(c);
                      return (
                        <li key={c}>
                          <button
                            type="button"
                            onClick={() => ops.length && setCopys((s) => conmuta(s, c))}
                            className={"flex w-full items-baseline gap-2 py-1 pl-7 text-left text-[13.5px] " + (ops.length ? "hover:bg-hueso/60" : "cursor-default")}
                          >
                            <span className={"w-3 text-[11px] text-carbon/35 " + (ops.length && !cerrado ? "rotate-90" : "")}>{ops.length ? "▸" : ""}</span>
                            <span className={ops.length ? "font-semibold text-carbon/85" : "text-carbon/40"}>{TITULO.get(c)}</span>
                            <span className={"tabular-nums " + (ops.length ? "font-semibold text-carbon/60" : "text-carbon/35")}>· {ops.length || "ninguna"}</span>
                          </button>
                          {ops.length > 0 && !cerrado && (
                            <ul className={ops.length > 15 ? "max-h-[520px] overflow-y-auto" : ""}>
                              {ops.map((o) => (
                                <Linea key={o.id} o={o} />
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="lg:sticky lg:top-4">
        <Mapa puntos={visibles} />
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[12px] text-white/85">
          <span className="flex items-center gap-1.5"><i className="block h-3 w-3 rounded-full" style={{ background: AZUL }} />En curso</span>
          <span className="flex items-center gap-1.5"><i className="block h-3 w-3 rounded-full" style={{ background: VERDE }} />Firmadas</span>
          <span className="ml-auto text-white/60">
            {fasesAbiertas.size ? `${visibles.length} abiertas a la izquierda` : `Todas (${filas.length}): abre una fase y salen solo esas`}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Una opp, una linea. */
function Linea({ o }: { o: FilaFase }) {
  return (
    <li className="grid items-baseline gap-x-3 py-[3px] pl-12 pr-1 text-[13px] hover:bg-hueso/60 md:grid-cols-[minmax(0,1fr)_52px_84px_minmax(0,1.15fr)_70px]">
      <Link href={`/comercial/oportunidades/${o.id}`} className="truncate font-semibold text-carbon hover:underline" title={o.nombre}>
        {o.nombre}
      </Link>
      <span className="text-right tabular-nums text-carbon/70">{o.dias} d</span>
      <span className="tabular-nums text-[12.5px] text-carbon/60">{o.contacto ? ddmmaa(o.contacto) : "—"}</span>
      <span className="truncate text-carbon/70" title={o.admin ? `${o.admin.quien} ${o.admin.telefono ?? ""}` : undefined}>
        {o.admin ? (
          <>
            {o.admin.quien}
            {o.admin.telefono && (
              <a href={`tel:${o.admin.telefono.split("/")[0].replace(/\s/g, "")}`} className="ml-1.5 font-semibold tabular-nums text-carbon hover:underline">
                {o.admin.telefono}
              </a>
            )}
          </>
        ) : (
          <span className="text-alerta/80">falta completar</span>
        )}
      </span>
      <span>
        <Grabar oppId={o.id} />
      </span>
    </li>
  );
}

/** El mapa se crea una vez; al abrir o cerrar algo, solo cambian los puntos. */
function Mapa({ puntos }: { puntos: FilaFase[] }) {
  const caja = useRef<HTMLDivElement>(null);
  const mapa = useRef<import("maplibre-gl").Map | null>(null);
  const listo = useRef(false);
  const ultimos = useRef(puntos);
  ultimos.current = puntos;
  const [error, setError] = useState(false);

  const datos = (ps: FilaFase[]): GeoJSON.FeatureCollection => ({
    type: "FeatureCollection",
    features: ps
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng!, p.lat!] },
        properties: { id: p.id, nombre: p.nombre, color: p.fase === "cobro" ? VERDE : AZUL },
      })),
  });
  const encuadra = (ml: typeof import("maplibre-gl"), m: import("maplibre-gl").Map, ps: FilaFase[]) => {
    const con = ps.filter((p) => p.lat != null && p.lng != null);
    if (!con.length) return;
    const b = new ml.LngLatBounds();
    con.forEach((p) => b.extend([p.lng!, p.lat!]));
    m.fitBounds(b, { padding: 40, maxZoom: 14, duration: 400 });
  };

  useEffect(() => {
    let vivo = true;
    (async () => {
      const ml = await import("maplibre-gl");
      if (!vivo || !caja.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const m = new ml.Map({
        container: caja.current,
        style: ESTILO,
        center: [-3.7, 40.42],
        zoom: 8.4,
        attributionControl: { compact: true },
        cooperativeGestures: true,
        locale: {
          "CooperativeGesturesHandler.WindowsHelpText": "Usa Ctrl + rueda para acercar el mapa",
          "CooperativeGesturesHandler.MacHelpText": "Usa ⌘ + rueda para acercar el mapa",
          "CooperativeGesturesHandler.MobileHelpText": "Usa dos dedos para mover el mapa",
        },
      });
      mapa.current = m;
      m.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      m.on("error", () => setError(true));
      m.on("load", () => {
        m.addSource("opps", { type: "geojson", data: datos(ultimos.current) });
        m.addLayer({
          id: "opps-punto", type: "circle", source: "opps",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 3.5, 14, 8],
            "circle-color": ["get", "color"],
            "circle-opacity": 0.85,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1,
          },
        });
        const popup = new ml.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
        m.on("mousemove", "opps-punto", (e) => {
          const f = e.features?.[0];
          if (!f) return;
          m.getCanvas().style.cursor = "pointer";
          popup.setLngLat(e.lngLat).setText(String(f.properties?.nombre)).addTo(m);
        });
        m.on("mouseleave", "opps-punto", () => {
          m.getCanvas().style.cursor = "";
          popup.remove();
        });
        m.on("click", "opps-punto", (e) => {
          const id = e.features?.[0]?.properties?.id;
          if (id) window.location.href = `/comercial/oportunidades/${id}`;
        });
        listo.current = true;
        encuadra(ml, m, ultimos.current);
      });
    })().catch(() => setError(true));
    return () => {
      vivo = false;
      mapa.current?.remove();
      mapa.current = null;
      listo.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al abrir o cerrar una fase o un copy: otros puntos, y el mapa se encuadra en ellos.
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo.current) return;
    (m.getSource("opps") as import("maplibre-gl").GeoJSONSource | undefined)?.setData(datos(puntos));
    import("maplibre-gl").then((ml) => encuadra(ml, m, puntos));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puntos]);

  return (
    <div className="relative h-[460px] overflow-hidden rounded-2xl bg-white lg:h-[calc(100vh-7rem)] lg:max-h-[760px]">
      <div className="absolute inset-0">
        <div ref={caja} className="h-full w-full bg-hueso" role="region" aria-label="Mapa de las oportunidades abiertas" />
      </div>
      {error && <p className="absolute inset-x-3 bottom-3 z-10 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-900">No se ha podido cargar la cartografía.</p>}
    </div>
  );
}
