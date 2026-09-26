"use client";

import Link from "next/link";
import { useState } from "react";
import type { OpcionesAdmin } from "../../../../lib/altaAdministracion";
import { Elegir, type Opcion } from "../../../components/Elegir";

// EL ALTA DE UNA ADMINISTRACION DE FINCAS, con la colocacion que monto Monica
// en el taller ("FORMULARIO ADMIN mONICA", 26-sep-2026). Su diseno tal cual:
// sus bloques, sus bordes uno por tarjeta, sus anchos y sus palabras.
//
//   · Arriba, sin tarjeta: el nombre, el telefono y la localidad, con Guardar
//     y Cancelar al lado.
//   · Izquierda: quien es el jefe · quien mas trabaja alli · departamentos.
//   · Derecha: nuestra relacion (con como le hemos conocido y la comision
//     dentro) · los datos de la empresa.
//
// LO UNICO OBLIGATORIO es una persona con una forma de contacto. El nombre de
// la administracion no: "a veces no sabemos ni el nombre, solo el del tio que
// nos llama". Sin nombre, la persona se guarda suelta.

const campo =
  "w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm text-carbon outline-none transition focus:border-lima";
const etiqueta = "block text-[10px] font-bold uppercase tracking-wide text-carbon/70";

const VIAS: Opcion[] = [
  { valor: "web", texto: "La web" },
  { valor: "boca_a_boca", texto: "Boca a boca: un vecino, otro administrador" },
  { valor: "contrata", texto: "Una contrata" },
  { valor: "comercial_interno", texto: "Un comercial nuestro" },
  { valor: "puerta_fria", texto: "Puerta fría" },
  { valor: "otro", texto: "Otro: feria, evento…" },
];

const COMISION: Opcion[] = [
  { valor: "sin_hablar", texto: "Todavía no se ha hablado" },
  { valor: "cobra", texto: "Sí, cobra comisión" },
  { valor: "no_cobra", texto: "No cobra" },
];

const RESERVADO: Opcion[] = [
  { valor: "ascensor", texto: "Ascensor" },
  { valor: "sate", texto: "SATE" },
  { valor: "ascensor_y_sate", texto: "Ascensor y SATE" },
];

type Fila = { id: string; nombre: string };
let siguiente = 0;
const nuevaFila = (): Fila => ({ id: "f" + ++siguiente, nombre: "" });

function Caja({
  titulo,
  tono = "bg-form-card",
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
  tipo,
}: {
  id: string;
  nombre: string;
  pista?: string;
  clase?: string;
  valor?: string;
  alEscribir?: (v: string) => void;
  tipo?: string;
}) {
  const mandado = valor !== undefined && alEscribir !== undefined;
  return (
    <label className={"block min-w-0 " + clase} htmlFor={id}>
      <span className={etiqueta}>{nombre}</span>
      <input
        id={id}
        name={id}
        type={tipo}
        placeholder={pista}
        className={campo + " mt-1 placeholder:text-carbon/55"}
        {...(mandado ? { value: valor, onChange: (e) => alEscribir(e.target.value) } : {})}
      />
    </label>
  );
}

/** Un dato que la app pone y no se toca. Se ve, para que quede claro qué se
 *  está guardando, pero no se puede cambiar. */
function Fijo({ nombre, valor, clase = "" }: { nombre: string; valor: string; clase?: string }) {
  return (
    <span className={"block min-w-0 " + clase}>
      <span className={etiqueta}>{nombre}</span>
      <span className="mt-1 block truncate rounded-lg border border-dashed border-black/15 bg-black/[.03] px-3 py-1.5 text-sm font-semibold text-carbon/75">
        {valor}
      </span>
    </span>
  );
}

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
  opciones: OpcionesAdmin;
  accion: (fd: FormData) => void;
  volver: string;
}) {
  const [jefes, setJefes] = useState<Fila[]>([nuevaFila()]);
  const [gente, setGente] = useState<Fila[]>([nuevaFila()]);
  const [departamentos, setDepartamentos] = useState<Fila[]>([nuevaFila()]);
  const [contacto, setContacto] = useState({ jefe: "", trabajador: "" });
  const [respetar, setRespetar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const comerciales: Opcion[] = opciones.comerciales.map((c) => ({ valor: c.id, texto: c.nombre }));

  // Lo unico obligatorio: alguien con nombre Y una forma de contacto.
  const hayPersona = jefes[0].nombre.trim() !== "" || gente[0].nombre.trim() !== "";
  const hayContacto = contacto.jefe.trim() !== "" || contacto.trabajador.trim() !== "";
  const puedeGuardar = hayPersona && hayContacto;

  const alPulsarTecla = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== "Enter") return;
    const donde = e.target as HTMLElement;
    if (donde.tagName === "TEXTAREA" || donde.hasAttribute("data-buscador")) return;
    if (donde.tagName !== "INPUT" && !donde.hasAttribute("data-campo")) return;
    e.preventDefault();
    const todos = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>(
        "input:not([type=hidden]):not([data-buscador]), textarea, [data-campo]",
      ),
    ).filter((x) => !(x as HTMLInputElement).disabled);
    todos[todos.indexOf(donde) + 1]?.focus();
  };

  return (
    <form action={accion} onSubmit={() => setEnviando(true)} onKeyDown={alPulsarTecla} className="grid gap-4">
      {/* ---- la cabecera, sobre el fondo y sin tarjeta ---- */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-carbon sm:text-3xl">Nueva administración de fincas</h1>
          <div className="flex items-center gap-2">
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
        <div className="mt-3 grid gap-[14px] sm:grid-cols-[minmax(0,5fr)_minmax(0,2fr)_minmax(0,2fr)]">
          <Campo id="nombre" nombre="Nombre habitual" pista="si todavía no lo sabes, déjalo vacío" />
          <Campo id="telefono" nombre="Teléfono" />
          <Campo id="municipio" nombre="Localidad" />
        </div>
        {!puedeGuardar && (
          <p className="mt-2 text-xs text-carbon/65">
            Hace falta al menos una persona y una forma de contacto suya, correo o teléfono. El nombre de la
            administración puede esperar.
          </p>
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,540fr)_minmax(0,651fr)]">
        {/* ===================== columna izquierda ===================== */}
        <div className="grid gap-4">
          <Caja titulo="Quién es el jefe" tono="bg-form-quieto" borde="border-[#5c5c5c]">
            {jefes.map((f, i) => (
              <div key={f.id} className="mb-3 rounded-[14px] border-2 border-[#707070] bg-form-nuevo p-3">
                <div className="grid items-end gap-3 sm:grid-cols-10">
                  <Campo
                    id={"jefe_" + f.id + "_nombre"}
                    nombre="Nombre"
                    clase="sm:col-span-6"
                    valor={f.nombre}
                    alEscribir={(v) => setJefes((l) => l.map((x, j) => (j === i ? { ...x, nombre: v } : x)))}
                  />
                  <Fijo nombre="Cargo" valor="el que manda" clase="sm:col-span-4" />
                  <Campo
                    id={"jefe_" + f.id + "_telefonoTrabajo"}
                    nombre="Teléfono de trabajo"
                    clase="sm:col-span-3"
                    {...(i === 0
                      ? {
                          valor: contacto.jefe,
                          alEscribir: (v: string) => setContacto((c) => ({ ...c, jefe: v })),
                        }
                      : {})}
                  />
                  <Campo id={"jefe_" + f.id + "_telefonoPersonal"} nombre="Teléfono personal" clase="sm:col-span-3" />
                  <Campo id={"jefe_" + f.id + "_colegiado"} nombre="Nº de colegiado" clase="sm:col-span-4" />
                  <Campo id={"jefe_" + f.id + "_correoTrabajo"} nombre="Su correo" clase="sm:col-span-10" />
                  <Campo
                    id={"jefe_" + f.id + "_notas"}
                    nombre="Notas"
                    pista="qué lleva, con qué temas le contactamos"
                    clase="sm:col-span-10"
                  />
                </div>
                {jefes.length > 1 && (
                  <div className="mt-2 flex justify-end">
                    <Quitar alPulsar={() => setJefes((l) => l.filter((_, j) => j !== i))} />
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              disabled={jefes[jefes.length - 1].nombre.trim() === ""}
              onClick={() => setJefes((l) => [...l, nuevaFila()])}
              className="text-xs font-semibold text-lima-dark hover:underline disabled:cursor-not-allowed disabled:text-carbon/35 disabled:no-underline"
            >
              + Añadir otra persona si hay más de un jefe
            </button>
          </Caja>

          <Caja titulo="Quién más trabaja allí" tono="bg-form-quieto" borde="border-[#4a4a4a]">
            {gente.map((f, i) => (
              <div key={f.id} className="mb-3 rounded-[14px] border border-[#8a8a8a] bg-[#fffdf5] p-3">
                <div className="grid items-end gap-3 sm:grid-cols-12">
                  <Campo
                    id={"gente_" + f.id + "_nombre"}
                    nombre="Nombre"
                    clase="sm:col-span-5"
                    valor={f.nombre}
                    alEscribir={(v) => setGente((l) => l.map((x, j) => (j === i ? { ...x, nombre: v } : x)))}
                  />
                  <Campo id={"gente_" + f.id + "_cargo"} nombre="Cargo" clase="sm:col-span-4" />
                  <Campo id={"gente_" + f.id + "_departamento"} nombre="Departamento" clase="sm:col-span-3" />
                  <Campo id={"gente_" + f.id + "_correoTrabajo"} nombre="Mail de empresa" clase="sm:col-span-7" />
                  <Campo
                    id={"gente_" + f.id + "_telefonoTrabajo"}
                    nombre="Teléfono de trabajo"
                    clase="sm:col-span-5"
                    {...(i === 0
                      ? {
                          valor: contacto.trabajador,
                          alEscribir: (v: string) => setContacto((c) => ({ ...c, trabajador: v })),
                        }
                      : {})}
                  />
                  <Campo id={"gente_" + f.id + "_correoPersonal"} nombre="Mail personal" clase="sm:col-span-7" />
                  <Campo id={"gente_" + f.id + "_telefonoPersonal"} nombre="Teléfono personal" clase="sm:col-span-5" />
                  <Campo id={"gente_" + f.id + "_desde"} nombre="Desde cuándo trabaja aquí" clase="sm:col-span-6" />
                  <Campo id={"gente_" + f.id + "_colegiado"} nombre="Nº de colegiado" clase="sm:col-span-6" />
                  <Campo
                    id={"gente_" + f.id + "_notas"}
                    nombre="Notas"
                    pista="qué lleva, con qué temas le contactamos"
                    clase="sm:col-span-12"
                  />
                </div>
                {gente.length > 1 && (
                  <div className="mt-2 flex justify-end">
                    <Quitar alPulsar={() => setGente((l) => l.filter((_, j) => j !== i))} />
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              disabled={gente[gente.length - 1].nombre.trim() === ""}
              onClick={() => setGente((l) => [...l, nuevaFila()])}
              className="text-xs font-semibold text-lima-dark hover:underline disabled:cursor-not-allowed disabled:text-carbon/35 disabled:no-underline"
            >
              + Añadir otra persona
            </button>
          </Caja>

          <Caja
            titulo="Formas de contacto si se organiza por departamentos"
            tono="bg-form-quieto"
            borde="border-[#636363]"
          >
            {departamentos.map((f, i) => (
              <div key={f.id} className="mb-3 grid items-end gap-[14px] sm:grid-cols-[2fr_3fr_3fr_2fr_auto]">
                <Campo
                  id={"depto_" + f.id + "_nombre"}
                  nombre="Departamento"
                  valor={f.nombre}
                  alEscribir={(v) => setDepartamentos((l) => l.map((x, j) => (j === i ? { ...x, nombre: v } : x)))}
                />
                <Campo id={"depto_" + f.id + "_queHace"} nombre="Qué hace, para entendernos nosotros" />
                <Campo id={"depto_" + f.id + "_correo"} nombre="Mail del departamento" />
                <Campo id={"depto_" + f.id + "_telefono"} nombre="Teléfono del departamento" />
                {departamentos.length > 1 && (
                  <Quitar alPulsar={() => setDepartamentos((l) => l.filter((_, j) => j !== i))} />
                )}
              </div>
            ))}
            <button
              type="button"
              disabled={departamentos[departamentos.length - 1].nombre.trim() === ""}
              onClick={() => setDepartamentos((l) => [...l, nuevaFila()])}
              className="text-xs font-semibold text-lima-dark hover:underline disabled:cursor-not-allowed disabled:text-carbon/35 disabled:no-underline"
            >
              + Añadir departamento
            </button>
          </Caja>
        </div>

        {/* ===================== columna derecha ===================== */}
        <div className="grid gap-4">
          <Caja titulo="Nuestra relación con la administración de fincas" tono="bg-form-quieto" borde="border-[#707070]">
            <div className="grid gap-[14px] sm:grid-cols-3">
              <Elegir id="comercial" nombre="Comercial que la lleva ahora" opciones={comerciales} />
              <Elegir id="comercial_captador" nombre="Comercial que la captó" opciones={comerciales} />
              <Campo
                id="alta_cartera"
                nombre="Fecha de alta en cartera"
                tipo="date"
                valor={undefined}
                alEscribir={undefined}
              />
            </div>

            <Caja titulo="Cómo le hemos conocido" tono="bg-form-nuevo" borde="border-[#8a8a8a]" clase="mt-4">
              <div className="grid gap-[14px] sm:grid-cols-2">
                <Campo
                  id="llego_quien"
                  nombre="Nos llegó a través de (la persona)"
                  pista="la vecina de…, el cuñado de…"
                />
                <Elegir id="llego_por" nombre="Nos conoció por (vía)" opciones={VIAS} />
                <Campo
                  id="origen_notas"
                  nombre="Notas del origen"
                  pista="por si hay detalles extra que se deban conocer: es la vecina de X, fue en la feria de Y…"
                  clase="sm:col-span-2"
                />
              </div>

              <section className="mt-4 rounded-[14px] border border-[#4d0505] bg-[#e1cbcb] p-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#4d0505]">
                  Rellenar si nos llega a través de otro y hay condiciones a respetar
                </h3>
                <div className="mt-3 grid items-end gap-[14px] sm:grid-cols-[auto_2fr_2fr]">
                  <label className="flex items-center gap-2 pb-2 text-xs font-semibold text-[#4d0505]" htmlFor="respetar">
                    <input
                      id="respetar"
                      name="respetar"
                      type="checkbox"
                      checked={respetar}
                      onChange={(e) => setRespetar(e.target.checked)}
                      className="size-4 accent-[#4d0505]"
                    />
                    Hay que respetar la cartera: es de otro
                  </label>
                  <Campo id="de_quien_es" nombre="De quién es este administrador (externo)" />
                  <Elegir
                    id="servicio_reservado"
                    nombre="Se limita a (el resto es libre para ofrecérselo)"
                    opciones={RESERVADO}
                  />
                </div>
              </section>
            </Caja>

            <Caja
              titulo="¿Este administrador cobra comisión?"
              tono="bg-[#fbecb6]"
              borde="border-[#1b1c6b]"
              clase="mt-4"
            >
              <div className="grid items-end gap-[14px] sm:grid-cols-[2fr_2fr_auto]">
                <Elegir id="comision_estado" nombre="Cobra comisión" opciones={COMISION} vacio="Todavía no se ha hablado" />
                <Campo id="comision_titular" nombre="Titular: quién de ellos la cobra" />
                <span
                  title="La ficha de comisión todavía no está montada"
                  className="mb-px inline-flex cursor-not-allowed items-center gap-1 self-end rounded-lg border border-[#1b1c6b]/30 bg-white px-2.5 py-1.5 text-xs font-semibold text-carbon/70"
                >
                  Abrir su ficha de comisión
                </span>
              </div>
            </Caja>
          </Caja>

          <Caja titulo="Datos de la empresa administradora de fincas" tono="bg-form-quieto" borde="border-[#696969]">
            <div className="grid items-end gap-[14px] sm:grid-cols-12">
              <Campo id="nombre_legal" nombre="Nombre legal (el de la tarjeta del CIF)" clase="sm:col-span-8" />
              <Campo id="cif" nombre="CIF" clase="sm:col-span-4" />
              <Campo id="direccion" nombre="Dirección" clase="sm:col-span-12" />
              <Campo id="correo_general" nombre="Correo general principal" clase="sm:col-span-7" />
              <Campo id="telefono_general" nombre="Teléfono general principal" clase="sm:col-span-5" />
            </div>
            <p className="mt-3 text-xs text-carbon/65">
              Si hacen falta más teléfonos o correos, se dan de alta como departamento: recepción, contabilidad…
            </p>
          </Caja>
        </div>
      </div>
    </form>
  );
}
