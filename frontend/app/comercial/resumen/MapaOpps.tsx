"use client";

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { PuntoOpp } from "../../../lib/resumenComercial";

// EL MAPA DEBAJO DEL RESUMEN (Daniel, 14-oct-2026): un punto por direccion,
// "cerradas perdidas: rojo, ganadas verde, en curso azul". Se lee de la base en
// cada visita: la opp que se da de alta por direccion ya trae la posicion de su
// ficha de Catastro, asi que sale sola. Misma cartografia que MapaCartera.

const ESTILO = "https://tiles.openfreemap.org/styles/positron";
const COLOR = { ganada: "#3f9b2f", perdida: "#c0392b", en_curso: "#2f6fd6" } as const;
const TEXTO = { ganada: "Ganadas", perdida: "Perdidas", en_curso: "En curso" } as const;

export function MapaOpps({ puntos, sinPosicion }: { puntos: PuntoOpp[]; sinPosicion: number }) {
  const [error, setError] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    let mapa: import("maplibre-gl").Map | null = null;
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
      mapa = m;
      m.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      m.on("error", () => setError(true));
      m.on("load", () => {
        m.addSource("opps", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: puntos.map((p) => ({
              type: "Feature",
              geometry: { type: "Point", coordinates: [p.lng, p.lat] },
              properties: { id: p.id, nombre: p.nombre, color: COLOR[p.estado], orden: p.estado === "en_curso" ? 2 : 1 },
            })),
          },
        });
        m.addLayer({
          id: "opps-punto", type: "circle", source: "opps",
          layout: { "circle-sort-key": ["get", "orden"] }, // las en curso, encima
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 3.5, 14, 8],
            "circle-color": ["get", "color"],
            "circle-opacity": 0.85,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1,
          },
        });
        // Si hay puntos, el mapa se ajusta a ellos.
        if (puntos.length) {
          const b = new ml.LngLatBounds();
          puntos.forEach((p) => b.extend([p.lng, p.lat]));
          m.fitBounds(b, { padding: 40, maxZoom: 13, duration: 0 });
        }
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
        // Al pinchar, a la ficha de la opp.
        m.on("click", "opps-punto", (e) => {
          const id = e.features?.[0]?.properties?.id;
          if (id) window.location.href = `/comercial/oportunidades/${id}`;
        });
      });
    })().catch(() => setError(true));
    return () => {
      vivo = false;
      mapa?.remove();
    };
  }, [puntos]);

  const cuenta = (e: PuntoOpp["estado"]) => puntos.filter((p) => p.estado === e).length;

  return (
    <section className="mt-12">
      <h2 className="text-[22px] font-bold uppercase tracking-wide text-carbon">Mapa</h2>
      <p className="text-[13.5px] text-carbon/60">Todas sus opps, también las cerradas. Pasa por encima para ver cuál es; pincha para abrirla.</p>
      <div className="mt-3 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        <div className="relative min-h-[480px] sm:min-h-[560px]">
          <div className="absolute inset-0">
            <div ref={caja} className="h-full w-full bg-hueso" role="region" aria-label="Mapa de las oportunidades" />
          </div>
          {error && (
            <p className="absolute inset-x-3 bottom-3 z-10 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-900">No se ha podido cargar la cartografía.</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-black/5 px-4 py-2.5 text-[12px] text-carbon/70">
          {(["en_curso", "ganada", "perdida"] as const).map((e) => (
            <span key={e} className="flex items-center gap-1.5">
              <i className="block h-3 w-3 rounded-full" style={{ background: COLOR[e] }} />
              {TEXTO[e]} <b className="tabular-nums text-carbon">{cuenta(e)}</b>
            </span>
          ))}
          {sinPosicion > 0 && <span className="ml-auto text-carbon/45">{sinPosicion} sin posición todavía</span>}
        </div>
      </div>
    </section>
  );
}
