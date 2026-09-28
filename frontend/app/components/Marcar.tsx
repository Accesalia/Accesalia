"use client";

import { useEffect, useRef, useState } from "react";

// MARCAR VARIAS COSAS DE UNA LISTA (Monica, 27-sep-2026).
//
// "De lo que yo vendo, que me quieren comprar." Normalmente entre dos y cinco
// cosas, y lo marcado se queda A LA DERECHA, sobre el fondo y sin caja: si tiene
// aspecto de campo parece que tambien hay que rellenarlo.
//
// Por dentro es el MISMO selector que el de elegir una sola cosa: se pincha un
// boton y se despliega la lista, con su minibuscador dentro. Antes era una
// casilla de texto, y el cursor decia "escribe aqui" cuando lo que toca es
// elegir —ella lo vio en cuanto lo tuvo delante (28-sep-2026)—. Aqui no se
// teclea: se elige, y escribir solo sirve para encontrar antes.

export type Marca = { valor: string; texto: string; pista?: string };

const limpio = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function Marcar({
  id,
  opciones,
  vacio = "elige de la lista",
  ancho = "w-[237px]",
  marco = "border-carbon/70",
}: {
  id: string;
  opciones: Marca[];
  /** Lo que pone cuando no hay nada marcado. */
  vacio?: string;
  /** Lo que mide el selector; lo marcado crece a su derecha. */
  ancho?: string;
  marco?: string;
}) {
  const [puestos, setPuestos] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const escribe = useRef<HTMLInputElement>(null);

  const q = limpio(busca.trim());
  const libres = opciones.filter((o) => !puestos.includes(o.valor));
  const salen = q === "" ? libres : libres.filter((o) => limpio(o.texto + " " + (o.pista ?? "")).includes(q));

  // Cerrar pinchando fuera o con Escape, como cualquier desplegable.
  useEffect(() => {
    if (!abierto) {
      setBusca("");
      return;
    }
    escribe.current?.focus();
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

  const texto = (v: string) => opciones.find((o) => o.valor === v)?.texto ?? v;
  const marcar = (v: string) => {
    setPuestos((l) => [...l, v]);
    setBusca("");
  };

  return (
    <div className="flex min-w-0 items-start gap-3">
      {puestos.map((v) => (
        <input key={v} type="hidden" name={id} value={v} />
      ))}

      <div className={"relative shrink-0 " + ancho} ref={caja}>
        <button
          type="button"
          id={id + "_boton"}
          data-campo
          onClick={() => setAbierto((x) => !x)}
          onKeyDown={(e) => {
            // Enter pasa al campo siguiente (lo hace el formulario); para abrir,
            // espacio o flecha abajo.
            if (e.key === "Enter") e.preventDefault();
            else if (e.key === " " || e.key === "ArrowDown") {
              e.preventDefault();
              setAbierto(true);
            }
          }}
          className={
            "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border bg-white px-3 py-1.5 text-left text-sm text-carbon transition focus:border-lima focus:outline-none " +
            marco +
            (abierto ? " border-lima" : "")
          }
        >
          <span className="text-carbon/55">{vacio}</span>
          <span aria-hidden className="shrink-0 text-carbon/55">
            ▾
          </span>
        </button>

        {abierto && (
          <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-lg border border-black/10 bg-white shadow-lg">
            <input
              ref={escribe}
              data-buscador
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (salen[0]) marcar(salen[0].valor);
              }}
              placeholder="Escribe para buscar…"
              className="w-full border-b border-black/10 px-3 py-2 text-sm text-carbon outline-none placeholder:text-carbon/55"
            />
            <ul className="max-h-60 overflow-auto py-1">
              {salen.length === 0 && <li className="px-3 py-2 text-sm text-carbon/65">No queda ninguna por marcar.</li>}
              {salen.map((o) => (
                <li key={o.valor}>
                  <button
                    type="button"
                    onClick={() => marcar(o.valor)}
                    className="flex w-full cursor-pointer items-baseline gap-2 px-3 py-1.5 text-left text-sm text-carbon hover:bg-lima-soft"
                  >
                    <span>{o.texto}</span>
                    {o.pista && <span className="text-xs text-carbon/60">{o.pista}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Sobre el fondo, sin marco: esto no se rellena, se mira. */}
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 pt-1">
        {puestos.map((v) => (
          <span key={v} className="inline-flex items-center gap-1.5 rounded-lg bg-lima/25 px-2 py-0.5 text-xs text-carbon">
            {texto(v)}
            <button
              type="button"
              onClick={() => setPuestos((l) => l.filter((x) => x !== v))}
              aria-label={"Quitar " + texto(v)}
              className="cursor-pointer text-carbon/60 transition hover:text-carbon"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
