"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Elegir, type Opcion } from "../../../components/Elegir";
import { Marcar } from "../../../components/Marcar";
import type { OpcionesOportunidad } from "../../../../lib/altaOportunidad";
import { PASOS_DE_ARRANQUE, RELACIONES } from "../../../../lib/oportunidadVocabulario";

// DAR DE ALTA UNA OPORTUNIDAD — SU DISEÑO, hecho por ella en Figma (28-sep-2026).
//
// LAS MEDIDAS SON SUYAS, sacadas del Figma, y no se "redondean" ni se cambian
// por un reparto automatico: se las trabajo una por una y la primera vez las
// sustitui por "que todo se estire", que es justo lo que las rompe.
//
// Sobre un ancho de pagina de 1252 (1300 menos los margenes):
//   · cabecera: titulo 585 · numero 190 · fecha 128 · comercial 180 (el nombre
//     de un comercial no necesita mas, y asi el titulo va en una sola linea)
//   · tarjetas: 528 la del diario, 707 la de los datos, 28 de separacion
//   · cada fila de datos: rotulo 128 · campo 362 · texto azul 75 · boton 83, y
//     10 de separacion entre columnas. Esos 10 son la distancia que hay en su
//     maqueta entre el rotulo y el campo, y son EL MINIMO: marcan donde empieza
//     todo lo demas, para que el campo sea lo mas ancho posible y todo caiga en
//     la misma vertical. Con esos numeros los campos empiezan en 138 y la fila
//     termina en 678, que es justo lo que ella tiene.
//   · "quien ha contactado": casilla 160 · desplegable 151 · boton 83
//   · "en que dicen": 237, y lo marcado crece a su derecha
//   · la caja de con quien hablo: 572 de ancho, casillas de 75 de alto
//
// Lo demas que decidio ella:
//   · fondo OSCURO para no confundir un alta con una ficha ya creada;
//   · "que tengo que hacer" va con el diario —lo que me cuentan y lo que hago—
//     y en rojo, porque no es opcional;
//   · cada boton azul lleva al lado el texto que explica para que sirve;
//   · marron para "con quien hablo", azul marino para el paso siguiente: no
//     todas las casillas marcadas hablan de lo mismo;
//   · "fue el mismo administrador" se marca de una vez, porque el 90% de las
//     veces lo es y elegirlo dos veces fastidia al comercial.

const rotulo = "text-[10px] font-bold uppercase leading-[1.3] tracking-[0.05em] text-[#237812]";
const etiqueta = "block text-[10px] font-bold uppercase tracking-[0.05em] text-carbon/70";
const etiquetaClara = "block text-[10px] font-bold uppercase tracking-[0.05em] text-[#fff4c6]/85";
const apoyo = "block text-[11px] font-bold leading-[1.3] text-accion";
const campo =
  "w-full rounded-lg border border-carbon/70 bg-white px-3 py-1.5 text-sm text-carbon outline-none transition placeholder:text-carbon/55 focus:border-lima";
const accion =
  "inline-flex h-[34px] shrink-0 items-center justify-center gap-1 rounded-[5px] border border-accion-marco bg-accion px-2 text-xs font-bold uppercase leading-tight text-white shadow-sm transition hover:bg-accion-hover";

/** Una fila de la tarjeta de datos. Cuatro columnas fijas, las suyas: el rotulo,
 *  el campo, el texto que explica el boton, y el boton. */
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
  clase = "",
}: {
  texto: string;
  nombre?: string;
  marcado: boolean;
  alMarcar: (v: boolean) => void;
  tono: "marron" | "marino";
  conCuadro?: boolean;
  clase?: string;
}) {
  const relleno =
    tono === "marron" ? "border-marcado-hablo bg-marcado-hablo text-[#fff5cc]" : "border-marcado-paso bg-marcado-paso text-white";
  return (
    <label
      className={
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border px-2 text-center transition " +
        (marcado ? relleno : "border-marco bg-white text-carbon/80 hover:border-accion") +
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
        className={conCuadro ? "size-5 " + (marcado ? "accent-white" : "accent-accion") : "sr-only"}
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
  const administraciones: Opcion[] = opciones.administraciones.map((a) => ({ valor: a.id, texto: a.nombre, pista: a.pista }));
  const canales: Opcion[] = opciones.canales.map((c) => ({ valor: c.id, texto: c.nombre }));
  const contratas: Opcion[] = opciones.contratas.map((c) => ({ valor: c.id, texto: c.nombre }));
  const relaciones: Opcion[] = RELACIONES.map((r) => ({ valor: r.valor, texto: r.texto, pista: r.pista }));

  const soyComercial = opciones.miComercial !== null;

  const [comercial, setComercial] = useState(opciones.miComercial ?? "");
  const [nota, setNota] = useState("");

  const [comunidad, setComunidad] = useState("");
  const [direccion, setDireccion] = useState("");
  const [buscarDireccion, setBuscarDireccion] = useState(false);

  const [admin, setAdmin] = useState("");
  const [modalAdmin, setModalAdmin] = useState(false);
  const [anNombre, setAnNombre] = useState("");
  const [anTel, setAnTel] = useState("");
  const [anMail, setAnMail] = useState("");
  const [anEmpresa, setAnEmpresa] = useState("");
  const adminNuevo = anNombre.trim() !== "";

  const [quienEsAdmin, setQuienEsAdmin] = useState(false);
  const [quien, setQuien] = useState("");
  const [modalQuien, setModalQuien] = useState(false);
  const [qnNombre, setQnNombre] = useState("");
  const [qnTel, setQnTel] = useState("");
  const [qnMail, setQnMail] = useState("");
  const [qnRelacion, setQnRelacion] = useState("");
  const [qnContrata, setQnContrata] = useState("");
  const quienNuevo = qnNombre.trim() !== "";

  const [hablaLlamo, setHablaLlamo] = useState(false);
  const [hablaAdmin, setHablaAdmin] = useState(false);
  const [hablaOtro, setHablaOtro] = useState(false);
  const [modalHablo, setModalHablo] = useState(false);
  const [contacto, setContacto] = useState("");
  const [coNombre, setCoNombre] = useState("");
  const [coTel, setCoTel] = useState("");
  const [coMail, setCoMail] = useState("");

  const [paso, setPaso] = useState("");
  const [enviando, setEnviando] = useState(false);

  // El numero que le toca, en cuanto hay comercial. Lo quieren VER antes de
  // guardar, para apuntarlo y hacer su seguimiento.
  const codigo = comercial === "" ? "elige comercial" : opciones.codigoDe[comercial] ?? "sin iniciales";

  const hayHilo =
    comunidad !== "" || direccion.trim() !== "" || admin !== "" || adminNuevo || qnTel.trim() !== "" || qnMail.trim() !== "";
  const puedeGuardar = nota.trim() !== "" && comercial !== "" && hayHilo && paso !== "";

  const quitarAdminNuevo = () => {
    setAnNombre("");
    setAnTel("");
    setAnMail("");
    setAnEmpresa("");
  };
  const quitarQuienNuevo = () => {
    setQnNombre("");
    setQnTel("");
    setQnMail("");
    setQnRelacion("");
    setQnContrata("");
  };
  const quitarOtro = () => {
    setContacto("");
    setCoNombre("");
    setCoTel("");
    setCoMail("");
    setHablaOtro(false);
  };

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

          {/* Sin esto la oportunidad se escapa: por eso va en rojo. */}
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
              <div className="flex items-center gap-2 rounded-lg border border-[#8a6410] bg-form-nuevo px-3 py-1.5 text-sm">
                <span className="min-w-0 flex-1 truncate font-semibold text-[#5c4208]">
                  {anNombre} <span className="font-normal opacity-70">· nuevo</span>
                </span>
                <button type="button" onClick={quitarAdminNuevo} aria-label="Quitar" className="text-[#5c4208]/70 hover:text-[#5c4208]">
                  ×
                </button>
                <input type="hidden" name="admin_nuevo_nombre" value={anNombre} />
                <input type="hidden" name="admin_nuevo_telefono" value={anTel} />
                <input type="hidden" name="admin_nuevo_correo" value={anMail} />
                <input type="hidden" name="admin_nuevo_empresa" value={anEmpresa} />
              </div>
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
            <button type="button" onClick={() => setModalAdmin(true)} className={accion}>
              {adminNuevo ? "Cambiar" : "+ Crearlo"}
            </button>
          </Fila>

          {/* ---- quién ha contactado ---- */}
          <div className="grid grid-cols-[128px_minmax(0,362fr)_75px_83px] items-center gap-x-[10px] border-t border-raya py-[14px]">
            <span className={rotulo}>Quién ha contactado para pedirlo</span>
            {/* Acaba en la MISMA vertical que la direccion y el administrador:
                tenerlos bailando cansa la vista. Por eso la casilla mide lo
                suyo y el desplegable se come el resto. */}
            <div className="flex items-center justify-between">
              <Casilla
                texto={"Fue el mismo\nadministrador"}
                nombre="quien_es_admin"
                marcado={quienEsAdmin}
                alMarcar={(v) => {
                  setQuienEsAdmin(v);
                  if (v) {
                    setQuien("");
                    quitarQuienNuevo();
                  }
                }}
                tono="marron"
                clase="h-[72px] w-[160px] shrink-0 gap-1.5 py-2"
              />
              <div className="w-[151px] shrink-0">
                <span className={apoyo + " mb-1 whitespace-nowrap text-center"}>Fue otra persona conocida</span>
                {quienNuevo ? (
                  <div className="flex items-center gap-2 rounded-lg border border-[#8a6410] bg-form-nuevo px-3 py-1.5 text-sm">
                    <span className="min-w-0 flex-1 truncate font-semibold text-[#5c4208]">{qnNombre}</span>
                    <button type="button" onClick={quitarQuienNuevo} aria-label="Quitar" className="text-[#5c4208]/70">
                      ×
                    </button>
                    <input type="hidden" name="nuevo_marcado" value="1" />
                    <input type="hidden" name="nuevo_nombre" value={qnNombre} />
                    <input type="hidden" name="nuevo_telefono" value={qnTel} />
                    <input type="hidden" name="nuevo_correo" value={qnMail} />
                    <input type="hidden" name="nuevo_relacion" value={qnRelacion} />
                    <input type="hidden" name="nuevo_contrata" value={qnContrata} />
                  </div>
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
                    vacio="selecciónalo"
                    desactivado={quienEsAdmin}
                    marco="border-carbon/70"
                    conPista
                  />
                )}
              </div>
            </div>
            <div className="col-span-2 flex flex-col items-center">
              <span className={apoyo + " mb-1 whitespace-nowrap"}>Fue un nuevo contacto</span>
              <button type="button" onClick={() => setModalQuien(true)} className={accion + " w-[83px]"}>
                {quienNuevo ? "Cambiar" : "+ Crearlo"}
              </button>
            </div>
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
                  texto={coNombre ? coNombre : "Otro (crear)"}
                  marcado={hablaOtro}
                  alMarcar={(v) => (v ? (setHablaOtro(true), setModalHablo(true)) : quitarOtro())}
                  tono="marron"
                  clase="h-[75px]"
                />
              </div>
              <input type="hidden" name="contacto" value={contacto} />
              <input type="hidden" name="contacto_nombre" value={hablaOtro ? coNombre : ""} />
              <input type="hidden" name="contacto_telefono" value={hablaOtro ? coTel : ""} />
              <input type="hidden" name="contacto_correo" value={hablaOtro ? coMail : ""} />
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

      {/* ============ ventana: administrador nuevo ============ */}
      <Ventana
        abierta={modalAdmin}
        titulo="Administrador nuevo"
        pie="Lo justo para poder seguir con la oportunidad. Su ficha se completa después."
        alQuitar={() => {
          quitarAdminNuevo();
          setModalAdmin(false);
        }}
        alCerrar={() => setModalAdmin(false)}
        puede={adminNuevo}
      >
        <div className="grid gap-4 sm:grid-cols-12">
          <Dato id="an_nombre" nombre="Nombre" clase="sm:col-span-5" valor={anNombre} alEscribir={setAnNombre} />
          <Dato id="an_telefono" nombre="Teléfono" clase="sm:col-span-4" valor={anTel} alEscribir={setAnTel} />
          <Dato id="an_correo" nombre="Correo" clase="sm:col-span-3" valor={anMail} alEscribir={setAnMail} />
          <Elegir
            id="an_empresa"
            nombre="Administración de fincas en la que está"
            opciones={administraciones}
            valor={anEmpresa}
            alElegir={setAnEmpresa}
            vacio="todavía no lo sé"
            clase="sm:col-span-12"
            marco="border-carbon/70"
          />
        </div>
      </Ventana>

      {/* ============ ventana: quién ha contactado (nuevo) ============ */}
      <Ventana
        abierta={modalQuien}
        titulo="Contacto nuevo"
        pie="Lo que es decide dónde se guarda: un administrador va a la cartera, un comercial de contrata a su contrata, un vecino a la comunidad."
        alQuitar={() => {
          quitarQuienNuevo();
          setModalQuien(false);
        }}
        alCerrar={() => setModalQuien(false)}
        puede={quienNuevo}
      >
        <div className="grid gap-4 sm:grid-cols-12">
          <Dato id="qn_nombre" nombre="Nombre" clase="sm:col-span-5" valor={qnNombre} alEscribir={setQnNombre} />
          <Dato id="qn_telefono" nombre="Teléfono" clase="sm:col-span-4" valor={qnTel} alEscribir={setQnTel} />
          <Dato id="qn_correo" nombre="Correo" clase="sm:col-span-3" valor={qnMail} alEscribir={setQnMail} />
          <Elegir
            id="qn_relacion"
            nombre="Qué es"
            opciones={relaciones}
            valor={qnRelacion}
            alElegir={setQnRelacion}
            vacio="elige qué es"
            clase={qnRelacion === "contrata" ? "sm:col-span-7" : "sm:col-span-12"}
            marco="border-carbon/70"
          />
          {qnRelacion === "contrata" && (
            <Elegir
              id="qn_contrata"
              nombre="De qué contrata"
              opciones={contratas}
              valor={qnContrata}
              alElegir={setQnContrata}
              clase="sm:col-span-5"
              marco="border-carbon/70"
            />
          )}
        </div>
      </Ventana>

      {/* ============ ventana: con quién hablo (otro) ============ */}
      <Ventana
        abierta={modalHablo}
        titulo="Con quién hablo a partir de ahora"
        pie="La vecina del quinto, el presidente, alguien de la comisión de obras. Si ya lo tenemos, se elige; si no, se escribe."
        alQuitar={() => {
          quitarOtro();
          setModalHablo(false);
        }}
        alCerrar={() => setModalHablo(false)}
        puede={coNombre.trim() !== "" || contacto !== ""}
      >
        <Elegir
          id="contacto_lista"
          nombre="Si ya lo tenemos"
          opciones={opciones.contactos}
          valor={contacto}
          alElegir={setContacto}
          vacio="no está en la lista"
          marco="border-carbon/70"
          conPista
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-12">
          <Dato
            id="co_nombre"
            nombre="Si no está: cómo se llama"
            clase="sm:col-span-5"
            pista="a quien tengo que llamar"
            valor={coNombre}
            alEscribir={setCoNombre}
          />
          <Dato id="co_telefono" nombre="Teléfono" clase="sm:col-span-4" valor={coTel} alEscribir={setCoTel} />
          <Dato id="co_correo" nombre="Correo" clase="sm:col-span-3" valor={coMail} alEscribir={setCoMail} />
        </div>
      </Ventana>
    </form>
  );
}

/** Un campo de una ventana. */
function Dato({
  id,
  nombre,
  clase = "",
  pista,
  valor,
  alEscribir,
}: {
  id: string;
  nombre: string;
  clase?: string;
  pista?: string;
  valor: string;
  alEscribir: (v: string) => void;
}) {
  return (
    <label className={"block min-w-0 " + clase} htmlFor={id}>
      <span className={etiqueta}>{nombre}</span>
      <input
        id={id}
        type="text"
        placeholder={pista}
        value={valor}
        onChange={(e) => alEscribir(e.target.value)}
        className={campo + " mt-1"}
      />
    </label>
  );
}

/** Todas las ventanas iguales. Se quedan montadas aunque esten cerradas, para no
 *  perder lo escrito. */
function Ventana({
  abierta,
  titulo,
  pie,
  children,
  alQuitar,
  alCerrar,
  puede,
}: {
  abierta: boolean;
  titulo: string;
  pie: string;
  children: React.ReactNode;
  alQuitar: () => void;
  alCerrar: () => void;
  puede: boolean;
}) {
  // Se cierra como se cierra cualquier ventana: con la X, pinchando fuera o con
  // Escape. Si no se ha escrito nada, salir equivale a quitarla.
  const salir = () => (puede ? alCerrar() : alQuitar());
  useEffect(() => {
    if (!abierta) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") salir();
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  });

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) salir();
      }}
      className={abierta ? "fixed inset-0 z-50 flex items-center justify-center bg-alta-opp/70 p-4" : "hidden"}
    >
      <div className="relative w-full max-w-[560px] rounded-[16px] border border-marco bg-papel p-5 shadow-xl">
        <button
          type="button"
          onClick={salir}
          aria-label="Cerrar"
          className="absolute right-3 top-2 text-xl leading-none text-carbon/45 transition hover:text-carbon"
        >
          ×
        </button>
        <h3 className="text-center text-[13px] font-bold uppercase tracking-[0.07em] text-[#0c1a64]">{titulo}</h3>
        <p className="mb-4 mt-0.5 text-center text-sm text-carbon/60">{pie}</p>
        {children}
        <div className="mt-5 flex justify-center gap-3">
          <button type="button" onClick={alQuitar} className="rounded-lg bg-white px-5 py-2 text-sm text-carbon/80">
            Quitar
          </button>
          <button
            type="button"
            disabled={!puede}
            onClick={alCerrar}
            className="h-[34px] rounded-[5px] border border-accion-marco bg-accion px-6 text-xs font-bold uppercase text-white shadow-sm transition hover:bg-accion-hover disabled:cursor-not-allowed disabled:border-transparent disabled:bg-carbon/15 disabled:text-carbon/35"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
