"use client";

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { DatosMapa } from "../../lib/mapaComunidades";

// "Dónde estoy y dónde no", sobre un MAPA DE VERDAD (Monica, 12-sep-2026: "se
// vera el mapa de verdad, no sobre fondo blanco"). La cartografia es de
// OpenFreeMap (gratis, sin claves, se puede usar en una empresa) con el estilo
// claro "positron", para que manden los datos y no las calles.
//
// Dos vistas del mismo dato: agrupado por municipio (se ve el peso) o un punto
// por comunidad (se ve el hueco). El conmutador va DENTRO del mapa (Monica,
// 11-sep). Las zonas casi vacias, con linea discontinua roja.

const ESTILO = "https://tiles.openfreemap.org/styles/positron";
const TONO = ["", "#d8ecc4", "#aede82", "#7ac943", "#4f8f26"];
const ALERTA = "#9f3a38";

/** Elipse (en grados) como poligono, para la linea discontinua de las zonas vacias. */
function elipse(lat: number, lng: number, rLat: number, rLng: number): [number, number][] {
  const p: [number, number][] = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * 2 * Math.PI;
    p.push([lng + rLng * Math.cos(a), lat + rLat * Math.sin(a)]);
  }
  return p;
}

export function MapaCartera({ mapa, titulo }: { mapa: DatosMapa; titulo: string }) {
  const [vista, setVista] = useState<"grupos" | "puntos">("grupos");
  const [error, setError] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<import("maplibre-gl").Map | null>(null);
  const listo = useRef(false);

  // El mapa se crea una vez; los datos se cambian en su sitio.
  useEffect(() => {
    let vivo = true;
    (async () => {
      const ml = await import("maplibre-gl");
      if (!vivo || !caja.current) return;
      // Sin esto no hay teselas: ver scripts/copiar-maplibre.mjs.
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const m = new ml.Map({
        container: caja.current,
        style: ESTILO,
        center: [-3.7, 40.42],
        zoom: 8.4,
        attributionControl: { compact: true },
        cooperativeGestures: true, // rueda + Ctrl para acercar: la pagina sigue bajando con la rueda
        locale: {
          "CooperativeGesturesHandler.WindowsHelpText": "Usa Ctrl + rueda para acercar el mapa",
          "CooperativeGesturesHandler.MacHelpText": "Usa ⌘ + rueda para acercar el mapa",
          "CooperativeGesturesHandler.MobileHelpText": "Usa dos dedos para mover el mapa",
        },
      });
      m.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      m.on("error", () => setError(true));
      m.on("load", () => {
        m.addSource("zonas", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addSource("burbujas", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addSource("puntos", { type: "geojson", data: { type: "FeatureCollection", features: [] } });

        m.addLayer({ id: "zonas-linea", type: "line", source: "zonas", paint: { "line-color": ALERTA, "line-width": 1.6, "line-dasharray": [3, 2.5], "line-opacity": 0.7 } });
        m.addLayer({
          id: "burbujas-circulo", type: "circle", source: "burbujas",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, ["*", ["get", "r"], 1.1], 12, ["*", ["get", "r"], 2]],
            "circle-color": ["get", "color"],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1.5,
            "circle-opacity": 0.92,
          },
        });
        m.addLayer({
          id: "burbujas-numero", type: "symbol", source: "burbujas",
          filter: [">=", ["get", "n"], 2],
          layout: { "text-field": ["to-string", ["get", "n"]], "text-font": ["Noto Sans Bold"], "text-size": ["case", [">=", ["get", "n"], 100], 15, 11], "text-allow-overlap": true },
          paint: { "text-color": "#20301a" },
        });
        m.addLayer({
          id: "burbujas-nombre", type: "symbol", source: "burbujas",
          filter: [">=", ["get", "n"], 10],
          layout: { "text-field": ["get", "nombre"], "text-font": ["Noto Sans Regular"], "text-size": 11, "text-offset": [0, 1.9], "text-anchor": "top" },
          paint: { "text-color": "#4a4b47", "text-halo-color": "#fff", "text-halo-width": 1.2 },
        });
        m.addLayer({
          id: "puntos-circulo", type: "circle", source: "puntos",
          layout: { visibility: "none" },
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 2.4, 14, 6],
            "circle-color": "#5fa62f",
            "circle-opacity": 0.75,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 0.8,
          },
        });
        // El rotulo de las zonas vacias, lo ultimo: por encima de todo y siempre
        // visible, que es lo que el mapa quiere contar.
        m.addLayer({
          id: "zonas-rotulo", type: "symbol", source: "zonas",
          filter: ["==", ["geometry-type"], "Point"],
          layout: { "text-field": ["get", "nombre"], "text-font": ["Noto Sans Bold"], "text-size": 12, "text-allow-overlap": true, "text-ignore-placement": true },
          paint: { "text-color": ALERTA, "text-halo-color": "#fff", "text-halo-width": 2 },
        });

        // Al pasar por encima, el municipio y cuantas hay.
        const popup = new ml.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
        const mostrar = (capa: string, texto: (p: Record<string, unknown>) => string) => {
          m.on("mousemove", capa, (e) => {
            const f = e.features?.[0];
            if (!f) return;
            m.getCanvas().style.cursor = "pointer";
            popup.setLngLat(e.lngLat).setText(texto(f.properties as Record<string, unknown>)).addTo(m);
          });
          m.on("mouseleave", capa, () => {
            m.getCanvas().style.cursor = "";
            popup.remove();
          });
        };
        mostrar("burbujas-circulo", (p) => `${p.nombre}: ${p.n} ${Number(p.n) === 1 ? "comunidad" : "comunidades"}`);
        mostrar("puntos-circulo", (p) => String(p.municipio));

        listo.current = true;
        pintar(m);
      });
      mapaRef.current = m;
    })().catch(() => setError(true));
    return () => {
      vivo = false;
      mapaRef.current?.remove();
      mapaRef.current = null;
      listo.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pintar(m: import("maplibre-gl").Map) {
    const fc = (features: GeoJSON.Feature[]): GeoJSON.FeatureCollection => ({ type: "FeatureCollection", features });
    (m.getSource("burbujas") as import("maplibre-gl").GeoJSONSource).setData(
      fc(mapa.burbujas.map((b) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [b.lng, b.lat] },
        properties: { nombre: b.nombre, n: b.n, r: b.r, color: TONO[b.tono] },
      }))),
    );
    (m.getSource("puntos") as import("maplibre-gl").GeoJSONSource).setData(
      fc(mapa.puntos.map((p) => ({ type: "Feature", geometry: { type: "Point", coordinates: [p.lng, p.lat] }, properties: { municipio: p.municipio } }))),
    );
    const vacias = mapa.zonas.filter((z) => z.geo);
    (m.getSource("zonas") as import("maplibre-gl").GeoJSONSource).setData(
      fc([
        ...vacias.map((z) => ({
          type: "Feature" as const,
          geometry: { type: "LineString" as const, coordinates: elipse(z.geo!.lat, z.geo!.lng, z.geo!.rLat, z.geo!.rLng) },
          properties: { nombre: z.nombre },
        })),
        // El rotulo, sobre el borde de arriba de la zona: en el centro lo tapan las burbujas.
        ...vacias.map((z) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [z.geo!.lng, z.geo!.lat + z.geo!.rLat] },
          properties: { nombre: `${z.nombre} · casi nada` },
        })),
      ]),
    );
  }

  // Si cambian los datos (otro comercial), se repintan.
  useEffect(() => {
    if (mapaRef.current && listo.current) pintar(mapaRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapa]);

  // Cambiar de vista: se enciende una capa y se apagan las otras.
  useEffect(() => {
    const m = mapaRef.current;
    if (!m || !listo.current) return;
    const ver = (id: string, si: boolean) => m.setLayoutProperty(id, "visibility", si ? "visible" : "none");
    ["burbujas-circulo", "burbujas-numero", "burbujas-nombre", "zonas-linea", "zonas-rotulo"].forEach((id) => ver(id, vista === "grupos"));
    ver("puntos-circulo", vista === "puntos");
  }, [vista]);

  const boton = (activo: boolean) =>
    "rounded-full px-3 py-1 text-sm transition " + (activo ? "bg-carbon font-semibold text-white" : "text-carbon/65 hover:text-carbon");

  return (
    <section className="mt-10">
      <div className="mb-2.5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-carbon/60">{titulo}</h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {/* El mapa ocupa toda la altura de su tarjeta (que iguala a la de las zonas). */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <div className="relative min-h-[460px] flex-1 sm:min-h-[520px]">
            {/* MapLibre pone "position: relative" a su contenedor: por eso va dentro de una capa que ocupa el hueco. */}
            <div className="absolute inset-0">
              <div ref={caja} className="h-full w-full bg-hueso" role="region" aria-label="Mapa de las comunidades" />
            </div>
            <div className="absolute left-3 top-3 z-10 flex gap-1 rounded-full border border-black/10 bg-white/95 p-0.5 shadow-sm">
              <button type="button" className={boton(vista === "grupos")} onClick={() => setVista("grupos")}>Agrupado</button>
              <button type="button" className={boton(vista === "puntos")} onClick={() => setVista("puntos")}>Puntos</button>
            </div>
            {error && (
              <p className="absolute inset-x-3 bottom-3 z-10 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                No se ha podido cargar la cartografía. Los datos siguen a la derecha, por zonas.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-black/5 px-4 py-2.5 text-sm text-carbon/60">
            {vista === "grupos" ? (
              <>
                <span className="flex items-center gap-1">
                  {TONO.slice(1).map((c) => <i key={c} className="block h-2.5 w-4 rounded-sm" style={{ background: c }} />)}
                </span>
                <span>de 1 a más de 100 comunidades</span>
                <span className="font-semibold text-alerta">- - - zona casi sin presencia</span>
              </>
            ) : (
              <span>Un punto por comunidad. Pasa por encima y te dice el municipio.</span>
            )}
            <span className="ml-auto text-carbon/45">
              {vista === "puntos"
                ? `${mapa.conCoordenadas} de ${mapa.total} comunidades tienen posición`
                : mapa.sinPosicion > 0
                  ? `${mapa.sinPosicion} de ${mapa.total} en municipios sin posición todavía`
                  : `${mapa.total} comunidades`}
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <div className="border-b border-black/5 px-4 pb-2.5 pt-3">
            <div className="text-base font-bold text-carbon">Por zonas</div>
            <div className="text-sm text-carbon/50">primero donde casi no hay nada</div>
          </div>
          {mapa.total === 0 ? (
            <p className="px-4 py-6 text-sm text-carbon/50">Sin comunidades en esta cartera.</p>
          ) : (
            <ul className="divide-y divide-black/5">
              {mapa.zonas.map((z) => (
                <li key={z.nombre} className="px-4 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-base font-bold text-carbon">{z.nombre}</span>
                    <span className={"text-base font-bold tabular-nums " + (z.vacia ? "text-alerta" : "text-lima-dark")}>{z.n}</span>
                  </div>
                  <div className="mt-0.5 text-sm text-carbon/55">{z.detalle}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
