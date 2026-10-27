// lib/fichaComercial.ts
//
// LA FICHA COMERCIAL DE UNA OPP (Monica, 27-oct-2026; maqueta validada docs/figma/ficha-comercial.html, «¡es
// BUENISIMO!»). Tres franjas: arriba lo comun (nombre, estado, primer contacto), en el centro la fase comercial (el
// avance, cada fase con su RESULTADO, y la historia con ellos), abajo lo transversal (edificio, comunidad, fotos y
// documentos, avance del proyecto). Es una pantalla NUEVA: la de bloques se queda como esta y es el detalle.
//
// Lo que se decidio para cada fase:
//   - Documentacion: una fila por HOJA (su version vigente), con que contiene, importe, su viabilidad y como esta
//     (los nombres de FASE_HE: «Firmada · en facturacion»...). Sin presupuesto: sale de la hoja. La viabilidad, la que
//     la hoja tenga apuntada al emitirse; si no tiene (las de antes), la vigente de la opp.
//   - Junta: fecha, «¿nos piden ir?», el 3D y el resultado. Si la junta no tiene resultado pero hay hoja firmada, SE
//     DICE que se deduce: «tenemos hoja firmada, asi que asumimos que votaron si».
//   - Firma y cobro, una linea. Cobrado = hitos cobrados (los marca el justificante).

import "server-only";
import { gestionOportunidad, contactosDeComunidad, type ContactoComunidad } from "./gestionOportunidad";
import { cabeceraDe } from "./cabeceraOpp";
import { necesidadesDe } from "./necesidadesOpp";
import { correosEnviados, type CorreoEnviado } from "./envioCorreo";
import { fotosDeOpp } from "./fotos";
import { cajonDeOpp, type DocCajon } from "./cajonDocumentos";
import { distritoDe, ieeDe } from "./informeEdificio";
import { faseHe } from "./hojasOpp";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
async function leer<T>(path: string): Promise<T[]> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return (await r.json()) as T[];
}
const seguro = async <T,>(f: () => Promise<T>, si: T): Promise<T> => {
  try {
    return await f();
  } catch {
    return si;
  }
};

export type HojaFicha = {
  id: string;
  codigo: string | null;
  version: number;
  emitida: string | null;
  contenido: string;
  importe: number | null;
  /** «+ 3,5 % si conceden»: lo que va a porcentaje. */
  aPorcentaje: string | null;
  estado: string;
  estadoTexto: string;
  firmada: boolean;
  viabilidad: { id: string; version: number; deLaOpp: boolean } | null;
};
export type FichaComercial = {
  id: string;
  codigo: string | null;
  direccion: string;
  distrito: string | null;
  anio: number | null;
  comercial: string | null;
  estado: { ganada: string | null; perdida: boolean; pausada: boolean; texto: string | null; extra: string | null; motivoCierre: string | null };
  trajo: string | null;
  llegada: string | null;
  quieren: string | null;
  admin: { persona: string | null; empresa: string | null; telefono: string | null } | null;
  hablo: { nombre: string | null; telefono: string | null } | null;
  referencia: string | null;
  // la fase
  necesita: { polycam: boolean; viabilidad: boolean } | null;
  viabilidad: { id: string; version: number; enviada: string | null; viable: boolean | null; pdf: boolean } | null;
  hojas: HojaFicha[];
  junta: { id: string | null; fecha: string | null; celebrada: boolean; resultado: string | null; detalle: string | null; nosPidenIr: boolean | null } | null;
  juntaDeducida: boolean;
  tresD: { hace: boolean; estado: string | null; pedido: string | null; necesario: string | null; entregado: string | null; enlace: string | null } | null;
  firma: { fecha: string | null; codigos: string[] };
  cobro: { cobrado: number; pendiente: number; queFalta: string[]; aExito: boolean } | null;
  diario: { fecha: string; texto: string; quien: string | null }[];
  correos: CorreoEnviado[];
  // lo transversal
  iee: string | null;
  contactos: ContactoComunidad[];
  fotos: number;
  documentos: DocCajon[];
  /** La agenda donde se apunta la junta: la del comercial de la opp. */
  agendaComercial: string | null;
};

const PLAZO: Record<string, string> = {
  encargo: "al encargo", firma: "a la firma", entrega: "entrega del proyecto", licencia: "a la licencia", concesion: "a la concesión",
  adjudicacion: "a la adjudicación", fin_obra: "al fin de obra", cfo: "al fin de obra", inicio_obra: "al inicio de obra", pss: "CSS",
  presentacion: "a la presentación", otro: "otro plazo",
};
/** «Proyecto (REDACCIÓN DEL PROYECTO…) - INSTALACIÓN ASCENSOR» -> «Proyecto - instalación ascensor». */
function corto(t: string): string {
  // Solo lo primero de «A / B» y nada de lo que va tras los dos puntos (las condiciones).
  const s = t.split(/\s\/\s/)[0].split(/\s*:\s/)[0].replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").replace(/\s+-\s+/g, " - ").trim();
  return s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s.charAt(0) + s.slice(1).replace(/\b([A-ZÁÉÍÓÚÑ]{4,})\b/g, (w) => w.toLowerCase());
}
/** 3490 -> «3.490 €» (es-ES no pone el punto en los de cuatro cifras). */
export const euros = (n: number) => `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} €`;
const ESPERA_FIRMA = new Set(["borrador", "pendiente_ok_daniel", "cambios_daniel", "ok_daniel", "enviada", "cambios_comunidad", "cambios_comercial", "no_firmada", "anulada", "sustituida"]);

export async function fichaComercial(id: string): Promise<FichaComercial | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const g = await gestionOportunidad(id);
  if (!g) return null;

  type Version = { id: string; codigo_he: string | null; numero_version: number; estado: string; fecha_emision: string | null; viabilidad_id: string | null; viabilidad_version: number | null;
    lineas: { texto: string | null; importe: number | null; porcentaje: number | null; se_cobra: boolean; padre_id: string | null }[] };
  type Viab = { id: string; version: number; vigente: boolean; viable: boolean | null; enviada_en: string | null; url_pdf: string | null; necesita_3d_especifico: boolean | null };
  type Junta = { id: string; fecha_junta: string | null; celebrada: boolean | null; resultado: string | null; resultado_detalle: string | null; nos_piden_ir?: boolean | null };

  const [cab, necesidades, versiones, viabs, juntas, tres, correos, fotos, docs, distrito, catastro, contactos, comercial, iee] = await Promise.all([
    seguro(() => cabeceraDe(id), null),
    seguro(() => necesidadesDe(id), null),
    leer<Version>(
      `he_versiones_hoja?select=id,codigo_he,numero_version,estado,fecha_emision,viabilidad_id,viabilidad_version,lineas:he_lineas_compromisos(texto,importe,porcentaje,se_cobra,padre_id)` +
        `&oportunidad_id=eq.${id}&estado=not.in.(anulada,sustituida)&order=codigo_he.asc,numero_version.desc`,
    ),
    leer<Viab>(`viabilidades?select=id,version,vigente,viable,enviada_en,url_pdf,necesita_3d_especifico&oportunidad_id=eq.${id}&order=version.desc`),
    // «¿Nos piden ir?» es una columna nueva (27-oct-2026): si aun no esta, se lee sin ella.
    leer<Junta>(`juntas?select=id,fecha_junta,celebrada,resultado,resultado_detalle,nos_piden_ir&oportunidad_id=eq.${id}&order=fecha_junta.desc.nullslast`).catch(() =>
      leer<Junta>(`juntas?select=id,fecha_junta,celebrada,resultado,resultado_detalle&oportunidad_id=eq.${id}&order=fecha_junta.desc.nullslast`),
    ),
    leer<{ estado: string | null; fecha_solicitud: string | null; fecha_necesaria: string | null; fecha_entrega: string | null; enlace_3d: string | null }>(
      `modelos_3d_venta?select=estado,fecha_solicitud,fecha_necesaria,fecha_entrega,enlace_3d&oportunidad_id=eq.${id}&order=fecha_solicitud.desc.nullslast&limit=1`,
    ),
    seguro(() => correosEnviados(null, id), [] as CorreoEnviado[]),
    seguro(async () => (await fotosDeOpp(id)).length, 0),
    seguro(() => cajonDeOpp(id), [] as DocCajon[]),
    g.referenciaCatastral ? seguro(() => distritoDe(g.referenciaCatastral!), null) : Promise.resolve(null),
    g.referenciaCatastral
      ? seguro(() => leer<{ anio: number | null }>(`ficha_catastro?select=anio&referencia=eq.${g.referenciaCatastral!.replace(/\s/g, "").toUpperCase().slice(0, 14)}`), [])
      : Promise.resolve([]),
    g.comunidadId ? seguro(() => contactosDeComunidad(g.comunidadId!), [] as ContactoComunidad[]) : Promise.resolve([] as ContactoComunidad[]),
    g.comercialId ? seguro(() => leer<{ equipo_id: string | null }>(`comerciales?select=equipo_id&id=eq.${g.comercialId}`), []) : Promise.resolve([]),
    g.referenciaCatastral ? seguro(() => ieeDe(g.referenciaCatastral!, id), null) : Promise.resolve(null),
  ]);

  // La viabilidad vigente de la opp (la mas reciente si ninguna esta marcada).
  const vv = viabs.find((v) => v.vigente) ?? viabs[0] ?? null;

  // Una fila por hoja: su version vigente (la mas alta que no esta anulada ni sustituida).
  const vistas = new Set<string>();
  const hojas: HojaFicha[] = [];
  for (const v of versiones) {
    const clave = v.codigo_he ?? v.id;
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    const cobrables = v.lineas.filter((l) => l.se_cobra && l.texto);
    const importe = cobrables.reduce((s, l) => s + (Number(l.importe) || 0), 0);
    // Las hojas de antes no traen importes y marcan poco como cobrable: entonces, todo lo que dice.
    const textos = (importe > 0 ? cobrables : v.lineas.filter((l) => l.texto)).map((l) => corto(l.texto!));
    const pct = cobrables.find((l) => !l.importe && l.porcentaje);
    const fase = faseHe(v.estado);
    hojas.push({
      id: v.id,
      codigo: v.codigo_he,
      version: v.numero_version,
      emitida: v.fecha_emision,
      contenido: [...new Set(textos)].slice(0, 6).join(" + "),
      importe: importe > 0 ? importe : null,
      aPorcentaje: pct ? `+ ${Number(pct.porcentaje).toLocaleString("es-ES")} % si conceden` : null,
      estado: v.estado,
      estadoTexto: fase.texto,
      firmada: !ESPERA_FIRMA.has(v.estado),
      viabilidad: v.viabilidad_id
        ? { id: v.viabilidad_id, version: v.viabilidad_version ?? viabs.find((x) => x.id === v.viabilidad_id)?.version ?? 1, deLaOpp: false }
        : vv
          ? { id: vv.id, version: vv.version, deLaOpp: true }
          : null,
    });
  }
  const firmadas = hojas.filter((h) => h.firmada);

  // El cobro: los hitos de las hojas firmadas.
  let cobro: FichaComercial["cobro"] = null;
  if (firmadas.length) {
    const lineas = await seguro(
      () =>
        leer<{ hitos: { hito: string; importe: number | null; estado: string; porcentaje: number | null }[] }>(
          `lineas_facturacion?select=hitos:hitos_cobro(hito,importe,estado,porcentaje)&he_version_id=in.(${firmadas.map((h) => h.id).join(",")})`,
        ),
      [],
    );
    const hitos = lineas.flatMap((l) => l.hitos);
    const cobrado = hitos.filter((h) => h.estado === "completado").reduce((s, h) => s + (Number(h.importe) || 0), 0);
    const falta = hitos.filter((h) => h.estado !== "completado" && Number(h.importe) > 0);
    cobro = {
      cobrado,
      pendiente: falta.reduce((s, h) => s + (Number(h.importe) || 0), 0),
      queFalta: falta.map((h) => `${PLAZO[h.hito] ?? h.hito} ${euros(Number(h.importe))}`),
      aExito: hojas.some((h) => h.firmada && h.aPorcentaje),
    };
  }

  const j = juntas[0] ?? null;
  const sinResultado = !j || !j.resultado || j.resultado === "pendiente";
  const t = tres[0] ?? null;
  const est = cab?.estado;

  return {
    id,
    codigo: g.codigo,
    direccion: g.direccion,
    distrito,
    anio: catastro[0]?.anio ?? null,
    comercial: g.comercial,
    estado: {
      ganada: est?.ganada ? (est.fechaGanada ?? null) || "sí" : null,
      perdida: !!est?.perdida,
      pausada: !!est?.pausada,
      texto: cab?.falta?.texto ?? null,
      extra: cab?.falta?.extra ?? null,
      motivoCierre: est?.motivoCierre ?? null,
    },
    trajo: g.trajo,
    llegada: g.fechaApertura ?? g.creada,
    quieren: cab?.quieren ?? null,
    admin: g.adminComunidad ? { persona: g.adminComunidad.persona, empresa: g.adminComunidad.empresa, telefono: g.adminComunidad.telefono } : null,
    hablo: g.contacto ? { nombre: g.contacto, telefono: g.contactoTelefono } : null,
    referencia: g.referenciaCatastral,
    necesita: necesidades ? { polycam: necesidades.polycam, viabilidad: necesidades.viabilidad } : null,
    viabilidad: vv ? { id: vv.id, version: vv.version, enviada: vv.enviada_en, viable: vv.viable, pdf: !!vv.url_pdf } : null,
    hojas,
    junta: j
      ? { id: j.id, fecha: j.fecha_junta, celebrada: !!j.celebrada, resultado: j.resultado, detalle: j.resultado_detalle, nosPidenIr: j.nos_piden_ir ?? null }
      : null,
    juntaDeducida: sinResultado && firmadas.length > 0,
    tresD: t || vv?.necesita_3d_especifico
      ? { hace: true, estado: t?.estado ?? null, pedido: t?.fecha_solicitud ?? null, necesario: t?.fecha_necesaria ?? null, entregado: t?.fecha_entrega ?? null, enlace: t?.enlace_3d ?? null }
      : null,
    firma: { fecha: est?.fechaGanada ?? null, codigos: firmadas.map((h) => h.codigo ?? "").filter(Boolean) },
    cobro,
    diario: g.diario.slice(0, 12).map((d) => ({ fecha: d.fecha, texto: d.texto, quien: d.comoFue === "ficha de Dropbox" ? null : d.con })),
    correos,
    iee: iee ? [iee.fecha ? iee.fecha.split("-").reverse().join("/") : null, iee.valoracion?.toLowerCase()].filter(Boolean).join(" · ") || "sí" : null,
    contactos,
    fotos,
    documentos: docs.filter((d) => d.tipo),
    agendaComercial: comercial[0]?.equipo_id ?? null,
  };
}
