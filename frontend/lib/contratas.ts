// lib/contratas.ts
//
// Acceso a datos del mundo CONTRATA, solo de servidor. Mismo patron que
// lib/comercial.ts: REST con la clave secreta.
//
// POR QUE UN FICHERO APARTE Y NO DENTRO DE comercial.ts: son dos mundos que no
// se tocan. Decision expresa de Monica (10-sep-2026): "BAJO NINGUN CONCEPTO
// QUIERO JUNTAR ADMINISTRACIONES Y CONTRATAS EN UNA MISMA TABLA. Y diria que
// tampoco las personas que trabajan alli". Nadie salta de administrador de
// fincas a contratista, asi que una capa comun no compraria nada y si mezclaria
// dos cosas que estan separadas a proposito, tambien de cara a los perfiles: un
// tecnico no puede ver datos comerciales.
//
// La FORMA si se copia, que es buena:
//     contratas                 <- la empresa que hace la obra
//     contrata_personas         <- quien es (lo que se lleva al cambiar de casa)
//     contrata_puestos_persona  <- su paso por esa empresa, con fechas
//     notas_contratas           <- el diario
//
// El puesto lo ejerce una persona: la persona persiste y el puesto no.

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

// ---- Tipos ----

export type Contrata = {
  id: string;
  nombre: string;
  razonSocial: string | null;
  cif: string | null;
  tipo: string | null;
  especialidad: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  notasComercial: string | null;
  notasFiabilidad: string | null;
  pendiente: string | null;
  activa: boolean;
};

export type ContrataFila = Contrata & {
  personas: number;
  enCurso: number;
  sinEmpezar: number;
  terminadas: number;
  presupuestos: number;
};

export type PersonaContrata = {
  /** El id del PUESTO: es lo que identifica a alguien EN una empresa. */
  puestoId: string;
  personaId: string;
  nombre: string;
  apellidos: string | null;
  cargo: string | null;
  emailPuesto: string | null;
  telefonoPuesto: string | null;
  emailPropio: string | null;
  telefonoPropio: string | null;
  desde: string | null;
  hasta: string | null;
  contrataId: string;
  contrata: string;
  pendientePuesto: string | null;
  pendientePersona: string | null;
  notasPuesto: string | null;
  etapas: number;
};

export type ObraDeContrata = {
  direccion: string;
  municipio: string | null;
  tipo: string | null;
  estadoObra: string | null;
  desde: string | null;
};

export type NotaContrata = {
  id: string;
  texto: string;
  autor: string | null;
  origen: string;
  creadoEn: string;
  editadoEn: string | null;
  sobre: string | null;
};

// ---- Traduccion ----

type FilaContrata = {
  id: string; nombre: string; razon_social: string | null; cif: string | null;
  tipo: string | null; especialidad: string | null; telefono: string | null;
  email: string | null; direccion: string | null; notas_comercial: string | null;
  notas_fiabilidad: string | null; pendiente: string | null; activa: boolean;
};

const SEL = "id,nombre,razon_social,cif,tipo,especialidad,telefono,email,direccion," +
  "notas_comercial,notas_fiabilidad,pendiente,activa";

function comoContrata(c: FilaContrata): Contrata {
  return {
    id: c.id, nombre: c.nombre, razonSocial: c.razon_social, cif: c.cif,
    tipo: c.tipo, especialidad: c.especialidad, telefono: c.telefono, email: c.email,
    direccion: c.direccion, notasComercial: c.notas_comercial,
    notasFiabilidad: c.notas_fiabilidad, pendiente: c.pendiente, activa: c.activa,
  };
}

// ---- Consultas ----

/** El listado: cada contrata con lo que tiene abierto. */
export async function listarContratas(): Promise<ContrataFila[]> {
  const [contratas, obras, presupuestos, puestos] = await Promise.all([
    rest<FilaContrata[]>(`contratas?select=${SEL}&order=nombre.asc`),
    rest<{ constructora_contrata_id: string; estado: string | null }[]>(
      "obras?select=constructora_contrata_id,estado&constructora_contrata_id=not.is.null",
    ),
    rest<{ contrata_id: string }[]>("presupuestos_licitacion?select=contrata_id"),
    rest<{ contrata_id: string }[]>("contrata_puestos_persona?select=contrata_id&hasta=is.null"),
  ]);

  const cuenta = (lista: { contrata_id: string }[]) => {
    const m = new Map<string, number>();
    for (const x of lista) m.set(x.contrata_id, (m.get(x.contrata_id) ?? 0) + 1);
    return m;
  };
  const nPres = cuenta(presupuestos);
  const nPer = cuenta(puestos);
  const porEstado = new Map<string, { c: number; s: number; t: number }>();
  for (const o of obras) {
    const v = porEstado.get(o.constructora_contrata_id) ?? { c: 0, s: 0, t: 0 };
    if (o.estado === "en_curso") v.c++;
    else if (o.estado === "pendiente_inicio") v.s++;
    else if (o.estado === "finalizada") v.t++;
    porEstado.set(o.constructora_contrata_id, v);
  }

  return contratas.map((c) => {
    const e = porEstado.get(c.id) ?? { c: 0, s: 0, t: 0 };
    return {
      ...comoContrata(c),
      personas: nPer.get(c.id) ?? 0,
      enCurso: e.c, sinEmpezar: e.s, terminadas: e.t,
      presupuestos: nPres.get(c.id) ?? 0,
    };
  });
}

/** Todas las personas con su puesto vigente, para la pestaña "Personas". */
export async function listarPersonasContrata(): Promise<PersonaContrata[]> {
  const filas = await rest<{
    id: string; cargo: string | null; email: string | null; telefono: string | null;
    desde: string | null; hasta: string | null; pendiente: string | null; notas: string | null;
    contrata: { id: string; nombre: string } | null;
    persona: { id: string; nombre: string; apellidos: string | null; email: string | null; telefono: string | null; pendiente: string | null } | null;
  }[]>(
    "contrata_puestos_persona?select=id,cargo,email,telefono,desde,hasta,pendiente,notas," +
      "contrata:contratas(id,nombre)," +
      "persona:contrata_personas(id,nombre,apellidos,email,telefono,pendiente)&order=cargo.asc",
  );

  const etapas = new Map<string, number>();
  for (const f of filas) if (f.persona) etapas.set(f.persona.id, (etapas.get(f.persona.id) ?? 0) + 1);

  return filas
    .filter((f) => f.persona && f.contrata)
    .map((f) => ({
      puestoId: f.id,
      personaId: f.persona!.id,
      nombre: f.persona!.nombre,
      apellidos: f.persona!.apellidos,
      cargo: f.cargo,
      emailPuesto: f.email,
      telefonoPuesto: f.telefono,
      emailPropio: f.persona!.email,
      telefonoPropio: f.persona!.telefono,
      desde: f.desde,
      hasta: f.hasta,
      contrataId: f.contrata!.id,
      contrata: f.contrata!.nombre,
      pendientePuesto: f.pendiente,
      pendientePersona: f.persona!.pendiente,
      notasPuesto: f.notas,
      etapas: etapas.get(f.persona!.id) ?? 1,
    }))
    .sort((a, b) => (a.nombre + a.apellidos).localeCompare(b.nombre + b.apellidos, "es"));
}

/** Una contrata. */
export async function contrataPorId(id: string): Promise<Contrata | null> {
  const filas = await rest<FilaContrata[]>(`contratas?select=${SEL}&id=eq.${id}&limit=1`);
  return filas[0] ? comoContrata(filas[0]) : null;
}

/** Su gente hoy, con el puesto vigente. */
export async function genteDeContrata(contrataId: string): Promise<PersonaContrata[]> {
  const todas = await listarPersonasContrata();
  return todas.filter((p) => p.contrataId === contrataId && !p.hasta);
}

/** La historia laboral de una persona: todas sus etapas, la actual primero. */
export async function historiaDePersona(puestoId: string): Promise<PersonaContrata[]> {
  const uno = await rest<{ persona: { id: string } | null }[]>(
    `contrata_puestos_persona?select=persona:contrata_personas(id)&id=eq.${puestoId}&limit=1`,
  );
  const personaId = uno[0]?.persona?.id;
  if (!personaId) return [];
  const todas = await listarPersonasContrata();
  return todas
    .filter((p) => p.personaId === personaId)
    .sort((a, b) => {
      if (!a.hasta && b.hasta) return -1;
      if (a.hasta && !b.hasta) return 1;
      return (b.desde ?? "").localeCompare(a.desde ?? "");
    });
}

/** Lo que tenemos abierto con ellos. */
export async function obrasDeContrata(contrataId: string): Promise<ObraDeContrata[]> {
  const filas = await rest<{
    estado: string | null; fecha_acta_inicio: string | null;
    proyecto: { tipo: string | null; comunidad: { nombre: string; municipio: string | null } | null } | null;
  }[]>(
    "obras?select=estado,fecha_acta_inicio,proyecto:proyectos(tipo,comunidad:comunidades(nombre,municipio))" +
      `&constructora_contrata_id=eq.${contrataId}`,
  );
  const peso = (e: string | null) =>
    e === "en_curso" ? 0 : e === "pendiente_inicio" ? 1 : e === "finalizada" ? 3 : 2;
  return filas
    .filter((f) => f.proyecto?.comunidad)
    .map((f) => ({
      direccion: f.proyecto!.comunidad!.nombre,
      municipio: f.proyecto!.comunidad!.municipio,
      tipo: f.proyecto!.tipo,
      estadoObra: f.estado,
      desde: f.fecha_acta_inicio,
    }))
    .sort((a, b) => peso(a.estadoObra) - peso(b.estadoObra) || a.direccion.localeCompare(b.direccion, "es"));
}

/** El diario: notas de la contrata y de su gente. */
export async function notasDeContrata(contrataId: string, puestoIds: string[]): Promise<NotaContrata[]> {
  const trozos = [`contrata_id.eq.${contrataId}`];
  if (puestoIds.length) trozos.push(`puesto_id.in.(${puestoIds.join(",")})`);
  return notas(`or=(${trozos.join(",")})`);
}

/** El diario de una persona: lo suyo y lo de cualquiera de sus puestos. */
export async function notasDePersona(personaId: string, puestoIds: string[]): Promise<NotaContrata[]> {
  const trozos = [`persona_id.eq.${personaId}`];
  if (puestoIds.length) trozos.push(`puesto_id.in.(${puestoIds.join(",")})`);
  return notas(`or=(${trozos.join(",")})`);
}

async function notas(filtro: string): Promise<NotaContrata[]> {
  const filas = await rest<{
    id: string; texto: string; autor: string | null; origen: string;
    creado_en: string; actualizado_en: string;
    puesto: { persona: { nombre: string } | null } | null;
  }[]>(
    "notas_contratas?select=id,texto,autor,origen,creado_en,actualizado_en," +
      `puesto:contrata_puestos_persona(persona:contrata_personas(nombre))&${filtro}&order=creado_en.desc`,
  );
  return filas.map((f) => ({
    id: f.id, texto: f.texto, autor: f.autor, origen: f.origen, creadoEn: f.creado_en,
    // margen de un par de segundos: el trigger toca actualizado_en al insertar
    editadoEn:
      new Date(f.actualizado_en).getTime() - new Date(f.creado_en).getTime() > 3000
        ? f.actualizado_en
        : null,
    sobre: f.puesto?.persona?.nombre ?? null,
  }));
}

// ---- Ayudas de pantalla ----

export const TIPOS: Record<string, { label: string; clase: string }> = {
  ascensorista: { label: "Ascensorista", clase: "bg-blue-50 text-blue-700" },
  obra_civil: { label: "Obra civil", clase: "bg-lima-soft text-lima-dark" },
  mixta: { label: "Mixta", clase: "bg-violet-50 text-violet-700" },
  otra: { label: "Otra", clase: "bg-black/5 text-carbon/60" },
};

export function tipoDe(tipo: string | null) {
  return (tipo && TIPOS[tipo]) || { label: tipo ?? "—", clase: "bg-black/5 text-carbon/60" };
}

/** El ⛔ del nombre es un estado metido a la fuerza donde se pudo. */
export function esOjo(nombre: string) {
  return nombre.startsWith("⛔");
}
export function sinOjo(nombre: string) {
  return nombre.replace(/^⛔\s*/, "");
}

export function nombreCompleto(p: { nombre: string; apellidos: string | null }) {
  return [p.nombre, p.apellidos].filter(Boolean).join(" ");
}
