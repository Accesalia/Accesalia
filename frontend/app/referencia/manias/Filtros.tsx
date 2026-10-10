"use client";

import { useRouter } from "next/navigation";

type Opcion = { valor: string; n: number };

const sel =
  "h-[34px] w-full rounded-[10px] border border-carbon/25 bg-white px-2.5 text-[13.5px] text-carbon outline-none focus:border-lima-dark";

/** Los tres filtros: al cambiar uno, se recarga con el nuevo en la direccion. */
export function Filtros({
  actual,
  municipios,
  entidades,
  personas,
}: {
  actual: { municipio?: string; entidad?: string; persona?: string };
  municipios: Opcion[];
  entidades: Opcion[];
  personas: Opcion[];
}) {
  const router = useRouter();
  const ir = (clave: "municipio" | "entidad" | "persona", valor: string) => {
    const q = new URLSearchParams();
    const nuevo = { ...actual, [clave]: valor || undefined };
    for (const [k, v] of Object.entries(nuevo)) if (v) q.set(k, v);
    const s = q.toString();
    router.push(`/referencia/manias${s ? `?${s}` : ""}`, { scroll: false });
  };

  const caja = (clave: "municipio" | "entidad" | "persona", rotulo: string, todas: string, opciones: Opcion[]) => (
    <label className="block">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-carbon/60">{rotulo}</span>
      <select value={actual[clave] ?? ""} onChange={(e) => ir(clave, e.target.value)} className={sel + " mt-1"}>
        <option value="">{todas}</option>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.valor} ({o.n})
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {caja("municipio", "Municipio", "Todos los municipios", municipios)}
      {caja("entidad", "Entidad", "Todas las entidades", entidades)}
      {caja("persona", "Persona (técnico)", "Todas las personas", personas)}
    </div>
  );
}
