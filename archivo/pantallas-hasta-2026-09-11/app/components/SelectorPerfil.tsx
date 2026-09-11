"use client";

// Selector de identidad (login-fake) para la barra superior. Al cambiar, envia
// el formulario -> la accion fija la cookie y revalida -> toda la app se repinta
// "como" esa persona.

import { elegirPerfil } from "./perfilAcciones";
import { Guardando } from "../components/Guardando";

export type PersonaPerfil = { id: string; nombre: string; funcion: string | null };

export function SelectorPerfil({ personas, actualId }: { personas: PersonaPerfil[]; actualId: string | null }) {
  return (
    <form action={elegirPerfil} className="flex items-center gap-2">
      <Guardando />
      <span className="hidden text-xs font-medium uppercase tracking-wide text-white/40 lg:inline">Viendo como</span>
      <select
        name="perfil_id"
        defaultValue={actualId ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="max-w-[230px] rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white outline-none focus:border-lima [&>option]:text-carbon"
      >
        <option value="">— Elegir quién soy —</option>
        {personas.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
            {p.funcion ? ` · ${p.funcion}` : ""}
          </option>
        ))}
      </select>
    </form>
  );
}
