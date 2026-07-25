"use client";

// Filtrado en cliente de la cartera: buscador (nombre/municipio, insensible a
// acentos) + chips por comercial con recuento. Las filas llegan ya "aplanadas"
// desde el servidor (lib/comercial es server-only), aqui solo se filtra y pinta.

import Link from "next/link";
import { useMemo, useState } from "react";

export type FilaCartera = {
  id: string;
  nombre: string;
  municipio: string | null;
  estadoLabel: string;
  estadoClase: string;
  comercialId: string | null;
  comercialNombre: string;
  personas: number;
  ultimoContacto: string | null;
  activo: boolean;
};

function fecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function diasDesde(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
function PuntoContacto({ iso }: { iso: string | null }) {
  const d = diasDesde(iso);
  const color = d === null ? "bg-black/15" : d <= 30 ? "bg-lima" : d <= 90 ? "bg-amber-400" : "bg-red-400";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} aria-hidden />;
}
const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function Fila({ a }: { a: FilaCartera }) {
  return (
    <Link
      href={`/administraciones/${a.id}`}
      className="grid grid-cols-12 items-center gap-3 border-b border-black/5 px-4 py-3 text-sm transition hover:bg-lima-soft/50"
    >
      <div className="col-span-4 min-w-0">
        <div className="truncate font-medium text-carbon">{a.nombre}</div>
        {a.municipio && <div className="truncate text-xs text-carbon/45">{a.municipio}</div>}
      </div>
      <div className="col-span-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${a.estadoClase}`}>{a.estadoLabel}</span>
      </div>
      <div className="col-span-2 min-w-0 truncate text-carbon/70">{a.comercialNombre}</div>
      <div className="col-span-1 text-carbon/60">{a.personas > 0 ? `${a.personas} pers.` : <span className="text-carbon/30">—</span>}</div>
      <div className="col-span-2 flex items-center gap-1.5 text-xs text-carbon/60">
        <PuntoContacto iso={a.ultimoContacto} />
        {fecha(a.ultimoContacto)}
      </div>
      <div className="col-span-1 text-right">
        {a.activo ? null : <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase text-carbon/40">Baja</span>}
      </div>
    </Link>
  );
}

export function CarteraCliente({ filas }: { filas: FilaCartera[] }) {
  const [q, setQ] = useState("");
  const [comercial, setComercial] = useState<string>("todos"); // 'todos' | comercialId | 'sin'

  // Comerciales presentes en la cartera, con recuento (los que tienen admins).
  const comerciales = useMemo(() => {
    const m = new Map<string, { id: string; nombre: string; n: number }>();
    for (const f of filas) {
      const key = f.comercialId ?? "sin";
      const e = m.get(key) ?? { id: key, nombre: f.comercialId ? f.comercialNombre : "Sin asignar", n: 0 };
      e.n++;
      m.set(key, e);
    }
    return [...m.values()].sort((a, b) => b.n - a.n);
  }, [filas]);

  const filtradas = useMemo(() => {
    const nq = norm(q.trim());
    return filas.filter((f) => {
      if (comercial !== "todos" && (f.comercialId ?? "sin") !== comercial) return false;
      if (nq && !norm(`${f.nombre} ${f.municipio ?? ""}`).includes(nq)) return false;
      return true;
    });
  }, [filas, q, comercial]);

  const chip = (activo: boolean) =>
    `rounded-full border px-3 py-1 text-sm transition ${activo ? "border-lima bg-lima font-semibold text-carbon" : "border-black/10 bg-white text-carbon/60 hover:border-lima"}`;

  return (
    <>
      {/* Buscador + filtro por comercial */}
      <div className="mt-6 flex flex-col gap-3">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-carbon/30">⌕</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o municipio…"
            className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-lima"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => setComercial("todos")} className={chip(comercial === "todos")}>
            Todos <span className="text-carbon/40">{filas.length}</span>
          </button>
          {comerciales.map((c) => (
            <button key={c.id} onClick={() => setComercial(c.id)} className={chip(comercial === c.id)}>
              {c.nombre} <span className="text-carbon/40">{c.n}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-carbon/45">
        {filtradas.length === filas.length ? `${filas.length} administraciones` : `${filtradas.length} de ${filas.length}`}
      </p>

      <div className="mt-2 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        <div className="grid grid-cols-12 gap-3 border-b border-black/10 bg-hueso px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-carbon/40">
          <div className="col-span-4">Administración de fincas</div>
          <div className="col-span-2">Estado</div>
          <div className="col-span-2">Comercial</div>
          <div className="col-span-1">Personas</div>
          <div className="col-span-2">Últ. contacto</div>
          <div className="col-span-1"></div>
        </div>

        {filtradas.length === 0 ? (
          <p className="px-4 py-16 text-center text-sm text-carbon/45">
            No hay administraciones que encajen con la búsqueda.
          </p>
        ) : (
          filtradas.map((a) => <Fila key={a.id} a={a} />)
        )}
      </div>
    </>
  );
}
