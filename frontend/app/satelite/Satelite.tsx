"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Elegir } from "../components/Elegir";
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

// EL SATELITE (Monica, 8-oct-2026): "una minicosa-satelite que sea solo pulsar
// para guardar una nueva nota del diario". En el movil, con un icono en la
// pantalla de inicio, y SIN CONEXION: la nota espera en el movil y sale sola
// cuando hay red.
//
// SIMPLIFICADO (Monica, 19-oct-2026), "mas agil para guardar":
//   · arriba, dos botones: CREAR NUEVO CONTACTO y CREAR NUEVA OPP. Ninguno crea
//     nada: se apuntan y se completan en el PC desde Pendientes;
//   · debajo, la nota y A QUE HACE REFERENCIA: una direccion y/o una persona,
//     cada una con su buscador, grande (dedos gordos);
//   · al final de cada lista: "No es ninguna, ¿la creo nueva?" (o "No está en
//     la lista…" si no sale ninguna) y "¿La guardo así y la revisas después?";
//   · fuera "Como te has enterado" y "Cuando": se guardan (visita y hoy), pero
//     en la pantalla eran ruido.

const hoyISO = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
// Lo que no se enseña pero se guarda: se esta en la calle.
const CANAL = "visita";
const ETQ = "block text-[12px] font-bold uppercase tracking-[0.05em] text-[#5c4208]/75";
const CAMPO =
  "w-full rounded-xl border border-carbon/40 bg-white px-3.5 py-3 text-[18px] text-carbon outline-none placeholder:text-carbon/45 focus:border-lima";
const TIPOS_CONTACTO: { valor: TipoContacto; texto: string }[] = [
  { valor: "administrador", texto: "Administrador" },
  { valor: "vecino", texto: "Vecino" },
  { valor: "contratista", texto: "Contratista" },
  { valor: "otro", texto: "Otro" },
];
const limpio = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

type Modo = "nota" | "contacto" | "opp";
// La direccion de la nota: una opp de la lista, una direccion que ya tenemos
// sin opp (clave), o lo escrito "para revisar despues".
type Dir = { tipo: "opp"; valor: string } | { tipo: "clave"; id: string; texto: string } | { tipo: "asi"; texto: string } | null;
// La persona: de la lista, o lo escrito "para revisar despues".
type Per = { tipo: "lista"; valor: string } | { tipo: "asi"; texto: string } | null;
type Foto = { foto: Blob; mini: Blob; vista: string };

export function Satelite() {
  const [listas, setListas] = useState<Listas | null>(null);
  const [cola, setCola] = useState<NotaEnCola[]>([]);
  const [red, setRed] = useState(true);
  const [sinSesion, setSinSesion] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const [modo, setModo] = useState<Modo>("nota");
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
  // o correo; lo demas, a la nota.
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

  const oppElegida = dir?.tipo === "opp" ? listas?.oportunidades.find((o) => o.valor === dir.valor) ?? null : null;
  const deOtro =
    oppElegida && listas?.miComercialId && oppElegida.comercialId && oppElegida.comercialId !== listas.miComercialId ? oppElegida.comercial : null;
  const dirTexto = dir ? (dir.tipo === "opp" ? oppElegida?.texto ?? "" : dir.texto) : "";
  const personaElegida = per?.tipo === "lista" ? listas?.personas.find((p) => p.valor === per.valor) ?? null : null;

  // ---- limpiar ----
  const limpiarTodo = () => {
    fotos.forEach((f) => URL.revokeObjectURL(f.vista));
    setModo("nota");
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
    setCNombre(nombre);
    setModo("contacto");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const aCrearOpp = (direccion = "", clave: string | null = null) => {
    setODir(direccion);
    setOClave(clave);
    // La persona que ya estaba puesta, si es de la agenda, es el contacto.
    if (per?.tipo === "lista" && per.valor.startsWith("puesto:")) setOContacto(per.valor);
    else if (per?.tipo === "asi") setONombre(per.texto);
    setModo("opp");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const volverANota = () => {
    setModo("nota");
    setError(null);
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
  const puedeNota = texto.trim() !== "" && haySitio && !preparando;
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
      claveId: dir?.tipo === "clave" ? dir.id : null,
      nueva: null,
      resumen: [dirTexto && (dir?.tipo === "opp" ? dirTexto : `${dirTexto} (revisar)`), personaElegida?.texto ?? (per?.tipo === "asi" ? `${per.texto} (revisar)` : null)]
        .filter(Boolean)
        .join(" · ") || "nota",
    });
  };

  // ---- 2 · CREAR NUEVO CONTACTO ----
  const puedeContacto =
    texto.trim() !== "" && cNombre.trim() !== "" && (cTel.trim() !== "" || cCorreo.trim() !== "") && cTipo !== "" && (cTipo !== "otro" || cOtro.trim() !== "");
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
    await meter({
      ...base(),
      oportunidadId: null,
      persona: null,
      dondeTexto: null,
      nuevoContacto: c,
      resumen: `Contacto nuevo: ${c.nombre}`,
    });
  };

  // ---- 3 · CREAR NUEVA OPP ----
  const hayContactoOpp = oContacto !== "" || (oNombre.trim() !== "" && (oTel.trim() !== "" || oCorreo.trim() !== ""));
  const puedeOpp = texto.trim() !== "" && oDir.trim() !== "" && hayContactoOpp && !preparando;
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
      setModo("contacto");
      setCNombre(c.nombre);
      setCTel(c.telefono ?? "");
      setCCorreo(c.correo ?? "");
      setCTipo(c.tipo);
      setCOtro(c.otro ?? "");
    } else if (n.nueva && n.dondeTexto) {
      setModo("opp");
      setODir(n.dondeTexto);
      setOClave(n.claveId ?? null);
      setOContacto(n.nueva.contacto ?? "");
      setONombre(n.nueva.contactoNombre ?? "");
      setOTel(n.nueva.contactoTelefono ?? "");
      setOCorreo(n.nueva.contactoCorreo ?? "");
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ---- piezas ----
  const campoNota = (rows: number) => (
    <label className="mt-4 block">
      <span className={ETQ}>{modo === "nota" ? "Qué ha pasado" : "Nota *"}</span>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={rows}
        placeholder={modo === "opp" ? "Qué quieren, cómo lo has sabido… todo lo demás, aquí." : "Escríbelo o díctalo con el micro del teclado."}
        className={CAMPO + " mt-1 resize-y leading-relaxed"}
      />
    </label>
  );

  // Lo elegido, en grande, con su aspa para quitarlo.
  const elegido = (txt: string, pista: string | null, quitar: () => void) => (
    <div className="mt-1 flex min-h-[56px] items-center gap-2 rounded-xl border border-[#8a6410] bg-form-nuevo px-3.5 py-2.5 text-[18px]">
      <span className="min-w-0 flex-1 font-semibold leading-snug text-[#5c4208]">
        {txt}
        {pista && <span className="block text-[14px] font-normal opacity-75">{pista}</span>}
      </span>
      <button type="button" aria-label="Quitar" onClick={quitar} className="grid size-10 place-items-center text-2xl text-[#5c4208]/70">
        ×
      </button>
    </div>
  );

  const botonGuardar = (puede: boolean, hacer: () => void, falta: string | null) => (
    <>
      {error && <p className="mt-3 text-[14px] font-semibold text-alerta">{error}</p>}
      <button
        type="button"
        disabled={!puede}
        onClick={hacer}
        className="mt-5 w-full rounded-2xl bg-lima py-4 text-[18px] font-extrabold text-carbon shadow-sm transition active:scale-[0.99] disabled:bg-black/10 disabled:text-carbon/35"
      >
        Guardar
      </button>
      {!puede && falta && <p className="mt-1.5 text-center text-[13px] text-carbon/55">{falta}</p>}
    </>
  );

  const bloqueFotos = (
    <div className="mt-4">
      <span className={ETQ}>Fotos</span>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {fotos.map((f, i) => (
          <div key={f.vista} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.vista} alt={`Foto ${i + 1}`} className="size-16 rounded-lg border border-[#8a6410]/40 object-cover" />
            <button
              type="button"
              aria-label="Quitar la foto"
              onClick={() => setFotos((a) => a.filter((x) => x !== f))}
              className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full border border-[#8a6410] bg-white text-[13px] text-[#5c4208]"
            >
              ×
            </button>
          </div>
        ))}
        {/* DOS BOTONES (Monica, 8-oct-2026: "no abre la camara, sino la
            galeria"). Los Android de ahora, si no se pide la camara
            expresamente, abren directamente la galeria. */}
        <button
          type="button"
          disabled={preparando}
          onClick={() => camara.current?.click()}
          className="rounded-xl border border-[#8a6410] bg-form-nuevo px-4 py-3 text-[15px] font-bold text-[#5c4208] disabled:opacity-50"
        >
          {preparando ? "Preparando…" : "📷 Hacer foto"}
        </button>
        <button
          type="button"
          disabled={preparando}
          onClick={() => galeria.current?.click()}
          className="rounded-xl border border-carbon/30 bg-white px-4 py-3 text-[15px] font-semibold text-carbon/75 disabled:opacity-50"
        >
          🖼️ De la galería
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
  );

  const cabeceraCrear = (titulo: string) => (
    <div className="mt-4 flex items-center justify-between">
      <h2 className="text-[16px] font-extrabold uppercase tracking-[0.04em] text-[#5c4208]">{titulo}</h2>
      <button type="button" onClick={volverANota} className="px-1 py-2 text-[15px] font-semibold text-carbon/60 underline">
        Cancelar
      </button>
    </div>
  );

  return (
    <div className="mx-auto min-h-screen max-w-[560px] bg-[#fcf8e7] px-4 pb-24 pt-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-[18px] font-extrabold uppercase tracking-[0.04em] text-[#5c4208]">Nota rápida</h1>
        <span className={"rounded-full px-2.5 py-0.5 text-[11px] font-bold " + (red ? "bg-lima-soft text-lima-dark" : "bg-amber-100 text-amber-900")}>
          {red ? (enviando ? "enviando…" : "con conexión") : "sin conexión"}
        </span>
      </div>
      {listas && <p className="mt-0.5 text-[12px] text-carbon/55">{listas.quien}</p>}
      {!listas && (
        <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
          Todavía no tengo las listas de direcciones y personas. Ábrelo una vez con cobertura y se quedan guardadas en el móvil.
        </p>
      )}
      {sinSesion && (
        <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
          Tienes que volver a entrar para enviar las notas. No se pierde nada: siguen en el móvil.{" "}
          <a href="/entrar?volver=/satelite" className="font-bold underline">
            Entrar
          </a>
        </p>
      )}

      {/* ================= LA NOTA ================= */}
      {modo === "nota" && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => aCrearContacto()}
              className="rounded-xl border border-[#8a6410] bg-form-nuevo px-2 py-3 text-[15px] font-bold leading-tight text-[#5c4208]"
            >
              + Crear nuevo contacto
            </button>
            <button
              type="button"
              onClick={() => aCrearOpp()}
              className="rounded-xl border border-[#8a6410] bg-form-nuevo px-2 py-3 text-[15px] font-bold leading-tight text-[#5c4208]"
            >
              + Crear nueva opp
            </button>
          </div>

          {campoNota(6)}

          <h2 className="mt-5 text-[14px] font-extrabold uppercase tracking-[0.05em] text-[#5c4208]">A qué hace referencia</h2>

          <div className="mt-2">
            <span className={ETQ}>Una dirección</span>
            {dir === null ? (
              <Elegir
                id="sat_dir"
                nombre=""
                // Primero las opps, por su nombre; luego las direcciones que ya
                // tenemos aunque no tengan opp abierta (13-oct-2026).
                opciones={[...(listas?.oportunidades ?? []), ...(listas?.direcciones ?? [])]}
                valor=""
                alElegir={(v) => {
                  if (!v) return;
                  if (v.startsWith("clave:")) {
                    const d = listas?.direcciones?.find((x) => x.valor === v);
                    setDir({ tipo: "clave", id: v.slice("clave:".length), texto: d?.texto ?? "" });
                  } else setDir({ tipo: "opp", valor: v });
                }}
                vacio="busca la dirección…"
                marco="border-carbon/40"
                conPista
                grande
                clase="mt-1"
                crearNueva={(q) => aCrearOpp(q)}
                guardarAsi={(q) => setDir({ tipo: "asi", texto: q })}
              />
            ) : dir.tipo === "opp" ? (
              elegido(oppElegida?.texto ?? "(oportunidad)", oppElegida?.pista ?? null, () => setDir(null))
            ) : dir.tipo === "asi" ? (
              elegido(dir.texto, "se guarda así y la revisas después en el PC", () => setDir(null))
            ) : (
              <>
                {elegido(dir.texto, "dirección que ya tenemos, sin opp abierta", () => setDir(null))}
                {/* Una nota no cuelga de una direccion sin opp: o nace la opp,
                    o se revisa en el PC. */}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => aCrearOpp(dir.texto, dir.id)}
                    className="rounded-xl border border-[#5c4208] bg-[#5c4208] py-3 text-[15px] font-bold text-white"
                  >
                    Crear opp nueva aquí
                  </button>
                  <button
                    type="button"
                    onClick={() => setDir({ tipo: "asi", texto: dir.texto })}
                    className="rounded-xl border border-carbon/30 bg-white py-3 text-[15px] font-bold leading-tight text-carbon/75"
                  >
                    Guardarla así, la reviso después
                  </button>
                </div>
              </>
            )}
            {deOtro && (
              <p className="mt-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[13px] text-amber-900">
                Esta oportunidad es de <b>{deOtro}</b>. Puedes guardar la nota igualmente.
              </p>
            )}
          </div>

          <div className="mt-4">
            <span className={ETQ}>Una persona</span>
            {per === null ? (
              <Elegir
                id="sat_per"
                nombre=""
                opciones={listas?.personas ?? []}
                valor=""
                alElegir={(v) => v && setPer({ tipo: "lista", valor: v })}
                vacio="busca la persona…"
                marco="border-carbon/40"
                conPista
                grande
                clase="mt-1"
                crearNueva={(q) => aCrearContacto(q)}
                guardarAsi={(q) => setPer({ tipo: "asi", texto: q })}
              />
            ) : per.tipo === "lista" ? (
              elegido(personaElegida?.texto ?? "(persona)", personaElegida?.pista ?? null, () => setPer(null))
            ) : (
              elegido(per.texto, "se guarda así y la revisas después en el PC", () => setPer(null))
            )}
          </div>

          {bloqueFotos}

          {botonGuardar(
            puedeNota && !(dir?.tipo === "clave"),
            guardarNota,
            texto.trim() === ""
              ? null
              : dir?.tipo === "clave"
                ? "Elige arriba: ¿opp nueva aquí o la revisas después?"
                : !haySitio
                  ? "Falta a qué hace referencia: una dirección o una persona."
                  : null,
          )}
        </>
      )}

      {/* ================= CREAR NUEVO CONTACTO ================= */}
      {modo === "contacto" && (
        <section>
          {cabeceraCrear("Nuevo contacto")}
          <p className="mt-1 text-[13px] text-carbon/65">Se apunta y lo completas en el PC, desde Pendientes.</p>
          {dirTexto && (
            <p className="mt-2 rounded-lg bg-white px-3 py-2 text-[14px] text-carbon/75">
              Sobre: <b>{dirTexto}</b>
            </p>
          )}
          <label className="mt-3 block">
            <span className={ETQ}>Nombre *</span>
            <input value={cNombre} onChange={(e) => setCNombre(e.target.value)} autoComplete="off" className={CAMPO + " mt-1"} />
          </label>
          {parecido && (
            <p className="mt-1 text-[13px] text-amber-900">
              Ya hay alguien parecido: <b>{parecido.texto}</b>
              {parecido.pista ? ` · ${parecido.pista}` : ""}. Si es él, cancela y búscalo en «Una persona».
            </p>
          )}
          <label className="mt-3 block">
            <span className={ETQ}>Teléfono</span>
            <input value={cTel} onChange={(e) => setCTel(e.target.value)} inputMode="tel" className={CAMPO + " mt-1"} />
          </label>
          <label className="mt-3 block">
            <span className={ETQ}>Correo</span>
            <input value={cCorreo} onChange={(e) => setCCorreo(e.target.value)} inputMode="email" autoComplete="off" className={CAMPO + " mt-1"} />
          </label>
          <p className="mt-1 text-[12px] text-carbon/55">Al menos uno de los dos.</p>
          <div className="mt-3">
            <span className={ETQ}>Qué es *</span>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {TIPOS_CONTACTO.map((t) => (
                <button
                  key={t.valor}
                  type="button"
                  onClick={() => setCTipo(t.valor)}
                  className={
                    "rounded-xl border py-3 text-[16px] font-bold transition " +
                    (cTipo === t.valor ? "border-[#5c4208] bg-[#5c4208] text-white" : "border-carbon/30 bg-white text-carbon/75")
                  }
                >
                  {t.texto}
                </button>
              ))}
            </div>
            {cTipo === "otro" && (
              <input value={cOtro} onChange={(e) => setCOtro(e.target.value)} placeholder="¿Qué es? (portero, arquitecto…)" className={CAMPO + " mt-2"} />
            )}
          </div>
          {campoNota(5)}
          {botonGuardar(
            puedeContacto,
            guardarContacto,
            !cNombre.trim()
              ? "Falta el nombre."
              : !cTel.trim() && !cCorreo.trim()
                ? "Falta el teléfono o el correo."
                : cTipo === ""
                  ? "Falta qué es."
                  : cTipo === "otro" && !cOtro.trim()
                    ? "Escribe qué es."
                    : !texto.trim()
                      ? "Falta la nota."
                      : null,
          )}
        </section>
      )}

      {/* ================= CREAR NUEVA OPP ================= */}
      {modo === "opp" && (
        <section>
          {cabeceraCrear("Nueva opp")}
          <p className="mt-1 text-[13px] text-carbon/65">La dirección y una persona de contacto. Lo demás, a la nota. Se completa en el PC.</p>
          <label className="mt-3 block">
            <span className={ETQ}>Dirección *</span>
            <input
              value={oDir}
              onChange={(e) => {
                setODir(e.target.value);
                setOClave(null);
              }}
              placeholder="calle, número y municipio"
              autoComplete="off"
              className={CAMPO + " mt-1"}
            />
          </label>
          {oClave && <p className="mt-1 text-[13px] text-carbon/65">Dirección que ya tenemos, sin opp abierta.</p>}
          {oppParecida && (
            <p className="mt-1 text-[13px] text-amber-900">
              Ya hay una opp parecida: <b>{oppParecida.texto}</b>. Si es esa, cancela y búscala en «Una dirección».
            </p>
          )}
          <div className="mt-3">
            <span className={ETQ}>Persona de contacto *</span>
            {oContacto ? (
              elegido(
                listas?.personas.find((p) => p.valor === oContacto)?.texto ?? "(persona)",
                listas?.personas.find((p) => p.valor === oContacto)?.pista ?? null,
                () => setOContacto(""),
              )
            ) : (
              <>
                <input value={oNombre} onChange={(e) => setONombre(e.target.value)} placeholder="nombre" autoComplete="off" className={CAMPO + " mt-1"} />
                <input value={oTel} onChange={(e) => setOTel(e.target.value)} placeholder="teléfono" inputMode="tel" className={CAMPO + " mt-2"} />
                <input value={oCorreo} onChange={(e) => setOCorreo(e.target.value)} placeholder="correo" inputMode="email" autoComplete="off" className={CAMPO + " mt-2"} />
                <p className="mt-1 text-[12px] text-carbon/55">Teléfono o correo, al menos uno.</p>
              </>
            )}
          </div>
          {campoNota(5)}
          {bloqueFotos}
          {botonGuardar(
            puedeOpp,
            guardarOpp,
            !oDir.trim()
              ? "Falta la dirección."
              : !hayContactoOpp
                ? "Falta la persona de contacto, con su teléfono o su correo."
                : !texto.trim()
                  ? "Falta la nota."
                  : null,
          )}
        </section>
      )}

      {aviso && <p className="mt-3 rounded-xl bg-lima-soft px-3 py-2 text-center text-[14px] font-semibold text-lima-dark">{aviso}</p>}

      {/* ---- lo que espera en el movil ---- */}
      {cola.length > 0 && (
        <section className="mt-6 rounded-2xl border border-black/10 bg-white p-3">
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
    </div>
  );
}
