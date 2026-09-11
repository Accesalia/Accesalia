"use client";

import { useEffect, useRef, useState } from "react";
import { MAPA_ALTO, MAPA_ANCHO, type DatosMapa } from "../../lib/mapaComunidades";

// "Dónde estoy y dónde no". Dos vistas del mismo dato: agrupado por municipio
// (se ve el peso) o un punto por comunidad (se ve el hueco). El conmutador va
// DENTRO del mapa: donde estaba antes, sobre la columna de zonas, parecia que
// cambiaba las zonas (Monica, 11-sep).

const TONO = ["", "#d8ecc4", "#aede82", "#7ac943", "#4f8f26"];
const BASE = { x: 0, y: 0, w: MAPA_ANCHO, h: MAPA_ALTO };

export function MapaCartera({ mapa, titulo }: { mapa: DatosMapa; titulo: string }) {
  const [vista, setVista] = useState<"grupos" | "puntos">("grupos");
  const [vb, setVb] = useState(BASE);
  const arrastre = useRef<{ x: number; y: number } | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  const zoom = BASE.w / vb.w;

  const limita = (v: typeof BASE) => ({
    ...v,
    x: Math.max(-30, Math.min(v.x, BASE.w - v.w + 30)),
    y: Math.max(-30, Math.min(v.y, BASE.h - v.h + 30)),
  });
  // Del punto de pantalla al del dibujo, con el encuadre que haya en ese momento.
  const aSvg = (v: typeof BASE, ev: { clientX: number; clientY: number }) => {
    const r = svg.current!.getBoundingClientRect();
    return { x: v.x + ((ev.clientX - r.left) / r.width) * v.w, y: v.y + ((ev.clientY - r.top) / r.height) * v.h };
  };
  const acercaEn = (v: typeof BASE, f: number, cx = v.x + v.w / 2, cy = v.y + v.h / 2) => {
    const w = Math.min(BASE.w, Math.max(40, v.w * f));
    const h = (w * BASE.h) / BASE.w;
    return limita({ x: cx - (cx - v.x) * (w / v.w), y: cy - (cy - v.y) * (h / v.h), w, h });
  };
  const acerca = (f: number) => setVb((v) => acercaEn(v, f));

  // La rueda se escucha a mano: React la registra como pasiva y entonces no se
  // puede impedir que, ademas de acercar, se desplace la pagina.
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const rueda = (ev: WheelEvent) => {
      ev.preventDefault();
      setVb((v) => {
        const p = aSvg(v, ev);
        return acercaEn(v, ev.deltaY > 0 ? 1.18 : 0.85, p.x, p.y);
      });
    };
    el.addEventListener("wheel", rueda, { passive: false });
    return () => el.removeEventListener("wheel", rueda);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista]);

  const boton = (activo: boolean) =>
    "rounded-full px-3 py-1 text-sm transition " +
    (activo ? "bg-carbon font-semibold text-white" : "text-carbon/65 hover:text-carbon");

  return (
    <section className="mt-10">
      <div className="mb-2.5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-carbon/60">{titulo}</h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 px-4 py-2.5">
            <div className="flex gap-1 rounded-full border border-black/10 bg-hueso p-0.5">
              <button type="button" className={boton(vista === "grupos")} onClick={() => setVista("grupos")}>
                Agrupado
              </button>
              <button type="button" className={boton(vista === "puntos")} onClick={() => setVista("puntos")}>
                Puntos
              </button>
            </div>
            {vista === "puntos" && (
              <div className="flex items-center gap-1.5">
                {[
                  ["−", () => acerca(1.4)],
                  ["+", () => acerca(0.7)],
                  ["Todo", () => setVb(BASE)],
                ].map(([t, f]) => (
                  <button
                    key={t as string}
                    type="button"
                    onClick={f as () => void}
                    className="rounded-lg border border-black/10 bg-white px-2.5 py-0.5 text-sm font-bold text-carbon/70 hover:border-lima"
                  >
                    {t as string}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="px-3 pt-2">
            {vista === "grupos" ? (
              <svg viewBox={`0 0 ${MAPA_ANCHO} ${MAPA_ALTO}`} className="block h-auto w-full" role="img" aria-label="Comunidades por municipio">
                {mapa.zonas.filter((z) => z.elipse).map((z) => (
                  <g key={z.nombre}>
                    <ellipse
                      cx={z.elipse!.cx} cy={z.elipse!.cy} rx={z.elipse!.rx} ry={z.elipse!.ry}
                      fill="none" stroke="var(--color-alerta)" strokeWidth={1.2} strokeDasharray="5 4" opacity={0.55}
                    />
                    <text x={z.elipse!.cx} y={z.elipse!.cy + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--color-alerta)">
                      {z.nombre.toUpperCase()} · {z.n}
                    </text>
                  </g>
                ))}
                {mapa.burbujas.map((b) => (
                  <g key={b.nombre}>
                    <circle cx={b.x} cy={b.y} r={b.r} fill={TONO[b.tono]} stroke="#fff" strokeWidth={1.5}>
                      <title>{`${b.nombre}: ${b.n}`}</title>
                    </circle>
                    {b.n >= 10 && (
                      <text x={b.x} y={b.y + 4} textAnchor="middle" fontSize={b.n >= 100 ? 16 : 10} fontWeight={700} fill="#20301a">
                        {b.n}
                      </text>
                    )}
                    {/* Solo se rotulan los municipios con peso: en el sur estan tan
                        juntos que con todos los nombres no se leeria ninguno.
                        El resto lo dice al pasar por encima. */}
                    {b.n >= 10 && (
                      <text x={b.x} y={b.y + b.r + 11} textAnchor="middle" fontSize={9} fill="#6b6c68">
                        {b.nombre}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
            ) : (
              <svg
                ref={svg}
                viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
                className="block h-auto w-full cursor-grab touch-none select-none"
                role="img"
                aria-label="Cada punto es una comunidad"
                onPointerDown={(ev) => {
                  arrastre.current = aSvg(vb, ev);
                  (ev.target as Element).setPointerCapture?.(ev.pointerId);
                }}
                onPointerMove={(ev) => {
                  if (!arrastre.current) return;
                  const a = arrastre.current;
                  setVb((v) => {
                    const p = aSvg(v, ev);
                    return limita({ ...v, x: v.x - (p.x - a.x), y: v.y - (p.y - a.y) });
                  });
                }}
                onPointerUp={() => (arrastre.current = null)}
                onPointerCancel={() => (arrastre.current = null)}
              >
                <rect x={-50} y={-50} width={MAPA_ANCHO + 100} height={MAPA_ALTO + 100} fill="transparent" />
                {mapa.etiquetas.map((e) => (
                  <text key={e.nombre} x={e.x} y={e.y} textAnchor="middle" fontSize={(e.grande ? 12 : 9) / zoom} fontWeight={700} fill="#8a8b86">
                    {e.nombre}
                  </text>
                ))}
                {mapa.puntos.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={2.1 / Math.sqrt(zoom)} fill="#5fa62f" opacity={0.7}>
                    <title>{p.municipio}</title>
                  </circle>
                ))}
              </svg>
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
              <span>Rueda para acercar, arrastra para mover. Pasa por encima y te dice el municipio.</span>
            )}
            <span className="ml-auto text-carbon/45">
              {mapa.conCoordenadas} de {mapa.total} comunidades tienen coordenadas
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
