// lib/gestionOportunidad.ts
//
// LA PANTALLA DE GESTION DE UNA OPORTUNIDAD (Monica, 28-sep-2026).
//
// Habia pantalla de CREARLA y ficha resumida para mirarla, pero no habia donde
// TRABAJARLA: "para hacer lo que se necesita en una opp necesitamos una pantalla
// de gestion". Esta es esa pantalla.
//
// El hallazgo al empezar: no hay que modelar casi nada. Las mesas estaban
// puestas y vacias -negociacion_oportunidad, oportunidad_tipos, modelos_3d_venta,
// juntas, viabilidades: cero filas todas-. Lo que faltaba era la puerta.
//
// Y una advertencia que vale para leer este fichero entero: la tabla `tecnicos`
// de fase 1 esta VACIA, y `modelos_3d_venta.tecnico_id` apunta a ella. Asi que
// quien hace el 3D se apunta en el responsable del hito, que si apunta a
// `equipo` (20 personas de verdad). Cuando se unifiquen, se mueve.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cabeceras = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function leer<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: cabeceras, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

async function escribir(metodo: "POST" | "PATCH" | "DELETE", consulta: string, cuerpo?: unknown) {
  const r = await fetch(`${URL_BASE}/rest/v1/${consulta}`, {
    method: metodo,
    headers: { ...cabeceras, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
}

// ------------------------------------------------------------------ tipos

export const ESTADOS_HITO = [
  { valor: "pendiente", texto: "Pendiente" },
  { valor: "en_curso", texto: "En curso" },
  { valor: "hecho", texto: "Hecho" },
  { valor: "no_aplica", texto: "No aplica" },
] as const;

/** Los seis resultados de una junta. Son el CHECK de `juntas.resultado`: no
 *  valen otros. "Complicacion" y "piden mas presupuestos" estan porque una junta
 *  rara vez sale con un si o un no limpios. */
export const RESULTADOS_JUNTA = [
  { valor: "pendiente", texto: "Aún no se ha celebrado" },
  { valor: "favorable", texto: "Favorable" },
  { valor: "desfavorable", texto: "Desfavorable" },
  { valor: "aplazada", texto: "Aplazada" },
  { valor: "piden_mas_presupuestos", texto: "Piden más presupuestos" },
  { valor: "complicacion", texto: "Hubo una complicación" },
] as const;

export const TIPOS_3D = [
  { valor: "generico_escalera", texto: "De catálogo" },
  { valor: "a_medida", texto: "A medida" },
  { valor: "diseno_portal", texto: "Diseño de portal" },
] as const;

export const ESTADOS_3D = [
  { valor: "pedido", texto: "Pedido" },
  { valor: "en_curso", texto: "En curso" },
  { valor: "listo", texto: "Listo" },
  { valor: "entregado", texto: "Entregado" },
] as const;

export type HitoGestion = {
  clave: string;
  nombre: string;
  numero: string | null;
  ramal: boolean;
  /** Quien lo hace por oficio: comercial, arquitecto, tecnico de escaneo, 3D. */
  rolQuien: string | null;
  estado: string;
  aplicable: boolean;
  fecha: string | null;
  responsableId: string | null;
  enlace: string | null;
  notas: string | null;
};

export type TipoGestion = { id: string; clave: string; nombre: string; padre: string | null; contratable: boolean };

export type EntradaOportunidad = { id: string; fecha: string; comoFue: string; texto: string; con: string | null };

export type Gestion = {
  id: string;
  codigo: string | null;
  direccion: string;
  estado: string;
  comercial: string | null;
  administracion: string | null;
  contacto: string | null;
  contactoDonde: string | null;
  creada: string;
  reactivarNota: string | null;
  hitos: HitoGestion[];
  tiposElegidos: string[];
  negociacion: { queVendemos: string | null; precio: number | null; alcance: string | null; notas: string | null } | null;
  tresD: { tipo: string | null; estado: string | null; fechaNecesaria: string | null; fechaEntrega: string | null } | null;
  junta: {
    id: string;
    fecha: string | null;
    celebrada: boolean;
    resultado: string | null;
    detalle: string | null;
    seguimiento: boolean;
  } | null;
  diario: EntradaOportunidad[];
};

const ORIGEN: Record<string, string> = {
  nota_voz: "nota de voz", manual: "escrito", mail: "correo", llamada: "llamada", visita: "visita",
};

// ------------------------------------------------------------------ leer

export async function catalogoTipos(): Promise<TipoGestion[]> {
  const filas = await leer<
    { id: string; clave: string; nombre: string; contratable: boolean; orden: number; parent: { nombre: string } | null }[]
  >("tipos_proyecto?select=id,clave,nombre,contratable,orden,parent:parent_id(nombre)&activo=is.true&order=orden.asc");
  return filas.map((t) => ({
    id: t.id,
    clave: t.clave,
    nombre: t.nombre,
    padre: t.parent?.nombre ?? null,
    contratable: t.contratable,
  }));
}

/** Quien puede ser responsable de un hito: el equipo de Accesalia, no los
 *  `tecnicos` de fase 1, que estan a cero. */
export async function equipoOpciones(): Promise<{ valor: string; texto: string }[]> {
  const filas = await leer<{ id: string; nombre: string; apellidos: string | null }[]>(
    "equipo?select=id,nombre,apellidos&activo=is.true&order=nombre.asc",
  );
  return filas.map((e) => ({ valor: e.id, texto: [e.nombre, e.apellidos].filter(Boolean).join(" ") }));
}

export async function gestionOportunidad(id: string): Promise<Gestion | null> {
  const [op] = await leer<
    {
      id: string;
      codigo: string | null;
      estado: string;
      creado_en: string;
      comunidad_provisional: string | null;
      reactivar_nota: string | null;
      comunidad: { nombre: string } | null;
      comercial: { nombre: string } | null;
      puesto: { cargo: string | null; persona: { nombre: string } | null; empresa: { nombre: string } | null } | null;
    }[]
  >(
    `oportunidades?select=id,codigo,estado,creado_en,comunidad_provisional,reactivar_nota,` +
      `comunidad:comunidad_id(nombre),comercial:comercial_id(nombre),` +
      `puesto:puesto_id(cargo,persona:persona_id(nombre),empresa:empresa_id(nombre))&id=eq.${id}&limit=1`,
  );
  if (!op) return null;

  const [catalogo, hitos, tipos, neg, tres, juntas, entradas] = await Promise.all([
    leer<{ clave: string; nombre: string; orden: number; es_ramal: boolean; responsable_rol: string | null }[]>(
      "hitos_comerciales?select=clave,nombre,orden,es_ramal,responsable_rol&order=orden.asc",
    ),
    leer<
      { hito: string; estado: string; aplicable: boolean; fecha: string | null; responsable_id: string | null; enlace_url: string | null; notas: string | null }[]
    >(`hitos_oportunidad?select=hito,estado,aplicable,fecha,responsable_id,enlace_url,notas&oportunidad_id=eq.${id}`),
    leer<{ tipo_id: string }[]>(`oportunidad_tipos?select=tipo_id&oportunidad_id=eq.${id}`),
    leer<{ que_vendemos: string | null; precio: number | null; alcance: string | null; notas: string | null }[]>(
      `negociacion_oportunidad?select=que_vendemos,precio,alcance,notas&oportunidad_id=eq.${id}&order=creado_en.desc&limit=1`,
    ),
    leer<{ tipo_3d: string | null; estado: string | null; fecha_necesaria: string | null; fecha_entrega: string | null }[]>(
      `modelos_3d_venta?select=tipo_3d,estado,fecha_necesaria,fecha_entrega&oportunidad_id=eq.${id}&order=creado_en.desc&limit=1`,
    ),
    leer<
      { id: string; fecha_junta: string | null; celebrada: boolean; resultado: string | null; resultado_detalle: string | null; requiere_seguimiento: boolean }[]
    >(
      `juntas?select=id,fecha_junta,celebrada,resultado,resultado_detalle,requiere_seguimiento&oportunidad_id=eq.${id}&order=creado_en.desc&limit=1`,
    ),
    leer<
      { id: string; fecha_evento: string | null; creado_en: string; origen: string; transcripcion: string | null; puesto: { persona: { nombre: string } | null } | null }[]
    >(
      `interacciones?select=id,fecha_evento,creado_en,origen,transcripcion,puesto:puesto_id(persona:persona_id(nombre))` +
        `&oportunidad_id=eq.${id}&order=creado_en.desc&limit=40`,
    ),
  ]);

  const puesto = hitos.reduce<Record<string, (typeof hitos)[number]>>((a, h) => ({ ...a, [h.hito]: h }), {});
  let n = 0;

  return {
    id: op.id,
    codigo: op.codigo,
    direccion: op.comunidad?.nombre ?? op.comunidad_provisional ?? "(sin dirección)",
    estado: op.estado,
    comercial: op.comercial?.nombre ?? null,
    administracion: op.puesto?.empresa?.nombre ?? null,
    contacto: op.puesto?.persona?.nombre ?? null,
    contactoDonde: op.puesto?.cargo ?? null,
    creada: op.creado_en.slice(0, 10),
    reactivarNota: op.reactivar_nota,
    hitos: catalogo.map((c) => {
      const h = puesto[c.clave];
      return {
        clave: c.clave,
        nombre: c.nombre,
        numero: c.es_ramal ? null : String(++n),
        ramal: c.es_ramal,
        rolQuien: c.responsable_rol,
        estado: h?.estado ?? "pendiente",
        aplicable: h?.aplicable ?? true,
        fecha: h?.fecha ?? null,
        responsableId: h?.responsable_id ?? null,
        enlace: h?.enlace_url ?? null,
        notas: h?.notas ?? null,
      };
    }),
    tiposElegidos: tipos.map((t) => t.tipo_id),
    negociacion: neg[0]
      ? { queVendemos: neg[0].que_vendemos, precio: neg[0].precio, alcance: neg[0].alcance, notas: neg[0].notas }
      : null,
    tresD: tres[0]
      ? { tipo: tres[0].tipo_3d, estado: tres[0].estado, fechaNecesaria: tres[0].fecha_necesaria, fechaEntrega: tres[0].fecha_entrega }
      : null,
    junta: juntas[0]
      ? {
          id: juntas[0].id,
          fecha: juntas[0].fecha_junta,
          celebrada: juntas[0].celebrada,
          resultado: juntas[0].resultado,
          detalle: juntas[0].resultado_detalle,
          seguimiento: juntas[0].requiere_seguimiento,
        }
      : null,
    diario: entradas.map((e) => ({
      id: e.id,
      fecha: e.fecha_evento ?? e.creado_en.slice(0, 10),
      comoFue: ORIGEN[e.origen] ?? e.origen,
      texto: e.transcripcion ?? "",
      con: e.puesto?.persona?.nombre ?? null,
    })),
  };
}

// ---------------------------------------------------------------- escribir

const oNulo = (v: string | null | undefined) => (v && v.trim() !== "" ? v.trim() : null);

/** Mover una fase. Es LA operacion de esta pantalla: hasta hoy los diez hitos se
 *  creaban con la oportunidad y ahi se quedaban para siempre, porque no habia ni
 *  una pantalla que tocara `hitos_oportunidad.estado`.
 *
 *  Marcar "no aplica" pone tambien `aplicable = false`: son la misma cosa dicha
 *  dos veces, y si se separan acaban contradiciendose. */
export async function tocarHito(
  oportunidadId: string,
  hito: string,
  d: { estado: string; fecha: string | null; responsableId: string | null; enlace: string | null; notas: string | null },
) {
  const estado = ESTADOS_HITO.some((e) => e.valor === d.estado) ? d.estado : "pendiente";
  await escribir("PATCH", `hitos_oportunidad?oportunidad_id=eq.${oportunidadId}&hito=eq.${hito}`, {
    estado,
    aplicable: estado !== "no_aplica",
    fecha: oNulo(d.fecha),
    responsable_id: oNulo(d.responsableId),
    enlace_url: oNulo(d.enlace),
    notas: oNulo(d.notas),
  });
}

/** Que contratan. Se borra y se vuelve a poner: son pocas filas y asi no hay que
 *  calcular diferencias ni arrastrar restos de lo que se desmarco. */
export async function guardarTipos(oportunidadId: string, tipoIds: string[]) {
  await escribir("DELETE", `oportunidad_tipos?oportunidad_id=eq.${oportunidadId}`);
  if (tipoIds.length === 0) return;
  await escribir(
    "POST",
    "oportunidad_tipos",
    tipoIds.map((t) => ({ oportunidad_id: oportunidadId, tipo_id: t })),
  );
}

/** Que vendemos y por cuanto. `negociacion_oportunidad` guarda HISTORIA: cada
 *  cambio es una fila nueva y se lee la ultima. Un precio que baja de 14.500 a
 *  11.200 cuenta algo, y borrandolo se pierde. */
export async function guardarNegociacion(
  oportunidadId: string,
  comercialId: string | null,
  d: { queVendemos: string | null; precio: string | null; alcance: string | null; notas: string | null },
) {
  const precio = d.precio && d.precio.trim() !== "" ? Number(d.precio.replace(/\./g, "").replace(",", ".")) : null;
  await escribir("POST", "negociacion_oportunidad", {
    oportunidad_id: oportunidadId,
    comercial_id: comercialId,
    que_vendemos: oNulo(d.queVendemos),
    precio: Number.isFinite(precio) ? precio : null,
    alcance: oNulo(d.alcance),
    notas: oNulo(d.notas),
  });
}

/** El 3D. El tecnico NO se guarda aqui: `modelos_3d_venta.tecnico_id` apunta a
 *  la tabla `tecnicos` de fase 1, que esta vacia. Quien lo hace se apunta en el
 *  responsable del hito "3D para junta", que apunta a `equipo`. */
export async function guardarTresD(
  oportunidadId: string,
  d: { tipo: string; estado: string; fechaNecesaria: string | null; fechaEntrega: string | null },
) {
  const tipo = TIPOS_3D.some((t) => t.valor === d.tipo) ? d.tipo : "a_medida";
  const estado = ESTADOS_3D.some((e) => e.valor === d.estado) ? d.estado : "pedido";
  const fila = {
    oportunidad_id: oportunidadId,
    tipo_3d: tipo,
    de_catalogo: tipo === "generico_escalera",
    a_medida: tipo === "a_medida",
    estado,
    fecha_necesaria: oNulo(d.fechaNecesaria),
    fecha_entrega: oNulo(d.fechaEntrega),
  };
  const hay = await leer<{ id: string }[]>(`modelos_3d_venta?select=id&oportunidad_id=eq.${oportunidadId}&limit=1`);
  if (hay[0]) await escribir("PATCH", `modelos_3d_venta?id=eq.${hay[0].id}`, fila);
  else await escribir("POST", "modelos_3d_venta", fila);
}

/** La junta. Una oportunidad puede tener varias a lo largo del tiempo -aplazada,
 *  piden mas presupuestos, vuelven a votar-, pero la pantalla trabaja con la
 *  ultima, que es la que esta viva. */
export async function guardarJunta(
  oportunidadId: string,
  juntaId: string | null,
  d: { fecha: string | null; celebrada: boolean; resultado: string; detalle: string | null; seguimiento: boolean },
) {
  const resultado = RESULTADOS_JUNTA.some((r) => r.valor === d.resultado) ? d.resultado : "pendiente";
  const fila = {
    oportunidad_id: oportunidadId,
    fecha_junta: oNulo(d.fecha),
    celebrada: d.celebrada,
    resultado,
    resultado_detalle: oNulo(d.detalle),
    requiere_seguimiento: d.seguimiento,
  };
  if (juntaId) await escribir("PATCH", `juntas?id=eq.${juntaId}`, fila);
  else await escribir("POST", "juntas", fila);
}

/** Aplazar: la oportunidad queda LATENTE, no cerrada. Tres salidas tiene el
 *  cierre -si, no, y latente con su condicion-, y esta es la tercera: "retomar
 *  cuando hagan hucha", "cuando salga la subvencion". */
export async function aplazar(oportunidadId: string, nota: string | null) {
  await escribir("PATCH", `oportunidades?id=eq.${oportunidadId}`, {
    estado: "latente",
    reactivar_nota: oNulo(nota),
  });
}

export async function reactivar(oportunidadId: string) {
  await escribir("PATCH", `oportunidades?id=eq.${oportunidadId}`, { estado: "activa" });
}

