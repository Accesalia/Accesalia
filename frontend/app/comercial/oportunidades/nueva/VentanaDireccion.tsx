"use client";

import { useEffect, useMemo, useState } from "react";
import { bonito, NOMBRE_TIPO, nombrePropuesto, type Portal } from "../../../../lib/direccionNombre";
import type { Entendido, Via } from "../../../../lib/buscarDireccion";
import { buscarElNumero, buscarLaCalle, confirmarDireccion, entender, verPortales } from "./direccion";

// BUSCAR LA DIRECCION — la maqueta del 3-oct-2026 (docs/figma/buscar-direccion.html).
//
// Lo que decidio Monica:
//   · se abre ENCIMA, con Intro o con la lupa: "que se vea que a esto hay que
//     dedicarle un minuto";
//   · va paso a paso y solo aparecen los pasos que hacen falta;
//   · nada marcado de antemano: calles casi iguales (Plaza Floras / Avenida
//     Flores, Leganes) se pisan con un clic rapido;
//   · lo que se elige es un BOTON que se ve como boton, y un clic avanza;
//   · cerrarla en cualquier momento no pierde nada: lo escrito se queda como
//     nombre provisional;
//   · el comercial no dice "accesos": el boton es "Incluye estos".

export type DireccionResuelta = {
  nombre: string;
  /** ficha_catastro_portal.id de lo que incluye la oportunidad. */
  portalIds: string[];
  /** "No lo se: pendiente hasta la visita". */
  pendiente: boolean;
};

type Paso =
  | { k: "cargando"; texto: string }
  | { k: "entendido" }
  | { k: "municipios"; lista: { nombre: string; vias: number }[]; parecidas: boolean }
  | { k: "vias"; municipio: string; vias: Via[]; parecidas: boolean }
  | { k: "edificios"; via: Via; edificios: { parcela: string; etiqueta: string }[] }
  | { k: "sin_numero"; via: Via; sugeridos: string[] }
  | { k: "accesos"; via: Via; parcelas: string[]; portales: Portal[] }
  | { k: "nada"; motivo: string }
  | { k: "error"; mensaje: string };

const tituloV = "text-[11px] font-bold uppercase tracking-[0.08em] text-accion-marco";
const etq = "block text-[10px] font-bold uppercase leading-[1.3] tracking-[0.05em] text-carbon/70";
const campo =
  "w-full rounded-lg border border-carbon/70 bg-white px-3 py-1.5 text-sm text-carbon outline-none transition placeholder:text-carbon/55 focus:border-lima";
const elige =
  "flex w-full items-center justify-between gap-2 rounded-lg border border-accion border-b-[3px] border-b-accion-marco bg-[#e3ecf5] px-3 py-2 text-left text-[13px] font-semibold leading-tight text-accion-marco transition hover:bg-accion hover:text-white [&:hover_.tipo]:text-white";
const flecha = <span className="text-[22px] font-bold leading-none opacity-80">›</span>;
const bAzul =
  "rounded-lg border border-accion-marco bg-accion px-[18px] py-2 text-[13px] font-bold text-white transition hover:bg-accion-hover disabled:cursor-not-allowed disabled:opacity-50";
const bBlanco =
  "rounded-lg border border-accion-marco bg-white px-[18px] py-2 text-[13px] font-bold text-accion-marco transition hover:bg-[#eef3f8]";
const bLima =
  "rounded-lg bg-lima px-5 py-[9px] text-[13px] font-extrabold text-carbon transition hover:bg-lima-dark hover:text-white disabled:cursor-not-allowed disabled:bg-black/10 disabled:text-carbon/40";

const tipoBonito = (t: string) => NOMBRE_TIPO[t] ?? t;
const numeroBonito = (n: string) => n.replace(/\((\w+)\)/, " $1");

export function VentanaDireccion({
  escrito,
  alListo,
  alCerrar,
}: {
  escrito: string;
  alListo: (r: DireccionResuelta) => void;
  /** Sin terminar: lo escrito se queda como provisional. */
  alCerrar: () => void;
}) {
  const [e, setE] = useState<Entendido>({ escrito, tipo: "", calle: "", numero: "", municipio: "" });
  const [paso, setPaso] = useState<Paso>({ k: "cargando", texto: "Leyendo lo que has escrito…" });
  const [atras, setAtras] = useState<Paso[]>([]);
  const [filtro, setFiltro] = useState("");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [nombre, setNombre] = useState("");
  const [nombreTocado, setNombreTocado] = useState(false);
  const [otroNumero, setOtroNumero] = useState("");

  // Lo resuelto, para las pastillas de arriba.
  const [municipioHecho, setMunicipioHecho] = useState("");
  const [viaHecha, setViaHecha] = useState<Via | null>(null);

  const ir = (nuevo: Paso) => {
    setAtras((h) => (paso.k === "cargando" || paso.k === "error" ? h : [...h, paso]));
    setPaso(nuevo);
  };
  const volver = () => {
    const h = [...atras];
    const anterior = h.pop();
    setAtras(h);
    if (anterior) setPaso(anterior);
  };

  // Lo que pide al servidor. Si Catastro no contesta, se dice y se puede cerrar
  // como provisional: nunca se queda colgado.
  const pedir = async <T,>(texto: string, f: () => Promise<T>): Promise<T | null> => {
    const antes = paso;
    setPaso({ k: "cargando", texto });
    try {
      return await f();
    } catch (err) {
      setAtras((h) => [...h, antes]);
      setPaso({ k: "error", mensaje: err instanceof Error ? err.message : String(err) });
      return null;
    }
  };

  useEffect(() => {
    entender(escrito)
      .then((x) => {
        setE(x);
        setPaso({ k: "entendido" });
      })
      .catch(() => setPaso({ k: "entendido" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") alCerrar();
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  });

  // ------------------------------------------------------------ los pasos

  const buscar = async (municipio = e.municipio) => {
    const r = await pedir("Buscando la calle…", () => buscarLaCalle(e.calle, municipio, e.tipo));
    if (!r) return;
    if (r.paso === "municipios") return ir({ k: "municipios", lista: r.municipios, parecidas: r.parecidas });
    if (r.paso === "nada") return ir({ k: "nada", motivo: r.motivo });
    setMunicipioHecho(r.municipio);
    if (!r.parecidas && r.vias.length === 1) return aLaVia(r.vias[0], [...atras, paso]);
    ir({ k: "vias", municipio: r.municipio, vias: r.vias, parecidas: r.parecidas });
  };

  const aLaVia = async (via: Via, pila = [...atras, paso], numero = e.numero) => {
    setViaHecha(via);
    setMunicipioHecho(via.municipio);
    const r = await pedir("Preguntando a Catastro…", () => buscarElNumero(via, numero));
    setAtras(pila);
    if (!r) return;
    if (r.paso === "sin_via") return setPaso({ k: "nada", motivo: "" });
    if (r.paso === "sin_numero") {
      setOtroNumero(numero);
      return setPaso({ k: "sin_numero", via, sugeridos: r.sugeridos });
    }
    if (r.edificios.length === 1) return aLasParcelas(via, [r.edificios[0].parcela], pila, numero);
    setPaso({ k: "edificios", via, edificios: r.edificios });
  };

  const aLasParcelas = async (via: Via, parcelas: string[], pila = [...atras, paso], numero = e.numero) => {
    const portales = await pedir("Bajando la parcela de Catastro…", () => verPortales(parcelas));
    setAtras(pila);
    if (!portales) return;
    // Se enseña TODO, tambien lo que no tiene viviendas (garaje, local): "nos
    // contratan mucho para eso" (Monica, 3-oct). Va aparte, al final. Solo se
    // marca de antemano cuando no hay nada que elegir.
    const conViviendas = portales.filter((p) => p.viviendas > 0);
    const delNumero = conViviendas.filter((p) => parseInt(p.numero) === parseInt(numero));
    const inicial = portales.length === 1 ? portales : delNumero.length === 1 ? delNumero : [];
    setMarcados(new Set(inicial.map((p) => p.clave)));
    setNombreTocado(false);
    setPaso({ k: "accesos", via, parcelas, portales });
  };

  const confirmar = async (pendiente: boolean) => {
    if (paso.k !== "accesos") return;
    const claves = pendiente ? [] : Array.from(marcados);
    const r = await pedir("Guardando la ficha de Catastro…", () => confirmarDireccion(paso.parcelas, claves));
    if (!r) return;
    alListo({ nombre: nombre.trim() || escrito, portalIds: r.portalIds, pendiente });
  };

  // El nombre que propone la app, mientras el comercial no lo toque.
  const elegidos = useMemo(
    () => (paso.k === "accesos" ? paso.portales.filter((p) => marcados.has(p.clave)) : []),
    [paso, marcados],
  );
  useEffect(() => {
    if (paso.k !== "accesos" || nombreTocado) return;
    const base = elegidos.length ? elegidos : paso.portales.filter((p) => parseInt(p.numero) === parseInt(e.numero));
    setNombre(base.length ? nombrePropuesto(base, paso.portales, paso.via.municipio) : "");
  }, [elegidos, paso, nombreTocado, e.numero]);

  // ------------------------------------------------------------ la ventana

  const pastillas = (ahora: "municipio" | "calle" | "numero" | "accesos") => (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {(
        [
          ["municipio", municipioHecho ? bonito(municipioHecho) : "Municipio"],
          ["calle", viaHecha ? `${tipoBonito(viaHecha.tipo)} ${bonito(viaHecha.nombre)}` : "Calle"],
          ...(ahora === "numero" ? [["numero", "Número"]] : []),
          ["accesos", "Accesos"],
        ] as [string, string][]
      ).map(([k, texto]) => {
        const hecha = (k === "municipio" && municipioHecho && ahora !== "municipio") || (k === "calle" && viaHecha && (ahora === "numero" || ahora === "accesos"));
        return (
          <span
            key={k}
            className={
              "rounded-full border px-2.5 py-[3px] text-[11px] font-bold uppercase tracking-[0.04em] " +
              (k === ahora
                ? "border-marcado-paso bg-marcado-paso text-white"
                : hecha
                  ? "border-accion bg-[#e6eef5] text-accion-marco"
                  : "border-raya bg-white text-carbon/55")
            }
          >
            {hecha ? "✓ " : ""}
            {texto}
          </span>
        );
      })}
    </div>
  );

  const pregunta = (fuerte: string, suave?: string) => (
    <p className="mt-[18px] text-[17px] font-bold leading-snug text-carbon">
      {fuerte} {suave && <span className="font-normal text-carbon/70">{suave}</span>}
    </p>
  );

  const salir = (
    <button type="button" onClick={alCerrar} className="rounded-lg border border-black/20 bg-white px-3 py-[7px] text-xs text-carbon/70 hover:text-carbon">
      Cerrar: se queda <b className="font-semibold text-carbon">«{escrito}»</b> como provisional
    </button>
  );

  const pie = (conSalir = true) => (
    <div className="mt-[22px] flex items-center justify-between gap-3 border-t border-raya pt-3.5">
      {atras.length > 0 && paso.k !== "cargando" ? (
        <button type="button" onClick={volver} className="text-[13px] font-semibold text-carbon/65 hover:text-carbon">
          ← Atrás
        </button>
      ) : (
        <span />
      )}
      {conSalir && salir}
    </div>
  );

  // Intro dentro de la ventana hace lo principal del paso, y no se escapa al
  // formulario de debajo (alli Intro salta de campo).
  const alTeclear = (ev: React.KeyboardEvent) => {
    if (ev.key !== "Enter") return;
    ev.preventDefault();
    ev.stopPropagation();
    if (paso.k === "entendido" && e.calle && e.numero) buscar();
    if (paso.k === "sin_numero" && otroNumero && viaHecha) {
      setE((x) => ({ ...x, numero: otroNumero }));
      aLaVia(paso.via, atras, otroNumero);
    }
  };

  let cuerpo: React.ReactNode = null;

  if (paso.k === "cargando") {
    cuerpo = <p className="mt-6 mb-4 text-[15px] text-carbon/70">{paso.texto}</p>;
  }

  if (paso.k === "error") {
    cuerpo = (
      <>
        <div className="mt-4 rounded-xl border border-[#e3c46a] bg-[#fdf3d6] px-4 py-3 text-sm leading-relaxed text-[#7a5200]">
          No he podido terminar: <b>{paso.mensaje}</b>. Puedes volver a intentarlo, o cerrar y se queda como provisional.
        </div>
        {pie()}
      </>
    );
  }

  if (paso.k === "entendido") {
    const falta = "border-[#e3c46a] bg-[#fdf3d6] placeholder:text-[#7a5200]";
    cuerpo = (
      <>
        {pregunta("He entendido esto. ¿Lo busco así?")}
        <div className="mt-3.5 grid grid-cols-[1fr_90px_220px] gap-2.5">
          <label>
            <span className={etq}>Calle</span>
            <input autoFocus value={e.calle} onChange={(x) => setE({ ...e, calle: x.target.value })} className={campo + " mt-1" + (e.calle ? "" : " " + falta)} placeholder="falta la calle" />
          </label>
          <label>
            <span className={etq}>Número</span>
            <input value={e.numero} onChange={(x) => setE({ ...e, numero: x.target.value })} className={campo + " mt-1" + (e.numero ? "" : " " + falta)} placeholder="falta" />
          </label>
          <label>
            <span className={etq}>Municipio</span>
            <input value={e.municipio} onChange={(x) => setE({ ...e, municipio: x.target.value })} className={campo + " mt-1" + (e.municipio ? "" : " " + falta)} placeholder="no lo has escrito" />
          </label>
        </div>
        <div className="mt-[18px] flex justify-end">
          <button type="button" disabled={!e.calle.trim() || !e.numero.trim()} onClick={() => buscar()} className={bAzul}>
            Buscar
          </button>
        </div>
        {pie()}
      </>
    );
  }

  if (paso.k === "municipios") {
    const f = filtro.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const lista = paso.lista.filter((m) => !f || m.nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(f));
    cuerpo = (
      <>
        {pastillas("municipio")}
        {paso.parecidas
          ? pregunta(`«${e.calle}» no está tal cual, pero hay calles parecidas en ${paso.lista.length} municipios.`, "¿Cuál busco?")
          : pregunta(`Hay ${bonito(e.calle.toUpperCase())} en ${paso.lista.length} municipios.`, "¿Cuál busco?")}
        {paso.lista.length > 9 && (
          <input autoFocus value={filtro} onChange={(x) => setFiltro(x.target.value)} placeholder="filtrar municipios…" className={campo + " mt-3 w-[280px]"} />
        )}
        <div className="mt-3.5 grid max-h-[360px] grid-cols-3 gap-2.5 overflow-y-auto pb-1">
          {lista.map((m) => (
            <button
              key={m.nombre}
              type="button"
              onClick={() => {
                setFiltro("");
                setE({ ...e, municipio: m.nombre });
                buscar(m.nombre);
              }}
              className={elige}
            >
              <span>{bonito(m.nombre)}</span>
              <span className="flex items-center gap-1.5">
                {m.vias > 1 && <span className="whitespace-nowrap text-[11px] font-normal opacity-75">{m.vias} vías</span>}
                {flecha}
              </span>
            </button>
          ))}
        </div>
        {pie()}
      </>
    );
  }

  if (paso.k === "vias") {
    cuerpo = (
      <>
        {pastillas("calle")}
        {paso.parecidas
          ? pregunta(`Catastro no tiene nada con «${e.calle}».`, `El callejero de ${bonito(paso.municipio)} tiene estas parecidas: ¿podría ser alguna?`)
          : pregunta(`En ${bonito(paso.municipio)} hay ${paso.vias.length}.`, "¿Me confirmas cuál es?")}
        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          {paso.vias.map((v) => (
            <button key={v.tipo + v.nombre} type="button" onClick={() => aLaVia(v)} className={elige}>
              <span>
                <span className="tipo block text-[10px] font-extrabold uppercase tracking-[0.06em] text-accion-marco">{tipoBonito(v.tipo)}</span>
                {bonito(v.nombre)}
              </span>
              {flecha}
            </button>
          ))}
          {paso.parecidas && (
            <button
              type="button"
              onClick={() => ir({ k: "nada", motivo: "" })}
              className="rounded-lg border border-dashed border-accion bg-white px-3 py-2 text-[13px] font-semibold text-carbon/75 hover:bg-[#eef3f8]"
            >
              Ninguna de estas
            </button>
          )}
        </div>
        {pie()}
      </>
    );
  }

  if (paso.k === "edificios") {
    cuerpo = (
      <>
        {pastillas("numero")}
        {pregunta(`En el ${e.numero} hay ${paso.edificios.length === 2 ? "dos" : paso.edificios.length} edificios.`, "¿Cuál es?")}
        <div className="mt-3.5 grid grid-cols-3 gap-2.5">
          {paso.edificios.map((x) => (
            <button key={x.parcela} type="button" onClick={() => aLasParcelas(paso.via, [x.parcela])} className={elige}>
              <span>{x.etiqueta}</span>
              {flecha}
            </button>
          ))}
          <button
            type="button"
            onClick={() => aLasParcelas(paso.via, paso.edificios.map((x) => x.parcela))}
            className={elige + " border-accion-marco bg-white font-extrabold"}
          >
            <span>{paso.edificios.length === 2 ? "Son los dos" : "Son todos"}</span>
            {flecha}
          </button>
        </div>
        {pie()}
      </>
    );
  }

  if (paso.k === "sin_numero") {
    const reintentar = (n: string) => {
      setE((x) => ({ ...x, numero: n }));
      aLaVia(paso.via, atras, n);
    };
    cuerpo = (
      <>
        {pastillas("numero")}
        {pregunta(`${tipoBonito(paso.via.tipo)} ${bonito(paso.via.nombre)} existe, pero Catastro no tiene el ${e.numero}.`, "¿Lo revisas?")}
        <div className="mt-3.5 flex items-end gap-2.5">
          <label className="w-[90px]">
            <span className={etq}>Número</span>
            <input autoFocus value={otroNumero} onChange={(x) => setOtroNumero(x.target.value)} className={campo + " mt-1"} />
          </label>
          <button type="button" disabled={!otroNumero.trim()} onClick={() => reintentar(otroNumero.trim())} className={bAzul + " h-[34px] py-0"}>
            Buscar otra vez
          </button>
        </div>
        {paso.sugeridos.length > 0 && (
          <>
            <p className="mt-4 text-[13px] text-carbon/70">Catastro sí tiene estos (no siempre los dice todos):</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {paso.sugeridos.map((n) => (
                <button key={n} type="button" onClick={() => reintentar(n)} className={elige + " w-auto"}>
                  <span>{n}</span>
                  {flecha}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="mt-[18px] flex justify-end">
          <button type="button" onClick={alCerrar} className={bBlanco}>
            El número está bien: guárdala provisional
          </button>
        </div>
        {pie()}
      </>
    );
  }

  if (paso.k === "accesos") {
    const via = paso.via;
    const unico = paso.portales.length === 1;
    // Lo que tiene viviendas va en sus grupos; lo que no, aparte y al final.
    // Si nada tiene viviendas (un edificio de oficinas), todo va en grupos.
    const hayViviendas = paso.portales.some((p) => p.viviendas > 0);
    const conViv = hayViviendas ? paso.portales.filter((p) => p.viviendas > 0) : paso.portales;
    const sinViv = hayViviendas ? paso.portales.filter((p) => p.viviendas === 0) : [];
    const delNumero = conViv.filter((p) => parseInt(p.numero) === parseInt(e.numero));
    // Un grupo por numero (el 6 y el 6 B, cada uno el suyo: los dos tienen
    // "escalera 1"). Primero los del numero escrito; luego los demas de la
    // parcela, sin marcar: "En la misma parcela tambien esta el 5".
    const porNumero = new Map<string, Portal[]>();
    for (const p of conViv) {
      const k = `${p.nombre_via}|${p.numero}`;
      porNumero.set(k, [...(porNumero.get(k) ?? []), p]);
    }
    const grupos = Array.from(porNumero.values());
    const suyos = grupos.filter((ps) => ps[0].nombre_via === via.nombre && parseInt(ps[0].numero) === parseInt(e.numero));
    const ajenos = grupos.filter((ps) => !suyos.includes(ps));
    const alternar = (c: string) =>
      setMarcados((m) => {
        const n = new Set(m);
        if (n.has(c)) n.delete(c);
        else n.add(c);
        return n;
      });
    const todas = (ps: Portal[]) => ps.every((p) => marcados.has(p.clave));
    const alternarTodas = (ps: Portal[]) =>
      setMarcados((m) => {
        const n = new Set(m);
        const poner = !ps.every((p) => n.has(p.clave));
        for (const p of ps) {
          if (poner) n.add(p.clave);
          else n.delete(p.clave);
        }
        return n;
      });
    const casilla = (p: Portal, conNumero: boolean) => {
      const on = marcados.has(p.clave);
      const texto = p.escalera ? `${conNumero ? numeroBonito(p.numero) + " · Esc. " : "Escalera "}${p.escalera}` : conNumero ? `Nº ${numeroBonito(p.numero)}` : "El portal";
      return (
        <label
          key={p.clave}
          className={
            "flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-[13px] " +
            (on ? "border-accion-marco bg-accion text-white" : "border-[#8c8c8c] bg-white text-carbon hover:border-accion")
          }
        >
          <span>{texto}</span>
          <input type="checkbox" checked={on} onChange={() => alternar(p.clave)} className="size-[18px] shrink-0 accent-white" />
        </label>
      );
    };
    const grupo = (titulo: string, ps: Portal[], conNumero: boolean, otra: boolean, coletilla?: string) => (
      <div key={titulo} className={"mt-4 rounded-xl border border-raya px-3.5 py-3 " + (otra ? "bg-[#f6f6f3]" : "bg-white")}>
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-xs font-extrabold uppercase tracking-[0.05em] text-carbon">
            {titulo}
            {coletilla && <span className="ml-2 text-[12px] font-normal normal-case tracking-normal text-carbon/70">{coletilla}</span>}
          </h4>
          {ps.length > 1 && (
            <button
              type="button"
              onClick={() => alternarTodas(ps)}
              className={
                "rounded-md border border-accion-marco px-2.5 py-[5px] text-[11px] font-extrabold uppercase tracking-[0.04em] " +
                (todas(ps) ? "bg-accion text-white" : "bg-white text-accion-marco")
              }
            >
              {todas(ps) ? "✓ Son todas" : "Son todas"}
            </button>
          )}
        </div>
        <div className="mt-2.5 grid grid-cols-4 gap-2.5">{ps.map((p) => casilla(p, conNumero))}</div>
      </div>
    );

    cuerpo = (
      <>
        {!unico && pastillas("accesos")}
        {unico ? (
          <>
            {pregunta("Lo tengo.")}
            <div className="mt-4 rounded-xl border border-accion bg-[#eef3f8] px-4 py-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-accion-marco">Así lo escribe Catastro</div>
              <div className="text-lg font-bold text-carbon">
                {tipoBonito(paso.portales[0].tipo_via)} {bonito(paso.portales[0].nombre_via)} {numeroBonito(paso.portales[0].numero)}
                {paso.portales[0].escalera ? `, escalera ${paso.portales[0].escalera}` : ""}, {bonito(via.municipio)}
              </div>
            </div>
          </>
        ) : (
          <>
            {pregunta(
              delNumero.length > 1
                ? `En el ${e.numero} Catastro tiene ${delNumero.length} escaleras.`
                : `En esta parcela Catastro tiene ${paso.portales.length} portales.`,
              "¿Sabes cuáles van?",
            )}
            {suyos.map((ps) => grupo(`${tipoBonito(via.tipo)} ${bonito(via.nombre)} ${numeroBonito(ps[0].numero)}`, ps, false, false))}
            {ajenos.map((ps) =>
              grupo(
                `En la misma parcela también está ${ps[0].nombre_via === via.nombre ? "el " + numeroBonito(ps[0].numero) : `${tipoBonito(ps[0].tipo_via)} ${bonito(ps[0].nombre_via)} ${numeroBonito(ps[0].numero)}`}`,
                ps,
                true,
                true,
              ),
            )}
            {sinViv.length > 0 && grupo("Sin viviendas", sinViv, true, true, "(aquí no hay viviendas: es el garaje o un local)")}
          </>
        )}
        <div className="mt-4 grid grid-cols-[128px_1fr] items-center gap-x-2.5">
          <span className={etq}>Nombre de la oportunidad</span>
          <input
            value={nombre}
            onChange={(x) => {
              setNombre(x.target.value);
              setNombreTocado(true);
            }}
            className={campo}
          />
        </div>
        <div className="mt-[18px] flex justify-end gap-2.5">
          {unico ? (
            <>
              <button type="button" onClick={() => { setAtras([]); setMunicipioHecho(""); setViaHecha(null); setPaso({ k: "entendido" }); }} className={bBlanco}>
                No es esta
              </button>
              <button type="button" onClick={() => confirmar(false)} className={bLima}>
                Es esta
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => confirmar(true)} className={bBlanco}>
                No lo sé: pendiente hasta la visita
              </button>
              <button type="button" disabled={marcados.size === 0} onClick={() => confirmar(false)} className={bLima}>
                Incluye estos
              </button>
            </>
          )}
        </div>
        {pie()}
      </>
    );
  }

  if (paso.k === "nada") {
    cuerpo = (
      <>
        <div className="mt-4 rounded-xl border border-[#e3c46a] bg-[#fdf3d6] px-4 py-3 text-sm leading-relaxed text-[#7a5200]">
          {paso.motivo && <>{paso.motivo} </>}
          Ni Catastro ni el callejero{e.municipio ? ` de ${bonito(e.municipio.toUpperCase())}` : ""} tienen nada que sea esa calle. Te la guardo como{" "}
          <b className="text-[#5a3c00]">«{escrito}»</b> y la marco <b className="text-[#5a3c00]">pendiente de confirmar después de la visita</b>. ¿Te parece?
        </div>
        <div className="mt-[18px] flex justify-end gap-2.5">
          <button type="button" onClick={() => { setAtras([]); setMunicipioHecho(""); setViaHecha(null); setPaso({ k: "entendido" }); }} className={bBlanco}>
            No, la corrijo
          </button>
          <button type="button" onClick={alCerrar} className={bLima}>
            Sí, guárdala provisional
          </button>
        </div>
        {pie(false)}
      </>
    );
  }

  return (
    <div
      onMouseDown={(x) => {
        if (x.target === x.currentTarget) alCerrar();
      }}
      onKeyDown={alTeclear}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-alta-opp/75 p-4 pt-[8vh]"
    >
      <div className="relative w-full max-w-[770px] rounded-[14px] border border-accion-marco bg-[#fffaf0] px-6 pb-[18px] pt-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <button type="button" onClick={alCerrar} aria-label="Cerrar" className="absolute right-4 top-3 text-lg leading-none text-carbon/45 hover:text-carbon">
          ×
        </button>
        <div className={tituloV}>Buscar la dirección</div>
        <div className="mt-1 text-[13px] text-carbon/70">
          Has escrito: <b className="font-semibold text-carbon">{escrito}</b>
        </div>
        {cuerpo}
      </div>
    </div>
  );
}
