"use client";

import Link from "next/link";
import { useState } from "react";
import { Elegir, type Opcion } from "../../../components/Elegir";
import { Marcar } from "../../../components/Marcar";
import type { OpcionesOportunidad } from "../../../../lib/altaOportunidad";
import { PASOS_DE_ARRANQUE, RELACIONES } from "../../../../lib/oportunidadVocabulario";

// DAR DE ALTA UNA OPORTUNIDAD — SU DISEÑO, hecho por ella en Figma (28-sep-2026).
//
// Lo que ella resolvio y yo no veia:
//   · el fondo de la pagina es OSCURO, para no confundir nunca un alta con una
//     ficha ya creada. Cada area tendra el suyo; este es el azul de comercial;
//   · los datos son FILAS separadas por lineas, con el rotulo verde a la
//     izquierda y el campo a la derecha. Antes era una columna plana de campos;
//   · "que tengo que hacer" se va con el diario, debajo de lo que te han
//     contado: lo que me cuentan, y lo que hago. Y en rojo, porque no es opcional;
//   · cada boton azul lleva su explicacion al lado ("Es un nuevo administrador
//     → + CREARLO"): el boton dice la accion, el texto dice para que;
//   · el marcado no es de un solo color: marron para con quien hablo, azul
//     marino para el paso siguiente. "No todas las casillas marcadas hablan de
//     lo mismo."
//
// Y una regla suya que ahorra trabajo al comercial: "fue el mismo administrador"
// sale marcable porque el 90% de las veces lo es, y elegirlo dos veces fastidia.

const rotulo = "text-[11px] font-bold uppercase leading-tight tracking-wide text-[#237812]";
const etiqueta = "block text-[10px] font-bold uppercase tracking-wide text-carbon/70";
const etiquetaClara = "block text-[10px] font-bold uppercase tracking-wide text-[#fff4c6]/85";
const apoyo = "text-[11px] font-bold leading-tight text-accion";
const campo =
  "w-full rounded-lg border border-carbon/70 bg-white px-3 py-1.5 text-sm text-carbon outline-none transition placeholder:text-carbon/55 focus:border-lima";
// El boton que HACE algo. Ni se parece a un campo ni hace falta que lo explique:
// para eso esta el texto azul de al lado.
const accion =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[5px] border border-accion-marco bg-accion px-3.5 py-2 text-xs font-bold uppercase text-white shadow-sm transition hover:bg-accion-hover";

/** Una fila de la tarjeta de datos: rotulo a la izquierda, lo que sea a la
 *  derecha, y una raya que la separa de la anterior. */
function Fila({
  nombre,
  primera,
  children,
}: {
  nombre?: string;
  primera?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={"py-3 " + (primera ? "" : "border-t border-raya")}>
      <div className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-4">
        <span className={rotulo}>{nombre}</span>
        <div className="flex min-w-0 items-center gap-3">{children}</div>
      </div>
    </div>
  );
}

/** Lo que se marca. El color dice DE QUE habla: marron para con quien hablo a
 *  partir de ahora, azul marino para el paso siguiente. */
function Casilla({
  texto,
  nombre,
  marcado,
  alMarcar,
  tono,
  conCuadro = true,
  clase = "",
}: {
  texto: string;
  nombre?: string;
  marcado: boolean;
  alMarcar: (v: boolean) => void;
  tono: "marron" | "marino";
  conCuadro?: boolean;
  clase?: string;
}) {
  const relleno = tono === "marron" ? "bg-marcado-hablo text-[#fff5cc]" : "bg-marcado-paso text-white";
  const borde = tono === "marron" ? "border-marcado-hablo" : "border-marcado-paso";
  return (
    <label
      className={
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-center transition " +
        (marcado ? relleno + " " + borde : "border-marco bg-white text-carbon/80 hover:border-accion") +
        " " +
        clase
      }
    >
      <span className="text-[11px] font-bold uppercase leading-tight tracking-wide">{texto}</span>
      {conCuadro && (
        <input
          type="checkbox"
          name={nombre}
          checked={marcado}
          onChange={(e) => alMarcar(e.target.checked)}
          className={"size-5 " + (marcado ? "accent-white" : "accent-accion")}
        />
      )}
      {!conCuadro && (
        <input type="checkbox" name={nombre} checked={marcado} onChange={(e) => alMarcar(e.target.checked)} className="sr-only" />
      )}
    </label>
  );
}

export function Formulario({
  opciones,
  accion: guardar,
  volver,
}: {
  opciones: OpcionesOportunidad;
  accion: (fd: FormData) => void | Promise<void>;
  volver: string;
}) {
  const hoy = new Date().toISOString().slice(0, 10);

  const comerciales: Opcion[] = opciones.comerciales.map((c) => ({ valor: c.id, texto: c.nombre, pista: c.pista }));
  const comunidades: Opcion[] = opciones.comunidades.map((c) => ({ valor: c.id, texto: c.nombre, pista: c.pista }));
  const administradores: Opcion[] = opciones.administradores.map((a) => ({ valor: a.id, texto: a.nombre, pista: a.pista }));
  const administraciones: Opcion[] = opciones.administraciones.map((a) => ({ valor: a.id, texto: a.nombre, pista: a.pista }));
  const canales: Opcion[] = opciones.canales.map((c) => ({ valor: c.id, texto: c.nombre }));
  const contratas: Opcion[] = opciones.contratas.map((c) => ({ valor: c.id, texto: c.nombre }));
  const relaciones: Opcion[] = RELACIONES.map((r) => ({ valor: r.valor, texto: r.texto, pista: r.pista }));

  const soyComercial = opciones.miComercial !== null;

  const [comercial, setComercial] = useState(opciones.miComercial ?? "");
  const [nota, setNota] = useState("");

  const [comunidad, setComunidad] = useState("");
  const [direccion, setDireccion] = useState("");
  const [buscarDireccion, setBuscarDireccion] = useState(false);

  const [admin, setAdmin] = useState("");
  const [modalAdmin, setModalAdmin] = useState(false);
  const [anNombre, setAnNombre] = useState("");
  const [anTel, setAnTel] = useState("");
  const [anMail, setAnMail] = useState("");
  const [anEmpresa, setAnEmpresa] = useState("");
  const adminNuevo = anNombre.trim() !== "";
  const hayAdmin = admin !== "" || adminNuevo;

  // Quien ha contactado. El 90% de las veces es el propio administrador.
  const [quienEsAdmin, setQuienEsAdmin] = useState(false);
  const [quien, setQuien] = useState("");
  const [modalQuien, setModalQuien] = useState(false);
  const [qnNombre, setQnNombre] = useState("");
  const [qnTel, setQnTel] = useState("");
  const [qnMail, setQnMail] = useState("");
  const [qnRelacion, setQnRelacion] = useState("");
  const [qnContrata, setQnContrata] = useState("");
  const quienNuevo = qnNombre.trim() !== "";

  // Con quien hablo a partir de ahora.
  const [hablaLlamo, setHablaLlamo] = useState(false);
  const [hablaAdmin, setHablaAdmin] = useState(false);
  const [hablaOtro, setHablaOtro] = useState(false);
  const [modalHablo, setModalHablo] = useState(false);
  const [contacto, setContacto] = useState("");
  const [coNombre, setCoNombre] = useState("");
  const [coTel, setCoTel] = useState("");
  const [coMail, setCoMail] = useState("");

  const [paso, setPaso] = useState("");
  const [enviando, setEnviando] = useState(false);

  const hayHilo =
    comunidad !== "" || direccion.trim() !== "" || hayAdmin || qnTel.trim() !== "" || qnMail.trim() !== "";
  const puedeGuardar = nota.trim() !== "" && comercial !== "" && hayHilo && paso !== "";

  const quitarAdminNuevo = () => {
    setAnNombre("");
    setAnTel("");
    setAnMail("");
    setAnEmpresa("");
  };
  const quitarQuienNuevo = () => {
    setQnNombre("");
    setQnTel("");
    setQnMail("");
    setQnRelacion("");
    setQnContrata("");
  };
  const quitarOtro = () => {
    setContacto("");
    setCoNombre("");
    setCoTel("");
    setCoMail("");
    setHablaOtro(false);
  };

  return (
    <form
      action={guardar}
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
      {/* ============ la cabecera, sobre el fondo oscuro ============ */}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <h1 className="text-[27px] font-extrabold uppercase leading-none tracking-tight text-white">
          Estás creando una nueva oportunidad
        </h1>

        <div className="flex flex-wrap items-end gap-4">
          <label className="block w-[215px]">
            <span className={etiquetaClara}>Número de orden</span>
            <span className={campo + " mt-1 block bg-white text-carbon/60"}>{"PER-" + new Date().getFullYear() + "-000"}</span>
          </label>
          <label className="block w-[150px]">
            <span className={etiquetaClara}>Fecha del contacto</span>
            <input id="fecha_llamada" name="fecha_llamada" type="date" defaultValue={hoy} className={campo + " mt-1"} />
          </label>
          <Elegir
            id="comercial"
            nombre="Comercial que la lleva"
            opciones={comerciales}
            valor={comercial}
            alElegir={setComercial}
            clase="w-[250px]"
            tinta="text-[#fff4c6]/85"
            marco="border-carbon/70"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-[820px] text-sm text-white">
          Lo importante de verdad: reflejar qué te han contado
          {soyComercial ? "" : " y a qué comercial le toca"}. El resto, se puede completar después.
        </p>
        <div className="flex items-center gap-3">
          <Link href={volver} className="rounded-lg bg-white px-5 py-2 text-sm text-carbon/80 transition hover:text-carbon">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={!puedeGuardar || enviando}
            className="rounded-lg bg-lima px-7 py-2 text-sm font-bold text-white transition hover:bg-lima-dark disabled:cursor-not-allowed disabled:bg-white/25 disabled:text-white/50"
          >
            {enviando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,500fr)_minmax(0,670fr)]">
        {/* ============ lo que me cuentan, y lo que hago ============ */}
        <section className="min-w-0 rounded-[14px] border border-[#baa208] bg-papel p-4 shadow-sm">
          <h2 className="text-[19px] font-bold uppercase leading-tight tracking-wide text-carbon">Qué te han contado</h2>
          <textarea
            id="nota"
            name="nota"
            rows={12}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Me llama Adolfo, que en Carretas 28 quieren poner el SATE. Como es zona ZBE le voy a contar que si no arreglan la accesibilidad del portal no van a poder acceder a subvenciones. Me pasa el teléfono del presi, Alejandro."
            className={campo + " mt-3 min-h-[320px] resize-y"}
          />

          {/* Sin esto la oportunidad se escapa: por eso va en rojo. */}
          <section className="mt-4 rounded-[14px] border-[3px] border-obligatorio bg-obligatorio-fondo p-3">
            <h3 className="mb-2.5 text-center text-[13px] font-bold uppercase tracking-wide text-carbon">
              <span className="text-[11px] text-obligatorio">Qué tengo que hacer:</span> Siguiente paso inmediato
            </h3>
            <div className="grid grid-cols-3 gap-2.5">
              {PASOS_DE_ARRANQUE.map((p) => (
                <Casilla
                  key={p.clave}
                  texto={p.texto}
                  marcado={paso === p.clave}
                  alMarcar={(v) => setPaso(v ? p.clave : "")}
                  tono="marino"
                  conCuadro={false}
                  clase="min-h-[62px]"
                />
              ))}
            </div>
            <input type="hidden" name="paso" value={paso} />
          </section>
        </section>

        {/* ============ qué datos tenemos ============ */}
        <section className="min-w-0 rounded-[14px] border border-[#237812] bg-papel p-4 shadow-sm">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-[19px] font-bold uppercase leading-tight tracking-wide text-carbon">Qué datos tenemos</h2>
            <span className="text-[10px] font-bold uppercase tracking-wide text-carbon/60">
              Apunta lo que ya sepas, cuanto más mejor
            </span>
          </div>
          <div className="mt-2.5 border-t border-carbon" />

          {/* ---- la dirección ---- */}
          <Fila nombre="Dirección de la comunidad" primera>
            {buscarDireccion ? (
              <Elegir
                id="comunidad"
                nombre=""
                opciones={comunidades}
                valor={comunidad}
                alElegir={setComunidad}
                vacio="busca la que ya tenemos"
                clase="min-w-0 flex-1"
                marco="border-carbon/70"
                abrirAlMontar
              />
            ) : (
              <input
                id="direccion_provisional"
                name="direccion_provisional"
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="dirección del edificio"
                className={campo + " min-w-0 flex-1"}
              />
            )}
            <span className={apoyo + " w-[92px] text-right"}>
              {buscarDireccion ? "Mejor la escribo" : "Si ya existe, selecciónala"}
            </span>
            <button
              type="button"
              onClick={() => {
                if (buscarDireccion) {
                  setComunidad("");
                  setBuscarDireccion(false);
                } else {
                  setDireccion("");
                  setBuscarDireccion(true);
                }
              }}
              className={accion}
            >
              {buscarDireccion ? "Aquí" : "Aquí ▾"}
            </button>
          </Fila>

          {/* ---- el administrador ---- */}
          <Fila nombre="¿Quién es su administrador?">
            {adminNuevo ? (
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#8a6410] bg-form-nuevo px-3 py-1.5 text-sm">
                <span className="min-w-0 flex-1 truncate font-semibold text-[#5c4208]">
                  {anNombre} <span className="font-normal opacity-70">· nuevo</span>
                </span>
                <button type="button" onClick={quitarAdminNuevo} aria-label="Quitar" className="text-[#5c4208]/70 hover:text-[#5c4208]">
                  ×
                </button>
                <input type="hidden" name="admin_nuevo_nombre" value={anNombre} />
                <input type="hidden" name="admin_nuevo_telefono" value={anTel} />
                <input type="hidden" name="admin_nuevo_correo" value={anMail} />
                <input type="hidden" name="admin_nuevo_empresa" value={anEmpresa} />
              </div>
            ) : (
              <Elegir
                id="administrador"
                nombre=""
                opciones={administradores}
                valor={admin}
                alElegir={setAdmin}
                vacio="selecciona de la lista"
                clase="min-w-0 flex-1"
                marco="border-carbon/70"
              />
            )}
            <span className={apoyo + " w-[92px] text-right"}>
              {adminNuevo ? "Lo estás creando" : "Es un nuevo administrador"}
            </span>
            <button type="button" onClick={() => setModalAdmin(true)} className={accion}>
              {adminNuevo ? "Cambiar" : "+ Crearlo"}
            </button>
          </Fila>

          {/* ---- quién ha contactado ---- */}
          <Fila nombre="Quién ha contactado para pedirlo">
            <Casilla
              texto="Fue el mismo administrador"
              nombre="quien_es_admin"
              marcado={quienEsAdmin}
              alMarcar={(v) => {
                setQuienEsAdmin(v);
                if (v) {
                  setQuien("");
                  quitarQuienNuevo();
                }
              }}
              tono="marron"
              clase="w-[190px]"
            />
            <div className="min-w-0 flex-1">
              <span className={apoyo + " mb-1 block text-center"}>Fue otra persona conocida</span>
              {quienNuevo ? (
                <div className="flex items-center gap-2 rounded-lg border border-[#8a6410] bg-form-nuevo px-3 py-1.5 text-sm">
                  <span className="min-w-0 flex-1 truncate font-semibold text-[#5c4208]">
                    {qnNombre} <span className="font-normal opacity-70">· nuevo</span>
                  </span>
                  <button type="button" onClick={quitarQuienNuevo} aria-label="Quitar" className="text-[#5c4208]/70">
                    ×
                  </button>
                  <input type="hidden" name="nuevo_marcado" value="1" />
                  <input type="hidden" name="nuevo_nombre" value={qnNombre} />
                  <input type="hidden" name="nuevo_telefono" value={qnTel} />
                  <input type="hidden" name="nuevo_correo" value={qnMail} />
                  <input type="hidden" name="nuevo_relacion" value={qnRelacion} />
                  <input type="hidden" name="nuevo_contrata" value={qnContrata} />
                </div>
              ) : (
                <Elegir
                  id="quien"
                  nombre=""
                  opciones={opciones.quienes}
                  valor={quien}
                  alElegir={(v) => {
                    setQuien(v);
                    if (v) setQuienEsAdmin(false);
                  }}
                  vacio="selecciónalo"
                  desactivado={quienEsAdmin}
                  marco="border-carbon/70"
                />
              )}
            </div>
            <div>
              <span className={apoyo + " mb-1 block text-center"}>Fue un nuevo contacto</span>
              <button type="button" onClick={() => setModalQuien(true)} className={accion + " w-full"}>
                {quienNuevo ? "Cambiar" : "+ Crearlo"}
              </button>
            </div>
          </Fila>

          {/* ---- qué quieren ---- */}
          <Fila nombre="En qué dicen que están interesados">
            <Marcar
              id="tipos"
              opciones={opciones.tipos.map((t) => ({ valor: t.id, texto: t.nombre, pista: t.pista }))}
              pista="De lo que vendemos, qué quieren"
            />
          </Fila>

          {/* ---- la tercera persona ---- */}
          <div className="border-t border-raya py-3">
            <section className="rounded-[14px] border border-marco bg-[#ecefec] px-4 py-3">
              <h3 className="text-center text-[13px] font-bold uppercase tracking-wide text-[#0c1a64]">
                Con quién hablo de esto a partir de ahora
              </h3>
              <p className="mb-3 mt-0.5 text-center text-sm text-carbon/60">
                (quien va a ser mi contacto para ir a verlo, enviar la hoja de encargo, etc.)
              </p>
              <div className="mx-auto grid max-w-[560px] grid-cols-3 gap-3">
                <Casilla
                  texto="La persona que me llamó"
                  nombre="habla_llamo"
                  marcado={hablaLlamo}
                  alMarcar={setHablaLlamo}
                  tono="marron"
                  clase="min-h-[78px]"
                />
                <Casilla
                  texto="El administrador"
                  nombre="habla_admin"
                  marcado={hablaAdmin}
                  alMarcar={setHablaAdmin}
                  tono="marron"
                  clase="min-h-[78px]"
                />
                <Casilla
                  texto={coNombre ? coNombre : "Otro (crear)"}
                  marcado={hablaOtro}
                  alMarcar={(v) => (v ? (setHablaOtro(true), setModalHablo(true)) : quitarOtro())}
                  tono="marron"
                  clase="min-h-[78px]"
                />
              </div>
              <input type="hidden" name="contacto" value={contacto} />
              <input type="hidden" name="contacto_nombre" value={hablaOtro ? coNombre : ""} />
              <input type="hidden" name="contacto_telefono" value={hablaOtro ? coTel : ""} />
              <input type="hidden" name="contacto_correo" value={hablaOtro ? coMail : ""} />
            </section>
          </div>

          {/* ---- datos extra ---- */}
          <div className="border-t border-raya py-3">
            <div className="grid grid-cols-[150px_minmax(0,1fr)] items-start gap-4">
              <span className={rotulo}>Datos extra</span>
              <div className="max-w-[420px]">
                <span className={etiqueta}>Cómo nos conocieron</span>
                <Elegir id="canal" nombre="" opciones={canales} vacio="—" clase="mt-1" marco="border-carbon/70" />
              </div>
            </div>
          </div>
        </section>
      </div>

      {!puedeGuardar && (
        <p className="mt-4 rounded-xl bg-white/90 px-4 py-3 text-sm text-carbon">
          Para guardar hacen falta: <b>qué te han contado</b>, <b>un comercial</b>, <b>el siguiente paso</b>, y{" "}
          <b>al menos una de estas</b> — dirección, administrador, teléfono o correo.
        </p>
      )}

      {/* ============ ventana: administrador nuevo ============ */}
      <Ventana
        abierta={modalAdmin}
        titulo="Administrador nuevo"
        pie="Lo justo para poder seguir con la oportunidad. Su ficha se completa después."
        alQuitar={() => {
          quitarAdminNuevo();
          setModalAdmin(false);
        }}
        alCerrar={() => setModalAdmin(false)}
        puede={adminNuevo}
      >
        <div className="grid gap-4 sm:grid-cols-12">
          <Dato id="an_nombre" nombre="Nombre" clase="sm:col-span-5" valor={anNombre} alEscribir={setAnNombre} />
          <Dato id="an_telefono" nombre="Teléfono" clase="sm:col-span-4" valor={anTel} alEscribir={setAnTel} />
          <Dato id="an_correo" nombre="Correo" clase="sm:col-span-3" valor={anMail} alEscribir={setAnMail} />
          <Elegir
            id="an_empresa"
            nombre="Administración de fincas en la que está"
            opciones={administraciones}
            valor={anEmpresa}
            alElegir={setAnEmpresa}
            vacio="todavía no lo sé"
            clase="sm:col-span-12"
            marco="border-carbon/70"
          />
        </div>
      </Ventana>

      {/* ============ ventana: quién ha contactado (nuevo) ============ */}
      <Ventana
        abierta={modalQuien}
        titulo="Contacto nuevo"
        pie="Lo que es decide dónde se guarda: un administrador va a la cartera, un comercial de contrata a su contrata, un vecino a la comunidad."
        alQuitar={() => {
          quitarQuienNuevo();
          setModalQuien(false);
        }}
        alCerrar={() => setModalQuien(false)}
        puede={quienNuevo}
      >
        <div className="grid gap-4 sm:grid-cols-12">
          <Dato id="qn_nombre" nombre="Nombre" clase="sm:col-span-5" valor={qnNombre} alEscribir={setQnNombre} />
          <Dato id="qn_telefono" nombre="Teléfono" clase="sm:col-span-4" valor={qnTel} alEscribir={setQnTel} />
          <Dato id="qn_correo" nombre="Correo" clase="sm:col-span-3" valor={qnMail} alEscribir={setQnMail} />
          <Elegir
            id="qn_relacion"
            nombre="Qué es"
            opciones={relaciones}
            valor={qnRelacion}
            alElegir={setQnRelacion}
            vacio="elige qué es"
            clase={qnRelacion === "contrata" ? "sm:col-span-7" : "sm:col-span-12"}
            marco="border-carbon/70"
          />
          {qnRelacion === "contrata" && (
            <Elegir
              id="qn_contrata"
              nombre="De qué contrata"
              opciones={contratas}
              valor={qnContrata}
              alElegir={setQnContrata}
              clase="sm:col-span-5"
              marco="border-carbon/70"
            />
          )}
        </div>
      </Ventana>

      {/* ============ ventana: con quién hablo (otro) ============ */}
      <Ventana
        abierta={modalHablo}
        titulo="Con quién hablo a partir de ahora"
        pie="La vecina del quinto, el presidente, alguien de la comisión de obras. Si ya lo tenemos, se elige; si no, se escribe."
        alQuitar={() => {
          quitarOtro();
          setModalHablo(false);
        }}
        alCerrar={() => setModalHablo(false)}
        puede={coNombre.trim() !== "" || contacto !== ""}
      >
        <Elegir
          id="contacto_lista"
          nombre="Si ya lo tenemos"
          opciones={opciones.contactos}
          valor={contacto}
          alElegir={setContacto}
          vacio="no está en la lista"
          marco="border-carbon/70"
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-12">
          <Dato
            id="co_nombre"
            nombre="Si no está: cómo se llama"
            clase="sm:col-span-5"
            pista="a quien tengo que llamar"
            valor={coNombre}
            alEscribir={setCoNombre}
          />
          <Dato id="co_telefono" nombre="Teléfono" clase="sm:col-span-4" valor={coTel} alEscribir={setCoTel} />
          <Dato id="co_correo" nombre="Correo" clase="sm:col-span-3" valor={coMail} alEscribir={setCoMail} />
        </div>
      </Ventana>
    </form>
  );
}

/** Un campo de una ventana. */
function Dato({
  id,
  nombre,
  clase = "",
  pista,
  valor,
  alEscribir,
}: {
  id: string;
  nombre: string;
  clase?: string;
  pista?: string;
  valor: string;
  alEscribir: (v: string) => void;
}) {
  return (
    <label className={"block min-w-0 " + clase} htmlFor={id}>
      <span className={etiqueta}>{nombre}</span>
      <input
        id={id}
        type="text"
        placeholder={pista}
        value={valor}
        onChange={(e) => alEscribir(e.target.value)}
        className={campo + " mt-1"}
      />
    </label>
  );
}

/** Todas las ventanas iguales: una sola forma para toda la pantalla. Se quedan
 *  montadas aunque esten cerradas, para no perder lo escrito. */
function Ventana({
  abierta,
  titulo,
  pie,
  children,
  alQuitar,
  alCerrar,
  puede,
}: {
  abierta: boolean;
  titulo: string;
  pie: string;
  children: React.ReactNode;
  alQuitar: () => void;
  alCerrar: () => void;
  puede: boolean;
}) {
  return (
    <div className={abierta ? "fixed inset-0 z-50 flex items-center justify-center bg-alta-opp/70 p-4" : "hidden"}>
      <div className="w-full max-w-[560px] rounded-[16px] border border-marco bg-papel p-5 shadow-xl">
        <h3 className="text-center text-[13px] font-bold uppercase tracking-wide text-[#0c1a64]">{titulo}</h3>
        <p className="mb-4 mt-0.5 text-center text-sm text-carbon/60">{pie}</p>
        {children}
        <div className="mt-5 flex justify-center gap-3">
          <button type="button" onClick={alQuitar} className="rounded-lg bg-white px-5 py-2 text-sm text-carbon/80">
            Quitar
          </button>
          <button
            type="button"
            disabled={!puede}
            onClick={alCerrar}
            className="rounded-[5px] border border-accion-marco bg-accion px-6 py-2 text-xs font-bold uppercase text-white shadow-sm transition hover:bg-accion-hover disabled:cursor-not-allowed disabled:border-transparent disabled:bg-carbon/15 disabled:text-carbon/35"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
