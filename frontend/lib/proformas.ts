import "server-only";
// lib/proformas.ts
//
// LAS PROFORMAS (Monica, 12-oct-2026). "La factura se EMITE desde el hito o
// subhito. Se emite una proforma en la app, para que luego la proforma se
// traslade a Factusol y se emita. Y en Factusol, al generar una factura,
// vincularla a la proforma emitida en la app."
//
//   - Se elige uno o varios hitos/subhitos de una oportunidad (de UNA empresa y
//     UN pagador): la proforma lleva tantas lineas como haga falta y cada linea
//     tantos hitos como se quiera.
//   - Codigo ACC-PF-26-03-0001 / AUT-… (Daniel) / ECO-…: lo pone la base
//     (proformas_numerar), correlativo por empresa y mes.
//   - La emiten Alexandra (Accesalia y Daniel) y Ana (Ecobalance): cada una su libro.
//   - Siempre se manda por correo: desde facturacion.accesalia@gmail.com o
//     facturacion.ecobalance@gmail.com, y queda en el diario de la oportunidad.
//   - En Factusol, el codigo va DELANTE en la Referencia de la factura. Al
//     volcar las facturas (scripts/facturacion/enlazar_proformas.py) se enlaza
//     sola: factura -> proforma -> sus hitos.
//
// Los porcentajes (IVA, IRPF) salen de la base, nunca del codigo.

import type { Yo } from "./sesion";
import { direccionesDeOpps, enFrase } from "./direccionOpp";
import { puedeVerLibro, TEXTO_HITO, type Libro } from "./cobros";
import { enviarCorreo, buzonListo, direccionDe, type Area } from "./correo";
import { crearEntrada } from "./entradaDiario";
import { paraEnviar, type Destinatario } from "./envioCorreo";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };
const APP = process.env.URL_PUBLICA ?? "https://accesalia-crm.vercel.app";

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...init, headers: { ...CAB, ...(init.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return (r.status === 204 || r.headers.get("content-length") === "0" ? null : await r.json()) as T;
}
const UUID = /^[0-9a-f-]{36}$/;
const CORREO_VALIDO = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const r2 = (n: number) => Math.round(n * 100) / 100;
const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const fechaEs = (f: string | null) => (f ? f.slice(0, 10).split("-").reverse().join("/") : "");

export type Empresa = "accesalia" | "daniel" | "ecobalance";
/** El emisor de la linea facturable -> la empresa que factura. */
const EMPRESA_DE_EMISOR: Record<string, Empresa> = { accesalia: "accesalia", daniel_autonomo: "daniel", ecobalance: "ecobalance" };
export const libroDeEmpresa = (e: Empresa): Libro => (e === "ecobalance" ? "ecobalance" : "accesalia");
/** De que buzon sale cada empresa. */
const BUZON: Record<Empresa, Area> = { accesalia: "facturacion", daniel: "facturacion", ecobalance: "facturacion_ecobalance" };

export type Emisora = { clave: Empresa; nombre: string; nombre_legal: string; nif: string; domicilio: string; telefono: string | null; iban: string | null; irpf_porcentaje: number };
export type Pagador = { nombre: string; nif: string | null; domicilio: string | null; email: string | null };

async function emisora(e: Empresa): Promise<Emisora> {
  const [x] = await pedir<Emisora[]>(`empresas_emisoras?select=*&clave=eq.${e}`);
  if (!x) throw new Error(`Falta la empresa ${e} en empresas_emisoras.`);
  return { ...x, irpf_porcentaje: Number(x.irpf_porcentaje) || 0 };
}
async function parametro(clave: string): Promise<number> {
  const [p] = await pedir<{ valor: number }[]>(`parametros_economicos?select=valor&clave=eq.${clave}`);
  if (!p) throw new Error(`Falta el parámetro ${clave}.`);
  return Number(p.valor);
}

// ---------------------------------------------------- lo que se puede proformar

export type HitoProformable = {
  id: string;
  oppId: string | null;
  empresa: Empresa;
  documento: string | null;
  documentoFirmado: string | null;
  lineaId: string;
  linea: string;
  lineaImporte: number | null;
  tipo: string;
  esSubhito: boolean;
  porcentaje: number | null;
  importe: number | null;
  facturado: number;
  enProforma: number;
  /** Lo que queda por proformar; null = a exito (el importe se pone a mano). */
  disponible: number | null;
  pagador: { tipo: string; id: string } | null;
};

type FilaHito = {
  id: string; hito: string; porcentaje: number | null; importe: number | null; hito_padre_id: string | null; estado: string;
  padre: { hito: string; porcentaje: number | null } | null;
  linea: { id: string; descripcion: string | null; importe: number | null; emisor: string | null; pagador_tipo: string | null; pagador_id: string | null;
    bloque: { nombre: string } | null;
    hoja: { numero_hoja: string | null; fecha_firma: string | null; oportunidad_id: string | null; pagador_tipo: string | null; pagador_contrata_id: string | null; comunidad_id: string | null } | null } | null;
};

export async function hitosProformables(ids: string[]): Promise<HitoProformable[]> {
  const buenos = ids.filter((x) => UUID.test(x));
  if (!buenos.length) return [];
  const lista = buenos.join(",");
  const [filas, hijos, facturas, enProf] = await Promise.all([
    pedir<FilaHito[]>(
      `hitos_cobro?select=id,hito,porcentaje,importe,hito_padre_id,estado,padre:hito_padre_id(hito,porcentaje),` +
        `linea:linea_facturacion_id(id,descripcion,importe,emisor,pagador_tipo,pagador_id,bloque:bloque_id(nombre),` +
        `hoja:hoja_encargo_id(numero_hoja,fecha_firma,oportunidad_id,pagador_tipo,pagador_contrata_id,comunidad_id))&id=in.(${lista})`,
    ),
    pedir<{ hito_padre_id: string }[]>(`hitos_cobro?select=hito_padre_id&hito_padre_id=in.(${lista})`),
    pedir<{ hito_cobro_id: string; importe: number | null; linea: { factura: { estado: string } | null } | null }[]>(
      `factura_linea_hitos?select=hito_cobro_id,importe,linea:factura_linea_id(factura:factura_id(estado))&hito_cobro_id=in.(${lista})`,
    ),
    pedir<{ hito_cobro_id: string; importe: number; linea: { proforma: { estado: string; factura_id: string | null } | null } | null }[]>(
      `proforma_linea_hitos?select=hito_cobro_id,importe,linea:proforma_linea_id(proforma:proforma_id(estado,factura_id))&hito_cobro_id=in.(${lista})`,
    ),
  ]);
  const conHijos = new Set(hijos.map((h) => h.hito_padre_id));
  const suma = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);
  const fact = new Map<string, number>();
  for (const f of facturas) if (f.linea?.factura?.estado !== "anulada") suma(fact, f.hito_cobro_id, Number(f.importe) || 0);
  // En proforma = proformas vivas que aun no tienen factura (cuando la tienen, ya cuenta como facturado).
  const prof = new Map<string, number>();
  for (const p of enProf) if (p.linea?.proforma?.estado === "emitida" && !p.linea.proforma.factura_id) suma(prof, p.hito_cobro_id, Number(p.importe) || 0);

  return filas
    .filter((h) => !conHijos.has(h.id) && h.estado !== "anulado" && h.linea)
    .map((h) => {
      const l = h.linea!;
      const imp = h.importe == null ? null : Number(h.importe);
      const facturado = fact.get(h.id) ?? 0;
      const enProforma = prof.get(h.id) ?? 0;
      const pag = l.pagador_tipo && l.pagador_id ? { tipo: l.pagador_tipo, id: l.pagador_id }
        : l.hoja?.pagador_tipo === "contrata" && l.hoja.pagador_contrata_id ? { tipo: "contrata", id: l.hoja.pagador_contrata_id }
        : l.hoja?.comunidad_id ? { tipo: "comunidad", id: l.hoja.comunidad_id } : null;
      return {
        id: h.id,
        oppId: l.hoja?.oportunidad_id ?? null,
        empresa: EMPRESA_DE_EMISOR[l.emisor ?? "accesalia"] ?? "accesalia",
        documento: l.hoja?.numero_hoja ?? null,
        documentoFirmado: l.hoja?.fecha_firma ?? null,
        lineaId: l.id,
        linea: ((l.descripcion ?? "").trim() || l.bloque?.nombre || "Línea").split("\n")[0],
        lineaImporte: l.importe == null ? null : Number(l.importe),
        tipo: h.hito_padre_id ? (h.padre?.hito ?? h.hito) : h.hito,
        esSubhito: !!h.hito_padre_id,
        porcentaje: h.hito_padre_id ? (h.padre?.porcentaje ?? null) : h.porcentaje == null ? null : Number(h.porcentaje),
        importe: imp,
        facturado,
        enProforma,
        disponible: imp == null ? null : r2(Math.max(0, imp - facturado - enProforma)),
        pagador: pag,
      };
    });
}

/** Quien paga: sus datos para la proforma y su correo (si es una contrata). */
export async function pagadorDe(p: { tipo: string; id: string } | null): Promise<Pagador | null> {
  if (!p || !UUID.test(p.id)) return null;
  if (p.tipo === "comunidad") {
    const [c] = await pedir<{ nombre: string; razon_social: string | null; cif_comunidad: string | null; direccion: string | null; domicilio_fiscal: string | null; cp: string | null; municipio: string | null }[]>(
      `comunidades?select=nombre,razon_social,cif_comunidad,direccion,domicilio_fiscal,cp,municipio&id=eq.${p.id}`,
    );
    if (!c) return null;
    return { nombre: c.razon_social || c.nombre, nif: c.cif_comunidad, domicilio: c.domicilio_fiscal || [c.direccion, [c.cp, c.municipio].filter(Boolean).join(" ")].filter(Boolean).join(". ") || null, email: null };
  }
  if (p.tipo === "contrata") {
    const [c] = await pedir<{ nombre: string; razon_social: string | null; cif: string | null; direccion: string | null; domicilio_fiscal: string | null; email: string | null }[]>(
      `contratas?select=nombre,razon_social,cif,direccion,domicilio_fiscal,email&id=eq.${p.id}`,
    );
    return c ? { nombre: c.razon_social || c.nombre, nif: c.cif, domicilio: c.domicilio_fiscal || c.direccion, email: c.email } : null;
  }
  if (p.tipo === "empresa_propietaria") {
    const [c] = await pedir<{ nombre_legal: string | null; nombre_accesalia: string; cif: string | null; direccion: string | null }[]>(
      `empresas_propietarias?select=nombre_legal,nombre_accesalia,cif,direccion&id=eq.${p.id}`,
    );
    return c ? { nombre: c.nombre_legal || c.nombre_accesalia, nif: c.cif, domicilio: c.direccion, email: null } : null;
  }
  if (p.tipo === "persona") {
    const [c] = await pedir<{ nombre: string; apellidos: string | null }[]>(`persona?select=nombre,apellidos&id=eq.${p.id}`);
    return c ? { nombre: [c.nombre, c.apellidos].filter(Boolean).join(" "), nif: null, domicilio: null, email: null } : null;
  }
  return null;
}

/** El texto de partida de una linea (se edita antes de emitir). */
export function conceptoDe(hs: HitoProformable[], donde: string): string {
  const h = hs[0];
  const doc = h.documento ? `Según hoja de encargo ${h.documento}${h.documentoFirmado ? ` firmada el ${fechaEs(h.documentoFirmado)}` : ""}, h` : "H";
  const plazos = hs
    .map((x) => `${(TEXTO_HITO[x.tipo] ?? x.tipo).toLowerCase()}${x.porcentaje != null ? ` (${EUR.format(x.porcentaje)} %)` : ""}${x.esSubhito ? ", parte" : ""}`)
    .join(" y ");
  const total = h.lineaImporte != null ? ` de ${EUR.format(h.lineaImporte)} € + IVA` : "";
  return `${doc}onorarios ${plazos}${total} por ${h.linea.charAt(0).toLowerCase()}${h.linea.slice(1)}${donde ? ` en ${donde}` : ""}.`;
}

export type Preparada = {
  oppId: string;
  donde: string;
  empresa: Empresa;
  emisora: Emisora;
  hitos: HitoProformable[];
  pagador: Pagador | null;
  ivaPct: number;
  irpfPct: number;
  /** Una linea por linea facturable, con sus hitos. */
  lineas: { concepto: string; hitos: string[] }[];
};

/** Lo que hace falta para el formulario de una proforma nueva. */
export async function prepararProforma(ids: string[]): Promise<Preparada> {
  const hitos = await hitosProformables(ids);
  if (!hitos.length) throw new Error("No hay ningún hito que se pueda proformar (si está fraccionado, se eligen sus subhitos).");
  const empresas = new Set(hitos.map((h) => h.empresa));
  if (empresas.size > 1) throw new Error("Una proforma es de una sola empresa: hay hitos de Accesalia, Daniel o Ecobalance mezclados.");
  const opps = new Set(hitos.map((h) => h.oppId));
  if (opps.size > 1 || !hitos[0].oppId) throw new Error("Los hitos tienen que ser de la misma oportunidad.");
  const pagadores = new Set(hitos.map((h) => (h.pagador ? `${h.pagador.tipo}:${h.pagador.id}` : "")));
  if (pagadores.size > 1) throw new Error("Una proforma va a un solo pagador: estos hitos los pagan distintos (comunidad, contrata…).");
  const empresa = hitos[0].empresa;
  const [em, pagador, iva, opp] = await Promise.all([
    emisora(empresa),
    pagadorDe(hitos[0].pagador),
    parametro("iva_honorarios_pct"),
    direccionesDeOpps([hitos[0].oppId]),
  ]);
  // La direccion de la opp, SIEMPRE con municipio (Monica, 13-oct-2026).
  const donde = opp.get(hitos[0].oppId ?? "") ?? "";
  const porLinea = new Map<string, HitoProformable[]>();
  for (const h of hitos) porLinea.set(h.lineaId, [...(porLinea.get(h.lineaId) ?? []), h]);
  return {
    oppId: hitos[0].oppId!,
    donde,
    empresa,
    emisora: em,
    hitos,
    pagador,
    ivaPct: iva,
    irpfPct: em.irpf_porcentaje,
    lineas: [...porLinea.values()].map((hs) => ({ concepto: conceptoDe(hs, enFrase(donde)), hitos: hs.map((h) => h.id) })),
  };
}

// --------------------------------------------------------------- emitir

export type NuevaProforma = {
  lineas: { concepto: string; hitos: { id: string; importe: number }[] }[];
  pagador: Pagador;
  ivaPct: number;
  irpfPct: number;
  notas: string;
};

export async function crearProforma(yo: Yo, n: NuevaProforma): Promise<string> {
  const ids = n.lineas.flatMap((l) => l.hitos.map((h) => h.id));
  if (new Set(ids).size !== ids.length) throw new Error("Un mismo hito está en dos líneas.");
  const p = await prepararProforma(ids);
  if (p.hitos.length !== ids.length) throw new Error("Algún hito ya no se puede proformar (anulado o fraccionado). Vuelve a elegirlos.");
  if (!puedeVerLibro(yo, libroDeEmpresa(p.empresa))) throw new Error("Esta proforma es del otro libro de facturación.");
  const porId = new Map(p.hitos.map((h) => [h.id, h]));
  for (const l of n.lineas) {
    if (!l.concepto.trim()) throw new Error("Hay una línea sin concepto.");
    if (!l.hitos.length) throw new Error("Hay una línea sin hitos.");
    for (const x of l.hitos) {
      const h = porId.get(x.id)!;
      if (!(x.importe > 0)) throw new Error(`Falta el importe de un hito de «${h.linea}».`);
      if (h.disponible != null && x.importe > h.disponible + 0.5)
        throw new Error(`«${h.linea}» · ${TEXTO_HITO[h.tipo] ?? h.tipo}: quedan ${EUR.format(h.disponible)} € por proformar y pones ${EUR.format(x.importe)} €.`);
    }
  }
  if (!n.pagador.nombre.trim()) throw new Error("Falta a quién va la proforma.");
  if (!(n.ivaPct >= 0) || !(n.irpfPct >= 0)) throw new Error("IVA o IRPF mal puestos.");

  const lineas = n.lineas.map((l, i) => ({ ...l, posicion: i + 1, base: r2(l.hitos.reduce((a, h) => a + h.importe, 0)) }));
  const base = r2(lineas.reduce((a, l) => a + l.base, 0));
  const iva = r2((base * n.ivaPct) / 100);
  const irpf = r2((base * n.irpfPct) / 100);
  const [pf] = await pedir<{ id: string }[]>("proformas", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      empresa: p.empresa,
      oportunidad_id: p.oppId,
      pagador_nombre: n.pagador.nombre.trim(),
      pagador_nif: n.pagador.nif?.trim() || null,
      pagador_domicilio: n.pagador.domicilio?.trim() || null,
      base, iva_porcentaje: n.ivaPct, iva, irpf_porcentaje: n.irpfPct, irpf, total: r2(base + iva - irpf),
      emitida_por: yo.id,
      notas: n.notas.trim() || null,
    }),
  });
  try {
    const filas = await pedir<{ id: string; posicion: number }[]>("proforma_lineas", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(lineas.map((l) => ({ proforma_id: pf.id, posicion: l.posicion, concepto: l.concepto.trim(), base: l.base }))),
    });
    const idDe = new Map(filas.map((f) => [f.posicion, f.id]));
    await pedir("proforma_linea_hitos", {
      method: "POST",
      body: JSON.stringify(lineas.flatMap((l) => l.hitos.map((h) => ({ proforma_linea_id: idDe.get(l.posicion), hito_cobro_id: h.id, importe: r2(h.importe) })))),
    });
  } catch (e) {
    // Sin transaccion en la API: si falla a medias, fuera la proforma (sus lineas se van con ella).
    await pedir(`proformas?id=eq.${pf.id}`, { method: "DELETE" }).catch(() => null);
    throw e;
  }
  return pf.id;
}

// --------------------------------------------------------------- leer

export type Proforma = {
  id: string;
  codigo: string;
  empresa: Empresa;
  fecha: string;
  oppId: string | null;
  opp: { codigo: string | null; nombre: string } | null;
  pagador: Pagador;
  base: number; ivaPct: number; iva: number; irpfPct: number; irpf: number; total: number;
  estado: "emitida" | "anulada";
  motivoAnulacion: string | null;
  factura: { id: string; numero: string; estado: string } | null;
  emitidaPor: string | null;
  notas: string | null;
  emisora: Emisora;
  lineas: { concepto: string; base: number; hitos: { id: string; tipo: string; importe: number; linea: string }[] }[];
  envios: { creado_en: string; para: string[]; ok: boolean; error: string | null }[];
};

type FilaProforma = {
  id: string; codigo: string; empresa: Empresa; fecha: string; oportunidad_id: string | null; pagador_nombre: string; pagador_nif: string | null; pagador_domicilio: string | null;
  base: number; iva_porcentaje: number; iva: number; irpf_porcentaje: number; irpf: number; total: number; estado: "emitida" | "anulada"; motivo_anulacion: string | null; notas: string | null;
  factura: { id: string; anio: number; serie: string; numero: number; estado: string } | null;
  emisor: { nombre: string; apellidos: string | null } | null;
  opp: { codigo: string | null; nombre: string | null; comunidad: { nombre: string } | null } | null;
  lineas: { posicion: number; concepto: string; base: number; hitos: { importe: number; hito: { id: string; hito: string; hito_padre_id: string | null; padre: { hito: string } | null; linea: { descripcion: string | null } | null } | null }[] }[];
};
const SEL =
  "id,codigo,empresa,fecha,oportunidad_id,pagador_nombre,pagador_nif,pagador_domicilio,base,iva_porcentaje,iva,irpf_porcentaje,irpf,total,estado,motivo_anulacion,notas," +
  "factura:factura_id(id,anio,serie,numero,estado),emisor:emitida_por(nombre,apellidos),opp:oportunidad_id(codigo,nombre,comunidad:comunidad_id(nombre))," +
  "lineas:proforma_lineas(posicion,concepto,base,hitos:proforma_linea_hitos(importe,hito:hito_cobro_id(id,hito,hito_padre_id,padre:hito_padre_id(hito),linea:linea_facturacion_id(descripcion))))";

export async function leerProforma(id: string): Promise<Proforma | null> {
  if (!UUID.test(id)) return null;
  const [f] = await pedir<FilaProforma[]>(`proformas?select=${SEL}&id=eq.${id}`);
  if (!f) return null;
  const [em, envios, dirs] = await Promise.all([
    emisora(f.empresa),
    pedir<{ creado_en: string; para: string[]; ok: boolean; error: string | null }[]>(
      `correos_enviados?select=creado_en,para,ok,error&documentos=cs.${encodeURIComponent(JSON.stringify([{ tipo: "Proforma", id }]))}&order=creado_en.desc`,
    ),
    direccionesDeOpps([f.oportunidad_id]),
  ]);
  return {
    id: f.id,
    codigo: f.codigo,
    empresa: f.empresa,
    fecha: f.fecha,
    oppId: f.oportunidad_id,
    opp: f.opp ? { codigo: f.opp.codigo, nombre: dirs.get(f.oportunidad_id ?? "") ?? f.opp.comunidad?.nombre ?? f.opp.nombre ?? "" } : null,
    pagador: { nombre: f.pagador_nombre, nif: f.pagador_nif, domicilio: f.pagador_domicilio, email: null },
    base: Number(f.base), ivaPct: Number(f.iva_porcentaje), iva: Number(f.iva), irpfPct: Number(f.irpf_porcentaje), irpf: Number(f.irpf), total: Number(f.total),
    estado: f.estado,
    motivoAnulacion: f.motivo_anulacion,
    factura: f.factura ? { id: f.factura.id, numero: `${f.factura.anio}/${f.factura.serie}-${f.factura.numero}`, estado: f.factura.estado } : null,
    emitidaPor: f.emisor ? [f.emisor.nombre, f.emisor.apellidos].filter(Boolean).join(" ") : null,
    notas: f.notas,
    emisora: em,
    lineas: [...f.lineas]
      .sort((a, b) => a.posicion - b.posicion)
      .map((l) => ({
        concepto: l.concepto,
        base: Number(l.base),
        hitos: l.hitos.map((h) => ({
          id: h.hito?.id ?? "",
          tipo: h.hito?.hito_padre_id ? `${TEXTO_HITO[h.hito.padre?.hito ?? ""] ?? "Plazo"} (parte)` : (TEXTO_HITO[h.hito?.hito ?? ""] ?? h.hito?.hito ?? ""),
          importe: Number(h.importe),
          linea: (h.hito?.linea?.descripcion ?? "").split("\n")[0],
        })),
      })),
    envios,
  };
}

/** La Referencia que va en Factusol: el codigo DELANTE, y luego la direccion. */
export function referenciaFactusol(p: Proforma): string {
  return `${p.codigo} · ${(p.opp?.nombre ?? "").replace(/^CP\s+/i, "")}`.trim();
}

export type FilaListaProforma = { id: string; codigo: string; empresa: Empresa; fecha: string; oppId: string | null; donde: string; pagador: string; total: number; estado: string; facturada: string | null };

/** Las proformas de un libro, de un mes (AAAA-MM) o de una oportunidad. */
export async function listaProformas(libro: Libro, f: { mes?: string; oppId?: string }): Promise<FilaListaProforma[]> {
  const empresas = libro === "ecobalance" ? ["ecobalance"] : ["accesalia", "daniel"];
  let filtro = `&empresa=in.(${empresas.join(",")})`;
  if (f.oppId && UUID.test(f.oppId)) filtro += `&oportunidad_id=eq.${f.oppId}`;
  if (f.mes && /^\d{4}-\d{2}$/.test(f.mes)) filtro += `&anio=eq.${Number(f.mes.slice(0, 4))}&mes=eq.${Number(f.mes.slice(5))}`;
  const filas = await pedir<{ id: string; codigo: string; empresa: Empresa; fecha: string; oportunidad_id: string | null; pagador_nombre: string; total: number; estado: string;
    factura: { anio: number; serie: string; numero: number } | null; opp: { nombre: string | null; comunidad: { nombre: string } | null } | null }[]>(
    `proformas?select=id,codigo,empresa,fecha,oportunidad_id,pagador_nombre,total,estado,factura:factura_id(anio,serie,numero),opp:oportunidad_id(nombre,comunidad:comunidad_id(nombre))${filtro}&order=fecha.desc,numero.desc`,
  );
  const dirs = await direccionesDeOpps(filas.map((x) => x.oportunidad_id));
  return filas.map((x) => ({
    id: x.id, codigo: x.codigo, empresa: x.empresa, fecha: x.fecha, oppId: x.oportunidad_id,
    donde: dirs.get(x.oportunidad_id ?? "") ?? x.opp?.comunidad?.nombre ?? x.opp?.nombre ?? "", pagador: x.pagador_nombre, total: Number(x.total), estado: x.estado,
    facturada: x.factura ? `${x.factura.anio}/${x.factura.serie}-${x.factura.numero}` : null,
  }));
}

/** Las proformas vivas de cada hito de una oportunidad (para la pantalla de cobro). */
export async function proformasPorHito(oppId: string): Promise<Record<string, { id: string; codigo: string; facturada: boolean }[]>> {
  if (!UUID.test(oppId)) return {};
  const filas = await pedir<{ id: string; codigo: string; factura_id: string | null; lineas: { hitos: { hito_cobro_id: string }[] }[] }[]>(
    `proformas?select=id,codigo,factura_id,lineas:proforma_lineas(hitos:proforma_linea_hitos(hito_cobro_id))&oportunidad_id=eq.${oppId}&estado=eq.emitida`,
  );
  const out: Record<string, { id: string; codigo: string; facturada: boolean }[]> = {};
  for (const p of filas)
    for (const l of p.lineas) for (const h of l.hitos) (out[h.hito_cobro_id] ??= []).push({ id: p.id, codigo: p.codigo, facturada: !!p.factura_id });
  return out;
}

// --------------------------------------------------------------- anular

export async function anularProforma(yo: Yo, id: string, motivo: string) {
  const p = await leerProforma(id);
  if (!p) throw new Error("Esa proforma no existe.");
  if (!puedeVerLibro(yo, libroDeEmpresa(p.empresa))) throw new Error("Esta proforma es del otro libro de facturación.");
  if (p.factura) throw new Error(`Ya tiene factura (${p.factura.numero}): se anula la factura en Factusol, no la proforma.`);
  if (!motivo.trim()) throw new Error("Di por qué se anula.");
  // No se borra: el numero queda gastado y se ve por que.
  await pedir(`proformas?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ estado: "anulada", motivo_anulacion: `${motivo.trim()} (${yo.nombre}, ${fechaEs(new Date().toISOString())})`, actualizado_en: new Date().toISOString() }),
  });
}

// --------------------------------------------------------------- enviar

export type ParaEnviarProforma = { buzon: string; buzonListo: boolean; destinatarios: Destinatario[]; asunto: string; cuerpo: string };

export async function paraEnviarProforma(p: Proforma): Promise<ParaEnviarProforma> {
  const area = BUZON[p.empresa];
  const destinatarios: Destinatario[] = p.oppId ? ((await paraEnviar(p.oppId))?.destinatarios ?? []) : [];
  // Si paga una contrata, su correo tambien (de la ficha de la contrata).
  const [fila] = await pedir<{ hitos: { hito: { linea: { pagador_tipo: string | null; pagador_id: string | null } | null } | null }[] }[]>(
    `proforma_lineas?select=hitos:proforma_linea_hitos(hito:hito_cobro_id(linea:linea_facturacion_id(pagador_tipo,pagador_id)))&proforma_id=eq.${p.id}&limit=1`,
  );
  const l = fila?.hitos[0]?.hito?.linea;
  if (l?.pagador_tipo === "contrata") {
    const pag = await pagadorDe({ tipo: "contrata", id: l.pagador_id ?? "" });
    const e = pag?.email?.trim().toLowerCase();
    if (e && CORREO_VALIDO.test(e) && !destinatarios.some((d) => d.email === e)) destinatarios.unshift({ email: e, quien: `Contrata · ${pag!.nombre}` });
  }
  const donde = (p.opp?.nombre ?? "").replace(/^CP\s+/i, "");
  return {
    buzon: direccionDe(area),
    buzonListo: buzonListo(area),
    destinatarios,
    asunto: `Proforma ${p.codigo}${donde ? ` · ${donde}` : ""}`,
    cuerpo:
      `Buenos días:\n\nOs adjuntamos la proforma ${p.codigo}${donde ? ` de ${donde}` : ""}, por un total de ${EUR.format(p.total)} € (IVA incluido).\n\n` +
      `En cuanto nos confirméis, emitimos la factura.\n\nUn saludo,\n${p.emisora.nombre} · Facturación`,
  };
}

export async function enviarProforma(yo: Yo, id: string, e: { para: string[]; asunto: string; cuerpo: string }, pdf: { nombre: string; contenido: Uint8Array }) {
  const p = await leerProforma(id);
  if (!p) throw new Error("Esa proforma no existe.");
  if (!puedeVerLibro(yo, libroDeEmpresa(p.empresa))) throw new Error("Esta proforma es del otro libro de facturación.");
  if (p.estado === "anulada") throw new Error("Está anulada: no se envía.");
  const para = [...new Set(e.para.map((x) => x.trim().toLowerCase()).filter(Boolean))];
  const malos = para.filter((x) => !CORREO_VALIDO.test(x));
  if (!para.length) throw new Error("Falta a quién enviarla.");
  if (malos.length) throw new Error(`Estas direcciones no son de correo: ${malos.join(", ")}.`);
  if (!e.asunto.trim() || !e.cuerpo.trim()) throw new Error("Faltan el asunto o el texto.");

  const area = BUZON[p.empresa];
  const remitente = `${p.emisora.nombre} · Facturación`;
  const r = await enviarCorreo({ desde: area, para: para.join(", "), asunto: e.asunto.trim(), texto: e.cuerpo.trim(), nombreRemitente: remitente, adjuntos: [pdf] });
  const enlace = `/facturacion/proforma/${p.id}`;
  let notaId: string | null = null;
  if (r.ok && p.oppId) {
    const nota = await crearEntrada({
      texto: `Proforma ${p.codigo} (${EUR.format(p.total)} €) enviada a ${para.join(", ")} desde ${direccionDe(area)}.\nAsunto: ${e.asunto.trim()}\n\n${e.cuerpo.trim()}\n\nProforma: ${APP}${enlace}`,
      canal: "mail",
      fecha: null,
      oportunidadId: p.oppId,
      persona: null,
      dondeTexto: null,
      autorId: yo.id,
      autorNombre: [yo.nombre, yo.apellidos].filter(Boolean).join(" "),
    }).catch(() => null);
    notaId = nota?.id ?? null;
  }
  await pedir("correos_enviados", {
    method: "POST",
    body: JSON.stringify({
      oportunidad_id: p.oppId,
      enviado_por: yo.id,
      en_nombre_de: null,
      remitente_nombre: remitente,
      responder_a: null,
      para,
      asunto: e.asunto.trim(),
      cuerpo: e.cuerpo.trim(),
      documentos: [{ tipo: "Proforma", id: p.id, nombre: p.codigo, enlace }],
      plantilla_id: null,
      ok: r.ok,
      error: r.ok ? null : (r.dice ?? "no se pudo enviar"),
      nota_id: notaId,
    }),
  });
  if (!r.ok) throw new Error(`No se ha enviado: ${r.dice}`);
}
