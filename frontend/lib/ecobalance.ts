import "server-only";
import { FASES_FIRMADA, fechasDeFirma, filtroFases, numeroHoja } from "./hojasNuevas";
import { nombreDeOpp } from "./direccionOpp";
// lib/ecobalance.ts
//
// LO DE ECOBALANCE (Monica, 12-oct-2026). Lo ven Ana, Daniel y Monica; nadie
// mas. Ana tiene dos listas de direcciones: cuando se firma una hoja de encargo
// que incluye 3 PRESUPUESTOS, o una linea de CAES, le aparece. La gestion se
// diseña despues; esto es lo basico. Para Alexandra esas lineas no existen
// (lib/cobros.ts las filtra por emisor): "para ella es como si fuera gratis".

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function todo<T>(ruta: string): Promise<T[]> {
  const out: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { headers: { ...CAB, Range: `${desde}-${desde + 999}` }, cache: "no-store" });
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    const t = (await r.json()) as T[];
    out.push(...t);
    if (t.length < 1000) return out;
  }
}

export type ListaEcobalance = "3pp" | "caes";
const BLOQUE: Record<ListaEcobalance, string> = { "3pp": "SOLICITUD Y ANÁLISIS DE PRESUPUESTOS", caes: "GESTIÓN DE CAES" };

export type FilaEcobalance = {
  hojaId: string;
  numeroHoja: string | null;
  firmada: string | null;
  oppId: string | null;
  codigo: string | null;
  direccion: string;
  municipio: string | null;
  comercial: string | null;
  /** Lo que dice la hoja: "3 % del PEM, a exito", "632 €", o "incluido". */
  precio: string;
};

export async function listaEcobalance(lista: ListaEcobalance): Promise<FilaEcobalance[]> {
  const bloque = encodeURIComponent(BLOQUE[lista]);
  type Hoja = {
    id: string;
    numero_hoja: string | null;
    fecha_firma: string | null;
    estado: string;
    opp: { id: string; codigo: string | null; nombre: string | null; comunidad_provisional: string | null; comunidad: { nombre: string; municipio: string | null } | null; comercial: { nombre: string } | null } | null;
  };
  // Hojas nuevas (dia de la migracion): las lineas de ese bloque en las hojas firmadas; las que no se cobran, «incluido».
  type Cruda = { se_cobra: boolean; importe: number | null; porcentaje: number | null;
    version: { id: string; codigo_he: string | null; numero_version: number; estado: string; opp: Hoja["opp"] } | null };
  const crudas = await todo<Cruda>(
    `he_lineas_compromisos?select=se_cobra,importe,porcentaje,bloque:bloque_id!inner(nombre),` +
      `version:version_id!inner(id,codigo_he,numero_version,estado,opp:oportunidad_id(id,codigo,nombre,comunidad_provisional,comunidad:comunidad_id(nombre,municipio),comercial:comercial_id(nombre)))` +
      `&bloque.nombre=eq.${bloque}&version.estado=${filtroFases(FASES_FIRMADA)}`,
  );
  const firma = await fechasDeFirma(crudas.map((c) => c.version?.id).filter((x): x is string => !!x));
  const aHoja = (v: NonNullable<Cruda["version"]>): Hoja => ({ id: v.id, numero_hoja: numeroHoja(v), fecha_firma: firma.get(v.id) ?? null, estado: "devuelta_firmada", opp: v.opp });
  const lineas = crudas.filter((c) => c.se_cobra && c.version).map((c) => ({ importe: c.importe, es_porcentaje: c.importe == null && c.porcentaje != null, porcentaje: c.porcentaje, hoja: aHoja(c.version!) }));
  const conceptos = crudas.filter((c) => !c.se_cobra && c.version).map((c) => ({ hoja: aHoja(c.version!) }));

  // Una fila por hoja firmada; lo que diga su linea de cobro, si la tiene.
  const filas = new Map<string, FilaEcobalance>();
  const fila = (h: Hoja, precio: string) => {
    const o = h.opp;
    filas.set(h.id, {
      hojaId: h.id,
      numeroHoja: h.numero_hoja,
      firmada: h.fecha_firma,
      oppId: o?.id ?? null,
      codigo: o?.codigo ?? null,
      direccion: nombreDeOpp(o),
      municipio: o?.comunidad?.municipio ?? null,
      comercial: o?.comercial?.nombre ?? null,
      precio,
    });
  };
  for (const c of conceptos) if (c.hoja?.estado === "devuelta_firmada" && !filas.has(c.hoja.id)) fila(c.hoja, "incluido");
  for (const l of lineas)
    if (l.hoja?.estado === "devuelta_firmada")
      fila(l.hoja, l.es_porcentaje ? `${Number(l.porcentaje ?? 0).toLocaleString("es-ES")} % del PEM, a éxito` : l.importe != null ? `${Number(l.importe).toLocaleString("es-ES")} €` : "a éxito");

  // Lo ultimo firmado, arriba.
  return [...filas.values()].sort((a, b) => (b.firmada ?? "").localeCompare(a.firmada ?? ""));
}
