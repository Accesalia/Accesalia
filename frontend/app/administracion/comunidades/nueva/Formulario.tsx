"use client";

import Link from "next/link";
import { useState } from "react";
import type { OpcionesAlta } from "../../../../lib/alta";

// EL FORMULARIO DEL ALTA DE UNA COMUNIDAD. Gira alrededor de la DIRECCION, que
// es lo unico obligatorio: sin ella no hay comunidad. Abrir una oportunidad sin
// direccion es OTRA alta, con su puerta.

const campo =
  "w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-base text-carbon outline-none transition focus:border-lima";
const etiqueta = "block text-[11px] font-bold uppercase tracking-wide text-carbon/45";

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-carbon">{titulo}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Campo({ id, nombre, ancho }: { id: string; nombre: string; ancho?: boolean }) {
  return (
    <label className={ancho ? "sm:col-span-2" : undefined} htmlFor={id}>
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
  const [direccion, setDireccion] = useState("");
  const [enviando, setEnviando] = useState(false);

  const personas = opciones.personas.filter((p) => p.empresaId === admin);
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
            {opciones.administraciones.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
          {/* La pantalla de alta de administracion es la siguiente que se
              monta; hasta entonces el boton se ve pero no lleva a un 404. */}
          <span
            title="Dar de alta una administración todavía no está montado"
            className="mt-1.5 inline-flex cursor-not-allowed items-center gap-1.5 text-sm font-semibold text-carbon/35"
          >
            + Crear una administración nueva
            <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">Próximamente</span>
          </span>
        </label>

        <label htmlFor="puesto">
          <span className={etiqueta}>Persona que la lleva</span>
          <select id="puesto" name="puesto" disabled={!admin} className={campo + " mt-1.5 disabled:bg-black/[.03]"}>
            <option value="">—</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
                {p.cargo ? ` · ${p.cargo}` : ""}
              </option>
            ))}
          </select>
          {admin && personas.length === 0 && (
            <span className="mt-1.5 block text-sm text-amber-700">
              Esta administración todavía no tiene personas dadas de alta.
            </span>
          )}
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
        <Campo id="cif" nombre="CIF de la comunidad" />
      </Bloque>

      <Bloque titulo="Presidente">
        <Campo id="presidente" nombre="Nombre" ancho />
        <Campo id="presidente_telefono" nombre="Teléfono" />
        <Campo id="presidente_email" nombre="Correo" />
        <Campo id="presidente_dni" nombre="DNI" />
      </Bloque>

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
