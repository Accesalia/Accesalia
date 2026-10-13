import "server-only";
import { nombreDeOpp } from "./direccionOpp";
// lib/informeCostes.ts
//
// EL INFORME DE COSTES PARA UNA COMUNIDAD, EMITIDO Y GUARDADO (Monica,
// 12-oct-2026). Antes se calculaba cada vez que se abria; ahora se EMITE: se
// calcula una vez y se guarda la foto en `informes_generados`, y se pinta
// siempre desde ahi. Asi, cuando la comunidad llama ("del papel que me diste,
// que dice que esto no se puede..."), se ve exactamente lo que se le dio,
// aunque los precios o las ayudas hayan cambiado despues.
//
//   - Para una oportunidad: queda en ella (su bloque 2).
//   - Para una direccion que no es de nadie: queda igual, sin oportunidad. Es el
//     rastro de "Direcciones vistas que no llegaron a mayores", con la hora.
//
// Las cuentas son las de siempre: lib/estimacionCalculo (precios), lib/
// anexoEdificio (edificio y ayudas) y lib/plazosAyudas (cuando se convocan y
// se conceden).

import type { Yo } from "./sesion";
import { datosEstimacion } from "./estimacionCostes";
import { CASOS, dentroDe, esSate, estimar, indiceDe, TIPOS, tresPrecios, type TipoObra } from "./estimacionCalculo";
import { anexoDeOportunidad, anexoDeReferencia, type Anexo } from "./anexoEdificio";
import { plazosPorPrograma } from "./plazosAyudas";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...init, headers: { ...CAB, ...(init.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return (r.status === 204 ? null : await r.json()) as T;
}

/** La obra que se estima, en la clave del catalogo tipos_proyecto: con ella se
 *  eligen las ayudas (las de ESTA obra, no las de todo lo que pidio la opp). */
const CLAVE_TIPO: Record<TipoObra, string> = {
  ascensor: "ascensor",
  sate: "sate",
  fachada: "sate_fachada",
  cubierta: "cubierta",
  plataforma: "plataforma",
  rampa: "rampa",
};

export type EntradaCostes = { tipo: TipoObra; caso: string; paradas: number | null; m2f: number; m2c: number };

/** La foto: todo lo que se pinta, ya calculado y en texto. */
export type FotoCostes = {
  version: 1;
  fecha: string; // "12 de octubre de 2026"
  nombre: string;
  direccion: string | null;
  lugar: string | null;
  obra: string;
  entrada: EntradaCostes & { paradasDeCatastro: string | null };
  /** Si no se pudo estimar, por que. Entonces no hay cifras. */
  sinEstimar: string | null;
  precios: { hoy: number; bajo: number; alto: number; pem: number; obras: number } | null;
  subidaAnual: number;
  subidaMinima: number;
  años: { cuando: string; valor: number; mas: number | null }[];
  ayudas: { convocatoria: string; cubre: string; cuantoDa: string; estimacion: string | null; cuando: string }[];
  esperar: { convocatoria: string; abierta: boolean; meses: number; entonces: number; mas: number; importe: number } | null;
  nota: string | null;
  /** Solo en el ESTUDIO DE AYUDAS (12-oct-2026): lo concedido cerca y, por cada
   *  ayuda con datos, lo que de verdad cubre si se espera a cobrarla. */
  entorno?: { donde: string; filas: { quien: string; detalle: string; importe: number | null }[]; mas: number; total: number } | null;
  resumen?: ResumenAyuda[];
};

/** Una ayuda, echadas las cuentas: lo que da, cuando llegaria la concesion, lo
 *  que costaria la obra para entonces y lo que de verdad ahorra. */
export type ResumenAyuda = {
  convocatoria: string;
  importe: number;
  meses: number;
  /** Coste de la obra con IVA, hoy y cuando llegaria la concesion. */
  hoy: number;
  entonces: number;
  /** Lo que sube la obra mientras se espera. */
  encarece: number;
  /** Sobre el papel: la ayuda entre lo que cuesta la obra hoy. */
  cubrePapel: number;
  /** De verdad, si se espera: (ayuda - lo que sube) entre lo que cuesta hoy. */
  cubreDeVerdad: number;
};

export type TipoInforme = "estimacion_costes" | "estudio_ayudas";

export type InformeGuardado = {
  id: string;
  tipo: "estimacion_costes" | "estudio_ayudas" | "proteccion";
  oportunidad_id: string | null;
  direccion: string;
  referencia_catastral: string | null;
  municipio: string | null;
  datos: FotoCostes;
  creado_en: string;
  creado_por: string | null;
  autor: { nombre: string; apellidos: string | null } | null;
  oportunidad: { codigo: string } | null;
};

const MES = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });
const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });
const mesesHasta = (iso: string) => Math.max(0, (new Date(iso).getTime() - Date.now()) / (30.44 * 864e5));

/** Calcula el informe y lo guarda. Devuelve su id. Con `oppId`, queda en la
 *  oportunidad; sin ella, hace falta la referencia catastral de la direccion. */
export async function emitirInformeCostes(
  donde: { oppId: string | null; ref: string | null; direccion: string; municipio: string | null },
  entrada: EntradaCostes,
  yo: Yo,
  clase: TipoInforme = "estimacion_costes",
): Promise<string> {
  if (!donde.oppId && !donde.ref) throw new Error("Falta la dirección: elige una oportunidad o busca la dirección en Catastro.");
  const { tipo } = entrada;
  const caso = CASOS.some(([c]) => c === entrada.caso) ? entrada.caso : "B";
  const pedido = [CLAVE_TIPO[tipo]];
  const anexoCon = (pem: number | null): Promise<Anexo | null> =>
    donde.oppId
      ? anexoDeOportunidad(donde.oppId, { pem, pedido })
      : anexoDeReferencia(donde.ref!, { pem, pedido, municipio: donde.municipio });

  const d = await datosEstimacion();
  // Las paradas: las que se den; si no, las plantas de Catastro (baja + X = X + 1).
  const anexoSin = entrada.paradas || tipo !== "ascensor" ? null : await anexoCon(null);
  const plantas = anexoSin?.cifras.find((c) => c.que === "plantas")?.valor ?? "";
  const deCatastro = plantas ? (plantas === "PB" ? 1 : Number(plantas.match(/PB \+ (\d+)/)?.[1] ?? 0) + 1) : null;
  const paradas = entrada.paradas || deCatastro || 0;
  const est = estimar(d, tipo, { caso, paradas, m2Fachada: entrada.m2f, m2Cubierta: entrada.m2c });
  const vale = !!est && Number.isFinite(est.hoy);
  const ind = indiceDe(d, tipo);
  const conIva = (pem: number) => tresPrecios(d, pem).conIva;
  const [anexo, plazos, opp] = await Promise.all([
    anexoCon(vale ? est!.hoy : null),
    plazosPorPrograma(),
    donde.oppId
      ? pedir<{ codigo: string; nombre: string | null; comunidad_provisional: string | null; comunidad: { nombre: string } | null }[]>(
          `oportunidades?select=codigo,nombre,comunidad_provisional,comunidad:comunidad_id(nombre)&id=eq.${donde.oppId}`,
        ).then((x) => x[0] ?? null)
      : Promise.resolve(null),
  ]);

  const año = Number(d.hoy.slice(0, 4));
  const obra =
    tipo === "ascensor"
      ? `Instalación de ascensor (${CASOS.find(([c]) => c === caso)![1].slice(4).toLowerCase()}), ${paradas} paradas`
      : esSate(tipo)
        ? `${TIPOS.find((t) => t.clave === tipo)!.nombre}: ${[entrada.m2f && tipo !== "cubierta" ? `${entrada.m2f} m² de fachada` : null, entrada.m2c && tipo !== "fachada" ? `${entrada.m2c} m² de cubierta` : null].filter(Boolean).join(" y ")}`
        : TIPOS.find((t) => t.clave === tipo)!.nombre;

  const ayudas = (anexo?.ayudas ?? []).map((a) => {
    const p = a.clave ? plazos.get(a.clave) : undefined;
    const abierta = a.estado === "abierta ahora";
    const hastaConvocar = abierta ? 0 : p?.proxima ? mesesHasta(p.proxima) : null;
    const hastaConceder = hastaConvocar !== null && p?.mesesConcesion ? hastaConvocar + p.mesesConcesion : null;
    const cuando =
      (abierta ? "Abierta ahora." : p?.proxima ? `Próxima convocatoria prevista hacia ${MES.format(new Date(p.proxima))}.` : `${a.estado.charAt(0).toUpperCase()}${a.estado.slice(1)}.`) +
      (p?.mesesConcesion ? ` Se suele conceder unos ${Math.round(p.mesesConcesion)} meses después de convocarse.` : " Sin datos de cuánto tarda en concederse.");
    return { a, abierta, hastaConceder, cuando, entonces: vale && hastaConceder !== null ? conIva(dentroDe(est!.hoy, hastaConceder, ind.subidaAnual)) : null };
  });
  const principal = ayudas.find((x) => x.hastaConceder !== null && x.a.importe && x.entonces);

  const foto: FotoCostes = {
    version: 1,
    fecha: FECHA.format(new Date()),
    nombre: opp ? nombreDeOpp(opp) : (anexo?.direccion ?? donde.direccion),
    direccion: anexo?.direccion ?? donde.direccion,
    lugar: anexo?.lugar ?? donde.municipio,
    obra,
    entrada: { ...entrada, caso, paradas: paradas || null, paradasDeCatastro: !entrada.paradas && deCatastro ? plantas : null },
    sinEstimar: vale ? null : (est?.nota ?? (esSate(tipo) ? "faltan los m²." : "faltan las paradas (no las encuentro en Catastro).")),
    precios: vale ? { hoy: conIva(est!.hoy), bajo: conIva(est!.bajo), alto: conIva(est!.alto), pem: est!.hoy, obras: est!.obras } : null,
    subidaAnual: ind.subidaAnual,
    subidaMinima: ind.subidaMinima,
    años: vale
      ? [
          { cuando: `Hoy (${año})`, valor: conIva(est!.hoy), mas: null },
          { cuando: `Dentro de 1 año (${año + 1})`, valor: conIva(dentroDe(est!.hoy, 12, ind.subidaAnual)), mas: conIva(dentroDe(est!.hoy, 12, ind.subidaAnual)) - conIva(est!.hoy) },
          { cuando: `Dentro de 2 años (${año + 2})`, valor: conIva(dentroDe(est!.hoy, 24, ind.subidaAnual)), mas: conIva(dentroDe(est!.hoy, 24, ind.subidaAnual)) - conIva(est!.hoy) },
        ]
      : [],
    ayudas: ayudas.map((x) => ({ convocatoria: x.a.convocatoria, cubre: x.a.cubre, cuantoDa: x.a.cuantoDa, estimacion: x.a.estimacion, cuando: x.cuando })),
    esperar:
      vale && principal
        ? {
            convocatoria: principal.a.convocatoria,
            abierta: principal.abierta,
            meses: Math.round(principal.hastaConceder!),
            entonces: principal.entonces!,
            mas: principal.entonces! - conIva(est!.hoy),
            importe: principal.a.importe!,
          }
        : null,
    nota: est?.nota ?? null,
  };

  // EL ESTUDIO DE AYUDAS: lo concedido cerca y el resumen de cada ayuda.
  if (clase === "estudio_ayudas") {
    foto.entorno = anexo?.entorno ?? null;
    foto.resumen = vale
      ? ayudas
          .filter((x) => x.a.importe && x.hastaConceder !== null && x.entonces)
          .map((x) => {
            const hoy = conIva(est!.hoy);
            const encarece = x.entonces! - hoy;
            return {
              convocatoria: x.a.convocatoria,
              importe: x.a.importe!,
              meses: Math.round(x.hastaConceder!),
              hoy,
              entonces: x.entonces!,
              encarece,
              cubrePapel: x.a.importe! / hoy,
              cubreDeVerdad: Math.max(0, x.a.importe! - encarece) / hoy,
            };
          })
      : [];
  }

  const [fila] = await pedir<{ id: string }[]>("informes_generados", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      tipo: clase,
      oportunidad_id: donde.oppId,
      direccion: foto.direccion || foto.nombre,
      referencia_catastral: anexo?.referencia ?? donde.ref,
      municipio: donde.municipio,
      datos: foto,
      creado_por: yo.id,
    }),
  });
  return fila.id;
}

const SEL = "id,tipo,oportunidad_id,direccion,referencia_catastral,municipio,datos,creado_en,creado_por,autor:creado_por(nombre,apellidos),oportunidad:oportunidad_id(codigo)";

export async function leerInforme(id: string): Promise<InformeGuardado | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [f] = await pedir<InformeGuardado[]>(`informes_generados?select=${SEL}&id=eq.${id}`);
  return f ?? null;
}

/** Los informes de una oportunidad, el ultimo primero (su bloque 2). */
export async function informesDeOportunidad(oppId: string): Promise<InformeGuardado[]> {
  return pedir<InformeGuardado[]>(`informes_generados?select=${SEL}&oportunidad_id=eq.${oppId}&order=creado_en.desc`);
}

/** El rastro: lo emitido para direcciones sin oportunidad, lo ultimo primero. */
export async function direccionesVistas(): Promise<InformeGuardado[]> {
  return pedir<InformeGuardado[]>(`informes_generados?select=${SEL}&oportunidad_id=is.null&order=creado_en.desc&limit=500`);
}
