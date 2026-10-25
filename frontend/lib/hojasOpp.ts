import "server-only";
// lib/hojasOpp.ts
//
// LAS HOJAS DE ESTA OPP (Monica, 25-oct-2026): el UNICO lector de las hojas de encargo del sistema nuevo para el resto de
// la app. Lo que el resto pregunta de una hoja —en que fase esta, si esta parada, cuando se envio o se firmo, cuanto se
// firmo, donde esta su PDF— sale de aqui y solo de aqui (he_versiones_hoja + he_estados_hoja + he_lineas_compromisos),
// para que un cambio en la hoja se toque en un sitio y no en trece.
//   - Una HOJA es su codigo HE (o un borrador que aun no lo tiene); sus VERSIONES, las filas de he_versiones_hoja.
//     La actual es la ultima que no esta sustituida.
//   - La FASE es he_versiones_hoja.estado. La PAUSA va aparte (25-oct): trabajo parado = hay una «pausada» sin
//     «reanudada» detras; con «pausa_levantada» entre medias esta «para reanudar», pero sigue parada.
//   - El IMPORTE no se guarda: lo que se cobra con importe (el conjunto con «solo el total», la suma de sus proyectos).

import { cajonDeOpp, type DocCajon } from "./cajonDocumentos";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
const leer = async <T>(path: string): Promise<T> => {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
};

/** Como se dice cada fase, con su color (los mismos tonos que la lista de hojas de antes). */
const AMBAR = "border-[#f0d78c] bg-[#fdf6e3] text-[#8a5a00]";
const VERDE = "border-lima bg-lima-soft text-lima-dark";
const GRIS = "border-black/15 bg-hueso text-carbon/70";
const ROJO = "border-alerta/40 bg-[#fbeeee] text-alerta";
export const FASE_HE: Record<string, { texto: string; clase: string }> = {
  borrador: { texto: "Borrador", clase: "border-dashed border-carbon/30 bg-white text-carbon/60" },
  pendiente_ok_daniel: { texto: "Pendiente del ok de Daniel", clase: AMBAR },
  cambios_daniel: { texto: "Daniel pide cambios", clase: ROJO },
  ok_daniel: { texto: "Ok de Daniel · lista para enviar", clase: VERDE },
  enviada: { texto: "Enviada, sin firmar", clase: AMBAR },
  firmada_recibida: { texto: "Firmada recibida", clase: VERDE },
  firma_con_errores: { texto: "Firma con errores", clase: ROJO },
  ok_comercial: { texto: "Firmada · en facturación", clase: VERDE },
  hitos_validados: { texto: "Firmada · hitos validados", clase: VERDE },
  primer_cobro: { texto: "Firmada · a cobro", clase: VERDE },
  a_produccion: { texto: "Firmada · a producción", clase: VERDE },
  ok_administracion: { texto: "Firmada · en producción", clase: VERDE },
  cambios_comunidad: { texto: "La comunidad pide cambios", clase: AMBAR },
  cambios_comercial: { texto: "En cambios (comercial)", clase: AMBAR },
  no_firmada: { texto: "No firmada", clase: GRIS },
  anulada: { texto: "Anulada", clase: GRIS },
  sustituida: { texto: "Sustituida", clase: GRIS },
};
export const faseHe = (estado: string) => FASE_HE[estado] ?? { texto: estado.replace(/_/g, " "), clase: GRIS };

/** Las fases en las que la hoja ya esta firmada por la comunidad (de firmada_recibida en adelante, sin errores). */
export const FIRMADA = ["firmada_recibida", "ok_comercial", "hitos_validados", "primer_cobro", "a_produccion", "ok_administracion"];
/** Las fases que ya no se mueven. */
export const FINAL = ["no_firmada", "anulada", "sustituida"];

export type PausaHe = { desde: string; nota: string | null; quien: string | null; lado: string | null; tejado: string | null; condicion: string | null; paraReanudar: boolean };

export type VersionHe = {
  id: string;
  codigo: string | null;
  numero: number;
  estado: string;
  pausa: PausaHe | null;
  aQuien: string | null;
  pagadorTipo: string;
  pagadorComunidadId: string | null;
  comercial: string | null;
  generadaPor: string | null;
  creadaEn: string;
  fechaEmision: string | null;
  /** La primera vez que paso por cada estado (fecha y hora): «cuando se envio», «cuando se firmo»… */
  fechas: Partial<Record<string, string>>;
  /** El ultimo paso del historial, con su nota (los cambios que pide Daniel, el motivo de no firmada…). */
  ultimo: { estado: string; fecha: string; quien: string | null; nota: string | null } | null;
  importe: number;
  /** Lo que se cobra a exito: «3,5 % de lo concedido». */
  aExito: number[];
  /** Que se hace: los tipos (desglose) de sus lineas, sin repetir. */
  tipos: string[];
  tienePdf: boolean;
  /** La firmada que valido el comercial (documento del archivo de la opp). */
  firmadaDocumentoId: string | null;
  presupuesto: { id: string; codigo: string | null } | null;
};
export type HojaHe = { codigo: string | null; actual: VersionHe; anteriores: VersionHe[] };

type Fila = {
  id: string; codigo_he: string | null; numero_version: number; estado: string; creado_en: string; fecha_emision: string | null; pdf: string | null; firmada_documento_id: string | null;
  pagador_tipo: string; pagador_comunidad_id: string | null;
  contrata: { nombre: string } | null; persona: { nombre: string; apellidos: string | null } | null; comunidad: { nombre: string } | null;
  comercial: { nombre: string } | null; quien: { nombre: string } | null;
  estados: { estado: string; fecha: string; nota: string | null; lado: string | null; tejado: string | null; condicion: string | null; persona: { nombre: string } | null }[];
  lineas: { id: string; padre_id: string | null; se_cobra: boolean; importe: number | null; porcentaje: number | null; desglosar_precios: boolean | null;
    bloque: { codigo: string } | null; desglose: { nombre: string } | null }[];
  presupuestos: { id: string; codigo: string | null }[];
};

const SEL =
  "id,codigo_he,numero_version,estado,creado_en,fecha_emision,pdf,firmada_documento_id,pagador_tipo,pagador_comunidad_id," +
  "contrata:pagador_contrata_id(nombre),persona:pagador_persona_id(nombre,apellidos),comunidad:pagador_comunidad_id(nombre)," +
  "comercial:comercial_id(nombre),quien:generada_por(nombre)," +
  "estados:he_estados_hoja(estado,fecha,nota,lado,tejado,condicion,persona:persona_id(nombre))," +
  "lineas:he_lineas_compromisos(id,padre_id,se_cobra,importe,porcentaje,desglosar_precios,bloque:bloque_id(codigo),desglose:desglose_id(nombre))," +
  "presupuestos:presupuestos!presupuestos_he_version_id_fkey(id,codigo)";

function aVersion(f: Fila): VersionHe {
  const est = [...f.estados].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const fechas: Partial<Record<string, string>> = {};
  for (const e of est) if (!fechas[e.estado]) fechas[e.estado] = e.fecha;
  // La pausa activa: la ultima «pausada» sin «reanudada» detras.
  const pausas: (PausaHe | null)[] = [null];
  for (const e of est) {
    const ahora = pausas[pausas.length - 1];
    if (e.estado === "pausada") pausas.push({ desde: e.fecha, nota: e.nota, quien: e.persona?.nombre ?? null, lado: e.lado, tejado: e.tejado, condicion: e.condicion, paraReanudar: false });
    else if (e.estado === "pausa_levantada" && ahora) pausas.push({ ...ahora, paraReanudar: true });
    else if (e.estado === "reanudada") pausas.push(null);
  }
  const pausa = pausas[pausas.length - 1];
  const u = est.at(-1);
  // Lo que se cobra: lo de dentro de un conjunto con «solo el total» no suma por separado; el conjunto suma lo suyo.
  const porId = new Map(f.lineas.map((l) => [l.id, l]));
  const soloTotal = (l: Fila["lineas"][number]) => {
    const p = l.padre_id ? porId.get(l.padre_id) : null;
    return !!p && p.bloque?.codigo === "PROYECTO CONJUNTO" && p.desglosar_precios === false;
  };
  let importe = 0;
  const aExito: number[] = [];
  for (const l of f.lineas) {
    if (!l.se_cobra) continue;
    if (l.bloque?.codigo === "PROYECTO CONJUNTO" && l.desglosar_precios === false)
      importe += f.lineas.filter((h) => h.padre_id === l.id).reduce((t, h) => t + (Number(h.importe) || 0), 0);
    else if (soloTotal(l)) continue;
    else if (l.importe != null) importe += Number(l.importe);
    else if (l.porcentaje != null) aExito.push(Number(l.porcentaje));
  }
  return {
    id: f.id,
    codigo: f.codigo_he,
    numero: f.numero_version,
    estado: f.estado,
    pausa,
    aQuien: f.contrata?.nombre ?? (f.persona ? [f.persona.nombre, f.persona.apellidos].filter(Boolean).join(" ") : null) ?? f.comunidad?.nombre ?? null,
    pagadorTipo: f.pagador_tipo,
    pagadorComunidadId: f.pagador_comunidad_id,
    comercial: f.comercial?.nombre ?? null,
    generadaPor: f.quien?.nombre ?? null,
    creadaEn: f.creado_en,
    fechaEmision: f.fecha_emision,
    fechas,
    ultimo: u ? { estado: u.estado, fecha: u.fecha, quien: u.persona?.nombre ?? null, nota: u.nota } : null,
    importe,
    aExito,
    tipos: [...new Set(f.lineas.map((l) => l.desglose?.nombre).filter((x): x is string => !!x))],
    tienePdf: !!f.pdf,
    firmadaDocumentoId: f.firmada_documento_id,
    presupuesto: f.presupuestos[0] ?? null,
  };
}

/** Las hojas de una opp, la mas reciente arriba. Cada una con su version actual y las anteriores. */
export async function hojasDeOpp(oppId: string): Promise<HojaHe[]> {
  if (!/^[0-9a-f-]{36}$/.test(oppId)) return [];
  const filas = await leer<Fila[]>(`he_versiones_hoja?select=${SEL}&oportunidad_id=eq.${oppId}&order=creado_en.desc`);
  const grupos = new Map<string, VersionHe[]>();
  for (const f of filas) {
    const v = aVersion(f);
    const clave = v.codigo ?? `borrador:${v.id}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), v]);
  }
  return [...grupos.values()].map((vs) => {
    const orden = [...vs].sort((a, b) => b.numero - a.numero);
    const actual = orden.find((v) => v.estado !== "sustituida") ?? orden[0];
    return { codigo: actual.codigo, actual, anteriores: orden.filter((v) => v !== actual) };
  });
}

/** Las fases en las que una version puede recibir su firmada: enviada (o con el ok, si se mando sin marcarla), o
 *  devuelta por firma con errores. */
export const ESPERA_FIRMADA = ["ok_daniel", "enviada", "firma_con_errores"];

/** LAS HOJAS FIRMADAS POR VALIDAR (Monica, 25-oct-2026): los documentos del archivo de la opp con el tipo «Hoja de
 *  encargo» (lleguen por el portal o por el cajon) que aun no ha validado el comercial (ninguna version apunta a ellos).
 *  Y, aparte, todas las firmadas de la opp, para ver la de cada version. */
export async function firmadasDeOpp(oppId: string): Promise<{ porValidar: DocCajon[]; todas: Map<string, DocCajon> }> {
  if (!/^[0-9a-f-]{36}$/.test(oppId)) return { porValidar: [], todas: new Map() };
  const [docs, enlazadas] = await Promise.all([
    cajonDeOpp(oppId),
    leer<{ firmada_documento_id: string }[]>(`he_versiones_hoja?select=firmada_documento_id&oportunidad_id=eq.${oppId}&firmada_documento_id=not.is.null`),
  ]);
  const firmadas = docs.filter((d) => d.tipo === "Hoja de encargo firmada");
  const usadas = new Set(enlazadas.map((e) => e.firmada_documento_id));
  return { porValidar: firmadas.filter((d) => !usadas.has(d.id)), todas: new Map(firmadas.map((d) => [d.id, d])) };
}

/** Con que nombre se archiva la firmada que sube la comunidad por el portal: dice de que hoja es, para que el comercial
 *  sepa cual validar y la comunidad vea que ya la ha mandado. */
export const nombreFirmadaPortal = (codigo: string | null, numero: number) => `Hoja de encargo firmada ${codigo ?? "sin código"} v${numero} (subida por la comunidad)`;

export type FirmadaPorValidar = { docId: string; nombre: string; subido: string; opp: { id: string; nombre: string | null; codigo: string | null; comercial: string | null } };

/** Las hojas firmadas por validar de una cartera (o de todas, con comercialId vacio y todas = true): la lista de
 *  Pendientes. Misma regla que el aviso (mis_avisos.firmadas): tipo «Hoja de encargo», vigente, sin version que apunte. */
export async function firmadasPorValidar(comercialId: string | null, todas: boolean): Promise<FirmadaPorValidar[]> {
  if (!todas && !comercialId) return [];
  const [tipo] = await leer<{ id: string }[]>(`tipos_documento?select=id&nombre=eq.${encodeURIComponent("Hoja de encargo")}`);
  if (!tipo) return [];
  const docs = await leer<{ id: string; nombre: string | null; creado_en: string; opp: { id: string; nombre: string | null; codigo: string | null; comercial_id: string | null; comercial: { nombre: string } | null } | null }[]>(
    `documentos?select=id,nombre,creado_en,opp:oportunidad_id!inner(id,nombre,codigo,comercial_id,comercial:comercial_id(nombre))` +
      `&tipo_documento_id=eq.${tipo.id}&vigente=is.true${todas ? "" : `&opp.comercial_id=eq.${comercialId}`}&order=creado_en.asc&limit=500`,
  );
  if (!docs.length) return [];
  const usadas = new Set(
    (await leer<{ firmada_documento_id: string }[]>(`he_versiones_hoja?select=firmada_documento_id&firmada_documento_id=in.(${docs.map((d) => d.id).join(",")})`)).map((x) => x.firmada_documento_id),
  );
  return docs
    .filter((d) => d.opp && !usadas.has(d.id))
    .map((d) => ({ docId: d.id, nombre: d.nombre ?? "documento", subido: d.creado_en, opp: { id: d.opp!.id, nombre: d.opp!.nombre, codigo: d.opp!.codigo, comercial: d.opp!.comercial?.nombre ?? null } }));
}

// ------------------------------------------------- para la escalera de muchas opps (25-oct-2026)

/** LO QUE LA ESCALERA PREGUNTA A UNA HOJA (lib/cabeceraOpp.ts): su fase y la PRIMERA vez que paso por cada momento
 *  (generada = pidio el ok de Daniel, el ok, enviada, firmada), y los cambios pedidos que siguen abiertos. Una por
 *  version; fuera las anuladas y las no firmadas (la hoja acaba en firma o en baja). */
export type HojaCruda = {
  id: string;
  oppId: string;
  fase: string;
  generada: string | null;
  okDaniel: string | null;
  enviada: string | null;
  firmada: string | null;
  /** Daniel pidio cambios y la version sigue asi: cuando, quien y que. */
  cambiosDaniel: { fecha: string; quien: string | null; nota: string | null } | null;
  /** La comunidad o el comercial pidieron cambios (nace la version siguiente) y esta sigue asi: cuando. */
  cambiosPedidos: string | null;
};

/** Las hojas crudas de muchas opps, por opp, de tramos de 150. */
export async function hojasCrudasDe(oppIds: string[]): Promise<Map<string, HojaCruda[]>> {
  const out = new Map<string, HojaCruda[]>();
  const ids = [...new Set(oppIds.filter((x) => /^[0-9a-f-]{36}$/.test(x)))];
  for (let i = 0; i < ids.length; i += 150) {
    const filas = await leer<{ id: string; oportunidad_id: string; estado: string; estados: { estado: string; fecha: string; nota: string | null; persona: { nombre: string } | null }[] }[]>(
      `he_versiones_hoja?select=id,oportunidad_id,estado,estados:he_estados_hoja(estado,fecha,nota,persona:persona_id(nombre))` +
        `&oportunidad_id=in.(${ids.slice(i, i + 150).join(",")})&estado=not.in.(anulada,no_firmada)`,
    );
    for (const f of filas) {
      const est = [...f.estados].sort((a, b) => a.fecha.localeCompare(b.fecha));
      const primera = (e: string) => est.find((x) => x.estado === e)?.fecha ?? null;
      const ultima = (e: string) => [...est].reverse().find((x) => x.estado === e) ?? null;
      const cd = f.estado === "cambios_daniel" ? ultima("cambios_daniel") : null;
      const cp = f.estado === "cambios_comunidad" || f.estado === "cambios_comercial" ? ultima(f.estado) : null;
      const h: HojaCruda = {
        id: f.id, oppId: f.oportunidad_id, fase: f.estado,
        generada: primera("pendiente_ok_daniel"), okDaniel: primera("ok_daniel"), enviada: primera("enviada"), firmada: primera("firmada_recibida"),
        cambiosDaniel: cd ? { fecha: cd.fecha, quien: cd.persona?.nombre ?? null, nota: cd.nota } : null,
        cambiosPedidos: cp?.fecha ?? null,
      };
      out.set(f.oportunidad_id, [...(out.get(f.oportunidad_id) ?? []), h]);
    }
  }
  return out;
}

/** ¿Esta firmada por la comunidad? (de firmada_recibida en adelante, sin errores). */
export const estaFirmada = (h: HojaCruda) => FIRMADA.includes(h.fase);

/** LOS COBROS de las hojas firmadas (versiones): por la ficha de facturacion de cada linea (lineas_facturacion.he_linea_id).
 *  Los % a exito no cuentan para dar el dinero por cobrado. */
export async function cobrosDeVersiones(versionIds: string[]): Promise<{ hay: boolean; alguno: boolean; todos: boolean }> {
  if (!versionIds.length) return { hay: false, alguno: false, todos: false };
  const lineas = await leer<{ es_porcentaje: boolean | null; hitos: { estado: string }[] }[]>(
    `lineas_facturacion?select=es_porcentaje,hitos:hitos_cobro(estado),linea:he_linea_id!inner(version_id)` +
      `&linea.version_id=in.(${versionIds.join(",")})&quitada_en=is.null`,
  );
  const hitos = lineas.filter((l) => !l.es_porcentaje).flatMap((l) => l.hitos).filter((h) => h.estado !== "anulado");
  const cobrados = hitos.filter((h) => h.estado === "completado").length;
  return { hay: hitos.length > 0, alguno: cobrados > 0, todos: hitos.length > 0 && cobrados === hitos.length };
}

/** Los hitos (sin los % a exito) de muchas versiones firmadas, por version: para los cobros de muchas opps de golpe. */
export async function hitosDeVersiones(versionIds: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  for (let i = 0; i < versionIds.length; i += 150) {
    const lineas = await leer<{ es_porcentaje: boolean | null; hitos: { estado: string }[]; linea: { version_id: string } | null }[]>(
      `lineas_facturacion?select=es_porcentaje,hitos:hitos_cobro(estado),linea:he_linea_id!inner(version_id)` +
        `&linea.version_id=in.(${versionIds.slice(i, i + 150).join(",")})&quitada_en=is.null`,
    );
    for (const l of lineas) {
      if (l.es_porcentaje || !l.linea) continue;
      out.set(l.linea.version_id, [...(out.get(l.linea.version_id) ?? []), ...l.hitos.map((h) => h.estado).filter((e) => e !== "anulado")]);
    }
  }
  return out;
}

/** ¿UNA VIABILIDAD CON HONORARIOS ESTA SUPERADA? (25-oct-2026): si alguna hoja de la opp se genero (pidio el ok de Daniel)
 *  despues de rematarse la viabilidad, sus honorarios ya no son los de la hoja: «Modificada en hoja de encargo X». Se
 *  calcula, no se guarda. Devuelve la primera que la supero («HE-2026-0012 v2»), o null. */
export async function superadaPor(oppId: string, rematadaEn: string | null, conHonorarios: boolean): Promise<string | null> {
  if (!conHonorarios || !rematadaEn || !/^[0-9a-f-]{36}$/.test(oppId)) return null;
  const filas = await leer<{ codigo_he: string | null; numero_version: number; estados: { estado: string; fecha: string }[] }[]>(
    `he_versiones_hoja?select=codigo_he,numero_version,estados:he_estados_hoja(estado,fecha)&oportunidad_id=eq.${oppId}&estado=neq.anulada`,
  );
  const despues = filas
    .map((f) => ({ f, generada: f.estados.filter((e) => e.estado === "pendiente_ok_daniel").map((e) => e.fecha).sort()[0] ?? null }))
    .filter((x) => x.generada && x.generada > rematadaEn)
    .sort((a, b) => a.generada!.localeCompare(b.generada!))[0];
  return despues ? (despues.f.codigo_he ? `${despues.f.codigo_he} v${despues.f.numero_version}` : "una hoja posterior") : null;
}

export type LineaHojaHonorario = { versionId: string; codigo: string | null; numero: number; fecha: string | null; borrador: boolean;
  lineas: { bloque: string; nombre: string; texto: string | null; importe: number }[] };

/** LOS HONORARIOS DE LAS HOJAS DE UNA OPP (para la viabilidad, «para que CUADRE siempre»): de cada hoja, su version
 *  actual, y de ella lo que se cobra con importe. El conjunto con «solo el total», UNA linea con la suma; lo de dentro
 *  no se repite. */
export async function honorariosDeHojas(oppId: string): Promise<LineaHojaHonorario[]> {
  const hojas = await hojasDeOpp(oppId);
  const vivas = hojas.map((h) => h.actual).filter((v) => !FINAL.includes(v.estado));
  if (!vivas.length) return [];
  const lineas = await leer<{ id: string; version_id: string; padre_id: string | null; se_cobra: boolean; importe: number | null; texto: string | null; desglosar_precios: boolean | null;
    bloque: { codigo: string; nombre_corto: string | null; nombre: string } | null }[]>(
    `he_lineas_compromisos?select=id,version_id,padre_id,se_cobra,importe,texto,desglosar_precios,bloque:bloque_id(codigo,nombre_corto,nombre)` +
      `&version_id=in.(${vivas.map((v) => v.id).join(",")})&order=creado_en.asc`,
  );
  const porId = new Map(lineas.map((l) => [l.id, l]));
  const soloTotal = (l: (typeof lineas)[number]) => l.bloque?.codigo === "PROYECTO CONJUNTO" && l.desglosar_precios === false;
  return vivas.map((v) => ({
    versionId: v.id, codigo: v.codigo, numero: v.numero, fecha: v.fechas.pendiente_ok_daniel ?? v.creadaEn, borrador: v.estado === "borrador" || v.estado === "cambios_daniel",
    lineas: lineas
      .filter((l) => l.version_id === v.id && l.se_cobra && !(l.padre_id && soloTotal(porId.get(l.padre_id)!)))
      .map((l) => ({
        bloque: l.bloque?.codigo ?? "", nombre: l.bloque?.nombre_corto ?? l.bloque?.nombre ?? "Concepto", texto: l.texto,
        importe: soloTotal(l) ? lineas.filter((h) => h.padre_id === l.id).reduce((t, h) => t + (Number(h.importe) || 0), 0) : Number(l.importe) || 0,
      }))
      .filter((l) => l.importe > 0),
  }));
}
