"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { accionBuscarOpps } from "./acciones";

// IR A OTRA OPP SIN PASAR POR LA LISTA (Monica, 14-oct-2026): "arriba, en la
// ficha de opp, un buscador para poder ir a otra opp sin tener que ir a la lista
// de abiertas". Por el NOMBRE de la opp, sin tildes ni mayusculas y en cualquier
// orden; las abiertas primero.
//
// EL PROPIO TITULO ES EL SELECTOR (Monica, 15-oct-2026): "en vez de poner el
// buscador en un chip arriba, que la propia direccion + intereses parezca un
// selector, con su chevron y un 'buscar'": no se pierde pantalla sin contenido.
// Al pulsarlo se abre el buscador justo debajo.
type Fila = { id: string; nombre: string; detalle: string };

export function IrAOtraOpp({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [marcada, setMarcada] = useState(0);
  const ultima = useRef(0);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const texto = q.trim();
    if (texto.length < 2) return setFilas([]);
    const n = ++ultima.current;
    const t = setTimeout(async () => {
      const r = await accionBuscarOpps(texto);
      if (n === ultima.current) {
        setFilas(r);
        setMarcada(0);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  // Se cierra al pinchar fuera.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  const ir = (f: Fila) => {
    setAbierto(false);
    setQ("");
    router.push(`/comercial/oportunidades/${f.id}`);
  };

  return (
    <div ref={caja} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAbierto((x) => !x)}
        aria-expanded={abierto}
        title="Ir a otra oportunidad"
        className="group -mx-1.5 inline-flex items-center gap-2 rounded-lg px-1.5 py-0.5 text-left transition hover:bg-white/15"
      >
        <span>{children}</span>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-carbon/20 bg-white px-2 py-px text-[11px] font-semibold text-carbon/60 transition group-hover:border-carbon/45 group-hover:text-carbon">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          ir a otra opp
          <span aria-hidden className={"transition " + (abierto ? "rotate-180" : "")}>▾</span>
        </span>
      </button>

      {abierto && (
        <div className="absolute left-0 top-full z-40 mt-1 w-[min(520px,90vw)] rounded-lg border border-carbon/25 bg-white p-2 shadow-lg">
          <input
            autoFocus
            value={q}
            role="combobox"
            aria-expanded={abierto}
            aria-label="Ir a otra oportunidad"
            placeholder="Ir a otra opp: escribe su nombre…"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setMarcada((m) => Math.min(m + 1, filas.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setMarcada((m) => Math.max(m - 1, 0));
              } else if (e.key === "Enter" && filas[marcada]) {
                e.preventDefault();
                ir(filas[marcada]);
              } else if (e.key === "Escape") setAbierto(false);
            }}
            className="w-full rounded-md border border-carbon/25 bg-white px-3 py-1.5 text-[13px] text-carbon outline-none placeholder:text-carbon/55 focus:border-carbon/60"
          />
          {q.trim().length >= 2 && (
            <ul className="mt-1 max-h-[380px] overflow-y-auto">
              {filas.length === 0 ? (
                <li className="px-2 py-2 text-[13px] text-carbon/60">Nada con «{q.trim()}».</li>
              ) : (
                filas.map((f, i) => (
                  <li
                    key={f.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      ir(f);
                    }}
                    onMouseEnter={() => setMarcada(i)}
                    className={"cursor-pointer rounded px-2 py-1.5 " + (i === marcada ? "bg-lima-soft" : "")}
                  >
                    <div className="text-[13px] font-semibold text-carbon">{f.nombre}</div>
                    <div className="text-[11.5px] text-carbon/60">{f.detalle}</div>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
