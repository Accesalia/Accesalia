// lib/bloqueDocumentacion.ts
//
// EL BLOQUE 2 DE UNA OPORTUNIDAD: DOCUMENTACION (Monica, 6-oct-2026). "El
// taller. Aqui esta el trabajo de verdad y aqui hay que quitar friccion"
// (esqueleto del 29-sep, docs/figma/gestion-oportunidad-gris.html).
//
// No guarda nada nuevo: junta en una vista lo que ya vive en su sitio -la
// viabilidad (mesa de Alex y parte del comercial), el 3D, el presupuesto de
// Factusol y las hojas de encargo- para ver de un vistazo que esta listo, que
// falta y que no ha salido.

import "server-only";
import { fotosDeOportunidad, type Foto } from "./fotos";
import { firmadasDeOpp, hojasDeOpp, superadaPor, type HojaHe } from "./hojasOpp";
import type { DocCajon } from "./cajonDocumentos";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
const leer = async <T>(path: string): Promise<T> => {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
};

export type ViabilidadResumen = {
  id: string;
  numero: string | null;
  version: number;
  /** en_mesa: Alex la esta haciendo · rematar: Alex termino, le toca al comercial
   *  · generada: tiene PDF. */
  fase: "en_mesa" | "rematar" | "generada";
  redacta: string | null;
  generadaEl: string | null;
  superadaPor: string | null;
  modelo: string | null;
  especifico: boolean;
  /** Informe de antes de la app, traido del Drive (ruta_drive): solo se ve
   *  su PDF, no se regenera (Monica, 26-oct-2026). */
  historica: boolean;
};

/** Los presupuestos hechos en la app (10-oct-2026): PR-año-numero o borrador. */
export type PresupuestoApp = { id: string; codigo: string | null; fecha: string | null; base: number; generado: boolean };

export type Documentacion = {
  viabilidad: ViabilidadResumen | null;
  presupuestos: PresupuestoApp[];
  /** Las hojas de la opp (sistema nuevo, del lector unico), con lo que toca hacer en su fase. */
  hojasNuevas: HojaHe[];
  /** Las hojas firmadas archivadas en la opp que el comercial aun no ha validado, y el enlace de cada firmada (por id). */
  firmadas: { porValidar: DocCajon[]; enlace: Record<string, { nombre: string; url: string | null }> };
  /** Las fotografias de la oportunidad: las de las notas del comercial, que
   *  son del repositorio comun y las ven tecnicos y administrativas (8-oct). */
  fotos: (Foto & { fecha: string })[];
};

export async function documentacionDe(oppId: string): Promise<Documentacion> {
  const [viabs, fotos, deLaApp, hojasNuevas, firmadas] = await Promise.all([
    leer<{
      id: string; numero: string | null; version: number; url_pdf: string | null; enviada_en: string | null; rematada_en: string | null; con_honorarios: boolean;
      ruta_drive: string | null; necesita_3d_especifico: boolean; redacta: { nombre: string } | null; modelo: { codigo: string; nombre: string } | null;
    }[]>(
      `viabilidades?select=id,numero,version,url_pdf,enviada_en,rematada_en,con_honorarios,ruta_drive,necesita_3d_especifico,redacta:redacta_id(nombre),` +
        `modelo:modelo_escalera_id(codigo,nombre)&oportunidad_id=eq.${oppId}&vigente=is.true&order=creado_en.desc&limit=1`,
    ),
    // Si las fotos fallan, la documentacion se sigue viendo.
    fotosDeOportunidad(oppId).catch(() => []),
    // Los que se hacen ya en la app; los generados en retrospectiva para
    // compararlos con Factusol no tienen codigo y no salen.
    leer<{ id: string; codigo: string | null; fecha: string | null; base: number | null; url_pdf: string | null }[]>(
      `presupuestos?select=id,codigo,fecha,base,url_pdf&oportunidad_id=eq.${oppId}&origen=eq.app&or=(codigo.not.is.null,estado.eq.borrador)&order=creado_en.desc`,
    ).catch(() => []),
    // Si las hojas nuevas fallan, el bloque se sigue viendo (y queda en los registros).
    hojasDeOpp(oppId).catch((e) => { console.error("hojasDeOpp", oppId, e); return [] as HojaHe[]; }),
    firmadasDeOpp(oppId).catch((e) => { console.error("firmadasDeOpp", oppId, e); return { porValidar: [] as DocCajon[], todas: new Map<string, DocCajon>() }; }),
  ]);

  const v = viabs[0];
  // «Modificada en hoja de encargo X»: calculada (lib/hojasOpp.ts), no guardada.
  const superada = v ? await superadaPor(oppId, v.rematada_en, v.con_honorarios).catch(() => null) : null;
  const viabilidad: ViabilidadResumen | null = v
    ? {
        id: v.id,
        numero: v.numero,
        version: v.version,
        fase: v.url_pdf ? "generada" : v.enviada_en ? "rematar" : "en_mesa",
        redacta: v.redacta?.nombre ?? null,
        generadaEl: v.rematada_en,
        superadaPor: superada,
        modelo: v.modelo ? `${v.modelo.codigo} · ${v.modelo.nombre}` : null,
        especifico: v.necesita_3d_especifico,
        historica: !!v.ruta_drive,
      }
    : null;

  const presus = deLaApp.map((p) => ({ id: p.id, codigo: p.codigo, fecha: p.fecha, base: Number(p.base) || 0, generado: !!p.url_pdf }));
  const enlace = Object.fromEntries([...firmadas.todas].map(([id, d]) => [id, { nombre: d.nombre, url: d.url }]));
  return { viabilidad, presupuestos: presus, hojasNuevas, firmadas: { porValidar: firmadas.porValidar, enlace }, fotos };
}
