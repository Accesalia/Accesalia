"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Buscador rapido de comunidades en la cabecera. Escribes (parte de) la direccion
// y salen coincidencias; clic o Enter abre la ficha. Debounce 180ms contra
// /api/comunidades/buscar. Teclado: flechas + Enter + Esc.

type Item = { id: string; nombre: string; municipio: string | null; cp: string | null };

export function BuscadorComunidades() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const [cargando, setCargando] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounce de la consulta.
  useEffect(() => {
    if (q.trim().length < 2) {
      setItems([]);
      setCargando(false);
      return;
    }
    setCargando(true);
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/comunidades/buscar?q=${encodeURIComponent(q)}`);
        const data = (await r.json()) as Item[];
        setItems(data);
        setActivo(0);
        setAbierto(true);
      } catch {
        setItems([]);
      } finally {
        setCargando(false);
      }
    }, 180);
    return () => clearTimeout(id);
  }, [q]);

  // Cerrar al clicar fuera.
  useEffect(() => {
    function fuera(e: MouseEvent) {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  function abrir(item: Item) {
    setAbierto(false);
    setQ("");
    setItems([]);
    router.push(`/expediente/${item.id}`);
  }

  function teclas(e: React.KeyboardEvent) {
    if (!abierto || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActivo((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[activo]) abrir(items[activo]);
    } else if (e.key === "Escape") {
      setAbierto(false);
    }
  }

  return (
    <div ref={caja} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 ring-1 ring-white/15 transition focus-within:bg-white/15 focus-within:ring-lima/60">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0 text-white/50">
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => items.length && setAbierto(true)}
          onKeyDown={teclas}
          placeholder="Buscar comunidad por dirección…"
          className="w-full bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
        />
        {cargando && <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-lima" />}
      </div>

      {abierto && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-xl">
          {items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-carbon/40">{cargando ? "Buscando…" : "Sin coincidencias"}</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {items.map((it, i) => (
                <li key={it.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActivo(i)}
                    onClick={() => abrir(it)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left transition ${
                      i === activo ? "bg-lima-soft" : ""
                    }`}
                  >
                    <span className="min-w-0 truncate text-sm text-carbon">{it.nombre}</span>
                    <span className="shrink-0 text-xs text-carbon/45">{[it.cp, it.municipio].filter(Boolean).join(" ")}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
