"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { accionBuscarFicha } from "./acciones";

// Escribes y van saliendo direcciones hasta que eliges una (como en Modificar Hitos).
export function Buscador() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sug, setSug] = useState<{ id: string; nombre: string; detalle: string }[]>([]);
  const turno = useRef(0);
  useEffect(() => {
    const t = q.trim();
    if (t.length < 3) return setSug([]);
    const mio = ++turno.current;
    const id = setTimeout(async () => {
      const r = await accionBuscarFicha(t);
      if (mio === turno.current) setSug(r);
    }, 220);
    return () => clearTimeout(id);
  }, [q]);
  return (
    <div className="relative max-w-[720px]">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
        placeholder="Escribe la dirección de la comunidad…"
        className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-[15px] text-carbon outline-none focus:border-carbon/50"
      />
      {sug.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[360px] overflow-y-auto rounded-xl border border-black/10 bg-white shadow-lg">
          {sug.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => router.push(`/ficha-financiera/${s.id}`)} className="block w-full px-4 py-2.5 text-left hover:bg-[#f3f9ec]">
                <span className="text-[14.5px] font-semibold text-carbon">{s.nombre}</span>
                {s.detalle && <span className="ml-2 text-[12.5px] text-carbon/55">{s.detalle}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
