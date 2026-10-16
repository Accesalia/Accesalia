"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PersonaEncontrada, SitioEncontrado } from "../../lib/directorios";
import { accionBuscarTodo } from "./accionesBuscador";

// EL BUSCADOR DE ARRIBA (Monica, 16-oct-2026: "ahora llama alguien y lo primero
// que hacemos es ir a dropbox, buscar su carpeta"). Se escribe la direccion, el
// nombre de la opp, el codigo DIR, la comunidad, o el nombre, cargo o telefono
// de alguien, y salen al momento:
//   · los SITIOS (la DIR, la carpeta) con sus trabajos debajo: un clic en el
//     trabajo y se esta en su ficha;
//   · las PERSONAS, con su linea (cargo · donde · telefono).
// Se recorre con las flechas y Enter. Enter sin elegir nada: la lista entera en
// Consultar, como antes.

type Opcion = { clave: string; href: string };

export function BuscadorGlobal() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [marcada, setMarcada] = useState(0);
  const [res, setRes] = useState<{ sitios: SitioEncontrado[]; personas: PersonaEncontrada[] }>({ sitios: [], personas: [] });
  const [buscando, setBuscando] = useState(false);
  const ultima = useRef(0);

  // Al escribir, con una pausa corta para no preguntar letra a letra.
  useEffect(() => {
    const texto = q.trim();
    if (texto.length < 2) {
      setRes({ sitios: [], personas: [] });
      return;
    }
    const n = ++ultima.current;
    setBuscando(true);
    const t = setTimeout(async () => {
      const r = await accionBuscarTodo(texto).catch(() => ({ sitios: [], personas: [] }));
      if (n !== ultima.current) return;
      setRes(r);
      setMarcada(0);
      setBuscando(false);
    }, 140);
    return () => clearTimeout(t);
  }, [q]);

  // Todo lo que se puede elegir, en orden, para las flechas.
  const opciones = useMemo(() => {
    const out: Opcion[] = [];
    for (const s of res.sitios) {
      const solo = s.trabajos.length === 1 ? s.trabajos[0] : null;
      if (solo) out.push({ clave: `s:${s.grupo}`, href: `/comercial/oportunidades/${solo.id}` });
      else if (!s.trabajos.length && s.comunidadId) out.push({ clave: `s:${s.grupo}`, href: `/administracion/comunidades/${s.comunidadId}` });
      if (s.trabajos.length > 1) for (const t of s.trabajos) out.push({ clave: `t:${t.id}`, href: `/comercial/oportunidades/${t.id}` });
    }
    for (const p of res.personas) out.push({ clave: `p:${p.fila}`, href: `/consulta/personas/${p.personaId}` });
    return out;
  }, [res]);
  const indice = new Map(opciones.map((o, i) => [o.clave, i]));

  const ir = (href: string) => {
    setAbierto(false);
    router.push(href);
  };
  const todo = () => {
    if (!q.trim()) return;
    setAbierto(false);
    router.push(`/consulta?que=opp&q=${encodeURIComponent(q.trim())}`);
  };

  const fila = (clave: string) =>
    "block cursor-pointer px-3 py-1.5 " + (indice.get(clave) === marcada ? "bg-lima-soft" : "hover:bg-black/[0.03]");
  const nada = q.trim().length >= 2 && !buscando && !res.sitios.length && !res.personas.length;

  return (
    <div className="relative hidden w-80 min-w-[9rem] shrink md:block">
      <div className="flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-3.5 py-1.5 transition focus-within:border-lima">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0 text-white/60">
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          value={q}
          role="combobox"
          aria-expanded={abierto}
          aria-label="Buscar una dirección o una persona"
          placeholder="Dirección, opp o persona…"
          onChange={(e) => {
            setQ(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => q.trim() && setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setAbierto(true);
              setMarcada((m) => Math.min(m + 1, opciones.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setMarcada((m) => Math.max(m - 1, 0));
            } else if (e.key === "Escape") {
              setAbierto(false);
            } else if (e.key === "Enter") {
              e.preventDefault();
              const o = abierto ? opciones[marcada] : undefined;
              if (o) ir(o.href);
              else todo();
            }
          }}
          className="w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-white/55"
        />
      </div>

      {abierto && q.trim().length >= 2 && (
        <div className="absolute right-0 top-full z-40 mt-1.5 max-h-[70vh] w-[min(560px,90vw)] overflow-y-auto rounded-lg border border-carbon/25 bg-white py-1 text-carbon shadow-xl">
          {buscando && !res.sitios.length && !res.personas.length && <div className="px-3 py-2 text-[13px] text-carbon/55">Buscando…</div>}
          {nada && <div className="px-3 py-2 text-[13px] text-carbon/65">Nada con «{q.trim()}». Prueba con menos palabras.</div>}

          {res.sitios.length > 0 && (
            <div className="px-3 pb-0.5 pt-1.5 text-[10px] font-bold uppercase tracking-[0.09em] text-carbon/45">Sitios</div>
          )}
          {res.sitios.map((s) => {
            const solo = s.trabajos.length === 1 ? s.trabajos[0] : null;
            const cabecera = (
              <>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[14px] font-semibold">{s.sitio}</span>
                  {s.dir && <span className="text-[11px] font-semibold text-carbon/45">{s.dir}</span>}
                  {solo && <span className="text-[12px] text-carbon/60">· {[solo.tipos, solo.como].filter(Boolean).join(" · ")}</span>}
                </div>
                <div className="text-[11.5px] text-carbon/55">
                  {[s.portal ? `portal ${s.portal.toLowerCase()}` : null, s.comunidad, s.admin ? `adm. ${s.admin}` : null].filter(Boolean).join(" · ")}
                </div>
              </>
            );
            const href = solo ? `/comercial/oportunidades/${solo.id}` : !s.trabajos.length && s.comunidadId ? `/administracion/comunidades/${s.comunidadId}` : null;
            return (
              <div key={s.grupo} className="border-b border-black/[0.04] last:border-0">
                {href ? (
                  <div
                    className={fila(`s:${s.grupo}`)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      ir(href);
                    }}
                    onMouseEnter={() => setMarcada(indice.get(`s:${s.grupo}`) ?? 0)}
                  >
                    {cabecera}
                  </div>
                ) : (
                  <div className="px-3 py-1.5">{cabecera}</div>
                )}
                {s.trabajos.length > 1 &&
                  s.trabajos.map((t) => (
                    <div
                      key={t.id}
                      className={fila(`t:${t.id}`) + " pl-7 text-[13px]"}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        ir(`/comercial/oportunidades/${t.id}`);
                      }}
                      onMouseEnter={() => setMarcada(indice.get(`t:${t.id}`) ?? 0)}
                    >
                      <span className="text-carbon/40">↳ </span>
                      <span className={t.abierta ? "font-semibold" : "text-carbon/60"}>{t.tipos ?? "Trabajo"}</span>
                      <span className="text-carbon/60"> · {t.como}</span>
                      <span className="text-[11.5px] text-carbon/45"> — {t.nombre}</span>
                    </div>
                  ))}
              </div>
            );
          })}

          {res.personas.length > 0 && (
            <div className="px-3 pb-0.5 pt-2 text-[10px] font-bold uppercase tracking-[0.09em] text-carbon/45">Personas</div>
          )}
          {res.personas.map((p) => (
            <div
              key={p.fila}
              className={fila(`p:${p.fila}`)}
              onMouseDown={(e) => {
                e.preventDefault();
                ir(`/consulta/personas/${p.personaId}`);
              }}
              onMouseEnter={() => setMarcada(indice.get(`p:${p.fila}`) ?? 0)}
            >
              <span className="text-[14px] font-semibold">{p.nombre}</span>
              {!p.vigente && <span className="ml-1.5 rounded-full bg-black/5 px-1.5 text-[10px] font-semibold uppercase text-carbon/50">antes</span>}
              {p.pista && <span className="ml-2 text-[12px] text-carbon/60">{p.pista}</span>}
            </div>
          ))}

          {(res.sitios.length > 0 || res.personas.length > 0) && (
            <div
              className="cursor-pointer border-t border-black/5 px-3 py-1.5 text-[12px] text-carbon/55 hover:text-carbon"
              onMouseDown={(e) => {
                e.preventDefault();
                todo();
              }}
            >
              Ver todo en Consultar ↵
            </div>
          )}
        </div>
      )}
    </div>
  );
}
