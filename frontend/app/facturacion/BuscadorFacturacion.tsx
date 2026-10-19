"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { OpcionFicha } from "../../lib/fichaFinanciera";
import { accionOpcionesFacturacion } from "./accionesBuscador";

// «BUSCAR LA FACTURACION DE UNA OPP» (Monica, 19-oct-2026), en la franja de Cobrar ·
// Pagar · Prever…: lleva a la Ficha de facturacion. Como los demas buscadores del area:
// al pinchar sale la lista entera y se acorta segun se escribe; sin tildes.

const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const MAXIMO = 60;

export function BuscadorFacturacion() {
  const router = useRouter();
  const [opciones, setOpciones] = useState<OpcionFicha[] | null>(null);
  const [q, setQ] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [marcada, setMarcada] = useState(0);
  const caja = useRef<HTMLDivElement>(null);
  const cargar = () => {
    setAbierto(true);
    if (!opciones) accionOpcionesFacturacion().then(setOpciones);
  };
  const filtradas = useMemo(() => {
    const ps = sinTildes(q).split(/\s+/).filter(Boolean);
    return (opciones ?? []).filter((o) => ps.every((p) => o.buscar.includes(p)));
  }, [q, opciones]);
  const vistas = filtradas.slice(0, MAXIMO);
  const ir = (o: OpcionFicha) => {
    setAbierto(false);
    setQ("");
    router.push(`/facturacion/${o.id}`);
  };
  return (
    <div ref={caja} className="relative ml-2 w-[380px] max-w-full" onBlur={(e) => !caja.current?.contains(e.relatedTarget as Node) && setAbierto(false)}>
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setMarcada(0);
          cargar();
        }}
        onFocus={cargar}
        onClick={cargar}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setMarcada((m) => Math.min(m + 1, vistas.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setMarcada((m) => Math.max(m - 1, 0));
          } else if (e.key === "Enter" && vistas[marcada]) ir(vistas[marcada]);
          else if (e.key === "Escape") setAbierto(false);
        }}
        placeholder="Buscar la facturación de una opp…"
        aria-label="Buscar la facturación de una opp"
        className="w-full rounded-xl border border-black/15 bg-white px-3.5 py-2 pr-8 text-[14px] text-carbon outline-none focus:border-carbon/50"
      />
      <span className="pointer-events-none absolute right-3 top-2.5 text-carbon/45">{abierto ? "▴" : "▾"}</span>
      {abierto && (
        <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[420px] w-[520px] max-w-[90vw] overflow-y-auto rounded-xl border border-black/10 bg-white shadow-lg">
          {!opciones && <li className="px-4 py-3 text-[13.5px] text-carbon/55">Cargando…</li>}
          {vistas.map((o, i) => (
            <li key={o.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => ir(o)}
                onMouseEnter={() => setMarcada(i)}
                className={`block w-full px-4 py-2 text-left ${i === marcada ? "bg-[#f3f9ec]" : ""}`}
              >
                <span className="text-[14px] font-semibold text-carbon">{o.nombre}</span>
                {o.detalle && <span className="ml-2 text-[12px] text-carbon/55">{o.detalle}</span>}
              </button>
            </li>
          ))}
          {opciones && !vistas.length && <li className="px-4 py-3 text-[13.5px] text-carbon/60">Ninguna opp con hoja firmada lo contiene.</li>}
          {filtradas.length > MAXIMO && <li className="border-t border-black/5 px-4 py-2 text-[12.5px] text-carbon/60">y {filtradas.length - MAXIMO} más: escribe algo para acortar la lista</li>}
        </ul>
      )}
    </div>
  );
}
