"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Elegir, type Opcion } from "../components/Elegir";
import type { OppEntrada } from "../../lib/entradaDiario";
import { accionPermisosFotos, type GuardadoEntrada } from "./acciones";
import { reducirFoto } from "../../lib/reducirFoto";

// GRABAR UNA ENTRADA DEL DIARIO (Monica, 28-sep-2026; rehecha el 8-oct-2026).
//
// Es la ventana crema de "crear un contacto nuevo", la misma pieza: lo que se
// crea desde dentro de una pantalla se viste de crema, no del azul de "ir a
// hacer algo". Asi el comercial no aprende dos ventanas distintas.
//
// EL MICRO NO SE PROGRAMA. El campo grande es un textarea normal y se dicta con
// el microfono del propio teclado.
//
// Una nota es TEXTO + SITIO donde engancharla (8-oct-2026): la direccion o la
// persona, al menos una, para que no haya notas huerfanas. El canal se elige
// siempre: en el PC no viene ninguno marcado. Si la direccion no esta en la
// lista, se pregunta: "¿Es nueva o la marco para revisar despues?". Nueva
// lleva al alta de oportunidad con lo escrito ya puesto; revisar la deja en la
// bandeja de pendientes de quien la escribe.

const campo =
  "w-full rounded-lg border border-carbon/70 bg-white px-3 py-1.5 text-sm text-carbon outline-none transition placeholder:text-carbon/55 focus:border-lima";
const botonCrema =
  "h-[31px] rounded-lg border border-[#8a6410] bg-form-nuevo px-5 text-sm font-semibold text-[#5c4208] transition hover:bg-[#ffeeb0]";
const etiquetaOcre = "block text-[10px] font-bold uppercase tracking-[0.05em] text-[#5c4208]/70";
const aviso = "mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-900";

export function ModalEntrada({
  abierto,
  hoy,
  canales,
  oportunidades,
  personas,
  miComercialId,
  alCerrar,
  guardar,
}: {
  abierto: boolean;
  hoy: string;
  canales: readonly { valor: string; texto: string }[];
  oportunidades: OppEntrada[];
  personas: Opcion[];
  /** La cartera de quien escribe: si la oportunidad es de otro, se avisa.
   *  Vacio para quien ve todas las carteras (direccion): ahi no hay conflicto. */
  miComercialId: string | null;
  alCerrar: () => void;
  guardar: (fd: FormData) => Promise<GuardadoEntrada>;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [canal, setCanal] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [oportunidad, setOportunidad] = useState("");
  const [con, setCon] = useState("");
  // La direccion escrita que no estaba en la lista, y que se ha contestado.
  const [escrita, setEscrita] = useState("");
  const [revisar, setRevisar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // LAS FOTOS de la nota (8-oct-2026): se eligen aqui y se suben al guardar.
  // En el PC abre el explorador; en el movil, la camara o la galeria.
  const [fotos, setFotos] = useState<{ file: File; vista: string }[]>([]);
  const caja = useRef<HTMLTextAreaElement>(null);
  const selector = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!abierto) return;
    setTexto("");
    setCanal("");
    setFecha(hoy);
    setOportunidad("");
    setCon("");
    setEscrita("");
    setRevisar(false);
    setGuardando(false);
    setError(null);
    setFotos((ant) => {
      ant.forEach((f) => URL.revokeObjectURL(f.vista));
      return [];
    });
    // El cursor, ya dentro de lo primero que hay que escribir.
    const t = setTimeout(() => caja.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [abierto, hoy]);

  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") alCerrar();
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  });

  if (!abierto) return null;

  const opp = oportunidades.find((o) => o.valor === oportunidad) ?? null;
  const deOtro = opp && miComercialId && opp.comercialId && opp.comercialId !== miComercialId ? opp.comercial : null;
  const listaPersona = con.split(":")[0];
  // El sitio de la nota: la oportunidad, la direccion apartada para revisar, o
  // una persona de una administracion. Un presidente solo no es sitio.
  const haySitio = oportunidad !== "" || revisar || listaPersona === "puesto" || listaPersona === "persona";
  const preguntando = escrita !== "" && !revisar && oportunidad === "";
  const puedeGuardar = texto.trim() !== "" && canal !== "" && haySitio && !guardando;

  const enviar = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    setError(null);
    const fd = new FormData();
    fd.set("texto", texto);
    fd.set("canal", canal);
    fd.set("fecha", fecha);
    fd.set("oportunidad", oportunidad);
    fd.set("con", con);
    if (revisar && oportunidad === "") fd.set("donde_texto", escrita);
    try {
      // Las fotos van directas al almacen, reducidas, ANTES de guardar la nota:
      // la nota solo se graba si sus fotos han llegado.
      if (fotos.length) {
        const permisos = await accionPermisosFotos(fotos.length);
        await Promise.all(
          fotos.map(async ({ file }, i) => {
            const { foto, mini } = await reducirFoto(file);
            const p = permisos[i];
            const subir = (url: string, cuerpo: Blob) =>
              fetch(url, { method: "PUT", headers: { "Content-Type": "image/jpeg", "x-upsert": "false" }, body: cuerpo });
            const [a, b] = await Promise.all([subir(p.url, foto), subir(p.urlMini, mini)]);
            if (!a.ok || !b.ok) throw new Error(`No se ha podido subir la foto ${i + 1}.`);
            fd.append("fotos", p.ruta);
          }),
        );
      }
      const r = await guardar(fd);
      if (r.ok) alCerrar();
      else {
        setError(r.error);
        setGuardando(false);
      }
    } catch (e) {
      setError((e as Error).message);
      setGuardando(false);
    }
  };

  const añadirFotos = (lista: FileList | null) => {
    const nuevas = Array.from(lista ?? [])
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({ file, vista: URL.createObjectURL(file) }));
    setFotos((ant) => [...ant, ...nuevas].slice(0, 20));
  };

  // Es nueva: al alta de oportunidad, con lo escrito ya puesto. En el PC no hace
  // falta otra ventana: la del alta es la que pide los datos para seguir.
  const esNueva = () => {
    const q = new URLSearchParams({ direccion: escrita, nota: texto, fecha, canal });
    router.push("/comercial/oportunidades/nueva?" + q.toString());
  };

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) alCerrar();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-alta-opp/70 p-4"
    >
      <div className="relative max-h-[92vh] w-full max-w-[770px] overflow-y-auto rounded-[14px] border border-[#8a6410] bg-[#fcf8e7] px-6 py-5">
        <button
          type="button"
          onClick={alCerrar}
          aria-label="Cerrar"
          className="absolute right-4 top-3 text-lg leading-none text-carbon/45 transition hover:text-carbon"
        >
          ×
        </button>

        <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c4208]">Grabar una entrada</h3>

        {/* Lo primero: que ha pasado. */}
        <label className="mt-3 block">
          <span className={etiquetaOcre}>Qué ha pasado</span>
          <textarea
            ref={caja}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={6}
            placeholder="Cuéntalo como se lo contarías a un compañero. Puedes dictarlo con el micro de tu teclado."
            className={campo + " mt-1 resize-y leading-relaxed"}
          />
        </label>

        {/* Cuando fue y como nos enteramos. */}
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block w-[140px]">
            <span className={etiquetaOcre}>Cuándo</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo + " mt-1"} />
          </label>

          <div className="min-w-0 flex-1">
            <span className={etiquetaOcre}>Cómo te has enterado</span>
            <div className="mt-1 flex flex-wrap gap-x-6 gap-y-2">
              {canales.map((c) => (
                <label key={c.valor} className="flex cursor-pointer items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#5c4208]/80">{c.texto}</span>
                  <input
                    type="checkbox"
                    checked={canal === c.valor}
                    onChange={() => setCanal(c.valor)}
                    className="size-5 shrink-0 accent-[#5c4208]"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* El sitio de la nota: la direccion, la persona, o las dos. */}
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="block min-w-0 flex-1">
            <span className={etiquetaOcre}>Dirección</span>
            {revisar && oportunidad === "" ? (
              <div className="mt-1 flex h-[34px] items-center gap-2 rounded-lg border border-[#8a6410] bg-form-nuevo px-3 text-sm">
                <span className="min-w-0 flex-1 truncate font-semibold text-[#5c4208]">
                  {escrita} <span className="font-normal opacity-70">· se revisa después</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRevisar(false);
                    setEscrita("");
                  }}
                  aria-label="Quitar"
                  className="text-[#5c4208]/70 hover:text-[#5c4208]"
                >
                  ×
                </button>
              </div>
            ) : (
              <Elegir
                id="entrada_oportunidad"
                nombre=""
                opciones={oportunidades}
                valor={oportunidad}
                alElegir={(v) => {
                  setOportunidad(v);
                  setEscrita("");
                  setRevisar(false);
                }}
                vacio="busca la dirección…"
                marco="border-carbon/70"
                conPista
                clase="mt-1"
                noEsta={(q) => {
                  setOportunidad("");
                  setEscrita(q);
                  setRevisar(false);
                }}
              />
            )}
          </div>
          <label className="block min-w-0 flex-1">
            <span className={etiquetaOcre}>Con quién</span>
            <Elegir
              id="entrada_con"
              nombre=""
              opciones={personas}
              valor={con}
              alElegir={setCon}
              vacio="con nadie en concreto"
              marco="border-carbon/70"
              conPista
              clase="mt-1"
            />
          </label>
        </div>

        {/* Las fotos: humedades, un escalon, un presupuesto de la competencia.
            Van al repositorio comun; la nota solo apunta a ellas. */}
        <div className="mt-4">
          <span className={etiquetaOcre}>Fotos</span>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {fotos.map((f, i) => (
              <div key={f.vista} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.vista} alt={`Foto ${i + 1}`} className="size-16 rounded-md border border-[#8a6410]/40 object-cover" />
                <button
                  type="button"
                  aria-label="Quitar la foto"
                  onClick={() =>
                    setFotos((ant) => {
                      URL.revokeObjectURL(f.vista);
                      return ant.filter((x) => x !== f);
                    })
                  }
                  className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border border-[#8a6410] bg-white text-[12px] leading-none text-[#5c4208]"
                >
                  ×
                </button>
              </div>
            ))}
            <button type="button" onClick={() => selector.current?.click()} className={botonCrema}>
              📷 Añadir fotos
            </button>
            <input
              ref={selector}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                añadirFotos(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {preguntando && (
          <div className={aviso}>
            <p>
              No encuentro <b>«{escrita}»</b> en la lista. ¿Es una oportunidad nueva o la marco para revisar después?
            </p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={esNueva} className={botonCrema}>
                Es nueva
              </button>
              <button type="button" onClick={() => setRevisar(true)} className={botonCrema}>
                Revisar después
              </button>
            </div>
          </div>
        )}
        {deOtro && <p className={aviso}>Esta oportunidad es de <b>{deOtro}</b>. Puedes guardar la nota igualmente.</p>}
        {listaPersona === "pc" && oportunidad === "" && !revisar && (
          <p className={aviso}>Con un presidente o un vecino, pon también la dirección: la nota va a su oportunidad.</p>
        )}
        {error && <p className="mt-2 text-[13px] font-semibold text-alerta">{error}</p>}

        <div className="mt-6 flex items-center justify-center gap-6">
          <button type="button" onClick={alCerrar} className={botonCrema}>
            Descartar
          </button>
          <button
            type="button"
            disabled={!puedeGuardar}
            title={
              texto.trim() === ""
                ? "Falta qué ha pasado"
                : canal === ""
                  ? "Falta cómo te has enterado"
                  : !haySitio
                    ? "Falta la dirección o la persona"
                    : undefined
            }
            onClick={enviar}
            className={
              botonCrema +
              " disabled:cursor-not-allowed disabled:border-carbon/20 disabled:bg-black/5 disabled:text-carbon/35"
            }
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
