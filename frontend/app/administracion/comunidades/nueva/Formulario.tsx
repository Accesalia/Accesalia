"use client";

import Link from "next/link";
import { useState } from "react";
import type { OpcionesAlta } from "../../../../lib/alta";
import { Elegir, type Opcion } from "./Elegir";

// EL FORMULARIO DE ALTA DE UNA COMUNIDAD, con la colocacion que monto Monica en
// el taller el 26-sep-2026 ("FORMULARIO ALTA COMUNIDAD MONICA"). Vale de
// plantilla para el resto de formularios de entrada.
//
// SU DISENO SE MONTA TAL CUAL. Los anchos de las tarjetas son suyos y no son
// casualidad: cada una necesita el que tiene para que la info quepa holgada.
//
//   · Guardar y Cancelar arriba, con el titulo, y la pista al lado.
//   · La direccion (con el CP al lado) y la primera nota, juntas.
//   · La PERSONA antes que la administracion.
//   · Lo que se crea nuevo se VE SIEMPRE, aunque este cerrado.
//   · Abajo tres tarjetas de 410, 390 y 340, y las otras personas por debajo.
//   · Los documentos, con forma de campo, al lado del dato al que acompanan.
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
const etiqueta = "block text-[10px] font-bold uppercase tracking-wide text-carbon/70";

/** Una fila anadida a mano. El nombre se controla para saber si esta vacia. */
type Fila = { id: string; nombre: string };
let siguiente = 0;
const nuevaFila = (): Fila => ({ id: "f" + ++siguiente, nombre: "" });

/** Una tarjeta del formulario. `tono` es el fondo; por defecto el crema. */
function Caja({
  titulo,
  tono = "bg-form-card",
  /** El color del borde. Lo puso ella tarjeta por tarjeta en el taller. */
  borde = "border-[#999999]",
  clase = "",
  children,
}: {
  titulo?: string;
  tono?: string;
  borde?: string;
  clase?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={"min-w-0 rounded-[14px] border p-4 shadow-sm " + borde + " " + tono + " " + clase}>
      {titulo && <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-carbon/85">{titulo}</h2>}
      {children}
    </section>
  );
}

function Campo({
  id,
  nombre,
  pista,
  clase = "",
  valor,
  alEscribir,
}: {
  id: string;
  nombre: string;
  /** La pista va DENTRO del recuadro, en gris, y se va al escribir. */
  pista?: string;
  clase?: string;
  /** Solo para los campos que el formulario necesita mirar (saber si una fila
   *  está vacía). Los demás se quedan sueltos. */
  valor?: string;
  alEscribir?: (v: string) => void;
}) {
  const mandado = valor !== undefined && alEscribir !== undefined;
  return (
    <label className={"block min-w-0 " + clase} htmlFor={id}>
      <span className={etiqueta}>{nombre}</span>
      <input
        id={id}
        name={id}
        placeholder={pista}
        className={campo + " mt-1 placeholder:text-carbon/55"}
        {...(mandado ? { value: valor, onChange: (e) => alEscribir(e.target.value) } : {})}
      />
    </label>
  );
}

/** Un documento, con la misma forma que un campo: su nombre encima, pequeño, y
 *  debajo la caja. En un alta nunca está todavía, así que dice SUBIR. Así cabe
 *  al lado del dato al que acompaña. Apagado hasta que haya dónde guardarlos. */
function Doc({ nombre, clase = "" }: { nombre: string; clase?: string }) {
  return (
    <span className={"block min-w-0 " + clase}>
      <span className={etiqueta + " truncate"}>{nombre}</span>
      <span
        title="Todavía no hay dónde guardar los documentos"
        className="mt-1 flex cursor-not-allowed items-center justify-center gap-1 rounded-lg border border-lima/30 bg-white px-2 py-1.5 text-xs font-semibold text-carbon/70"
      >
        <span aria-hidden>📄</span>
        subir
      </span>
    </span>
  );
}

/** Quitar una línea añadida a mano. Solo sale si hay más de una. */
function Quitar({ alPulsar }: { alPulsar: () => void }) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      title="Quitar esta línea"
      aria-label="Quitar esta línea"
      className="mb-px self-end rounded-lg border border-black/10 bg-white px-2.5 py-1 text-base leading-tight text-carbon/65 transition hover:border-alerta hover:text-alerta"
    >
      &times;
    </button>
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
  const [puesto, setPuesto] = useState("");
  const [personaSuelta, setPersonaSuelta] = useState(false);
  const [direccion, setDireccion] = useState("");
  const [enviando, setEnviando] = useState(false);
  // Las filas que se anaden a mano llevan un id ESTABLE, no su posicion: si se
  // quita la de en medio, las demas conservan lo escrito.
  const [personas, setPersonas] = useState<Fila[]>([nuevaFila()]);
  const [contactos, setContactos] = useState<Fila[]>([nuevaFila()]);

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
  const elegirPersona = (v: string) => {
    setPuesto(v);
    const p = opciones.personas.find((x) => x.id === v);
    if (p) setAdmin(p.empresaId);
  };

  const faltaDireccion = direccion.trim() === "";

  // CON ENTER SE PASA AL CAMPO SIGUIENTE, sin tener que coger el raton. Antes
  // Enter enviaba el formulario, que es lo ultimo que uno espera escribiendo la
  // direccion. En la nota no: alli Enter hace lo suyo, salto de linea.
  const alPulsarTecla = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== "Enter") return;
    const donde = e.target as HTMLElement;
    if (donde.tagName === "TEXTAREA") return;
    if (donde.hasAttribute("data-buscador")) return; // ahi Enter elige
    if (donde.tagName !== "INPUT" && !donde.hasAttribute("data-campo")) return;
    e.preventDefault();
    const todos = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>(
        "input:not([type=hidden]):not([data-buscador]), textarea, [data-campo]",
      ),
    ).filter((x) => !(x as HTMLInputElement).disabled);
    const siguiente = todos[todos.indexOf(donde) + 1];
    siguiente?.focus();
  };

  return (
    <form action={accion} onSubmit={() => setEnviando(true)} onKeyDown={alPulsarTecla} className="grid gap-4">
      {/* ---- la cabecera: el titulo con su pista al lado, y los botones ---- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold text-carbon sm:text-3xl">Crear una nueva comunidad</h1>
          {faltaDireccion && (
            <span className="text-xs text-carbon/65">Escribe la dirección: es lo único que no puede faltar.</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={volver}
            className="rounded-lg border border-black/15 bg-white px-4 py-2 text-sm text-carbon/75 transition hover:border-lima"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={faltaDireccion || enviando}
            className="rounded-lg bg-lima px-6 py-2 text-sm font-bold text-carbon transition hover:bg-lima-dark hover:text-white disabled:cursor-not-allowed disabled:bg-black/5 disabled:text-carbon/35 disabled:hover:text-carbon/35"
          >
            {enviando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      {/* ---- la direccion y la nota, juntas (680 y 510, los suyos) ---- */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,68fr)_minmax(0,51fr)]">
        <Caja titulo="La dirección" borde="border-[#737373]">
          {/* Su fila: la dirección con el código postal al lado, y debajo la
              localidad y la provincia. */}
          <div className="grid gap-[14px] sm:grid-cols-12">
            <label className="block min-w-0 sm:col-span-10" htmlFor="direccion">
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

        <Caja titulo="Primera nota" borde="border-[#616161]" clase="flex h-full flex-col">
          <textarea
            id="nota"
            name="nota"
            rows={4}
            placeholder="Quién lo pide, por qué se crea, de dónde nos llega… anota aquí los datos relevantes que sepamos."
            className={campo + " min-h-24 flex-1 resize-y placeholder:text-carbon/55"}
          />
        </Caja>
      </div>

      {/* ---- el administrador de fincas (734 y 450, los suyos) ---- */}
      <Caja titulo="Administrador de fincas: qué sabemos" borde="border-[#5c5c5c]">
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,73fr)_minmax(0,45fr)]">
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
                // Si la persona elegida no es de esa administración, se suelta.
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

          <Caja titulo="De qué comercial es" tono="bg-form-nuestro" borde="border-[#757575]">
            {/* Los dos en la misma fila, como los puso ella. */}
            <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <Elegir id="comercial" nombre="Comercial de Accesalia" opciones={listaComerciales} />
              <Elegir id="origen" nombre="Cómo le ha llegado" opciones={ORIGENES} />
            </div>
          </Caja>
        </div>

        {/* La caja de crear uno nuevo SIEMPRE se ve, aunque sea cerrada: si se
            esconde del todo, no existe. Se despliega con el botón. */}
        <section className="mt-4 rounded-[14px] border border-[#787878] bg-form-nuevo p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-carbon/85">
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
              {personas.map((f, i) => (
                <div key={f.id} className="mb-3 grid items-end gap-[14px] sm:grid-cols-[2fr_1fr_2fr_2fr_auto]">
                  <Campo
                    id={"persona_" + f.id + "_nombre"}
                    nombre="Quién es nuestro contacto en la administración"
                    valor={f.nombre}
                    alEscribir={(v) => setPersonas((l) => l.map((x, j) => (j === i ? { ...x, nombre: v } : x)))}
                  />
                  <Campo id={"persona_" + f.id + "_telefono"} nombre="Teléfono de trabajo" />
                  <Campo id={"persona_" + f.id + "_correo"} nombre="Correo del trabajo" />
                  <Campo
                    id={"persona_" + f.id + "_cargo"}
                    nombre="Quién es allí"
                    pista="dueño, administrador contratado, otro…"
                  />
                  {personas.length > 1 && <Quitar alPulsar={() => setPersonas((l) => l.filter((_, j) => j !== i))} />}
                </div>
              ))}

              {adminNueva && (
                <div className="mb-3 grid gap-[14px] sm:grid-cols-[2fr_1fr_2fr]">
                  <Campo id="admin_nombre" nombre="Nombre de la empresa de administración de fincas" />
                  <Campo id="admin_telefono" nombre="Teléfono general, si es distinto" />
                  <Campo id="admin_correo" nombre="Correo de la empresa, si es distinto" />
                </div>
              )}

              <button
                type="button"
                disabled={personas[personas.length - 1].nombre.trim() === ""}
                onClick={() => setPersonas((l) => [...l, nuevaFila()])}
                className="text-xs font-semibold text-lima-dark hover:underline disabled:cursor-not-allowed disabled:text-carbon/25 disabled:no-underline"
              >
                + Añadir más personas a esta empresa
              </button>
            </div>
          )}
        </section>
      </Caja>

      {/* ---- todo lo de la comunidad ---- */}
      <Caja titulo="Datos que tenemos de la comunidad" borde="border-[#999999]">
        {/* Tres anchos DISTINTOS, los suyos: 410, 390 y 340. No es casualidad:
            cada una necesita el suyo para que la info quepa holgada. */}
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,41fr)_minmax(0,39fr)_minmax(0,34fr)]">
          <Caja titulo="Presidente" tono="bg-form-dentro" borde="border-[#9e9e9e]">
            {/* Su orden: nombre y teléfono; debajo el DNI con sus documentos;
                y el correo al final. */}
            <div className="grid items-end gap-2.5 sm:grid-cols-10">
              <Campo id="presidente" nombre="Nombre" clase="sm:col-span-7" />
              <Campo id="presidente_telefono" nombre="Teléfono" clase="sm:col-span-3" />
              <Campo id="presidente_dni" nombre="DNI" clase="sm:col-span-5" />
              <Doc nombre="DNI" clase="sm:col-span-2" />
              <Doc nombre="Acta de nombramiento" clase="sm:col-span-3" />
              <Campo id="presidente_email" nombre="Correo" clase="sm:col-span-10" />
            </div>
          </Caja>

          <Caja titulo="Datos de la comunidad, lo que sepamos" tono="bg-form-dentro" borde="border-[#838381]">
            {/* Su orden: CIF con su tarjeta, el censo, y el IBAN al final. */}
            <div className="grid items-end gap-2.5 sm:grid-cols-10">
              <Campo id="cif" nombre="CIF" clase="sm:col-span-8" />
              <Doc nombre="Tarjeta del CIF" clase="sm:col-span-2" />
              <Campo id="mayores70" nombre="Vecinos de más de 70 años" clase="sm:col-span-5" />
              <Campo id="discapacidad" nombre="Vecinos con discapacidad" clase="sm:col-span-5" />
              <Campo id="iban" nombre="IBAN" clase="sm:col-span-10" />
            </div>
          </Caja>

          <Caja titulo="Datos del edificio, lo que sepamos" tono="bg-form-quieto" borde="border-[#858585]">
            <div className="grid items-end gap-2.5 sm:grid-cols-10">
              <Campo id="anio" nombre="Año de construcción" clase="sm:col-span-5" />
              <Campo id="viviendas" nombre="Número de viviendas" clase="sm:col-span-5" />
              <Campo id="catastro" nombre="Referencia catastral" clase="sm:col-span-7" />
              <Doc nombre="Ficha Catastro" clase="sm:col-span-3" />
            </div>
          </Caja>
        </div>

        <Caja titulo="Otras personas de contacto" tono="bg-form-dentro" borde="border-[#bfbfbf]" clase="mt-4">
          {/* El «+ añadir otra persona» va en la MISMA fila, al final, como lo
              puso ella; sale en la última y solo si esa tiene nombre. */}
          {contactos.map((f, i) => (
            <div key={f.id} className="mb-3 grid items-end gap-[14px] sm:grid-cols-[2fr_3fr_1.3fr_3fr_auto_auto]">
              <Campo
                id={"contacto_" + f.id + "_nombre"}
                nombre="Nombre"
                valor={f.nombre}
                alEscribir={(v) => setContactos((l) => l.map((x, j) => (j === i ? { ...x, nombre: v } : x)))}
              />
              <Elegir
                id={"contacto_" + f.id + "_rol"}
                nombre="Qué es de la comunidad, por qué está aquí"
                opciones={ROLES}
              />
              <Campo id={"contacto_" + f.id + "_telefono"} nombre="Teléfono" />
              <Campo id={"contacto_" + f.id + "_email"} nombre="Correo" />
              {contactos.length > 1 && <Quitar alPulsar={() => setContactos((l) => l.filter((_, j) => j !== i))} />}
              {i === contactos.length - 1 && (
                <button
                  type="button"
                  disabled={f.nombre.trim() === ""}
                  onClick={() => setContactos((l) => [...l, nuevaFila()])}
                  className="self-end whitespace-nowrap pb-1.5 text-xs font-semibold text-lima-dark hover:underline disabled:cursor-not-allowed disabled:text-carbon/25 disabled:no-underline"
                >
                  + Añadir otra persona
                </button>
              )}
            </div>
          ))}
        </Caja>
      </Caja>
    </form>
  );
}
