"use client";

import Link from "next/link";
import { useState } from "react";
import type { OpcionesAlta } from "../../../../lib/alta";
import { Elegir, type Opcion } from "./Elegir";

// EL FORMULARIO DE ALTA DE UNA COMUNIDAD, con la colocacion que monto Monica en
// el taller el 26-sep-2026 ("FORMULARIO ALTA COMUNIDAD MONICA"). Vale de
// plantilla para el resto de formularios de entrada.
//
// Lo que ella resolvio y conviene no deshacer:
//   · Guardar y Cancelar ARRIBA, en la cabecera.
//   · La direccion y la primera nota, una al lado de la otra.
//   · En el administrador, la PERSONA delante de la empresa.
//   · Lo que se crea nuevo se VE SIEMPRE, aunque este cerrado.
//   · Abajo, tres columnas en paralelo y las otras personas por debajo.
//
// Y dos cosas que pidio al verlo montado:
//   · TODO MAS PEQUENO. Los campos y los aires eran inmensos.
//   · Cada casilla de elegir, con su minibuscador (ver `Elegir.tsx`).
//
// La direccion es lo unico obligatorio: sin ella no hay comunidad.

const ROLES: Opcion[] = [
  { valor: "vecino", texto: "Vecino" },
  { valor: "vicepresidente", texto: "Vicepresidente" },
  { valor: "secretario", texto: "Secretario" },
  { valor: "presidente", texto: "Presidente" },
  { valor: "otro", texto: "Otro" },
];

const ORIGENES: Opcion[] = [
  { valor: "administrador_conocido", texto: "Un administrador que ya conocemos" },
  { valor: "web", texto: "La web" },
  { valor: "boca_a_boca", texto: "Boca a boca" },
  { valor: "contrata", texto: "Una contrata" },
  { valor: "puerta_fria", texto: "Puerta fría" },
  { valor: "otro", texto: "Otro" },
];

const campo =
  "w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm text-carbon outline-none transition focus:border-lima";
const etiqueta = "block text-[10px] font-bold uppercase tracking-wide text-carbon/45";

/** Una tarjeta del formulario. `tono` es el fondo; por defecto el crema. */
function Caja({
  titulo,
  tono = "bg-form-card",
  clase = "",
  children,
}: {
  titulo?: string;
  tono?: string;
  clase?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={"rounded-xl border border-black/5 p-4 shadow-sm " + tono + " " + clase}>
      {titulo && <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-carbon/70">{titulo}</h2>}
      {children}
    </section>
  );
}

function Campo({
  id,
  nombre,
  pista,
  clase = "",
}: {
  id: string;
  nombre: string;
  /** La pista va DENTRO del recuadro, en gris, y se va al escribir. */
  pista?: string;
  clase?: string;
}) {
  return (
    <label className={clase} htmlFor={id}>
      <span className={etiqueta}>{nombre}</span>
      <input id={id} name={id} placeholder={pista} className={campo + " mt-1 placeholder:text-carbon/35"} />
    </label>
  );
}

/** Un documento, con la misma forma que un campo: su nombre encima, pequeño, y
 *  debajo la caja. En un alta nunca está todavía, así que la caja dice SUBIR.
 *  Así caben varios en una fila, al lado del dato al que acompañan. Apagado
 *  hasta que haya dónde guardar ficheros. */
function Doc({ nombre, clase = "" }: { nombre: string; clase?: string }) {
  return (
    <span className={"block min-w-0 " + clase}>
      <span className={etiqueta + " truncate"}>{nombre}</span>
      <span
        title="Todavía no hay dónde guardar los documentos"
        className="mt-1 flex cursor-not-allowed items-center justify-center gap-1 rounded-lg border border-lima/30 bg-white px-2 py-1.5 text-xs font-semibold text-lima-dark/55"
      >
        <span aria-hidden>📄</span>
        subir
      </span>
    </span>
  );
}

export function Formulario({
  opciones,
  accion,
  volver,
}: {
  opciones: OpcionesAlta;
  accion: (fd: FormData) => void;
  volver: string;
}) {
  const [admin, setAdmin] = useState("");
  const [personaSuelta, setPersonaSuelta] = useState(false);
  const [personas, setPersonas] = useState(1);
  const [direccion, setDireccion] = useState("");
  const [contactos, setContactos] = useState(1);
  const [enviando, setEnviando] = useState(false);

  const adminNueva = admin === "__nueva__";
  const suyas = adminNueva ? [] : opciones.personas.filter((p) => p.empresaId === admin);
  // La administracion elegida no tiene a nadie dado de alta: no hay a quien
  // elegir, asi que la caja se abre sola y no tiene sentido cerrarla.
  const sinGente = admin !== "" && !adminNueva && suyas.length === 0;
  const creandoGente = adminNueva || personaSuelta || sinGente;

  const listaAdmin: Opcion[] = [
    { valor: "__nueva__", texto: "+ No está en la lista: crear una nueva" },
    ...opciones.administraciones.map((a) => ({ valor: a.id, texto: a.nombre })),
  ];
  const listaComerciales: Opcion[] = opciones.comerciales.map((c) => ({ valor: c.id, texto: c.nombre }));

  // LA PERSONA VA PRIMERO (asi lo puso Monica, y es lo correcto: a quien se
  // visita es una persona, no una entidad fiscal). Como el buscador encuentra
  // en toda la lista, no hace falta elegir antes la empresa: mientras no haya
  // ninguna elegida se ven las 411 con su administracion al lado, y al elegir
  // una persona su administracion se rellena sola.
  const nombreEmpresa = new Map(opciones.administraciones.map((a) => [a.id, a.nombre]));
  const listaPersonas: Opcion[] = (admin === "" ? opciones.personas : suyas).map((p) => ({
    valor: p.id,
    texto: p.nombre,
    pista: admin === "" ? nombreEmpresa.get(p.empresaId) : (p.cargo ?? undefined),
  }));
  const [puesto, setPuesto] = useState("");
  const elegirPersona = (v: string) => {
    setPuesto(v);
    const p = opciones.personas.find((x) => x.id === v);
    if (p) setAdmin(p.empresaId);
  };

  return (
    <form action={accion} onSubmit={() => setEnviando(true)} className="grid gap-4">
      {/* ---- la cabecera: el titulo y, a la derecha, los botones ---- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-carbon sm:text-3xl">Crear una nueva comunidad</h1>
        <div className="flex items-center gap-2">
          <Link
            href={volver}
            className="rounded-lg border border-black/15 bg-white px-4 py-2 text-sm text-carbon/60 transition hover:border-lima"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={!direccion.trim() || enviando}
            className="rounded-lg bg-lima px-6 py-2 text-sm font-bold text-carbon transition hover:bg-lima-dark hover:text-white disabled:cursor-not-allowed disabled:bg-black/5 disabled:text-carbon/35 disabled:hover:text-carbon/35"
          >
            {enviando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      {/* ---- la direccion y la nota, juntas ---- */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]">
        <Caja titulo="La dirección">
          {/* Su fila: la dirección con el código postal al lado, y debajo la
              localidad y la provincia. */}
          <div className="grid gap-3 sm:grid-cols-12">
            <label className="sm:col-span-10" htmlFor="direccion">
              <span className={etiqueta}>Dirección</span>
              <input
                id="direccion"
                name="direccion"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                autoFocus
                required
                className={campo + " mt-1 text-base font-semibold"}
              />
            </label>
            <Campo id="cp" nombre="Código postal" clase="sm:col-span-2" />
            <Campo id="municipio" nombre="Localidad" clase="sm:col-span-7" />
            <Campo id="provincia" nombre="Provincia" clase="sm:col-span-5" />
          </div>
        </Caja>

        <Caja titulo="Primera nota" clase="flex h-full flex-col">
          <textarea
            id="nota"
            name="nota"
            rows={4}
            placeholder="Quién lo pide, por qué se crea, de dónde nos llega… anota aquí los datos relevantes que sepamos."
            className={campo + " min-h-24 flex-1 resize-y placeholder:text-carbon/35"}
          />
        </Caja>
      </div>

      {/* ---- el administrador de fincas ---- */}
      <Caja titulo="Administrador de fincas: qué sabemos">
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid gap-3">
            <Elegir
              id="puesto"
              nombre="Quién es la persona de contacto que la lleva"
              opciones={listaPersonas}
              valor={puesto}
              alElegir={elegirPersona}
              desactivado={creandoGente}
            />
            <Elegir
              id="administracion"
              nombre="Qué administración es, si ya está en nuestra lista"
              opciones={listaAdmin}
              valor={admin}
              alElegir={(v) => {
                setAdmin(v);
                // Si la persona elegida no es de esa administracion, se suelta.
                const p = opciones.personas.find((x) => x.id === puesto);
                if (p && p.empresaId !== v) setPuesto("");
              }}
            />
            {admin && !adminNueva && (
              <button
                type="button"
                onClick={() => setPersonaSuelta((x) => !x)}
                className="justify-self-start text-xs font-semibold text-lima-dark hover:underline"
              >
                {personaSuelta ? "← Elegir una que ya está" : "+ Dar de alta una persona"}
              </button>
            )}
          </div>

          <Caja titulo="De qué comercial es" tono="bg-form-nuestro">
            {/* Los dos en la misma fila, como los puso ella. */}
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <Elegir id="comercial" nombre="Comercial de Accesalia" opciones={listaComerciales} />
              <Elegir id="origen" nombre="Cómo le ha llegado" opciones={ORIGENES} />
            </div>
          </Caja>
        </div>

        {/* La caja de crear uno nuevo SIEMPRE se ve, aunque sea cerrada: si se
            esconde del todo, no existe. Se despliega con el botón. */}
        <section className="mt-4 rounded-xl border border-black/5 bg-form-nuevo p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-carbon/70">
              {sinGente
                ? "Esta administración no tiene a nadie: damos de alta a la persona"
                : "No es un administrador de la lista: creamos uno nuevo"}
            </h2>
            {!sinGente && (
              <button
                type="button"
                onClick={() => {
                  if (adminNueva) setAdmin("");
                  else if (personaSuelta) setPersonaSuelta(false);
                  else setAdmin("__nueva__");
                }}
                className={
                  "rounded-lg px-4 py-1.5 text-sm font-bold transition " +
                  (creandoGente
                    ? "border border-black/15 bg-white text-carbon/60 hover:border-lima"
                    : "bg-lima text-carbon hover:bg-lima-dark hover:text-white")
                }
              >
                {creandoGente ? "Cerrar" : "Crear"}
              </button>
            )}
          </div>

          {creandoGente && (
            <div className="mt-4">
              {/* Primero la persona, luego la empresa, y el botón DEBAJO de las
                  dos: en medio parecía que las separaba. */}
              {Array.from({ length: personas }, (_, i) => (
                <div key={i} className="mb-3 grid gap-3 sm:grid-cols-[2fr_1fr_2fr_2fr]">
                  <Campo id={"persona_" + i + "_nombre"} nombre="Quién es nuestro contacto en la administración" />
                  <Campo id={"persona_" + i + "_telefono"} nombre="Teléfono de trabajo" />
                  <Campo id={"persona_" + i + "_correo"} nombre="Correo del trabajo" />
                  <Campo
                    id={"persona_" + i + "_cargo"}
                    nombre="Quién es allí"
                    pista="dueño, administrador contratado, otro…"
                  />
                </div>
              ))}

              {adminNueva && (
                <div className="mb-3 grid gap-3 sm:grid-cols-[2fr_1fr_2fr]">
                  <Campo id="admin_nombre" nombre="Nombre de la empresa de administración de fincas" />
                  <Campo id="admin_telefono" nombre="Teléfono general, si es distinto" />
                  <Campo id="admin_correo" nombre="Correo de la empresa, si es distinto" />
                </div>
              )}

              <button
                type="button"
                onClick={() => setPersonas((n) => n + 1)}
                className="text-xs font-semibold text-lima-dark hover:underline"
              >
                + Añadir más personas a esta empresa
              </button>
            </div>
          )}
        </section>
      </Caja>

      {/* ---- todo lo de la comunidad, en tres columnas ---- */}
      <Caja titulo="Datos que tenemos de la comunidad">
        <div className="grid items-start gap-4 lg:grid-cols-3">
          <Caja titulo="Presidente" tono="bg-form-dentro">
            {/* Su orden: nombre y teléfono; debajo el DNI con sus documentos;
                y el correo al final. */}
            <div className="grid items-end gap-3 sm:grid-cols-10">
              <Campo id="presidente" nombre="Nombre" clase="sm:col-span-7" />
              <Campo id="presidente_telefono" nombre="Teléfono" clase="sm:col-span-3" />
              <Campo id="presidente_dni" nombre="DNI" clase="sm:col-span-4" />
              <Doc nombre="DNI" clase="sm:col-span-2" />
              <Doc nombre="Acta de nombramiento" clase="sm:col-span-4" />
              <Campo id="presidente_email" nombre="Correo" clase="sm:col-span-10" />
            </div>
          </Caja>

          <Caja titulo="Datos de la comunidad, lo que sepamos" tono="bg-form-dentro">
            {/* Su orden: CIF con su tarjeta, el censo, y el IBAN al final. */}
            <div className="grid items-end gap-3 sm:grid-cols-10">
              <Campo id="cif" nombre="CIF" clase="sm:col-span-7" />
              <Doc nombre="Tarjeta del CIF" clase="sm:col-span-3" />
              <Campo id="mayores70" nombre="Vecinos de más de 70 años" clase="sm:col-span-5" />
              <Campo id="discapacidad" nombre="Vecinos con discapacidad" clase="sm:col-span-5" />
              <Campo id="iban" nombre="IBAN" clase="sm:col-span-10" />
            </div>
          </Caja>

          <Caja titulo="Datos del edificio, lo que sepamos" tono="bg-form-quieto">
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo id="anio" nombre="Año de construcción" />
              <Campo id="viviendas" nombre="Número de viviendas" />
              <Campo id="catastro" nombre="Referencia catastral" clase="sm:col-span-2" />
            </div>
          </Caja>
        </div>

        <Caja titulo="Otras personas de contacto" tono="bg-form-dentro" clase="mt-4">
          {/* El «+ añadir otra persona» va en la MISMA fila, al final, como lo
              puso ella; sale en la última. */}
          {Array.from({ length: contactos }, (_, i) => (
            <div key={i} className="mb-3 grid items-end gap-3 sm:grid-cols-[2fr_3fr_1.3fr_3fr_auto]">
              <Campo id={"contacto_" + i + "_nombre"} nombre="Nombre" />
              <Elegir
                id={"contacto_" + i + "_rol"}
                nombre="Qué es de la comunidad, por qué está aquí"
                opciones={ROLES}
              />
              <Campo id={"contacto_" + i + "_telefono"} nombre="Teléfono" />
              <Campo id={"contacto_" + i + "_email"} nombre="Correo" />
              {i === contactos - 1 && (
                <button
                  type="button"
                  onClick={() => setContactos((n) => n + 1)}
                  className="whitespace-nowrap pb-1.5 text-xs font-semibold text-lima-dark hover:underline"
                >
                  + Añadir otra persona
                </button>
              )}
            </div>
          ))}
        </Caja>
      </Caja>

      {!direccion.trim() && (
        <p className="text-xs text-carbon/45">Escribe la dirección: es lo único que no puede faltar.</p>
      )}
    </form>
  );
}
