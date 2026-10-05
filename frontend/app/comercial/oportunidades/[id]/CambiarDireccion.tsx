"use client";

import { useState, useTransition } from "react";
import { VentanaDireccion } from "../nueva/VentanaDireccion";
import { accionDireccion } from "./acciones";

// BUSCAR O CAMBIAR LA DIRECCION desde la ficha (Monica, 5-oct-2026). La misma
// ventana de Catastro que el alta, para los dos casos que pasan mucho: se dejo
// provisional al crearla, o la direccion era otra ("nos dicen una calle de
// Parla y resulta que es Fuenlabrada").

export function CambiarDireccion({ id, actual, pendiente }: { id: string; actual: string; pendiente: boolean }) {
  const [abierta, setAbierta] = useState(false);
  const [guardando, empezar] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        disabled={guardando}
        className="ml-2 inline-block rounded-full border border-accion-marco bg-white px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-accion-marco transition hover:bg-[#eef3f8] disabled:opacity-50"
      >
        {guardando ? "Guardando…" : pendiente ? "Buscar en Catastro" : "Cambiar la dirección"}
      </button>
      {abierta && (
        <VentanaDireccion
          escrito={actual}
          alListo={(r) => {
            setAbierta(false);
            empezar(() => accionDireccion(id, { nombre: r.nombre, portalIds: r.portalIds, parcela: r.parcela }));
          }}
          alCerrar={() => setAbierta(false)}
        />
      )}
    </>
  );
}
