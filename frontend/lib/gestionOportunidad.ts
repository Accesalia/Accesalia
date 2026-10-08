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

import { avisoDireccion, cuenta } from "./direccionNombre";
import { quienDeNota, SEL_NOTA, tipoDeNota, type NotaLeida } from "./tipoDeNota";
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

export type JuntaGestion = {
  id: string;
  fecha: string | null;
  celebrada: boolean;
  resultado: string | null;
  detalle: string | null;
  seguimiento: boolean;
};

/** Una linea del diario de la oportunidad. Vienen de DOS sitios:
 *
 *  - `interacciones`: lo que se graba desde la app (nota de voz, correo, visita).
 *    Esas se pueden abrir, y por eso llevan `enlazable`.
 *  - `notas_oportunidad`: el diario de antes de que existiera la app, rescatado
 *    de las fichas de datos de Dropbox. Monica, 4-oct-2026: "la ficha de
 *    oportunidad ya tiene ese hueco: ES el diario. Solo que en este caso no
 *    podemos dar todos los datos, como quien escribe la nota, pero SI podemos
 *    ver fecha y texto. Estas notas son ese diario cuando no existia, son la
 *    razon de que lo montaramos, para darles su hueco."
 *    No se abren -no hay ficha de una nota- ni tienen autor: no se sabe quien la
 *    escribio, y ponerlo seria inventarlo. */
export type EntradaOportunidad = {
  id: string;
  fecha: string;
  comoFue: string;
  texto: string;
  con: string | null;
  enlazable: boolean;
};

export type Gestion = {
  id: string;
  codigo: string | null;
  direccion: string;
  /** "Pendiente de confirmar alcance / direccion", o null. Ver avisoDireccion. */
  aviso: string | null;
  estado: string;
  comercial: string | null;
  /** Para elegirlo en la ficha: ninguna de las 1.228 migradas lo tiene aun. */
  comercialId: string | null;
  administracion: string | null;
  contacto: string | null;
  contactoDonde: string | null;
  /** El del puesto, que es el del trabajo. "Los telefonos a la vista." */
  contactoTelefono: string | null;
  /** Quien nos la trajo, con su puesto de hoy: "Belén López · COMERCIAL · DIDEPRO". */
  trajo: string | null;
  creada: string;
  /** La de verdad, si se sabe. Vacia = solo tenemos la de importacion. */
  fechaApertura: string | null;
  /** La pausa ABIERTA, si la hay (la que no tiene 'hasta'). Las pausas son un
   *  historial, no un campo: hace falta para saber que llevaba dos anos parada
   *  esperando una subvencion que les llego el mes pasado. */
  pausa: { desde: string; motivo: string | null; condicion: string | null; tejado: string | null } | null;
  hitos: HitoGestion[];
  tiposElegidos: string[];
  negociacion: { queVendemos: string | null; precio: number | null; alcance: string | null; notas: string | null } | null;
  tresD: { tipo: string | null; estado: string | null; fechaNecesaria: string | null; fechaEntrega: string | null } | null;
  /** LA SERIE. Una junta no es un dato, es una historia: se aplaza, piden mas
   *  presupuestos, se vuelve a votar. "Esta comunidad ya nos ha dado planton dos
   *  veces" es informacion de venta, y guardando solo la ultima se pierde. */
  juntas: JuntaGestion[];
  diario: EntradaOportunidad[];
  /** La del edificio. De aqui cuelga TODO el informe -catastro, proteccion,
   *  zona, subvenciones-, que es la mitad de la pantalla del bloque 1.
   *
   *  Sale del ACCESO, que es donde vive la buena: el campo de `oportunidades` es
   *  del alta y esta vacio en las 1.229. Por los accesos la tienen 1.217.
   *  Vacia solo mientras la direccion sea provisional: entonces no hay edificio. */
  referenciaCatastral: string | null;
  /** Para colgar de ella lo que es de la COMUNIDAD y no de esta oportunidad: sus
   *  contactos, por ejemplo. Vacia si la direccion todavia es provisional. */
  comunidadId: string | null;
};

const ORIGEN: Record<string, string> = {
  nota_voz: "nota de voz", manual: "escrito", mail: "correo", llamada: "llamada", visita: "visita",
};

// ------------------------------------------------------------------ leer

export type ContactoComunidad = { nombre: string; telefono: string | null; papel: string | null };

/** LOS CONTACTOS DE LA COMUNIDAD, para la cabecera del bloque 1.
 *
 *  Con el telefono A LA VISTA, que es su regla: "invita a llamar, y eso es
 *  bueno". Son de la COMUNIDAD, no de esta oportunidad: el mismo presidente vale
 *  para el encargo del ascensor y para el de la subvencion.
 *
 *  Hoy `personas_comunidad` son los 543 presidentes de las fichas de Dropbox. El
 *  dia que se migren a la agenda unica, esto mira a `puesto` y la pantalla no se
 *  entera. */
export async function contactosDeComunidad(comunidadId: string): Promise<ContactoComunidad[]> {
  const filas = await leer<{ nombre: string; telefono: string | null; rol: string | null; es_contacto_principal: boolean | null }[]>(
    `personas_comunidad?select=nombre,telefono,rol,es_contacto_principal&comunidad_id=eq.${comunidadId}` +
      `&order=es_contacto_principal.desc.nullslast,nombre.asc&limit=12`,
  );
  return filas.map((f) => ({ nombre: f.nombre, telefono: f.telefono, papel: f.rol }));
}

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
      fecha_apertura: string | null;
      comunidad_provisional: string | null;
      comunidad_id: string | null;
      referencia_catastral: string | null;
      vivos: { count: number }[];
      /** La referencia BUENA vive en el acceso, no en la oportunidad: el campo
       *  de `oportunidades` es del alta y esta vacio en las 1.229. Una esquina
       *  tiene varios accesos; para traer el edificio vale cualquiera. */
      portales: { acceso: { ref_catastral: string | null } | null }[];
      pausas: { desde: string; motivo: string | null; condicion_reactivacion: string | null; pelota_en_tejado: string | null }[];
      comunidad: { nombre: string } | null;
      comercial_id: string | null;
      comercial: { nombre: string } | null;
      puesto: { cargo: string | null; telefono_empresa: string | null; persona: { nombre: string } | null; empresa: { nombre_accesalia: string } | null } | null;
      trajo: {
        nombre: string;
        apellidos: string | null;
        puesto: { cargo: string | null; empresa: { nombre_accesalia: string } | null; contrata: { nombre: string } | null }[];
      } | null;
    }[]
  >(
    `oportunidades?select=id,codigo,estado,creado_en,fecha_apertura,comercial_id,comunidad_provisional,comunidad_id,referencia_catastral,vivos:relacion_oportunidad_accesos(count),` +
      `portales:relacion_oportunidad_accesos(acceso:acceso_id(ref_catastral)),` +
      `pausas:historial_pausas_oportunidad(desde,motivo,condicion_reactivacion,pelota_en_tejado),` +
      `comunidad:comunidad_id(nombre),comercial:comercial_id(nombre),` +
      `puesto:puesto_id(cargo,telefono_empresa,persona:persona_id(nombre),empresa:empresa_id(nombre_accesalia)),` +
      `trajo:quien_lo_trae(nombre,apellidos,puesto(cargo,empresa(nombre_accesalia),contrata:contratas(nombre)))` +
      `&id=eq.${id}&limit=1&vivos.hasta=is.null&portales.hasta=is.null&pausas.hasta=is.null&trajo.puesto.hasta=is.null`,
  );
  if (!op) return null;

  const [catalogo, hitos, tipos, neg, tres, juntas, notas, entradas] = await Promise.all([
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
      `juntas?select=id,fecha_junta,celebrada,resultado,resultado_detalle,requiere_seguimiento&oportunidad_id=eq.${id}&order=fecha_junta.asc.nullslast,creado_en.asc`,
    ),
    leer<NotaLeida[]>(`notas_oportunidad?select=${SEL_NOTA}&oportunidad_id=eq.${id}&order=fecha.desc.nullslast,creado_en.asc`),
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
    aviso: avisoDireccion(cuenta(op.vivos), op.referencia_catastral),
    referenciaCatastral:
      op.portales?.map((p) => p.acceso?.ref_catastral).find(Boolean) ?? op.referencia_catastral,
    comunidadId: op.comunidad_id,
    estado: op.estado,
    comercial: op.comercial?.nombre ?? null,
    comercialId: op.comercial_id,
    administracion: op.puesto?.empresa?.nombre_accesalia ?? null,
    contacto: op.puesto?.persona?.nombre ?? null,
    contactoDonde: op.puesto?.cargo ?? null,
    contactoTelefono: op.puesto?.telefono_empresa ?? null,
    trajo: op.trajo
      ? [
          [op.trajo.nombre, op.trajo.apellidos].filter(Boolean).join(" "),
          op.trajo.puesto?.[0]?.cargo,
          op.trajo.puesto?.[0]?.empresa?.nombre_accesalia ?? op.trajo.puesto?.[0]?.contrata?.nombre,
        ]
          .filter(Boolean)
          .join(" · ")
      : null,
    // La fecha que importa es cuando se abrio el encargo; si no se sabe -las
    // importadas de julio-, se cae a cuando entro la fila en la app.
    creada: op.fecha_apertura ?? op.creado_en.slice(0, 10),
    fechaApertura: op.fecha_apertura,
    pausa: op.pausas?.[0]
      ? {
          desde: op.pausas[0].desde,
          motivo: op.pausas[0].motivo,
          condicion: op.pausas[0].condicion_reactivacion,
          tejado: op.pausas[0].pelota_en_tejado,
        }
      : null,
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
    juntas: juntas.map((j) => ({
      id: j.id,
      fecha: j.fecha_junta,
      celebrada: j.celebrada,
      resultado: j.resultado,
      detalle: j.resultado_detalle,
      seguimiento: j.requiere_seguimiento,
    })),
    // El diario, con las dos fuentes juntas y en orden: lo grabado en la app y
    // lo rescatado de las fichas de Dropbox. Las notas sin fecha van al final:
    // no se les pone una inventada.
    diario: [
      ...entradas.map((e) => ({
        id: e.id,
        fecha: e.fecha_evento ?? e.creado_en.slice(0, 10),
        comoFue: ORIGEN[e.origen] ?? e.origen,
        texto: e.transcripcion ?? "",
        con: e.puesto?.persona?.nombre ?? null,
        enlazable: true,
      })),
      ...notas.map((n) => ({
        id: n.id,
        fecha: n.fecha ?? "",
        comoFue: tipoDeNota(n.origen, n.canal),
        texto: n.texto,
        con: quienDeNota(n),
        enlazable: false,
      })),
    ].sort((a, b) => (b.fecha || "0").localeCompare(a.fecha || "0")),
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

/** Pausar: la oportunidad queda PAUSADA, no cerrada. No esta perdida, esta
 *  esperando: "retomar cuando hagan hucha", "cuando salga la subvencion".
 *
 *  Y cada pausa es UNA FILA de historial, no un campo que se pisa. Monica,
 *  4-oct-2026: "lleva abierta desde hace dos anos, pero es que estaban
 *  esperando una subvencion que les llego el mes pasado y ahora por eso se
 *  reabre". Con un hueco de uno solo, la segunda pausa borra la primera y se
 *  pierde justo eso.
 *
 *  'condicion' es lo que escribe el comercial en "retomarla cuando". Los otros
 *  dos campos de la tabla -motivo y pelota_en_tejado- aun no tienen sitio en la
 *  pantalla: eso se habla antes de ponerlo. */
export async function pausar(oportunidadId: string, condicion: string | null) {
  await escribir("POST", "historial_pausas_oportunidad", {
    oportunidad_id: oportunidadId,
    condicion_reactivacion: oNulo(condicion),
  });
  await escribir("PATCH", `oportunidades?id=eq.${oportunidadId}`, { estado: "pausada" });
}

/** Retomarla: se cierra la pausa abierta poniendole fecha de fin -asi queda
 *  cuanto tiempo estuvo parada y por que- y la oportunidad vuelve a abierta. */
export async function reactivar(oportunidadId: string) {
  const hoy = new Date().toISOString().slice(0, 10);
  await escribir("PATCH", `historial_pausas_oportunidad?oportunidad_id=eq.${oportunidadId}&hasta=is.null`, {
    hasta: hoy,
  });
  await escribir("PATCH", `oportunidades?id=eq.${oportunidadId}`, { estado: "abierta" });
}

/** EL COMERCIAL QUE LLEVA LA OPP (Monica, 3-oct-2026: "hay que poder elegir el
 *  comercial asignado a cada opp"). A el le llegan los correos de la opp, y a
 *  quien comparta su cartera (Alejandra, en la de Daniel). El codigo no se toca:
 *  lleva las siglas de quien la TRAJO, y eso no cambia aunque la herede otro. */
export async function cambiarComercial(oportunidadId: string, comercialId: string | null) {
  await escribir("PATCH", `oportunidades?id=eq.${oportunidadId}`, { comercial_id: comercialId });
}

/** Los comerciales que se pueden elegir: los activos. */
export async function comercialesActivos(): Promise<{ id: string; nombre: string }[]> {
  return leer<{ id: string; nombre: string }[]>("comerciales?select=id,nombre&activo=is.true&order=nombre.asc");
}
