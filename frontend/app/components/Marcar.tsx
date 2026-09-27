"use client";

import { useEffect, useRef, useState } from "react";

// MARCAR VARIAS COSAS DE UNA LISTA (Monica, 27-sep-2026).
//
// "De lo que yo vendo, que me quieren comprar." Normalmente entre dos y cinco
// cosas, asi que no vale una casilla de una sola linea: hace falta ver lo que se
// lleva marcado. Mismo minibuscador que el selector de siempre —encuentra el
// trozo donde este, sin tildes ni mayusculas— y lo marcado se queda a la vista
// en fichas que se quitan de un clic.

export type Marca = { valor: string; texto: string; pista?: string };

const limpio = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function Marcar({
  id,
  nombre,
  opciones,
  vacio = "nada marcado todavía",
  clase = "",
  tinta,
}: {
  id: string;
  nombre: string;
  opciones: Marca[];
  vacio?: string;
  clase?: string;
  tinta?: string;
}) {
  const [puestos, setPuestos] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  // La lista se ve SIN escribir nada: aqui se elige, no se teclea. Escribir solo
  // sirve para encontrar antes, y filtra por el trozo que sea.
  const q = limpio(busca.trim());
  const libres = opciones.filter((o) => !puestos.includes(o.valor));
  const salen = q === "" ? libres : libres.filter((o) => limpio(o.texto + " " + (o.pista ?? "")).includes(q));

  // Con Enter se marca la primera que sale, sin tener que apuntar con el raton.
  const alTeclear = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (salen[0]) {
      setPuestos((l) => [...l, salen[0].valor]);
      setBusca("");
    }
  };

  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) {
        setAbierto(false);
        setBusca("");
      }
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  const texto = (v: string) => opciones.find((o) => o.valor === v)?.texto ?? v;

  return (
    <div className={"min-w-0 " + clase} ref={caja}>
      <span className={"block text-[10px] font-bold uppercase tracking-wide text-carbon/70 " + (tinta ?? "")}>
        {nombre}
      </span>

      {puestos.map((v) => (
        <input key={v} type="hidden" name={id} value={v} />
      ))}

      <div className="relative mt-1">
        <input
          id={id + "_busca"}
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setAbierto(false);
              setBusca("");
              return;
            }
            alTeclear(e);
          }}
          onFocus={() => setAbierto(true)}
          onClick={() => setAbierto(true)}
          placeholder="elige de la lista (o escribe para encontrar antes)"
          autoComplete="off"
          data-buscador
          className="w-full rounded-lg border border-marco bg-white px-3 py-1.5 text-sm text-carbon outline-none transition placeholder:text-carbon/55 focus:border-lima"
        />
        {abierto && salen.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-auto rounded-lg border border-marco bg-white py-1 shadow-lg">
            {salen.map((o) => (
              <li key={o.valor}>
                <button
                  type="button"
                  onClick={() => {
                    setPuestos((l) => [...l, o.valor]);
                    setBusca("");
                  }}
                  className="flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-sm text-carbon hover:bg-lima/15"
                >
                  <span>{o.texto}</span>
                  {o.pista && <span className="text-xs text-carbon/60">{o.pista}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-2 flex min-h-9 flex-wrap items-start gap-1.5 rounded-lg border border-marco bg-white p-2">
        {puestos.length === 0 && <span className="text-xs text-carbon/55">{vacio}</span>}
        {puestos.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1.5 rounded-lg bg-lima/20 px-2 py-0.5 text-xs font-semibold text-carbon"
          >
            {texto(v)}
            <button
              type="button"
              onClick={() => setPuestos((l) => l.filter((x) => x !== v))}
              aria-label={"Quitar " + texto(v)}
              className="text-carbon/60 transition hover:text-carbon"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
