"use client";

import { useEffect, useRef, useState } from "react";
import { Elegir, type Opcion } from "../components/Elegir";

// GRABAR UNA ENTRADA DEL DIARIO (Monica, 28-sep-2026).
//
// Es la ventana crema de "crear un contacto nuevo", la misma pieza: lo que se
// crea desde dentro de una pantalla se viste de crema, no del azul de "ir a
// hacer algo". Asi el comercial no aprende dos ventanas distintas.
//
// EL MICRO NO SE PROGRAMA. El campo grande es un textarea normal y se dicta con
// el microfono del propio teclado -movil y Windows lo llevan de serie-. No hay
// permisos que pedir, no depende del navegador, y no hay nada que mantener.
//
// Lo unico obligatorio es QUE HA PASADO. Lo demas es opcional a proposito: una
// nota suelta apuntada en el coche vale mas que una nota que no se apunta por no
// tener a mano el dato.

const campo =
  "w-full rounded-lg border border-carbon/70 bg-white px-3 py-1.5 text-sm text-carbon outline-none transition placeholder:text-carbon/55 focus:border-lima";
const botonCrema =
  "h-[31px] rounded-lg border border-[#8a6410] bg-form-nuevo px-5 text-sm font-semibold text-[#5c4208] transition hover:bg-[#ffeeb0]";
const etiquetaOcre = "block text-[10px] font-bold uppercase tracking-[0.05em] text-[#5c4208]/70";

export function ModalEntrada({
  abierto,
  hoy,
  comoFue,
  oportunidades,
  personas,
  comercialId,
  alCerrar,
  guardar,
}: {
  abierto: boolean;
  hoy: string;
  comoFue: readonly { valor: string; texto: string }[];
  oportunidades: Opcion[];
  personas: Opcion[];
  comercialId: string | null;
  alCerrar: () => void;
  guardar: (fd: FormData) => Promise<void>;
}) {
  const [texto, setTexto] = useState("");
  const [como, setComo] = useState("visita");
  const [fecha, setFecha] = useState(hoy);
  const [oportunidad, setOportunidad] = useState("");
  const [con, setCon] = useState("");
  const [guardando, setGuardando] = useState(false);
  const caja = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!abierto) return;
    setTexto("");
    setComo("visita");
    setFecha(hoy);
    setOportunidad("");
    setCon("");
    setGuardando(false);
    // El cursor, ya dentro de lo unico que hay que escribir.
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

  const enviar = async () => {
    if (texto.trim() === "" || guardando) return;
    setGuardando(true);
    const fd = new FormData();
    fd.set("texto", texto);
    fd.set("como_fue", como);
    fd.set("fecha", fecha);
    fd.set("oportunidad", oportunidad);
    fd.set("con", con);
    if (comercialId) fd.set("comercial", comercialId);
    try {
      await guardar(fd);
      alCerrar();
    } catch {
      setGuardando(false);
    }
  };

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) alCerrar();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-alta-opp/70 p-4"
    >
      <div className="relative w-full max-w-[770px] rounded-[14px] border border-[#8a6410] bg-[#fcf8e7] px-6 py-5">
        <button
          type="button"
          onClick={alCerrar}
          aria-label="Cerrar"
          className="absolute right-4 top-3 text-lg leading-none text-carbon/45 transition hover:text-carbon"
        >
          ×
        </button>

        <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#5c4208]">Grabar una entrada</h3>

        {/* Lo primero y lo unico obligatorio: que ha pasado. */}
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

        {/* Y lo que lo coloca: cuando fue, como fue, de que y con quien. */}
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block w-[140px]">
            <span className={etiquetaOcre}>Cuándo</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo + " mt-1"} />
          </label>

          <div className="min-w-0 flex-1">
            <span className={etiquetaOcre}>Cómo fue</span>
            <div className="mt-1 flex flex-wrap gap-x-6 gap-y-2">
              {comoFue.map((c) => (
                <label key={c.valor} className="flex cursor-pointer items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#5c4208]/80">{c.texto}</span>
                  <input
                    type="checkbox"
                    checked={como === c.valor}
                    onChange={() => setComo(c.valor)}
                    className="size-5 shrink-0 accent-[#5c4208]"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <label className="block min-w-0 flex-1">
            <span className={etiquetaOcre}>De qué oportunidad</span>
            <Elegir
              id="entrada_oportunidad"
              nombre=""
              opciones={oportunidades}
              valor={oportunidad}
              alElegir={setOportunidad}
              vacio="de ninguna en concreto"
              marco="border-carbon/70"
              conPista
              clase="mt-1"
            />
          </label>
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

        <div className="mt-6 flex justify-center gap-6">
          <button type="button" onClick={alCerrar} className={botonCrema}>
            Descartar
          </button>
          <button
            type="button"
            disabled={texto.trim() === "" || guardando}
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
