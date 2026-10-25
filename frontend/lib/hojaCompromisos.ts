import "server-only";
// lib/hojaCompromisos.ts
//
// EL SISTEMA NUEVO DE LA HOJA, GUARDAR (Monica, 24-oct-2026: paso 4 del plan, «conectar la pantalla de prueba para que
// guarde»). Tablas he_versiones_hoja, he_estados_hoja, he_lineas_compromisos y he_lineas_compromisos_accesos
// (migraciones 20261024120000 y 20261024160000). La hoja se guarda como BORRADOR: sin codigo (lo pone el ok de Daniel).
//   - Una fila por cada fila de la tabla de la pantalla, colgada de la suya (padre_id), con su bloque.
//   - Lo invariable se lee del bloque; aqui va lo que salio: se cobra o incluido, importe o %, forma de pago, en el papel.
//   - Los portales van en TODAS las lineas (lo de dentro hereda los de su cabecera).
//   - Los totales no se guardan: se calculan.

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

/** Una fila de la pantalla, tal como la manda el motor del arbol. ref/padre son numeros de la pantalla. */
export type FilaHoja = {
  ref: number;
  padre: number | null;
  bloque: string; // codigo del bloque
  desglose: string | null; // nombre en tipos_proyecto
  enPapel: boolean;
  seCobra: boolean;
  importe: number | null;
  porcentaje: number | null;
  formaId: string | null;
  formaPropia: string | null;
  desglosar: boolean | null;
  portales: string[]; // accesos de esta fila (ya heredados)
  texto: string | null; // solo en «Otro» (y si se cambia a mano): lo que es, como sale en la hoja
};

/** QUIEN PAGA LA HOJA (Monica, 25-oct-2026: «como la vieja»): su comunidad, un particular titular o una contrata.
 *  «Una hoja va siempre a UN UNICO pagador, igual que una factura.» */
export type Pagador = { tipo: "comunidad" } | { tipo: "contrata"; id: string } | { tipo: "persona"; id: string };

/** Un caso «sale por defecto cuando» de he_formas_pago_defecto: bloque + quien paga (cualquiera, un tipo o una contrata). */
export type CasoForma = { bloque: string; pagador: "cualquiera" | "comunidad" | "persona" | "contrata"; contrataId: string | null; forma: string };

/** Las formas de pago vigentes y TODOS sus casos por defecto: el generador elige el que toca segun quien paga. */
export async function formasParaHoja(): Promise<{ formas: { id: string; nombre: string; frases: string[] }[]; casos: CasoForma[] }> {
  const [filas, casos] = await Promise.all([
    pedir<{ id: string; nombre: string; hitos: { orden: number; frase: string }[] }[]>("he_formas_pago?select=id,nombre,hitos:he_formas_pago_hitos(orden,frase)&activa=is.true&order=orden.asc"),
    pedir<{ forma_pago_id: string; pagador_tipo: CasoForma["pagador"]; pagador_contrata_id: string | null; bloque: { codigo: string } | null; forma: { activa: boolean } | null }[]>(
      "he_formas_pago_defecto?select=forma_pago_id,pagador_tipo,pagador_contrata_id,bloque:bloque_id(codigo),forma:forma_pago_id(activa)",
    ),
  ]);
  // Las frases de sus hitos, en orden: con ellas se escribe en el papel (el texto de la hoja = sus frases).
  const formas = filas.map((f) => ({ id: f.id, nombre: f.nombre, frases: [...f.hitos].sort((a, b) => a.orden - b.orden).map((h) => h.frase) }));
  return {
    formas,
    casos: casos
      .filter((c) => c.bloque && c.forma?.activa)
      .map((c) => ({ bloque: c.bloque!.codigo, pagador: c.pagador_tipo, contrataId: c.pagador_contrata_id, forma: c.forma_pago_id })),
  };
}

/** Todos los tipos de proyecto por su id (tambien los no elegibles): para leer las tarifas por el nombre del tipo. */
export async function nombresDeTipos(): Promise<Map<string, string>> {
  const filas = await pedir<{ id: string; nombre: string }[]>("tipos_proyecto?select=id,nombre");
  return new Map(filas.map((t) => [t.id, t.nombre]));
}

/** Guarda la hoja en borrador. Con versionId SIGUE EL MISMO BORRADOR: se cambian sus lineas (aun no ha salido de casa,
 *  no hay nada que conservar). Sin el, nace una version nueva. */
export async function guardarBorrador(oppId: string, filas: FilaHoja[], yo: Yo, versionId: string | null, pagador: Pagador): Promise<string> {
  if (!/^[0-9a-f-]{36}$/.test(oppId)) throw new Error("Oportunidad no válida.");
  if (!filas.length) throw new Error("La hoja está vacía.");
  if (pagador.tipo !== "comunidad" && !/^[0-9a-f-]{36}$/.test(pagador.id)) throw new Error("Elige a quién va la hoja.");
  const [[opp], bloques, tipos] = await Promise.all([
    pedir<{ id: string; comunidad_id: string | null; comercial_id: string | null }[]>(`oportunidades?select=id,comunidad_id,comercial_id&id=eq.${oppId}`),
    pedir<{ id: string; codigo: string }[]>("bloques?select=id,codigo"),
    pedir<{ id: string; nombre: string }[]>("tipos_proyecto?select=id,nombre"),
  ]);
  if (!opp) throw new Error("No encuentro esa oportunidad.");
  if (pagador.tipo === "comunidad" && !opp.comunidad_id) throw new Error("La oportunidad no tiene comunidad: elige a quién va la hoja.");
  const quienPaga = {
    pagador_tipo: pagador.tipo,
    pagador_comunidad_id: pagador.tipo === "comunidad" ? opp.comunidad_id : null,
    pagador_contrata_id: pagador.tipo === "contrata" ? pagador.id : null,
    pagador_persona_id: pagador.tipo === "persona" ? pagador.id : null,
  };
  const idBloque = new Map(bloques.map((b) => [b.codigo, b.id]));
  const idTipo = new Map(tipos.map((t) => [t.nombre, t.id]));
  for (const f of filas) {
    if (!idBloque.has(f.bloque)) throw new Error(`El bloque «${f.bloque}» no está en el catálogo.`);
    if (f.desglose && !idTipo.has(f.desglose)) throw new Error(`El tipo «${f.desglose}» no está en tipos de proyecto.`);
  }

  let version: { id: string };
  let viejas: string[] = [];
  if (versionId) {
    if (!/^[0-9a-f-]{36}$/.test(versionId)) throw new Error("Borrador no válido.");
    const [v] = await pedir<{ id: string; oportunidad_id: string; estado: string }[]>(`he_versiones_hoja?select=id,oportunidad_id,estado&id=eq.${versionId}`);
    if (!v || v.oportunidad_id !== opp.id) throw new Error("Ese borrador no es de esta oportunidad.");
    if (v.estado !== "borrador") throw new Error("Esa hoja ya no está en borrador: no se puede cambiar.");
    version = v;
    viejas = (await pedir<{ id: string }[]>(`he_lineas_compromisos?select=id&version_id=eq.${v.id}&padre_id=is.null`)).map((x) => x.id);
  } else {
    [version] = await pedir<{ id: string }[]>("he_versiones_hoja", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ oportunidad_id: opp.id, ...quienPaga, comercial_id: opp.comercial_id, generada_por: yo.id, estado: "borrador" }),
    });
  }
  // Los ids se ponen aqui para colgar cada fila de la suya en un solo envio.
  const uuid = new Map(filas.map((f) => [f.ref, crypto.randomUUID()]));
  try {
    if (!versionId) await pedir("he_estados_hoja", { method: "POST", body: JSON.stringify({ version_id: version.id, estado: "borrador", persona_id: yo.id }) });
    const lineas = filas.map((f) => ({
      id: uuid.get(f.ref),
      version_id: version.id,
      padre_id: f.padre == null ? null : uuid.get(f.padre) ?? null,
      bloque_id: idBloque.get(f.bloque),
      desglose_id: f.desglose ? idTipo.get(f.desglose) : null,
      en_papel: f.enPapel,
      se_cobra: f.seCobra,
      importe: f.seCobra ? f.importe : null,
      porcentaje: f.seCobra ? f.porcentaje : null,
      forma_pago_id: f.seCobra ? f.formaId : null,
      forma_pago_propia: f.seCobra && !f.formaId ? f.formaPropia?.trim() || null : null,
      texto: f.texto?.trim() || null,
      desglosar_precios: f.desglosar,
    }));
    await pedir("he_lineas_compromisos", { method: "POST", body: JSON.stringify(lineas) });
    const accesos = filas.flatMap((f) => [...new Set(f.portales)].map((a) => ({ linea_id: uuid.get(f.ref), acceso_id: a })));
    if (accesos.length) await pedir("he_lineas_compromisos_accesos", { method: "POST", body: JSON.stringify(accesos) });
  } catch (e) {
    // A medias no vale. Nueva: se quita entera (sus lineas caen con ella). El mismo borrador: fuera lo nuevo, queda lo de antes.
    if (!versionId) {
      await pedir(`he_estados_hoja?version_id=eq.${version.id}`, { method: "DELETE" }).catch(() => {});
      await pedir(`he_versiones_hoja?id=eq.${version.id}`, { method: "DELETE" }).catch(() => {});
    } else {
      const nuevas = filas.filter((f) => f.padre == null).map((f) => uuid.get(f.ref));
      await pedir(`he_lineas_compromisos?id=in.(${nuevas.join(",")})`, { method: "DELETE" }).catch(() => {});
    }
    throw e;
  }
  // Lo de antes del mismo borrador, fuera (lo de dentro cae con su cabecera).
  if (viejas.length) await pedir(`he_lineas_compromisos?id=in.(${viejas.join(",")})`, { method: "DELETE" });
  if (versionId) await pedir(`he_versiones_hoja?id=eq.${version.id}`, { method: "PATCH", body: JSON.stringify({ ...quienPaga, actualizado_en: new Date().toISOString() }) });
  return version.id;
}

export type LineaGuardada = {
  id: string; padre: string | null; bloque: string; nombreBloque: string; desglose: string | null; enPapel: boolean; seCobra: boolean;
  importe: number | null; porcentaje: number | null; formaId: string | null; formaPropia: string | null; forma: string | null; desglosar: boolean | null; portales: string[]; texto: string | null;
};
export type BorradorGuardado = { id: string; creadoEn: string; actualizadoEn: string; estado: string; quien: string | null; pagador: Pagador; aQuien: string | null; lineas: LineaGuardada[] };

/** Lo guardado de una opp, leido tal cual de las tablas nuevas: para comprobar que guarda lo que se ve. */
export async function borradoresDe(oppId: string): Promise<BorradorGuardado[]> {
  if (!/^[0-9a-f-]{36}$/.test(oppId)) return [];
  const filas = await pedir<{
    id: string; creado_en: string; actualizado_en: string; estado: string; quien: { nombre: string } | null;
    pagador_tipo: Pagador["tipo"]; pagador_contrata_id: string | null; pagador_persona_id: string | null;
    contrata: { nombre: string } | null; persona: { nombre: string; apellidos: string | null } | null; comunidad: { nombre: string } | null;
    lineas: { id: string; padre_id: string | null; en_papel: boolean; se_cobra: boolean; importe: number | null; porcentaje: number | null; forma_pago_id: string | null; forma_pago_propia: string | null; desglosar_precios: boolean | null; texto: string | null;
      bloque: { codigo: string; nombre_corto: string | null; nombre: string } | null; desglose: { nombre: string } | null; forma: { nombre: string } | null; accesos: { acceso_id: string }[] }[];
  }[]>(
    `he_versiones_hoja?select=id,creado_en,actualizado_en,estado,quien:generada_por(nombre),pagador_tipo,pagador_contrata_id,pagador_persona_id,` +
      `contrata:pagador_contrata_id(nombre),persona:pagador_persona_id(nombre,apellidos),comunidad:pagador_comunidad_id(nombre),lineas:he_lineas_compromisos(id,padre_id,en_papel,se_cobra,importe,porcentaje,forma_pago_id,forma_pago_propia,desglosar_precios,texto,` +
      `bloque:bloque_id(codigo,nombre_corto,nombre),desglose:desglose_id(nombre),forma:forma_pago_id(nombre),accesos:he_lineas_compromisos_accesos(acceso_id))` +
      `&oportunidad_id=eq.${oppId}&order=creado_en.desc`,
  );
  return filas.map((v) => ({
    id: v.id, creadoEn: v.creado_en, actualizadoEn: v.actualizado_en, estado: v.estado, quien: v.quien?.nombre ?? null,
    pagador: v.pagador_tipo === "contrata" && v.pagador_contrata_id ? { tipo: "contrata", id: v.pagador_contrata_id }
      : v.pagador_tipo === "persona" && v.pagador_persona_id ? { tipo: "persona", id: v.pagador_persona_id } : { tipo: "comunidad" },
    aQuien: v.contrata?.nombre ?? (v.persona ? [v.persona.nombre, v.persona.apellidos].filter(Boolean).join(" ") : null) ?? v.comunidad?.nombre ?? null,
    lineas: v.lineas.map((l) => ({
      id: l.id, padre: l.padre_id, bloque: l.bloque?.codigo ?? "?", nombreBloque: l.bloque?.nombre_corto ?? l.bloque?.nombre ?? "?", desglose: l.desglose?.nombre ?? null,
      enPapel: l.en_papel, seCobra: l.se_cobra, importe: l.importe == null ? null : Number(l.importe), porcentaje: l.porcentaje == null ? null : Number(l.porcentaje),
      formaId: l.forma_pago_id, formaPropia: l.forma_pago_propia,
      forma: l.forma?.nombre ?? l.forma_pago_propia ?? null, desglosar: l.desglosar_precios, portales: l.accesos.map((a) => a.acceso_id), texto: l.texto,
    })),
  }));
}
