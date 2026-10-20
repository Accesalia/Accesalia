"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reducirFoto } from "../../lib/reducirFoto";
import {
  enviarCola,
  guardarListas,
  leerCola,
  leerListas,
  meterEnCola,
  sacarDeCola,
  type ContactoSat,
  type Listas,
  type NotaEnCola,
  type TipoContacto,
} from "../../lib/colaSatelite";
import type { Opcion } from "../components/Elegir";

// EL SATELITE (Monica, 8-oct-2026): "una minicosa-satelite que sea solo pulsar
// para guardar una nueva nota del diario". En el movil, con un icono en la
// pantalla de inicio, y SIN CONEXION: la nota espera en el movil y sale sola
// cuando hay red.
//
// SIMPLIFICADO (19-oct-2026): arriba Crear nuevo contacto / Crear nueva opp
// (se apuntan, no se crean: se completan en el PC desde Pendientes); debajo la
// nota y sobre que va, una direccion y/o una persona; sin canal ni fecha en
// pantalla (se guardan visita y hoy).
//
// SU MAQUETA (20-oct-2026, docs/figma/satelite-v2.html): la tarjeta amarilla
// "+ Nueva Nota" con dos bloques numerados; los buscadores abren una VENTANA de
// la mitad hacia arriba, para que no la tape el teclado ("a mi me costo salir,
// tenias que darle JUSTO a la barra de busqueda"); lo elegido deja de ser
// buscador y queda como TEXTO; crear contacto y crear opp, en una ventana
// flotante grande. De todas las ventanas se sale con Cerrar, tocando fuera o
// con el boton de atras del movil.

const hoyISO = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
// Lo que no se enseña pero se guarda: se esta en la calle.
const CANAL = "visita";
const limpio = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const TIPOS_CONTACTO: { valor: TipoContacto; texto: string }[] = [
  { valor: "administrador", texto: "Admin." },
  { valor: "vecino", texto: "Vecino" },
  { valor: "contratista", texto: "Contrat." },
  { valor: "otro", texto: "Otro" },
];
// Cuantas coincidencias se pintan: con 2.000 opps, escribir mas afina.
const TOPE = 60;

// ---- su paleta ----
const PANEL = "rounded-[10px] border-t border-black/50 bg-[#e4d3a6] shadow-[2px_4px_4px_rgba(0,0,0,0.5)]";
const NUM = "font-[family-name:var(--font-literata)] text-[36px] font-bold leading-[18px] tracking-[0.78px] text-[#7c4a0b]";
const TIT = "font-extrabold uppercase tracking-[0.78px] text-[#7c4a0b]";
const CREAR =
  "flex items-center justify-center gap-2.5 rounded-xl border-2 border-[#876f0d] bg-[#fff5cc] font-black text-[#066728] shadow-[2px_4px_4px_rgba(0,0,0,0.25)] active:translate-y-px";
const NOTA =
  "w-full resize-y rounded-[14px] border-2 border-[rgba(152,117,13,0.88)] bg-white px-[15px] py-[14px] text-[17px] leading-[26px] text-carbon outline-none placeholder:text-carbon/50 focus:border-[#876f0d]";
const IN =
  "h-12 w-full rounded-xl border-2 bg-white px-3 text-[16.5px] text-carbon outline-none placeholder:text-carbon/50";
const BLANCO = "rounded-xl border border-[rgba(131,79,14,0.3)] bg-white font-semibold text-carbon/80";

type Lado = "dir" | "per";
const TEMA: Record<Lado, { icono: string; nombre: string; etq: string; borde: string; texto: string; pista: string; marca: string; vacio: string }> = {
  dir: {
    icono: "📍", nombre: "Dirección", etq: "text-[rgba(13,82,21,0.7)]", borde: "border-[#56834d]",
    texto: "text-[#0d3d14]", pista: "text-[#3f7a1c]", marca: "bg-[#e5f0dc] text-[#0d5215]", vacio: "buscar dirección…",
  },
  per: {
    icono: "👤", nombre: "Persona", etq: "text-[rgba(114,48,132,0.7)]", borde: "border-[#9d6b9a]",
    texto: "text-[#4a1f57]", pista: "text-[#723084]", marca: "bg-[#f3e6f2] text-[#5a1f6a]", vacio: "buscar persona…",
  },
};

// La direccion de la nota: una opp de la lista, una direccion que ya tenemos
// sin opp (clave), o lo escrito "para revisar despues".
type Dir = { tipo: "opp"; valor: string } | { tipo: "clave"; id: string; texto: string } | { tipo: "asi"; texto: string } | null;
// La persona: de la lista, o lo escrito "para revisar despues".
type Per = { tipo: "lista"; valor: string } | { tipo: "asi"; texto: string } | null;
// La ventana abierta encima de la nota, si hay alguna.
type Capa = { que: "buscar"; lado: Lado } | { que: "contacto" } | { que: "opp" } | null;
type Foto = { foto: Blob; mini: Blob; vista: string };

/** El alto que queda VISIBLE (sin el teclado): las ventanas se ajustan a el. */
function useAltoVisible() {
  const [alto, setAlto] = useState<number | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    const medir = () => setAlto(vv ? vv.height : window.innerHeight);
    medir();
    vv?.addEventListener("resize", medir);
    window.addEventListener("resize", medir);
    return () => {
      vv?.removeEventListener("resize", medir);
      window.removeEventListener("resize", medir);
    };
  }, []);
  return alto;
}

export function Satelite() {
  const [listas, setListas] = useState<Listas | null>(null);
  const [cola, setCola] = useState<NotaEnCola[]>([]);
  const [red, setRed] = useState(true);
  const [sinSesion, setSinSesion] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const [capa, setCapa] = useState<Capa>(null);
  const [texto, setTexto] = useState("");
  const [dir, setDir] = useState<Dir>(null);
  const [per, setPer] = useState<Per>(null);
  // CREAR NUEVO CONTACTO
  const [cNombre, setCNombre] = useState("");
  const [cTel, setCTel] = useState("");
  const [cCorreo, setCCorreo] = useState("");
  const [cTipo, setCTipo] = useState<TipoContacto | "">("");
  const [cOtro, setCOtro] = useState("");
  // CREAR NUEVA OPP: direccion y al menos una persona de contacto con telefono
  // o correo; lo demas, a las notas.
  const [oDir, setODir] = useState("");
  const [oClave, setOClave] = useState<string | null>(null);
  const [oContacto, setOContacto] = useState("");
  const [oNombre, setONombre] = useState("");
  const [oTel, setOTel] = useState("");
  const [oCorreo, setOCorreo] = useState("");

  const [fotos, setFotos] = useState<Foto[]>([]);
  const [preparando, setPreparando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const alto = useAltoVisible();

  const refrescarCola = useCallback(async () => setCola(await leerCola()), []);

  // Enviar lo que espera y traer las listas frescas, si hay red.
  const sincronizar = useCallback(async () => {
    if (!navigator.onLine) return setRed(false);
    setRed(true);
    setEnviando(true);
    const r = await enviarCola();
    setSinSesion(r === "sin_sesion");
    setRed(r !== "sin_red");
    await refrescarCola();
    setEnviando(false);
    if (r === "enviadas") {
      try {
        const l = await fetch("/api/satelite/listas", { cache: "no-store" });
        if (l.ok && !l.redirected) {
          const nuevas = (await l.json()) as Listas;
          await guardarListas(nuevas);
          setListas(nuevas);
        }
      } catch {
        /* sin red: se quedan las que habia */
      }
    }
  }, [refrescarCola]);

  useEffect(() => {
    leerListas().then((l) => l && setListas(l));
    refrescarCola();
    sincronizar();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw-satelite.js", { scope: "/satelite" }).catch(() => {});
    const alVolver = () => sincronizar();
    window.addEventListener("online", alVolver);
    window.addEventListener("offline", () => setRed(false));
    document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && sincronizar());
    const cada = setInterval(sincronizar, 60_000);
    return () => {
      window.removeEventListener("online", alVolver);
      clearInterval(cada);
    };
  }, [refrescarCola, sincronizar]);

  // ---- las ventanas: el boton de ATRAS del movil las cierra ----
  // Al abrir una se apunta un paso en el historial; atras lo quita y la cierra.
  const abrir = (c: Exclude<Capa, null>) => {
    if (!capa) window.history.pushState({ satelite: "capa" }, "");
    setCapa(c);
  };
  const cerrar = () => {
    if (window.history.state?.satelite === "capa") window.history.back();
    else setCapa(null);
  };
  useEffect(() => {
    const atras = () => setCapa(null);
    window.addEventListener("popstate", atras);
    return () => window.removeEventListener("popstate", atras);
  }, []);
  // Con una ventana abierta, la nota de debajo no se mueve.
  useEffect(() => {
    document.body.style.overflow = capa ? "hidden" : "";
  }, [capa]);

  const oppElegida = dir?.tipo === "opp" ? listas?.oportunidades.find((o) => o.valor === dir.valor) ?? null : null;
  const deOtro =
    oppElegida && listas?.miComercialId && oppElegida.comercialId && oppElegida.comercialId !== listas.miComercialId ? oppElegida.comercial : null;
  const dirTexto = dir ? (dir.tipo === "opp" ? oppElegida?.texto ?? "" : dir.texto) : "";
  const personaElegida = per?.tipo === "lista" ? listas?.personas.find((p) => p.valor === per.valor) ?? null : null;

  const limpiarTodo = () => {
    fotos.forEach((f) => URL.revokeObjectURL(f.vista));
    setTexto("");
    setDir(null);
    setPer(null);
    setCNombre("");
    setCTel("");
    setCCorreo("");
    setCTipo("");
    setCOtro("");
    setODir("");
    setOClave(null);
    setOContacto("");
    setONombre("");
    setOTel("");
    setOCorreo("");
    setFotos([]);
    setError(null);
  };

  // ---- pasar a crear, desde arriba o desde "¿la creo nueva?" ----
  // La nota que ya se llevaba escrita viaja con ella.
  const aCrearContacto = (nombre = "") => {
    if (nombre) setCNombre(nombre);
    setError(null);
    abrir({ que: "contacto" });
  };
  const aCrearOpp = (direccion = "", clave: string | null = null) => {
    if (direccion) setODir(direccion);
    setOClave(clave);
    // La persona que ya estaba puesta, si es de la agenda, es el contacto.
    if (per?.tipo === "lista" && per.valor.startsWith("puesto:")) setOContacto(per.valor);
    else if (per?.tipo === "asi" && !oNombre) setONombre(per.texto);
    setError(null);
    abrir({ que: "opp" });
  };

  const añadirFotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setPreparando(true);
    try {
      const nuevas: Foto[] = [];
      for (const f of Array.from(files).filter((x) => x.type.startsWith("image/"))) {
        const { foto, mini } = await reducirFoto(f);
        nuevas.push({ foto, mini, vista: URL.createObjectURL(mini) });
      }
      setFotos((a) => [...a, ...nuevas].slice(0, 20));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPreparando(false);
    }
  };

  const meter = async (nota: NotaEnCola) => {
    setError(null);
    await meterEnCola(nota);
    limpiarTodo();
    if (capa) cerrar();
    setAviso(navigator.onLine ? "Guardado. Enviándolo…" : "Guardado en el móvil. Saldrá solo en cuanto haya cobertura.");
    setTimeout(() => setAviso(null), 4000);
    await refrescarCola();
    sincronizar();
  };
  const base = () => ({
    id: crypto.randomUUID(),
    creada: new Date().toISOString(),
    texto: texto.trim(),
    canal: CANAL,
    fecha: hoyISO(),
    fotos: fotos.map(({ foto, mini }) => ({ foto, mini })),
  });

  // ---- 1 · LA NOTA ----
  const haySitio = dir !== null || per !== null;
  const puedeNota = texto.trim() !== "" && haySitio && dir?.tipo !== "clave" && !preparando;
  const faltaNota =
    texto.trim() === ""
      ? "Escribe la nota"
      : dir?.tipo === "clave"
        ? "Elige: ¿opp nueva aquí o la revisas después?"
        : !haySitio
          ? "Falta sobre qué va: una dirección o una persona"
          : null;
  const guardarNota = async () => {
    if (!puedeNota) return;
    // Una persona escrita "para revisar despues" manda la nota a la bandeja,
    // aunque la direccion sea una opp: alli se coloca con las dos cosas.
    const aBandeja = per?.tipo === "asi";
    const oportunidadId = dir?.tipo === "opp" && !aBandeja ? dir.valor : null;
    await meter({
      ...base(),
      oportunidadId,
      persona: per?.tipo === "lista" ? per.valor : null,
      quienTexto: per?.tipo === "asi" ? per.texto : null,
      dondeTexto: oportunidadId ? null : dirTexto || null,
      // Con una direccion sin opp (clave) no se llega aqui: o nace la opp o
      // se guarda "asi".
      claveId: null,
      nueva: null,
      resumen:
        [dirTexto && (dir?.tipo === "opp" ? dirTexto : `${dirTexto} (revisar)`), personaElegida?.texto ?? (per?.tipo === "asi" ? `${per.texto} (revisar)` : null)]
          .filter(Boolean)
          .join(" · ") || "nota",
    });
  };

  // ---- 2 · CREAR NUEVO CONTACTO ----
  const puedeContacto =
    texto.trim() !== "" && cNombre.trim() !== "" && (cTel.trim() !== "" || cCorreo.trim() !== "") && cTipo !== "" && (cTipo !== "otro" || cOtro.trim() !== "");
  const faltaContacto = !cNombre.trim()
    ? "Falta el nombre"
    : !cTel.trim() && !cCorreo.trim()
      ? "Falta el teléfono o el correo"
      : cTipo === ""
        ? "Falta qué es"
        : cTipo === "otro" && !cOtro.trim()
          ? "Escribe qué es"
          : !texto.trim()
            ? "Faltan las notas"
            : null;
  // ¿Hay ya alguien con ese nombre? Se avisa, para no crear dos veces a la
  // misma persona con apodos distintos. No se impide: puede ser otro.
  const parecido =
    cNombre.trim().length >= 4 ? (listas?.personas ?? []).find((p) => limpio(p.texto).includes(limpio(cNombre))) : undefined;
  const guardarContacto = async () => {
    if (!puedeContacto) return;
    const c: ContactoSat = {
      nombre: cNombre.trim(),
      telefono: cTel.trim() || null,
      correo: cCorreo.trim() || null,
      tipo: cTipo as TipoContacto,
      otro: cTipo === "otro" ? cOtro.trim() : null,
      oportunidadId: dir?.tipo === "opp" ? dir.valor : null,
      sobre: dirTexto || null,
    };
    await meter({ ...base(), oportunidadId: null, persona: null, dondeTexto: null, nuevoContacto: c, resumen: `Contacto nuevo: ${c.nombre}` });
  };

  // ---- 3 · CREAR NUEVA OPP ----
  const hayContactoOpp = oContacto !== "" || (oNombre.trim() !== "" && (oTel.trim() !== "" || oCorreo.trim() !== ""));
  const puedeOpp = texto.trim() !== "" && oDir.trim() !== "" && hayContactoOpp && !preparando;
  const faltaOpp = !oDir.trim()
    ? "Falta la dirección"
    : !hayContactoOpp
      ? "Falta el contacto, con su teléfono o su correo"
      : !texto.trim()
        ? "Faltan las notas"
        : null;
  // ¿Ya hay una opp con esa direccion? Se avisa: puede ser la misma.
  const oppParecida =
    oDir.trim().length >= 6 && !oClave ? (listas?.oportunidades ?? []).find((o) => limpio(o.texto).includes(limpio(oDir))) : undefined;
  const guardarOpp = async () => {
    if (!puedeOpp) return;
    await meter({
      ...base(),
      oportunidadId: null,
      persona: null,
      dondeTexto: oDir.trim(),
      claveId: oClave,
      nueva: {
        id: crypto.randomUUID(),
        administrador: null,
        contacto: oContacto || null,
        contactoNombre: oContacto ? null : oNombre.trim() || null,
        contactoTelefono: oContacto ? null : oTel.trim() || null,
        contactoCorreo: oContacto ? null : oCorreo.trim() || null,
        tipos: [],
        paso: null,
      },
      resumen: `Opp nueva: ${oDir.trim()}`,
    });
  };

  // ---- lo que el servidor rechazo: vuelve a la pantalla para corregirlo ----
  const corregir = async (n: NotaEnCola) => {
    limpiarTodo();
    setTexto(n.texto);
    setFotos(n.fotos.map((f) => ({ ...f, vista: URL.createObjectURL(f.mini) })));
    const c = n.nuevoContacto ?? (n.nuevoAdmin ? { ...n.nuevoAdmin, tipo: "administrador" as const, otro: null } : null);
    if (c) {
      setCNombre(c.nombre);
      setCTel(c.telefono ?? "");
      setCCorreo(c.correo ?? "");
      setCTipo(c.tipo);
      setCOtro(c.otro ?? "");
      abrir({ que: "contacto" });
    } else if (n.nueva && n.dondeTexto) {
      setODir(n.dondeTexto);
      setOClave(n.claveId ?? null);
      setOContacto(n.nueva.contacto ?? "");
      setONombre(n.nueva.contactoNombre ?? "");
      setOTel(n.nueva.contactoTelefono ?? "");
      setOCorreo(n.nueva.contactoCorreo ?? "");
      abrir({ que: "opp" });
    } else {
      setDir(
        n.oportunidadId
          ? { tipo: "opp", valor: n.oportunidadId }
          : n.dondeTexto
            ? n.claveId
              ? { tipo: "clave", id: n.claveId, texto: n.dondeTexto }
              : { tipo: "asi", texto: n.dondeTexto }
            : null,
      );
      setPer(n.persona ? { tipo: "lista", valor: n.persona } : n.quienTexto ? { tipo: "asi", texto: n.quienTexto } : null);
    }
    await sacarDeCola(n.id);
    await refrescarCola();
  };

  // ================= piezas =================
  const etiqueta = (l: Lado) => (
    <span className={"flex items-center gap-1.5 text-[12px] font-bold uppercase leading-[21px] tracking-[0.6px] " + TEMA[l].etq}>
      <span aria-hidden>{TEMA[l].icono}</span>
      {TEMA[l].nombre}
    </span>
  );
  const botonBuscar = (l: Lado, clase: string) => (
    <button
      type="button"
      onClick={() => abrir({ que: "buscar", lado: l })}
      className={"flex items-center overflow-hidden whitespace-nowrap rounded-[14px] border-2 bg-white text-left text-[17.3px] text-carbon/50 " + TEMA[l].borde + " " + clase}
    >
      {TEMA[l].vacio}
    </button>
  );
  // Lo elegido, como TEXTO, con su aspa para quitarlo.
  const comoTexto = (l: Lado, txt: string, pista: string | null, quitar: () => void) => (
    <div className="flex items-start gap-2 pl-3.5 pt-1.5">
      <div className={"min-w-0 flex-1 text-[17px] font-extrabold leading-[22px] " + TEMA[l].texto}>
        {txt}
        {pista && <span className={"mt-0.5 block text-[12px] font-bold leading-4 " + TEMA[l].pista}>{pista}</span>}
      </div>
      <button type="button" aria-label="Quitar" onClick={quitar} className="-mt-2 grid size-10 shrink-0 place-items-center text-[22px] text-carbon/55">
        ×
      </button>
    </div>
  );
  const pistaDir =
    dir?.tipo === "opp" ? oppElegida?.pista ?? null : dir?.tipo === "clave" ? "dirección que ya tenemos, sin opp abierta" : "se guarda así y la revisas en el PC";
  const pistaPer = per?.tipo === "lista" ? personaElegida?.pista ?? null : "se guarda así y la revisas en el PC";

  const botonGuardar = (puede: boolean, hacer: () => void, rotulo: string, falta: string | null) => (
    <>
      {!puede && falta && <p className="mb-1.5 text-center text-[13.5px] font-semibold leading-[19px] text-[#7a5a12]">{falta}</p>}
      <button
        type="button"
        disabled={!puede}
        onClick={hacer}
        className="h-[58px] w-full rounded-2xl bg-lima text-[18.4px] font-extrabold text-carbon shadow-[0_2px_6px_rgba(63,122,28,0.3)] transition active:scale-[0.99] disabled:bg-[#cfe8bd] disabled:text-carbon/45 disabled:shadow-none"
      >
        {rotulo}
      </button>
    </>
  );

  const ventanaCab = (titulo: string) => (
    <div className="flex items-center justify-between py-2.5 pl-[18px] pr-2.5">
      <span className="flex items-center gap-2 text-[16px] font-black text-[#066728]">
        <b className="text-[20px]">+</b>
        {titulo}
      </span>
      <BotonCerrar alPulsar={cerrar} />
    </div>
  );

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-[#b9bab9] pb-[140px] pt-4">
      {/* ---- cabecera ---- */}
      <div className="flex items-center justify-between px-4">
        <h1 className="text-[19.4px] font-extrabold leading-7 tracking-[-0.2px] text-carbon">Nota rápida</h1>
        <span className={"rounded-full px-2.5 py-[3px] text-[11.8px] font-bold " + (red ? "bg-lima-soft text-lima-dark" : "bg-amber-100 text-amber-900")}>
          {red ? (enviando ? "enviando…" : "con conexión") : "sin conexión"}
        </span>
      </div>
      {listas && <p className="px-4 text-[12.3px] leading-[18px] text-carbon/65">{listas.quien}</p>}
      {!listas && (
        <p className="mx-4 mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
          Todavía no tengo las listas de direcciones y personas. Ábrelo una vez con cobertura y se quedan guardadas en el móvil.
        </p>
      )}
      {sinSesion && (
        <p className="mx-4 mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
          Tienes que volver a entrar para enviar las notas. No se pierde nada: siguen en el móvil.{" "}
          <a href="/entrar?volver=/satelite" className="font-bold underline">
            Entrar
          </a>
        </p>
      )}

      {/* ---- crear, arriba ---- */}
      <div className="mt-[5px] flex justify-center gap-[26px]">
        <button type="button" onClick={() => aCrearContacto()} className={CREAR + " h-[54px] w-[132px]"}>
          <b className="text-[19px] leading-[19px]">+</b>
          <span className="text-center text-[14px] leading-5">
            Nuevo
            <br />
            contacto
          </span>
        </button>
        <button type="button" onClick={() => aCrearOpp()} className={CREAR + " h-[54px] w-[130px]"}>
          <b className="text-[19px] leading-[19px]">+</b>
          <span className="text-center text-[14px] leading-5">
            Nueva
            <br />
            opp
          </span>
        </button>
      </div>

      {/* ================= LA NOTA ================= */}
      <section className="mx-1.5 mt-[15px] rounded-[20px] border-2 border-[#876f0d] bg-[#fff5cc] pb-3 shadow-[2px_4px_3px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-2 pl-[18px] pt-3 text-[14px] font-black leading-5 text-[#066728]">
          <b className="text-[19px] leading-[19px]">+</b>Nueva Nota
        </div>

        {/* 1 · que ha pasado */}
        <div className={PANEL + " ml-[13px] mr-[17px] mt-2.5 px-[13px] pb-4 pt-5"}>
          <div className="flex items-center gap-[10px] pl-2.5">
            <span className={NUM}>1.</span>
            <span className={TIT + " text-[16px] leading-[18px]"}>Qué ha pasado</span>
          </div>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={6}
            placeholder="Escríbelo o díctalo con el micro del teclado."
            className={NOTA + " mt-[14px] min-h-[150px]"}
          />
        </div>

        {/* 2 · sobre que va */}
        <div className={PANEL + " mx-[15px] mt-[18px] px-[6px] pb-4 pt-2.5"}>
          <div className="flex items-start gap-3 pl-[17px]">
            <span className={NUM + " leading-[30px]"}>2.</span>
            <span className={TIT + " pt-[3px] text-[13px] leading-[15px]"}>
              Sobre qué va:
              <small className="block text-[10px] leading-[15px]">persona o dirección (o ambas)</small>
            </span>
          </div>

          {dir === null && per === null ? (
            // Nada elegido: los dos buscadores, uno al lado del otro.
            <div className="mt-[14px] grid grid-cols-2 gap-3">
              <div>
                <div className="pl-[17px]">{etiqueta("dir")}</div>
                {botonBuscar("dir", "mt-1 h-14 w-full pl-[7px]")}
              </div>
              <div>
                <div className="pl-[17px]">{etiqueta("per")}</div>
                {botonBuscar("per", "mt-1 h-14 w-full pl-[11px]")}
              </div>
            </div>
          ) : (
            // Algo elegido: queda como TEXTO; lo que falta, en su fila.
            <div className="pb-1">
              <div className="mt-[14px] pl-2.5">
                {dir === null ? (
                  <div className="flex items-center gap-3">
                    {etiqueta("dir")}
                    {botonBuscar("dir", "h-11 min-w-0 flex-1 pl-3")}
                  </div>
                ) : (
                  <>
                    {etiqueta("dir")}
                    {comoTexto("dir", dirTexto || "(oportunidad)", pistaDir, () => setDir(null))}
                    {dir.tipo === "clave" && (
                      // Una nota no cuelga de una direccion sin opp: o nace la
                      // opp, o se revisa en el PC.
                      <div className="mt-2 grid grid-cols-2 gap-2 pr-2.5">
                        <button type="button" onClick={() => aCrearOpp(dir.texto, dir.id)} className={CREAR + " min-h-12 px-2 text-[14px] leading-tight"}>
                          + Opp nueva aquí
                        </button>
                        <button type="button" onClick={() => setDir({ tipo: "asi", texto: dir.texto })} className={BLANCO + " min-h-12 px-2 text-[13.5px] leading-tight"}>
                          La reviso después
                        </button>
                      </div>
                    )}
                    {deOtro && (
                      <p className="mr-2.5 mt-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[13px] text-amber-900">
                        Esta oportunidad es de <b>{deOtro}</b>. Puedes guardar la nota igualmente.
                      </p>
                    )}
                  </>
                )}
              </div>
              <div className="mt-[18px] pl-2.5">
                {per === null ? (
                  <div className="flex items-center gap-3 pr-1">
                    {etiqueta("per")}
                    {botonBuscar("per", "h-11 min-w-0 flex-1 pl-3")}
                  </div>
                ) : (
                  <>
                    {etiqueta("per")}
                    {comoTexto("per", per.tipo === "lista" ? personaElegida?.texto ?? "(persona)" : per.texto, pistaPer, () => setPer(null))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* fotos */}
        <div className="mx-4 mt-1.5 border-t border-black/10 pt-[13px]">
          <div className="flex items-center justify-center gap-1.5 text-[12px] font-bold uppercase leading-[21px] tracking-[0.6px] text-[rgba(131,79,14,0.7)]">
            <span aria-hidden>📷</span>Añadir fotos
          </div>
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-3">
            {fotos.map((f, i) => (
              <div key={f.vista} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.vista} alt={`Foto ${i + 1}`} className="size-[46px] rounded-xl border border-[rgba(131,79,14,0.3)] object-cover" />
                <button
                  type="button"
                  aria-label="Quitar la foto"
                  onClick={() => setFotos((a) => a.filter((x) => x !== f))}
                  className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full border border-[#876f0d] bg-white text-[13px] text-[#7c4a0b]"
                >
                  ×
                </button>
              </div>
            ))}
            {/* DOS BOTONES (Monica, 8-oct-2026: "no abre la camara, sino la
                galeria"). Los Android de ahora, si no se pide la camara
                expresamente, abren directamente la galeria. */}
            <button type="button" disabled={preparando} onClick={() => camara.current?.click()} className={BLANCO + " h-[46px] w-[132px] text-[13px] disabled:opacity-50"}>
              {preparando ? "Preparando…" : "📷 Hacer foto"}
            </button>
            <button type="button" disabled={preparando} onClick={() => galeria.current?.click()} className={BLANCO + " h-[46px] w-[109px] text-[13px] disabled:opacity-50"}>
              🖼️ Galería
            </button>
            <input
              ref={camara}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                añadirFotos(e.target.files);
                e.target.value = "";
              }}
            />
            <input
              ref={galeria}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                añadirFotos(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </section>

      {/* ---- lo que espera en el movil ---- */}
      {cola.length > 0 && (
        <section className="mx-1.5 mt-4 rounded-2xl border border-black/10 bg-white p-3">
          <h2 className="text-[12px] font-bold uppercase tracking-[0.05em] text-carbon/65">En el móvil, esperando: {cola.length}</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {cola.map((n) => (
              <li key={n.id} className="rounded-xl border border-black/5 bg-hueso/60 px-3 py-2 text-[13px]">
                <div className="font-semibold text-carbon/80">{n.resumen}</div>
                <div className="line-clamp-2 text-carbon/65">{n.texto}</div>
                {n.fotos.length > 0 && <div className="text-[12px] text-carbon/50">{n.fotos.length} foto(s)</div>}
                {n.error && (
                  <div className="mt-1 text-[12px] text-alerta">
                    No se ha podido guardar: {n.error}{" "}
                    <button type="button" onClick={() => corregir(n)} className="font-bold underline">
                      Corregir
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---- guardar, fijo abajo, al pulgar ---- */}
      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-[480px] border-t border-black/10 bg-[#b9bab9] px-4 pb-[max(22px,env(safe-area-inset-bottom))] pt-3">
        {aviso && <p className="mb-2 rounded-xl bg-lima-soft px-3 py-2 text-center text-[14px] font-semibold text-lima-dark">{aviso}</p>}
        {!capa && error && <p className="mb-2 text-center text-[13.5px] font-semibold text-alerta">{error}</p>}
        {botonGuardar(puedeNota, guardarNota, "Guardar", faltaNota)}
      </div>

      {/* ================= LAS VENTANAS ================= */}
      {capa && (
        <div className="fixed inset-0 z-40" style={{ height: alto ?? undefined }}>
          {/* Tocar fuera cierra. */}
          <button type="button" aria-label="Cerrar" onClick={cerrar} className="absolute inset-0 h-full w-full bg-[rgba(30,30,30,0.55)]" />

          {capa.que === "buscar" && (
            <Buscador
              lado={capa.lado}
              opciones={
                capa.lado === "dir"
                  ? // Primero las opps, por su nombre; luego las direcciones que
                    // ya tenemos aunque no tengan opp abierta (13-oct-2026).
                    [...(listas?.oportunidades ?? []), ...(listas?.direcciones ?? [])]
                  : listas?.personas ?? []
              }
              alto={alto}
              cerrar={cerrar}
              elegir={(v) => {
                if (capa.lado === "per") setPer({ tipo: "lista", valor: v });
                else if (v.startsWith("clave:")) {
                  const d = listas?.direcciones?.find((x) => x.valor === v);
                  setDir({ tipo: "clave", id: v.slice("clave:".length), texto: d?.texto ?? "" });
                } else setDir({ tipo: "opp", valor: v });
                cerrar();
              }}
              crearNueva={(q) => (capa.lado === "dir" ? aCrearOpp(q) : aCrearContacto(q))}
              guardarAsi={(q) => {
                if (capa.lado === "dir") setDir({ tipo: "asi", texto: q });
                else setPer({ tipo: "asi", texto: q });
                cerrar();
              }}
            />
          )}

          {capa.que === "contacto" && (
            <Ventana alto={alto}>
              {ventanaCab("Nuevo contacto")}
              <div className="flex-1 overflow-y-auto px-3 pb-2">
                {dirTexto && (
                  <p className="mb-3 rounded-lg bg-white/70 px-3 py-2 text-[13.5px] text-carbon/75">
                    Sobre: <b>{dirTexto}</b>
                  </p>
                )}
                <div className="flex flex-col gap-[22px]">
                  <div className={PANEL + " px-3 pb-[14px] pt-3"}>
                    <div className="mb-2 flex items-center gap-2.5">
                      <span className={NUM + " text-[30px] leading-6"}>1.</span>
                      <span className={TIT + " text-[14px]"}>Quién es</span>
                    </div>
                    <input value={cNombre} onChange={(e) => setCNombre(e.target.value)} placeholder="nombre" autoComplete="off" className={IN + " border-[rgba(152,117,13,0.88)]"} />
                    {parecido && (
                      <p className="mt-1.5 rounded-[10px] border border-[#f0d58f] bg-[#fff3d6] px-2.5 py-1.5 text-[12.5px] leading-[17px] text-[#7a5a12]">
                        Ya hay alguien parecido: <b>{parecido.texto}</b>
                        {parecido.pista ? ` · ${parecido.pista}` : ""}. Si es él, cierra y búscalo en «Persona».
                      </p>
                    )}
                    <input value={cTel} onChange={(e) => setCTel(e.target.value)} placeholder="teléfono" inputMode="tel" className={IN + " mt-1.5 !w-1/2 border-[rgba(152,117,13,0.88)]"} />
                    <input value={cCorreo} onChange={(e) => setCCorreo(e.target.value)} placeholder="correo" inputMode="email" autoComplete="off" className={IN + " mt-1.5 border-[rgba(152,117,13,0.88)]"} />
                    <div className="mt-2 grid grid-cols-4 gap-[5px]">
                      {TIPOS_CONTACTO.map((t) => (
                        <button
                          key={t.valor}
                          type="button"
                          onClick={() => setCTipo(t.valor)}
                          className={
                            "h-10 rounded-[10px] border text-[12.5px] font-bold " +
                            (cTipo === t.valor ? "border-[#7c4a0b] bg-[#7c4a0b] text-white" : "border-[rgba(131,79,14,0.4)] bg-white text-[#7c4a0b]")
                          }
                        >
                          {t.texto}
                        </button>
                      ))}
                    </div>
                    {cTipo === "otro" && (
                      <input value={cOtro} onChange={(e) => setCOtro(e.target.value)} placeholder="¿qué es? (portero, arquitecto…)" className={IN + " mt-1.5 border-[rgba(152,117,13,0.88)]"} />
                    )}
                  </div>
                  <div className={PANEL + " px-3 pb-[14px] pt-3"}>
                    <div className="mb-2 flex items-center gap-2.5">
                      <span className={NUM + " text-[30px] leading-6"}>2.</span>
                      <span className={TIT + " text-[14px]"}>Notas</span>
                    </div>
                    <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} placeholder="Escríbelo o díctalo con el micro del teclado." className={NOTA + " min-h-24 text-[16.5px] leading-[23px]"} />
                  </div>
                </div>
              </div>
              <div className="p-3">
                {error && <p className="mb-1.5 text-center text-[13px] font-semibold text-alerta">{error}</p>}
                {botonGuardar(puedeContacto, guardarContacto, "Guardar contacto", faltaContacto)}
              </div>
            </Ventana>
          )}

          {capa.que === "opp" && (
            <Ventana alto={alto}>
              {ventanaCab("Nueva opp")}
              <div className="flex-1 overflow-y-auto px-3 pb-2">
                <div className="flex flex-col gap-[22px]">
                  <div className={PANEL + " px-3 pb-[14px] pt-3"}>
                    <div className="mb-2 flex items-center gap-2.5">
                      <span className={NUM + " text-[30px] leading-6"}>1.</span>
                      <span className={TIT + " text-[14px]"}>Dónde</span>
                    </div>
                    <input
                      value={oDir}
                      onChange={(e) => {
                        setODir(e.target.value);
                        setOClave(null);
                      }}
                      placeholder="calle, número y municipio"
                      autoComplete="off"
                      className={IN + " border-[#56834d]"}
                    />
                    {oClave && <p className="mt-1 pl-1 text-[12.5px] text-carbon/65">Dirección que ya tenemos, sin opp abierta.</p>}
                    {oppParecida && (
                      <p className="mt-1.5 rounded-[10px] border border-[#f0d58f] bg-[#fff3d6] px-2.5 py-1.5 text-[12.5px] leading-[17px] text-[#7a5a12]">
                        Ya hay una parecida: <b>{oppParecida.texto}</b>. Si es esa, cierra y búscala.
                      </p>
                    )}
                  </div>
                  <div className={PANEL + " px-3 pb-[14px] pt-3"}>
                    <div className="mb-2 flex items-center gap-2.5">
                      <span className={NUM + " text-[30px] leading-6"}>2.</span>
                      <span className={TIT + " text-[14px]"}>Contacto</span>
                    </div>
                    {oContacto ? (
                      <div className="rounded-xl bg-white/70 py-1">
                        {comoTexto(
                          "per",
                          listas?.personas.find((p) => p.valor === oContacto)?.texto ?? "(persona)",
                          listas?.personas.find((p) => p.valor === oContacto)?.pista ?? null,
                          () => setOContacto(""),
                        )}
                      </div>
                    ) : (
                      <>
                        <input value={oNombre} onChange={(e) => setONombre(e.target.value)} placeholder="nombre" autoComplete="off" className={IN + " border-[#9d6b9a]"} />
                        <input value={oTel} onChange={(e) => setOTel(e.target.value)} placeholder="teléfono" inputMode="tel" className={IN + " mt-1.5 !w-1/2 border-[#9d6b9a]"} />
                        <input value={oCorreo} onChange={(e) => setOCorreo(e.target.value)} placeholder="correo" inputMode="email" autoComplete="off" className={IN + " mt-1.5 border-[#9d6b9a]"} />
                      </>
                    )}
                  </div>
                  <div className={PANEL + " px-3 pb-[14px] pt-3"}>
                    <div className="mb-2 flex items-center gap-2.5">
                      <span className={NUM + " text-[30px] leading-6"}>3.</span>
                      <span className={TIT + " text-[14px]"}>Notas</span>
                    </div>
                    <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} placeholder="Qué quieren, cómo lo has sabido… todo lo demás, aquí." className={NOTA + " min-h-[74px] text-[16.5px] leading-[23px]"} />
                  </div>
                </div>
              </div>
              <div className="p-3">
                {error && <p className="mb-1.5 text-center text-[13px] font-semibold text-alerta">{error}</p>}
                {botonGuardar(puedeOpp, guardarOpp, "Guardar opp", faltaOpp)}
              </div>
            </Ventana>
          )}
        </div>
      )}
    </div>
  );
}

function BotonCerrar({ alPulsar }: { alPulsar: () => void }) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      className="flex h-10 items-center gap-1.5 rounded-xl border-[1.5px] border-[rgba(131,79,14,0.45)] bg-white px-3.5 text-[14px] font-bold text-[#7c4a0b]"
    >
      <b className="text-[20px] leading-none">×</b> Cerrar
    </button>
  );
}

/** La ventana flotante grande de crear: ocupa lo que se ve (sin el teclado). */
function Ventana({ alto, children }: { alto: number | null; children: React.ReactNode }) {
  return (
    <div
      className="absolute inset-x-2.5 top-2.5 mx-auto flex max-w-[460px] flex-col overflow-hidden rounded-[20px] border-2 border-[#876f0d] bg-[#fff5cc] shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
      style={{ height: alto ? alto - 20 : "calc(100% - 20px)" }}
    >
      {children}
    </div>
  );
}

/** EL BUSCADOR, en una ventana de la mitad hacia arriba (Monica, 20-oct-2026):
 *  el teclado ocupa la de abajo. Las dos salidas, fijas al pie, se ven siempre. */
function Buscador({
  lado,
  opciones,
  alto,
  cerrar,
  elegir,
  crearNueva,
  guardarAsi,
}: {
  lado: Lado;
  opciones: Opcion[];
  alto: number | null;
  cerrar: () => void;
  elegir: (valor: string) => void;
  crearNueva: (escrito: string) => void;
  guardarAsi: (escrito: string) => void;
}) {
  const [q, setQ] = useState("");
  const campo = useRef<HTMLInputElement>(null);
  useEffect(() => campo.current?.focus(), []);
  const t = TEMA[lado];
  const b = limpio(q);
  const todas = b === "" ? [] : opciones.filter((o) => limpio(o.texto + " " + (o.pista ?? "")).includes(b));
  const vistas = todas.slice(0, TOPE);
  // Marca lo buscado dentro del nombre, para ver por que sale.
  const marcar = (txt: string) => {
    const i = b ? limpio(txt).indexOf(b) : -1;
    if (i < 0) return txt;
    return (
      <>
        {txt.slice(0, i)}
        <mark className={"rounded-[3px] font-bold " + t.marca}>{txt.slice(i, i + b.length)}</mark>
        {txt.slice(i + b.length)}
      </>
    );
  };

  return (
    <div
      className="absolute inset-x-1.5 top-2.5 mx-auto flex max-w-[468px] flex-col overflow-hidden rounded-[20px] border-2 border-[#876f0d] bg-[#fff5cc] shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
      style={{ height: Math.min((alto ?? 844) - 20, 520) }}
    >
      <div className="flex items-center justify-between pb-1.5 pl-[18px] pr-2 pt-2">
        <span className={"flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-[0.6px] " + t.etq}>
          <span aria-hidden>{t.icono}</span>
          {t.nombre}
        </span>
        <BotonCerrar alPulsar={cerrar} />
      </div>
      <input
        ref={campo}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && vistas[0]) {
            e.preventDefault();
            elegir(vistas[0].valor);
          }
        }}
        placeholder={t.vacio}
        autoComplete="off"
        enterKeyHint="search"
        className={"mx-3 h-14 shrink-0 rounded-[14px] border-2 bg-white px-3.5 text-[18px] text-carbon outline-none placeholder:text-carbon/50 " + t.borde}
      />
      <div className="mx-3 mt-2.5 min-h-0 flex-1 overflow-y-auto rounded-[14px] border border-[rgba(131,79,14,0.25)] bg-white">
        {b === "" ? (
          <p className="px-3.5 py-3 text-[15px] text-carbon/60">Escribe un trozo del nombre: sin tildes ni mayúsculas, está donde esté.</p>
        ) : vistas.length === 0 ? (
          <p className="px-3.5 py-3 text-[15px] text-carbon/60">No sale ninguna con «{q.trim()}».</p>
        ) : (
          <>
            {vistas.map((o) => (
              <button
                key={o.valor}
                type="button"
                onClick={() => elegir(o.valor)}
                className="block w-full border-b border-black/[.08] px-3.5 py-3 text-left text-[17px] leading-[1.3] text-carbon active:bg-lima-soft"
              >
                {marcar(o.texto)}
                {o.pista && <span className="block text-[13px] text-carbon/60">{o.pista}</span>}
              </button>
            ))}
            {todas.length > TOPE && (
              <p className="px-3.5 py-2.5 text-[13px] text-carbon/60">Y {todas.length - TOPE} más: escribe un poco más para afinar.</p>
            )}
          </>
        )}
      </div>
      {b !== "" && (
        <div className="flex shrink-0 flex-col gap-2 px-3 pb-3 pt-2.5">
          <button type="button" onClick={() => crearNueva(q.trim())} className={CREAR + " h-[50px] justify-start px-3.5 text-[15.5px] font-extrabold"}>
            <b className="text-[19px] font-black">+</b>
            {vistas.length ? "No es ninguna, ¿la creo nueva?" : "No está en la lista, ¿la creo nueva?"}
          </button>
          <button
            type="button"
            onClick={() => guardarAsi(q.trim())}
            className="flex h-[50px] items-center rounded-xl border border-[rgba(131,79,14,0.45)] bg-white px-3.5 text-[15.5px] font-bold text-[#7c4a0b]"
          >
            ¿La guardo así y la revisas después?
          </button>
        </div>
      )}
    </div>
  );
}
