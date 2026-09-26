"use client";

import Link from "next/link";
import { useState } from "react";
import type { OpcionesAdmin } from "../../../../lib/altaAdministracion";
import { Elegir, type Opcion } from "../../../components/Elegir";

// EL ALTA DE UNA ADMINISTRACION DE FINCAS, con la colocacion de Monica
// ("FORMULARIO ADMIN mONICA") y su repaso de densidad del 26-sep-2026.
//
// FORMATO FICHA: la etiqueta y el campo van EN LA MISMA LINEA — "Mail ______",
// "Cargo ______" — no la etiqueta encima y la caja debajo. Cada campo asi
// ahorra una linea entera de alto, y en una ficha de datos eso es la diferencia
// entre caber de un vistazo y ser kilometrica. Solo las notas largas llevan
// caja de verdad.
//
// LO UNICO OBLIGATORIO es una persona con una forma de contacto. El nombre de
// la administracion no: a veces solo se sabe el del que llama.

const etiqueta = "shrink-0 text-[10px] font-bold uppercase tracking-wide text-carbon/70";
const caja =
  "w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm text-carbon outline-none transition focus:border-lima";

const VIAS: Opcion[] = [
  { valor: "web", texto: "La web" },
  { valor: "boca_a_boca", texto: "Boca a boca: un vecino, otro administrador" },
  { valor: "contrata", texto: "Una contrata" },
  { valor: "comercial_interno", texto: "Un comercial nuestro" },
  { valor: "puerta_fria", texto: "Puerta fría" },
  { valor: "otro", texto: "Otro: feria, evento…" },
];

const RESERVADO: Opcion[] = [
  { valor: "ascensor", texto: "Ascensor" },
  { valor: "sate", texto: "SATE" },
  { valor: "ascensor_y_sate", texto: "Ascensor y SATE" },
];

/** Los tres estados de la comision, a la vista y de un clic. El que manda va en
 *  color; los otros dos siguen ahi, en gris fantasma, para que se vea que se
 *  pueden cambiar. */
const COMISION = [
  { valor: "cobra", texto: "Sí", vivo: "bg-lima text-carbon border-lima" },
  { valor: "no_cobra", texto: "No", vivo: "bg-ajeno text-white border-ajeno" },
  { valor: "sin_hablar", texto: "Pendiente hablarlo", vivo: "bg-alerta text-white border-alerta" },
];

type Fila = { id: string; nombre: string };
let siguiente = 0;
const nuevaFila = (): Fila => ({ id: "f" + ++siguiente, nombre: "" });
const hoy = () => new Date().toISOString().slice(0, 10);

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

/** FORMATO FICHA: etiqueta y campo en la misma linea. */
function Dato({
  id,
  nombre,
  clase = "",
  tipo,
  pista,
  valor,
  alEscribir,
  defecto,
}: {
  id: string;
  nombre: string;
  clase?: string;
  tipo?: string;
  pista?: string;
  valor?: string;
  alEscribir?: (v: string) => void;
  defecto?: string;
}) {
  const mandado = valor !== undefined && alEscribir !== undefined;
  return (
    <label className={"flex min-w-0 items-baseline gap-2 " + clase} htmlFor={id}>
      <span className={etiqueta}>{nombre}</span>
      <input
        id={id}
        name={id}
        type={tipo}
        placeholder={pista}
        defaultValue={mandado ? undefined : defecto}
        className="min-w-0 flex-1 border-0 border-b border-black/20 bg-transparent px-1 py-0.5 text-sm text-carbon outline-none transition placeholder:text-carbon/45 focus:border-lima"
        {...(mandado ? { value: valor, onChange: (e) => alEscribir(e.target.value) } : {})}
      />
    </label>
  );
}

/** Un campo con su caja: la etiqueta encima. Es el de siempre, y es el que
 *  va fuera de las cards de datos. */
function Campo({
  id,
  nombre,
  clase = "",
  tipo,
  pista,
  defecto,
}: {
  id: string;
  nombre: string;
  clase?: string;
  tipo?: string;
  pista?: string;
  defecto?: string;
}) {
  return (
    <label className={"block min-w-0 " + clase} htmlFor={id}>
      <span className={etiqueta + " block"}>{nombre}</span>
      <input
        id={id}
        name={id}
        type={tipo}
        placeholder={pista}
        defaultValue={defecto}
        className={caja + " mt-1 placeholder:text-carbon/55"}
      />
    </label>
  );
}

/** Un dato que pone la app y no se toca. Se ve, para que quede claro. */
function Fijo({ nombre, valor, clase = "" }: { nombre: string; valor: string; clase?: string }) {
  return (
    <span className={"flex min-w-0 items-baseline gap-2 " + clase}>
      <span className={etiqueta}>{nombre}</span>
      <span className="min-w-0 flex-1 truncate border-b border-dashed border-black/20 px-1 py-0.5 text-sm font-semibold text-carbon/75">
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
      className="shrink-0 self-end rounded-lg border border-black/10 bg-white px-2.5 py-0.5 text-base leading-tight text-carbon/65 transition hover:border-alerta hover:text-alerta"
    >
      &times;
    </button>
  );
}

function Anadir({ texto, vacio, alPulsar }: { texto: string; vacio: boolean; alPulsar: () => void }) {
  return (
    <button
      type="button"
      disabled={vacio}
      onClick={alPulsar}
      className="text-xs font-semibold text-lima-dark hover:underline disabled:cursor-not-allowed disabled:text-carbon/35 disabled:no-underline"
    >
      {texto}
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
  const [comision, setComision] = useState("sin_hablar");
  const [correos, setCorreos] = useState(1);
  const [enviando, setEnviando] = useState(false);

  const comerciales: Opcion[] = opciones.comerciales.map((c) => ({ valor: c.id, texto: c.nombre }));

  // Quien cobra la comision se ELIGE entre la gente de esta administracion, no
  // se escribe: si no, cada uno pone un alias distinto y no hay quien lo cruce.
  const suGente: Opcion[] = [...jefes, ...gente]
    .filter((f) => f.nombre.trim() !== "")
    .map((f) => ({ valor: f.nombre.trim(), texto: f.nombre.trim() }));

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
        "input:not([type=hidden]):not([data-buscador]):not([type=checkbox]), textarea, [data-campo]",
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
              <div key={f.id} className="mb-3 rounded-[14px] border-2 border-[#707070] bg-[#fffbeb] p-3">
                <div className="grid gap-x-6 gap-y-2 sm:grid-cols-12">
                  <Dato
                    id={"jefe_" + f.id + "_nombre"}
                    nombre="Nombre"
                    clase="sm:col-span-7"
                    valor={f.nombre}
                    alEscribir={(v) => setJefes((l) => l.map((x, j) => (j === i ? { ...x, nombre: v } : x)))}
                  />
                  <Fijo nombre="Cargo" valor="el que manda" clase="sm:col-span-5" />
                  <Dato
                    id={"jefe_" + f.id + "_telefonoTrabajo"}
                    nombre="Tel. trabajo"
                    clase="sm:col-span-4"
                    {...(i === 0
                      ? { valor: contacto.jefe, alEscribir: (v: string) => setContacto((c) => ({ ...c, jefe: v })) }
                      : {})}
                  />
                  <Dato id={"jefe_" + f.id + "_telefonoPersonal"} nombre="Tel. personal" clase="sm:col-span-4" />
                  <Dato id={"jefe_" + f.id + "_colegiado"} nombre="Número de colegiado" clase="sm:col-span-4" />
                  <Dato id={"jefe_" + f.id + "_correoTrabajo"} nombre="Mail" clase="sm:col-span-12" />
                  <Dato
                    id={"jefe_" + f.id + "_notas"}
                    nombre="Notas"
                    pista="qué lleva, con qué temas le contactamos"
                    clase="sm:col-span-12"
                  />
                </div>
                {jefes.length > 1 && (
                  <div className="mt-2 flex justify-end">
                    <Quitar alPulsar={() => setJefes((l) => l.filter((_, j) => j !== i))} />
                  </div>
                )}
              </div>
            ))}
            <Anadir
              texto="+ Añadir otra persona si hay más de un jefe"
              vacio={jefes[jefes.length - 1].nombre.trim() === ""}
              alPulsar={() => setJefes((l) => [...l, nuevaFila()])}
            />
          </Caja>

          <Caja titulo="Quién más trabaja allí" tono="bg-form-quieto" borde="border-[#4a4a4a]">
            {gente.map((f, i) => (
              <div key={f.id} className="mb-3 rounded-[14px] border border-[#8a8a8a] bg-[#fffdf5] p-3">
                <div className="grid gap-x-6 gap-y-2 sm:grid-cols-12">
                  <Dato
                    id={"gente_" + f.id + "_nombre"}
                    nombre="Nombre"
                    clase="sm:col-span-7"
                    valor={f.nombre}
                    alEscribir={(v) => setGente((l) => l.map((x, j) => (j === i ? { ...x, nombre: v } : x)))}
                  />
                  <Dato id={"gente_" + f.id + "_cargo"} nombre="Cargo" clase="sm:col-span-5" />
                  <Dato id={"gente_" + f.id + "_departamento"} nombre="Dpto." clase="sm:col-span-5" />
                  <Dato id={"gente_" + f.id + "_desde"} nombre="Desde cuándo trabaja aquí" tipo="date" clase="sm:col-span-4" />
                  <Dato id={"gente_" + f.id + "_colegiado"} nombre="Número de colegiado" clase="sm:col-span-3" />
                  <Dato id={"gente_" + f.id + "_correoTrabajo"} nombre="Mail empresa" clase="sm:col-span-7" />
                  <Dato
                    id={"gente_" + f.id + "_telefonoTrabajo"}
                    nombre="Tel. trabajo"
                    clase="sm:col-span-5"
                    {...(i === 0
                      ? {
                          valor: contacto.trabajador,
                          alEscribir: (v: string) => setContacto((c) => ({ ...c, trabajador: v })),
                        }
                      : {})}
                  />
                  <Dato id={"gente_" + f.id + "_correoPersonal"} nombre="Mail personal" clase="sm:col-span-7" />
                  <Dato id={"gente_" + f.id + "_telefonoPersonal"} nombre="Tel. personal" clase="sm:col-span-5" />
                  {/* Notas: en UNA linea, pero conservando su caja. */}
                  <label className="flex items-start gap-2 sm:col-span-12" htmlFor={"gente_" + f.id + "_notas"}>
                    <span className={etiqueta + " pt-2"}>Notas</span>
                    <textarea
                      id={"gente_" + f.id + "_notas"}
                      name={"gente_" + f.id + "_notas"}
                      rows={1}
                      placeholder="qué lleva, con qué temas le contactamos"
                      className={caja + " min-h-9 flex-1 resize-y placeholder:text-carbon/45"}
                    />
                  </label>
                </div>
                {gente.length > 1 && (
                  <div className="mt-2 flex justify-end">
                    <Quitar alPulsar={() => setGente((l) => l.filter((_, j) => j !== i))} />
                  </div>
                )}
              </div>
            ))}
            <Anadir
              texto="+ Añadir otra persona"
              vacio={gente[gente.length - 1].nombre.trim() === ""}
              alPulsar={() => setGente((l) => [...l, nuevaFila()])}
            />
          </Caja>

          <Caja
            titulo="Formas de contacto si se organiza por departamentos"
            tono="bg-form-quieto"
            borde="border-[#636363]"
          >
            {/* En DOS lineas, como los dejo ella: si van los cuatro en una, no
                cabe el texto en ninguna caja y no se gana altura. */}
            {departamentos.map((f, i) => (
              <div key={f.id} className="mb-3 grid gap-x-6 gap-y-2 sm:grid-cols-12">
                <Dato
                  id={"depto_" + f.id + "_nombre"}
                  nombre="Departamento"
                  clase="sm:col-span-5"
                  valor={f.nombre}
                  alEscribir={(v) => setDepartamentos((l) => l.map((x, j) => (j === i ? { ...x, nombre: v } : x)))}
                />
                <Dato
                  id={"depto_" + f.id + "_queHace"}
                  nombre="Qué hace"
                  pista="para entendernos nosotros"
                  clase="sm:col-span-7"
                />
                <Dato id={"depto_" + f.id + "_correo"} nombre="Mail" clase="sm:col-span-7" />
                <Dato id={"depto_" + f.id + "_telefono"} nombre="Teléfono" clase="sm:col-span-4" />
                {departamentos.length > 1 && (
                  <div className="flex items-end sm:col-span-1">
                    <Quitar alPulsar={() => setDepartamentos((l) => l.filter((_, j) => j !== i))} />
                  </div>
                )}
              </div>
            ))}
            <Anadir
              texto="+ Añadir departamento"
              vacio={departamentos[departamentos.length - 1].nombre.trim() === ""}
              alPulsar={() => setDepartamentos((l) => [...l, nuevaFila()])}
            />
          </Caja>
        </div>

        {/* ===================== columna derecha ===================== */}
        <div className="grid gap-4">
          <Caja titulo="Nuestra relación con la administración de fincas" tono="bg-form-quieto" borde="border-[#707070]">
            <div className="grid gap-[14px] sm:grid-cols-3">
              <Elegir id="comercial" nombre="Comercial que la lleva ahora" opciones={comerciales} />
              <Elegir id="comercial_captador" nombre="Comercial que la captó" opciones={comerciales} />
              {/* Por defecto hoy: cuanto menos haya que escribir, mejor. */}
              <Campo id="alta_cartera" nombre="Fecha de alta en cartera" tipo="date" defecto={hoy()} />
            </div>

            <Caja titulo="Cómo le hemos conocido" tono="bg-[#fffbeb]" borde="border-[#8a8a8a]" clase="mt-4">
              <div className="grid gap-[14px] sm:grid-cols-2">
                <Campo id="llego_quien" nombre="Nos llegó a través de" pista="la persona" />
                <Elegir id="llego_por" nombre="Nos conoció por (vía)" opciones={VIAS} />
                <Campo
                  id="origen_notas"
                  nombre="Notas"
                  pista="es la vecina de X, fue en la feria de Y, es el cuñado de…"
                  clase="sm:col-span-2"
                />
              </div>

              <section className="mt-3 rounded-[14px] border border-[#4d0505] bg-[#e1cbcb] p-3">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#4d0505]">
                  Rellenar si nos llega a través de otro y hay condiciones a respetar
                </h3>
                <div className="grid items-end gap-[14px] sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]">
                  <label
                    className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase leading-tight text-[#4d0505]"
                    htmlFor="respetar"
                  >
                    <input
                      id="respetar"
                      name="respetar"
                      type="checkbox"
                      checked={respetar}
                      onChange={(e) => setRespetar(e.target.checked)}
                      className="size-6 shrink-0 accent-[#4d0505]"
                    />
                    <span>
                      Es de otro
                      <br />
                      no pisar
                    </span>
                  </label>
                  <Campo id="de_quien_es" nombre="Nos llegó por" />
                  <Elegir id="servicio_reservado" nombre="No ofrecerle jamás" opciones={RESERVADO} />
                </div>
              </section>
            </Caja>

            {/* Mas estrecha a proposito: el hueco que queda al lado es lo que
                hace que la comision resalte. */}
            <Caja
              titulo="¿Este administrador cobra comisión?"
              tono="bg-[#fbecb6]"
              borde="border-[#1b1c6b]"
              clase="mt-4 sm:mx-auto sm:w-[74%]"
            >
              <input type="hidden" name="comision_estado" value={comision} />
              <div className="flex flex-wrap items-center gap-1.5">
                {COMISION.map((o) => (
                  <button
                    key={o.valor}
                    type="button"
                    onClick={() => setComision(o.valor)}
                    className={
                      "rounded-lg border px-3 py-1 text-xs font-bold transition " +
                      (comision === o.valor ? o.vivo : "border-black/10 bg-white/60 text-carbon/35 hover:text-carbon/70")
                    }
                  >
                    {o.texto}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-end gap-3">
                <Elegir
                  id="comision_titular"
                  nombre="Quién la cobra"
                  opciones={suGente}
                  clase="min-w-0 flex-1"
                  vacio={suGente.length ? "—" : "primero da de alta a alguien"}
                  desactivado={suGente.length === 0}
                />
                <span
                  title="La ficha de comisión todavía no está montada"
                  className="inline-flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-lg border border-[#1b1c6b]/40 bg-white px-2.5 py-1 text-[11px] font-bold leading-tight text-[#1b1c6b]/70"
                >
                  <span aria-hidden className="text-base">
                    ↗
                  </span>
                  <span>
                    abrir
                    <br />
                    ficha comisión
                  </span>
                </span>
              </div>
            </Caja>
          </Caja>

          <Caja titulo="Datos de la empresa administradora de fincas" tono="bg-form-quieto" borde="border-[#696969]">
            <div className="grid gap-x-6 gap-y-2 sm:grid-cols-12">
              <Dato id="nombre_legal" nombre="Nombre legal" pista="el de la tarjeta del CIF" clase="sm:col-span-8" />
              <Dato id="cif" nombre="CIF" clase="sm:col-span-4" />
              <Dato id="direccion" nombre="Dirección" clase="sm:col-span-12" />
              <Dato id="correo_general" nombre="Correo general principal" clase="sm:col-span-7" />
              <Dato id="telefono_general" nombre="Teléfono general principal" clase="sm:col-span-5" />
              {Array.from({ length: correos - 1 }, (_, i) => (
                <Dato key={i} id={"correo_mas_" + i} nombre="Otro correo" clase="sm:col-span-7" />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-baseline gap-4">
              <Anadir texto="+ Añadir otro correo" vacio={false} alPulsar={() => setCorreos((n) => n + 1)} />
              <span className="text-xs text-carbon/65">
                Para más teléfonos, se da de alta el departamento: recepción, contabilidad…
              </span>
            </div>
          </Caja>
        </div>
      </div>
    </form>
  );
}
