// lib/bloquesDecisionCierre.ts
//
// LOS BLOQUES 3 Y 4 DE UNA OPORTUNIDAD, EN CRUDO (Monica, 15-oct-2026): "prefiero
// verlos ahi y cambiarlos desde ahi, no me importa que esten feos, o que no esten
// aun con la fontaneria conectada, pero quiero ver que campos tienen, para saber
// si existen".
//
// Solo lee. Junta lo que ya vive en su sitio: el ok de Daniel a cada hoja y las
// hojas firmadas con su version (sistema nuevo, he_versiones_hoja + he_estados_hoja,
// 25-oct-2026), los hitos de cobro de lo firmado (por la ficha de facturacion de
// cada linea), los cierres y los recordatorios. Las juntas ya vienen en
// gestionOportunidad.

import "server-only";
import { FIRMADA } from "./hojasOpp";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
const leer = async <T>(path: string): Promise<T> => {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
};

/** Un paso del ok de Daniel a una hoja: se pidio (al generarla), lo dio o pidio cambios. */
export type RevisionOferta = { clave: string; hoja: string; estado: "pendiente" | "ok" | "cambios"; fecha: string; quien: string | null; nota: string | null };
export type HojaCierre = {
  id: string;
  /** «HE-2026-0012 v2» */
  codigo: string;
  /** Lo que contiene: los tipos (desglose) de sus lineas, sin repetir (29-oct-2026). */
  tipos: string[];
  fase: string;
  fecha_firma: string | null;
  /** El porque de no firmada o anulada (la nota de su paso). */
  motivo_sin_firma: string | null;
  /** Lo que se cobra con importe (no se guarda: se suma). */
  importe: number;
  /** La validacion del comercial: bien firmada, ultima version enviada y sin retocar (ok_comercial). */
  verificada: { fecha: string; quien: string | null } | null;
};
export type HitoCobroCierre = {
  hito: string;
  orden: number | null;
  importe: number | null;
  estado: string | null;
  fecha_factura: string | null;
  fecha_cobro: string | null;
  numero_factura: string | null;
};
export type CierreOpp = { resultado_final: string | null; motivo_perdido: string | null; notas: string | null; fecha_cierre: string | null };
export type Recordatorio = { texto: string; fecha_limite: string | null; estado: string | null };

export type DecisionCierre = {
  revisiones: RevisionOferta[];
  hojas: HojaCierre[];
  cobros: HitoCobroCierre[];
  cierres: CierreOpp[];
  recordatorios: Recordatorio[];
};

type FilaVersion = {
  id: string; codigo_he: string | null; numero_version: number; estado: string;
  estados: { estado: string; fecha: string; nota: string | null; persona: { nombre: string } | null }[];
  lineas: { id: string; padre_id: string | null; se_cobra: boolean; importe: number | null; desglosar_precios: boolean | null; bloque: { codigo: string } | null; desglose: { nombre: string } | null }[];
};

export async function decisionCierreDe(id: string): Promise<DecisionCierre> {
  const vacio = <T>() => [] as T[];
  const [versiones, cierres, recordatorios] = await Promise.all([
    leer<FilaVersion[]>(
      `he_versiones_hoja?select=id,codigo_he,numero_version,estado,estados:he_estados_hoja(estado,fecha,nota,persona:persona_id(nombre)),` +
        `lineas:he_lineas_compromisos(id,padre_id,se_cobra,importe,desglosar_precios,bloque:bloque_id(codigo),desglose:desglose_id(nombre))&oportunidad_id=eq.${id}&order=creado_en.asc`,
    ).catch(vacio<FilaVersion>),
    leer<CierreOpp[]>(
      `motivo_cierre_oportunidad?select=resultado_final,motivo_perdido,notas,fecha_cierre&oportunidad_id=eq.${id}&order=creado_en.desc`,
    ).catch(vacio<CierreOpp>),
    leer<Recordatorio[]>(
      `tareas_seguimiento?select=texto,fecha_limite,estado&oportunidad_id=eq.${id}&order=fecha_limite.asc.nullslast`,
    ).catch(vacio<Recordatorio>),
  ]);
  const nombre = (v: FilaVersion) => (v.codigo_he ? `${v.codigo_he} v${v.numero_version}` : "sin código");
  const OK: Record<string, RevisionOferta["estado"]> = { pendiente_ok_daniel: "pendiente", ok_daniel: "ok", cambios_daniel: "cambios" };
  const revisiones: RevisionOferta[] = versiones
    .flatMap((v) => v.estados.filter((e) => OK[e.estado]).map((e) => ({ clave: `${v.id}-${e.fecha}`, hoja: nombre(v), estado: OK[e.estado], fecha: e.fecha, quien: e.persona?.nombre ?? null, nota: e.nota })))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const importeDe = (v: FilaVersion) => {
    const porId = new Map(v.lineas.map((l) => [l.id, l]));
    const soloTotal = (l: FilaVersion["lineas"][number]) => l.bloque?.codigo === "PROYECTO CONJUNTO" && l.desglosar_precios === false;
    return v.lineas.reduce((t, l) => {
      if (!l.se_cobra || (l.padre_id && soloTotal(porId.get(l.padre_id)!))) return t;
      return t + (soloTotal(l) ? v.lineas.filter((h) => h.padre_id === l.id).reduce((s, h) => s + (Number(h.importe) || 0), 0) : Number(l.importe) || 0);
    }, 0);
  };
  const ultimo = (v: FilaVersion, e: string) => [...v.estados].filter((x) => x.estado === e).sort((a, b) => b.fecha.localeCompare(a.fecha))[0] ?? null;
  const hojas: HojaCierre[] = versiones.map((v) => {
    const firma = v.estados.filter((e) => e.estado === "firmada_recibida").map((e) => e.fecha).sort()[0] ?? null;
    const sin = v.estado === "no_firmada" || v.estado === "anulada" ? ultimo(v, v.estado) : null;
    const ok = ultimo(v, "ok_comercial");
    return {
      id: v.id, codigo: nombre(v), tipos: [...new Set(v.lineas.map((l) => l.desglose?.nombre).filter((x): x is string => !!x))], fase: v.estado, fecha_firma: FIRMADA.includes(v.estado) ? firma : null,
      motivo_sin_firma: sin?.nota ?? null, importe: importeDe(v), verificada: ok ? { fecha: ok.fecha, quien: ok.persona?.nombre ?? null } : null,
    };
  });

  const firmadas = hojas.filter((h) => h.fecha_firma).map((h) => h.id);
  const cobros = firmadas.length
    ? await leer<{ hitos: HitoCobroCierre[] }[]>(
        // Por «de que hoja es» (todas las fichas la tienen), como facturacion (Monica, 26-oct-2026).
        `lineas_facturacion?select=hitos:hitos_cobro(hito,orden,importe,estado,fecha_factura,fecha_cobro,numero_factura)` +
          `&he_version_id=in.(${firmadas.join(",")})&quitada_en=is.null`,
      )
        .then((ls) => ls.flatMap((l) => l.hitos).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)))
        .catch(vacio<HitoCobroCierre>)
    : [];
  return { revisiones, hojas, cobros, cierres, recordatorios };
}
