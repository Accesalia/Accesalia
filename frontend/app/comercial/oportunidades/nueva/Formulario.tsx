"use client";

import Link from "next/link";
import { useState } from "react";
import { Elegir, type Opcion } from "../../../components/Elegir";
import { Marcar } from "../../../components/Marcar";
import type { OpcionesOportunidad } from "../../../../lib/altaOportunidad";
import { PASOS_DE_ARRANQUE, RELACIONES } from "../../../../lib/oportunidadVocabulario";

// DAR DE ALTA UNA OPORTUNIDAD — montada sobre SU maqueta (27-sep-2026).
//
// Tres bloques, como los dejo ella: la cabecera con el comercial y la fecha a la
// derecha; debajo, a la izquierda el diario, y a la derecha los datos que
// tenemos. Dentro de los datos manda EL ORDEN, no las cajas: "de la comunidad" y
// "de la llamada" son lineas con su rotulito, y el contacto en la comunidad y
// lo que toca hacer van aparte.

const etiqueta = "block text-[10px] font-bold uppercase tracking-wide text-carbon/70";
const caja =
  "w-full rounded-lg border border-marco bg-white px-3 py-1.5 text-sm text-carbon outline-none transition placeholder:text-carbon/55 focus:border-lima";

/** Un rotulito que agrupa una linea de campos, sin dibujar otra tarjeta. */
function Rotulo({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-[#237812] first:mt-0">{children}</h3>;
}

function Campo({
  id,
  nombre,
  clase = "",
  tipo = "text",
  pista,
  defecto,
  soloLectura,
}: {
  id: string;
  nombre: string;
  clase?: string;
  tipo?: string;
  pista?: string;
  defecto?: string;
  soloLectura?: boolean;
}) {
  return (
    <label className={"block min-w-0 " + clase} htmlFor={id}>
      <span className={etiqueta}>{nombre}</span>
      <input
        id={id}
        name={id}
        type={tipo}
        placeholder={pista}
        defaultValue={defecto}
        readOnly={soloLectura}
        className={caja + " mt-1" + (soloLectura ? " bg-black/5 text-carbon/60" : "")}
      />
    </label>
  );
}

/** Una tarjeta dentro de los datos, para lo que ella quiso aparte. */
function Caja({ titulo, children, clase = "" }: { titulo: string; children: React.ReactNode; clase?: string }) {
  return (
    <section className={"mt-4 min-w-0 rounded-[14px] border border-marco bg-white/70 p-3 " + clase}>
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#237812]">{titulo}</h3>
      {children}
    </section>
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
  const administraciones: Opcion[] = opciones.administraciones.map((a) => ({
    valor: a.id,
    texto: a.nombre,
    pista: a.pista,
  }));
  const canales: Opcion[] = opciones.canales.map((c) => ({ valor: c.id, texto: c.nombre }));
  const contratas: Opcion[] = opciones.contratas.map((c) => ({ valor: c.id, texto: c.nombre }));
  const relaciones: Opcion[] = RELACIONES.map((r) => ({ valor: r.valor, texto: r.texto, pista: r.pista }));

  const [comercial, setComercial] = useState(opciones.miComercial ?? "");
  const [nota, setNota] = useState("");
  const [comunidad, setComunidad] = useState("");
  const [direccion, setDireccion] = useState("");
  const [admin, setAdmin] = useState("");
  const [quien, setQuien] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const [relacion, setRelacion] = useState("");
  const [telNuevo, setTelNuevo] = useState("");
  const [mailNuevo, setMailNuevo] = useState("");
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [mismo, setMismo] = useState(true);
  const [paso, setPaso] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Su regla para poder guardar: la entrada del diario, un comercial, y un hilo
  // del que tirar. Sin comercial no es una oportunidad, es una nota que se pierde.
  const hayHilo =
    comunidad !== "" ||
    direccion.trim() !== "" ||
    admin !== "" ||
    telNuevo.trim() !== "" ||
    mailNuevo.trim() !== "";
  const puedeGuardar = nota.trim() !== "" && comercial !== "" && hayHilo;

  const iniciales = opciones.comerciales.find((c) => c.id === comercial)?.pista;

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
            "input:not([type=hidden]):not([readonly]), select, textarea, button[data-paso]",
          ),
        ).filter((x) => x.offsetParent !== null);
        const i = campos.indexOf(t);
        if (i >= 0 && i < campos.length - 1) campos[i + 1].focus();
      }}
    >
      {/* ===================== la cabecera ===================== */}
      <div className="rounded-[14px] border border-marco bg-form-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[26px] font-extrabold leading-tight text-carbon">Nueva oportunidad</h1>
            <p className="mt-1 text-xs text-carbon/70">
              Lo único que no puede faltar es la entrada del diario. Y un comercial: sin comercial no es una
              oportunidad, es una nota que se pierde.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <Elegir
              id="comercial"
              nombre="Comercial que la lleva"
              opciones={comerciales}
              valor={comercial}
              alElegir={setComercial}
              clase="w-[230px]"
            />
            <Campo id="fecha_llamada" nombre="Fecha de la llamada" tipo="date" defecto={hoy} clase="w-[165px]" />
            <label className="block w-[210px]">
              <span className={etiqueta}>Número de orden</span>
              <span className={caja + " mt-1 block bg-black/5 text-carbon/60"}>
                {iniciales ? iniciales + "-" + new Date().getFullYear() + "-000" : "elige comercial"}
              </span>
            </label>
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
        <p className="mt-2 text-[11px] text-carbon/60">
          El número se asigna al guardar: lleva las iniciales del comercial que la capta, y no cambia aunque
          después la lleve otro.
        </p>
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,500fr)_minmax(0,670fr)]">
        {/* ===================== el diario ===================== */}
        <section className="min-w-0 rounded-[14px] border border-[#baa208] bg-[#fffdf5] p-4 shadow-sm">
          <h2 className="text-[19px] font-bold leading-tight text-carbon">La entrada del diario</h2>
          <p className="mb-3 mt-1 text-[10px] font-bold uppercase tracking-wide text-carbon/60">
            Sin esto no hay oportunidad
          </p>
          <label className="block" htmlFor="nota">
            <span className={etiqueta}>Qué te han contado</span>
            <textarea
              id="nota"
              name="nota"
              rows={9}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Me llama Adolfo, que en Carretas 28 quieren poner el SATE. Como es zona ZBE le voy a contar que si no arreglan la accesibilidad del portal no van a poder acceder a subvenciones. Me pasa el teléfono del presi, Alejandro."
              className={caja + " mt-1 min-h-[220px] resize-y"}
            />
          </label>
          <p className="mt-2 text-[11px] text-carbon/60">
            Sin límite: si hacen falta quinientas palabras, se escriben. El campo crece solo.
          </p>
        </section>

        {/* ===================== los datos que tenemos ===================== */}
        <section className="min-w-0 rounded-[14px] border border-[#237812] bg-[#fffdf5] p-4 shadow-sm">
          <h2 className="text-[19px] font-bold leading-tight text-carbon">Datos que tenemos</h2>
          <p className="mb-2 mt-1 text-[10px] font-bold uppercase tracking-wide text-carbon/60">
            Lo que haya. Nada de esto es obligatorio por separado
          </p>

          <Rotulo>De la comunidad</Rotulo>
          <div className="grid gap-[14px] sm:grid-cols-[minmax(0,365fr)_minmax(0,245fr)]">
            <div className="min-w-0">
              <Elegir
                id="comunidad"
                nombre="Dirección"
                opciones={comunidades}
                valor={comunidad}
                alElegir={setComunidad}
                vacio="no está en la lista"
              />
              {comunidad === "" && (
                <input
                  id="direccion_provisional"
                  name="direccion_provisional"
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="si no está, escríbela aquí y queda provisional"
                  className={caja + " mt-1.5"}
                />
              )}
            </div>
            <Elegir
              id="administracion"
              nombre="Quién es el administrador"
              opciones={administraciones}
              valor={admin}
              alElegir={setAdmin}
              vacio="todavía no lo sé"
            />
          </div>

          <Rotulo>De la llamada</Rotulo>
          <div className="grid gap-[14px] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Elegir
              id="quien"
              nombre="Quién me llama"
              opciones={opciones.quienes}
              valor={quien}
              alElegir={(v) => {
                setQuien(v);
                if (v) setNuevo(false);
              }}
              vacio="no está en la agenda"
            />
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setNuevo((x) => !x);
                  if (!nuevo) setQuien("");
                }}
                className={
                  "w-full rounded-lg border px-3 py-1.5 text-xs font-bold transition " +
                  (nuevo
                    ? "border-[#8a6410] bg-form-nuevo text-[#5c4208]"
                    : "border-marco bg-white text-carbon/70 hover:border-lima")
                }
              >
                {nuevo ? "✓ lo estoy creando" : "No está: crear contacto de agenda"}
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

          <Rotulo>Qué cosa les interesa</Rotulo>
          <Marcar
            id="tipos"
            nombre="De lo que vendemos, qué quieren"
            opciones={opciones.tipos.map((t) => ({ valor: t.id, texto: t.nombre, pista: t.pista }))}
            vacio="nada marcado todavía"
          />

          <Caja titulo="Contacto en la comunidad (si no es el administrador)">
            <label className="mb-2 flex cursor-pointer items-center gap-2 text-xs font-semibold text-carbon/80">
              <input
                type="checkbox"
                name="mismo_que_llama"
                checked={mismo}
                onChange={(e) => setMismo(e.target.checked)}
                className="size-5 accent-lima-dark"
              />
              Es el mismo que me llamó
            </label>
            {!mismo && (
              <div className="grid gap-[14px] sm:grid-cols-12">
                <Elegir
                  id="contacto"
                  nombre="A quién llamo allí"
                  opciones={opciones.contactos}
                  clase="sm:col-span-12"
                  vacio="no está en la lista"
                />
                <Campo
                  id="contacto_nombre"
                  nombre="Si no está: cómo se llama"
                  clase="sm:col-span-5"
                  pista="a quien tengo que llamar"
                />
                <Campo id="contacto_telefono" nombre="Teléfono" clase="sm:col-span-4" />
                <Campo id="contacto_correo" nombre="Correo" clase="sm:col-span-3" />
              </div>
            )}
          </Caja>

          <Caja titulo="Qué tengo que hacer">
            <div className="flex flex-wrap gap-2">
              {PASOS_DE_ARRANQUE.map((p) => (
                <button
                  key={p.clave}
                  type="button"
                  data-paso
                  onClick={() => setPaso(paso === p.clave ? "" : p.clave)}
                  className={
                    "rounded-lg border px-3 py-1.5 text-xs font-bold transition " +
                    (paso === p.clave
                      ? "border-lima-dark bg-lima-dark text-white"
                      : "border-marco bg-white text-carbon/60 hover:border-lima hover:text-carbon")
                  }
                >
                  {p.texto}
                </button>
              ))}
            </div>
            <input type="hidden" name="paso" value={paso} />
            <p className="mt-2 text-[11px] text-carbon/60">
              Es por dónde entramos en el flujo comercial. Los pasos anteriores quedan como que no aplican, y el
              diario explica por qué.
            </p>
          </Caja>

          <Rotulo>Datos extra</Rotulo>
          <Elegir id="canal" nombre="Cómo nos conocieron" opciones={canales} clase="sm:max-w-[320px]" />
        </section>
      </div>

      {!puedeGuardar && (
        <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Para guardar hacen falta tres cosas: <b>la entrada del diario</b>, <b>un comercial</b>, y{" "}
          <b>al menos una de estas cuatro</b> — dirección, administración, teléfono o correo.
        </p>
      )}

    </form>
  );
}
