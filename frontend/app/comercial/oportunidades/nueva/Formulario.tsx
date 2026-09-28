"use client";

import Link from "next/link";
import { useState } from "react";
import { Elegir, type Opcion } from "../../../components/Elegir";
import { Marcar } from "../../../components/Marcar";
import type { OpcionesOportunidad } from "../../../../lib/altaOportunidad";
import { PASOS_DE_ARRANQUE, RELACIONES } from "../../../../lib/oportunidadVocabulario";

// DAR DE ALTA UNA OPORTUNIDAD — montada sobre SU maqueta (27-sep-2026),
// repasada con ella bloque a bloque el 28-sep.
//
// Lo que cambia respecto a ayer, y por que:
//   · la cabecera NO es una tarjeta: sus campos van sobre el fondo, y debajo
//     el texto a la izquierda y los botones a la derecha;
//   · nada de rotulo + etiqueta diciendo lo mismo: donde el rotulo ya lo dice,
//     el campo va sin etiqueta;
//   · la direccion se ESCRIBE por defecto y buscar la existente es el "por si
//     acaso" —al reves que antes: "el comercial perezoso la crea siempre por
//     ahorrar medio segundo en buscar", y asi por lo menos escribe la nueva;
//   · hay TRES personas en esto, no dos: el administrador, quien me pasa el
//     dato, y con quien hablo de los detalles a partir de ahora.

const etiqueta = "block text-[10px] font-bold uppercase tracking-wide text-carbon/70";
const verde = "block text-[10px] font-bold uppercase tracking-wide text-[#237812]";
const caja =
  "w-full rounded-lg border border-marco bg-white px-3 py-1.5 text-sm text-carbon outline-none transition placeholder:text-carbon/55 focus:border-lima";
// Un boton NO se parece a un campo. Un campo es un rectangulo blanco que ocupa
// toda la columna; un boton es una pastilla con color que mide lo que su texto.
// Me lo ha tenido que decir tres veces (Monica, 28-sep-2026).
const boton =
  "inline-flex w-auto items-center gap-1.5 self-start rounded-full border border-lima-dark bg-lima/25 px-3.5 py-1 text-xs font-bold text-carbon shadow-sm transition hover:bg-lima-dark hover:text-white";
const botonPuesto =
  "inline-flex w-auto items-center gap-1.5 self-start rounded-full border border-[#8a6410] bg-form-nuevo px-3.5 py-1 text-xs font-bold text-[#5c4208] shadow-sm";

function Campo({
  id,
  nombre,
  clase = "",
  tipo = "text",
  pista,
  defecto,
  valor,
  alEscribir,
}: {
  id: string;
  nombre: string;
  clase?: string;
  tipo?: string;
  pista?: string;
  defecto?: string;
  valor?: string;
  alEscribir?: (v: string) => void;
}) {
  return (
    <label className={"block min-w-0 " + clase} htmlFor={id}>
      <span className={etiqueta}>{nombre}</span>
      <input
        id={id}
        name={id}
        type={tipo}
        placeholder={pista}
        defaultValue={alEscribir ? undefined : defecto}
        value={alEscribir ? valor : undefined}
        onChange={alEscribir ? (e) => alEscribir(e.target.value) : undefined}
        className={caja + " mt-1"}
      />
    </label>
  );
}

/** Texto arriba, casilla debajo. Se usa para las dos cosas que ella quiso
 *  marcar en vez de elegir: con quien hablo, y que tengo que hacer. */
function Casilla({
  texto,
  nombre,
  marcado,
  alMarcar,
}: {
  texto: string;
  nombre?: string;
  marcado: boolean;
  alMarcar: (v: boolean) => void;
}) {
  return (
    <label
      className={
        "flex w-[175px] cursor-pointer flex-col items-center gap-1.5 rounded-lg border px-3 py-2 text-center transition " +
        (marcado ? "border-lima-dark bg-lima/20" : "border-marco bg-white hover:border-lima")
      }
    >
      <span className="text-[11px] font-bold uppercase leading-tight tracking-wide text-carbon/80">{texto}</span>
      <input
        type="checkbox"
        name={nombre}
        checked={marcado}
        onChange={(e) => alMarcar(e.target.checked)}
        className="size-5 accent-lima-dark"
      />
    </label>
  );
}

export function Formulario({
  opciones,
  accion,
  volver,
}: {
  opciones: OpcionesOportunidad;
  accion: (fd: FormData) => void | Promise<void>;
  volver: string;
}) {
  const hoy = new Date().toISOString().slice(0, 10);

  const comerciales: Opcion[] = opciones.comerciales.map((c) => ({
    valor: c.id,
    texto: c.nombre,
    pista: c.pista,
  }));
  const comunidades: Opcion[] = opciones.comunidades.map((c) => ({ valor: c.id, texto: c.nombre, pista: c.pista }));
  // El administrador es una persona; la administracion en la que trabaja va de
  // pista, porque es un atributo SUYO.
  const administradores: Opcion[] = opciones.administradores.map((a) => ({
    valor: a.id,
    texto: a.nombre,
    pista: a.pista,
  }));
  const administraciones: Opcion[] = opciones.administraciones.map((a) => ({
    valor: a.id,
    texto: a.nombre,
    pista: a.pista,
  }));
  const canales: Opcion[] = opciones.canales.map((c) => ({ valor: c.id, texto: c.nombre }));
  const contratas: Opcion[] = opciones.contratas.map((c) => ({ valor: c.id, texto: c.nombre }));
  const relaciones: Opcion[] = RELACIONES.map((r) => ({ valor: r.valor, texto: r.texto, pista: r.pista }));

  // Si quien rellena es comercial, el suyo sale ya puesto: entonces no hace
  // falta recordarle que la oportunidad necesita comercial.
  const soyComercial = opciones.miComercial !== null;

  const [comercial, setComercial] = useState(opciones.miComercial ?? "");
  const [nota, setNota] = useState("");
  const [comunidad, setComunidad] = useState("");
  const [direccion, setDireccion] = useState("");
  const [buscarDireccion, setBuscarDireccion] = useState(false);
  const [admin, setAdmin] = useState("");
  // El administrador que se crea aqui mismo, con lo minimo. Queda puesto sin
  // tener que volver a pescarlo de la lista.
  const [modalAdmin, setModalAdmin] = useState(false);
  const [anNombre, setAnNombre] = useState("");
  const [anTel, setAnTel] = useState("");
  const [anMail, setAnMail] = useState("");
  const [anEmpresa, setAnEmpresa] = useState("");
  const adminNuevo = anNombre.trim() !== "";

  const [quien, setQuien] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const [relacion, setRelacion] = useState("");
  const [telNuevo, setTelNuevo] = useState("");
  const [mailNuevo, setMailNuevo] = useState("");
  const [nombreNuevo, setNombreNuevo] = useState("");

  // Con quien hablo a partir de ahora. Se puede marcar mas de uno.
  const [mismo, setMismo] = useState(true);
  const [esAdmin, setEsAdmin] = useState(false);
  const [otro, setOtro] = useState(false);
  const [modal, setModal] = useState(false);
  const [contacto, setContacto] = useState("");
  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoTel, setContactoTel] = useState("");
  const [contactoMail, setContactoMail] = useState("");

  const [paso, setPaso] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Su regla para poder guardar: la entrada del diario, un comercial, un hilo
  // del que tirar, y el siguiente paso —que es lo que hace que no se escape.
  const hayHilo =
    comunidad !== "" ||
    direccion.trim() !== "" ||
    admin !== "" ||
    adminNuevo ||
    telNuevo.trim() !== "" ||
    mailNuevo.trim() !== "";
  const puedeGuardar = nota.trim() !== "" && comercial !== "" && hayHilo && paso !== "";

  const quitarAdminNuevo = () => {
    setAnNombre("");
    setAnTel("");
    setAnMail("");
    setAnEmpresa("");
  };

  const cerrarOtro = (v: boolean) => {
    setOtro(v);
    if (v) setModal(true);
    else {
      setContacto("");
      setContactoNombre("");
      setContactoTel("");
      setContactoMail("");
    }
  };

  return (
    <form
      action={accion}
      onSubmit={() => setEnviando(true)}
      onKeyDown={(e) => {
        // Enter pasa al campo siguiente, nunca envia. En el diario si escribe.
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
      {/* ===================== la cabecera, sin tarjeta ===================== */}
      <div className="flex flex-wrap items-end gap-4">
        <h1 className="text-[26px] font-extrabold leading-none text-carbon">Nueva oportunidad</h1>
        <label className="block w-[190px]">
          <span className={etiqueta}>Número de orden</span>
          <span className={caja + " mt-1 block bg-black/5 text-carbon/60"}>
            {"PER-" + new Date().getFullYear() + "-000"}
          </span>
        </label>
        <Campo id="fecha_llamada" nombre="Fecha de la llamada" tipo="date" defecto={hoy} clase="w-[150px]" />
        <Elegir
          id="comercial"
          nombre="Comercial que la lleva"
          opciones={comerciales}
          valor={comercial}
          alElegir={setComercial}
          clase="w-[230px]"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-[760px] text-xs text-carbon/70">
          Lo único necesario es que completes lo que te han dicho
          {soyComercial ? "" : ", y tenga asignado un comercial"}. Todo lo demás, si se puede indicar bien, y si no,
          se completará después.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href={volver}
            className="rounded-lg border border-black/15 bg-white px-4 py-2 text-sm text-carbon/75 transition hover:border-lima"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={!puedeGuardar || enviando}
            className="rounded-lg bg-lima px-6 py-2 text-sm font-bold text-carbon transition hover:bg-lima-dark hover:text-white disabled:cursor-not-allowed disabled:bg-black/5 disabled:text-carbon/35"
          >
            {enviando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,500fr)_minmax(0,670fr)]">
        {/* ===================== el diario ===================== */}
        <section className="min-w-0 rounded-[14px] border border-[#baa208] bg-[#fffdf5] p-4 shadow-sm">
          <h2 className="text-[19px] font-bold uppercase leading-tight tracking-wide text-carbon">
            Qué te han contado
          </h2>
          <textarea
            id="nota"
            name="nota"
            rows={9}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Me llama Adolfo, que en Carretas 28 quieren poner el SATE. Como es zona ZBE le voy a contar que si no arreglan la accesibilidad del portal no van a poder acceder a subvenciones. Me pasa el teléfono del presi, Alejandro."
            className={caja + " mt-3 min-h-[260px] resize-y"}
          />
        </section>

        {/* ===================== los datos que tenemos ===================== */}
        <section className="min-w-0 rounded-[14px] border border-[#237812] bg-[#fffdf5] p-4 shadow-sm">
          <h2 className="text-[19px] font-bold uppercase leading-tight tracking-wide text-carbon">
            Datos que tenemos
          </h2>
          <p className="mb-3 mt-1 text-[10px] font-bold uppercase tracking-wide text-carbon/60">
            Apunta lo que ya sepas, cuanto más mejor
          </p>

          {/* La direccion se escribe; buscarla es el "por si acaso". */}
          <div className="grid gap-[14px] sm:grid-cols-[minmax(0,365fr)_minmax(0,245fr)]">
            <div className="flex min-w-0 flex-col items-start">
              <span className={verde}>Dirección de la comunidad</span>
              {comunidad === "" && (
                <input
                  id="direccion_provisional"
                  name="direccion_provisional"
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="dirección del edificio"
                  className={caja + " mt-1"}
                />
              )}
              {(buscarDireccion || comunidad !== "") && (
                <Elegir
                  id="comunidad"
                  nombre=""
                  opciones={comunidades}
                  valor={comunidad}
                  alElegir={setComunidad}
                  vacio="busca la que ya tenemos"
                  clase="mt-1.5 w-full"
                />
              )}
              {comunidad === "" && (
                <button type="button" onClick={() => setBuscarDireccion((x) => !x)} className={boton + " mt-1.5"}>
                  {buscarDireccion ? "Mejor la escribo yo" : "O selecciona de las ya existentes"}
                </button>
              )}
            </div>

            <div className="flex min-w-0 flex-col items-start">
              <span className={verde}>Quién es el administrador</span>
              {adminNuevo ? (
                <div className="mt-1 flex w-full items-center gap-2 rounded-lg border border-[#8a6410] bg-form-nuevo px-3 py-1.5 text-sm">
                  <span className="min-w-0 flex-1 truncate font-semibold text-[#5c4208]">
                    {anNombre} <span className="font-normal text-[#5c4208]/70">· nuevo</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalAdmin(true)}
                    className="text-xs font-bold text-[#5c4208] underline underline-offset-2"
                  >
                    cambiar
                  </button>
                  <button
                    type="button"
                    onClick={quitarAdminNuevo}
                    aria-label="Quitar"
                    className="text-[#5c4208]/70 transition hover:text-[#5c4208]"
                  >
                    ×
                  </button>
                  <input type="hidden" name="admin_nuevo_nombre" value={anNombre} />
                  <input type="hidden" name="admin_nuevo_telefono" value={anTel} />
                  <input type="hidden" name="admin_nuevo_correo" value={anMail} />
                  <input type="hidden" name="admin_nuevo_empresa" value={anEmpresa} />
                </div>
              ) : (
                <>
                  <Elegir
                    id="administrador"
                    nombre=""
                    opciones={administradores}
                    valor={admin}
                    alElegir={setAdmin}
                    vacio="selecciona de la lista"
                    clase="w-full"
                  />
                  <button type="button" onClick={() => setModalAdmin(true)} className={boton + " mt-1.5"}>
                    <span aria-hidden>+</span> Nuevo administrador, crearlo
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Quien me pasa el dato. */}
          <div className="mt-4 grid gap-[14px] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Elegir
              id="quien"
              nombre="Quién ha contactado para pedirlo"
              opciones={opciones.quienes}
              valor={quien}
              alElegir={(v) => {
                setQuien(v);
                if (v) setNuevo(false);
              }}
              vacio="¿es alguien conocido? selecciónalo de la agenda"
              tinta="text-[#237812]"
            />
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setNuevo((x) => !x);
                  if (!nuevo) setQuien("");
                }}
                className={nuevo ? botonPuesto : boton}
              >
                {nuevo ? "✓ lo estoy creando" : "+ No le conozco, crear contacto nuevo"}
              </button>
            </div>
          </div>

          {nuevo && (
            <div className="mt-3 rounded-[14px] border border-[#8a6410] bg-form-nuevo p-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#5c4208]">
                Contacto nuevo — lo que es decide dónde se guarda
              </p>
              <div className="grid gap-[14px] sm:grid-cols-12">
                <label className="block min-w-0 sm:col-span-5" htmlFor="nuevo_nombre">
                  <span className={etiqueta}>Nombre</span>
                  <input
                    id="nuevo_nombre"
                    name="nuevo_nombre"
                    value={nombreNuevo}
                    onChange={(e) => setNombreNuevo(e.target.value)}
                    className={caja + " mt-1"}
                  />
                </label>
                <label className="block min-w-0 sm:col-span-4" htmlFor="nuevo_telefono">
                  <span className={etiqueta}>Teléfono</span>
                  <input
                    id="nuevo_telefono"
                    name="nuevo_telefono"
                    value={telNuevo}
                    onChange={(e) => setTelNuevo(e.target.value)}
                    className={caja + " mt-1"}
                  />
                </label>
                <label className="block min-w-0 sm:col-span-3" htmlFor="nuevo_correo">
                  <span className={etiqueta}>Correo</span>
                  <input
                    id="nuevo_correo"
                    name="nuevo_correo"
                    value={mailNuevo}
                    onChange={(e) => setMailNuevo(e.target.value)}
                    className={caja + " mt-1"}
                  />
                </label>
                <Elegir
                  id="nuevo_relacion"
                  nombre="Qué es"
                  opciones={relaciones}
                  valor={relacion}
                  alElegir={setRelacion}
                  clase="sm:col-span-7"
                />
                {relacion === "contrata" && (
                  <Elegir id="nuevo_contrata" nombre="De qué contrata" opciones={contratas} clase="sm:col-span-5" />
                )}
              </div>
              <input type="hidden" name="nuevo_marcado" value="1" />
            </div>
          )}

          {/* De lo que vendemos, que quieren. */}
          <div className="mt-4">
            <span className={verde}>En qué dicen que están interesados</span>
            <span className="mb-1 block text-[11px] text-carbon/60">De lo que vendemos, qué quieren</span>
            <Marcar
              id="tipos"
              opciones={opciones.tipos.map((t) => ({ valor: t.id, texto: t.nombre, pista: t.pista }))}
              pista="selecciona uno o varios"
              vacio="nada marcado todavía"
            />
          </div>

          {/* La tercera persona: con quien hablo de los detalles. */}
          <section className="mt-4 max-w-[520px] rounded-[14px] border border-marco bg-white/70 p-3">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#237812]">
              Con quién hablo de esto a partir de ahora{" "}
              <span className="font-semibold normal-case tracking-normal text-carbon/60">
                (contacto para verlo, enviar, etc.)
              </span>
            </h3>
            <div className="flex flex-wrap gap-2">
              <Casilla texto="El mismo que me llamó" nombre="mismo_que_llama" marcado={mismo} alMarcar={setMismo} />
              <Casilla texto="El administrador" nombre="contacto_es_admin" marcado={esAdmin} alMarcar={setEsAdmin} />
              <Casilla texto="Otro (crear)" marcado={otro} alMarcar={cerrarOtro} />
            </div>
            {otro && (contactoNombre || contacto) && (
              <button
                type="button"
                onClick={() => setModal(true)}
                className="mt-2 text-xs font-bold text-lima-dark underline underline-offset-2"
              >
                {contactoNombre || "contacto elegido"} — cambiar
              </button>
            )}
          </section>

          {/* El siguiente paso: es lo que impide que se escape. */}
          <section className="mt-4 rounded-[14px] border border-marco bg-white/70 p-3">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#237812]">
              Qué tengo que hacer: siguiente paso inmediato
            </h3>
            <div className="flex flex-wrap gap-2">
              {PASOS_DE_ARRANQUE.map((p) => (
                <Casilla
                  key={p.clave}
                  texto={p.texto}
                  marcado={paso === p.clave}
                  alMarcar={(v) => setPaso(v ? p.clave : "")}
                />
              ))}
            </div>
            <input type="hidden" name="paso" value={paso} />
          </section>

          <h3 className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-[#237812]">Datos extra</h3>
          <Elegir id="canal" nombre="Cómo nos conocieron" opciones={canales} clase="sm:max-w-[320px]" />
        </section>
      </div>

      {!puedeGuardar && (
        <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Para guardar hacen falta: <b>lo que te han contado</b>, <b>un comercial</b>, <b>el siguiente paso</b>, y{" "}
          <b>al menos una de estas cuatro</b> — dirección, administración, teléfono o correo.
        </p>
      )}

      {/* Crear un administrador sin salir de aquí: lo mínimo para poder seguir.
          Se crea de verdad al guardar la oportunidad, no antes. */}
      {modalAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-carbon/40 p-4">
          <div className="w-full max-w-[520px] rounded-[16px] border border-marco bg-white p-4 shadow-xl">
            <h3 className="text-[15px] font-bold text-carbon">Administrador nuevo</h3>
            <p className="mb-3 mt-1 text-xs text-carbon/65">
              Lo justo para poder seguir con la oportunidad. Su ficha se completa después.
            </p>
            <div className="grid gap-[14px] sm:grid-cols-12">
              <label className="block min-w-0 sm:col-span-5" htmlFor="an_nombre">
                <span className={etiqueta}>Nombre</span>
                <input
                  id="an_nombre"
                  value={anNombre}
                  onChange={(e) => setAnNombre(e.target.value)}
                  className={caja + " mt-1"}
                />
              </label>
              <label className="block min-w-0 sm:col-span-4" htmlFor="an_telefono">
                <span className={etiqueta}>Teléfono</span>
                <input id="an_telefono" value={anTel} onChange={(e) => setAnTel(e.target.value)} className={caja + " mt-1"} />
              </label>
              <label className="block min-w-0 sm:col-span-3" htmlFor="an_correo">
                <span className={etiqueta}>Correo</span>
                <input id="an_correo" value={anMail} onChange={(e) => setAnMail(e.target.value)} className={caja + " mt-1"} />
              </label>
              <Elegir
                id="an_empresa"
                nombre="Administración de fincas en la que está"
                opciones={administraciones}
                valor={anEmpresa}
                alElegir={setAnEmpresa}
                vacio="todavía no lo sé"
                clase="sm:col-span-12"
              />
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  quitarAdminNuevo();
                  setModalAdmin(false);
                }}
                className="rounded-lg border border-black/15 bg-white px-4 py-2 text-sm text-carbon/75 transition hover:border-lima"
              >
                Quitar
              </button>
              <button
                type="button"
                disabled={!adminNuevo}
                onClick={() => {
                  setAdmin("");
                  setModalAdmin(false);
                }}
                className="rounded-lg bg-lima px-6 py-2 text-sm font-bold text-carbon transition hover:bg-lima-dark hover:text-white disabled:cursor-not-allowed disabled:bg-black/5 disabled:text-carbon/35"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* El contacto de "otro": vecina, presidente, alguien de la comisión de
          obras. Se queda montado aunque esté cerrado, para no perder lo escrito. */}
      <div className={modal ? "fixed inset-0 z-50 flex items-center justify-center bg-carbon/40 p-4" : "hidden"}>
        <div className="w-full max-w-[540px] rounded-[16px] border border-marco bg-white p-4 shadow-xl">
          <h3 className="text-[15px] font-bold text-carbon">Con quién hablo a partir de ahora</h3>
          <p className="mb-3 mt-1 text-xs text-carbon/65">
            La vecina, el presidente, alguien de la comisión de obras. Si ya está en la agenda, se elige; si no, se
            escribe.
          </p>
          <Elegir
            id="contacto"
            nombre="Si ya lo tenemos"
            opciones={opciones.contactos}
            valor={contacto}
            alElegir={setContacto}
            vacio="no está en la lista"
          />
          <div className="mt-3 grid gap-[14px] sm:grid-cols-12">
            <Campo
              id="contacto_nombre"
              nombre="Si no está: cómo se llama"
              clase="sm:col-span-5"
              pista="a quien tengo que llamar"
              valor={contactoNombre}
              alEscribir={setContactoNombre}
            />
            <Campo
              id="contacto_telefono"
              nombre="Teléfono"
              clase="sm:col-span-4"
              valor={contactoTel}
              alEscribir={setContactoTel}
            />
            <Campo
              id="contacto_correo"
              nombre="Correo"
              clase="sm:col-span-3"
              valor={contactoMail}
              alEscribir={setContactoMail}
            />
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setModal(false);
                cerrarOtro(false);
              }}
              className="rounded-lg border border-black/15 bg-white px-4 py-2 text-sm text-carbon/75 transition hover:border-lima"
            >
              Quitar
            </button>
            <button
              type="button"
              onClick={() => setModal(false)}
              className="rounded-lg bg-lima px-6 py-2 text-sm font-bold text-carbon transition hover:bg-lima-dark hover:text-white"
            >
              Listo
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
