import "server-only";
// lib/hojaGenerador.ts
//
// LO QUE NECESITA EL GENERADOR DE HOJAS (Monica, 25-oct-2026), rescatado del generador viejo (lib/hojaEncargo.ts) al
// jubilarlo: quien puede hacer hojas y de que opps (su cartera), las opps para elegir, y los datos de una opp para
// generar su hoja (a quien puede ir, sus accesos con las viviendas, el catalogo de bloques, las tarifas, el PEM de su
// viabilidad y la comision del administrador). Guardar, generar y el ok viven en lib/hojaCompromisos.ts y lib/hojaEmitir.ts.
//
// LA HOJA ES DE LA OPORTUNIDAD, NO DE LA COMUNIDAD (13-oct-2026): «tener CP no deberia condicionar nada». A quien va: su
// comunidad si la tiene, una contrata, o la persona titular de sus accesos (un particular: un chalet no es una CP).

import { nombreDeOpp } from "./direccionOpp";
import { comercialDe, type Yo } from "./sesion";
import type { Desglose } from "./catalogoBloques";
import { limpiarTexto } from "./catalogoBloques";
import { preciosParaHoja, type PrecioHoja } from "./tarifas";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
const leer = async <T>(path: string): Promise<T> => {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
};

// ------------------------------------------------------------------ quien

/** Quien hace hojas: comercial, secretaria comercial y direccion. */
export function puedeHacerHojas(yo: Yo): boolean {
  return yo.veTodo || yo.funciones.some((f) => f.clave === "comercial" || f.clave === "secretaria");
}

/** Direccion y la secretaria comercial ven todas las oportunidades; un comercial, las de su cartera (la propia o la
 *  que comparte). */
async function carteraDe(yo: Yo): Promise<string | "todas" | null> {
  if (yo.veTodo || yo.funciones.some((f) => f.clave === "secretaria")) return "todas";
  return (await comercialDe(yo.id))?.id ?? null;
}

/** ¿Puede este usuario tocar los documentos de esta oportunidad? Los de su cartera. */
export async function puedeVerOpp(yo: Yo, oppId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/.test(oppId)) return false;
  const cartera = await carteraDe(yo);
  if (cartera === "todas") return true;
  if (!cartera) return false;
  const o = await leer<{ id: string }[]>(`oportunidades?select=id&id=eq.${oppId}&comercial_id=eq.${cartera}&limit=1`);
  return o.length > 0;
}

// ----------------------------------------------------------- el selector

export type OpcionOpp = { valor: string; texto: string; pista?: string };

/** Las oportunidades de su cartera (todas, a direccion y secretaria), por su nombre. */
export async function oppsParaHoja(yo: Yo): Promise<OpcionOpp[]> {
  const cartera = await carteraDe(yo);
  if (!cartera) return [];
  const filtro = cartera === "todas" ? "" : `&comercial_id=eq.${cartera}`;
  const opps = await leer<{ id: string; codigo: string | null; nombre: string | null; estado: string }[]>(
    `oportunidades?select=id,codigo,nombre,estado${filtro}&estado=neq.anulada&order=estado.asc,fecha_apertura.desc.nullslast&limit=5000`,
  );
  return opps.map((o) => ({
    valor: o.id,
    texto: nombreDeOpp(o),
    pista: [o.codigo, o.estado === "abierta" ? null : o.estado].filter(Boolean).join(" · ") || undefined,
  }));
}

// ------------------------------------------------------------ la comision

/** Un acuerdo de comision con lo que cobra el administrador: por proyecto y por subvenciones, en euros (una vez por
 *  hoja) o en % (de cada linea). */
export type ComisionAdmin = {
  acuerdoId: string;
  persona: string;
  proyecto: { forma: "eur" | "pct"; valor: number } | null;
  subvenciones: { forma: "eur" | "pct"; valor: number } | null;
};

/** EL ACUERDO DE COMISION DE UNA OPP (con el hilo 85, 18-oct-2026): su comunidad -> el administrador responsable
 *  vigente -> el acuerdo de su administracion (alcance "empresas") o el de su persona (alcance "lo_suyo", tambien si es
 *  quien la trajo). Solo los verificados, vigentes y que cobran, y solo lo pactado de proyecto y subvenciones (lo de
 *  contrata no va en la hoja). */
export async function comisionDeOpp(oppId: string, comunidadId: string | null): Promise<{ comision: ComisionAdmin | null; aviso: string | null }> {
  if (!comunidadId) return { comision: null, aviso: null };
  const [responsables, [opp], acuerdos] = await Promise.all([
    leer<{ empresa_id: string | null; puesto: { persona_id: string | null } | null }[]>(
      `comunidad_admin_responsable?select=empresa_id,puesto:puesto_id(persona_id)&vigente=is.true&comunidad_id=eq.${comunidadId}`,
    ),
    leer<{ quien_lo_trae: string | null }[]>(`oportunidades?select=quien_lo_trae&id=eq.${oppId}`),
    leer<{
      id: string;
      persona_id: string | null;
      alcance: "empresas" | "lo_suyo";
      persona: { nombre: string | null; apellidos: string | null } | null;
      empresas: { empresa_id: string }[];
      condiciones: { sobre: string; forma: "eur" | "pct"; valor: number | null; estado: string }[];
    }[]>(
      "comision_acuerdos?select=id,persona_id,alcance,persona:persona_id(nombre,apellidos),empresas:comision_acuerdo_empresas(empresa_id)," +
        "condiciones:comision_condiciones(sobre,forma,valor,estado)&vigente=is.true&revision=eq.verificado&or=(no_cobra.is.null,no_cobra.is.false)",
    ),
  ]);
  const empresas = new Set(responsables.map((x) => x.empresa_id).filter(Boolean));
  const personas = new Set([...responsables.map((x) => x.puesto?.persona_id), opp?.quien_lo_trae].filter(Boolean));
  const suyos = acuerdos.filter((a) =>
    a.alcance === "empresas" ? a.empresas.some((e) => empresas.has(e.empresa_id)) : !!a.persona_id && personas.has(a.persona_id),
  );
  if (suyos.length > 1)
    return { comision: null, aviso: "Esta comunidad tiene dos acuerdos de comisión con su administrador: no sumo nada. Que lo revisen en Comisiones de administradores." };
  const a = suyos[0];
  if (!a) return { comision: null, aviso: null };
  const cond = (sobre: string) => {
    const c = a.condiciones.find((x) => x.sobre === sobre && x.estado === "pactada" && x.valor != null);
    return c ? { forma: c.forma, valor: Number(c.valor) } : null;
  };
  const proyecto = cond("proyecto");
  const subvenciones = cond("subvenciones");
  if (!proyecto && !subvenciones) return { comision: null, aviso: null };
  return {
    comision: { acuerdoId: a.id, persona: [a.persona?.nombre, a.persona?.apellidos].filter(Boolean).join(" ") || "el administrador", proyecto, subvenciones },
    aviso: null,
  };
}

// ------------------------------------------------------- los datos de una opp

export type BloqueHoja = {
  id: string;
  codigo: string;
  nombreCorto: string;
  titulo: string;
  puntos: string[];
  desglose: Desglose;
  importe: number | null;
  naturaleza: string | null;
  /** COBRO A EXITO que paga la comunidad y SALE EN LA HOJA (Subvenciones: 3,5 % de lo concedido). */
  exito: { porcentaje: number; base: string | null; hito: string } | null;
  area: string | null;
};
export type AccesoHoja = { id: string; texto: string; portalId: string | null; viviendas: number | null };

export type DatosGenerador = {
  opp: { id: string; codigo: string | null; nombre: string };
  /** Su comunidad, si la tiene. No hace falta para hacer la hoja. */
  comunidad: { id: string; nombre: string; cif: string | null; municipio: string | null } | null;
  /** Las personas titulares de sus accesos (un particular), para «a quien va». */
  personas: { id: string; nombre: string }[];
  /** Su municipio, de sus accesos: para el «en ..., Municipio» de la cabecera. */
  municipio: string | null;
  /** Sus accesos vivos, con su escalera y las viviendas de su portal (para el tramo de la tarifa). */
  accesos: AccesoHoja[];
  bloques: BloqueHoja[];
  /** `tarifaId`: su convenio; vacio = la tarifa general. */
  contratas: { id: string; nombre: string; cif: string | null; tarifaId: string | null }[];
  /** Lo que dijeron en el alta que les interesa (oportunidad_tipos). */
  interes: { id: string; nombre: string }[];
  /** Las tarifas: los precios que valen hoy. */
  tarifas: { generalId: string | null; precios: PrecioHoja[] };
  /** El PEM de su ultima viabilidad: para los precios en % del PEM. */
  pem: number | null;
  /** La comision del administrador de su comunidad; `aviso`: algo no cuadra (dos acuerdos) y no se suma nada. */
  comision: ComisionAdmin | null;
  comisionAviso: string | null;
};

const textoAcceso = (a: { tipo_via: string | null; nombre_via: string | null; numero: string | null; escalera: string | null }) =>
  [a.tipo_via, a.nombre_via, a.numero].filter(Boolean).join(" ") + (a.escalera ? `, esc. ${a.escalera}` : "");

export async function datosGenerador(oppId: string): Promise<DatosGenerador | null> {
  if (!/^[0-9a-f-]{36}$/.test(oppId)) return null;
  const [opps, bloques, contratas, interes, tarifas, viabilidad] = await Promise.all([
    leer<{
      id: string; codigo: string | null; nombre: string | null;
      comunidad: { id: string; nombre: string; cif_comunidad: string | null; municipio: string | null } | null;
      accesos: {
        hasta: string | null;
        acceso: { id: string; tipo_via: string | null; nombre_via: string | null; numero: string | null; escalera: string | null; municipio: string | null;
          figura_legal_propietaria_id: string | null; ficha_catastro_portal_id: string | null; portal: { viviendas: number | null } | null } | null;
      }[];
    }[]>(
      `oportunidades?select=id,codigo,nombre,comunidad:comunidad_id(id,nombre,cif_comunidad,municipio),` +
        `accesos:relacion_oportunidad_accesos(hasta,acceso:acceso_id(id,tipo_via,nombre_via,numero,escalera,municipio,figura_legal_propietaria_id,ficha_catastro_portal_id,portal:ficha_catastro_portal_id(viviendas)))` +
        `&id=eq.${oppId}`,
    ),
    leer<{
      id: string; codigo: string; nombre_corto: string | null; nombre: string; texto_plantilla: string | null; desglose: Desglose; honorarios_defecto: number | null;
      naturaleza: string | null; porcentaje_exito: number | null; base_exito: string | null; hito_exito: string | null; area: string | null;
    }[]>(
      "bloques?select=id,codigo,nombre_corto,nombre,texto_plantilla,desglose,honorarios_defecto,naturaleza,porcentaje_exito,base_exito,hito_exito,area" +
        "&activo=is.true&order=orden.asc.nullslast",
    ),
    leer<{ id: string; nombre: string; cif: string | null; tarifa_id: string | null }[]>("contratas?select=id,nombre,cif,tarifa_id&order=nombre.asc&limit=1000"),
    leer<{ tipo: { id: string; nombre: string } | null }[]>(`oportunidad_tipos?select=tipo:tipo_id(id,nombre)&oportunidad_id=eq.${oppId}`),
    preciosParaHoja(),
    // El PEM: la suma de sus lineas de obra o, si no las tiene, el estimado.
    leer<{ pem_estimado: number | null; obra: { importe: number | null }[] }[]>(
      `viabilidades?select=pem_estimado,obra:viabilidad_conceptos(importe)&obra.grupo=eq.obra&oportunidad_id=eq.${oppId}&order=creado_en.desc&limit=1`,
    ),
  ]);
  const o = opps[0];
  if (!o) return null;
  const c = o.comunidad;
  const vivos = o.accesos.filter((a) => !a.hasta && a.acceso).map((a) => a.acceso!);
  // Los titulares de sus accesos que son personas (particulares): a ellos puede ir la hoja.
  const titulares = [...new Set(vivos.map((a) => a.figura_legal_propietaria_id).filter((x): x is string => !!x && x !== c?.id))];
  const [personas, comision] = await Promise.all([
    titulares.length
      ? leer<{ id: string; nombre: string; apellidos: string | null }[]>(`persona?select=id,nombre,apellidos&id=in.(${titulares.join(",")})`).then((ps) =>
          ps.map((p) => ({ id: p.id, nombre: [p.nombre, p.apellidos].filter(Boolean).join(" ") })),
        )
      : Promise.resolve([] as { id: string; nombre: string }[]),
    comisionDeOpp(o.id, c?.id ?? null),
  ]);
  const v = viabilidad[0];
  const obra = v ? v.obra.reduce((s, l) => s + (Number(l.importe) || 0), 0) : 0;
  return {
    opp: { id: o.id, codigo: o.codigo, nombre: nombreDeOpp(o) },
    comunidad: c ? { id: c.id, nombre: c.nombre, cif: c.cif_comunidad, municipio: c.municipio } : null,
    personas,
    municipio: c?.municipio ?? vivos.find((a) => a.municipio)?.municipio ?? null,
    accesos: vivos
      .map((a) => ({ id: a.id, texto: textoAcceso(a), portalId: a.ficha_catastro_portal_id, viviendas: a.portal?.viviendas ?? null }))
      .sort((a, b) => a.texto.localeCompare(b.texto, "es", { numeric: true })),
    bloques: bloques.map((b) => {
      const [titulo, ...resto] = limpiarTexto(b.texto_plantilla ?? b.nombre).split("\n");
      return {
        id: b.id,
        codigo: b.codigo,
        nombreCorto: b.nombre_corto ?? b.nombre,
        titulo: titulo.trim(),
        puntos: resto.map((l) => l.trim()).filter(Boolean),
        desglose: b.desglose,
        importe: b.honorarios_defecto,
        naturaleza: b.naturaleza ?? null,
        exito: b.porcentaje_exito != null && b.hito_exito ? { porcentaje: Number(b.porcentaje_exito), base: b.base_exito, hito: b.hito_exito } : null,
        area: b.area,
      };
    }),
    contratas: contratas.map((x) => ({ id: x.id, nombre: x.nombre, cif: x.cif, tarifaId: x.tarifa_id })),
    interes: interes.map((x) => x.tipo).filter((t): t is { id: string; nombre: string } => !!t),
    tarifas,
    pem: v ? obra || (v.pem_estimado != null ? Number(v.pem_estimado) : null) : null,
    comision: comision.comision,
    comisionAviso: comision.aviso,
  };
}
