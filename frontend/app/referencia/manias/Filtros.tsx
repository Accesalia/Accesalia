"use client";

export type Opcion = { valor: string; n: number };
export type Criterios = { municipio: string; entidad: string; persona: string };

const sel =
  "h-[34px] w-full rounded-[10px] border border-carbon/25 bg-white pl-2.5 pr-8 text-[13.5px] text-carbon outline-none focus:border-lima-dark";

/** Los tres filtros. Cada uno con su × para quitar SOLO ese (Monica, 10-oct-2026:
 *  "para quitar un filtro, solo uno, deberia ser mas sencillo: una crucecita").
 *  Los numeros cuentan dentro de lo que ya se ha buscado y filtrado. */
export function Filtros({
  actual,
  cambiar,
  municipios,
  entidades,
  personas,
}: {
  actual: Criterios;
  cambiar: (clave: keyof Criterios, valor: string) => void;
  municipios: Opcion[];
  entidades: Opcion[];
  personas: Opcion[];
}) {
  const caja = (clave: keyof Criterios, rotulo: string, todas: string, opciones: Opcion[]) => {
    const puesto = actual[clave];
    // El elegido sigue en la lista aunque con lo buscado no quede ninguna suya.
    const lista = puesto && !opciones.some((o) => o.valor === puesto) ? [{ valor: puesto, n: 0 }, ...opciones] : opciones;
    return (
      <label className="block">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-carbon/60">{rotulo}</span>
        <div className="relative mt-1">
          <select
            value={puesto}
            onChange={(e) => cambiar(clave, e.target.value)}
            className={sel + (puesto ? " border-lima-dark bg-lima-soft font-semibold" : "")}
          >
            <option value="">{todas}</option>
            {lista.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.valor} ({o.n})
              </option>
            ))}
          </select>
          {puesto && (
            <button
              type="button"
              onClick={() => cambiar(clave, "")}
              aria-label={`Quitar el filtro de ${rotulo.toLowerCase()}`}
              title="Quitar este filtro"
              className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[15px] font-bold leading-none text-carbon/60 shadow-sm transition hover:bg-carbon hover:text-white"
            >
              ×
            </button>
          )}
        </div>
      </label>
    );
  };

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {caja("municipio", "Municipio", "Todos los municipios", municipios)}
      {caja("entidad", "Entidad", "Todas las entidades", entidades)}
      {caja("persona", "Persona (técnico)", "Todas las personas", personas)}
    </div>
  );
}
