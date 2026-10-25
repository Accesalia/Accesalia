// lib/nubes.ts
//
// ASIGNAR › NUBE / PROYECTOS y PROCESO DE NUBES (Monica, 16-oct-2026; maqueta
// area-dinero-v1, marco 7). El camino de cada trabajo de tecnico:
//   hojas METIDAS EN PRODUCCION (bandeja comercial, 25-oct-2026; antes: lineas validadas) con alguna linea que
//   lleva tecnico, y sin pausa -> PENDIENTE DE DECIDIR (Alexandra:
//   ¿necesita nube de puntos?) -> si: PROCESO DE NUBES (Abraham: escaneo
//   previsto, escaneado, nube lista) -> PROYECTOS (el cronograma).
//                                  -> no: directo a PROYECTOS.
// Todo vive en nubes_puntos, una fila por oportunidad. Los trabajos salen de
// datosCaja (lib/cobros.ts): la entrega de una linea que va a tecnico, por facturar.

import "server-only";
import type { Yo } from "./sesion";
import { datosCaja, type DatosCaja, type TrabajoCaja } from "./cobros";
import { hojasEnProduccion } from "./recorridoHoja";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CABECERAS = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function todo<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: { ...CABECERAS, Range: `${desde}-${desde + 999}`, "Range-Unit": "items" }, cache: "no-store" });
    if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
    const filas = (await r.json()) as T[];
    out.push(...filas);
    if (filas.length < 1000) return out;
  }
}

/** Quien entra: lo de facturacion (decide) y quien escanea (Proceso de nubes). */
export const puedeDecidirNube = (yo: Yo) => yo.veTodo || yo.funciones.some((f) => f.clave === "facturacion" || f.clave === "control_produccion");
export const puedeVerNubes = (yo: Yo) => puedeDecidirNube(yo) || yo.funciones.some((f) => f.clave === "escaneo");

export type Nube = {
  necesita: boolean | null;
  decidida: string | null;
  prevista: string | null;
  escaneado: string | null;
  lista: string | null;
  notas: string | null;
};
export type TrabajoNube = TrabajoCaja & {
  /** La hoja metida en produccion mas reciente que lleva tecnico, su bloque y cuando se metio. */
  hoja: string | null;
  bloque: string | null;
  enProduccion: string | null;
  decision: Nube | null;
};
export type DatosAsignar = {
  caja: DatosCaja;
  pendientes: TrabajoNube[];
  enNube: TrabajoNube[];
  /** Los que ya pueden ir al cronograma: nube no, o nube lista. */
  aProyectos: TrabajoNube[];
};

export async function datosAsignar(): Promise<DatosAsignar> {
  const enProduccion = await hojasEnProduccion();
  const ids = [...enProduccion.keys()];
  const [caja, nubes, lineas] = await Promise.all([
    datosCaja(),
    todo<{ oportunidad_id: string; necesita_nube: boolean | null; decidida_en: string | null; fecha_prevista_escaneo: string | null; escaneado_en: string | null; nube_lista_en: string | null; notas: string | null }>(
      "nubes_puntos?select=oportunidad_id,necesita_nube,decidida_en,fecha_prevista_escaneo,escaneado_en,nube_lista_en,notas",
    ),
    // Las lineas que llevan tecnico de las hojas en produccion (por tramos: son cientos).
    Promise.all(
      Array.from({ length: Math.ceil(ids.length / 150) }, (_, i) => ids.slice(i * 150, i * 150 + 150)).map((t) =>
        todo<{ hoja_encargo_id: string; hoja: { numero_hoja: string | null; oportunidad_id: string | null } | null; bloque: { nombre: string; va_a_tecnico: boolean } | null }>(
          "lineas_facturacion?select=hoja_encargo_id,hoja:hoja_encargo_id(numero_hoja,oportunidad_id),bloque:bloque_id!inner(nombre,va_a_tecnico)" +
            `&bloque.va_a_tecnico=is.true&quitada_en=is.null&emisor=in.(accesalia,daniel_autonomo)&hoja_encargo_id=in.(${t.join(",")})`,
        ),
      ),
    ).then((x) => x.flat()),
  ]);
  const nubeDe = new Map(
    nubes.map((n) => [n.oportunidad_id, { necesita: n.necesita_nube, decidida: n.decidida_en, prevista: n.fecha_prevista_escaneo, escaneado: n.escaneado_en, lista: n.nube_lista_en, notas: n.notas }]),
  );
  // De cada opp, la hoja con tecnico metida en produccion mas recientemente.
  const metidaDe = new Map<string, { hoja: string | null; bloque: string; en: string }>();
  for (const l of lineas) {
    const en = enProduccion.get(l.hoja_encargo_id)?.metida?.en;
    if (!l.hoja?.oportunidad_id || !l.bloque || !en) continue;
    const ya = metidaDe.get(l.hoja.oportunidad_id);
    if (!ya || en > ya.en) metidaDe.set(l.hoja.oportunidad_id, { hoja: l.hoja.numero_hoja, bloque: l.bloque.nombre, en });
  }

  const trabajos: TrabajoNube[] = caja.trabajos
    .filter((t) => t.tecnico)
    .map((t) => {
      const v = metidaDe.get(t.oppId);
      return { ...t, hoja: v?.hoja ?? null, bloque: v?.bloque ?? null, enProduccion: v?.en ?? null, decision: nubeDe.get(t.oppId) ?? null };
    });
  return {
    caja,
    pendientes: trabajos.filter((t) => t.enProduccion && t.decision?.necesita == null).sort((a, b) => (b.enProduccion ?? "").localeCompare(a.enProduccion ?? "")),
    enNube: trabajos.filter((t) => t.decision?.necesita === true && !t.decision.lista).sort((a, b) => (a.decision?.decidida ?? "").localeCompare(b.decision?.decidida ?? "")),
    aProyectos: trabajos.filter((t) => t.decision?.necesita === false || (t.decision?.necesita === true && t.decision.lista)),
  };
}

export type CambiosNube = Partial<{
  necesita_nube: boolean | null;
  fecha_prevista_escaneo: string | null;
  escaneado_en: string | null;
  nube_lista_en: string | null;
  notas: string | null;
}>;

/** Apunta en nubes_puntos (crea la fila la primera vez). Al decidir sí/no, deja
 *  dicho cuando y quien. */
export async function guardarEnNube(oppId: string, cambios: CambiosNube, yo: Yo) {
  if (!/^[0-9a-f-]{36}$/.test(oppId)) throw new Error("Oportunidad no valida");
  const fila: Record<string, unknown> = { oportunidad_id: oppId, ...cambios, actualizado_por: yo.id };
  if ("necesita_nube" in cambios) Object.assign(fila, { decidida_en: cambios.necesita_nube == null ? null : new Date().toISOString(), decidida_por: cambios.necesita_nube == null ? null : yo.id });
  const r = await fetch(`${URL_BASE}/rest/v1/nubes_puntos?on_conflict=oportunidad_id`, {
    method: "POST",
    headers: { ...CABECERAS, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(fila),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`No se pudo guardar: ${r.status} ${await r.text()}`);
}
