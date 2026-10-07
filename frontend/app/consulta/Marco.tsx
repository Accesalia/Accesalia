import Link from "next/link";
import type { ReactNode } from "react";
import { BarraSuperior } from "../components/BarraSuperior";

// EL MARCO DE CONSULTAR: la barra, la salida y las tres pestañas (buscar y los
// dos listados), para pasar de una a otra sin volver al menu.

export const CAJA = "rounded-[10px] border border-[#d9d9d9] bg-white";
export const ROT = "text-[10px] font-bold uppercase tracking-[0.09em] text-[#8a8a8a]";
export const pill = (on: boolean) =>
  "rounded-full border px-3 py-1 text-[12.5px] transition " +
  (on ? "border-carbon bg-carbon font-semibold text-white" : "border-carbon/25 bg-white text-carbon/75 hover:border-carbon");

const PESTANAS = [
  { href: "/consulta", texto: "Buscar" },
  { href: "/consulta/oportunidades", texto: "Listado de oportunidades" },
  { href: "/consulta/administradores", texto: "Listado de administradores" },
];

export function Marco({ aqui, children }: { aqui: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-hueso">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1300px] px-4 pb-16 pt-5 sm:px-6">
        <Link href="/menu" className="text-sm font-semibold text-carbon/65 transition hover:text-carbon">
          ← Menú
        </Link>
        <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2 border-b border-black/10">
          <h1 className="pb-2 text-[25px] font-bold text-carbon">Consultar</h1>
          <nav className="flex gap-1">
            {PESTANAS.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className={
                  "-mb-px rounded-t-[8px] border px-4 py-2 text-[13px] font-semibold transition " +
                  (p.href === aqui ? "border-black/10 border-b-hueso bg-hueso text-carbon" : "border-transparent text-carbon/60 hover:text-carbon")
                }
              >
                {p.texto}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-4">{children}</div>
      </main>
    </div>
  );
}

export const fechaCorta = (v: string | null) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "—");
export const ENLACE = "font-semibold text-carbon underline-offset-2 hover:text-[#104269] hover:underline";

/** Los comerciales para filtrar: todos, o uno. Mantiene el resto de la URL. */
export function FiltroComercial({
  base,
  comerciales,
  elegido,
  cuenta,
  extra = "",
}: {
  base: string;
  comerciales: { id: string; nombre: string }[];
  elegido: string | null;
  cuenta: (id: string | null) => number;
  extra?: string;
}) {
  const url = (c: string | null) => `${base}?${[c ? `c=${c}` : "", extra].filter(Boolean).join("&")}`;
  return (
    <div className="flex flex-wrap gap-1.5">
      <Link href={url(null)} className={pill(elegido === null)}>
        Todos <b>{cuenta(null)}</b>
      </Link>
      {comerciales.map((m) => (
        <Link key={m.id} href={url(m.id)} className={pill(elegido === m.id)}>
          {m.nombre} <b>{cuenta(m.id)}</b>
        </Link>
      ))}
    </div>
  );
}
