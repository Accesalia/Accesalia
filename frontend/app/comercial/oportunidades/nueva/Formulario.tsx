"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Elegir, type Opcion } from "../../../components/Elegir";
import { Marcar } from "../../../components/Marcar";
import type { OpcionesOportunidad } from "../../../../lib/altaOportunidad";
import { PASOS_DE_ARRANQUE, QUE_ES } from "../../../../lib/oportunidadVocabulario";

// DAR DE ALTA UNA OPORTUNIDAD — SU DISEÑO, hecho por ella en Figma (28-sep-2026).
//
// LAS MEDIDAS SON SUYAS y se copian tal cual. Sobre 1252 de pagina:
//   · cabecera: titulo · numero 190 · fecha 128 · comercial 180
//   · tarjetas: 528 el diario, 707 los datos, 28 de separacion
//   · cada fila: rotulo 128 · campo 362 · texto azul 75 · boton 83, 10 de hueco.
//     Esos 10 son el MINIMO y marcan donde empieza todo lo demas;
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

const rotulo = "text-[10px] font-bold uppercase leading-[1.3] tracking-[0.05em] text-[#237812]";
const etiqueta = "block text-[10px] font-bold uppercase tracking-[0.05em] text-carbon/70";
const etiquetaClara = "block text-[10px] font-bold uppercase tracking-[0.05em] text-[#fff4c6]/85";
const apoyo = "block text-[11px] font-bold leading-[1.3] text-accion";
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

function Fila({ nombre, primera, children }: { nombre: string; primera?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={
        "grid grid-cols-[128px_minmax(0,362fr)_75px_83px] items-center gap-x-[10px] py-[14px] " +
        (primera ? "" : "border-t border-raya")
      }
    >
      <span className={rotulo}>{nombre}</span>
      {children}
    </div>
  );
}

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
      <span className="whitespace-pre-line text-[11px] font-bold uppercase leading-[1.2] tracking-[0.04em]">{texto}</span>
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

export function Formulario({
  opciones,
  accion: guardar,
  volver,
}: {
  opciones: OpcionesOportunidad;
  accion: (fd: FormData) => void | Promise<void>;
  volver: string;
}) {
  const hoy = new Date().toISOString().slice(0, 10);

  const comerciales: Opcion[] = opciones.comerciales.map((c) => ({ valor: c.id, texto: c.nombre, pista: c.pista }));
  const comunidades: Opcion[] = opciones.comunidades.map((c) => ({ valor: c.id, texto: c.nombre, pista: c.pista }));
  const administradores: Opcion[] = opciones.administradores.map((a) => ({ valor: a.id, texto: a.nombre, pista: a.pista }));
  const contratas: Opcion[] = opciones.contratas.map((c) => ({ valor: c.id, texto: c.nombre }));
  const canales: Opcion[] = opciones.canales.map((c) => ({ valor: c.id, texto: c.nombre }));

  const soyComercial = opciones.miComercial !== null;

  const [comercial, setComercial] = useState(opciones.miComercial ?? "");
  const [nota, setNota] = useState("");

  const [comunidad, setComunidad] = useState("");
  const [direccion, setDireccion] = useState("");
  const [buscarDireccion, setBuscarDireccion] = useState(false);

  const [admin, setAdmin] = useState("");
  const [quienEsAdmin, setQuienEsAdmin] = useState(false);
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
  const [enviando, setEnviando] = useState(false);

  const codigo = comercial === "" ? "elige comercial" : opciones.codigoDe[comercial] ?? "sin iniciales";

  const hayHilo =
    comunidad !== "" ||
    direccion.trim() !== "" ||
    admin !== "" ||
    adminNuevo !== null ||
    (quienNuevo?.telefono ?? "") !== "" ||
    (quienNuevo?.correo ?? "") !== "";
  const puedeGuardar = nota.trim() !== "" && comercial !== "" && hayHilo && paso !== "";

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
      onSubmit={() => setEnviando(true)}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        const t = e.target as HTMLElement;
        if (t.tagName === "TEXTAREA") return;
        if (t.hasAttribute("data-buscador")) return;
        e.preventDefault();
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
      <div className="flex items-end gap-8">
        <h1 className="min-w-0 flex-1 text-[26px] font-extrabold uppercase leading-[1.05] tracking-tight text-white">
          Estás creando una nueva oportunidad
        </h1>
        <label className="block w-[190px] shrink-0">
          <span className={etiquetaClara}>Número de orden</span>
          <span className={campo + " mt-1 block"}>{codigo}</span>
        </label>
        <label className="block w-[128px] shrink-0">
          <span className={etiquetaClara}>Fecha del contacto</span>
          <input id="fecha_llamada" name="fecha_llamada" type="date" defaultValue={hoy} className={campo + " mt-1"} />
        </label>
        <Elegir
          id="comercial"
          nombre="Comercial que la lleva"
          opciones={comerciales}
          valor={comercial}
          alElegir={setComercial}
          clase="w-[180px] shrink-0"
          tinta="text-[#fff4c6]/85"
          marco="border-carbon/70"
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-6">
        <p className="max-w-[768px] text-sm text-white">
          Lo importante de verdad: reflejar qué te han contado
          {soyComercial ? "" : " y a qué comercial le toca"}. El resto, se puede completar después.
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <Link href={volver} className="rounded-lg bg-white px-5 py-2 text-sm text-carbon/80 transition hover:text-carbon">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={!puedeGuardar || enviando}
            className="rounded-lg bg-lima px-7 py-2 text-sm font-bold text-white transition hover:bg-lima-dark disabled:cursor-not-allowed disabled:bg-white/25 disabled:text-white/50"
          >
            {enviando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid items-start gap-7 lg:grid-cols-[minmax(0,528fr)_minmax(0,707fr)]">
        {/* ============ lo que me cuentan, y lo que hago ============ */}
        <section className="min-w-0 rounded-[14px] border border-[#baa208] bg-papel p-4 shadow-sm">
          <h2 className="text-[19px] font-bold uppercase leading-tight tracking-[0.03em] text-carbon">Qué te han contado</h2>
          <textarea
            id="nota"
            name="nota"
            rows={7}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Me llama Adolfo, que en Carretas 28 quieren poner el SATE. Como es zona ZBE le voy a contar que si no arreglan la accesibilidad del portal no van a poder acceder a subvenciones. Me pasa el teléfono del presi, Alejandro."
            className={campo + " mt-3 min-h-[180px] resize-y"}
          />

          <section className="mt-4 rounded-[14px] border-[3px] border-obligatorio bg-obligatorio-fondo p-3">
            <h3 className="mb-2.5 text-center text-[13px] font-bold uppercase tracking-[0.06em] text-carbon">
              <span className="text-[11px] text-obligatorio">Qué tengo que hacer:</span> Siguiente paso inmediato
            </h3>
            <div className="grid grid-cols-3 gap-[15px]">
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
        </section>

        {/* ============ qué datos tenemos ============ */}
        <section className="min-w-0 rounded-[14px] border border-[#237812] bg-papel p-4 shadow-sm">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-[19px] font-bold uppercase leading-tight tracking-[0.03em] text-carbon">Qué datos tenemos</h2>
            <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-carbon/60">
              Apunta lo que ya sepas, cuanto más mejor
            </span>
          </div>
          <div className="mt-2.5 border-t border-carbon" />

          {/* ---- la dirección ---- */}
          <Fila nombre="Dirección de la comunidad" primera>
            {buscarDireccion ? (
              <Elegir
                id="comunidad"
                nombre=""
                opciones={comunidades}
                valor={comunidad}
                alElegir={setComunidad}
                vacio="busca la que ya tenemos"
                marco="border-carbon/70"
                abrirAlMontar
              />
            ) : (
              <input
                id="direccion_provisional"
                name="direccion_provisional"
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="dirección del edificio"
                className={campo}
              />
            )}
            <span className={apoyo + " text-right"}>{buscarDireccion ? "Mejor la escribo" : "Si ya existe, selecciónala"}</span>
            <button
              type="button"
              onClick={() => {
                if (buscarDireccion) {
                  setComunidad("");
                  setBuscarDireccion(false);
                } else {
                  setDireccion("");
                  setBuscarDireccion(true);
                }
              }}
              className={accion}
            >
              {buscarDireccion ? "Aquí" : "Aquí ▾"}
            </button>
          </Fila>

          {/* ---- el administrador ---- */}
          <Fila nombre="¿Quién es su administrador?">
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
                marco="border-carbon/70"
                conPista
              />
            )}
            <span className={apoyo + " text-right"}>{adminNuevo ? "Lo estás creando" : "Es un nuevo administrador"}</span>
            <button type="button" onClick={() => setCreando("admin")} className={accion}>
              {adminNuevo ? "Cambiar" : "+ Crearlo"}
            </button>
            {ocultos("admin_nuevo", adminNuevo)}
          </Fila>

          {/* ---- quién ha contactado ---- */}
          <div className="grid grid-cols-[128px_minmax(0,362fr)_75px_83px] items-center gap-x-[10px] border-t border-raya py-[14px]">
            <span className={rotulo}>Quién ha contactado para pedirlo</span>
            <div className="flex items-center gap-3">
              <Casilla
                texto={"Fue el mismo\nadministrador"}
                nombre="quien_es_admin"
                marcado={quienEsAdmin}
                alMarcar={(v) => {
                  setQuienEsAdmin(v);
                  if (v) {
                    setQuien("");
                    setQuienNuevo(null);
                  }
                }}
                tono="marron"
                enLinea
                clase="h-[52px] w-[150px] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className={apoyo + " mb-1 whitespace-nowrap text-center"}>Fue otra persona conocida</span>
                {quienNuevo ? (
                  fichaNueva(quienNuevo, () => setQuienNuevo(null))
                ) : (
                  <Elegir
                    id="quien"
                    nombre=""
                    opciones={opciones.quienes}
                    valor={quien}
                    alElegir={(v) => {
                      setQuien(v);
                      if (v) setQuienEsAdmin(false);
                    }}
                    vacio="selecciona quién"
                    desactivado={quienEsAdmin}
                    marco="border-carbon/70"
                    conPista
                    dosLineas
                  />
                )}
              </div>
            </div>
            <div className="col-span-2 flex flex-col items-center">
              <span className={apoyo + " mb-1 whitespace-nowrap"}>Fue un nuevo contacto</span>
              <button type="button" onClick={() => setCreando("quien")} className={accion + " w-[83px]"}>
                {quienNuevo ? "Cambiar" : "+ Crearlo"}
              </button>
            </div>
            {ocultos("quien_nuevo", quienNuevo)}
          </div>

          {/* ---- qué quieren ---- */}
          <div className="grid grid-cols-[128px_minmax(0,1fr)] items-center gap-x-[10px] border-t border-raya py-[14px]">
            <span className={rotulo}>En qué dicen que están interesados</span>
            <Marcar
              id="tipos"
              opciones={opciones.tipos.map((t) => ({ valor: t.id, texto: t.nombre, pista: t.pista }))}
              vacio="De lo que vendemos, qué quieren"
              ancho="w-[290px]"
            />
          </div>

          {/* ---- la tercera persona ---- */}
          <div className="border-t border-raya py-[14px]">
            <section className="mx-auto max-w-[572px] rounded-[14px] border border-marco bg-[#ecefec] px-4 py-3">
              <h3 className="text-center text-[13px] font-bold uppercase tracking-[0.07em] text-[#0c1a64]">
                Con quién hablo de esto a partir de ahora
              </h3>
              <p className="mb-3 mt-0.5 text-center text-sm text-carbon/60">
                (quien va a ser mi contacto para ir a verlo, enviar la hoja de encargo, etc.)
              </p>
              <div className="grid grid-cols-3 gap-6 px-[45px]">
                <Casilla
                  texto="La persona que me llamó"
                  nombre="habla_llamo"
                  marcado={hablaLlamo}
                  alMarcar={setHablaLlamo}
                  tono="marron"
                  clase="h-[75px]"
                />
                <Casilla
                  texto="El administrador"
                  nombre="habla_admin"
                  marcado={hablaAdmin}
                  alMarcar={setHablaAdmin}
                  tono="marron"
                  clase="h-[75px]"
                />
                <Casilla
                  texto={otroNuevo ? otroNuevo.nombre : "Otro (crear)"}
                  marcado={otroNuevo !== null}
                  alMarcar={(v) => (v ? setCreando("otro") : setOtroNuevo(null))}
                  tono="marron"
                  clase="h-[75px]"
                />
              </div>
              {ocultos("otro_nuevo", otroNuevo)}
            </section>
          </div>

          {/* ---- datos extra ---- */}
          <div className="grid grid-cols-[128px_minmax(0,1fr)] items-start gap-x-[10px] border-t border-raya py-[14px]">
            <span className={rotulo}>Datos extra</span>
            <div className="w-[320px]">
              <span className={etiqueta}>Cómo nos conocieron</span>
              <Elegir id="canal" nombre="" opciones={canales} vacio="—" clase="mt-1" marco="border-carbon/70" />
            </div>
          </div>
        </section>
      </div>

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
