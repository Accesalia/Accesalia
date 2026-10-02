"use client";

import { useEffect, useRef, useState } from "react";
import type { Busqueda, GrupoCandidato } from "../../../lib/revisionPolycam";

// LA VENTANA DE VINCULAR (Monica, 2-oct-2026).
//
// Su diseño, literal: "al lado un boton para un modal: en el modal deben salir
// los accesos posibles a los que vincularlo, y Alex marcar o validar segun el
// caso. El ejemplo de nectar: le saldria 'nectar 31 madrid tiene dos escaleras
// sobre las que estamos presupuestando; el escaneo es solo de una o abarca
// ambas?' y debajo: escalera x (casilla), escalera Y (casilla), TODAS (casilla).
// Sin mas."
//
// Asi que: la pregunta solo cuando hay mas de una escalera -con una sola, la
// pregunta sobra y la casilla se explica sola- y la casilla de TODAS marca las de
// su grupo, no las de todos los grupos: si el asunto saca dos Cañadas, "todas" de
// una no significa "todas las de las dos".
//
// Y A MANO TAMBIEN: "vincular a mano es necesario: por si acaso". Debajo de lo
// que propone el cotejo hay un buscador, porque el cotejo solo sabe de lo que
// pone en el asunto y el asunto lo escribe una persona con prisa. Lo que sale del
// buscador se marca con las mismas casillas y viaja en el mismo envio: para la
// base no hay diferencia entre lo propuesto y lo buscado, en los dos casos la
// decision es de Alex.

const BOTON_AJENO =
  "inline-flex h-[30px] shrink-0 items-center justify-center rounded-[8px] border border-[#3f5f80] bg-ajeno px-3.5 text-[12px] font-bold uppercase tracking-wide text-white transition hover:bg-[#4a6d91]";
const BOTON_PRINCIPAL =
  "rounded-xl bg-lima px-6 py-2.5 text-base font-bold text-carbon transition hover:bg-lima-dark hover:text-white disabled:opacity-40";
const BOTON_SECUNDARIO =
  "rounded-xl border border-black/10 px-5 py-2.5 text-base text-carbon/60 transition hover:text-carbon";
const ROTULO = "text-[11px] font-bold uppercase tracking-wider text-carbon/45";
const CAMPO =
  "h-10 w-full rounded-[10px] border border-carbon/25 bg-white px-3 text-[14px] text-carbon placeholder:text-carbon/35 focus:border-lima-dark focus:outline-none focus:ring-2 focus:ring-lima/40";

/** Un edificio con sus escaleras. Lo mismo valga que venga del cotejo o del
 *  buscador: la unica diferencia es que al buscar a mano no tiene sentido avisar
 *  de que "el asunto no nombra este municipio", porque el municipio lo ha escrito
 *  el. */
function Grupo({
  g,
  marcados,
  cambiar,
  todas,
  avisarDelMunicipio,
}: {
  g: GrupoCandidato;
  marcados: Set<string>;
  cambiar: (id: string) => void;
  todas: (g: GrupoCandidato) => void;
  avisarDelMunicipio: boolean;
}) {
  return (
    <div className="rounded-xl border border-lima/25 bg-lima-soft/50 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="text-[15px] font-bold text-carbon/85">
          {g.direccion} <span className="font-semibold text-carbon/60">{g.municipio}</span>
        </div>
        {avisarDelMunicipio && !g.municipioEnElAsunto && (
          <span className="text-[11px] font-semibold text-carbon/55">
            el asunto no nombra este municipio
          </span>
        )}
      </div>

      {/* La pregunta solo cuando hay de qué dudar. */}
      {g.accesos.length > 1 && (
        <p className="mt-1.5 text-[13px] text-carbon/65">
          Tiene {g.accesos.length} escaleras sobre las que estamos presupuestando. ¿El escaneo es
          solo de una o abarca todas?
        </p>
      )}

      <div className="mt-3 flex flex-col gap-1.5">
        {g.accesos.map((a) => (
          <label
            key={a.id}
            className="flex cursor-pointer items-center gap-2.5 text-[14px] text-carbon/85"
          >
            <input
              type="checkbox"
              checked={marcados.has(a.id)}
              onChange={() => cambiar(a.id)}
              className="h-4 w-4 accent-lima-dark"
            />
            {a.comoSeLlama}
          </label>
        ))}

        {g.accesos.length > 1 && (
          <label className="mt-1 flex cursor-pointer items-center gap-2.5 border-t border-lima/25 pt-2 text-[14px] font-bold text-carbon/85">
            <input
              type="checkbox"
              checked={g.accesos.every((a) => marcados.has(a.id))}
              onChange={() => todas(g)}
              className="h-4 w-4 accent-lima-dark"
            />
            Todas
          </label>
        )}
      </div>
    </div>
  );
}

export function Vincular({
  polycamId,
  asunto,
  candidatos,
  guardar,
  buscar,
}: {
  polycamId: string;
  asunto: string | null;
  candidatos: GrupoCandidato[];
  guardar: (fd: FormData) => Promise<void>;
  buscar: (texto: string) => Promise<Busqueda>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [guardando, setGuardando] = useState(false);

  const [texto, setTexto] = useState("");
  const [hallado, setHallado] = useState<Busqueda | null>(null);
  const [buscando, setBuscando] = useState(false);
  /** Lo buscado se enseña con el texto con el que se buscó, no con el que hay
   *  escrito ahora: si no, al seguir teclendo la ventana dice una cosa y la lista
   *  es de otra. */
  const buscado = useRef("");

  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [abierto]);

  const cambiar = (id: string) =>
    setMarcados((antes) => {
      const ahora = new Set(antes);
      if (ahora.has(id)) ahora.delete(id);
      else ahora.add(id);
      return ahora;
    });

  const todasDelGrupo = (g: GrupoCandidato) => {
    const ids = g.accesos.map((a) => a.id);
    const estanTodas = ids.every((id) => marcados.has(id));
    setMarcados((antes) => {
      const ahora = new Set(antes);
      for (const id of ids) {
        if (estanTodas) ahora.delete(id);
        else ahora.add(id);
      }
      return ahora;
    });
  };

  const lanzarBusqueda = async () => {
    const q = texto.trim();
    if (!q || buscando) return;
    setBuscando(true);
    try {
      const r = await buscar(q);
      buscado.current = q;
      setHallado(r);
    } finally {
      setBuscando(false);
    }
  };

  const enviar = async () => {
    if (!marcados.size || guardando) return;
    setGuardando(true);
    const fd = new FormData();
    fd.set("polycam", polycamId);
    for (const id of marcados) fd.append("acceso", id);
    try {
      await guardar(fd);
      setAbierto(false);
      setMarcados(new Set());
      setTexto("");
      setHallado(null);
    } finally {
      setGuardando(false);
    }
  };

  // Lo que ya propuso el cotejo no se repite en los resultados del buscador.
  const yaPropuestos = new Set(candidatos.map((g) => g.clave));
  const hallados = (hallado?.grupos ?? []).filter((g) => !yaPropuestos.has(g.clave));

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={BOTON_AJENO}>
        Vincular
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-carbon/60 p-4 py-10"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAbierto(false);
          }}
        >
          <div className="w-full max-w-[680px] rounded-2xl border border-black/5 bg-white p-6 shadow-lg">
            <div className="border-b border-black/10 pb-3">
              <div className={ROTULO}>De quién es este escaneado</div>
              <h2 className="mt-1 text-[19px] font-bold leading-tight text-carbon">
                {asunto || "(el correo venía sin asunto)"}
              </h2>
            </div>

            {candidatos.length === 0 ? (
              /* Un hueco no es un error: se enseña en ámbar y se sigue. Antes esto
                 era un callejón; ahora debajo está el buscador. */
              <div className="mt-4 rounded-[10px] border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
                <b>El asunto no encaja con ninguna dirección de la cartera.</b> Puede ser una finca
                que todavía no está de alta, o que el asunto no lleve la dirección. Búscala aquí
                debajo.
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                {candidatos.map((g) => (
                  <Grupo
                    key={g.clave}
                    g={g}
                    marcados={marcados}
                    cambiar={cambiar}
                    todas={todasDelGrupo}
                    avisarDelMunicipio
                  />
                ))}
              </div>
            )}

            {/* ------------------------------------------------- a mano */}
            <div className="mt-5 border-t border-black/10 pt-4">
              <div className={ROTULO}>
                {candidatos.length ? "¿No es ninguna de esas? Búscala" : "Búscala a mano"}
              </div>
              <form
                className="mt-2 flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void lanzarBusqueda();
                }}
              >
                <input
                  id={`buscar-${polycamId}`}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Calle, número, escalera o municipio"
                  autoComplete="off"
                  className={CAMPO}
                />
                <button
                  type="submit"
                  disabled={!texto.trim() || buscando}
                  className="h-10 shrink-0 rounded-[10px] border border-[#3f5f80] bg-ajeno px-4 text-[13px] font-bold uppercase tracking-wide text-white transition hover:bg-[#4a6d91] disabled:opacity-40"
                >
                  {buscando ? "Buscando…" : "Buscar"}
                </button>
              </form>

              {hallado && !buscando && (
                <div className="mt-3">
                  {hallado.total === 0 ? (
                    <p className="text-[13px] text-carbon/60">
                      Ningún acceso de la cartera lleva todas esas palabras.
                    </p>
                  ) : (
                    <>
                      <p className="text-[12px] text-carbon/55">
                        {hallado.total === 1
                          ? "Un edificio"
                          : `${hallado.total} edificios`}{" "}
                        con «{buscado.current}»
                        {hallado.total > hallado.grupos.length && (
                          <>
                            . Se enseñan los {hallado.grupos.length} primeros:{" "}
                            <b className="font-semibold text-carbon/70">escribe algo más</b> para
                            afinar
                          </>
                        )}
                        {hallados.length < hallado.grupos.length && " (los ya propuestos arriba no se repiten)"}
                      </p>
                      <div className="mt-2 flex flex-col gap-3">
                        {hallados.map((g) => (
                          <Grupo
                            key={g.clave}
                            g={g}
                            marcados={marcados}
                            cambiar={cambiar}
                            todas={todasDelGrupo}
                            avisarDelMunicipio={false}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-3 border-t border-black/10 pt-4">
              <button type="button" onClick={() => setAbierto(false)} className={BOTON_SECUNDARIO}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={enviar}
                disabled={!marcados.size || guardando}
                className={BOTON_PRINCIPAL}
              >
                {guardando
                  ? "Guardando…"
                  : marcados.size > 1
                    ? `Vincular a ${marcados.size} accesos`
                    : "Vincular"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
