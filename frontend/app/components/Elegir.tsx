"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// UN SELECTOR CON BUSCADOR (Monica, 26-sep-2026).
//
// El desplegable de siempre solo encuentra por el PRINCIPIO: escribiendo "pinar"
// no aparece "ADMINISTRACIONES EL PINAR". Y ademas no se ve lo que uno escribe.
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
  defecto,
  tinta,
  marco,
  abrirAlMontar,
  conPista,
  dosLineas,
  noEsta,
  crearNueva,
  guardarAsi,
  grande,
  grupos,
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
  /** Lo que viene ya puesto al abrir la pantalla (y se puede cambiar). */
  defecto?: string;
  /** El color de la etiqueta y el del marco, cuando se eligen. */
  tinta?: string;
  marco?: string;
  /** Nace con la lista ya desplegada: para cuando se llega aqui pulsando un
   *  boton que dice "selecciona de las existentes". */
  abrirAlMontar?: boolean;
  /** Al elegir, enseña tambien la pista: "Jose Luis · FINCAS SUR". Sin ella, un
   *  "Jose Luis" a secas puede ser una docena de Jose Luises (Monica, 28-sep). */
  conPista?: boolean;
  /** El texto elegido puede ocupar dos lineas en vez de cortarse: para cuando
   *  ademas del nombre se enseña la empresa (Monica, 28-sep-2026). */
  dosLineas?: boolean;
  /** Una ultima linea "No está en la lista: «lo escrito»", para quien necesita
   *  saber que lo buscado no aparece (Monica, 8-oct-2026: la direccion que no
   *  esta puede ser nueva o una errata, y se pregunta). Sin esto, no sale. */
  noEsta?: (escrito: string) => void;
  /** EL SATELITE (Monica, 19-oct-2026): al final de la lista, siempre que se
   *  haya escrito algo, "No es ninguna, ¿la creo nueva?" (o "No está en la
   *  lista, ¿la creo nueva?" si no sale ninguna) y "¿La guardo así y la
   *  revisas después?". Sustituye a noEsta, que despistaba: salia debajo de
   *  las coincidencias como si no hubiera ninguna. */
  crearNueva?: (escrito: string) => void;
  guardarAsi?: (escrito: string) => void;
  /** Mas alto y con letra mas grande: para el movil, dedos gordos (19-oct). */
  grande?: boolean;
  /** EN COLUMNAS, como el "de lo que vendemos, que quieren" del alta (Monica,
   *  14-oct-2026): cada grupo una columna con su titulo. Sin esto, la lista. */
  grupos?: { titulo: string; valores: string[] }[];
}) {
  const [propio, setPropio] = useState(defecto ?? "");
  const elegido = valor ?? propio;
  const poner = (v: string) => {
    setPropio(v);
    alElegir?.(v);
  };

  const [abierto, setAbierto] = useState(Boolean(abrirAlMontar));
  // Si no hay sitio debajo, se despliega HACIA ARRIBA. Si no, en los campos de
  // abajo del todo la lista se sale de la pantalla y hay que hacer scroll para
  // verla (Monica, 28-sep-2026).
  const [arriba, setArriba] = useState(false);
  const [busca, setBusca] = useState("");
  const caja = useRef<HTMLDivElement>(null);
  const escribe = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (!abierto) return;
    const r = caja.current?.getBoundingClientRect();
    if (!r) return;
    const debajo = window.innerHeight - r.bottom;
    setArriba(debajo < 300 && r.top > debajo);
  }, [abierto]);

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
  const columnas = grupos?.map((g) => ({
    titulo: g.titulo,
    opciones: g.valores.map((v) => filtradas.find((o) => o.valor === v)).filter((o): o is Opcion => !!o),
  }));
  const elegir = (v: string) => {
    poner(v);
    setAbierto(false);
    setBusca("");
  };

  return (
    <div className={"relative " + clase} ref={caja}>
      {/* Sin nombre no se dibuja la etiqueta: hay sitios donde el rotulo de
          arriba ya lo dice y repetirlo es ruido. */}
      {nombre !== "" && (
        <span className={"block text-[10px] font-bold uppercase tracking-wide " + (tinta ?? "text-carbon/70")}>{nombre}</span>
      )}
      <input type="hidden" name={id} value={elegido} />
      <button
        type="button"
        id={id + "_boton"}
        data-campo
        disabled={desactivado}
        onClick={() => setAbierto((x) => !x)}
        onKeyDown={(e) => {
          // Enter NO abre: sirve para pasar al campo siguiente (lo hace el
          // formulario). Para abrir, espacio o flecha abajo.
          if (e.key === "Enter") e.preventDefault();
          else if (e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            setAbierto(true);
          }
        }}
        className={
          (nombre !== "" ? "mt-1 " : "") +
          (dosLineas ? "min-h-[52px] " : "") +
          (grande ? "min-h-[56px] rounded-xl px-3.5 py-3 text-[18px] " : "rounded-lg px-3 py-1.5 text-sm ") +
          "flex w-full items-center justify-between gap-2 border bg-white text-left text-carbon transition focus:border-lima focus:outline-none disabled:bg-black/[.03] disabled:text-carbon/35 " +
          (marco ?? "border-black/10") + " " +
          (abierto ? "border-lima" : "")
        }
      >
        <span className={(dosLineas ? "line-clamp-2 text-[13px] leading-[1.25] " : "truncate ") + (puesto ? "" : "text-carbon/55")}>
          {puesto ? puesto.texto : vacio}
          {puesto && conPista && puesto.pista && <span className="text-carbon/60"> · {puesto.pista}</span>}
        </span>
        <span aria-hidden className="shrink-0 text-carbon/55">
          ▾
        </span>
      </button>

      {abierto && (
        <div
          className={
            "absolute left-0 z-30 overflow-hidden rounded-lg border border-black/10 bg-white shadow-lg " +
            (columnas ? "w-[860px] " : "right-0 ") +
            (arriba ? "bottom-full mb-1" : "top-full mt-1")
          }
        >
          <input
            ref={escribe}
            data-buscador
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
            className={
              "w-full border-b border-black/10 text-carbon outline-none placeholder:text-carbon/55 " +
              (grande ? "px-3.5 py-3.5 text-[18px]" : "px-3 py-2 text-sm")
            }
          />
          {columnas ? (
            <div className="grid grid-cols-4 divide-x divide-black/10">
              {columnas.map((c) => (
                <div key={c.titulo} className="min-w-0 py-2">
                  <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.09em] text-[#237812]">{c.titulo}</div>
                  {c.opciones.length === 0 && <p className="px-3 py-1 text-[12px] text-carbon/50">—</p>}
                  {c.opciones.map((o) => (
                    <button
                      key={o.valor}
                      type="button"
                      onClick={() => elegir(o.valor)}
                      className={
                        "block w-full cursor-pointer px-3 py-1.5 text-left text-sm hover:bg-lima-soft " +
                        (o.valor === elegido ? "font-bold text-lima-dark" : "text-carbon")
                      }
                    >
                      {o.texto}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ) : (
          <ul className={(grande ? "max-h-[55vh] " : "max-h-60 ") + "overflow-auto py-1"}>
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
            {filtradas.length === 0 && !crearNueva && <li className="px-3 py-2 text-sm text-carbon/65">No hay ninguna que coincida.</li>}
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
                    "block w-full text-left hover:bg-lima-soft " +
                    (grande ? "border-b border-black/5 px-3.5 py-3 text-[17px] leading-snug " : "px-3 py-1.5 text-sm ") +
                    (o.valor === elegido ? "font-bold text-lima-dark" : "text-carbon")
                  }
                >
                  {o.texto}
                  {o.pista && <span className="ml-1.5 text-carbon/60">{o.pista}</span>}
                </button>
              </li>
            ))}
            {busca.trim() !== "" &&
              [
                crearNueva && {
                  texto: filtradas.length ? "No es ninguna, ¿la creo nueva?" : "No está en la lista, ¿la creo nueva?",
                  hacer: crearNueva,
                },
                guardarAsi && { texto: "¿La guardo así y la revisas después?", hacer: guardarAsi },
              ]
                .filter((x): x is { texto: string; hacer: (q: string) => void } => !!x)
                .map((x, i) => (
                  <li key={x.texto} className={i === 0 ? "border-t-2 border-[#8a6410]/30" : ""}>
                    <button
                      type="button"
                      onClick={() => {
                        x.hacer(busca.trim());
                        setAbierto(false);
                        setBusca("");
                      }}
                      className={
                        "block w-full text-left font-semibold text-[#5c4208] hover:bg-form-nuevo " +
                        (grande ? "bg-form-nuevo/60 px-3.5 py-3.5 text-[17px]" : "px-3 py-1.5 text-sm")
                      }
                    >
                      {x.texto}
                    </button>
                  </li>
                ))}
            {noEsta && busca.trim() !== "" && (
              <li className="border-t border-black/5">
                <button
                  type="button"
                  onClick={() => {
                    noEsta(busca.trim());
                    setAbierto(false);
                    setBusca("");
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm font-semibold text-[#5c4208] hover:bg-form-nuevo"
                >
                  No está en la lista: «{busca.trim()}»
                </button>
              </li>
            )}
          </ul>
          )}
        </div>
      )}
    </div>
  );
}
