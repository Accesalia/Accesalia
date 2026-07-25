// lib/visita.ts
//
// Actas de visita de obra (capa 2, paso 1). El acta se GENERA en la app: la
// cabecera se auto-rellena con datos que ya existen; el tecnico solo escribe el
// texto y sube fotos.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function rest<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

/** URL publica de una foto del bucket 'actas'. */
export function fotoUrl(storagePath: string): string {
  return `${URL_BASE}/storage/v1/object/public/actas/${storagePath}`;
}

// ---- Tipos ----

export type FotoActa = { id: string; storage_path: string; orden: number; pie: string | null };

export type Visita = {
  id: string;
  obra_id: string;
  numero: number | null;
  fecha_visita: string;
  texto_acta: string | null;
  autor_tecnico_id: string | null;
  enviada: boolean;
  fecha_enviada: string | null;
  equipo: { nombre: string; titulacion: string | null } | null;
  fotos_acta: FotoActa[];
};

const SELECT_VISITA =
  "id,obra_id,numero,fecha_visita,texto_acta,autor_tecnico_id,enviada,fecha_enviada," +
  "equipo:autor_tecnico_id(nombre,titulacion),fotos_acta(id,storage_path,orden,pie)";

/** Visitas de una obra (mas reciente primero). */
export async function visitasDeObra(obraId: string): Promise<Visita[]> {
  const vs = await rest<Visita[]>(`visitas_obra?select=${SELECT_VISITA}&obra_id=eq.${obraId}&order=fecha_visita.desc`);
  for (const v of vs) v.fotos_acta = (v.fotos_acta ?? []).sort((a, b) => a.orden - b.orden);
  return vs;
}

// ---- Datos completos para RENDERIZAR el acta (cabecera auto-rellena) ----

export type ActaData = {
  visita: Visita;
  comunidadNombre: string;
  direccion: string | null;
  cliente: string | null; // EMPRESA/CLIENTE (pagador: CDAD/FAIN...)
  contacto: string | null; // CONTACTO/COMERCIAL (admin / comercial)
  tipoObra: string | null;
  contrata: string | null; // la constructora que ejecuta
  jefeObra: string | null;
  df: { nombre: string; titulacion: string | null } | null; // direccion facultativa (firma)
};

type VisitaCruda = Visita & {
  obras: {
    jefe_obra: string | null;
    constructora: string | null;
    contratas: { nombre: string } | null;
    proyectos: {
      tipo: string | null;
      pagador: string | null;
      comercial_interno: string | null;
      comunidad_id: string;
      comunidades: { nombre: string; direccion: string | null; municipio: string | null } | null;
      proyecto_tipos: { tipos_proyecto: { nombre: string } }[];
    } | null;
  } | null;
};

/** Todo lo necesario para pintar el acta de una visita. */
export async function actaData(visitaId: string): Promise<ActaData | null> {
  const filas = await rest<VisitaCruda[]>(
    `visitas_obra?select=${SELECT_VISITA},` +
      "obras(jefe_obra,constructora,contratas:constructora_contrata_id(nombre)," +
      "proyectos(tipo,pagador,comercial_interno,comunidad_id,comunidades(nombre,direccion,municipio)," +
      "proyecto_tipos(tipos_proyecto(nombre))))" +
      `&id=eq.${visitaId}&limit=1`,
  );
  const v = filas[0];
  if (!v) return null;
  const o = v.obras;
  const p = o?.proyectos;
  const c = p?.comunidades;
  const tipos = (p?.proyecto_tipos ?? []).map((t) => t.tipos_proyecto?.nombre).filter(Boolean);

  // La direccion facultativa (firmante) = Daniel, de equipo (con su titulacion/COAM).
  const df = (await rest<{ nombre: string; titulacion: string | null }[]>(
    "equipo?select=nombre,titulacion&nombre=eq.Daniel&limit=1",
  ))[0] ?? null;

  const visita: Visita = { ...v };
  return {
    visita,
    comunidadNombre: c?.nombre ?? "—",
    direccion: [c?.direccion, c?.municipio].filter(Boolean).join(", ") || null,
    cliente: p?.pagador ?? null,
    contacto: p?.comercial_interno ?? null,
    tipoObra: tipos.length ? tipos.join(" + ") : p?.tipo ?? null,
    contrata: o?.contratas?.nombre ?? o?.constructora ?? null,
    jefeObra: o?.jefe_obra ?? null,
    df,
  };
}

// ---- Destinatarios "a informar" ----

export type Destinatario = { id: string; tipo: string; nombre: string | null; email: string; activo: boolean };

export function destinatariosDeComunidad(comunidadId: string): Promise<Destinatario[]> {
  return rest<Destinatario[]>(
    `destinatarios_informe?select=id,tipo,nombre,email,activo&comunidad_id=eq.${comunidadId}&order=tipo.asc`,
  );
}

export const TIPO_DESTINATARIO: Record<string, string> = {
  contrata: "Contrata",
  administrador: "Administrador",
  presidente: "Presidente",
  otro: "Otro",
};

// ---- Cadencia / alertas de visitas (por comunidad, para el detalle y el panel) ----

export type VisitaObraCadencia = {
  obraId: string;
  proyectoId: string;
  comunidadId: string;
  comunidadNombre: string;
  municipio: string | null;
  ultimaVisita: string | null;
  diasDesdeUltima: number | null;
  cadenciaDias: number | null;
  actasSinEnviar: number;
  visitaSinEnviarMasVieja: string | null;
};

type ObraCruda = {
  id: string;
  proyecto_id: string;
  cadencia_dias: number | null;
  proyectos: { comunidad_id: string; comunidades: { nombre: string; municipio: string | null } | null } | null;
  visitas_obra: { fecha_visita: string; enviada: boolean }[];
};

function diasDesde(v: string | null): number | null {
  if (!v) return null;
  const d = Math.floor((Date.now() - new Date(v).getTime()) / 86400000);
  return d >= 0 ? d : null;
}

/** Obras en curso con su cadencia de visitas (para vigilar actas al dia). */
export async function cadenciaVisitas(): Promise<VisitaObraCadencia[]> {
  const filas = await rest<ObraCruda[]>(
    "obras?select=id,proyecto_id,cadencia_dias," +
      "proyectos(comunidad_id,comunidades(nombre,municipio))," +
      "visitas_obra(fecha_visita,enviada)&estado=in.(en_curso,pendiente_inicio,paralizada)&limit=2000",
  );
  return filas
    .map((o) => {
      const vs = o.visitas_obra ?? [];
      const fechas = vs.map((x) => x.fecha_visita).sort();
      const ultima = fechas[fechas.length - 1] ?? null;
      const sinEnviar = vs.filter((x) => !x.enviada);
      const sinEnviarFechas = sinEnviar.map((x) => x.fecha_visita).sort();
      return {
        obraId: o.id,
        proyectoId: o.proyecto_id,
        comunidadId: o.proyectos?.comunidad_id ?? "",
        comunidadNombre: o.proyectos?.comunidades?.nombre ?? "—",
        municipio: o.proyectos?.comunidades?.municipio ?? null,
        ultimaVisita: ultima,
        diasDesdeUltima: diasDesde(ultima),
        cadenciaDias: o.cadencia_dias,
        actasSinEnviar: sinEnviar.length,
        visitaSinEnviarMasVieja: sinEnviarFechas[0] ?? null,
      };
    })
    .sort((a, b) => (b.diasDesdeUltima ?? -1) - (a.diasDesdeUltima ?? -1));
}
