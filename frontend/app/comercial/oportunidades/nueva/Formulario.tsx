"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Elegir, type Opcion } from "../../../components/Elegir";
import { Marcar } from "../../../components/Marcar";
import type { OpcionesOportunidad } from "../../../../lib/altaOportunidad";
import { PASOS_DE_ARRANQUE, QUE_ES } from "../../../../lib/oportunidadVocabulario";
import { VentanaDireccion, type DireccionResuelta } from "./VentanaDireccion";
import { columnasDeInteres } from "../../../../lib/columnasInteres";
import { CANALES } from "../../../../lib/tipoDeNota";

// DAR DE ALTA UNA OPORTUNIDAD — SU DISEÑO, hecho por ella en Figma.
//
// SEGUNDA VERSION (7-oct-2026): "la he testeado con los comerciales y me dicen
// que se pierden; veamos si este nuevo orden les aclara. Es casi lo mismo, pero
// colocado de otra manera". Los MISMOS datos y la misma logica; cambia donde va
// cada cosa: una sola tarjeta de arriba abajo —lo que me cuentan, los datos que
// tenemos (con "con quien hablo" a su derecha) y lo que tengo que hacer—.
//
// LAS MEDIDAS SON SUYAS y se copian tal cual (su Figma, 1252 de pagina):
//   · cabecera: titulo · numero 190 · fecha 123 · comercial 230
//   · el diario: rotulo 228, campo 752 x 139
//   · la banda de los datos, gris, entre dos rayas negras; a su derecha la caja
//     de "con quien hablo", 360 de ancho
//   · direccion: rotulo 132 · campo 472 x 40 · texto azul 67 · boton 83
//   · quien contacta: el administrador 229 | "otra persona", caja de 406
//   · que quieren: selector 300 y lo marcado debajo
//   · abajo: "que tengo que hacer" 482 x 118 y los datos extra, 320
//   · el modal de crear contacto: 770 · nombre 238 · telefono 149 · correo 296.
//
// Lo que decidio ella:
//   · fondo OSCURO, para no confundir un alta con una ficha ya creada;
//   · "que tengo que hacer" va con el diario —lo que me cuentan y lo que hago—
//     y en rojo, porque no es opcional;
//   · cada boton azul lleva al lado el texto que explica para que sirve;
//   · marron para "con quien hablo", azul marino para el paso siguiente: no
//     todas las casillas marcadas hablan de lo mismo;
//   · "fue el mismo administrador" se marca de una vez, porque el 90% de las
//     veces lo es y elegirlo dos veces fastidia al comercial;
//   · y UN SOLO SITIO para crear una persona, se llegue por donde se llegue:
//     lo que se marca en "que es" decide donde acaba guardada.

// El rotulo de cada fila, verde y grande (14), con su segunda linea pequeña.
const rotulo = "block text-[14px] font-bold uppercase leading-[1.31] tracking-[0.5px] text-[#237812]";
const rotuloSub = "block text-[9px] font-bold uppercase tracking-[0.5px] text-[#237812]";
// Lo que encabeza un grupo de dentro ("El administrador", "Otra persona").
const titulito = "block text-[14px] font-bold uppercase leading-[13px] tracking-[0.44px] text-[#213A61]";
const enlaceAzul = "text-[12px] font-bold leading-[1.33] text-accion";
const etiqueta = "block text-[10px] font-bold uppercase tracking-[0.05em] text-carbon/70";
const etiquetaClara = "block text-[10px] font-bold uppercase tracking-[0.05em] text-[#fff4c6]/85";
const apoyo = "block text-[11px] font-bold leading-[1.33] text-accion";
const campo =
  "w-full rounded-lg border border-carbon/70 bg-white px-3 py-1.5 text-sm text-carbon outline-none transition placeholder:text-carbon/55 focus:border-lima";
const accion =
  "inline-flex h-[34px] shrink-0 items-center justify-center gap-1 rounded-[5px] border border-accion-marco bg-accion px-2 text-xs font-bold uppercase leading-tight text-white shadow-sm transition hover:bg-accion-hover";
// Los botones de dentro de una ventana de crear: de la familia de lo que se
// esta creando, no del azul de "ir a hacer algo".
const botonCrema =
  "h-[31px] rounded-lg border border-[#8a6410] bg-form-nuevo px-5 text-sm font-semibold text-[#5c4208] transition hover:bg-[#ffeeb0]";

export type Persona = {
  nombre: string;
  telefono: string;
  correo: string;
  /** administrador · contrata · vecino, o vacio cuando es el "otro" de texto. */
  que: string;
  otro: string;
  contrataId: string;
};
const VACIA: Persona = { nombre: "", telefono: "", correo: "", que: "", otro: "", contrataId: "" };

/** Lo que se marca. El color dice DE QUE habla. */
function Casilla({
  texto,
  nombre,
  marcado,
  alMarcar,
  tono,
  conCuadro = true,
  enLinea,
  clase = "",
}: {
  texto: string;
  nombre?: string;
  marcado: boolean;
  alMarcar: (v: boolean) => void;
  tono: "marron" | "marino";
  conCuadro?: boolean;
  /** El texto a la izquierda y la casilla a la derecha, en una caja baja. */
  enLinea?: boolean;
  clase?: string;
}) {
  const relleno =
    tono === "marron"
      ? "border-marcado-hablo bg-marcado-hablo text-[#fff5cc]"
      : "border-marcado-paso bg-marcado-paso text-white";
  const apagado = enLinea ? "text-marcado-paso" : "text-carbon/80";
  return (
    <label
      className={
        "flex cursor-pointer rounded-lg border transition " +
        (enLinea ? "items-center justify-between gap-3 px-3.5 " : "flex-col items-center justify-center gap-2 px-2 text-center ") +
        (marcado ? relleno : "border-marco bg-white " + apagado + " hover:border-accion") +
        " " +
        clase
      }
    >
      <span
        className={
          "whitespace-pre-line uppercase tracking-[0.44px] " +
          // La elegida, mas grande y mas negra: es la que manda (su maqueta).
          (marcado && tono === "marino" ? "text-[14px] font-extrabold leading-[13px]" : "text-[11px] font-bold leading-[13px]")
        }
      >
        {texto}
      </span>
      <input
        type="checkbox"
        name={nombre}
        checked={marcado}
        onChange={(e) => alMarcar(e.target.checked)}
        className={conCuadro ? "size-5 shrink-0 " + (marcado ? "accent-white" : "accent-accion") : "sr-only"}
      />
    </label>
  );
}

/** "CON QUIEN HABLO": una fila por opcion, el texto a la izquierda y el cuadro
 *  a la derecha. La marcada, en marron con su X. */
function CasillaHablo({
  texto,
  nombre,
  marcado,
  alMarcar,
  extra,
  clase = "",
}: {
  texto: string;
  nombre?: string;
  marcado: boolean;
  alMarcar: (v: boolean) => void;
  /** En vez del cuadro, lo que se pulsa (el "+ crear" de otra persona). */
  extra?: React.ReactNode;
  clase?: string;
}) {
  return (
    <label
      className={
        "flex w-[236px] cursor-pointer items-center justify-between gap-3 rounded-lg border px-6 transition " +
        (marcado ? "border-marcado-hablo bg-marcado-hablo text-[#fff5cc]" : "border-marco bg-white text-carbon/80 hover:border-accion") +
        " " +
        clase
      }
    >
      <span className="text-[11px] font-bold uppercase leading-[13px] tracking-[0.44px]">{texto}</span>
      <input type="checkbox" name={nombre} checked={marcado} onChange={(e) => alMarcar(e.target.checked)} className="sr-only" />
      {extra ?? (
        <span
          aria-hidden
          className={
            "grid size-5 shrink-0 place-items-center border text-[13px] font-bold leading-none " +
            (marcado ? "border-[#fff4c6] text-[#fff4c6]" : "border-black")
          }
        >
          {marcado ? "X" : ""}
        </span>
      )}
    </label>
  );
}

export function Formulario({
  opciones,
  eligeComercial,
  accion: guardar,
  volver,
  inicial,
}: {
  opciones: OpcionesOportunidad;
  /** Fijo para el comercial con cartera propia; el resto elige. */
  eligeComercial: boolean;
  accion: (fd: FormData) => void | Promise<void>;
  volver: string;
  /** Lo que llega de "Grabar entrada" cuando la direccion no estaba en la
   *  lista y se dijo "Es nueva" (Monica, 8-oct-2026): la nota, la direccion
   *  escrita y cuando paso, ya puestas. */
  inicial?: { nota: string; direccion: string; fecha: string | null; canal: string | null };
}) {
  const hoy = inicial?.fecha ?? new Date().toISOString().slice(0, 10);

  const comerciales: Opcion[] = opciones.comerciales.map((c) => ({ valor: c.id, texto: c.nombre, pista: c.pista }));
  const comunidades: Opcion[] = opciones.comunidades.map((c) => ({ valor: c.id, texto: c.nombre, pista: c.pista }));
  const administradores: Opcion[] = opciones.administradores.map((a) => ({ valor: a.id, texto: a.nombre, pista: a.pista }));
  const contratas: Opcion[] = opciones.contratas.map((c) => ({ valor: c.id, texto: c.nombre }));
  const canales: Opcion[] = opciones.canales.map((c) => ({ valor: c.id, texto: c.nombre }));

  const soyComercial = opciones.miComercial !== null;

  const [comercial, setComercial] = useState(opciones.miComercial ?? "");
  const [nota, setNota] = useState(inicial?.nota ?? "");
  // Como se entero: la primera nota del diario lo lleva, como todas (8-oct).
  const [canalNota, setCanalNota] = useState(inicial?.canal ?? "");

  const [comunidad, setComunidad] = useState("");
  const [direccion, setDireccion] = useState(inicial?.direccion ?? "");
  const [buscarDireccion, setBuscarDireccion] = useState(false);
  // La ventana de Catastro (3-oct-2026): se abre con Intro o con la lupa, y si
  // se cierra sin terminar lo escrito se queda como provisional.
  const [ventana, setVentana] = useState(false);
  const [resuelta, setResuelta] = useState<DireccionResuelta | null>(null);
  // Una direccion escrita y sin buscar no se guarda por despiste (Monica,
  // 5-oct-2026: la de Fresnedillas se quedo sin accesos porque "ni se me
  // ocurrio" abrir la ventana). Al guardar, se abre sola; si se cierra sin
  // terminar, ESO es dejarla provisional a proposito.
  const [provisionalAdrede, setProvisionalAdrede] = useState(false);

  const [admin, setAdmin] = useState("");
  const [quien, setQuien] = useState("");

  const [hablaLlamo, setHablaLlamo] = useState(false);
  const [hablaAdmin, setHablaAdmin] = useState(false);

  // Las tres personas que se pueden crear. Mismo sitio y mismo modal: lo unico
  // que cambia es donde se guarda el resultado.
  const [adminNuevo, setAdminNuevo] = useState<Persona | null>(null);
  const [quienNuevo, setQuienNuevo] = useState<Persona | null>(null);
  const [otroNuevo, setOtroNuevo] = useState<Persona | null>(null);
  const [creando, setCreando] = useState<null | "admin" | "quien" | "otro">(null);

  const [paso, setPaso] = useState("");
  // "Fue el mismo administrador" (7-oct-2026): ya no es una casilla. Si solo
  // se ha puesto el administrador, es que llamo el; si hay otra persona, llamo
  // ella.
  const quienEsAdmin = (admin !== "" || adminNuevo !== null) && quien === "" && quienNuevo === null;
  const [enviando, setEnviando] = useState(false);

  const codigo = comercial === "" ? "elige comercial" : opciones.codigoDe[comercial] ?? "sin iniciales";

  const hayHilo =
    comunidad !== "" ||
    direccion.trim() !== "" ||
    admin !== "" ||
    adminNuevo !== null ||
    (quienNuevo?.telefono ?? "") !== "" ||
    (quienNuevo?.correo ?? "") !== "";
  // Con quien hablo a partir de ahora: obligatorio, como el siguiente paso
  // (Monica, 5-oct-2026). Y la casilla tiene que apuntar a alguien de verdad:
  // "la persona que me llamo" sin decir quien llamo no es un contacto.
  const hayContacto =
    (hablaLlamo && (quien !== "" || quienNuevo !== null || quienEsAdmin)) ||
    (hablaAdmin && (admin !== "" || adminNuevo !== null)) ||
    otroNuevo !== null;
  const puedeGuardar = nota.trim() !== "" && canalNota !== "" && comercial !== "" && hayHilo && paso !== "" && hayContacto;
  const sinBuscar = !buscarDireccion && !resuelta && direccion.trim() !== "";

  const guardarPersona = (p: Persona) => {
    if (creando === "admin") setAdminNuevo(p);
    if (creando === "quien") setQuienNuevo(p);
    if (creando === "otro") setOtroNuevo(p);
    setCreando(null);
  };
  const descartarPersona = () => {
    if (creando === "admin") setAdminNuevo(null);
    if (creando === "quien") setQuienNuevo(null);
    if (creando === "otro") setOtroNuevo(null);
    setCreando(null);
  };

  const fichaNueva = (p: Persona, quitar: () => void) => (
    <div className="flex h-[32px] items-center gap-2 rounded-lg border border-[#8a6410] bg-form-nuevo px-3 text-sm">
      <span className="min-w-0 flex-1 truncate font-semibold text-[#5c4208]">
        {p.nombre} <span className="font-normal opacity-70">· nuevo</span>
      </span>
      <button type="button" onClick={quitar} aria-label="Quitar" className="text-[#5c4208]/70 hover:text-[#5c4208]">
        ×
      </button>
    </div>
  );

  const ocultos = (pre: string, p: Persona | null) =>
    p ? (
      <>
        <input type="hidden" name={pre + "_nombre"} value={p.nombre} />
        <input type="hidden" name={pre + "_telefono"} value={p.telefono} />
        <input type="hidden" name={pre + "_correo"} value={p.correo} />
        <input type="hidden" name={pre + "_que"} value={p.que} />
        <input type="hidden" name={pre + "_otro"} value={p.otro} />
        <input type="hidden" name={pre + "_contrata"} value={p.contrataId} />
      </>
    ) : null;

  return (
    <form
      action={guardar}
      onSubmit={(e) => {
        if (sinBuscar && !provisionalAdrede) {
          e.preventDefault();
          setVentana(true);
          return;
        }
        setEnviando(true);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        const t = e.target as HTMLElement;
        if (t.tagName === "TEXTAREA") return;
        if (t.hasAttribute("data-buscador")) return;
        e.preventDefault();
        // En la direccion, Intro no salta de campo: abre la ventana de buscar.
        if (t.hasAttribute("data-direccion")) {
          if (direccion.trim()) setVentana(true);
          return;
        }
        const campos = Array.from(
          (e.currentTarget as HTMLFormElement).querySelectorAll<HTMLElement>(
            "input:not([type=hidden]):not([readonly]), select, textarea",
          ),
        ).filter((x) => x.offsetParent !== null);
        const i = campos.indexOf(t);
        if (i >= 0 && i < campos.length - 1) campos[i + 1].focus();
      }}
    >
      {/* ===================== la cabecera ===================== */}
      <div className="flex items-end gap-[36px]">
        <h1 className="min-w-0 flex-1 text-[26px] font-extrabold uppercase leading-[26px] text-white">
          Estás creando una nueva oportunidad
        </h1>
        <label className="block w-[190px] shrink-0">
          <span className={etiquetaClara}>Número de orden</span>
          <span className={campo + " mt-1 block text-carbon/60"}>{codigo}</span>
        </label>
        <label className="block w-[123px] shrink-0">
          <span className={etiquetaClara}>Fecha del contacto</span>
          <input id="fecha_llamada" name="fecha_llamada" type="date" defaultValue={hoy} className={campo + " mt-1"} />
        </label>
        <Elegir
          id="comercial"
          nombre="Comercial que la lleva"
          opciones={comerciales}
          valor={comercial}
          alElegir={setComercial}
          desactivado={!eligeComercial}
          clase="w-[230px] shrink-0"
          tinta="text-[#fff4c6]/85"
          marco="border-black/10"
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-6">
        <p className="max-w-[768px] text-sm text-white">
          Lo importante de verdad: reflejar qué te han contado
          {soyComercial ? "" : " y a qué comercial le toca"}. El resto, se puede completar después.
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <Link href={volver} className="rounded-lg border border-black/15 bg-white px-4 py-2 text-sm text-carbon/75 transition hover:text-carbon">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={!puedeGuardar || enviando}
            className="rounded-lg bg-lima px-6 py-2 text-sm font-bold text-carbon transition hover:bg-lima-dark hover:text-white disabled:cursor-not-allowed disabled:bg-white/25 disabled:text-white/50"
          >
            {enviando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      {/* ===================== la tarjeta, de arriba abajo ===================== */}
      <section className="mt-[37px] overflow-hidden rounded-[14px] border border-[#baa208] bg-papel shadow-sm">
        {/* ---- lo que me cuentan ---- */}
        <div className="flex items-start gap-3 pl-[49px] pr-6 pt-[21px]">
          <h2 className="w-[228px] shrink-0 text-[19px] font-bold uppercase leading-[22px] tracking-[0.57px] text-carbon underline underline-offset-2">
            Qué te han contado
          </h2>
          <div className="min-w-0">
            <textarea
              id="nota"
              name="nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Me llama Adolfo, que en Carretas 28 quieren poner el SATE. Como es zona ZBE le voy a contar que si no arreglan la accesibilidad del portal no van a poder acceder a subvenciones. Me pasa el teléfono del presi, Alejandro."
              className={campo.replace("w-full", "w-[752px]") + " h-[139px] max-w-full resize-y border-marco leading-[17px]"}
            />
            {/* Como te has enterado: lo lleva toda nota del diario, y esta es la
                primera (Monica, 8-oct-2026). Ninguno marcado de salida. */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={etiqueta + " mr-1"}>Cómo te has enterado</span>
              {CANALES.map((c) => (
                <Casilla
                  key={c.valor}
                  texto={c.texto}
                  marcado={canalNota === c.valor}
                  alMarcar={() => setCanalNota(c.valor)}
                  tono="marino"
                  enLinea
                  clase="h-[30px]"
                />
              ))}
              <input type="hidden" name="canal_nota" value={canalNota} />
            </div>
          </div>
        </div>
        <h2 className="mt-[23px] pl-[41px] text-[19px] font-bold uppercase leading-[22px] tracking-[0.57px] text-carbon">Qué datos tenemos</h2>

        {/* ---- la banda de los datos, entre dos rayas ---- */}
        <div className="flex items-start gap-[29px] border-y border-black bg-[#d9d9d9]/50 pb-[18px] pl-[39px] pr-[21px] pt-[24px]">
          <div className="min-w-0 w-[798px] shrink-0">
            {/* ---- la dirección ---- */}
            <div className="flex items-center">
              <div className="w-[140px] shrink-0">
                <span className={rotulo}>Dirección</span>
                <span className={rotuloSub}>del edificio</span>
              </div>
              <div className="w-[472px] shrink-0">
                {buscarDireccion ? (
                  <Elegir
                    id="comunidad"
                    nombre=""
                    opciones={comunidades}
                    valor={comunidad}
                    alElegir={setComunidad}
                    vacio="busca la que ya tenemos"
                    marco="border-black"
                    abrirAlMontar
                  />
                ) : resuelta ? (
                  // Ya buscada: se ve con el nombre y se puede deshacer, como lo
                  // que se crea nuevo en esta misma pantalla.
                  <div className="flex h-[40px] items-center gap-2 rounded-lg border border-accion bg-[#eef3f8] px-3 text-[15px]">
                    <span className="min-w-0 flex-1 truncate font-semibold text-accion-marco" title={resuelta.nombre}>
                      ✓ {resuelta.nombre}
                      <span className="font-normal opacity-70">
                        {" "}
                        · {resuelta.pendiente ? "pendiente de la visita" : `${resuelta.portalIds.length} ${resuelta.portalIds.length === 1 ? "acceso" : "accesos"}`}
                      </span>
                    </span>
                    <button type="button" onClick={() => setResuelta(null)} aria-label="Deshacer" className="text-accion-marco/70 hover:text-accion-marco">
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      id="direccion_provisional"
                      type="text"
                      data-direccion
                      value={direccion}
                      onChange={(e) => {
                        setDireccion(e.target.value);
                        setProvisionalAdrede(false);
                      }}
                      placeholder="dirección del edificio"
                      className="h-[40px] w-full rounded-lg border-[0.5px] border-black bg-white px-3 pr-10 text-[15px] text-carbon outline-none transition placeholder:text-carbon/55 focus:border-lima"
                    />
                    <button
                      type="button"
                      onClick={() => direccion.trim() && setVentana(true)}
                      aria-label="Buscar la dirección en Catastro"
                      title="Buscar en Catastro (o pulsa Intro)"
                      className="absolute right-1.5 top-1/2 flex h-[28px] w-[30px] -translate-y-1/2 items-center justify-center rounded-md border border-accion-marco bg-accion text-white transition hover:bg-accion-hover"
                    >
                      <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.4">
                        <circle cx="8.5" cy="8.5" r="5.5" />
                        <path d="M13 13l4.5 4.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                )}
                {!buscarDireccion && <input type="hidden" name="direccion_provisional" value={direccion} />}
                <input type="hidden" name="nombre_opp" value={resuelta?.nombre ?? ""} />
                <input type="hidden" name="portal_ids" value={resuelta?.portalIds.join(",") ?? ""} />
                <input type="hidden" name="referencia_opp" value={resuelta?.parcela ?? ""} />
              </div>
              <span className={apoyo + " ml-[15px] w-[67px] shrink-0 text-right"}>
                {buscarDireccion
                  ? "Mejor la escribo"
                  : sinBuscar && provisionalAdrede
                    ? "Sin buscar: provisional"
                    : "Si ya existe, selecciónala"}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (buscarDireccion) {
                    setComunidad("");
                    setBuscarDireccion(false);
                  } else {
                    setDireccion("");
                    setResuelta(null);
                    setBuscarDireccion(true);
                  }
                }}
                className={accion + " ml-[8px] w-[83px] text-[12px]"}
              >
                {buscarDireccion ? "Aquí" : "Aquí ▾"}
              </button>
            </div>

            <div className="my-[30px] ml-[10px] border-t border-raya" />

            {/* ---- quién contacta para pedirlo ----
                "El administrador" a la izquierda y "otra persona" en su caja.
                Si solo hay administrador, es que llamo el; si hay otra persona,
                llamo ella (y el administrador sigue siendo el de la comunidad). */}
            <div className="flex items-start">
              <div className="w-[137px] shrink-0 pt-[5px]">
                <span className={rotulo}>Quién contacta</span>
                <span className={rotuloSub}>para pedirlo</span>
              </div>
              <div className="w-[229px] shrink-0 pt-[7px]">
                <span className={titulito + " pl-[5px]"}>El administrador</span>
                <div className="mt-[6px]">
                  {adminNuevo ? (
                    fichaNueva(adminNuevo, () => setAdminNuevo(null))
                  ) : (
                    <Elegir
                      id="administrador"
                      nombre=""
                      opciones={administradores}
                      valor={admin}
                      alElegir={setAdmin}
                      vacio="selecciona de la lista"
                      marco="border-black"
                      conPista
                    />
                  )}
                </div>
                <div className="mt-[8px] flex items-center justify-end gap-2">
                  <span className={enlaceAzul}>{adminNuevo ? "Lo estás creando" : "Es un admin nuevo"}</span>
                  <button type="button" onClick={() => setCreando("admin")} className={accion + " h-[30px] w-[105px] text-[12px]"}>
                    {adminNuevo ? "Cambiar" : "+ Crearlo"}
                  </button>
                </div>
                {ocultos("admin_nuevo", adminNuevo)}
              </div>

              <div className="ml-[26px] min-w-0 flex-1 rounded-lg border border-[#0f1558] bg-[#cfd3c7] px-[17px] pb-[14px] pt-[10px]">
                <span className={titulito}>Otra persona</span>
                <div className="mt-[8px] flex items-center justify-between">
                  <span className={enlaceAzul}>Alguien conocido</span>
                  <span className={enlaceAzul}>Es un nuevo contacto</span>
                </div>
                <div className="mt-[4px] flex items-center justify-between gap-3">
                  <div className="w-[230px] shrink-0">
                    {quienNuevo ? (
                      fichaNueva(quienNuevo, () => setQuienNuevo(null))
                    ) : (
                      <Elegir
                        id="quien"
                        nombre=""
                        opciones={opciones.quienes}
                        valor={quien}
                        alElegir={setQuien}
                        vacio="Selecciona quién"
                        marco="border-black"
                        conPista
                      />
                    )}
                  </div>
                  <button type="button" onClick={() => setCreando("quien")} className={accion + " h-[30px] w-[93px] text-[12px]"}>
                    {quienNuevo ? "Cambiar" : "+ Crearlo"}
                  </button>
                </div>
                {ocultos("quien_nuevo", quienNuevo)}
              </div>
            </div>
            {/* "Fue el mismo administrador" ya no se marca: se deduce. */}
            <input type="hidden" name="quien_es_admin" value={quienEsAdmin ? "on" : ""} />

            <div className="my-[17px] ml-[10px] border-t border-raya" />

            {/* ---- qué quieren ---- */}
            <div className="flex items-start">
              <span className={rotulo + " w-[292px] shrink-0 pt-[6px]"}>De lo que vendemos, qué quieren</span>
              <Marcar
                id="tipos"
                opciones={opciones.tipos.map((t) => ({ valor: t.id, texto: t.nombre, pista: t.pista }))}
                vacio="Interesados en (selecciona)"
                ancho="w-[300px]"
                marco="border-black"
                debajo
                grupos={columnasDeInteres(opciones.tipos)}
              />
            </div>
          </div>

          {/* ---- con quién hablo a partir de ahora ---- */}
          <section className="w-[360px] shrink-0 rounded-[14px] border-[3px] border-white bg-[#ecefec] px-[56px] pb-[25px] pt-[16px]">
            <h3 className="text-center text-[14px] font-bold uppercase leading-[1.35] tracking-[0.88px] text-[#0c1a64]">
              {!hayContacto && <span className="block text-[11px] text-obligatorio">Obligatorio</span>}
              Con quién hablo
              <span className="block text-[11px]">de esto a partir de ahora</span>
            </h3>
            <p className="mt-[6px] text-center text-[14px] leading-[1.35] text-carbon/60">
              (quien va a ser mi contacto para ir a verlo, enviar la hoja de encargo, etc.)
            </p>
            <div className="mt-[15px] flex flex-col items-center gap-[8px]">
              <CasillaHablo
                texto="La persona que me llamó"
                nombre="habla_llamo"
                marcado={hablaLlamo}
                alMarcar={setHablaLlamo}
                clase={"h-[55px] " + (hablaLlamo ? "" : "border-[#3f7a1c]")}
              />
              <CasillaHablo texto="El administrador" nombre="habla_admin" marcado={hablaAdmin} alMarcar={setHablaAdmin} clase="h-[48px]" />
              <CasillaHablo
                texto={otroNuevo ? otroNuevo.nombre : "Otra persona"}
                marcado={otroNuevo !== null}
                alMarcar={(v) => (v ? setCreando("otro") : setOtroNuevo(null))}
                clase="h-[44px]"
                extra={
                  otroNuevo ? undefined : (
                    <span className="flex h-[20px] w-[76px] shrink-0 items-center justify-center rounded-lg border border-black text-[11px] font-bold uppercase tracking-[0.44px] text-carbon/80">
                      + Crear
                    </span>
                  )
                }
              />
            </div>
            {ocultos("otro_nuevo", otroNuevo)}
          </section>
        </div>

        {/* ---- lo que tengo que hacer, y los datos extra ---- */}
        <div className="flex items-start pb-[40px] pt-[20px]">
          <section className="ml-[217px] w-[482px] shrink-0 rounded-[14px] border-[3px] border-obligatorio bg-obligatorio-fondo px-[13px] pb-[13px] pt-[11px]">
            <h3 className="mb-[10px] text-center text-[13px] font-bold uppercase tracking-[0.88px] text-obligatorio">
              <span className="text-[11px] text-[#237812]">Qué tengo que hacer:</span> Siguiente paso inmediato
            </h3>
            <div className="grid grid-cols-3 gap-[12px]">
              {PASOS_DE_ARRANQUE.map((p) => (
                <Casilla
                  key={p.clave}
                  texto={p.texto}
                  marcado={paso === p.clave}
                  alMarcar={(v) => setPaso(v ? p.clave : "")}
                  tono="marino"
                  conCuadro={false}
                  clase="h-[56px]"
                />
              ))}
            </div>
            <input type="hidden" name="paso" value={paso} />
          </section>

          <span className="ml-[71px] shrink-0 pt-[5px] text-[11px] font-bold uppercase leading-[1.35] tracking-[0.88px] text-[#237812]">
            Datos extra
          </span>
          <div className="ml-[11px] w-[320px] shrink-0">
            <span className={etiqueta}>Cómo nos conocieron</span>
            <Elegir id="canal" nombre="" opciones={canales} vacio="—" clase="mt-1" marco="border-black/10" />
          </div>
        </div>
      </section>

      {ventana && (
        <VentanaDireccion
          escrito={direccion.trim()}
          alListo={(r) => {
            setResuelta(r);
            setVentana(false);
          }}
          alCerrar={() => {
            setVentana(false);
            // Cerrar sin terminar es dejarla provisional a proposito.
            if (direccion.trim()) setProvisionalAdrede(true);
          }}
        />
      )}

      {/* ============ UN SOLO sitio para crear una persona ============ */}
      <ModalContacto
        abierto={creando !== null}
        inicial={creando === "admin" ? adminNuevo : creando === "quien" ? quienNuevo : otroNuevo}
        queFijo={creando === "admin" ? "administrador" : undefined}
        contratas={contratas}
        alGuardar={guardarPersona}
        alDescartar={descartarPersona}
      />
    </form>
  );
}

/** CREAR UN CONTACTO NUEVO — su maqueta del 28-sep-2026.
 *
 *  Uno solo para toda la pantalla: se llegue por donde se llegue, crear a una
 *  persona se hace siempre en el mismo sitio. Lo que se marca en QUÉ ES decide
 *  donde acaba guardada, y por eso esta a la vista y no metido en una lista.
 *
 *  Al administrador NO se le pregunta su administracion: puede existir un admin
 *  del que todavia no sepamos de que casa es. Al de contrata si, porque su
 *  ficha cuelga de la contrata. */
function ModalContacto({
  abierto,
  inicial,
  queFijo,
  contratas,
  alGuardar,
  alDescartar,
}: {
  abierto: boolean;
  inicial: Persona | null;
  queFijo?: string;
  contratas: Opcion[];
  alGuardar: (p: Persona) => void;
  alDescartar: () => void;
}) {
  const [p, setP] = useState<Persona>(VACIA);
  const pon = (c: Partial<Persona>) => setP((x) => ({ ...x, ...c }));

  useEffect(() => {
    if (abierto) setP(inicial ?? { ...VACIA, que: queFijo ?? "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") alDescartar();
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  });

  if (!abierto) return null;

  const etiquetaOcre = "block text-[10px] font-bold uppercase tracking-[0.05em] text-[#5c4208]/70";
  const rotuloOcre = "shrink-0 text-[11px] font-bold uppercase tracking-[0.04em] text-[#5c4208]/80";

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) alDescartar();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-alta-opp/70 p-4"
    >
      <div className="relative w-full max-w-[770px] rounded-[14px] border border-[#8a6410] bg-[#fcf8e7] px-6 py-5">
        <button
          type="button"
          onClick={alDescartar}
          aria-label="Cerrar"
          className="absolute right-4 top-3 text-lg leading-none text-carbon/45 transition hover:text-carbon"
        >
          ×
        </button>

        <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c4208]">Crear un contacto nuevo</h3>

        <div className="mt-3 flex gap-3">
          <label className="block w-[238px]">
            <span className={etiquetaOcre}>Nombre</span>
            <input value={p.nombre} onChange={(e) => pon({ nombre: e.target.value })} className={campo + " mt-1"} />
          </label>
          <label className="block w-[149px]">
            <span className={etiquetaOcre}>Teléfono</span>
            <input value={p.telefono} onChange={(e) => pon({ telefono: e.target.value })} className={campo + " mt-1"} />
          </label>
          <label className="block w-[296px]">
            <span className={etiquetaOcre}>Correo</span>
            <input value={p.correo} onChange={(e) => pon({ correo: e.target.value })} className={campo + " mt-1"} />
          </label>
        </div>

        {/* QUÉ ES: lo que decide dónde se guarda. */}
        <div className="mt-5 flex items-stretch gap-4">
          <span className="self-center text-[14px] font-bold uppercase tracking-[0.05em] text-carbon">Qué es</span>
          <div className="border-l border-marco" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-9 gap-y-2">
              {QUE_ES.map((q) => (
                <label key={q.valor} className="flex cursor-pointer items-center gap-2.5">
                  <span className="text-[11px] font-bold uppercase leading-[1.2] tracking-[0.04em] text-[#5c4208]/80">
                    {q.texto}
                  </span>
                  <input
                    type="checkbox"
                    checked={p.que === q.valor}
                    onChange={(e) => pon({ que: e.target.checked ? q.valor : "", otro: "" })}
                    className="size-5 shrink-0 accent-[#5c4208]"
                  />
                </label>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-3">
              <span className={rotuloOcre}>Otro</span>
              <input
                value={p.otro}
                onChange={(e) => pon({ otro: e.target.value, que: e.target.value ? "" : p.que })}
                placeholder="Comisión de obras, pariente de alguien, conocido…"
                className={campo}
              />
            </div>

            {p.que === "contrata" && (
              <div className="mt-3 flex items-center gap-3">
                <span className={rotuloOcre}>Empresa</span>
                <Elegir
                  id="modal_contrata"
                  nombre=""
                  opciones={contratas}
                  valor={p.contrataId}
                  alElegir={(v) => pon({ contrataId: v })}
                  vacio="de qué contrata"
                  marco="border-carbon/70"
                  clase="flex-1"
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-6">
          <button type="button" onClick={alDescartar} className={botonCrema}>
            Descartar
          </button>
          <button
            type="button"
            disabled={p.nombre.trim() === ""}
            onClick={() => alGuardar(p)}
            className={
              botonCrema + " disabled:cursor-not-allowed disabled:border-carbon/20 disabled:bg-black/5 disabled:text-carbon/35"
            }
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
