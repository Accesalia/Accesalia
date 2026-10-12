"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { HUECO_SALIDA } from "../components/Salida";

// LAS CUATRO AREAS, EN LA BARRA NEGRA (maqueta validada por Monica, 12-oct-2026):
// Cobrar, Pagar, Prever y Asignar, siempre arriba, con su contador. Se pintan en
// el hueco de la barra (el mismo de la salida); sin barra, se quedan en la pagina.

export type PestanaArea = { clave: string; titulo: string; href: string; cuenta?: number; aviso?: boolean };

export function AreasBarra({ areas, activa }: { areas: PestanaArea[]; activa: string }) {
  const [hueco, setHueco] = useState<HTMLElement | null | undefined>(undefined);
  useEffect(() => setHueco(document.getElementById(HUECO_SALIDA)), []);
  if (hueco === undefined) return null;
  const pestanas = (
    <nav className="flex items-center gap-1">
      {areas.map((a) => {
        const on = a.clave === activa;
        return (
          <Link
            key={a.clave}
            href={a.href}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-1.5 text-[14.5px] font-semibold transition ${on ? "bg-white text-carbon" : "text-white/65 hover:text-white"}`}
          >
            {a.titulo}
            {a.cuenta ? (
              <span className={`rounded-full px-1.5 text-[11.5px] font-bold ${a.aviso ? "bg-alerta text-white" : on ? "bg-carbon text-white" : "bg-white/15 text-white"}`}>{a.cuenta}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
  return hueco ? createPortal(pestanas, hueco) : pestanas;
}
