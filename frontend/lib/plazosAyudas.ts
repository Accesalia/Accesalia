// lib/plazosAyudas.ts
//
// LOS PLAZOS DE LAS AYUDAS (Monica, 11-oct-2026), para el informe de la
// estimacion de costes: "se convoca previsiblemente en X dias y se concede en
// unos X meses; en ese tiempo la obra habra pasado de X a Y euros".
//
// Por PROGRAMA del catalogo (entidad + programa: las lineas de un mismo
// programa salen juntas):
//  · EDICIONES: las fechas en que se convoco, de la BDNS (bdns_convocatorias,
//    con las del Ayuntamiento de Madrid apuntadas solo por sus fechas). Las
//    convocatorias del mismo año (Transforma tu Barrio saca una por barrio) son
//    una sola edicion.
//  · PROXIMA: la ultima edicion + lo que suele pasar entre ediciones (la
//    mediana; si solo hay una, nada: no se adivina).
//  · HASTA LA CONCESION: mediana de los meses entre la convocatoria y sus
//    concesiones. BDNS (concesiones_bdns) y, en Madrid capital, el geoportal
//    (subvencion_concedida: "REHABILITA 2024" se cruza con la edicion de 2024).

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

/** Lee por tramos de 1.000: la base no da mas de una vez, y las concesiones son miles. */
async function leer<T>(q: string): Promise<T[]> {
  const todo: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${q}`, {
      headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, Range: `${desde}-${desde + 999}` },
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const tramo = (await r.json()) as T[];
    todo.push(...tramo);
    if (tramo.length < 1000) return todo;
  }
}

export type Plazo = {
  ediciones: string[];
  proxima: string | null;
  mesesConcesion: number | null;
  /** Con cuantas convocatorias se ha medido lo de la concesion. */
  medidas: number;
};

const meses = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / (30.44 * 864e5);
const mediana = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y);
  return a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null;
};
const sumarMeses = (iso: string, m: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setMonth(d.getMonth() + Math.round(m));
  return d.toISOString().slice(0, 10);
};
export const clavePrograma = (entidad: string, programa: string) => `${entidad}|${programa}`;

/** Los plazos de cada programa, por clavePrograma(entidad, programa). */
export async function plazosPorPrograma(): Promise<Map<string, Plazo>> {
  type Conv = { numero: string; fecha_recepcion: string | null; catalogo: { entidad: string; programa: string } | null };
  const [convs, concesiones, madrid] = await Promise.all([
    leer<Conv>("bdns_convocatorias?select=numero,fecha_recepcion,catalogo:catalogo_convocatoria_id(entidad,programa)&catalogo_convocatoria_id=not.is.null&fecha_recepcion=not.is.null"),
    leer<{ numero_convocatoria: string; fecha_concesion: string }>("concesiones_bdns?select=numero_convocatoria,fecha_concesion&fecha_concesion=not.is.null&order=cod_concesion"),
    leer<{ convocatoria: string; fecha: string }>("subvencion_concedida?select=convocatoria,fecha&convocatoria=ilike.REHABILITA*&fecha=not.is.null&order=objectid"),
  ]);
  const fechasConcesion = new Map<string, string[]>();
  for (const c of concesiones) fechasConcesion.set(c.numero_convocatoria, [...(fechasConcesion.get(c.numero_convocatoria) ?? []), c.fecha_concesion]);

  const porPrograma = new Map<string, Conv[]>();
  for (const c of convs) {
    if (!c.catalogo) continue;
    const k = clavePrograma(c.catalogo.entidad, c.catalogo.programa);
    porPrograma.set(k, [...(porPrograma.get(k) ?? []), c]);
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const salida = new Map<string, Plazo>();
  for (const [k, cs] of porPrograma) {
    // Una edicion por año: la primera fecha de ese año.
    const porAño = new Map<string, string>();
    for (const c of cs) {
      const a = c.fecha_recepcion!.slice(0, 4);
      if (!porAño.has(a) || c.fecha_recepcion! < porAño.get(a)!) porAño.set(a, c.fecha_recepcion!);
    }
    const ediciones = [...porAño.values()].sort();
    const cadencia = mediana(ediciones.slice(1).map((e, i) => meses(ediciones[i], e)));
    let proxima: string | null = null;
    if (cadencia && cadencia >= 3) {
      proxima = sumarMeses(ediciones[ediciones.length - 1], cadencia);
      while (proxima < hoy) proxima = sumarMeses(proxima, cadencia);
    }
    // Meses hasta la concesion, por convocatoria (mediana de sus concesiones).
    const medidas: number[] = [];
    for (const c of cs) {
      const fs = fechasConcesion.get(c.numero);
      if (fs && fs.length >= 3) {
        const m = mediana(fs.map((f) => meses(c.fecha_recepcion!, f)));
        if (m !== null && m > 0) medidas.push(m);
      }
    }
    if (k.endsWith("|Plan Rehabilita")) {
      for (const [a, f] of porAño) {
        const fs = madrid.filter((x) => x.convocatoria.toUpperCase().includes(a)).map((x) => x.fecha);
        if (fs.length >= 3) {
          const m = mediana(fs.map((x) => meses(f, x)));
          if (m !== null && m > 0) medidas.push(m);
        }
      }
    }
    salida.set(k, { ediciones, proxima, mesesConcesion: mediana(medidas), medidas: medidas.length });
  }
  return salida;
}
