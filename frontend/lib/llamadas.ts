// lib/llamadas.ts
//
// LA PANTALLA LLAMADA (Monica, 8-oct-2026): "apunto primero, pienso despues".
//
// Quien coge el telefono escribe lo que le cuentan mientras se lo cuentan. Quien
// llama y de que direccion se trata los teclea como palabras sueltas ("antonio
// schindler", "soledad 18") y la app PROPONE al lado con quien y con que casan.
// Se elige despues, con calma; si no se elige nada, se guarda lo escrito.
//
// Las propuestas salen de lo que ya tenemos, sin Catastro (tiene que ser al
// instante):
//   · personas: la agenda (persona + su puesto vigente: administracion,
//     contrata u organismo) y la gente de las comunidades (personas_comunidad,
//     los presidentes que aun no estan en la agenda);
//   · direcciones: las comunidades y las oportunidades que aun no tienen
//     comunidad, que solo tienen nombre.
//
// El cotejo es por palabras, sin tildes ni mayusculas. Los NUMEROS casan
// enteros: "soledad 18" no es "soledad 180".

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

// Se leen enteras y se guardan cinco minutos: proponer es buscar en memoria.
const CINCO_MIN = { next: { revalidate: 300 } } as const;

async function todo<T>(path: string): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
      headers: { ...CAB, Range: `${desde}-${desde + 999}` },
      ...CINCO_MIN,
    });
    if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
    const lote = (await r.json()) as T[];
    filas.push(...lote);
    if (lote.length < 1000) break;
  }
  return filas;
}

// ------------------------------------------------------------ las areas

/** Lista cerrada de Monica (8-oct-2026), en el orden en que se ven. La misma
 *  que el CHECK de la tabla. */
export const AREAS_LLAMADA = [
  { clave: "comercial", nombre: "Comercial" },
  { clave: "visita_escaneado", nombre: "Visita escaneado" },
  { clave: "proyecto", nombre: "Proyecto" },
  { clave: "requerimientos", nombre: "Requerimientos" },
  { clave: "licencias", nombre: "Licencias" },
  { clave: "visados", nombre: "Visados" },
  { clave: "obra", nombre: "Obra" },
  { clave: "subvenciones", nombre: "Subvenciones" },
  { clave: "iee", nombre: "IEE" },
  { clave: "caes", nombre: "CAES" },
  { clave: "presupuestos", nombre: "3 presupuestos" },
  { clave: "facturacion", nombre: "Facturación" },
] as const;

// ------------------------------------------------------------ el cotejo

const limpio = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const trozos = (s: string) => limpio(s).split(/[^a-z0-9ñ]+/).filter(Boolean);
const esNumero = (p: string) => /^\d+$/.test(p);

/** Cuantas de las palabras buscadas aparecen. Un numero tiene que ser una
 *  palabra entera del texto; lo demas vale como trozo ("presi" en presidente). */
function aciertos(buscadas: string[], texto: string): number {
  const t = limpio(texto);
  const palabras = new Set(trozos(texto));
  return buscadas.filter((p) => (esNumero(p) ? palabras.has(p) : t.includes(p))).length;
}

/** Primero las que casan con TODO lo escrito. Si ninguna, las que casan con
 *  mas palabras (nunca solo por un numero suelto). */
function mejores<T extends { buscable: string }>(q: string, filas: T[], cuantas = 6): T[] {
  const buscadas = trozos(q).filter((p) => esNumero(p) || p.length >= 2);
  if (!buscadas.length) return [];
  const puntuadas = filas
    .map((f) => ({ f, n: aciertos(buscadas, f.buscable) }))
    .filter((x) => x.n > 0);
  const todas = puntuadas.filter((x) => x.n === buscadas.length);
  if (todas.length) return todas.slice(0, cuantas).map((x) => x.f);
  return puntuadas
    .filter((x) => buscadas.some((p) => !esNumero(p) && p.length >= 3 && limpio(x.f.buscable).includes(p)))
    .sort((a, b) => b.n - a.n)
    .slice(0, cuantas)
    .map((x) => x.f);
}

// ------------------------------------------------------------ personas

export type PropuestaPersona = {
  /** puesto | persona | persona_comunidad */
  tipo: "puesto" | "persona" | "persona_comunidad";
  id: string;
  nombre: string;
  detalle: string;
};

type FilaPuesto = {
  id: string;
  cargo: string | null;
  hasta: string | null;
  persona: { id: string; nombre: string; apellidos: string | null } | null;
  empresa: { nombre_accesalia: string | null; nombre_legal: string | null } | null;
  contratas: { nombre: string } | null;
  organismos: { nombre: string } | null;
};

async function personas(): Promise<(PropuestaPersona & { buscable: string })[]> {
  const hoy = new Date().toISOString().slice(0, 10);
  const [puestos, sueltas, deComunidad] = await Promise.all([
    todo<FilaPuesto>(
      "puesto?select=id,cargo,hasta,persona(id,nombre,apellidos),empresa(nombre_accesalia,nombre_legal),contratas(nombre),organismos(nombre)",
    ),
    todo<{ id: string; nombre: string; apellidos: string | null; puesto: { id: string }[] }>(
      "persona?select=id,nombre,apellidos,puesto(id)&activa=is.true",
    ),
    todo<{ id: string; nombre: string | null; rol: string | null; comunidades: { nombre: string } | null }>(
      "personas_comunidad?select=id,nombre,rol,comunidades(nombre)",
    ),
  ]);

  const salida: (PropuestaPersona & { buscable: string })[] = [];
  for (const p of puestos) {
    if (!p.persona || (p.hasta && p.hasta < hoy)) continue;
    const nombre = [p.persona.nombre, p.persona.apellidos].filter(Boolean).join(" ");
    const donde = p.empresa?.nombre_accesalia ?? p.empresa?.nombre_legal ?? p.contratas?.nombre ?? p.organismos?.nombre ?? "";
    const detalle = [donde, p.cargo].filter(Boolean).join(" · ");
    salida.push({ tipo: "puesto", id: p.id, nombre, detalle, buscable: `${nombre} ${detalle} ${p.empresa?.nombre_legal ?? ""}` });
  }
  for (const p of sueltas) {
    if (p.puesto.length) continue;
    const nombre = [p.nombre, p.apellidos].filter(Boolean).join(" ");
    salida.push({ tipo: "persona", id: p.id, nombre, detalle: "", buscable: nombre });
  }
  for (const p of deComunidad) {
    if (!p.nombre) continue;
    const detalle = [p.rol, p.comunidades?.nombre].filter(Boolean).join(" · ");
    salida.push({ tipo: "persona_comunidad", id: p.id, nombre: p.nombre, detalle, buscable: `${p.nombre} ${detalle}` });
  }
  return salida;
}

export async function proponerPersonas(q: string): Promise<PropuestaPersona[]> {
  return mejores(q, await personas()).map(({ tipo, id, nombre, detalle }) => ({ tipo, id, nombre, detalle }));
}

// ------------------------------------------------------------ direcciones

export type PropuestaDireccion = {
  tipo: "comunidad" | "oportunidad";
  id: string;
  nombre: string;
  detalle: string;
};

async function direcciones(): Promise<(PropuestaDireccion & { buscable: string })[]> {
  const [comunidades, opps] = await Promise.all([
    todo<{ id: string; nombre: string; municipio: string | null; direccion: string | null }>(
      "comunidades?select=id,nombre,municipio,direccion",
    ),
    todo<{ id: string; nombre: string | null; comunidad_provisional: string | null; codigo: string | null }>(
      "oportunidades?select=id,nombre,comunidad_provisional,codigo&comunidad_id=is.null",
    ),
  ]);
  const salida: (PropuestaDireccion & { buscable: string })[] = comunidades.map((c) => ({
    tipo: "comunidad",
    id: c.id,
    nombre: c.nombre,
    detalle: c.municipio ?? "",
    buscable: `${c.nombre} ${c.direccion ?? ""} ${c.municipio ?? ""}`,
  }));
  for (const o of opps) {
    const nombre = o.nombre ?? o.comunidad_provisional;
    if (!nombre) continue;
    salida.push({
      tipo: "oportunidad",
      id: o.id,
      nombre,
      detalle: ["oportunidad sin comunidad", o.codigo].filter(Boolean).join(" · "),
      buscable: `${nombre} ${o.comunidad_provisional ?? ""}`,
    });
  }
  return salida;
}

export async function proponerDirecciones(q: string): Promise<PropuestaDireccion[]> {
  return mejores(q, await direcciones()).map(({ tipo, id, nombre, detalle }) => ({ tipo, id, nombre, detalle }));
}

// ------------------------------------------------------------ el postit

// LA LLAMADA ES UN POSTIT (Monica, 8-oct-2026). Se guarda SOLA a cada cambio,
// desde la primera letra: nace 'abierta'. Guardar la pasa a 'por_colocar' y
// exige persona o direccion elegida ("hay que poder colgar la nota en alguna
// parte"). Descartar la deja 'descartada', pero la fila se queda siempre.
// Cada uno ve y reabre los suyos; direccion, todos.

export type Elegido = { tipo: string; id: string | null; etiqueta: string } | null;

export type Postit = {
  id: string;
  estado: string;
  recibida_en: string;
  que_dicen: string;
  quien_texto: string;
  quien: Elegido;
  donde_texto: string;
  donde: Elegido;
  area: string | null;
  autor: string;
  mia: boolean;
};

/** Lo que manda el postit a cada cambio. */
export type DatosPostit = {
  id: string;
  que_dicen: string;
  quien_texto: string;
  quien: { tipo: string; id: string | null } | null;
  donde_texto: string;
  donde: { tipo: string; id: string | null } | null;
  area: string | null;
};

const TIPOS_QUIEN = ["puesto", "persona", "persona_comunidad", "nuevo"];
const TIPOS_DONDE = ["comunidad", "oportunidad", "nueva"];

function fila(d: DatosPostit) {
  const quien = d.quien && TIPOS_QUIEN.includes(d.quien.tipo) ? d.quien : null;
  const donde = d.donde && TIPOS_DONDE.includes(d.donde.tipo) ? d.donde : null;
  const t = (x: string) => (x.trim() === "" ? null : x);
  return {
    que_dicen: d.que_dicen,
    quien_texto: t(d.quien_texto),
    quien_puesto_id: quien?.tipo === "puesto" ? quien.id : null,
    quien_persona_id: quien?.tipo === "persona" ? quien.id : null,
    quien_persona_comunidad_id: quien?.tipo === "persona_comunidad" ? quien.id : null,
    quien_nuevo: quien?.tipo === "nuevo",
    donde_texto: t(d.donde_texto),
    donde_comunidad_id: donde?.tipo === "comunidad" ? donde.id : null,
    donde_oportunidad_id: donde?.tipo === "oportunidad" ? donde.id : null,
    donde_nueva: donde?.tipo === "nueva",
    area: AREAS_LLAMADA.some((a) => a.clave === d.area) ? d.area : null,
    actualizado_en: new Date().toISOString(),
  };
}

async function pedir(path: string, init: RequestInit = {}) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { ...CAB, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase llamadas ${r.status}: ${await r.text()}`);
  return r.json() as Promise<{ id: string; estado: string }[]>;
}

/** Guarda lo escrito. Solo el autor toca su postit, y nunca uno descartado:
 *  el descartado lo lee direccion y no se puede vaciar para no dejar rastro
 *  (Monica, 8-oct-2026). */
export async function guardarPostit(d: DatosPostit, autor: string): Promise<string> {
  const id = encodeURIComponent(d.id);
  const hechas = await pedir(`llamadas?id=eq.${id}&apuntada_por=eq.${autor}&estado=neq.descartada&select=id,estado`, {
    method: "PATCH",
    body: JSON.stringify(fila(d)),
  });
  if (hechas.length) return hechas[0].estado;
  // Si dos guardados se cruzan (el automatico y Guardar), el segundo no choca:
  // se ignora el alta repetida y se vuelve a escribir encima.
  const [nueva] = await pedir("llamadas?select=id,estado&on_conflict=id", {
    method: "POST",
    headers: { Prefer: "return=representation,resolution=ignore-duplicates" },
    body: JSON.stringify({ id: d.id, apuntada_por: autor, ...fila(d) }),
  });
  if (nueva) return nueva.estado;
  const [otra] = await pedir(`llamadas?id=eq.${id}&apuntada_por=eq.${autor}&estado=neq.descartada&select=id,estado`, {
    method: "PATCH",
    body: JSON.stringify(fila(d)),
  });
  if (!otra) throw new Error("Esta llamada no se puede tocar");
  return otra.estado;
}

/** Cambia el estado de un postit suyo, si esta en uno de los de partida. */
export async function cambiarEstado(id: string, autor: string, desde: string[], a: string): Promise<void> {
  await pedir(
    `llamadas?id=eq.${encodeURIComponent(id)}&apuntada_por=eq.${autor}&estado=in.(${desde.join(",")})&select=id,estado`,
    { method: "PATCH", body: JSON.stringify({ estado: a, actualizado_en: new Date().toISOString() }) },
  );
}

type FilaLlamada = {
  id: string;
  estado: string;
  recibida_en: string;
  que_dicen: string;
  quien_texto: string | null;
  quien_puesto_id: string | null;
  quien_persona_id: string | null;
  quien_persona_comunidad_id: string | null;
  quien_nuevo: boolean;
  donde_texto: string | null;
  donde_comunidad_id: string | null;
  donde_oportunidad_id: string | null;
  donde_nueva: boolean;
  area: string | null;
  apuntada_por: string;
  equipo: { nombre: string; apellidos: string | null } | null;
};

/** Los postits de alguien (o todos), los mas nuevos primero. Cada uno ve los
 *  suyos SIN los descartados; los descartados solo salen en "todas", que es de
 *  direccion. */
export async function listarPostits(
  yo: string,
  opciones: { todas?: boolean; soloAbiertas?: boolean } = {},
): Promise<Postit[]> {
  const filtros = [
    opciones.todas ? "" : `apuntada_por=eq.${yo}&estado=neq.descartada`,
    opciones.soloAbiertas ? "estado=eq.abierta" : "",
  ].filter(Boolean);
  const r = await fetch(
    `${URL_BASE}/rest/v1/llamadas?select=*,equipo(nombre,apellidos)&order=recibida_en.desc&limit=80` +
      filtros.map((f) => `&${f}`).join(""),
    { headers: CAB, cache: "no-store" },
  );
  if (!r.ok) throw new Error(`Supabase llamadas ${r.status}: ${await r.text()}`);
  const filas = (await r.json()) as FilaLlamada[];
  if (!filas.length) return [];

  const [gente, sitios] = await Promise.all([personas(), direcciones()]);
  const etiquetaDe = <T extends { tipo: string; id: string; nombre: string; detalle: string }>(l: T[], tipo: string, id: string) => {
    const x = l.find((p) => p.tipo === tipo && p.id === id);
    return x ? [x.nombre, x.detalle].filter(Boolean).join(" · ") : "(ya no está)";
  };

  return filas.map((f) => {
    let quien: Elegido = null;
    if (f.quien_nuevo) quien = { tipo: "nuevo", id: null, etiqueta: "Nueva persona de contacto, por crear" };
    for (const [tipo, id] of [
      ["puesto", f.quien_puesto_id],
      ["persona", f.quien_persona_id],
      ["persona_comunidad", f.quien_persona_comunidad_id],
    ] as const)
      if (id) quien = { tipo, id, etiqueta: etiquetaDe(gente, tipo, id) };
    let donde: Elegido = null;
    if (f.donde_nueva) donde = { tipo: "nueva", id: null, etiqueta: "Nueva dirección, por crear" };
    for (const [tipo, id] of [
      ["comunidad", f.donde_comunidad_id],
      ["oportunidad", f.donde_oportunidad_id],
    ] as const)
      if (id) donde = { tipo, id, etiqueta: etiquetaDe(sitios, tipo, id) };
    return {
      id: f.id,
      estado: f.estado,
      recibida_en: f.recibida_en,
      que_dicen: f.que_dicen,
      quien_texto: f.quien_texto ?? "",
      quien,
      donde_texto: f.donde_texto ?? "",
      donde,
      area: f.area,
      autor: [f.equipo?.nombre, f.equipo?.apellidos].filter(Boolean).join(" "),
      mia: f.apuntada_por === yo,
    };
  });
}
