"use client";

// Elegir a la persona que lleva algo, sin duplicar seres humanos.
//
// El problema que resuelve: una gestora de Del Brio lleva quince comunidades.
// Si cada vez que la asignas se creara una persona nueva, acabariamos con
// quince Marias distintas y el rastro de lo hablado con ella repartido entre
// todas. Asi que primero se busca, y solo se crea si de verdad no esta.
//
// Dos formas de llegar, las dos validas y sin salir de aqui:
//
//   por administracion  eliges Del Brio y se acota a su gente
//   por persona         escribes "alejandro" y salen los tres, cada uno con su
//                       empresa al lado para saber cual es
//
// Y si no esta ninguno, se crea en el sitio: el nombre ya escrito se aprovecha.
//
// La administracion del que se crea es obligatoria PERO se puede declarar
// desconocida a proposito ("todavia no lo se"). Eso pasa de verdad: en la ficha
// pone "ADMIN TOMAS 645748010" y no sabes la casa. Lo que no queremos es que se
// quede vacia por descuido, asi que hay que decirlo explicitamente; entonces la
// persona sale marcada en rojo hasta que se complete.
//
// Los datos vienen enteros del servidor (unos cientos de filas) y se filtran
// aqui: asi la lista responde al instante, sin ir y volver en cada tecla.

import { useMemo, useRef, useState } from "react";

export type PuestoElegible = {
  id: string;              // id del PUESTO: es lo que guardan las comunidades
  persona: string;
  empresa: string | null;  // vacio = aun no se sabe de que casa es
  empresaId: string | null;
};

export type EmpresaElegible = { id: string; nombre: string };

type Props = {
  puestos: PuestoElegible[];
  empresas: EmpresaElegible[];
  /** Cuando ya estas dentro de una administracion, no se pregunta por ella. */
  empresaFija?: EmpresaElegible | null;
  /** Puesto ya asignado, para poder cambiarlo. */
  inicial?: PuestoElegible | null;
  etiqueta?: string;
};

const inputCls =
  "w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-carbon " +
  "outline-none focus:border-lima focus:ring-2 focus:ring-lima/30";
const labelCls = "block text-sm font-medium text-carbon/70";

/** Texto comparable: sin acentos y en minusculas, que nadie teclea con tildes. */
function kk(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/** Todas las palabras del termino tienen que aparecer, en cualquier orden. */
function encaja(texto: string, termino: string) {
  const t = kk(texto);
  return kk(termino).split(/\s+/).filter(Boolean).every((p) => t.includes(p));
}

export function SelectorPersona({
  puestos, empresas, empresaFija = null, inicial = null, etiqueta = "¿Quién la lleva?",
}: Props) {
  const [empresa, setEmpresa] = useState<EmpresaElegible | null>(
    empresaFija ?? (inicial?.empresaId
      ? { id: inicial.empresaId, nombre: inicial.empresa ?? "" }
      : null),
  );
  const [buscaEmpresa, setBuscaEmpresa] = useState("");
  const [abiertaEmpresa, setAbiertaEmpresa] = useState(false);

  const [elegido, setElegido] = useState<PuestoElegible | null>(inicial);
  const [buscaPersona, setBuscaPersona] = useState("");
  const [abiertaPersona, setAbiertaPersona] = useState(false);

  const [creando, setCreando] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [sinCasa, setSinCasa] = useState(false);

  const campoPersona = useRef<HTMLInputElement>(null);

  // Donde ira a parar quien se cree aqui. Con empresaFija ya se sabe.
  const destino = empresaFija ?? empresa;

  // El filtro por administracion acota la BUSQUEDA, y solo cuando la eliges tu.
  // Con empresaFija NO se filtra: estas dentro de Del Brio precisamente para
  // enganchar a alguien, y esa persona lo normal es que venga de otra casa.
  const candidatos = useMemo(() => {
    const base = !empresaFija && empresa
      ? puestos.filter((p) => p.empresaId === empresa.id)
      : puestos;
    if (!buscaPersona.trim()) return base.slice(0, 30);
    return base.filter((p) => encaja(p.persona, buscaPersona)).slice(0, 30);
  }, [puestos, empresa, empresaFija, buscaPersona]);

  const empresasFiltradas = useMemo(() => {
    if (!buscaEmpresa.trim()) return empresas.slice(0, 30);
    return empresas.filter((e) => encaja(e.nombre, buscaEmpresa)).slice(0, 30);
  }, [empresas, buscaEmpresa]);

  function empezarACrear() {
    setNombreNuevo(buscaPersona.trim());
    setCreando(true);
    setElegido(null);
    setAbiertaPersona(false);
  }

  function volverABuscar() {
    setCreando(false);
    setNombreNuevo("");
    setSinCasa(false);
    campoPersona.current?.focus();
  }

  return (
    <div className="space-y-4">
      {/* lo que se manda al servidor */}
      <input type="hidden" name="puesto_id" value={creando ? "" : elegido?.id ?? ""} />
      <input type="hidden" name="persona_nueva" value={creando ? nombreNuevo.trim() : ""} />
      <input
        type="hidden"
        name="empresa_nueva_id"
        value={creando && !sinCasa ? destino?.id ?? "" : ""}
      />
      <input
        type="hidden"
        name="empresa_desconocida"
        value={creando && sinCasa ? "si" : ""}
      />

      {/* ---------------------------------------------------- administracion */}
      {!empresaFija && (
        <div className="relative">
          <label className={labelCls} htmlFor="busca-empresa">
            Administración de fincas <span className="font-normal text-carbon/40">(opcional: acota la búsqueda)</span>
          </label>
          {empresa ? (
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-lima/40 bg-lima-soft/40 px-3 py-2">
              <span className="flex-1 text-sm text-carbon">{empresa.nombre}</span>
              <button
                type="button"
                onClick={() => { setEmpresa(null); setBuscaEmpresa(""); setElegido(null); }}
                className="text-xs font-medium text-carbon/50 hover:text-carbon"
              >
                Quitar
              </button>
            </div>
          ) : (
            <>
              <input
                id="busca-empresa"
                className={`${inputCls} mt-1`}
                placeholder="Escribe para buscar: del brío, monge…"
                value={buscaEmpresa}
                onChange={(e) => { setBuscaEmpresa(e.target.value); setAbiertaEmpresa(true); }}
                onFocus={() => setAbiertaEmpresa(true)}
                onBlur={() => setTimeout(() => setAbiertaEmpresa(false), 150)}
                autoComplete="off"
              />
              {abiertaEmpresa && empresasFiltradas.length > 0 && (
                <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-black/10 bg-white shadow-lg">
                  {empresasFiltradas.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        onMouseDown={(ev) => ev.preventDefault()}
                        onClick={() => {
                          setEmpresa(e); setBuscaEmpresa(""); setAbiertaEmpresa(false);
                          setElegido(null); campoPersona.current?.focus();
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-carbon hover:bg-lima-soft/50"
                      >
                        {e.nombre}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------- persona */}
      {!creando ? (
        <div className="relative">
          <label className={labelCls} htmlFor="busca-persona">{etiqueta}</label>
          {elegido ? (
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-lima/40 bg-lima-soft/40 px-3 py-2">
              <span className="flex-1 text-sm text-carbon">
                {elegido.persona}
                {elegido.empresa
                  ? <span className="text-carbon/50"> · {elegido.empresa}</span>
                  : <span className="text-red-600"> · falta saber la administración</span>}
              </span>
              <button
                type="button"
                onClick={() => { setElegido(null); campoPersona.current?.focus(); }}
                className="text-xs font-medium text-carbon/50 hover:text-carbon"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <>
              <input
                id="busca-persona"
                ref={campoPersona}
                className={`${inputCls} mt-1`}
                placeholder="Escribe un nombre: alejandro, maría…"
                value={buscaPersona}
                onChange={(e) => { setBuscaPersona(e.target.value); setAbiertaPersona(true); }}
                onFocus={() => setAbiertaPersona(true)}
                onBlur={() => setTimeout(() => setAbiertaPersona(false), 150)}
                autoComplete="off"
              />
              {abiertaPersona && (
                <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-black/10 bg-white shadow-lg">
                  {candidatos.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onMouseDown={(ev) => ev.preventDefault()}
                        onClick={() => {
                          setElegido(p); setAbiertaPersona(false);
                          if (!empresaFija && p.empresaId) {
                            setEmpresa({ id: p.empresaId, nombre: p.empresa ?? "" });
                          }
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-lima-soft/50"
                      >
                        <span className="text-carbon">{p.persona}</span>
                        {p.empresa
                          ? <span className="text-carbon/45"> · {p.empresa}</span>
                          : <span className="text-red-600"> · sin administración</span>}
                      </button>
                    </li>
                  ))}
                  {/* siempre disponible: la lista puede tener a otro Alejandro
                      y aun asi el que buscas no estar */}
                  <li className="border-t border-black/5">
                    <button
                      type="button"
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={empezarACrear}
                      className="block w-full px-3 py-2 text-left text-sm font-medium text-lima-dark hover:bg-lima-soft/50"
                    >
                      {buscaPersona.trim()
                        ? <>No está: crear «{buscaPersona.trim()}»</>
                        : <>Crear una persona nueva</>}
                    </button>
                  </li>
                </ul>
              )}
            </>
          )}
        </div>
      ) : (
        /* ------------------------------------------------------ crear nueva */
        <div className="space-y-3 rounded-xl border border-lima/40 bg-lima-soft/25 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-lima-dark/80">
              Persona nueva
            </span>
            <button type="button" onClick={volverABuscar}
              className="text-xs font-medium text-carbon/50 hover:text-carbon">
              Buscar en la lista
            </button>
          </div>

          <div>
            <label className={labelCls} htmlFor="persona-nueva">
              Nombre y apellidos <span className="text-lima-dark">*</span>
            </label>
            <input
              id="persona-nueva"
              className={`${inputCls} mt-1`}
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className={labelCls}>
              ¿De qué administración es? <span className="text-lima-dark">*</span>
            </label>
            {sinCasa ? (
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2">
                <span className="flex-1 text-sm text-red-700">
                  Se queda pendiente de saber
                </span>
                <button type="button" onClick={() => setSinCasa(false)}
                  className="text-xs font-medium text-red-700 hover:text-red-900">
                  Ponerla
                </button>
              </div>
            ) : destino ? (
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2">
                <span className="flex-1 text-sm text-carbon">{destino.nombre}</span>
                {!empresaFija && (
                  <button type="button" onClick={() => setEmpresa(null)}
                    className="text-xs font-medium text-carbon/50 hover:text-carbon">
                    Cambiar
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className="mt-1 text-xs text-red-600">
                  Elige la administración arriba, o dilo si todavía no se sabe.
                </p>
                <button type="button" onClick={() => setSinCasa(true)}
                  className="mt-1 text-xs font-medium text-carbon/60 underline decoration-dotted
                             underline-offset-2 hover:text-carbon">
                  Todavía no lo sé
                </button>
              </>
            )}
          </div>

          {sinCasa && (
            <p className="text-xs text-carbon/55">
              Se guardará marcada en rojo, con un aviso de que falta la administración,
              hasta que la completes.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
