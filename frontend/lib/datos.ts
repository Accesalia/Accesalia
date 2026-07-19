// lib/datos.ts
//
// Acceso a datos SOLO de servidor. Usa la clave SECRETA de Supabase (service
// role) contra la REST API local. Las tablas tienen RLS activo sin politicas,
// asi que la clave publica no ve nada: leemos desde el servidor con la secreta,
// que NUNCA se envia al navegador (este modulo solo se importa en Server
// Components). Cuando montemos auth, migraremos a politicas RLS por usuario.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function rest<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: {
      apikey: SECRETO,
      Authorization: `Bearer ${SECRETO}`,
    },
    cache: "no-store",
  });
  if (!r.ok) {
    throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  }
  return r.json() as Promise<T>;
}

// ---- Tipos del dominio (forma real de los borradores de la IA) ----

export type Convocatoria = {
  id: string;
  entidad: string;
  plan: string;
  anio: number;
  fecha_apertura: string | null;
  fecha_cierre: string | null;
};

export type Requisito = {
  identificador: string;
  descripcion: string;
  texto_literal: string;
};

export type TipoCompletitud = "simple" | "partes" | "multiple" | "alternativa";

export type GrupoFase = "solicitud" | "justificacion" | "otros";

export type Casilla = {
  documento: string;
  tipo_completitud: TipoCompletitud;
  partes: string[];
  cardinalidad: number;
  alternativas: string[];
  agrupado_con: string;
  notas: string;
  // Enriquecido en el servidor cruzando con el prompt 1 (que si trae la fase).
  fase: string;
  grupo: GrupoFase;
};

export type Documento = {
  nombre: string;
  fase: string;
  obligatoriedad: string;
  categoria: string;
  texto_literal: string;
};

export type BorradorPrompt1 = {
  explicacion?: string;
  resumen_convocatoria?: string;
  requisitos_a_cumplir: Requisito[];
  documentacion_necesaria: Documento[];
};

export type BorradorPrompt2 = {
  explicacion?: string;
  casillas: Casilla[];
};

export type Extraccion = {
  convocatoria_id: string;
  estado: string;
  fecha_extraccion: string | null;
  borrador_prompt1: BorradorPrompt1 | null;
  borrador_prompt2: BorradorPrompt2 | null;
};

export type VisorConvocatoria = {
  convocatoria: Convocatoria;
  extraccion: Extraccion;
};

// ---- Cruce de fase (prompt 1 -> casillas del prompt 2) ----
//
// Las casillas (prompt 2) no llevan la fase; los documentos (prompt 1) si. El
// prompt 2 a veces ACORTA el nombre (quita parentesis), asi que casamos por
// nombre normalizado con tolerancia a prefijo. Cubre los 38/38 de la convocatoria
// de prueba.

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function grupoDeFase(fase: string): GrupoFase {
  if (fase === "solicitud") return "solicitud";
  if (fase === "justificacion") return "justificacion";
  return "otros";
}

function faseDeCasilla(nombreCasilla: string, docs: Documento[]): string {
  const nc = normalizar(nombreCasilla);
  const exacto = docs.find((x) => normalizar(x.nombre) === nc);
  if (exacto) return exacto.fase;
  const prefijo = docs.find((x) => {
    const nx = normalizar(x.nombre);
    return nx.startsWith(nc) || nc.startsWith(nx);
  });
  if (prefijo) return prefijo.fase;
  const clave = nc.split(" ").slice(0, 6).join(" ");
  const parcial = docs.find((x) => normalizar(x.nombre).startsWith(clave));
  return parcial?.fase ?? "otra";
}

function enriquecerCasillas(ext: Extraccion): void {
  const docs = ext.borrador_prompt1?.documentacion_necesaria ?? [];
  const casillas = ext.borrador_prompt2?.casillas ?? [];
  for (const c of casillas) {
    c.fase = faseDeCasilla(c.documento, docs);
    c.grupo = grupoDeFase(c.fase);
  }
}

// ---- Consultas ----

/** Ultima convocatoria con extraccion (para arrancar el visor sin elegir). */
export async function ultimaConvocatoriaConExtraccion(): Promise<string | null> {
  const filas = await rest<{ convocatoria_id: string }[]>(
    "extracciones_convocatoria?select=convocatoria_id,creado_en&order=creado_en.desc&limit=1",
  );
  return filas[0]?.convocatoria_id ?? null;
}

export type ConvocatoriaResumen = {
  id: string;
  entidad: string;
  plan: string;
  anio: number;
  fecha_cierre: string | null;
  estado: string | null;
  abierta: boolean; // hoy <= fecha_cierre (o cierre desconocido)
};

/** Todas las convocatorias (para el selector), con estado de extraccion y si estan abiertas. */
export async function listarConvocatorias(): Promise<ConvocatoriaResumen[]> {
  const [convs, exts] = await Promise.all([
    rest<{ id: string; entidad: string; plan: string; anio: number; fecha_cierre: string | null }[]>(
      "convocatorias?select=id,entidad,plan,anio,fecha_cierre&order=creado_en.desc",
    ),
    rest<{ convocatoria_id: string; estado: string }[]>(
      "extracciones_convocatoria?select=convocatoria_id,estado",
    ),
  ]);
  const estados = new Map(exts.map((e) => [e.convocatoria_id, e.estado]));
  const hoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return convs.map((c) => ({
    ...c,
    estado: estados.get(c.id) ?? null,
    // Cerrada solo si hay fecha de cierre y ya paso. Cierre desconocido -> abierta.
    abierta: !c.fecha_cierre || c.fecha_cierre >= hoy,
  }));
}

/** Datos completos para pintar la pantalla-objetivo de una convocatoria. */
export async function visorDeConvocatoria(
  convocatoriaId: string,
): Promise<VisorConvocatoria | null> {
  const [convs, exts] = await Promise.all([
    rest<Convocatoria[]>(
      `convocatorias?select=id,entidad,plan,anio,fecha_apertura,fecha_cierre&id=eq.${convocatoriaId}`,
    ),
    rest<Extraccion[]>(
      `extracciones_convocatoria?select=convocatoria_id,estado,fecha_extraccion,borrador_prompt1,borrador_prompt2&convocatoria_id=eq.${convocatoriaId}`,
    ),
  ]);
  if (!convs[0] || !exts[0]) return null;
  enriquecerCasillas(exts[0]);
  return { convocatoria: convs[0], extraccion: exts[0] };
}
