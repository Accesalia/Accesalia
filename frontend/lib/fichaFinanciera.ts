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
// COBRADO, factura por factura: hasta 2023 inclusive la factura garantiza el
// cobro; desde 2024, justificante subido (tabla cobros), no el estado de Factusol.
// «Completado» en un hito quiere decir FACTURADO, no cobrado.
// Lo que aun no se guarda en ningun sitio (comision del administrador, costes
// para el beneficio) sale como hueco.

import "server-only";
import type { Yo } from "./sesion";
import { nombreDeOpp } from "./direccionOpp";
import { listaAcuerdos, oppsDelAcuerdo, type Condicion, type Deuda, type Sobre } from "./comisionesAdmin";

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
  encargo: "Al encargo", firma: "A la firma", entrega: "A la entrega", visado: "Al visado", licencia: "Con la licencia", inicio_obra: "Al inicio de obra",
  fin_obra: "Al fin de obra", cfo: "Al fin de obra", concesion: "Con la concesión", cobro_subvencion: "Al cobrar la subvención", adjudicacion: "A la adjudicación", otro: "Pago",
};

export type HitoFicha = {
  que: string; porcentaje: number | null; importe: number | null; fecha: string | null;
  estado: "cobrado" | "facturado" | "completado" | "pendiente" | "a éxito" | "anulado"; facturas: string[]; subhitos: HitoFicha[];
  /** Cada factura que paga este hito: numero, fecha y si esta cobrada. */
  detalle: { numero: string; fecha: string | null; cobrada: boolean }[];
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
  /** Cada hoja firmada: quien la paga y lo incluido sin cobrar aparte (conceptos de la version firmada sin linea de cobro). */
  hojasInfo: { numero: string | null; firma: string | null; paga: string; incluido: string[] }[];
  /** Las obras de verdad (naturaleza proyecto / documento tecnico): los servicios no son «tipo de proyecto». */
  obrasProyecto: string[];
  categoriasProyecto: string[];
  /** Las comisiones del administrador en esta opp, con su acuerdo (solo quien ve Ecobalance). */
  comisionAdmin: { persona: string | null; verificado: boolean; condiciones: Partial<Record<Sobre, Condicion>>; deudas: Deuda[]; nota: string | null } | null;
  /** El comercial de la casa y lo que tiene pactado (solo direccion). */
  comercial: { nombre: string; pacto: string | null; pct: number | null } | null;
  financiacion: { entidad: string; estado: string; importe: number | null; firma: string | null; notas: string | null }[];
  facturado: { accesalia: number; ecobalance: number };
  /** Facturas de la opp que no pagan ningun hito («sueltas»: 2020-21 sin casar por decision de Monica, y las que quedan por casar). */
  sueltas: { numero: string; fecha: string | null; base: number; cobrada: boolean; ecobalance: boolean }[];
  cobrado: { accesalia: number; ecobalance: number };
  ivaPct: number;
  notas: { fecha: string; texto: string; autor: string | null; tipo: string | null }[];
};

type FilaFactura = { id: string; anio: number; serie: string; numero: number; fecha?: string | null; base: number | null; total: number | null; estado: string; cobros: { importe: number | null }[] };

export async function fichaFinanciera(oppId: string, vista: Vista): Promise<Ficha | null> {
  if (!/^[0-9a-f-]{36}$/.test(oppId)) return null;
  const [opps, hojas, licit, finan, params] = await Promise.all([
    leer<{
      id: string; nombre: string | null; codigo: string | null; comunidad_id: string | null; quien_lo_trae: string | null;
      adm: { persona: { nombre: string; apellidos: string | null } | null; empresa: { nombre_accesalia: string | null } | null } | null;
      comercial: { nombre: string | null; apellidos: string | null; notas_comision: string | null; comision_pct: number | null } | null;
    }[]>(
      `oportunidades?select=id,nombre,codigo,comunidad_id,quien_lo_trae,adm:administrador_puesto_id(persona:persona_id(nombre,apellidos),empresa:empresa_id(nombre_accesalia)),` +
        `comercial:comercial_id(nombre,apellidos,notas_comision,comision_pct)&id=eq.${oppId}`,
    ),
    leer<{ id: string; numero_hoja: string | null; fecha_firma: string | null; pagador_tipo: string | null; version_firmada_id: string | null; contrata: { nombre: string } | null; actuaciones: { tipo: { nombre: string; naturaleza: string | null; padre: { nombre: string; padre: { nombre: string } | null } | null } | null }[] }[]>(
      `hojas_encargo?select=id,numero_hoja,fecha_firma,pagador_tipo,version_firmada_id,contrata:pagador_contrata_id(nombre),` +
        `actuaciones:actuaciones_hoja(tipo:tipo_proyecto_id(nombre,naturaleza,padre:parent_id(nombre,padre:parent_id(nombre))))` +
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
    ? await leer<{ id: string; hoja_encargo_id: string; descripcion: string | null; importe: number | null; es_porcentaje: boolean | null; porcentaje: number | null; base_porcentaje: string | null; emisor: string | null; bloque_id: string | null; bloque: { nombre_corto: string | null; nombre: string; area: string | null } | null }[]>(
        `lineas_facturacion?select=id,hoja_encargo_id,descripcion,importe,es_porcentaje,porcentaje,base_porcentaje,emisor,bloque_id,bloque:bloque_id(nombre_corto,nombre,area)` +
          `&hoja_encargo_id=in.(${idsHoja.join(",")})&quitada_en=is.null&order=creado_en.asc`,
      )
    : [];
  // Cada uno ve lo suyo: las lineas de Ecobalance solo quien ve Ecobalance; las otras, quien ve Accesalia.
  const lineasVistas = lineasCrudas.filter((l) => (l.emisor === ECOBALANCE ? vista.ecobalance : vista.accesalia));
  const idsLinea = lineasVistas.map((l) => l.id);
  const emisoras = [...(vista.accesalia ? ["accesalia", "daniel"] : []), ...(vista.ecobalance ? ["ecobalance"] : [])];
  const versiones = hojas.map((h) => h.version_firmada_id).filter((v): v is string => !!v);
  const [hitos, notas, facturasOpp, conceptos, admins] = await Promise.all([
    idsLinea.length
      ? leer<{ id: string; linea_facturacion_id: string; hito: string; orden: number | null; porcentaje: number | null; importe: number | null; estado: string; fecha_prevista: string | null; hito_padre_id: string | null; enlaces: { importe: number | null; linea: { factura: FilaFactura | null } | null }[] }[]>(
          `hitos_cobro?select=id,linea_facturacion_id,hito,orden,porcentaje,importe,estado,fecha_prevista,hito_padre_id,` +
            `enlaces:factura_linea_hitos(importe,linea:factura_linea_id(factura:factura_id(id,anio,serie,numero,fecha,base,total,estado,cobros(importe))))` +
            `&linea_facturacion_id=in.(${idsLinea.join(",")})&order=orden.asc`,
        )
      : Promise.resolve([]),
    idsHoja.length
      ? leer<{ fecha: string | null; creado_en: string; texto: string; autor: string | null; tipo: string | null; linea_facturacion_id: string | null }[]>(
          `notas_facturacion?select=fecha,creado_en,texto,autor,tipo,linea_facturacion_id&hoja_encargo_id=in.(${idsHoja.join(",")})&order=creado_en.desc&limit=40`,
        )
      : Promise.resolve([]),
    leer<(FilaFactura & { fecha: string | null; empresa_emisora: string; tipo: string; enlaces: { hito_cobro_id: string }[] })[]>(
      `facturas?select=id,anio,serie,numero,fecha,base,total,estado,empresa_emisora,tipo,cobros(importe),enlaces:factura_lineas(factura_linea_hitos(hito_cobro_id))` +
        `&oportunidad_id=eq.${oppId}&estado=neq.anulada&empresa_emisora=in.(${emisoras.join(",")})&order=fecha.asc`,
    ).catch(() => []),
    versiones.length
      ? leer<{ hoja_encargo_id: string; bloque_id: string | null; descripcion: string | null; bloque: { nombre_corto: string | null; nombre: string } | null }[]>(
          `conceptos_hoja?select=hoja_encargo_id,bloque_id,descripcion,bloque:bloque_id(nombre_corto,nombre)&version_hoja_id=in.(${versiones.join(",")})`,
        ).catch(() => [])
      : Promise.resolve([]),
    // EL ADMINISTRADOR va con la COMUNIDAD (comunidad_admin_responsable), no con la opp.
    o.comunidad_id
      ? leer<{ empresa: { id: string; nombre_accesalia: string | null } | null; puesto: { persona: { id: string; nombre: string | null; apellidos: string | null } | null } | null }[]>(
          `comunidad_admin_responsable?select=empresa:empresa_id(id,nombre_accesalia),puesto:puesto_id(persona:persona_id(id,nombre,apellidos))&comunidad_id=eq.${o.comunidad_id}&vigente=is.true`,
        ).catch(() => [])
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
    const detalle: HitoFicha["detalle"] = [];
    for (const e of h.enlaces) {
      const f = e.linea?.factura;
      if (!f || f.estado === "anulada") continue;
      const parte = Number(e.importe ?? 0);
      fact += parte;
      const total = Number(f.total ?? 0);
      const cobradoF = f.cobros.reduce((s, c) => s + Number(c.importe ?? 0), 0);
      // HASTA 2023 INCLUSIVE la factura garantiza el cobro (no hay justificantes);
      // DESDE 2024, cobrado = justificante subido, con el 1 % de margen (Monica).
      // La parte cobrada de este hito, en la proporcion en que esta cobrada la factura.
      if (f.anio <= 2023) cob += parte;
      else if (total > 0) cob += parte * (cobradoF >= total * 0.99 ? 1 : Math.min(1, cobradoF / total));
      nums.push(`${f.anio}/${f.serie}-${f.numero}`);
      detalle.push({ numero: `${f.anio}/${f.serie}-${f.numero}`, fecha: f.fecha ?? null, cobrada: f.anio <= 2023 || (total > 0 && cobradoF >= total * 0.99) });
    }
    facturado[libro] += fact;
    cobrado[libro] += cob;
    const imp = h.importe != null ? Number(h.importe) : null;
    const estado: HitoFicha["estado"] =
      h.estado === "anulado" ? "anulado" : imp == null ? "a éxito" : fact > 0 && cob >= fact - 1 ? "cobrado" : fact > 0 ? "facturado"
      // Marcado como completado sin factura enlazada (cargas antiguas): se dice tal cual.
      : h.estado === "completado" ? "completado" : "pendiente";
    return { que: HITO_TEXTO[h.hito] ?? h.hito, porcentaje: h.porcentaje != null ? Number(h.porcentaje) : null, importe: imp, fecha: h.fecha_prevista, estado, facturas: nums, subhitos: [], detalle };
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
  const quienPaga = (h: (typeof hojas)[number]) => (h.pagador_tipo === "contrata" ? `Contrata${h.contrata ? ` (${h.contrata.nombre})` : ""}` : h.pagador_tipo === "persona" ? "Una persona" : "La comunidad");
  const pagadores = [...new Set(hojas.map(quienPaga))];
  // Las obras de verdad: los servicios (subvenciones, CSS, 3 presupuestos...) no son tipo de proyecto.
  const obrasP = new Set<string>(), categoriasP = new Set<string>();
  for (const h of hojas)
    for (const a of h.actuaciones) {
      if (!a.tipo || a.tipo.naturaleza === "servicio") continue;
      obrasP.add(a.tipo.nombre);
      categoriasP.add(a.tipo.padre?.padre?.nombre ?? a.tipo.padre?.nombre ?? a.tipo.nombre);
    }
  // Lo incluido sin cobrar aparte: lo de la version firmada que no tiene linea de cobro.
  const hojasInfo = hojas.map((h) => {
    const cobrados = new Set(lineasCrudas.filter((l) => l.hoja_encargo_id === h.id).map((l) => l.bloque_id));
    const incluido = [
      ...new Set(conceptos.filter((c) => c.hoja_encargo_id === h.id && !cobrados.has(c.bloque_id)).map((c) => c.bloque?.nombre_corto ?? c.bloque?.nombre ?? c.descripcion ?? "")),
    ].filter(Boolean);
    return { numero: h.numero_hoja, firma: h.fecha_firma, paga: quienPaga(h), incluido };
  });

  const admCom = admins[0] ?? null;
  const admNombre = admCom?.empresa?.nombre_accesalia ?? null;
  const admPersona = admCom?.puesto?.persona ?? null;

  // LA COMISION DEL ADMINISTRADOR: la misma cuenta que la pantalla de comisiones (lib/comisionesAdmin).
  let comisionAdmin: Ficha["comisionAdmin"] = null;
  if (vista.ecobalance && (admins.length || o.quien_lo_trae)) {
    const empresas = new Set(admins.map((a) => a.empresa?.id).filter(Boolean));
    const personas = new Set([...admins.map((a) => a.puesto?.persona?.id), o.quien_lo_trae].filter(Boolean));
    const candidatos = (await listaAcuerdos()).filter(
      (a) => a.vigente && !a.noCobra && (a.empresas.some((e) => empresas.has(e.id)) || (a.personaId != null && personas.has(a.personaId))),
    );
    for (const a of candidatos) {
      const suya = (await oppsDelAcuerdo(a)).find((x) => x.id === o.id);
      if (!suya) continue;
      comisionAdmin = {
        persona: a.persona ?? a.empresas.map((e) => e.nombre).join(", "),
        verificado: a.revision === "verificado",
        condiciones: a.condiciones,
        nota: suya.nota,
        deudas: [...suya.nuestras, ...(suya.contrata ? [suya.contrata] : [])],
      };
      break;
    }
  }
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
    administrador: admNombre
      ? [admNombre, admPersona ? [admPersona.nombre, admPersona.apellidos].filter(Boolean).join(" ") : null].filter(Boolean).join(" · ")
      : adm
        ? [adm.empresa?.nombre_accesalia, adm.persona ? [adm.persona.nombre, adm.persona.apellidos].filter(Boolean).join(" ") : null].filter(Boolean).join(" · ") || null
        : null,
    contrata: adj ? { nombre: adj.contrata?.nombre ?? adj.contrata_externa_nombre ?? "—", pem: adj.importe_pem != null ? Number(adj.importe_pem) : null } : null,
    lineas,
    hojasInfo,
    obrasProyecto: [...obrasP],
    categoriasProyecto: [...categoriasP],
    comisionAdmin,
    comercial:
      vista.todo && o.comercial
        ? { nombre: [o.comercial.nombre, o.comercial.apellidos].filter(Boolean).join(" "), pacto: o.comercial.notas_comision, pct: o.comercial.comision_pct != null ? Number(o.comercial.comision_pct) : null }
        : null,
    financiacion: vista.accesalia
      ? finan.map((f) => ({ entidad: f.entidad?.nombre_accesalia ?? f.entidad_nombre ?? "—", estado: f.estado, importe: f.importe != null ? Number(f.importe) : null, firma: f.fecha_firma, notas: f.notas }))
      : [],
    facturado,
    cobrado,
    sueltas: facturasOpp
      .filter((x) => !(x.enlaces as unknown as { factura_linea_hitos: unknown[] }[]).some((l) => l.factura_linea_hitos.length))
      .map((x) => {
        const total = Number(x.total ?? 0);
        const cob = x.cobros.reduce((a, c) => a + Number(c.importe ?? 0), 0);
        return {
          numero: `${x.anio}/${x.serie}-${x.numero}${x.tipo === "abono" ? " (abono)" : ""}`,
          fecha: x.fecha,
          base: Number(x.base ?? 0),
          // La misma regla: hasta 2023 la factura garantiza el cobro; desde 2024, justificante.
          cobrada: x.anio <= 2023 || (total !== 0 && cob >= total * 0.99),
          ecobalance: x.empresa_emisora === ECOBALANCE,
        };
      }),
    ivaPct: Number(params[0]?.valor ?? 21),
    // Las notas de una linea que no se ve, tampoco.
    notas: notas
      .filter((n) => !n.linea_facturacion_id || lineaDe.has(n.linea_facturacion_id))
      .map((n) => ({ fecha: (n.fecha ?? n.creado_en).slice(0, 10), texto: n.texto, autor: n.autor, tipo: n.tipo })),
  };
}

/** LA LISTA DEL DESPLEGABLE (Monica, 17-oct-2026: «un espacio en blanco es
 *  intimidante»): todas las opps con hoja firmada, la ultima firma primero, para
 *  elegir por aproximacion («algo de Fontarron...»). Se filtra en el navegador. */
export type OpcionFicha = { id: string; nombre: string; detalle: string; firma: string | null; buscar: string };
const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export async function opcionesFicha(): Promise<OpcionFicha[]> {
  const filas = await leer<{ id: string; nombre: string | null; codigo: string | null; adm: { empresa: { nombre_accesalia: string | null } | null } | null; hojas: { fecha_firma: string | null }[] }[]>(
    "oportunidades?select=id,nombre,codigo,adm:administrador_puesto_id(empresa:empresa_id(nombre_accesalia)),hojas:hojas_encargo!inner(fecha_firma)" +
      "&estado=neq.anulada&hojas.estado=eq.devuelta_firmada",
  );
  return filas
    .map((o) => {
      const firma = o.hojas.map((h) => h.fecha_firma).filter((f): f is string => !!f).sort().pop() ?? null;
      const nombre = nombreDeOpp(o);
      const adm = o.adm?.empresa?.nombre_accesalia ?? null;
      const detalle = [firma ? `firmada el ${firma.split("-").reverse().join("/")}` : null, o.codigo, adm].filter(Boolean).join(" · ");
      return { id: o.id, nombre, detalle, firma, buscar: sinTildes(`${nombre} ${o.codigo ?? ""} ${adm ?? ""}`) };
    })
    .sort((a, b) => (b.firma ?? "").localeCompare(a.firma ?? ""));
}
