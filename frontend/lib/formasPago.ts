import "server-only";
// lib/formasPago.ts
//
// LAS FORMAS DE PAGO DE LA HOJA DE ENCARGO (Monica, 24-oct-2026). Tablas he_formas_pago, he_formas_pago_hitos y
// he_formas_pago_defecto (migracion 20261024140000). Maqueta validada: docs/figma/formas-de-pago.html.
//   - Cada forma lleva sus hitos (momento, fijo con su % o a exito) y la frase de cada hito para la hoja.
//   - Los fijos suman 100; como mucho un hito a exito.
//   - Sale por defecto en los casos que se digan (un bloque + quien paga); cada caso, UNA forma. Sin caso, en blanco.
//   - Editar: el nombre, las notas y los casos se cambian en el sitio. Si cambian los hitos de una forma YA USADA, la de
//     siempre se desactiva (con su historial) y nace otra que la sustituye: lo firmado no cambia.

import type { Yo } from "./sesion";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...init, headers: { ...CAB, ...(init.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const texto = await r.text();
  return (texto ? JSON.parse(texto) : null) as T;
}

export const MOMENTOS: Record<string, [string, string]> = {
  encargo: ["encargo", "a la contratación"],
  entrega: ["entrega", "a la entrega del proyecto"],
  licencia: ["licencia", "a la concesión de la licencia"],
  pss: ["PSS", "a la firma del Plan de Seguridad y Salud"],
  inicio_obra: ["inicio de obra", "al inicio de obra"],
  cfo: ["CFO", "al certificado de fin de obra"],
  presentacion: ["presentación", "a la presentación de la subvención"],
  concesion: ["concesión", "a la concesión de la subvención"],
};

export type HitoForma = { momento: string; tipo: "fijo" | "exito"; porcentaje: number | null; frase: string };
/** pagador: «cualquiera», «comunidad», «persona» (un particular) o «contrata:<id>». */
export type CasoDefecto = { bloqueId: string; pagador: string };
export type Forma = { id: string; nombre: string; notas: string; activa: boolean; orden: number; hitos: HitoForma[]; casos: CasoDefecto[]; lineas: number; desactivadaEn: string | null };
export type Opcion = { valor: string; texto: string };

// Quien las gestiona (Monica, 24-oct-2026): direccion, facturacion y administracion. COMERCIAL NO: «si no, es un lio;
// si un comercial quiere un cambio, que lo pida». La funcion de administracion aun no existe: cuando se cree con la
// clave «administracion», entra sola.
export const puedeGestionarFormas = (yo: Yo) => yo.veTodo || yo.funciones.some((f) => f.clave === "facturacion" || f.clave === "administracion");

export async function formasDePago(): Promise<{ formas: Forma[]; bloques: Opcion[]; pagadores: Opcion[] }> {
  const [filas, bloques, contratas] = await Promise.all([
    pedir<{ id: string; nombre: string; notas: string | null; activa: boolean; orden: number; desactivada_en: string | null;
      hitos: { orden: number; momento: string; tipo: "fijo" | "exito"; porcentaje: number | null; frase: string }[];
      defectos: { bloque_id: string; pagador_tipo: string; pagador_contrata_id: string | null }[] }[]>(
      "he_formas_pago?select=id,nombre,notas,activa,orden,desactivada_en,hitos:he_formas_pago_hitos(orden,momento,tipo,porcentaje,frase),defectos:he_formas_pago_defecto(bloque_id,pagador_tipo,pagador_contrata_id)&order=orden.asc",
    ),
    pedir<{ id: string; nombre_corto: string | null; nombre: string }[]>("bloques?select=id,nombre_corto,nombre&activo=is.true&order=orden.asc.nullslast"),
    pedir<{ id: string; nombre: string }[]>("contratas?select=id,nombre&order=nombre.asc&limit=2000"),
  ]);
  // Cuantas lineas de compromiso la llevan: cuando exista he_lineas_compromisos se contaran ahi. Hoy, ninguna.
  const formas = filas.map((f) => ({
    id: f.id, nombre: f.nombre, notas: f.notas ?? "", activa: f.activa, orden: f.orden, desactivadaEn: f.desactivada_en, lineas: 0,
    hitos: [...f.hitos].sort((a, b) => a.orden - b.orden).map((h) => ({ momento: h.momento, tipo: h.tipo, porcentaje: h.porcentaje == null ? null : Number(h.porcentaje), frase: h.frase })),
    casos: f.defectos.map((d) => ({ bloqueId: d.bloque_id, pagador: d.pagador_tipo === "contrata" ? `contrata:${d.pagador_contrata_id}` : d.pagador_tipo })),
  }));
  return {
    formas,
    bloques: bloques.map((b) => ({ valor: b.id, texto: b.nombre_corto ?? b.nombre })),
    pagadores: [
      { valor: "cualquiera", texto: "pague quien pague" },
      { valor: "comunidad", texto: "la comunidad" },
      { valor: "persona", texto: "un particular" },
      ...contratas.map((c) => ({ valor: `contrata:${c.id}`, texto: c.nombre })),
    ],
  };
}

/** Lo mismo que comprueba la pantalla, otra vez aqui: lo que se guarda tiene que estar bien venga de donde venga. */
export function comprobarHitos(hitos: HitoForma[]): string | null {
  if (!hitos.length) return "Falta al menos un hito.";
  if (hitos.some((h) => !MOMENTOS[h.momento])) return "Hay un momento que no es de la lista.";
  if (hitos.filter((h) => h.tipo === "exito").length > 1) return "Solo un hito puede ser a éxito.";
  if (hitos.some((h) => !h.frase.trim())) return "Falta la frase de algún hito.";
  const fijos = hitos.filter((h) => h.tipo === "fijo");
  if (fijos.some((h) => !(Number(h.porcentaje) > 0))) return "Falta el porcentaje de algún hito.";
  const suma = Math.round(fijos.reduce((s, h) => s + Number(h.porcentaje), 0) * 100) / 100;
  if (fijos.length && suma !== 100) return `Los hitos fijos suman ${suma} %: tienen que sumar 100.`;
  return null;
}

const filaCaso = (formaId: string, c: CasoDefecto) => {
  const contrata = c.pagador.startsWith("contrata:") ? c.pagador.slice(9) : null;
  return { forma_pago_id: formaId, bloque_id: c.bloqueId, pagador_tipo: contrata ? "contrata" : c.pagador, pagador_contrata_id: contrata };
};
const filtroCaso = (c: CasoDefecto) => {
  const contrata = c.pagador.startsWith("contrata:") ? c.pagador.slice(9) : null;
  return contrata ? `bloque_id=eq.${c.bloqueId}&pagador_contrata_id=eq.${contrata}` : `bloque_id=eq.${c.bloqueId}&pagador_tipo=eq.${c.pagador}&pagador_contrata_id=is.null`;
};
const mismosHitos = (a: HitoForma[], b: HitoForma[]) =>
  JSON.stringify(a.map((h) => [h.momento, h.tipo, h.porcentaje == null ? null : Number(h.porcentaje), h.frase.trim()])) ===
  JSON.stringify(b.map((h) => [h.momento, h.tipo, h.porcentaje == null ? null : Number(h.porcentaje), h.frase.trim()]));

async function ponerHitos(formaId: string, hitos: HitoForma[]) {
  await pedir(`he_formas_pago_hitos?forma_pago_id=eq.${formaId}`, { method: "DELETE" });
  await pedir("he_formas_pago_hitos", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(hitos.map((h, i) => ({ forma_pago_id: formaId, orden: i + 1, momento: h.momento, tipo: h.tipo, porcentaje: h.tipo === "fijo" ? Number(h.porcentaje) : null, frase: h.frase.trim() }))),
  });
}
/** Cada caso da UNA forma: los que esta se queda dejan de ser de la que los tuviera. */
async function ponerCasos(formaId: string, casos: CasoDefecto[]) {
  await pedir(`he_formas_pago_defecto?forma_pago_id=eq.${formaId}`, { method: "DELETE" });
  for (const c of casos) await pedir(`he_formas_pago_defecto?${filtroCaso(c)}`, { method: "DELETE" });
  if (casos.length)
    await pedir("he_formas_pago_defecto", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(casos.map((c) => filaCaso(formaId, c))) });
}

export type GuardarForma = { id: string | null; nombre: string; notas: string; hitos: HitoForma[]; casos: CasoDefecto[] };

/** Crear una forma nueva o guardar los cambios de una que ya existe. Devuelve el id de la que queda vigente. */
export async function guardarForma(g: GuardarForma, yo: Yo): Promise<string> {
  if (!g.nombre.trim()) throw new Error("Falta el nombre que le sale al comercial.");
  const mal = comprobarHitos(g.hitos);
  if (mal) throw new Error(mal);
  const casos = g.casos.filter((c, i, t) => t.findIndex((x) => x.bloqueId === c.bloqueId && x.pagador === c.pagador) === i);

  if (g.id) {
    const [actual] = await pedir<{ id: string; orden: number; hitos: HitoForma[] }[]>(
      `he_formas_pago?select=id,orden,hitos:he_formas_pago_hitos(momento,tipo,porcentaje,frase,orden)&id=eq.${g.id}`,
    );
    if (!actual) throw new Error("Esa forma de pago ya no existe.");
    const antes = [...actual.hitos].sort((a, b) => (a as unknown as { orden: number }).orden - (b as unknown as { orden: number }).orden);
    const usada = 0; // cuantas lineas de compromiso la llevan: cuando exista he_lineas_compromisos, se cuentan ahi
    if (mismosHitos(antes, g.hitos) || !usada) {
      await pedir(`he_formas_pago?id=eq.${g.id}`, { method: "PATCH", body: JSON.stringify({ nombre: g.nombre.trim(), notas: g.notas.trim() || null }) });
      if (!mismosHitos(antes, g.hitos)) await ponerHitos(g.id, g.hitos);
      await ponerCasos(g.id, casos);
      return g.id;
    }
    // Cambian los hitos de una forma ya usada: la de siempre queda desactivada, con su historial, y nace esta.
    await pedir(`he_formas_pago?id=eq.${g.id}`, { method: "PATCH", body: JSON.stringify({ activa: false, desactivada_en: new Date().toISOString() }) });
    await pedir(`he_formas_pago_defecto?forma_pago_id=eq.${g.id}`, { method: "DELETE" });
    const [nueva] = await pedir<{ id: string }[]>("he_formas_pago", {
      method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ nombre: g.nombre.trim(), notas: g.notas.trim() || null, orden: actual.orden, creada_por: yo.id, sustituye_a: g.id }),
    });
    await ponerHitos(nueva.id, g.hitos);
    await ponerCasos(nueva.id, casos);
    return nueva.id;
  }

  const [ultima] = await pedir<{ orden: number }[]>("he_formas_pago?select=orden&order=orden.desc&limit=1");
  const [nueva] = await pedir<{ id: string }[]>("he_formas_pago", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ nombre: g.nombre.trim(), notas: g.notas.trim() || null, orden: (ultima?.orden ?? 0) + 1, creada_por: yo.id }),
  });
  await ponerHitos(nueva.id, g.hitos);
  await ponerCasos(nueva.id, casos);
  return nueva.id;
}

/** Desactivar (deja de elegirse, y suelta sus casos por defecto) o reactivar. */
export async function cambiarActiva(id: string, activa: boolean): Promise<void> {
  await pedir(`he_formas_pago?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ activa, desactivada_en: activa ? null : new Date().toISOString() }) });
  if (!activa) await pedir(`he_formas_pago_defecto?forma_pago_id=eq.${id}`, { method: "DELETE" });
}
