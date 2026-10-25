import "server-only";
// lib/hojasOpp.ts
//
// LAS HOJAS DE ESTA OPP (Monica, 25-oct-2026): el UNICO lector de las hojas de encargo del sistema nuevo para el resto de
// la app. Lo que el resto pregunta de una hoja —en que fase esta, si esta parada, cuando se envio o se firmo, cuanto se
// firmo, donde esta su PDF— sale de aqui y solo de aqui (he_versiones_hoja + he_estados_hoja + he_lineas_compromisos),
// para que un cambio en la hoja se toque en un sitio y no en trece.
//   - Una HOJA es su codigo HE (o un borrador que aun no lo tiene); sus VERSIONES, las filas de he_versiones_hoja.
//     La actual es la ultima que no esta sustituida.
//   - La FASE es he_versiones_hoja.estado. La PAUSA va aparte (25-oct): trabajo parado = hay una «pausada» sin
//     «reanudada» detras; con «pausa_levantada» entre medias esta «para reanudar», pero sigue parada.
//   - El IMPORTE no se guarda: lo que se cobra con importe (el conjunto con «solo el total», la suma de sus proyectos).

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
const leer = async <T>(path: string): Promise<T> => {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
};

/** Como se dice cada fase, con su color (los mismos tonos que la lista de hojas de antes). */
const AMBAR = "border-[#f0d78c] bg-[#fdf6e3] text-[#8a5a00]";
const VERDE = "border-lima bg-lima-soft text-lima-dark";
const GRIS = "border-black/15 bg-hueso text-carbon/70";
const ROJO = "border-alerta/40 bg-[#fbeeee] text-alerta";
export const FASE_HE: Record<string, { texto: string; clase: string }> = {
  borrador: { texto: "Borrador", clase: "border-dashed border-carbon/30 bg-white text-carbon/60" },
  pendiente_ok_daniel: { texto: "Pendiente del ok de Daniel", clase: AMBAR },
  cambios_daniel: { texto: "Daniel pide cambios", clase: ROJO },
  ok_daniel: { texto: "Ok de Daniel · lista para enviar", clase: VERDE },
  enviada: { texto: "Enviada, sin firmar", clase: AMBAR },
  firmada_recibida: { texto: "Firmada recibida", clase: VERDE },
  firma_con_errores: { texto: "Firma con errores", clase: ROJO },
  ok_comercial: { texto: "Firmada · en facturación", clase: VERDE },
  hitos_validados: { texto: "Firmada · hitos validados", clase: VERDE },
  primer_cobro: { texto: "Firmada · a cobro", clase: VERDE },
  a_produccion: { texto: "Firmada · a producción", clase: VERDE },
  ok_administracion: { texto: "Firmada · en producción", clase: VERDE },
  cambios_comunidad: { texto: "La comunidad pide cambios", clase: AMBAR },
  cambios_comercial: { texto: "En cambios (comercial)", clase: AMBAR },
  no_firmada: { texto: "No firmada", clase: GRIS },
  anulada: { texto: "Anulada", clase: GRIS },
  sustituida: { texto: "Sustituida", clase: GRIS },
};
export const faseHe = (estado: string) => FASE_HE[estado] ?? { texto: estado.replace(/_/g, " "), clase: GRIS };

/** Las fases en las que la hoja ya esta firmada por la comunidad (de firmada_recibida en adelante, sin errores). */
export const FIRMADA = ["firmada_recibida", "ok_comercial", "hitos_validados", "primer_cobro", "a_produccion", "ok_administracion"];
/** Las fases que ya no se mueven. */
export const FINAL = ["no_firmada", "anulada", "sustituida"];

export type PausaHe = { desde: string; nota: string | null; quien: string | null; lado: string | null; tejado: string | null; condicion: string | null; paraReanudar: boolean };

export type VersionHe = {
  id: string;
  codigo: string | null;
  numero: number;
  estado: string;
  pausa: PausaHe | null;
  aQuien: string | null;
  comercial: string | null;
  generadaPor: string | null;
  creadaEn: string;
  fechaEmision: string | null;
  /** La primera vez que paso por cada estado (fecha y hora): «cuando se envio», «cuando se firmo»… */
  fechas: Partial<Record<string, string>>;
  /** El ultimo paso del historial, con su nota (los cambios que pide Daniel, el motivo de no firmada…). */
  ultimo: { estado: string; fecha: string; quien: string | null; nota: string | null } | null;
  importe: number;
  /** Lo que se cobra a exito: «3,5 % de lo concedido». */
  aExito: number[];
  /** Que se hace: los tipos (desglose) de sus lineas, sin repetir. */
  tipos: string[];
  tienePdf: boolean;
  presupuesto: { id: string; codigo: string | null } | null;
};
export type HojaHe = { codigo: string | null; actual: VersionHe; anteriores: VersionHe[] };

type Fila = {
  id: string; codigo_he: string | null; numero_version: number; estado: string; creado_en: string; fecha_emision: string | null; pdf: string | null;
  contrata: { nombre: string } | null; persona: { nombre: string; apellidos: string | null } | null; comunidad: { nombre: string } | null;
  comercial: { nombre: string } | null; quien: { nombre: string } | null;
  estados: { estado: string; fecha: string; nota: string | null; lado: string | null; tejado: string | null; condicion: string | null; persona: { nombre: string } | null }[];
  lineas: { id: string; padre_id: string | null; se_cobra: boolean; importe: number | null; porcentaje: number | null; desglosar_precios: boolean | null;
    bloque: { codigo: string } | null; desglose: { nombre: string } | null }[];
  presupuestos: { id: string; codigo: string | null }[];
};

const SEL =
  "id,codigo_he,numero_version,estado,creado_en,fecha_emision,pdf," +
  "contrata:pagador_contrata_id(nombre),persona:pagador_persona_id(nombre,apellidos),comunidad:pagador_comunidad_id(nombre)," +
  "comercial:comercial_id(nombre),quien:generada_por(nombre)," +
  "estados:he_estados_hoja(estado,fecha,nota,lado,tejado,condicion,persona:persona_id(nombre))," +
  "lineas:he_lineas_compromisos(id,padre_id,se_cobra,importe,porcentaje,desglosar_precios,bloque:bloque_id(codigo),desglose:desglose_id(nombre))," +
  "presupuestos:presupuestos!presupuestos_he_version_id_fkey(id,codigo)";

function aVersion(f: Fila): VersionHe {
  const est = [...f.estados].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const fechas: Partial<Record<string, string>> = {};
  for (const e of est) if (!fechas[e.estado]) fechas[e.estado] = e.fecha;
  // La pausa activa: la ultima «pausada» sin «reanudada» detras.
  const pausas: (PausaHe | null)[] = [null];
  for (const e of est) {
    const ahora = pausas[pausas.length - 1];
    if (e.estado === "pausada") pausas.push({ desde: e.fecha, nota: e.nota, quien: e.persona?.nombre ?? null, lado: e.lado, tejado: e.tejado, condicion: e.condicion, paraReanudar: false });
    else if (e.estado === "pausa_levantada" && ahora) pausas.push({ ...ahora, paraReanudar: true });
    else if (e.estado === "reanudada") pausas.push(null);
  }
  const pausa = pausas[pausas.length - 1];
  const u = est.at(-1);
  // Lo que se cobra: lo de dentro de un conjunto con «solo el total» no suma por separado; el conjunto suma lo suyo.
  const porId = new Map(f.lineas.map((l) => [l.id, l]));
  const soloTotal = (l: Fila["lineas"][number]) => {
    const p = l.padre_id ? porId.get(l.padre_id) : null;
    return !!p && p.bloque?.codigo === "PROYECTO CONJUNTO" && p.desglosar_precios === false;
  };
  let importe = 0;
  const aExito: number[] = [];
  for (const l of f.lineas) {
    if (!l.se_cobra) continue;
    if (l.bloque?.codigo === "PROYECTO CONJUNTO" && l.desglosar_precios === false)
      importe += f.lineas.filter((h) => h.padre_id === l.id).reduce((t, h) => t + (Number(h.importe) || 0), 0);
    else if (soloTotal(l)) continue;
    else if (l.importe != null) importe += Number(l.importe);
    else if (l.porcentaje != null) aExito.push(Number(l.porcentaje));
  }
  return {
    id: f.id,
    codigo: f.codigo_he,
    numero: f.numero_version,
    estado: f.estado,
    pausa,
    aQuien: f.contrata?.nombre ?? (f.persona ? [f.persona.nombre, f.persona.apellidos].filter(Boolean).join(" ") : null) ?? f.comunidad?.nombre ?? null,
    comercial: f.comercial?.nombre ?? null,
    generadaPor: f.quien?.nombre ?? null,
    creadaEn: f.creado_en,
    fechaEmision: f.fecha_emision,
    fechas,
    ultimo: u ? { estado: u.estado, fecha: u.fecha, quien: u.persona?.nombre ?? null, nota: u.nota } : null,
    importe,
    aExito,
    tipos: [...new Set(f.lineas.map((l) => l.desglose?.nombre).filter((x): x is string => !!x))],
    tienePdf: !!f.pdf,
    presupuesto: f.presupuestos[0] ?? null,
  };
}

/** Las hojas de una opp, la mas reciente arriba. Cada una con su version actual y las anteriores. */
export async function hojasDeOpp(oppId: string): Promise<HojaHe[]> {
  if (!/^[0-9a-f-]{36}$/.test(oppId)) return [];
  const filas = await leer<Fila[]>(`he_versiones_hoja?select=${SEL}&oportunidad_id=eq.${oppId}&order=creado_en.desc`);
  const grupos = new Map<string, VersionHe[]>();
  for (const f of filas) {
    const v = aVersion(f);
    const clave = v.codigo ?? `borrador:${v.id}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), v]);
  }
  return [...grupos.values()].map((vs) => {
    const orden = [...vs].sort((a, b) => b.numero - a.numero);
    const actual = orden.find((v) => v.estado !== "sustituida") ?? orden[0];
    return { codigo: actual.codigo, actual, anteriores: orden.filter((v) => v !== actual) };
  });
}
