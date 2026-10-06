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
import { datosHoja, type Documento } from "./hojaEncargo";

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
};

export type HojaResumen = {
  id: string;
  numero: number;
  codigo: string | null;
  titulo: string;
  fecha: string | null;
  estado: string;
  enBorrador: boolean;
  importe: number;
  /** El ultimo PDF generado, para "ver". */
  ver: Documento | null;
  presupuesto: { numero: string | null; enlace: string | null } | null;
};

export type Documentacion = {
  viabilidad: ViabilidadResumen | null;
  hojas: HojaResumen[];
};

export async function documentacionDe(oppId: string, comunidadId: string | null): Promise<Documentacion> {
  const [viabs, datos, presupuestos] = await Promise.all([
    leer<{
      id: string; numero: string | null; version: number; url_pdf: string | null; enviada_en: string | null; rematada_en: string | null;
      necesita_3d_especifico: boolean; redacta: { nombre: string } | null; modelo: { codigo: string; nombre: string } | null;
      superada: { numero_version: number; hoja: { numero_hoja: string | null } | null } | null;
    }[]>(
      `viabilidades?select=id,numero,version,url_pdf,enviada_en,rematada_en,necesita_3d_especifico,redacta:redacta_id(nombre),` +
        `modelo:modelo_escalera_id(codigo,nombre),superada:superada_por_version_id(numero_version,hoja:hoja_encargo_id(numero_hoja))` +
        `&oportunidad_id=eq.${oppId}&order=creado_en.desc&limit=1`,
    ),
    comunidadId ? datosHoja(comunidadId) : Promise.resolve(null),
    // El presupuesto lo emite Factusol; la app solo guarda su numero y su PDF,
    // en la version de la hoja a la que acompaña.
    leer<{ id: string; numero_hoja: string | null; versiones: { numero_version: number; numero_presupuesto: string | null; url_pdf_presupuesto: string | null }[] }[]>(
      `hojas_encargo?select=id,numero_hoja,versiones:versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(numero_version,numero_presupuesto,url_pdf_presupuesto)` +
        `&oportunidad_id=eq.${oppId}&estado=neq.anulada`,
    ),
  ]);

  const v = viabs[0];
  const viabilidad: ViabilidadResumen | null = v
    ? {
        id: v.id,
        numero: v.numero,
        version: v.version,
        fase: v.url_pdf ? "generada" : v.enviada_en ? "rematar" : "en_mesa",
        redacta: v.redacta?.nombre ?? null,
        generadaEl: v.rematada_en,
        superadaPor: v.superada ? `${v.superada.hoja?.numero_hoja ?? "una hoja posterior"} v${v.superada.numero_version}` : null,
        modelo: v.modelo ? `${v.modelo.codigo} · ${v.modelo.nombre}` : null,
        especifico: v.necesita_3d_especifico,
      }
    : null;

  const extra = new Map(presupuestos.map((h) => [h.id, h]));
  const hojas: HojaResumen[] = (datos?.hojas ?? [])
    .filter((h) => h.oportunidadId === oppId)
    .map((h, i) => {
      const x = extra.get(h.id);
      const ultima = x ? [...x.versiones].sort((a, b) => a.numero_version - b.numero_version).at(-1) : undefined;
      const conPresupuesto = x?.versiones.filter((p) => p.numero_presupuesto || p.url_pdf_presupuesto).sort((a, b) => a.numero_version - b.numero_version).at(-1);
      const p = conPresupuesto ?? ultima;
      return {
        id: h.id,
        numero: i + 1,
        codigo: x?.numero_hoja ?? null,
        titulo: h.titulo,
        fecha: h.fecha,
        estado: h.estado,
        enBorrador: !!h.version?.borrador,
        importe: h.importe,
        ver: h.documentos.filter((d) => d.tipo === "generada").at(-1) ?? null,
        presupuesto:
          p && (p.numero_presupuesto || p.url_pdf_presupuesto)
            ? { numero: p.numero_presupuesto, enlace: p.url_pdf_presupuesto?.startsWith("http") ? p.url_pdf_presupuesto : null }
            : null,
      };
    });

  return { viabilidad, hojas };
}
