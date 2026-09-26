"use client";

import { useEffect, useRef, useState } from "react";

// UN SELECTOR CON BUSCADOR (Monica, 26-sep-2026).
//
// El desplegable de siempre solo encuentra por el PRINCIPIO: escribiendo "roen"
// no aparece "ADMINISTRACIONES ROEN". Y ademas no se ve lo que uno escribe.
// Aqui hay un minibuscador arriba, se ve lo escrito, y encuentra el trozo este
// donde este. Sin tildes ni mayusculas de por medio.
//
// Vale para TODAS las casillas de elegir un valor, sean tres opciones o
// doscientas ochenta.

export type Opcion = { valor: string; texto: string; pista?: string };

const limpio = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function Elegir({
  id,
  nombre,
  opciones,
  valor,
  alElegir,
  desactivado,
  clase = "",
  vacio = "—",
}: {
  id: string;
  nombre: string;
  opciones: Opcion[];
  /** Si se controla desde fuera (la administración elegida manda en la lista
   *  de personas); si no, se guarda aquí. */
  valor?: string;
  alElegir?: (v: string) => void;
  desactivado?: boolean;
  clase?: string;
  vacio?: string;
}) {
  const [propio, setPropio] = useState("");
  const elegido = valor ?? propio;
  const poner = (v: string) => {
    setPropio(v);
    alElegir?.(v);
  };

  const [abierto, setAbierto] = useState(false);
  const [busca, setBusca] = useState("");
  const caja = useRef<HTMLDivElement>(null);
  const escribe = useRef<HTMLInputElement>(null);

  // cerrar al pinchar fuera o con Escape
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  // Al cerrar se BORRA lo buscado. Si no, se queda pegado y sigue filtrando por
  // debajo: escribir "javier" aqui y volver luego dejaba la lista reducida a
  // Javier aunque ya se hubiera elegido otra administracion.
  useEffect(() => {
    if (abierto) escribe.current?.focus();
    else setBusca("");
  }, [abierto]);

  const q = limpio(busca.trim());
  const filtradas = q === "" ? opciones : opciones.filter((o) => limpio(o.texto + " " + (o.pista ?? "")).includes(q));
  const puesto = opciones.find((o) => o.valor === elegido) ?? null;

  return (
    <div className={"relative " + clase} ref={caja}>
      <span className="block text-[10px] font-bold uppercase tracking-wide text-carbon/70">{nombre}</span>
      <input type="hidden" name={id} value={elegido} />
      <button
        type="button"
        id={id + "_boton"}
        disabled={desactivado}
        onClick={() => setAbierto((x) => !x)}
        className={
          "mt-1 flex w-full items-center justify-between gap-2 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-left text-sm text-carbon transition focus:border-lima focus:outline-none disabled:bg-black/[.03] disabled:text-carbon/35 " +
          (abierto ? "border-lima" : "")
        }
      >
        <span className={"truncate " + (puesto ? "" : "text-carbon/55")}>{puesto ? puesto.texto : vacio}</span>
        <span aria-hidden className="shrink-0 text-carbon/55">
          ▾
        </span>
      </button>

      {abierto && (
        <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-lg border border-black/10 bg-white shadow-lg">
          <input
            ref={escribe}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (filtradas[0]) {
                  poner(filtradas[0].valor);
                  setAbierto(false);
                  setBusca("");
                }
              }
            }}
            placeholder="Escribe para buscar…"
            className="w-full border-b border-black/10 px-3 py-2 text-sm text-carbon outline-none placeholder:text-carbon/55"
          />
          <ul className="max-h-60 overflow-auto py-1">
            {elegido !== "" && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    poner("");
                    setAbierto(false);
                    setBusca("");
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm text-carbon/65 hover:bg-hueso"
                >
                  Quitar lo elegido
                </button>
              </li>
            )}
            {filtradas.length === 0 && <li className="px-3 py-2 text-sm text-carbon/65">No hay ninguna que coincida.</li>}
            {filtradas.map((o) => (
              <li key={o.valor}>
                <button
                  type="button"
                  onClick={() => {
                    poner(o.valor);
                    setAbierto(false);
                    setBusca("");
                  }}
                  className={
                    "block w-full px-3 py-1.5 text-left text-sm hover:bg-lima-soft " +
                    (o.valor === elegido ? "font-bold text-lima-dark" : "text-carbon")
                  }
                >
                  {o.texto}
                  {o.pista && <span className="ml-1.5 text-carbon/60">{o.pista}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
