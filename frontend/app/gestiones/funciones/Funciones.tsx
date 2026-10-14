"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Elegir } from "../../components/Elegir";
import type { FuncionConPersonas, PersonaEquipo } from "../../../lib/gestionFunciones";
import { accionAsignarFuncion, accionQuitarFuncion } from "../acciones";

// Las dos listas de su pedido: a la izquierda las personas, con lo que tiene
// cada una; a la derecha las funciones, cada una con sus personas, donde se da
// y se quita. Pinchar una persona resalta sus funciones.

export function Funciones({ personas, funciones }: { personas: PersonaEquipo[]; funciones: FuncionConPersonas[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [marcada, setMarcada] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  const deCada = new Map(personas.map((p) => [p.id, funciones.filter((f) => f.personas.some((x) => x.equipoId === p.id))]));

  const hacer = (accion: () => Promise<{ ok: true } | { ok: false; error: string }>) =>
    empezar(async () => {
      setError(null);
      const r = await accion().catch((e: Error) => ({ ok: false as const, error: e.message }));
      if (!r.ok) setError(r.error);
      router.refresh();
    });

  return (
    <div className="mt-5">
      {error && <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">{error}</p>}
      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* ---- las personas ---- */}
        <section className="self-start rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-carbon/70">Personas</h2>
          <ul className="divide-y divide-black/5">
            {personas.map((p) => {
              const suyas = deCada.get(p.id) ?? [];
              const activa = marcada === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setMarcada(activa ? null : p.id)}
                    className={"block w-full rounded-lg px-2 py-2 text-left transition " + (activa ? "bg-lima-soft" : "hover:bg-hueso")}
                  >
                    <span className="block text-[14px] font-semibold text-carbon">{p.nombre}</span>
                    <span className={"block text-[12px] leading-snug " + (suyas.length ? "text-carbon/70" : "text-amber-700/70")}>
                      {suyas.length ? suyas.map((f) => f.nombre).join(" · ") : "sin funciones"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ---- las funciones ---- */}
        <section className="grid content-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {funciones.map((f) => {
            const tiene = new Set(f.personas.map((x) => x.equipoId));
            const resaltada = marcada && tiene.has(marcada);
            const libres = personas.filter((p) => !tiene.has(p.id)).map((p) => ({ valor: p.id, texto: p.nombre, pista: p.email ?? undefined }));
            return (
              <div
                key={f.id}
                className={
                  "flex flex-col rounded-2xl border bg-white p-4 shadow-sm transition " +
                  (resaltada ? "border-lima ring-2 ring-lima/40" : marcada ? "border-black/5 opacity-60" : "border-black/5")
                }
              >
                <h3 className="text-[15px] font-bold leading-snug text-carbon">{f.nombre}</h3>
                {f.descripcion && <p className="mt-0.5 text-[12px] leading-snug text-carbon/65">{f.descripcion}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {f.personas.length === 0 && <span className="text-[13px] text-amber-700/70">Nadie la tiene</span>}
                  {f.personas.map((x) => (
                    <span key={x.asignacionId} className="inline-flex items-center gap-1.5 rounded-full border border-lima/60 bg-lima-soft px-2.5 py-0.5 text-[13px] font-semibold text-lima-dark">
                      {x.nombre}
                      <button
                        type="button"
                        disabled={pendiente}
                        aria-label={`Quitar ${f.nombre} a ${x.nombre}`}
                        onClick={() => {
                          if (window.confirm(`¿Quitar «${f.nombre}» a ${x.nombre}? Queda apuntado que la tuvo hasta hoy.`))
                            hacer(() => accionQuitarFuncion(x.asignacionId));
                        }}
                        className="text-carbon/55 hover:text-alerta disabled:opacity-50"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                {libres.length > 0 && (
                  <div className="mt-auto pt-3">
                    <Elegir
                      key={f.personas.map((x) => x.asignacionId).join()}
                      id={`dar-${f.id}`}
                      nombre=""
                      opciones={libres}
                      vacio="+ Dar a una persona…"
                      desactivado={pendiente}
                      alElegir={(v) => v && hacer(() => accionAsignarFuncion(f.id, v))}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
