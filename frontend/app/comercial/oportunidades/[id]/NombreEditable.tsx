"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { VentanaDireccion } from "../nueva/VentanaDireccion";
import { accionDireccion, accionNombreOpp } from "./acciones";

// EL NOMBRE DE LA OPP, EDITABLE COMO LO DEMAS (Monica, 29-oct-2026): se corrige ahi mismo y, al guardar, se pregunta si
// puede afectar a la ficha de Catastro. Una errata: solo el nombre. Otra calle, otro numero u otra localidad: la ventana
// de Catastro de siempre (la del alta), con lo escrito, para reconectar los portales. Sustituye al chip «Direccion mal
// apuntada, la corrijo».

export function NombreEditable({ id, nombre, detras }: { id: string; nombre: string; detras?: ReactNode }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(nombre);
  const [preguntar, setPreguntar] = useState(false);
  const [catastro, setCatastro] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();

  const cerrar = () => {
    setEditando(false);
    setPreguntar(false);
    setTexto(nombre);
    setError(null);
  };
  const guardar = () => {
    if (texto.trim() === nombre.trim()) return cerrar();
    setPreguntar(true);
  };
  const soloNombre = () =>
    empezar(async () => {
      const r = await accionNombreOpp(id, texto);
      if (!r.ok) return setError(r.error);
      cerrar();
      router.refresh();
    });

  const BOTON = "rounded-[6px] px-3 py-1 text-[12.5px] font-bold transition disabled:opacity-50";

  return (
    <>
      {!editando ? (
        <h1 className="whitespace-nowrap text-[19px] font-bold uppercase leading-tight text-white [text-shadow:0_1px_0_rgba(0,0,0,0.15)]">
          <button type="button" onClick={() => setEditando(true)} title="Corregir el nombre" className="group text-left uppercase">
            {nombre}
            <span className="ml-1.5 align-middle text-[12px] text-white/60 group-hover:text-white">✎</span>
          </button>
          {detras}
        </h1>
      ) : (
        <span className="relative inline-flex flex-wrap items-center gap-2">
          <input
            autoFocus
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") guardar();
              if (e.key === "Escape") cerrar();
            }}
            aria-label="Nombre de la oportunidad"
            className="w-[min(560px,70vw)] rounded-[6px] border border-white/70 bg-white px-2.5 py-1 text-[16px] font-bold uppercase text-carbon"
          />
          <button type="button" onClick={guardar} disabled={ocupado} className={BOTON + " bg-lima text-white hover:bg-lima-dark"}>
            Guardar
          </button>
          <button type="button" onClick={cerrar} className={BOTON + " bg-white/80 text-carbon hover:bg-white"}>
            Cancelar
          </button>
          {preguntar && (
            <div className="absolute left-0 top-full z-50 mt-2 w-[420px] rounded-[10px] border border-[#cfcfcf] bg-white p-3.5 text-[13px] text-carbon shadow-xl">
              <b className="text-[14px]">Esto puede afectar a la ficha de Catastro. ¿Lo compruebo?</b>
              <p className="mt-1 text-carbon/70">
                Si solo has corregido una errata, no hace falta. Si has cambiado la calle, el número o la localidad, hay que reconectar los
                portales desde Catastro.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button type="button" onClick={() => setCatastro(true)} className={BOTON + " bg-[#104269] text-white hover:bg-[#0b3152]"}>
                  Sí, compruébalo en Catastro
                </button>
                <button type="button" onClick={soloNombre} disabled={ocupado} className={BOTON + " border border-carbon bg-white hover:bg-[#f3f3f3]"}>
                  {ocupado ? "Guardando…" : "No, solo era una errata"}
                </button>
                <button type="button" onClick={() => setPreguntar(false)} className="ml-auto text-[12px] font-semibold text-[#104269] hover:underline">
                  volver
                </button>
              </div>
              {error && <p className="mt-1.5 font-semibold text-alerta">{error}</p>}
            </div>
          )}
        </span>
      )}
      {catastro && (
        <VentanaDireccion
          escrito={texto}
          alListo={(r) => {
            setCatastro(false);
            empezar(async () => {
              await accionDireccion(id, { nombre: r.nombre, portalIds: r.portalIds, parcela: r.parcela, unirA: r.unirA });
              cerrar();
              router.refresh();
            });
          }}
          alCerrar={() => setCatastro(false)}
        />
      )}
    </>
  );
}
