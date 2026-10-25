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
import { recalcularLuego } from "./estadoOportunidad";
import { comisionDeOpp } from "./hojaGenerador";

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
  comision: number | null; // euros de comision del administrador que van DENTRO de su importe (no salen en el papel)
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

/** Lo que el comercial puede seguir cambiando: el borrador y lo que Daniel le devuelve con cambios. */
export const EDITABLE = ["borrador", "cambios_daniel"];

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
  // LA COMISION (25-oct-2026): el acuerdo se busca aqui, no viene del navegador. Si alguna linea la lleva y la comunidad
  // ya no tiene acuerdo valido, no se guarda: que se revise antes.
  const conComision = filas.some((f) => f.seCobra && (f.comision ?? 0) > 0);
  const acuerdo = conComision ? (await comisionDeOpp(opp.id, opp.comunidad_id)).comision?.acuerdoId ?? null : null;
  if (conComision && !acuerdo) throw new Error("La hoja lleva comisión del administrador pero su comunidad ya no tiene un acuerdo válido. Vuelve a abrir la hoja.");
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
    // Se cambia mientras no ha salido: en borrador o devuelta por Daniel con cambios (la misma version, 25-oct-2026).
    if (!EDITABLE.includes(v.estado)) throw new Error("Esa hoja ya no está en borrador: no se puede cambiar.");
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
      comision_importe: f.seCobra && (f.comision ?? 0) > 0 ? f.comision : null,
      comision_acuerdo_id: f.seCobra && (f.comision ?? 0) > 0 ? acuerdo : null,
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
  importe: number | null; porcentaje: number | null; formaId: string | null; formaPropia: string | null; forma: string | null; desglosar: boolean | null; portales: string[]; texto: string | null; comision: number | null;
};
export type BorradorGuardado = {
  id: string; creadoEn: string; actualizadoEn: string; estado: string; codigo: string | null; numero: number; quien: string | null; pagador: Pagador; aQuien: string | null; lineas: LineaGuardada[];
  /** El ultimo paso del historial: quien, cuando y su nota (los cambios que pide Daniel, p. ej.). */
  ultimo: { estado: string; fecha: string; quien: string | null; nota: string | null } | null;
};

/** Lo guardado de una opp, leido tal cual de las tablas nuevas: para comprobar que guarda lo que se ve. */
export async function borradoresDe(oppId: string): Promise<BorradorGuardado[]> {
  if (!/^[0-9a-f-]{36}$/.test(oppId)) return [];
  const filas = await pedir<{
    id: string; creado_en: string; actualizado_en: string; estado: string; codigo_he: string | null; numero_version: number; quien: { nombre: string } | null;
    pagador_tipo: Pagador["tipo"]; pagador_contrata_id: string | null; pagador_persona_id: string | null;
    contrata: { nombre: string } | null; persona: { nombre: string; apellidos: string | null } | null; comunidad: { nombre: string } | null;
    estados: { estado: string; fecha: string; nota: string | null; persona: { nombre: string } | null }[];
    lineas: { id: string; padre_id: string | null; en_papel: boolean; se_cobra: boolean; importe: number | null; porcentaje: number | null; forma_pago_id: string | null; forma_pago_propia: string | null; desglosar_precios: boolean | null; texto: string | null; comision_importe: number | null;
      bloque: { codigo: string; nombre_corto: string | null; nombre: string } | null; desglose: { nombre: string } | null; forma: { nombre: string } | null; accesos: { acceso_id: string }[] }[];
  }[]>(
    `he_versiones_hoja?select=id,creado_en,actualizado_en,estado,codigo_he,numero_version,quien:generada_por(nombre),pagador_tipo,pagador_contrata_id,pagador_persona_id,` +
      `contrata:pagador_contrata_id(nombre),persona:pagador_persona_id(nombre,apellidos),comunidad:pagador_comunidad_id(nombre),estados:he_estados_hoja(estado,fecha,nota,persona:persona_id(nombre)),lineas:he_lineas_compromisos(id,padre_id,en_papel,se_cobra,importe,porcentaje,forma_pago_id,forma_pago_propia,desglosar_precios,texto,comision_importe,` +
      `bloque:bloque_id(codigo,nombre_corto,nombre),desglose:desglose_id(nombre),forma:forma_pago_id(nombre),accesos:he_lineas_compromisos_accesos(acceso_id))` +
      `&oportunidad_id=eq.${oppId}&order=creado_en.desc`,
  );
  return filas.map((v) => ({
    id: v.id, creadoEn: v.creado_en, actualizadoEn: v.actualizado_en, estado: v.estado, codigo: v.codigo_he, numero: v.numero_version, quien: v.quien?.nombre ?? null,
    pagador: v.pagador_tipo === "contrata" && v.pagador_contrata_id ? { tipo: "contrata", id: v.pagador_contrata_id }
      : v.pagador_tipo === "persona" && v.pagador_persona_id ? { tipo: "persona", id: v.pagador_persona_id } : { tipo: "comunidad" },
    ultimo: (() => {
      const e = [...v.estados].sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
      return e ? { estado: e.estado, fecha: e.fecha, quien: e.persona?.nombre ?? null, nota: e.nota } : null;
    })(),
    aQuien: v.contrata?.nombre ?? (v.persona ? [v.persona.nombre, v.persona.apellidos].filter(Boolean).join(" ") : null) ?? v.comunidad?.nombre ?? null,
    lineas: v.lineas.map((l) => ({
      id: l.id, padre: l.padre_id, bloque: l.bloque?.codigo ?? "?", nombreBloque: l.bloque?.nombre_corto ?? l.bloque?.nombre ?? "?", desglose: l.desglose?.nombre ?? null,
      enPapel: l.en_papel, seCobra: l.se_cobra, importe: l.importe == null ? null : Number(l.importe), porcentaje: l.porcentaje == null ? null : Number(l.porcentaje),
      formaId: l.forma_pago_id, formaPropia: l.forma_pago_propia,
      forma: l.forma?.nombre ?? l.forma_pago_propia ?? null, desglosar: l.desglosar_precios, portales: l.accesos.map((a) => a.acceso_id), texto: l.texto,
      comision: l.comision_importe == null ? null : Number(l.comision_importe),
    })),
  }));
}

// ------------------------------------------------------------- descartar y modificar (Monica, 25-oct-2026)

type VersionFila = { id: string; oportunidad_id: string; estado: string; codigo_he: string | null; numero_version: number };
async function versionDe(versionId: string): Promise<VersionFila> {
  if (!/^[0-9a-f-]{36}$/.test(versionId)) throw new Error("Hoja no válida.");
  const [v] = await pedir<VersionFila[]>(`he_versiones_hoja?select=id,oportunidad_id,estado,codigo_he,numero_version&id=eq.${versionId}`);
  if (!v) throw new Error("No encuentro esa hoja.");
  return v;
}
/** La oportunidad de una version: para comprobar el permiso antes de tocarla. */
export async function oppDeVersion(versionId: string): Promise<string> {
  return (await versionDe(versionId)).oportunidad_id;
}

/** Cambia el estado de una version: la fila guarda el ultimo y el historial, todos. */
export async function ponerEstado(versionId: string, estado: string, yo: Yo, nota: string | null) {
  await pedir("he_estados_hoja", { method: "POST", body: JSON.stringify({ version_id: versionId, estado, persona_id: yo.id, nota }) });
  const [v] = await pedir<{ oportunidad_id: string }[]>(`he_versiones_hoja?id=eq.${versionId}`, {
    method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ estado }),
  });
  // Cada paso de la hoja mueve la escalera de su opp: se recalcula su paso al momento (despues de responder).
  recalcularLuego(v?.oportunidad_id);
}

/** DESCARTAR UN BORRADOR («así no se acumulan cosas inútiles», 14-oct-2026): solo lo que no ha salido de casa. Se borra
 *  entero (sus lineas y portales caen con el). Si era la version nueva de una hoja ya emitida (al modificarla), la anterior
 *  vuelve al estado que tenia antes de pedir el cambio, y queda dicho en su historial. */
export async function descartarBorrador(versionId: string, yo: Yo): Promise<void> {
  const v = await versionDe(versionId);
  if (v.estado !== "borrador") throw new Error("Solo se descarta un borrador: esta hoja ya ha salido.");
  await pedir(`he_estados_hoja?version_id=eq.${v.id}`, { method: "DELETE" });
  await pedir(`he_versiones_hoja?id=eq.${v.id}`, { method: "DELETE" });
  if (!v.codigo_he || v.numero_version < 2) return;
  const [ant] = await pedir<{ id: string; estados: { estado: string; fecha: string }[] }[]>(
    `he_versiones_hoja?select=id,estados:he_estados_hoja(estado,fecha)&codigo_he=eq.${encodeURIComponent(v.codigo_he)}&numero_version=eq.${v.numero_version - 1}`,
  );
  if (!ant) return;
  const previo = [...ant.estados].sort((a, b) => b.fecha.localeCompare(a.fecha)).find((e) => !CAMBIOS_PEDIDOS.includes(e.estado));
  if (previo) await ponerEstado(ant.id, previo.estado, yo, `Se descartó el borrador de la versión ${v.numero_version}: sigue valiendo esta.`);
}

const CAMBIOS_PEDIDOS = ["cambios_comunidad", "cambios_comercial"];
// Lo que ya no se modifica: lo sustituido, lo anulado y lo que no se firmo (acaba en firma o en baja, 13-oct-2026).
const NO_SE_MODIFICA = ["borrador", "pendiente_ok_daniel", "cambios_daniel", "sustituida", "anulada", "no_firmada"];

/** MODIFICAR UNA HOJA YA EMITIDA (24-oct-2026): nace la version siguiente, con el mismo codigo HE y sus lineas copiadas,
 *  en borrador. En la anterior queda quien pidio el cambio y por que («no es lo mismo que la comunidad maree a que el
 *  comercial toque constantemente»). La anterior pasa a «sustituida» cuando la nueva tenga su ok, no antes. Si ya hay un
 *  borrador de la siguiente, se sigue ese. Devuelve el id de la version nueva. */
export async function modificarHoja(versionId: string, pide: "comunidad" | "comercial", nota: string, yo: Yo): Promise<string> {
  const v = await versionDe(versionId);
  if (!v.codigo_he) throw new Error("Esta hoja aún no se ha emitido: se cambia ella misma, sin versión nueva.");
  if (NO_SE_MODIFICA.includes(v.estado)) throw new Error("Esta versión ya no se puede modificar.");
  if (pide !== "comunidad" && pide !== "comercial") throw new Error("Di quién pide el cambio.");
  if (!nota.trim()) throw new Error("Di qué cambia y por qué.");
  const siguientes = await pedir<{ id: string; estado: string }[]>(
    `he_versiones_hoja?select=id,estado&codigo_he=eq.${encodeURIComponent(v.codigo_he)}&numero_version=gt.${v.numero_version}`,
  );
  const enBorrador = siguientes.find((x) => x.estado === "borrador");
  if (enBorrador) return enBorrador.id;
  if (siguientes.length) throw new Error("Esta no es la última versión de la hoja.");

  const [orig] = await pedir<{ pagador_tipo: string; pagador_comunidad_id: string | null; pagador_contrata_id: string | null; pagador_persona_id: string | null; opp: { comercial_id: string | null } | null }[]>(
    `he_versiones_hoja?select=pagador_tipo,pagador_comunidad_id,pagador_contrata_id,pagador_persona_id,opp:oportunidad_id(comercial_id)&id=eq.${v.id}`,
  );
  const lineas = await pedir<{
    id: string; padre_id: string | null; bloque_id: string; desglose_id: string | null; en_papel: boolean; se_cobra: boolean; importe: number | null; porcentaje: number | null;
    forma_pago_id: string | null; forma_pago_propia: string | null; texto: string | null; desglosar_precios: boolean | null; comision_importe: number | null; comision_acuerdo_id: string | null;
    accesos: { acceso_id: string }[];
  }[]>(
    "he_lineas_compromisos?select=id,padre_id,bloque_id,desglose_id,en_papel,se_cobra,importe,porcentaje,forma_pago_id,forma_pago_propia,texto,desglosar_precios," +
      `comision_importe,comision_acuerdo_id,accesos:he_lineas_compromisos_accesos(acceso_id)&version_id=eq.${v.id}`,
  );
  await ponerEstado(v.id, `cambios_${pide}`, yo, nota.trim());
  const [nueva] = await pedir<{ id: string }[]>("he_versiones_hoja", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      codigo_he: v.codigo_he, numero_version: v.numero_version + 1, oportunidad_id: v.oportunidad_id,
      pagador_tipo: orig.pagador_tipo, pagador_comunidad_id: orig.pagador_comunidad_id, pagador_contrata_id: orig.pagador_contrata_id, pagador_persona_id: orig.pagador_persona_id,
      // El comercial de HOY de la opp: la version nueva se emite ahora (al emitir queda congelado).
      comercial_id: orig.opp?.comercial_id ?? null, generada_por: yo.id, estado: "borrador",
    }),
  });
  try {
    await pedir("he_estados_hoja", { method: "POST", body: JSON.stringify({ version_id: nueva.id, estado: "borrador", persona_id: yo.id }) });
    const ids = new Map(lineas.map((l) => [l.id, crypto.randomUUID()]));
    if (lineas.length) {
      await pedir("he_lineas_compromisos", {
        method: "POST",
        body: JSON.stringify(lineas.map(({ accesos: _a, id, padre_id, ...resto }) => ({ ...resto, id: ids.get(id), padre_id: padre_id ? ids.get(padre_id) ?? null : null, version_id: nueva.id }))),
      });
      const accesos = lineas.flatMap((l) => l.accesos.map((a) => ({ linea_id: ids.get(l.id), acceso_id: a.acceso_id })));
      if (accesos.length) await pedir("he_lineas_compromisos_accesos", { method: "POST", body: JSON.stringify(accesos) });
    }
  } catch (e) {
    // A medias no vale: fuera la nueva y la anterior vuelve a como estaba.
    await pedir(`he_estados_hoja?version_id=eq.${nueva.id}`, { method: "DELETE" }).catch(() => {});
    await pedir(`he_versiones_hoja?id=eq.${nueva.id}`, { method: "DELETE" }).catch(() => {});
    await ponerEstado(v.id, v.estado, yo, "No se pudo crear la versión nueva: sigue valiendo esta.").catch(() => {});
    throw e;
  }
  return nueva.id;
}
