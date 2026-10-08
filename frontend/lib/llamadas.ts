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

// ------------------------------------------------------------ guardar

export type NuevaLlamada = {
  apuntadaPor: string;
  queDicen: string;
  quienTexto: string | null;
  quien: { tipo: "puesto" | "persona" | "persona_comunidad" | "nuevo"; id: string | null } | null;
  dondeTexto: string | null;
  donde: { tipo: "comunidad" | "oportunidad" | "nueva"; id: string | null } | null;
  area: string | null;
};

export async function guardarLlamada(l: NuevaLlamada): Promise<{ id: string; recibida_en: string }> {
  const fila = {
    apuntada_por: l.apuntadaPor,
    que_dicen: l.queDicen,
    quien_texto: l.quienTexto,
    quien_puesto_id: l.quien?.tipo === "puesto" ? l.quien.id : null,
    quien_persona_id: l.quien?.tipo === "persona" ? l.quien.id : null,
    quien_persona_comunidad_id: l.quien?.tipo === "persona_comunidad" ? l.quien.id : null,
    quien_nuevo: l.quien?.tipo === "nuevo",
    donde_texto: l.dondeTexto,
    donde_comunidad_id: l.donde?.tipo === "comunidad" ? l.donde.id : null,
    donde_oportunidad_id: l.donde?.tipo === "oportunidad" ? l.donde.id : null,
    donde_nueva: l.donde?.tipo === "nueva",
    area: AREAS_LLAMADA.some((a) => a.clave === l.area) ? l.area : null,
  };
  const r = await fetch(`${URL_BASE}/rest/v1/llamadas?select=id,recibida_en`, {
    method: "POST",
    headers: { ...CAB, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(fila),
  });
  if (!r.ok) throw new Error(`Supabase llamadas ${r.status}: ${await r.text()}`);
  const [hecha] = (await r.json()) as { id: string; recibida_en: string }[];
  return hecha;
}
