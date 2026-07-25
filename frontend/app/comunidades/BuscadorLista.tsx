"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Buscador EN VIVO del listado de comunidades. Mientras escribes (debounce 180ms)
// consulta /api/comunidades/buscar y actualiza la lista; no hace falta pulsar
// Enter ni boton. Sin texto, muestra el listado inicial que llega del servidor.

type Item = { id: string; nombre: string; municipio: string | null; cp: string | null };

export function BuscadorLista({ inicial, basePath = "/comunidades" }: { inicial: Item[]; basePath?: string }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>(inicial);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems(inicial);
      setCargando(false);
      return;
    }
    setCargando(true);
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/comunidades/buscar?q=${encodeURIComponent(term)}&limit=50`);
        setItems((await r.json()) as Item[]);
      } catch {
        setItems([]);
      } finally {
        setCargando(false);
      }
    }, 180);
    return () => clearTimeout(id);
  }, [q, inicial]);

  const term = q.trim();

  return (
    <div>
      <div className="mt-6 flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 transition focus-within:border-lima">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0 text-carbon/30">
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por dirección o municipio… (escribe y filtra solo)"
          className="w-full bg-transparent text-sm text-carbon placeholder:text-carbon/35 outline-none"
        />
        {cargando && <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-black/10 border-t-lima" />}
      </div>

      <p className="mt-4 text-xs text-carbon/40">
        {term.length >= 2
          ? `${items.length} resultado(s) para “${term}”`
          : `Mostrando ${items.length} · escribe para acotar entre todas`}
      </p>

      <ul className="mt-3 divide-y divide-black/5 rounded-2xl border border-black/5 bg-white shadow-sm">
        {items.map((c) => (
          <li key={c.id}>
            <Link
              href={`${basePath}/${c.id}`}
              className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-lima-soft/40"
            >
              <span className="min-w-0 truncate text-sm text-carbon">{c.nombre}</span>
              <span className="shrink-0 text-xs text-carbon/50">{[c.cp, c.municipio].filter(Boolean).join(" ")}</span>
            </Link>
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-5 py-8 text-center text-sm text-carbon/40">{cargando ? "Buscando…" : "Sin resultados."}</li>
        )}
      </ul>
    </div>
  );
}
