"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { accionBuscarOpps } from "./acciones";

// IR A OTRA OPP SIN PASAR POR LA LISTA (Monica, 14-oct-2026): "arriba, en la
// ficha de opp, un buscador para poder ir a otra opp sin tener que ir a la lista
// de abiertas". Por el NOMBRE de la opp, sin tildes ni mayusculas y en cualquier
// orden; las abiertas primero.
type Fila = { id: string; nombre: string; detalle: string };

export function IrAOtraOpp() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [marcada, setMarcada] = useState(0);
  const ultima = useRef(0);

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

  const ir = (f: Fila) => {
    setAbierto(false);
    setQ("");
    router.push(`/comercial/oportunidades/${f.id}`);
  };

  return (
    <div className="relative w-[340px] max-w-full">
      <input
        value={q}
        role="combobox"
        aria-expanded={abierto}
        aria-label="Ir a otra oportunidad"
        placeholder="Ir a otra opp…"
        onChange={(e) => {
          setQ(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
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
        className="w-full rounded-full border border-carbon/25 bg-white px-4 py-1.5 text-[13px] text-carbon outline-none placeholder:text-carbon/50 focus:border-carbon/60"
      />
      {abierto && q.trim().length >= 2 && (
        <ul className="absolute right-0 top-full z-40 mt-1 max-h-[380px] w-[440px] max-w-[90vw] overflow-y-auto rounded-lg border border-carbon/25 bg-white py-1 shadow-lg">
          {filas.length === 0 ? (
            <li className="px-3.5 py-2 text-[13px] text-carbon/60">Nada con «{q.trim()}».</li>
          ) : (
            filas.map((f, i) => (
              <li
                key={f.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  ir(f);
                }}
                onMouseEnter={() => setMarcada(i)}
                className={"cursor-pointer px-3.5 py-1.5 " + (i === marcada ? "bg-lima-soft" : "")}
              >
                <div className="text-[13px] font-semibold text-carbon">{f.nombre}</div>
                <div className="text-[11.5px] text-carbon/60">{f.detalle}</div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
