// lib/columnasInteres.ts
//
// "DE LO QUE VENDEMOS, QUE QUIEREN", EN CUATRO COLUMNAS (Monica, 7-oct-2026).
// El desplegable de una sola lista "esta confuso": se enseña por tipo de cosa,
// y dentro de cada columna primero lo que mas se pide.
//
// ES SOLO COMO SE ENSEÑA. "Por debajo nada cambia": se guarda exactamente igual
// (oportunidad_tipos), y la jerarquia de tipos_proyecto -la que usan las
// subvenciones- no se toca. Por eso el reparto vive aqui y no en la base.
//
// Un tipo nuevo que no este en ninguna lista sale en "Otras técnicas" hasta que
// se le de su sitio aqui.

export const COLUMNAS_INTERES: { titulo: string; nombres: string[] }[] = [
  {
    titulo: "Accesibilidad",
    nombres: ["Ascensor", "Cota cero", "Cambio de puertas", "Cambio de cabina", "Añadir parada", "Rampa", "Accesibilidad portal", "Plataforma"],
  },
  {
    titulo: "Eficiencia",
    nombres: ["SATE envolvente completa", "SATE fachada", "SATE cubierta", "Aerotermia", "Fotovoltaica", "Arreglo fachada", "Arreglo cubierta"],
  },
  {
    titulo: "Otras técnicas",
    nombres: ["IEE", "LEE", "Memoria técnica valorada", "Informe técnico", "Informe pericial", "Consulta urbanística", "Otros - proyecto técnico"],
  },
  {
    titulo: "Servicios",
    nombres: ["Subvenciones", "3 Presupuestos", "CAES", "Financiación", "DF", "CSS"],
  },
];

/** Lo que no sale en el desplegable: el agrupador "Otros", que nadie marca. */
const FUERA = new Set(["Otros"]);

/** Las cuatro columnas con sus opciones, la mas usada arriba. */
export function columnasDeInteres(tipos: { id: string; nombre: string; usos?: number }[]): { titulo: string; valores: string[] }[] {
  const sitio = new Map<string, number>();
  COLUMNAS_INTERES.forEach((c, i) => c.nombres.forEach((n) => sitio.set(n, i)));
  const cols = COLUMNAS_INTERES.map((c) => ({ titulo: c.titulo, tipos: [] as typeof tipos }));
  for (const t of tipos) {
    if (FUERA.has(t.nombre)) continue;
    cols[sitio.get(t.nombre) ?? 2].tipos.push(t);
  }
  // A igualdad de uso, se queda el orden de siempre (el de la base).
  return cols.map((c) => ({
    titulo: c.titulo,
    valores: c.tipos
      .map((t, i) => ({ t, i }))
      .sort((a, b) => (b.t.usos ?? 0) - (a.t.usos ?? 0) || a.i - b.i)
      .map(({ t }) => t.id),
  }));
}
