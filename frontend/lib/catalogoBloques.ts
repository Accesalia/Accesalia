// lib/catalogoBloques.ts
//
// EL CATALOGO DE BLOQUES (Monica, 3-oct-2026, sobre su maqueta aprobada tal
// cual: docs/figma/catalogo-bloques.html).
//
// Es donde se crean, cambian y retiran los bloques que los comerciales marcan
// al generar una hoja de encargo. Tres reglas que vienen de ella:
//   - RETIRAR NUNCA BORRA. Un bloque retirado deja de ofrecerse, pero las hojas
//     antiguas que lo usaron lo conservan (641 conceptos usan la subvencion de
//     accesibilidad retirada el 2-oct).
//   - Cambiar un bloque NO toca las hojas ya generadas: cada version guarda su
//     propia foto (versiones_hoja.contenido_html).
//   - Lo que dice aqui es solo lo que sale POR DEFECTO; en cada hoja se cambia.
//
// Quien entra: direccion (Monica, Daniel) y secretaria (Alejandra, la
// secretaria comercial). Se comprueba en cada accion, no solo al abrir.

import "server-only";
import type { Yo } from "./sesion";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CABECERAS = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

export type Desglose = "no_aparece" | "incluido" | "se_cobra";
export const DESGLOSES: Desglose[] = ["no_aparece", "incluido", "se_cobra"];

export type BloqueCatalogo = {
  id: string;
  codigo: string;
  nombreCorto: string;
  /** El texto entero: la primera linea es el titulo, las de "•" los puntos. */
  texto: string;
  desglose: Desglose;
  importe: number | null;
  orden: number | null;
  activo: boolean;
  /** En cuantas hojas se ha usado (conceptos que lo apuntan). */
  usos: number;
};

/** ¿Puede gestionar el catalogo? Direccion o secretaria comercial. */
export function puedeGestionarBloques(yo: Yo): boolean {
  return yo.veTodo || yo.funciones.some((f) => f.clave === "secretaria");
}

async function pedir(path: string, init?: RequestInit) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { ...CABECERAS, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r;
}

// Las rayas "────" que traian los textos del Excel separaban un bloque de otro
// en la plantilla vieja. No son parte del bloque: la hoja dibuja su separacion.
const esRaya = (l: string) => /^[\s─—-]+$/.test(l) && l.trim().length > 3;
export const limpiarTexto = (t: string) =>
  t
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => !esRaya(l))
    .join("\n")
    .trim();

export async function catalogoBloques(): Promise<BloqueCatalogo[]> {
  const r = await pedir(
    "bloques?select=id,codigo,nombre,nombre_corto,texto_plantilla,desglose,honorarios_defecto,orden,activo," +
      "usos:conceptos_hoja(count)&order=activo.desc,orden.asc.nullslast,nombre.asc",
  );
  const filas = (await r.json()) as {
    id: string;
    codigo: string;
    nombre: string;
    nombre_corto: string | null;
    texto_plantilla: string | null;
    desglose: Desglose;
    honorarios_defecto: number | null;
    orden: number | null;
    activo: boolean;
    usos: { count: number }[];
  }[];
  return filas.map((f) => ({
    id: f.id,
    codigo: f.codigo,
    nombreCorto: f.nombre_corto ?? f.nombre,
    texto: limpiarTexto(f.texto_plantilla ?? f.nombre),
    desglose: f.desglose,
    importe: f.honorarios_defecto,
    orden: f.orden,
    activo: f.activo,
    usos: f.usos?.[0]?.count ?? 0,
  }));
}

export type DatosBloque = {
  nombreCorto: string;
  texto: string;
  desglose: Desglose;
  importe: number | null;
};

/** El titulo largo (la columna `nombre`) es la primera linea del texto: asi
 *  nunca dicen cosas distintas. */
function columnas(d: DatosBloque) {
  const texto = limpiarTexto(d.texto);
  const titulo = texto.split("\n")[0]?.trim() || d.nombreCorto;
  return {
    nombre_corto: d.nombreCorto.trim(),
    nombre: titulo,
    texto_plantilla: texto,
    desglose: d.desglose,
    // Solo lo que se cobra lleva importe por defecto.
    honorarios_defecto: d.desglose === "se_cobra" ? d.importe : null,
    actualizado_en: new Date().toISOString(),
  };
}

export async function guardarBloque(id: string, d: DatosBloque): Promise<void> {
  await pedir(`bloques?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(columnas(d)) });
}

/** El ultimo puesto de la lista de activos: ahi entran los nuevos y los que se
 *  vuelven a activar. */
async function siguienteOrden(): Promise<number> {
  const r = await pedir("bloques?select=orden&activo=is.true&orden=not.is.null&order=orden.desc&limit=1");
  const [f] = (await r.json()) as { orden: number }[];
  return (f?.orden ?? 0) + 1;
}

/** El codigo es la clave interna y tiene que ser unico. Sale del nombre corto,
 *  en mayusculas y sin tildes, y si ya existe se le pone un numero. */
async function codigoLibre(nombreCorto: string): Promise<string> {
  const base =
    nombreCorto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9+ ]/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "BLOQUE";
  const r = await pedir(`bloques?select=codigo&codigo=like.${encodeURIComponent(base)}*`);
  const usados = new Set(((await r.json()) as { codigo: string }[]).map((x) => x.codigo));
  if (!usados.has(base)) return base;
  for (let n = 2; ; n++) if (!usados.has(`${base} ${n}`)) return `${base} ${n}`;
}

export async function crearBloque(d: DatosBloque): Promise<string> {
  const r = await pedir("bloques", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      ...columnas(d),
      codigo: await codigoLibre(d.nombreCorto),
      orden: await siguienteOrden(),
      activo: true,
      es_paquete: false,
    }),
  });
  const [f] = (await r.json()) as { id: string }[];
  return f.id;
}

export async function retirarBloque(id: string): Promise<void> {
  await pedir(`bloques?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ activo: false, actualizado_en: new Date().toISOString() }),
  });
}

export async function activarBloque(id: string): Promise<void> {
  await pedir(`bloques?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ activo: true, orden: await siguienteOrden(), actualizado_en: new Date().toISOString() }),
  });
}

/** Subir o bajar un puesto: se intercambia el orden con el vecino. Se lee de
 *  la base, no de la pantalla, por si otra persona lo movio entretanto. */
export async function moverBloque(id: string, sentido: -1 | 1): Promise<void> {
  const r = await pedir("bloques?select=id,orden&activo=is.true&order=orden.asc.nullslast,nombre.asc");
  const lista = (await r.json()) as { id: string; orden: number | null }[];
  // Si hubiera huecos o repetidos, se renumera entera antes de mover.
  const i = lista.findIndex((b) => b.id === id);
  const j = i + sentido;
  if (i < 0 || j < 0 || j >= lista.length) return;
  [lista[i], lista[j]] = [lista[j], lista[i]];
  const cambios = lista
    .map((b, k) => ({ id: b.id, antes: b.orden, ahora: k + 1 }))
    .filter((c) => c.antes !== c.ahora);
  for (const c of cambios) {
    await pedir(`bloques?id=eq.${c.id}`, { method: "PATCH", body: JSON.stringify({ orden: c.ahora }) });
  }
}
