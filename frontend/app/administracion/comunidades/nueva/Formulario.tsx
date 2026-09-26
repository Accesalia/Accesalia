"use client";

import Link from "next/link";
import { useState } from "react";
import type { OpcionesAlta } from "../../../../lib/alta";

// EL FORMULARIO DE ALTA DE UNA COMUNIDAD, con la colocacion que monto Monica en
// el taller el 26-sep-2026 ("FORMULARIO ALTA COMUNIDAD MONICA"). Vale de
// plantilla para el resto de formularios de entrada.
//
// Lo que ella resolvio y conviene no deshacer:
//   · Guardar y Cancelar ARRIBA, en la cabecera. Antes estaban a tres
//     pantallas de la direccion.
//   · La direccion y la primera nota, una al lado de la otra: lo primero que
//     se ve es lo que siempre se sabe.
//   · En el administrador, la PERSONA delante de la empresa.
//   · Abajo, tres columnas en paralelo (presidente, comunidad, edificio) y las
//     otras personas cruzando por debajo.
//
// La direccion es lo unico obligatorio: sin ella no hay comunidad.

const ROLES: { valor: string; texto: string }[] = [
  { valor: "vecino", texto: "Vecino" },
  { valor: "vicepresidente", texto: "Vicepresidente" },
  { valor: "secretario", texto: "Secretario" },
  { valor: "presidente", texto: "Presidente" },
  { valor: "otro", texto: "Otro" },
];

const ORIGENES: { valor: string; texto: string }[] = [
  { valor: "administrador_conocido", texto: "Un administrador que ya conocemos" },
  { valor: "web", texto: "La web" },
  { valor: "boca_a_boca", texto: "Boca a boca" },
  { valor: "contrata", texto: "Una contrata" },
  { valor: "puerta_fria", texto: "Puerta fría" },
  { valor: "otro", texto: "Otro" },
];

const campo =
  "w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-base text-carbon outline-none transition focus:border-lima";
const etiqueta = "block text-[11px] font-bold uppercase tracking-wide text-carbon/45";

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
    <section className={"rounded-2xl border border-black/5 p-5 shadow-sm " + tono + " " + clase}>
      {titulo && <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-carbon/70">{titulo}</h2>}
      {children}
    </section>
  );
}

function Campo({ id, nombre, clase = "" }: { id: string; nombre: string; clase?: string }) {
  return (
    <label className={clase} htmlFor={id}>
      <span className={etiqueta}>{nombre}</span>
      <input id={id} name={id} className={campo + " mt-1.5"} />
    </label>
  );
}

function Elige({
  id,
  nombre,
  clase = "",
  children,
  ...resto
}: {
  id: string;
  nombre: string;
  clase?: string;
  children: React.ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className={clase} htmlFor={id}>
      <span className={etiqueta}>{nombre}</span>
      <select id={id} name={id} className={campo + " mt-1.5 disabled:bg-black/[.03]"} {...resto}>
        {children}
      </select>
    </label>
  );
}

/** Un documento. En un alta nunca está todavía: dice SUBIR. Apagado hasta que
 *  haya dónde guardar ficheros. */
function Doc({ et }: { et: string }) {
  return (
    <span
      title="Todavía no hay dónde guardar los documentos"
      className="inline-flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-lg border border-lima/30 bg-white px-2.5 py-2.5 text-sm font-semibold text-lima-dark/55"
    >
      <span aria-hidden>📄</span>
      {et}
      <span className="font-medium text-carbon/35">subir</span>
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

  return (
    <form action={accion} onSubmit={() => setEnviando(true)} className="grid gap-5">
      {/* ---- la cabecera: el titulo y, a la derecha, los botones ---- */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-carbon sm:text-4xl">Crear una nueva comunidad</h1>
        <div className="flex items-center gap-3">
          <Link
            href={volver}
            className="rounded-xl border border-black/15 bg-white px-5 py-3 text-base text-carbon/60 transition hover:border-lima"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={!direccion.trim() || enviando}
            className="rounded-xl bg-lima px-7 py-3 text-base font-bold text-carbon transition hover:bg-lima-dark hover:text-white disabled:cursor-not-allowed disabled:bg-black/5 disabled:text-carbon/35 disabled:hover:text-carbon/35"
          >
            {enviando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      {/* ---- la direccion y la nota, juntas ---- */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]">
        <Caja titulo="La dirección">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2" htmlFor="direccion">
              <span className={etiqueta}>Dirección</span>
              <input
                id="direccion"
                name="direccion"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                autoFocus
                required
                className={campo + " mt-1.5 text-lg font-semibold"}
              />
            </label>
            <Campo id="municipio" nombre="Localidad" />
            <Campo id="cp" nombre="Código postal" />
            <Campo id="provincia" nombre="Provincia" clase="sm:col-span-2" />
          </div>
        </Caja>

        <Caja titulo="Primera nota" clase="flex h-full flex-col">
          <textarea
            id="nota"
            name="nota"
            rows={6}
            placeholder="Quién lo pide, por qué se crea, de dónde nos llega… anota aquí los datos relevantes que sepamos."
            className={campo + " min-h-40 flex-1 resize-y placeholder:text-carbon/35"}
          />
        </Caja>
      </div>

      {/* ---- el administrador de fincas ---- */}
      <Caja titulo="Administrador de fincas: qué sabemos">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_25rem]">
          <div className="grid gap-4">
            <Elige
              id="administracion"
              nombre="Qué administración es, si ya está en nuestra lista"
              value={admin}
              onChange={(e) => setAdmin(e.target.value)}
            >
              <option value="">—</option>
              <option value="__nueva__">+ No está en la lista: crear una nueva</option>
              {opciones.administraciones.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </Elige>

            <Elige
              id="puesto"
              nombre="Quién es la persona de contacto que la lleva"
              disabled={!admin || creandoGente}
            >
              <option value="">—</option>
              {suyas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                  {p.cargo ? " · " + p.cargo : ""}
                </option>
              ))}
            </Elige>

            {admin && !adminNueva && (
              <button
                type="button"
                onClick={() => setPersonaSuelta((x) => !x)}
                className="justify-self-start text-sm font-semibold text-lima-dark hover:underline"
              >
                {personaSuelta ? "← Elegir una que ya está" : "+ Dar de alta una persona"}
              </button>
            )}
          </div>

          <Caja titulo="De qué comercial es" tono="bg-form-nuestro">
            <div className="grid gap-4">
              <Elige id="comercial" nombre="Comercial de Accesalia">
                <option value="">—</option>
                {opciones.comerciales.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Elige>
              <Elige id="origen" nombre="Cómo le ha llegado" defaultValue="administrador_conocido">
                {ORIGENES.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.texto}
                  </option>
                ))}
              </Elige>
            </div>
          </Caja>
        </div>

        {/* La caja de crear uno nuevo SIEMPRE se ve, aunque sea cerrada: si se
            esconde del todo, no existe. Se despliega con el botón. */}
        <section className="mt-5 rounded-2xl border border-black/5 bg-form-nuevo p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-carbon/70">
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
                  "rounded-xl px-5 py-2 text-base font-bold transition " +
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
            <div className="mt-5">
            {Array.from({ length: personas }, (_, i) => (
              <div key={i} className="mb-4 grid gap-4 sm:grid-cols-[2fr_1fr_2fr_2fr]">
                <Campo id={"persona_" + i + "_nombre"} nombre="Quién es nuestro contacto en la administración" />
                <Campo id={"persona_" + i + "_telefono"} nombre="Teléfono de trabajo" />
                <Campo id={"persona_" + i + "_correo"} nombre="Correo del trabajo" />
                <Campo id={"persona_" + i + "_cargo"} nombre="Quién es allí: dueño, asalariado, administrativo…" />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setPersonas((n) => n + 1)}
              className="text-sm font-semibold text-lima-dark hover:underline"
            >
              + Crear otra persona de contacto más
            </button>

            {adminNueva && (
              <div className="mt-5 grid gap-4 border-t border-black/10 pt-5 sm:grid-cols-[2fr_1fr_2fr]">
                <Campo id="admin_nombre" nombre="Nombre de la empresa de administración de fincas" />
                <Campo id="admin_telefono" nombre="Teléfono general, si es distinto" />
                <Campo id="admin_correo" nombre="Correo de la empresa, si es distinto" />
              </div>
            )}
            </div>
          )}
        </section>
      </Caja>

      {/* ---- todo lo de la comunidad, en tres columnas ---- */}
      <Caja titulo="Datos que tenemos de la comunidad">
        <div className="grid items-start gap-5 lg:grid-cols-3">
          <Caja titulo="Presidente" tono="bg-form-dentro">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="presidente" nombre="Nombre" clase="sm:col-span-2" />
              <Campo id="presidente_telefono" nombre="Teléfono" />
              <Campo id="presidente_dni" nombre="DNI" />
              <Campo id="presidente_email" nombre="Correo" clase="sm:col-span-2" />
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Doc et="DNI" />
                <Doc et="Acta de nombramiento" />
              </div>
            </div>
          </Caja>

          <Caja titulo="Datos de la comunidad, lo que sepamos" tono="bg-form-dentro">
            <div className="grid items-end gap-4 sm:grid-cols-2">
              <Campo id="cif" nombre="CIF" />
              <Doc et="Tarjeta del CIF" />
              <Campo id="iban" nombre="IBAN" clase="sm:col-span-2" />
              <Campo id="mayores70" nombre="Vecinos de más de 70 años" />
              <Campo id="discapacidad" nombre="Vecinos con discapacidad" />
            </div>
          </Caja>

          <Caja titulo="Datos del edificio, lo que sepamos" tono="bg-form-quieto">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="anio" nombre="Año de construcción" />
              <Campo id="viviendas" nombre="Número de viviendas" />
              <Campo id="catastro" nombre="Referencia catastral" clase="sm:col-span-2" />
            </div>
          </Caja>
        </div>

        <Caja titulo="Otras personas de contacto" tono="bg-form-dentro" clase="mt-5">
          {Array.from({ length: contactos }, (_, i) => (
            <div key={i} className="mb-4 grid gap-4 sm:grid-cols-[2fr_3fr_1fr_2fr]">
              <Campo id={"contacto_" + i + "_nombre"} nombre="Nombre" />
              <Elige id={"contacto_" + i + "_rol"} nombre="Qué es de la comunidad, por qué está aquí" defaultValue="vecino">
                {ROLES.map((r) => (
                  <option key={r.valor} value={r.valor}>
                    {r.texto}
                  </option>
                ))}
              </Elige>
              <Campo id={"contacto_" + i + "_telefono"} nombre="Teléfono" />
              <Campo id={"contacto_" + i + "_email"} nombre="Correo" />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setContactos((n) => n + 1)}
            className="text-sm font-semibold text-lima-dark hover:underline"
          >
            + Añadir otra persona
          </button>
        </Caja>
      </Caja>

      {!direccion.trim() && (
        <p className="text-sm text-carbon/45">Escribe la dirección: es lo único que no puede faltar.</p>
      )}
    </form>
  );
}
