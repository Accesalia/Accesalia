"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { QueBuscar, Sugerencia } from "../../lib/consulta";

// EL BUSCADOR QUE FILTRA AL ESCRIBIR (Monica, 12-oct-2026): "deberia ser un
// desplegable + buscar, y segun escribes se filtre a las que tienen eso, y las
// muestre, hasta que eliges una". Encuentra por trozos, sin tildes ni
// mayusculas y en cualquier orden. Elegir una lleva a su ficha; "Buscar" saca
// la lista entera de abajo, como antes.

const PESTAÑAS: [QueBuscar, string, string][] = [
  ["direccion", "Dirección", "calle y número: ronda segovia 5"],
  ["admin", "Administrador", "nombre de la administración"],
  ["contrata", "Contrata", "nombre o CIF de la contrata"],
  ["persona", "Persona", "nombre, teléfono o correo: de donde sea"],
];
const MAXIMO = 12;
const limpio = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function BuscadorVivo({ listas, que: queInicial, q: qInicial }: { listas: Record<QueBuscar, Sugerencia[]>; que: QueBuscar; q: string }) {
  const router = useRouter();
  const [que, setQue] = useState<QueBuscar>(queInicial);
  const [q, setQ] = useState(qInicial);
  const [abierto, setAbierto] = useState(false);
  const [marcada, setMarcada] = useState(0);
  const campo = useRef<HTMLInputElement>(null);

  // Lo que casa: todas las palabras escritas, en el nombre o en el detalle.
  const encontradas = useMemo(() => {
    const palabras = limpio(q).split(/[\s,.]+/).filter(Boolean);
    if (!palabras.length) return { lista: [], total: 0 };
    const todas = listas[que].filter((s) => {
      const t = limpio(`${s.nombre} ${s.detalle}`);
      return palabras.every((p) => t.includes(p));
    });
    return { lista: todas.slice(0, MAXIMO), total: todas.length };
  }, [q, que, listas]);

  const elegir = (s: Sugerencia) => {
    if (!s.href) return;
    setAbierto(false);
    router.push(s.href);
  };
  const buscarTodo = () => {
    setAbierto(false);
    router.push(`/consulta?que=${que}&q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="flex flex-wrap items-start gap-3">
      <div className="flex overflow-hidden rounded-lg border border-carbon/30">
        {PESTAÑAS.map(([v, t]) => (
          <button
            key={v}
            type="button"
            onClick={() => {
              setQue(v);
              setMarcada(0);
              setAbierto(!!q.trim());
              campo.current?.focus();
            }}
            className={"px-3.5 py-2 text-[13px] font-semibold " + (que === v ? "bg-carbon text-white" : "bg-white text-carbon/70 hover:text-carbon")}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="relative min-w-[280px] flex-1">
        <input
          ref={campo}
          value={q}
          autoFocus
          role="combobox"
          aria-expanded={abierto}
          aria-controls="buscador-lista"
          onChange={(e) => {
            setQ(e.target.value);
            setMarcada(0);
            setAbierto(true);
          }}
          onFocus={() => q.trim() && setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setAbierto(true);
              setMarcada((m) => Math.min(m + 1, encontradas.lista.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setMarcada((m) => Math.max(m - 1, 0));
            } else if (e.key === "Escape") {
              setAbierto(false);
            } else if (e.key === "Enter") {
              e.preventDefault();
              const s = abierto ? encontradas.lista[marcada] : undefined;
              if (s?.href) elegir(s);
              else if (q.trim()) buscarTodo();
            }
          }}
          placeholder={PESTAÑAS.find(([v]) => v === que)![2]}
          className="w-full rounded-lg border border-carbon/40 bg-white px-3.5 py-2 text-[15px] text-carbon outline-none placeholder:text-carbon/55 focus:border-lima"
        />
        {abierto && q.trim() && (
          <ul id="buscador-lista" role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[420px] overflow-y-auto rounded-lg border border-carbon/25 bg-white py-1 shadow-lg">
            {encontradas.lista.length === 0 ? (
              <li className="px-3.5 py-2.5 text-[14px] text-carbon/65">Nada con «{q.trim()}». Prueba con menos palabras.</li>
            ) : (
              encontradas.lista.map((s, i) => (
                <li
                  key={s.id}
                  role="option"
                  aria-selected={i === marcada}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    elegir(s);
                  }}
                  onMouseEnter={() => setMarcada(i)}
                  className={
                    "flex flex-wrap items-baseline justify-between gap-x-3 px-3.5 py-2 text-[14px] " +
                    (s.href ? "cursor-pointer " : "cursor-default ") +
                    (i === marcada ? "bg-lima-soft" : "")
                  }
                >
                  <span className="font-semibold text-carbon">{s.nombre}</span>
                  <span className="text-[12.5px] text-carbon/65">
                    {s.detalle}
                    {!s.href && <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-carbon/55">ficha próximamente</span>}
                  </span>
                </li>
              ))
            )}
            {encontradas.total > MAXIMO && (
              <li className="border-t border-black/5 px-3.5 py-2 text-[12.5px] text-carbon/65">
                Y {encontradas.total - MAXIMO} más: sigue escribiendo, o pulsa «Buscar» para verlas todas.
              </li>
            )}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={buscarTodo}
        disabled={!q.trim()}
        className="rounded-lg bg-lima px-6 py-2 text-[14px] font-bold text-carbon transition hover:bg-lima-dark hover:text-white disabled:opacity-50"
      >
        Buscar
      </button>
    </div>
  );
}
