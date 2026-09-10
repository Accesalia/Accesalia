"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

// Listado de administraciones de fincas, repasado con Monica el 10-sep-2026
// comparando la pantalla de julio con la maqueta nueva. Lo que se decidio:
//
//  * Se queda el titulo "Cartera de administraciones" (mas grande) y la cifra
//    de cuantas hay debajo. Se quita el epigrafe "Comercial · CRM": no aporta.
//  * El buscador va arriba a la derecha, discreto, y es UNO SOLO: busca a la
//    vez en administraciones y en personas, y ensena cuantas hay de cada.
//    Si donde estas no hay nada y en el otro lado si, salta solo.
//  * Conmutador administraciones / personas. Hasta ahora las personas no
//    tenian listado: solo se llegaba a ellas entrando por su administracion.
//  * Columnas: administracion, comunidades, estado y ultimo contacto. Y ya.
//    "Si entro sera para buscar una administracion y entrar en su ficha. No
//    voy a querer todos sus datos en pantalla."
//  * Filtros de estado y de ultimo contacto, que es el que de verdad usa:
//    "a este hace tres meses que no lo llamas".
export type FilaCartera = {
  id: string;
  nombre: string;
  municipio: string | null;
  estadoLabel: string;
  estadoClase: string;
  estadoClave: string | null;
  comercialNombre: string | null;
  personas: number;
  comunidades: number;
  ultimoContacto: string | null;
  activo: boolean;
};

export type FilaPersona = {
  id: string;
  nombre: string;
  cargo: string | null;
  empresa: string | null;
  comunidades: number;
  email: string | null;
  telefono: string | null;
};

const sinA = (s: string | null) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const DIA = 86_400_000;
function diasDesde(fecha: string | null): number | null {
  if (!fecha) return null;
  return Math.floor((Date.now() - new Date(fecha).getTime()) / DIA);
}

function Contacto({ fecha }: { fecha: string | null }) {
  const d = diasDesde(fecha);
  if (d === null) return <span className="text-carbon/50">Nunca</span>;
  const texto = new Date(fecha!).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  const color = d > 180 ? "text-red-600 font-semibold" : d > 90 ? "text-amber-700" : "text-carbon/70";
  return (
    <span className={color}>
      {texto}
      <span className="ml-1.5 text-sm text-carbon/55">
        {d === 0 ? "hoy" : d === 1 ? "ayer" : `hace ${d < 60 ? `${d} d` : `${Math.round(d / 30)} meses`}`}
      </span>
    </span>
  );
}

// Filtros de administracion. El de "sin contactar" es el unico que ella dijo
// que usaria de verdad para mantener la cartera.
const FILTROS_ADM = [
  { k: "activas", l: "Activas", f: (a: FilaCartera) => a.activo },
  { k: "clientes", l: "Clientes", f: (a: FilaCartera) => (a.estadoClave ?? "").startsWith("cliente") },
  { k: "frias", l: "Sin contactar en 3 meses", f: (a: FilaCartera) => (diasDesde(a.ultimoContacto) ?? 9999) > 90, av: true },
  { k: "gordas", l: "Más de 10 comunidades", f: (a: FilaCartera) => a.comunidades > 10 },
  { k: "sinestado", l: "Sin estado", f: (a: FilaCartera) => !a.estadoClave, av: true },
  { k: "sinnadie", l: "Sin nadie registrado", f: (a: FilaCartera) => a.personas === 0, av: true },
];

const FILTROS_PER = [
  { k: "llevan", l: "Llevan comunidades", f: (p: FilaPersona) => p.comunidades > 0 },
  { k: "muchas", l: "Llevan 5 o más", f: (p: FilaPersona) => p.comunidades >= 5 },
  { k: "titulares", l: "Titulares", f: (p: FilaPersona) => /titular/i.test(p.cargo ?? "") },
  { k: "sincom", l: "Sin comunidades", f: (p: FilaPersona) => p.comunidades === 0, av: true },
  { k: "sincargo", l: "Sin cargo", f: (p: FilaPersona) => !p.cargo, av: true },
];

export function CarteraCliente({
  filas,
  personas,
}: {
  filas: FilaCartera[];
  personas: FilaPersona[];
}) {
  const [q, setQ] = useState("");
  const [modo, setModo] = useState<"adm" | "per">("adm");
  const [filtro, setFiltro] = useState<string | null>(null);

  const b = sinA(q.trim());

  const cuentaAdm = useMemo(
    () => (b ? filas.filter((a) => sinA(a.nombre).includes(b) || sinA(a.municipio).includes(b)).length : filas.length),
    [b, filas],
  );
  const cuentaPer = useMemo(
    () =>
      b
        ? personas.filter((p) => sinA(p.nombre).includes(b) || sinA(p.empresa).includes(b) || sinA(p.cargo).includes(b)).length
        : personas.length,
    [b, personas],
  );

  // El buscador es uno solo: si donde estas no hay nada y enfrente si, se salta.
  const modoReal = b && ((modo === "adm" && cuentaAdm === 0 && cuentaPer > 0) ? "per"
                  : (modo === "per" && cuentaPer === 0 && cuentaAdm > 0) ? "adm" : modo) || modo;

  const visiblesAdm = useMemo(() => {
    const F = FILTROS_ADM.find((f) => f.k === filtro);
    return filas.filter(
      (a) => (!F || F.f(a)) && (!b || sinA(a.nombre).includes(b) || sinA(a.municipio).includes(b)),
    );
  }, [filas, b, filtro]);

  const visiblesPer = useMemo(() => {
    const F = FILTROS_PER.find((f) => f.k === filtro);
    return personas.filter(
      (p) =>
        (!F || F.f(p)) &&
        (!b || sinA(p.nombre).includes(b) || sinA(p.empresa).includes(b) || sinA(p.cargo).includes(b)),
    );
  }, [personas, b, filtro]);

  const esAdm = modoReal === "adm";
  const filtros = esAdm ? FILTROS_ADM : FILTROS_PER;

  return (
    <>
      {/* conmutador + buscador */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-black/10 bg-hueso p-1">
          {(["adm", "per"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setModo(m); setFiltro(null); }}
              aria-pressed={modoReal === m}
              className={
                "rounded-full px-4 py-1.5 text-base transition " +
                (modoReal === m ? "bg-carbon font-semibold text-white" : "text-carbon/70 hover:text-carbon")
              }
            >
              {m === "adm" ? "Administraciones" : "Personas"}
              {b && (
                <span className="ml-1.5 text-sm opacity-70">{m === "adm" ? cuentaAdm : cuentaPer}</span>
              )}
            </button>
          ))}
        </div>

        <label className="flex min-w-[260px] flex-1 items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 shadow-sm sm:max-w-xs sm:flex-none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="shrink-0 text-carbon/55">
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => { setQ(e.target.value); setFiltro(null); }}
            placeholder="Buscar una administración o una persona…"
            className="w-full bg-transparent text-base outline-none placeholder:text-carbon/50"
          />
        </label>
      </div>

      {/* filtros */}
      <div className="mt-3 flex flex-wrap gap-2">
        {filtros.map((f) => (
          <button
            key={f.k}
            onClick={() => setFiltro(filtro === f.k ? null : f.k)}
            aria-pressed={filtro === f.k}
            className={
              "rounded-full border px-3 py-1 text-sm transition " +
              (filtro === f.k
                ? "av" in f && f.av
                  ? "border-amber-300 bg-amber-50 font-semibold text-amber-700"
                  : "border-lima bg-lima-soft font-semibold text-lima-dark"
                : "border-black/10 bg-white text-carbon/70 hover:border-lima")
            }
          >
            {f.l}
          </button>
        ))}
      </div>

      {/* tabla */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
        {esAdm ? (
          <table className="w-full min-w-[640px] text-base">
            <thead>
              <tr className="border-b border-black/10 text-xs uppercase tracking-wider text-carbon/60">
                <th className="px-4 py-3 text-left font-bold">Administración</th>
                <th className="px-4 py-3 text-right font-bold">Comunidades</th>
                <th className="px-4 py-3 text-left font-bold">Estado</th>
                <th className="px-4 py-3 text-left font-bold">Último contacto</th>
              </tr>
            </thead>
            <tbody>
              {visiblesAdm.map((a) => (
                <tr key={a.id} className="border-b border-black/5 last:border-0 hover:bg-hueso/70">
                  <td className="px-4 py-3">
                    <Link href={`/administraciones/${a.id}`} className="font-semibold text-carbon hover:text-lima-dark">
                      {a.nombre}
                    </Link>
                    {a.municipio && <span className="ml-2 text-sm text-carbon/55">{a.municipio}</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {a.comunidades || <span className="text-carbon/45">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={"rounded-full px-2 py-0.5 text-sm font-medium " + a.estadoClase}>
                      {a.estadoLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3"><Contacto fecha={a.ultimoContacto} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[640px] text-base">
            <thead>
              <tr className="border-b border-black/10 text-xs uppercase tracking-wider text-carbon/60">
                <th className="px-4 py-3 text-left font-bold">Persona</th>
                <th className="px-4 py-3 text-left font-bold">Administración</th>
                <th className="px-4 py-3 text-left font-bold">Cargo</th>
                <th className="px-4 py-3 text-right font-bold">Comunidades</th>
              </tr>
            </thead>
            <tbody>
              {visiblesPer.map((p) => (
                <tr key={p.id} className="border-b border-black/5 last:border-0 hover:bg-hueso/70">
                  <td className="px-4 py-3">
                    <Link href={`/administradores/${p.id}`} className="font-semibold text-carbon hover:text-lima-dark">
                      {p.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-carbon/70">{p.empresa ?? <span className="text-carbon/45">—</span>}</td>
                  <td className="px-4 py-3 text-carbon/70">
                    {p.cargo ?? <span className="text-carbon/45">sin cargo</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p.comunidades || <span className="text-carbon/45">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {(esAdm ? visiblesAdm : visiblesPer).length === 0 && (
          <div className="px-4 py-12 text-center text-carbon/65">
            {q ? (
              <>
                Nada que coincida con <b>{q}</b>.
                <div className="mt-4">
                  <Link
                    href={esAdm ? `/administraciones/nueva?nombre=${encodeURIComponent(q)}` : "/administraciones"}
                    className="rounded-full bg-lima px-4 py-2 text-base font-semibold text-carbon hover:bg-lima-dark hover:text-white"
                  >
                    Crear «{q}»
                  </Link>
                </div>
              </>
            ) : (
              "Nada con ese filtro."
            )}
          </div>
        )}
      </div>

      <p className="mt-3 text-sm text-carbon/60">
        {esAdm
          ? `${visiblesAdm.length} de ${filas.length} administraciones`
          : `${visiblesPer.length} de ${personas.length} personas`}
      </p>
    </>
  );
}
