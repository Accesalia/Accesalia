"use client";

import Link from "next/link";
import { useState } from "react";
import { altaEmpleado } from "./acciones";

// Alta de un empleado nuevo. Con la fecha de entrada propone los dias de
// vacaciones que le tocan ese año: la parte proporcional de 22, redondeada al
// medio dia. Se puede cambiar.

function proporcional(desde: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde)) return "";
  const anio = Number(desde.slice(0, 4));
  const dia = (s: string) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
  const total = (dia(`${anio}-12-31`) - dia(`${anio}-01-01`)) / 864e5 + 1;
  const quedan = (dia(`${anio}-12-31`) - dia(desde)) / 864e5 + 1;
  return String(Math.round(((22 * quedan) / total) * 2) / 2);
}

const campo = "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-lima focus:ring-2 focus:ring-lima/30";
const etiqueta = "grid gap-1 text-xs font-semibold text-carbon/55";

export function AltaEmpleado({ hoy, funciones, error }: { hoy: string; funciones: { id: string; nombre: string }[]; error: string | null }) {
  const [desde, setDesde] = useState(hoy);
  const [dias, setDias] = useState(proporcional(hoy));

  return (
    <div id="alta" className="mt-4 scroll-mt-24 rounded-2xl border border-lima/40 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-black/5 pb-3">
        <h3 className="text-xl font-bold text-carbon">Dar de alta a una persona</h3>
        <Link href="/rrhh" className="text-sm font-semibold text-carbon/50 hover:text-carbon">Cancelar ✕</Link>
      </div>
      {error && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{error}</p>}

      <form action={altaEmpleado} className="mt-4 grid gap-5 lg:grid-cols-2">
        <div className="grid content-start gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className={etiqueta}>Nombre<input name="nombre" required className={campo} /></label>
            <label className={etiqueta}>Apellidos<input name="apellidos" className={campo} /></label>
          </div>
          <label className={etiqueta}>
            Correo de Accesalia
            <input name="email" type="email" placeholder="inicialapellido.accesalia@gmail.com" className={campo} />
            <span className="font-normal text-carbon/45">Con él entrará en la app. Sin correo, está en RRHH pero no entra.</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={etiqueta}>
              Primer día
              <input
                type="date"
                name="desde"
                required
                value={desde}
                onChange={(e) => {
                  setDesde(e.target.value);
                  setDias(proporcional(e.target.value));
                }}
                className={campo}
              />
            </label>
            <label className={etiqueta}>
              Vacaciones de {desde.slice(0, 4) || "este año"}
              <input name="dias" inputMode="decimal" value={dias} onChange={(e) => setDias(e.target.value)} className={campo} />
              <span className="font-normal text-carbon/45">Lo proporcional de 22; ajústalo si hace falta.</span>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className={etiqueta}>Tipo de contrato<input name="tipo" placeholder="Indefinido, temporal, prácticas…" className={campo} /></label>
            <label className={etiqueta}>Horas a la semana<input name="horas" inputMode="decimal" className={campo} /></label>
          </div>
        </div>

        <fieldset className="grid content-start gap-2">
          <legend className="mb-1 text-xs font-semibold text-carbon/55">Funciones · son las que le dan acceso en la app</legend>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {funciones.map((f) => (
              <label key={f.id} className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm hover:border-lima">
                <input type="checkbox" name="funciones" value={f.id} className="accent-lima" />
                {f.nombre}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="lg:col-span-2">
          <button type="submit" className="rounded-full bg-lima px-5 py-2.5 text-base font-semibold text-carbon transition hover:bg-lima-dark hover:text-white">
            Dar de alta
          </button>
          <span className="ml-3 text-sm text-carbon/50">Después, en su ficha, se completan el DNI, la cuenta, el horario y lo demás.</span>
        </div>
      </form>
    </div>
  );
}
