"use client";

import Link from "next/link";
import { useState } from "react";
import type { OpcionesAlta } from "../../../../lib/alta";

// EL FORMULARIO DEL ALTA DE UNA COMUNIDAD. Gira alrededor de la DIRECCION, que
// es lo unico obligatorio: sin ella no hay comunidad. Abrir una oportunidad sin
// direccion es OTRA alta, con su puerta.

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

/** Un documento. Misma cara que en la ficha; aqui, como es un alta, nunca esta
 *  subido todavia: dice SUBIR. Cuando haya donde guardarlos dira "abrir".
 *  De momento es un boton apagado, para ver la pantalla entera. */
function Doc({ et }: { et: string }) {
  return (
    <span
      title="Todavía no hay dónde guardar los documentos"
      className="inline-flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-lg border border-lima/30 bg-white px-2.5 py-1.5 text-sm font-semibold text-lima-dark/55"
    >
      <span aria-hidden>📄</span>
      {et}
      <span className="font-medium text-carbon/35">subir</span>
    </span>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-carbon">{titulo}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Campo({ id, nombre, ancho, clase }: { id: string; nombre: string; ancho?: boolean; clase?: string }) {
  return (
    <label className={clase ?? (ancho ? "sm:col-span-2" : undefined)} htmlFor={id}>
      <span className={etiqueta}>{nombre}</span>
      <input id={id} name={id} className={campo + " mt-1.5"} />
    </label>
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
  const [personaNueva, setPersonaNueva] = useState(false);
  const [direccion, setDireccion] = useState("");
  const [contactos, setContactos] = useState(0);
  const [enviando, setEnviando] = useState(false);

  const adminNueva = admin === "__nueva__";
  const personas = adminNueva ? [] : opciones.personas.filter((p) => p.empresaId === admin);
  // Si la administracion es nueva, o es una que no tiene gente, la persona se
  // da de alta aqui sin salir de la pantalla.
  const pidePersonaNueva = adminNueva || personaNueva || (admin !== "" && personas.length === 0);
  const hayDireccion = direccion.trim() !== "";

  return (
    <form action={accion} onSubmit={() => setEnviando(true)} className="mt-7 grid gap-5">
      <Bloque titulo="La dirección">
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
        <Campo id="cp" nombre="Código postal" />
        <Campo id="municipio" nombre="Localidad" />
        <Campo id="provincia" nombre="Provincia" />
      </Bloque>

      <Bloque titulo="Quién la lleva">
        <label htmlFor="administracion">
          <span className={etiqueta}>Administración de fincas</span>
          <select
            id="administracion"
            name="administracion"
            value={admin}
            onChange={(e) => setAdmin(e.target.value)}
            className={campo + " mt-1.5"}
          >
            <option value="">—</option>
            <option value="__nueva__">+ Crear una administración nueva</option>
            {opciones.administraciones.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>

        </label>

        <label htmlFor="puesto">
          <span className={etiqueta}>Persona que la lleva</span>
          <select
            id="puesto"
            name="puesto"
            disabled={!admin || pidePersonaNueva}
            className={campo + " mt-1.5 disabled:bg-black/[.03]"}
          >
            <option value="">—</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
                {p.cargo ? ` · ${p.cargo}` : ""}
              </option>
            ))}
          </select>
          {admin && !adminNueva && (
            <button
              type="button"
              onClick={() => setPersonaNueva((x) => !x)}
              className="mt-1.5 text-sm font-semibold text-lima-dark hover:underline"
            >
              {personaNueva ? "← Elegir una que ya está" : "+ Dar de alta una persona"}
            </button>
          )}
        </label>

        <label htmlFor="origen">
          <span className={etiqueta}>Cómo ha llegado</span>
          <select id="origen" name="origen" defaultValue="administrador_conocido" className={campo + " mt-1.5"}>
            {ORIGENES.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.texto}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="comercial">
          <span className={etiqueta}>Comercial</span>
          <select id="comercial" name="comercial" className={campo + " mt-1.5"}>
            <option value="">—</option>
            {opciones.comerciales.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>

      </Bloque>

      {adminNueva && (
        <Bloque titulo="La administración nueva">
          <Campo id="admin_nombre" nombre="Nombre de la administración" ancho />
          <Campo id="admin_telefono" nombre="Teléfono" />
          <Campo id="admin_correo" nombre="Correo" />
        </Bloque>
      )}

      {pidePersonaNueva && (
        <Bloque titulo="La persona que la lleva">
          <Campo id="persona_nombre" nombre="Nombre" ancho />
          <Campo id="persona_cargo" nombre="Cargo" />
          <Campo id="persona_telefono" nombre="Teléfono de trabajo" />
          <Campo id="persona_correo" nombre="Correo" />
        </Bloque>
      )}

      <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-carbon">Primera nota</h2>
        <textarea
          id="nota"
          name="nota"
          rows={4}
          placeholder="Me llama Adolfo, que quiere que Dani vaya a ver un ascensor aquí. El martes a las 12:15 en su oficina y de allí vais a verlo."
          className={campo + " mt-4 resize-y placeholder:text-carbon/25"}
        />
      </section>

      <Bloque titulo="El edificio">
        <Campo id="anio" nombre="Año de construcción" />
        <Campo id="viviendas" nombre="Número de viviendas" />
        <Campo id="catastro" nombre="Referencia catastral" />
      </Bloque>

      {/* El CIF en su linea, y debajo la cuenta y el censo en una sola. Aqui y
          no en el edificio porque estos tres CAMBIAN, y el edificio es lo que
          no cambia nunca. */}
      <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-carbon">La comunidad</h2>
        <div className="mt-4 grid items-end gap-4 sm:grid-cols-2">
          <Campo id="cif" nombre="CIF" />
          <span className="pb-2">
            <Doc et="Tarjeta del CIF" />
          </span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
          <Campo id="iban" nombre="IBAN" clase="" />
          <Campo id="mayores70" nombre="Vecinos de más de 70 años" clase="" />
          <Campo id="discapacidad" nombre="Vecinos con discapacidad" clase="" />
        </div>
      </section>

      <Bloque titulo="Presidente">
        <Campo id="presidente" nombre="Nombre" ancho />
        <Campo id="presidente_telefono" nombre="Teléfono" />
        <Campo id="presidente_email" nombre="Correo" />
        <Campo id="presidente_dni" nombre="DNI" />
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Doc et="DNI" />
          <Doc et="Acta de nombramiento" />
        </div>
      </Bloque>

      {/* Quien mas haya: la vecina, el hijo, quien de verdad lo lleva. */}
      <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-carbon">Otras personas de contacto</h2>
        {Array.from({ length: contactos }, (_, i) => (
          <div key={i} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Campo id={`contacto_${i}_nombre`} nombre="Nombre" />
            <label htmlFor={`contacto_${i}_rol`}>
              <span className={etiqueta}>Qué es de la comunidad</span>
              <select id={`contacto_${i}_rol`} name={`contacto_${i}_rol`} defaultValue="vecino" className={campo + " mt-1.5"}>
                {ROLES.map((r) => (
                  <option key={r.valor} value={r.valor}>
                    {r.texto}
                  </option>
                ))}
              </select>
            </label>
            <Campo id={`contacto_${i}_telefono`} nombre="Teléfono" />
            <Campo id={`contacto_${i}_email`} nombre="Correo" />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setContactos((n) => n + 1)}
          className="mt-4 text-sm font-semibold text-lima-dark hover:underline"
        >
          + Añadir otra persona
        </button>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!hayDireccion || enviando}
          className="rounded-xl bg-lima px-6 py-3 text-base font-bold text-carbon transition hover:bg-lima-dark hover:text-white disabled:cursor-not-allowed disabled:bg-black/5 disabled:text-carbon/35 disabled:hover:text-carbon/35"
        >
          {enviando ? "Guardando…" : "Guardar"}
        </button>
        <Link href={volver} className="rounded-xl border border-black/10 px-5 py-3 text-base text-carbon/60 transition hover:border-lima">
          Cancelar
        </Link>
        {!hayDireccion && <span className="text-sm text-carbon/45">Escribe la dirección.</span>}
      </div>
    </form>
  );
}
