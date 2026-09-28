"use client";

import { useEffect, useRef, useState } from "react";

// MARCAR VARIAS COSAS DE UNA LISTA (Monica, 27-sep-2026).
//
// "De lo que yo vendo, que me quieren comprar." Normalmente entre dos y cinco
// cosas. Minibuscador que encuentra el trozo donde este, sin tildes ni
// mayusculas, y la lista se ve SIN escribir nada.
//
// Lo marcado se queda A LA DERECHA del selector, sobre el fondo y sin caja: si
// tiene aspecto de campo parece que tambien hay que rellenarlo (28-sep-2026).
//
// Y se cierra como se cierra cualquier desplegable: pinchando fuera, con Escape,
// o volviendo a pinchar en el. Nunca se queda atrapado sin elegir nada.

export type Marca = { valor: string; texto: string; pista?: string };

const limpio = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function Marcar({
  id,
  opciones,
  pista = "elige de la lista",
  ancho = "w-[237px]",
}: {
  id: string;
  opciones: Marca[];
  pista?: string;
  /** Lo que mide el selector; lo marcado crece a su derecha. */
  ancho?: string;
}) {
  const [puestos, setPuestos] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  const q = limpio(busca.trim());
  const libres = opciones.filter((o) => !puestos.includes(o.valor));
  const salen = q === "" ? libres : libres.filter((o) => limpio(o.texto + " " + (o.pista ?? "")).includes(q));

  const cerrar = () => {
    setAbierto(false);
    setBusca("");
  };

  // Con Enter se marca la primera que sale, sin tener que apuntar con el raton.
  const alTeclear = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      cerrar();
      (e.target as HTMLElement).blur();
      return;
    }
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (salen[0]) {
      setPuestos((l) => [...l, salen[0].valor]);
      setBusca("");
    }
  };

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) cerrar();
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  const texto = (v: string) => opciones.find((o) => o.valor === v)?.texto ?? v;

  return (
    <div className="flex min-w-0 items-start gap-3" ref={caja}>
      {puestos.map((v) => (
        <input key={v} type="hidden" name={id} value={v} />
      ))}

      <div className={"relative shrink-0 " + ancho}>
        <input
          id={id + "_busca"}
          type="text"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setAbierto(true);
          }}
          onKeyDown={alTeclear}
          // Pinchar abre; volver a pinchar cierra. Como cualquier desplegable.
          onMouseDown={() => setAbierto((x) => !x)}
          placeholder={pista}
          autoComplete="off"
          data-buscador
          className="w-full rounded-lg border border-carbon/70 bg-white px-3 py-1.5 pr-8 text-sm text-carbon outline-none transition placeholder:text-carbon/55 focus:border-lima"
        />
        <span aria-hidden className="pointer-events-none absolute right-3 top-1.5 text-sm text-carbon/55">
          ▾
        </span>

        {abierto && (
          <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-auto rounded-lg border border-black/10 bg-white py-1 shadow-lg">
            {salen.length === 0 && <li className="px-3 py-2 text-sm text-carbon/65">No queda ninguna por marcar.</li>}
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

      {/* Sobre el fondo, sin marco: esto no se rellena, se mira. */}
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 pt-1">
        {puestos.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1.5 rounded-lg bg-lima/25 px-2 py-0.5 text-xs text-carbon"
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
