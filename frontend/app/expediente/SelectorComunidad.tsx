"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Selector de comunidad para el expediente virtual. Typeahead: escribes la
// direccion, eliges y abre /expediente/[id]. Dos formas: `compacto` (barra
// superior de la pantalla de ventanitas, para cambiar de comunidad) o la portada
// grande de /expediente.

type Item = { id: string; nombre: string; municipio: string | null; cp: string | null };

export function SelectorComunidad({
  compacto = false,
  autoFocus = false,
  hrefBase = "/expediente/",
  hrefSuffix = "",
}: {
  compacto?: boolean;
  autoFocus?: boolean;
  hrefBase?: string;
  hrefSuffix?: string;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const [cargando, setCargando] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (q.trim().length < 2) {
      setItems([]);
      setCargando(false);
      return;
    }
    setCargando(true);
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/comunidades/buscar?q=${encodeURIComponent(q)}&limit=8`);
        setItems((await r.json()) as Item[]);
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
    router.push(`${hrefBase}${item.id}${hrefSuffix}`);
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
    <div ref={caja} className={`relative ${compacto ? "w-full max-w-md" : "w-full"}`}>
      <div
        className={`flex items-center gap-2 rounded-full border bg-white transition focus-within:border-lima ${
          compacto ? "border-black/10 px-4 py-2" : "border-black/10 px-5 py-3.5 shadow-sm"
        }`}
      >
        <svg width={compacto ? 16 : 18} height={compacto ? 16 : 18} viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0 text-carbon/30">
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => items.length && setAbierto(true)}
          onKeyDown={teclas}
          placeholder={compacto ? "Cambiar de comunidad…" : "Escribe la dirección de la comunidad…"}
          className={`w-full bg-transparent text-carbon placeholder:text-carbon/35 outline-none ${compacto ? "text-sm" : "text-base"}`}
        />
        {cargando && <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-black/10 border-t-lima" />}
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
