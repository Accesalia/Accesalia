"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { OpcionFicha } from "../../lib/fichaFinanciera";

// EL DESPLEGABLE DE LA FICHA (Monica, 17-oct-2026): «un espacio en blanco es
// intimidante». Al pinchar se despliegan todas las opps con hoja firmada (la
// ultima firma primero) y, segun se escribe, la lista se acorta: se elige por
// aproximacion, aunque no se recuerde la direccion exacta. Cada palabra escrita
// tiene que aparecer en la direccion, el codigo o la administracion; sin tildes.

const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const MAXIMO = 60;

export function Buscador({ opciones }: { opciones: OpcionFicha[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [marcada, setMarcada] = useState(0);
  const caja = useRef<HTMLDivElement>(null);
  const filtradas = useMemo(() => {
    const palabras = sinTildes(q).split(/\s+/).filter(Boolean);
    return palabras.length ? opciones.filter((o) => palabras.every((p) => o.buscar.includes(p))) : opciones;
  }, [q, opciones]);
  const vistas = filtradas.slice(0, MAXIMO);
  const ir = (o: OpcionFicha) => router.push(`/ficha-financiera/${o.id}`);

  return (
    <div ref={caja} className="relative max-w-[720px]" onBlur={(e) => !caja.current?.contains(e.relatedTarget as Node) && setAbierto(false)}>
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setMarcada(0); setAbierto(true); }}
        onFocus={() => setAbierto(true)}
        onClick={() => setAbierto(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setAbierto(true); setMarcada((m) => Math.min(m + 1, vistas.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setMarcada((m) => Math.max(m - 1, 0)); }
          else if (e.key === "Enter" && vistas[marcada]) ir(vistas[marcada]);
          else if (e.key === "Escape") setAbierto(false);
        }}
        placeholder="Pincha para ver la lista, o escribe un trozo de la dirección…"
        className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 pr-10 text-[15px] text-carbon outline-none focus:border-carbon/50"
        aria-label="Dirección"
      />
      <span className="pointer-events-none absolute right-4 top-3.5 text-carbon/45">{abierto ? "▴" : "▾"}</span>
      {abierto && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[440px] overflow-y-auto rounded-xl border border-black/10 bg-white shadow-lg">
          {vistas.map((o, i) => (
            <li key={o.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => ir(o)}
                onMouseEnter={() => setMarcada(i)}
                className={`block w-full px-4 py-2 text-left ${i === marcada ? "bg-[#f3f9ec]" : ""}`}
              >
                <span className="text-[14.5px] font-semibold text-carbon">{o.nombre}</span>
                {o.detalle && <span className="ml-2 text-[12.5px] text-carbon/60">{o.detalle}</span>}
              </button>
            </li>
          ))}
          {!vistas.length && <li className="px-4 py-3 text-[13.5px] text-carbon/60">Ninguna dirección con hoja firmada lo contiene.</li>}
          {filtradas.length > MAXIMO && (
            <li className="border-t border-black/5 px-4 py-2 text-[12.5px] text-carbon/60">
              y {filtradas.length - MAXIMO} más: escribe algo para acortar la lista
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
