"use client";

import Link from "next/link";
import { useState } from "react";
import { Elegir, type Opcion } from "../../../components/Elegir";
import type { FichaAdministracion, NotaFicha, OpcionesFicha, PersonaFicha } from "../../../../lib/fichaAdministracion";

// LA FICHA DE UNA ADMINISTRACION DE FINCAS (Monica, 20-oct-2026): el alta del
// 26-sep (nueva/Formulario.tsx) con los datos dentro y escribiendo encima, mas
// lo bueno de la ficha del 10-sep. Su colocacion, en lib/fichaAdministracion.ts.
//
// Las piezas (Caja, Dato, Anadir, Quitar) son las del alta, con sus colores:
// si cambian alli, se cambian aqui igual.

const etiqueta = "shrink-0 text-[10px] font-bold uppercase tracking-wide text-carbon/70";
const caja =
  "w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm text-carbon outline-none transition focus:border-lima";

const RESERVADO: Opcion[] = [
  { valor: "ascensor", texto: "Ascensor" },
  { valor: "sate", texto: "SATE" },
  { valor: "ascensor_y_sate", texto: "Ascensor y SATE" },
];

const COMISION = [
  { valor: "cobra", texto: "Sí", vivo: "bg-lima text-carbon border-lima" },
  { valor: "no_cobra", texto: "No", vivo: "bg-ajeno text-white border-ajeno" },
  { valor: "sin_hablar", texto: "Pendiente hablarlo", vivo: "bg-alerta text-white border-alerta" },
] as const;

/** El color de "en que punto esta", por bloque (el de la maqueta del 7-oct). */
const PUNTO: Record<number, string> = {
  0: "bg-black/5 text-carbon/70",
  1: "bg-[#E3EAF0] text-[#104269]",
  2: "bg-[#E9F3EC] text-[#0C8124]",
  3: "bg-[#fdf6e3] text-[#8a5a00]",
  4: "bg-[#F7EAEA] text-[#820707]",
};

const fecha = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");

let siguiente = 0;
const nuevaClave = () => "n" + ++siguiente;

function Caja({
  titulo,
  tit = "text-[14px] text-carbon/85",
  tono = "bg-form-quieto",
  borde = "border-marco",
  clase = "",
  aux,
  children,
}: {
  titulo?: string;
  tit?: string;
  tono?: string;
  borde?: string;
  clase?: string;
  aux?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={"min-w-0 rounded-[14px] border p-4 shadow-sm " + borde + " " + tono + " " + clase}>
      {titulo && (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className={"font-bold uppercase tracking-wider " + tit}>{titulo}</h2>
          {aux}
        </div>
      )}
      {children}
    </section>
  );
}

/** FORMATO FICHA: etiqueta y campo en la misma linea. */
function Dato({ id, nombre, clase = "", defecto, pista, tipo }: { id: string; nombre: string; clase?: string; defecto?: string | null; pista?: string; tipo?: string }) {
  return (
    <label className={"flex min-w-0 items-baseline gap-2 " + clase} htmlFor={id}>
      <span className={etiqueta}>{nombre}</span>
      <input
        id={id}
        name={id}
        type={tipo}
        defaultValue={defecto ?? ""}
        placeholder={pista}
        className="min-w-0 flex-1 border-0 border-b border-black/20 bg-transparent px-1 py-0.5 text-sm text-carbon outline-none transition placeholder:text-carbon/45 focus:border-lima"
      />
    </label>
  );
}

function Quitar({ alPulsar, titulo = "Quitar esta línea" }: { alPulsar: () => void; titulo?: string }) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      title={titulo}
      aria-label={titulo}
      className="shrink-0 self-end rounded-lg border border-black/10 bg-white px-2.5 py-0.5 text-base leading-tight text-carbon/65 transition hover:border-alerta hover:text-alerta"
    >
      &times;
    </button>
  );
}

function Anadir({ texto, alPulsar, vacio = false }: { texto: string; alPulsar: () => void; vacio?: boolean }) {
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

/** LAS NOTAS de una persona o de la casa: fecha, quien y el texto. Si no hay,
 *  no sale nada; "+ añadir nota" abre la caja de la nueva. La fecha y el autor
 *  los pone la app al guardar. */
function Notas({ nombre, notas, abierta, alAbrir }: { nombre: string; notas: NotaFicha[]; abierta: boolean; alAbrir: () => void }) {
  return (
    <div className="min-w-0">
      {notas.length > 0 && (
        <ul className="mb-1 space-y-0.5">
          {notas.map((n) => (
            <li key={n.id} className="flex gap-2 text-sm leading-snug">
              <span className="shrink-0 whitespace-nowrap text-xs text-carbon/65 tabular-nums">
                {n.fecha ? `${fecha(n.fecha)} · ${n.autor ?? ""}` : "sin fecha"}
              </span>
              <span className="min-w-0 text-carbon/90">{n.texto}</span>
            </li>
          ))}
        </ul>
      )}
      {abierta ? (
        <textarea
          name={nombre}
          rows={1}
          autoFocus
          placeholder="la nota: se guarda con la fecha de hoy y tu nombre"
          className={caja + " min-h-9 resize-y placeholder:text-carbon/45"}
        />
      ) : (
        <Anadir texto="+ añadir nota" alPulsar={alAbrir} />
      )}
    </div>
  );
}

type Fila = PersonaFicha & { clave: string; nueva: boolean; quitada: boolean; jefeAntes: boolean };
const filaDe = (p: PersonaFicha): Fila => ({ ...p, clave: p.puestoId, nueva: false, quitada: false, jefeAntes: p.jefe });

/** PASAR DE JEFE A EMPLEADO, O AL REVES (Monica, 20-oct-2026: "apuntamos un
 *  nombre y no sabemos si es jefe o currito"). La persona cambia de caja en el
 *  momento; se guarda con Guardar, como todo. */
function Mover({ aJefe, alPulsar }: { aJefe: boolean; alPulsar: () => void }) {
  const t = aJefe ? "Es el jefe: pasarlo arriba" : "No es el jefe: pasarlo a «quién más trabaja allí»";
  return (
    <button
      type="button"
      onClick={alPulsar}
      title={t}
      aria-label={t}
      className="shrink-0 self-end whitespace-nowrap rounded-lg border border-black/10 bg-white px-2 py-0.5 text-[12px] font-semibold leading-tight text-carbon/65 transition hover:border-lima hover:text-lima-dark"
    >
      {aJefe ? "↑ jefe" : "↓ empleado"}
    </button>
  );
}

/** Se ha movido de caja y aun no se ha guardado. */
const Movido = ({ f }: { f: Fila }) =>
  !f.nueva && f.jefe !== f.jefeAntes ? (
    <span className="text-xs text-amber-800/80">{f.jefe ? "pasa a jefe al guardar" : "deja de ser jefe al guardar"}</span>
  ) : null;
const filaNueva = (jefe: boolean): Fila => ({
  puestoId: "",
  personaId: null,
  nombre: "",
  cargo: null,
  jefe,
  telefono: null,
  telefonoPersonal: null,
  correo: null,
  colegiado: null,
  comercialId: null,
  departamentoId: null,
  notas: [],
  clave: nuevaClave(),
  nueva: true,
  quitada: false,
  jefeAntes: jefe,
});

export function Ficha({
  ficha,
  opciones,
  accion,
  puedeEditar,
  comision,
}: {
  ficha: FichaAdministracion;
  opciones: OpcionesFicha;
  accion: (fd: FormData) => void;
  puedeEditar: boolean;
  /** Lo pactado: no lo ve, lo ve, o lo ve y lo cambia. */
  comision: "no" | "ve" | "edita";
}) {
  const [gente, setGente] = useState<Fila[]>(() => ficha.personas.map(filaDe));
  const [deptos, setDeptos] = useState(() => ficha.departamentos.map((d) => ({ ...d, clave: d.id, nueva: false })));
  const [notaAbierta, setNotaAbierta] = useState<Set<string>>(new Set());
  const [estadoComision, setEstadoComision] = useState<string>(ficha.comisionEstado);
  const o = ficha.origen;
  const [respetar, setRespetar] = useState(o?.respetar ?? false);
  const hayCondiciones = !!(o?.respetar || o?.duenoContrataId || o?.servicioReservado || o?.condicionesNotas);
  const [verNotasCondiciones, setVerNotasCondiciones] = useState(!!o?.condicionesNotas);
  const [verCondiciones, setVerCondiciones] = useState(hayCondiciones);
  const [verNotasOrigen, setVerNotasOrigen] = useState(!!o?.notas);
  const [enviando, setEnviando] = useState(false);

  const abrir = (k: string) => setNotaAbierta((s) => new Set(s).add(k));
  const cambiar = (clave: string, cambio: Partial<Fila>) => setGente((l) => l.map((f) => (f.clave === clave ? { ...f, ...cambio } : f)));
  const quitar = (f: Fila) => (f.nueva ? setGente((l) => l.filter((x) => x.clave !== f.clave)) : cambiar(f.clave, { quitada: !f.quitada }));

  const jefes = gente.filter((f) => f.jefe);
  const resto = gente.filter((f) => !f.jefe);
  const comerciales: Opcion[] = opciones.comerciales.map((c) => ({ valor: c.id, texto: c.nombre }));
  const canales: Opcion[] = opciones.canales.map((c) => ({ valor: c.id, texto: c.nombre }));
  const contratas: Opcion[] = opciones.contratas.map((c) => ({ valor: c.id, texto: c.nombre }));
  // El contacto de un departamento se ELIGE entre la gente que ya esta guardada.
  const suGente: Opcion[] = gente.filter((f) => !f.nueva && !f.quitada).map((f) => ({ valor: f.puestoId, texto: f.nombre }));

  /** Los campos que todos llevan, ocultos o no, para que el guardado los encuentre. */
  const ocultos = (f: Fila) => (
    <>
      {f.jefe && <input type="hidden" name={`p_${f.clave}_jefe`} value="1" />}
      {f.quitada && <input type="hidden" name={`p_${f.clave}_quitar`} value="1" />}
    </>
  );

  return (
    <form action={accion} onSubmit={() => setEnviando(true)} className="grid gap-4">
      {/* ---- la cabecera: el nombre, y debajo telefono y correo ---- */}
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <input
            name="nombre"
            defaultValue={ficha.nombre}
            aria-label="Nombre de la administración"
            className="min-w-0 flex-1 border-0 border-b border-transparent bg-transparent text-2xl font-bold text-carbon outline-none transition hover:border-black/20 focus:border-lima sm:text-3xl"
          />
          {puedeEditar && (
            <div className="flex items-center gap-2">
              <Link
                href={`/administracion/administraciones/${ficha.id}`}
                className="rounded-lg border border-black/15 bg-white px-4 py-2 text-sm text-carbon/75 transition hover:border-lima"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={enviando}
                className="rounded-lg bg-lima px-6 py-2 text-sm font-bold text-carbon transition hover:bg-lima-dark hover:text-white disabled:cursor-not-allowed disabled:bg-black/5 disabled:text-carbon/35"
              >
                {enviando ? "Guardando…" : "Guardar"}
              </button>
            </div>
          )}
        </div>
        <div className="mt-2 grid max-w-[720px] gap-x-8 gap-y-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Dato id="telefono" nombre="Teléfono" defecto={ficha.telefono} />
          <Dato id="correo" nombre="Mail" defecto={ficha.correo} />
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,601fr)_minmax(0,590fr)]">
        {/* ===================== columna izquierda ===================== */}
        <div className="grid gap-4">
          <Caja titulo="Quién es el jefe" tit="text-[15px] text-[#31600b]">
            {jefes.length === 0 && <p className="mb-2 text-sm italic text-amber-700/70">No está marcado quién manda.</p>}
            {jefes.map((f) => (
              <div key={f.clave} className={"mb-3 rounded-[14px] border-2 border-marco bg-[#fffdf5] p-3 " + (f.quitada ? "opacity-45" : "")}>
                {ocultos(f)}
                <div className="grid gap-x-6 gap-y-2 sm:grid-cols-12">
                  <label className="flex min-w-0 items-baseline gap-2 sm:col-span-12" htmlFor={`p_${f.clave}_nombre`}>
                    <span className={etiqueta}>Nombre</span>
                    <input
                      id={`p_${f.clave}_nombre`}
                      name={`p_${f.clave}_nombre`}
                      value={f.nombre}
                      onChange={(e) => cambiar(f.clave, { nombre: e.target.value })}
                      className="min-w-0 flex-1 border-0 border-b border-black/20 bg-transparent px-1 py-0.5 text-sm font-semibold text-carbon outline-none focus:border-lima"
                    />
                  </label>
                  <Dato id={`p_${f.clave}_tel`} nombre="Tel. trabajo" defecto={f.telefono} pista={f.telefonoPersonal ? `personal: ${f.telefonoPersonal}` : undefined} clase="sm:col-span-6" />
                  <Dato id={`p_${f.clave}_col`} nombre="Num Col." defecto={f.colegiado} clase="sm:col-span-6" />
                  <Dato id={`p_${f.clave}_mail`} nombre="Mail" defecto={f.correo} clase="sm:col-span-12" />
                  <div className="flex items-start gap-2 sm:col-span-12">
                    <span className={etiqueta + " pt-0.5"}>Notas</span>
                    <Notas nombre={`p_${f.clave}_nota`} notas={f.notas} abierta={notaAbierta.has(f.clave)} alAbrir={() => abrir(f.clave)} />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-end gap-2">
                  <Movido f={f} />
                  {f.quitada && <span className="text-xs text-alerta">ya no trabaja aquí: se quita al guardar</span>}
                  {!f.quitada && <Mover aJefe={false} alPulsar={() => cambiar(f.clave, { jefe: false })} />}
                  <Quitar alPulsar={() => quitar(f)} titulo={f.nueva ? "Quitar esta línea" : f.quitada ? "Deshacer" : "Ya no trabaja aquí"} />
                </div>
              </div>
            ))}
            <Anadir
              texto="+ Añadir otra persona si hay más de un jefe"
              vacio={jefes.some((f) => f.nueva && f.nombre.trim() === "")}
              alPulsar={() => setGente((l) => [...l, filaNueva(true)])}
            />
          </Caja>

          <Caja titulo="Quién más trabaja allí">
            {resto.length === 0 && <p className="mb-2 text-sm italic text-carbon/65">No hay nadie más dado de alta.</p>}
            <ul className="divide-y divide-black/5">
              {resto.map((f) => (
                <li key={f.clave} className={"py-2 " + (f.quitada ? "opacity-45" : "")}>
                  {ocultos(f)}
                  <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-12">
                    <label className="flex min-w-0 items-baseline gap-2 sm:col-span-4" htmlFor={`p_${f.clave}_nombre`}>
                      <input
                        id={`p_${f.clave}_nombre`}
                        name={`p_${f.clave}_nombre`}
                        value={f.nombre}
                        placeholder="nombre"
                        onChange={(e) => cambiar(f.clave, { nombre: e.target.value })}
                        className="min-w-0 flex-1 border-0 border-b border-black/20 bg-transparent px-1 py-0.5 text-sm font-semibold text-carbon outline-none placeholder:font-normal placeholder:text-carbon/45 focus:border-lima"
                      />
                    </label>
                    <Dato id={`p_${f.clave}_cargo`} nombre="Cargo" defecto={f.cargo} clase="sm:col-span-4" />
                    <div className="sm:col-span-4">
                      <Elegir id={`p_${f.clave}_comercial`} nombre="Lo lleva" opciones={comerciales} defecto={f.comercialId ?? undefined} />
                    </div>
                    <Dato id={`p_${f.clave}_tel`} nombre="Tel." defecto={f.telefono} pista={f.telefonoPersonal ? `personal: ${f.telefonoPersonal}` : undefined} clase="sm:col-span-4" />
                    <Dato id={`p_${f.clave}_mail`} nombre="Mail" defecto={f.correo} clase="sm:col-span-6" />
                    <div className="flex items-end justify-end gap-1.5 sm:col-span-2">
                      {!notaAbierta.has(f.clave) && f.notas.length === 0 && (
                        <button
                          type="button"
                          onClick={() => abrir(f.clave)}
                          title="Añadir nota"
                          aria-label="Añadir nota"
                          className="rounded-lg border border-black/10 bg-white px-2 py-0.5 text-sm text-carbon/65 transition hover:border-lima hover:text-lima-dark"
                        >
                          ✎
                        </button>
                      )}
                      {!f.quitada && <Mover aJefe alPulsar={() => cambiar(f.clave, { jefe: true })} />}
                      <Quitar alPulsar={() => quitar(f)} titulo={f.nueva ? "Quitar esta línea" : f.quitada ? "Deshacer" : "Ya no trabaja aquí"} />
                    </div>
                    {!f.nueva && f.jefe !== f.jefeAntes && (
                      <p className="sm:col-span-12">
                        <Movido f={f} />
                      </p>
                    )}
                    {/* Las notas, solo si hay (o si se acaba de pulsar el lapiz). */}
                    {(f.notas.length > 0 || notaAbierta.has(f.clave)) && (
                      <div className="sm:col-span-12">
                        <Notas nombre={`p_${f.clave}_nota`} notas={f.notas} abierta={notaAbierta.has(f.clave)} alAbrir={() => abrir(f.clave)} />
                      </div>
                    )}
                    {f.quitada && <p className="text-xs text-alerta sm:col-span-12">ya no trabaja aquí: se quita al guardar</p>}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-2">
              <Anadir
                texto="+ Añadir otra persona"
                vacio={resto.some((f) => f.nueva && f.nombre.trim() === "")}
                alPulsar={() => setGente((l) => [...l, filaNueva(false)])}
              />
            </div>
          </Caja>

          <Caja
            titulo="Se organiza por departamentos"
            aux={deptos.length === 0 ? <span className="text-sm font-bold text-carbon/85">No</span> : undefined}
          >
            {deptos.map((d) => (
              <div key={d.clave} className="mb-3 grid gap-x-6 gap-y-2 border-b border-black/5 pb-3 sm:grid-cols-12">
                <label className="flex min-w-0 items-baseline gap-2 sm:col-span-5" htmlFor={`d_${d.clave}_nombre`}>
                  <span className={etiqueta}>Departamento</span>
                  <input
                    id={`d_${d.clave}_nombre`}
                    name={`d_${d.clave}_nombre`}
                    value={d.nombre}
                    onChange={(e) => setDeptos((l) => l.map((x) => (x.clave === d.clave ? { ...x, nombre: e.target.value } : x)))}
                    className="min-w-0 flex-1 border-0 border-b border-black/20 bg-transparent px-1 py-0.5 text-sm text-carbon outline-none focus:border-lima"
                  />
                </label>
                <Dato id={`d_${d.clave}_mail`} nombre="Mail" defecto={d.correo} clase="sm:col-span-4" />
                <Dato id={`d_${d.clave}_tel`} nombre="Teléfono" defecto={d.telefono} clase="sm:col-span-3" />
                <div className="sm:col-span-5">
                  <Elegir
                    id={`d_${d.clave}_contacto`}
                    nombre="Contacto"
                    opciones={suGente}
                    defecto={d.contactoId ?? undefined}
                    vacio={suGente.length ? "—" : "primero da de alta a alguien"}
                    desactivado={suGente.length === 0}
                  />
                </div>
                <Dato id={`d_${d.clave}_quehace`} nombre="Qué hace" defecto={d.queHace} pista="para entendernos nosotros, qué se hace aquí" clase="sm:col-span-7" />
                {d.nueva && (
                  <div className="flex justify-end sm:col-span-12">
                    <Quitar alPulsar={() => setDeptos((l) => l.filter((x) => x.clave !== d.clave))} />
                  </div>
                )}
              </div>
            ))}
            <Anadir
              texto="+ Añadir departamento"
              vacio={deptos.some((d) => d.nueva && d.nombre.trim() === "")}
              alPulsar={() =>
                setDeptos((l) => [...l, { id: "", nombre: "", telefono: null, correo: null, queHace: null, contactoId: null, clave: nuevaClave(), nueva: true }])
              }
            />
          </Caja>

          <Caja titulo="Oportunidades abiertas" aux={<span className="text-sm text-carbon/65">{ficha.opps.length}</span>}>
            {ficha.opps.length === 0 ? (
              <p className="text-sm italic text-carbon/65">No hay ninguna abierta en sus comunidades.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-auto text-[13px]">
                  <thead>
                    <tr className="border-b border-black/10 text-left text-[10px] uppercase tracking-wide text-carbon/70">
                      <th className="py-1.5 pr-4 font-bold">Oportunidad</th>
                      <th className="py-1.5 pr-4 font-bold">En qué punto está</th>
                      <th className="py-1.5 pr-4 font-bold">Comercial</th>
                      <th className="py-1.5 text-right font-bold">Último contacto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ficha.opps.map((op) => (
                      <tr key={op.id} className="border-b border-black/5 align-top">
                        <td className="max-w-[260px] py-1.5 pr-4">
                          <Link href={`/comercial/oportunidades/${op.id}`} className="font-semibold text-carbon underline decoration-black/20 underline-offset-2 hover:text-lima-dark">
                            {op.nombre}
                          </Link>
                        </td>
                        <td className="py-1.5 pr-4">
                          <span className={"inline-block rounded-md px-2 py-0.5 text-xs " + (PUNTO[op.bloque] ?? PUNTO[0])}>{op.punto}</span>
                        </td>
                        <td className="whitespace-nowrap py-1.5 pr-4 text-carbon/85">{op.comercial ?? "—"}</td>
                        <td className="whitespace-nowrap py-1.5 text-right tabular-nums text-carbon/85">{fecha(op.ultimoContacto) || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Caja>
        </div>

        {/* ===================== columna derecha ===================== */}
        <div className="grid gap-4">
          <Caja titulo="Nuestra relación con la administración de fincas" tit="text-[17px] text-[#31600b]">
            {/* 1 · condiciones a respetar */}
            <section className="rounded-[14px] border border-[#4d0505] bg-[#e1cbcb] p-3">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[12px] font-bold uppercase tracking-wide text-[#841a1a]">Condiciones a respetar</h3>
                {!verCondiciones && <span className="text-sm font-bold text-[#3e0404]">No hay</span>}
              </div>
              {verCondiciones ? (
                <div className="mt-2 grid items-end gap-[14px] sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]">
                  <label className="cursor-pointer text-[9px] font-extrabold uppercase leading-tight text-[#3e0404]" htmlFor="respetar">
                    <span className="block">
                      Es de otro
                      <br />
                      no pisar
                    </span>
                    <input id="respetar" name="respetar" type="checkbox" checked={respetar} onChange={(e) => setRespetar(e.target.checked)} className="ml-3 mt-1.5 size-6 accent-[#4d0505]" />
                  </label>
                  <Elegir id="de_quien_es" nombre="Nos llegó por" tinta="font-extrabold text-[#720808]" opciones={contratas} defecto={o?.duenoContrataId ?? undefined} />
                  <Elegir id="servicio_reservado" nombre="No ofrecerle jamás" opciones={RESERVADO} tinta="font-extrabold text-[#720808]" defecto={o?.servicioReservado ?? undefined} />
                  {/* Sus notas, aparte de las de "como le conocimos". Muy importantes. */}
                  <div className="sm:col-span-3">
                    {verNotasCondiciones ? (
                      <label className="flex items-start gap-2" htmlFor="condiciones_notas">
                        <span className="shrink-0 pt-2 text-[10px] font-extrabold uppercase tracking-wide text-[#720808]">Notas</span>
                        <textarea
                          id="condiciones_notas"
                          name="condiciones_notas"
                          rows={1}
                          defaultValue={o?.condicionesNotas ?? ""}
                          className={caja + " min-h-9 flex-1 resize-y"}
                        />
                      </label>
                    ) : (
                      <Anadir texto="+ añadir nota" alPulsar={() => setVerNotasCondiciones(true)} />
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-1">
                  <Anadir texto="+ Añadir condiciones" alPulsar={() => setVerCondiciones(true)} />
                </div>
              )}
            </section>

            {/* 2 · lo pactado: la comision. Solo algunas funciones la ven. */}
            {comision !== "no" && (
              <section className="mt-3 rounded-[14px] border border-[#1b1c6b] bg-[#fbecb6] p-3">
                <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[#1b1a6b]">Lo pactado con ellos</h3>
                {comision === "edita" && <input type="hidden" name="comision_estado" value={estadoComision} />}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex gap-1.5">
                    {COMISION.map((c) => (
                      <button
                        key={c.valor}
                        type="button"
                        disabled={comision !== "edita"}
                        onClick={() => setEstadoComision(c.valor)}
                        className={
                          "rounded-lg border px-3 py-1 text-xs font-bold transition disabled:cursor-default " +
                          (estadoComision === c.valor ? c.vivo : "border-black/10 bg-white/60 text-carbon/35 hover:text-carbon/70")
                        }
                      >
                        {c.texto}
                      </button>
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-[#1b1a6b]">
                    {estadoComision === "cobra" ? (
                      ficha.acuerdoId ? (
                        <Link href={`/ecobalance/comisiones/${ficha.acuerdoId}`} className="underline underline-offset-2 hover:text-lima-dark">
                          ver ficha ↗
                        </Link>
                      ) : (
                        <span className="text-carbon/70">aún sin ficha de comisión</span>
                      )
                    ) : estadoComision === "no_cobra" ? (
                      "No hay"
                    ) : (
                      "Pendiente de hablarlo"
                    )}
                  </span>
                </div>
              </section>
            )}

            {/* 3 · como le conocimos */}
            <section className="mt-3 rounded-[14px] border border-marco bg-[#fffdf5] p-3">
              <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-carbon/85">Cómo le hemos conocido</h3>
              <div className="grid gap-[14px] sm:grid-cols-2">
                <Elegir id="llego_quien" nombre="Nos llegó a través de" opciones={opciones.quienes} defecto={o?.quien ?? undefined} conPista />
                <Elegir id="llego_por" nombre="Nos conoció por (vía)" opciones={canales} defecto={o?.canalId ?? undefined} />
              </div>
              <div className="mt-2">
                {verNotasOrigen ? (
                  <label className="flex items-start gap-2" htmlFor="origen_notas">
                    <span className={etiqueta + " pt-2"}>Notas</span>
                    <textarea id="origen_notas" name="origen_notas" rows={1} defaultValue={o?.notas ?? ""} className={caja + " min-h-9 flex-1 resize-y"} />
                  </label>
                ) : (
                  <Anadir texto="+ añadir nota" alPulsar={() => setVerNotasOrigen(true)} />
                )}
              </div>
            </section>
          </Caja>

          <Caja titulo="Datos de la empresa administradora de fincas">
            <div className="grid gap-x-6 gap-y-2 sm:grid-cols-12">
              <Dato id="nombre_legal" nombre="Nombre legal" defecto={ficha.nombreLegal} pista="el de la tarjeta del CIF" clase="sm:col-span-8" />
              <Dato id="cif" nombre="CIF" defecto={ficha.cif} clase="sm:col-span-4" />
              <Dato id="direccion" nombre="Dirección" defecto={ficha.direccion} clase="sm:col-span-8" />
              <Dato id="municipio" nombre="Localidad" defecto={ficha.municipio} clase="sm:col-span-4" />
              <div className="flex items-start gap-2 sm:col-span-12">
                <span className={etiqueta + " pt-0.5"}>Notas</span>
                <Notas nombre="empresa_nota" notas={ficha.notas} abierta={notaAbierta.has("empresa")} alAbrir={() => abrir("empresa")} />
              </div>
            </div>
          </Caja>
        </div>
      </div>
    </form>
  );
}
