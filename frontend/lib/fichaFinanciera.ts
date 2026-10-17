// lib/fichaFinanciera.ts
//
// LA FICHA FINANCIERA DE UNA OPORTUNIDAD (Monica, 17-oct-2026). Recupera su
// «Ficha financiera por proyecto» de 2025 (G:/Mi unidad/MONICA ACCESALIA/FICHAS
// FINANCIERAS POR PROYECTO): la opp contada en una hoja, «muchisima info
// estructurada y facilmente escaneable, en version humano». Antes se rellenaba
// a mano en un PDF; aqui sale sola de los datos vivos.
//
// QUIEN VE QUE (Monica, 17-oct-2026):
//   - direccion (Monica, Daniel): todo;
//   - facturacion de Accesalia (Alexandra): todo menos lo de Ecobalance;
//   - facturacion de Ecobalance (Ana): solo lo de Ecobalance.
// Lo de Ecobalance: las lineas que emite Ecobalance (3 presupuestos, CAES), las
// comisiones (de la contrata y del administrador) y el beneficio neto.
//
// COBRADO = JUSTIFICANTE SUBIDO (tabla cobros), no el estado de Factusol; y un
// hito completado cuenta como cobrado (hasta 2023, la factura garantiza el cobro).
// Lo que aun no se guarda en ningun sitio (comision del administrador, costes
// para el beneficio) sale como hueco.

import "server-only";
import type { Yo } from "./sesion";
import { nombreDeOpp } from "./direccionOpp";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function leer<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` }, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

export type Vista = { accesalia: boolean; ecobalance: boolean; todo: boolean };
export function vistaDe(yo: Yo): Vista | null {
  const tiene = (c: string) => yo.funciones.some((f) => f.clave === c);
  const v = { accesalia: yo.veTodo || tiene("facturacion"), ecobalance: yo.veTodo || tiene("facturacion_ecobalance"), todo: yo.veTodo };
  return v.accesalia || v.ecobalance ? v : null;
}

const ECOBALANCE = "ecobalance";
const HITO_TEXTO: Record<string, string> = {
  firma: "A la firma", entrega: "A la entrega", visado: "Al visado", licencia: "Con la licencia", inicio_obra: "Al inicio de obra",
  fin_obra: "Al fin de obra", concesion: "Con la concesión", cobro_subvencion: "Al cobrar la subvención", adjudicacion: "A la adjudicación", otro: "Pago",
};

export type HitoFicha = {
  que: string; porcentaje: number | null; importe: number | null; fecha: string | null;
  estado: "cobrado" | "facturado" | "completado" | "pendiente" | "a éxito" | "anulado"; facturas: string[]; subhitos: HitoFicha[];
};
export type LineaFicha = {
  id: string; hoja: string | null; bloque: string; area: string | null; descripcion: string; ecobalance: boolean;
  base: number | null; exito: { porcentaje: number | null; sobre: string | null } | null; hitos: HitoFicha[];
};
export type Ficha = {
  opp: { id: string; nombre: string; codigo: string | null };
  firma: string | null;
  hojas: string[];
  categorias: string[];
  obras: string[];
  pagadores: string[];
  administrador: string | null;
  contrata: { nombre: string; pem: number | null } | null;
  lineas: LineaFicha[];
  financiacion: { entidad: string; estado: string; importe: number | null; firma: string | null; notas: string | null }[];
  facturado: { accesalia: number; ecobalance: number };
  cobrado: { accesalia: number; ecobalance: number };
  ivaPct: number;
  notas: { fecha: string; texto: string; autor: string | null; tipo: string | null }[];
};

type FilaFactura = { id: string; anio: number; serie: string; numero: number; base: number | null; total: number | null; estado: string; cobros: { importe: number | null }[] };

export async function fichaFinanciera(oppId: string, vista: Vista): Promise<Ficha | null> {
  if (!/^[0-9a-f-]{36}$/.test(oppId)) return null;
  const [opps, hojas, licit, finan, params] = await Promise.all([
    leer<{ id: string; nombre: string | null; codigo: string | null; adm: { persona: { nombre: string; apellidos: string | null } | null; empresa: { nombre_accesalia: string | null } | null } | null }[]>(
      `oportunidades?select=id,nombre,codigo,adm:administrador_puesto_id(persona:persona_id(nombre,apellidos),empresa:empresa_id(nombre_accesalia))&id=eq.${oppId}`,
    ),
    leer<{ id: string; numero_hoja: string | null; fecha_firma: string | null; pagador_tipo: string | null; contrata: { nombre: string } | null; actuaciones: { tipo: { nombre: string; padre: { nombre: string; padre: { nombre: string } | null } | null } | null }[] }[]>(
      `hojas_encargo?select=id,numero_hoja,fecha_firma,pagador_tipo,contrata:pagador_contrata_id(nombre),` +
        `actuaciones:actuaciones_hoja(tipo:tipo_proyecto_id(nombre,padre:parent_id(nombre,padre:parent_id(nombre))))` +
        `&oportunidad_id=eq.${oppId}&estado=eq.devuelta_firmada&order=fecha_firma.asc`,
    ),
    leer<{ presupuestos: { estado: string; importe_pem: number | null; contrata_externa_nombre: string | null; contrata: { nombre: string } | null }[] }[]>(
      `licitaciones?select=presupuestos:presupuestos_licitacion(estado,importe_pem,contrata_externa_nombre,contrata:contrata_id(nombre))&oportunidad_id=eq.${oppId}`,
    ),
    leer<{ entidad_nombre: string | null; entidad: { nombre_accesalia: string | null } | null; estado: string; importe: number | null; fecha_firma: string | null; notas: string | null }[]>(
      `financiacion_oportunidad?select=entidad_nombre,entidad:entidad_id(nombre_accesalia),estado,importe,fecha_firma,notas&oportunidad_id=eq.${oppId}`,
    ).catch(() => []),
    leer<{ clave: string; valor: number }[]>("parametros_economicos?select=clave,valor&clave=eq.iva_honorarios_pct"),
  ]);
  const o = opps[0];
  if (!o) return null;
  const idsHoja = hojas.map((h) => h.id);
  const numeroDe = new Map(hojas.map((h) => [h.id, h.numero_hoja]));

  const lineasCrudas = idsHoja.length
    ? await leer<{ id: string; hoja_encargo_id: string; descripcion: string | null; importe: number | null; es_porcentaje: boolean | null; porcentaje: number | null; base_porcentaje: string | null; emisor: string | null; bloque: { nombre_corto: string | null; nombre: string; area: string | null } | null }[]>(
        `lineas_facturacion?select=id,hoja_encargo_id,descripcion,importe,es_porcentaje,porcentaje,base_porcentaje,emisor,bloque:bloque_id(nombre_corto,nombre,area)` +
          `&hoja_encargo_id=in.(${idsHoja.join(",")})&quitada_en=is.null&order=creado_en.asc`,
      )
    : [];
  // Cada uno ve lo suyo: las lineas de Ecobalance solo quien ve Ecobalance; las otras, quien ve Accesalia.
  const lineasVistas = lineasCrudas.filter((l) => (l.emisor === ECOBALANCE ? vista.ecobalance : vista.accesalia));
  const idsLinea = lineasVistas.map((l) => l.id);
  const [hitos, notas] = await Promise.all([
    idsLinea.length
      ? leer<{ id: string; linea_facturacion_id: string; hito: string; orden: number | null; porcentaje: number | null; importe: number | null; estado: string; fecha_prevista: string | null; hito_padre_id: string | null; enlaces: { importe: number | null; linea: { factura: FilaFactura | null } | null }[] }[]>(
          `hitos_cobro?select=id,linea_facturacion_id,hito,orden,porcentaje,importe,estado,fecha_prevista,hito_padre_id,` +
            `enlaces:factura_linea_hitos(importe,linea:factura_linea_id(factura:factura_id(id,anio,serie,numero,base,total,estado,cobros(importe))))` +
            `&linea_facturacion_id=in.(${idsLinea.join(",")})&order=orden.asc`,
        )
      : Promise.resolve([]),
    idsHoja.length
      ? leer<{ fecha: string | null; creado_en: string; texto: string; autor: string | null; tipo: string | null; linea_facturacion_id: string | null }[]>(
          `notas_facturacion?select=fecha,creado_en,texto,autor,tipo,linea_facturacion_id&hoja_encargo_id=in.(${idsHoja.join(",")})&order=creado_en.desc&limit=40`,
        )
      : Promise.resolve([]),
  ]);

  // Lo facturado y lo cobrado de cada hito, por la parte de cada factura que le toca.
  const facturado = { accesalia: 0, ecobalance: 0 };
  const cobrado = { accesalia: 0, ecobalance: 0 };
  const emisorDe = new Map(lineasVistas.map((l) => [l.id, l.emisor === ECOBALANCE ? "ecobalance" : "accesalia"] as const));
  const hitoFicha = (h: (typeof hitos)[number]): HitoFicha => {
    const libro = emisorDe.get(h.linea_facturacion_id) ?? "accesalia";
    let fact = 0, cob = 0;
    const nums: string[] = [];
    for (const e of h.enlaces) {
      const f = e.linea?.factura;
      if (!f || f.estado === "anulada") continue;
      const parte = Number(e.importe ?? 0);
      fact += parte;
      const total = Number(f.total ?? 0);
      const cobradoF = f.cobros.reduce((s, c) => s + Number(c.importe ?? 0), 0);
      // La parte cobrada de este hito, en la proporcion en que esta cobrada la factura.
      if (total > 0) cob += parte * Math.min(1, cobradoF / total);
      nums.push(`${f.anio}/${f.serie}-${f.numero}`);
    }
    // COMPLETADO = COBRADO. Hasta 2023 no hay justificantes y «la factura garantiza
    // el cobro» (Monica, 17-oct-2026): esos hitos se dejaron completados con su
    // factura. Desde 2025, completado es justificante subido. Se fia de la base.
    if (h.estado === "completado" && fact > 0) cob = Math.max(cob, fact);
    facturado[libro] += fact;
    cobrado[libro] += cob;
    const imp = h.importe != null ? Number(h.importe) : null;
    const estado: HitoFicha["estado"] =
      h.estado === "anulado" ? "anulado" : imp == null ? "a éxito" : fact > 0 && cob >= fact - 1 ? "cobrado" : fact > 0 ? "facturado"
      // Marcado como completado sin factura enlazada (cargas antiguas): se dice tal cual.
      : h.estado === "completado" ? "completado" : "pendiente";
    return { que: HITO_TEXTO[h.hito] ?? h.hito, porcentaje: h.porcentaje != null ? Number(h.porcentaje) : null, importe: imp, fecha: h.fecha_prevista, estado, facturas: nums, subhitos: [] };
  };
  const porId = new Map(hitos.map((h) => [h.id, hitoFicha(h)]));
  for (const h of hitos) if (h.hito_padre_id && porId.has(h.hito_padre_id)) porId.get(h.hito_padre_id)!.subhitos.push(porId.get(h.id)!);

  const lineas: LineaFicha[] = lineasVistas.map((l) => ({
    id: l.id,
    hoja: numeroDe.get(l.hoja_encargo_id) ?? null,
    bloque: l.bloque?.nombre_corto ?? l.bloque?.nombre ?? "Sin bloque",
    area: l.bloque?.area ?? null,
    descripcion: l.descripcion ?? "",
    ecobalance: l.emisor === ECOBALANCE,
    base: l.importe != null ? Number(l.importe) : null,
    exito: l.es_porcentaje ? { porcentaje: l.porcentaje != null ? Number(l.porcentaje) : null, sobre: l.base_porcentaje } : null,
    hitos: hitos.filter((h) => h.linea_facturacion_id === l.id && !h.hito_padre_id).map((h) => porId.get(h.id)!),
  }));

  // Las obras y su categoria (la raiz del catalogo de tipos).
  const obras = new Set<string>(), categorias = new Set<string>();
  for (const h of hojas)
    for (const a of h.actuaciones) {
      if (!a.tipo) continue;
      obras.add(a.tipo.nombre);
      categorias.add(a.tipo.padre?.padre?.nombre ?? a.tipo.padre?.nombre ?? a.tipo.nombre);
    }
  const pagadores = [...new Set(hojas.map((h) => (h.pagador_tipo === "contrata" ? `Contrata${h.contrata ? ` (${h.contrata.nombre})` : ""}` : h.pagador_tipo === "persona" ? "Una persona" : "La comunidad")))];
  const adj = licit.flatMap((x) => x.presupuestos).find((p) => p.estado === "adjudicada");
  const adm = o.adm;
  const lineaDe = new Map(lineasVistas.map((l) => [l.id, l]));

  return {
    opp: { id: o.id, nombre: nombreDeOpp(o), codigo: o.codigo },
    firma: hojas.find((h) => h.fecha_firma)?.fecha_firma ?? null,
    hojas: hojas.map((h) => h.numero_hoja).filter((n): n is string => !!n),
    categorias: [...categorias],
    obras: [...obras],
    pagadores,
    administrador: adm ? [adm.empresa?.nombre_accesalia, adm.persona ? [adm.persona.nombre, adm.persona.apellidos].filter(Boolean).join(" ") : null].filter(Boolean).join(" · ") || null : null,
    contrata: adj ? { nombre: adj.contrata?.nombre ?? adj.contrata_externa_nombre ?? "—", pem: adj.importe_pem != null ? Number(adj.importe_pem) : null } : null,
    lineas,
    financiacion: vista.accesalia
      ? finan.map((f) => ({ entidad: f.entidad?.nombre_accesalia ?? f.entidad_nombre ?? "—", estado: f.estado, importe: f.importe != null ? Number(f.importe) : null, firma: f.fecha_firma, notas: f.notas }))
      : [],
    facturado,
    cobrado,
    ivaPct: Number(params[0]?.valor ?? 21),
    // Las notas de una linea que no se ve, tampoco.
    notas: notas
      .filter((n) => !n.linea_facturacion_id || lineaDe.has(n.linea_facturacion_id))
      .map((n) => ({ fecha: (n.fecha ?? n.creado_en).slice(0, 10), texto: n.texto, autor: n.autor, tipo: n.tipo })),
  };
}
