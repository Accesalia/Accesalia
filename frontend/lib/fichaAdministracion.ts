// lib/fichaAdministracion.ts
//
// LA FICHA DE UNA ADMINISTRACION DE FINCAS (Monica, 20-oct-2026).
//
// Un frankenstein de dos pantallas suyas: el ALTA del 26-sep (sus tarjetas, sus
// colores, su "escribir encima") y la ficha del 10-sep (las opps abiertas, lo
// pactado). Su colocacion:
//   arriba   el nombre; debajo, telefono y correo (la direccion NO).
//   izquierda  quien es el jefe · quien mas trabaja alli (una linea cada uno,
//              con el comercial que lo lleva) · departamentos (si no hay dados
//              de alta, "No": no hay campo si/no, decidido) · opps abiertas.
//   derecha    una tarjeta en tres: condiciones a respetar · lo pactado (la
//              comision: solo la ven unas funciones) · como le conocimos;
//              debajo, los datos de la empresa.
//
// LAS NOTAS DE LA FICHA NO SON EL DIARIO (Monica, 20-oct-2026): son lo que hay
// que saber de esa persona antes de llamarla, sin fecha ni "como nos
// enteramos": "no preguntarle por su mujer, se acaba de divorciar", "su socio
// se ha llevado media cartera, cuidado". Viven aparte, en
// notas_ficha_administracion, y llevan SIEMPRE fecha y quien la escribe: "se ha
// divorciado es relevante en 2019, no en 2026". El texto suelto de antes
// (puesto.notas, empresa.notas) no tiene fecha: se ensena como nota "sin
// fecha" y no se toca. Si no hay ninguna, no sale nada: solo anadir nota.
// En esa tabla SOLO escribe el "anadir nota" de esta ficha: lo que se apunta
// desde el diario o el satelite va al diario (o a la ficha de persona, cuando
// exista), nunca aqui (Monica, 20-oct-2026).
//
// GUARDAR COMPARA CON LO QUE HAY: solo se escribe lo que ha cambiado, para que
// dos personas con la ficha abierta no se pisen lo que no tocaron.

import "server-only";
import { nombreDeOpp } from "./direccionOpp";
import { puntosDeOpps } from "./consulta";
import { canalesDe, type Canal } from "./canales";
import { columnasQuien, opcionesQuien, type OpcionQuien } from "./quien";
import type { Yo } from "./sesion";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function leer<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

async function escribir(metodo: "POST" | "PATCH", path: string, cuerpo: Record<string, unknown>): Promise<{ id: string } | null> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method: metodo,
    headers: { ...CAB, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(cuerpo),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  const filas = (await r.json()) as { id: string }[];
  return filas[0] ?? null;
}

// ------------------------------------------------------------- permisos

// LO PACTADO (la comision) es su propia seccion, porque no la ve todo el mundo
// (Monica, 20-oct-2026): direccion, secretaria comercial, Ana (3 presupuestos y
// facturacion de Ecobalance) y los comerciales, que son los que la rellenan.
const VEN_COMISION = ["secretaria", "supervision_comercial", "presupuestos_contratas", "facturacion_ecobalance", "comercial"];
const EDITAN_COMISION = ["comercial"];
const tiene = (yo: Yo, claves: string[]) => yo.funciones.some((f) => claves.includes(f.clave));

export const veComision = (yo: Yo) => yo.veTodo || tiene(yo, VEN_COMISION);
export const editaComision = (yo: Yo) => yo.veTodo || tiene(yo, EDITAN_COMISION);

// ------------------------------------------------------------- lo que se lee

/** Una nota de la ficha. Sin fecha ni autor solo las de antes (el texto suelto). */
export type NotaFicha = { id: string; fecha: string | null; autor: string | null; texto: string };

export type PersonaFicha = {
  puestoId: string;
  personaId: string | null;
  nombre: string;
  cargo: string | null;
  jefe: boolean;
  telefono: string | null;
  /** El movil personal: se ensena de pista si no hay el del trabajo. */
  telefonoPersonal: string | null;
  correo: string | null;
  colegiado: string | null;
  comercialId: string | null;
  departamentoId: string | null;
  notas: NotaFicha[];
};

export type DepartamentoFicha = {
  id: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  queHace: string | null;
  /** La persona de contacto: la gente de la casa apuntada a ese departamento. */
  contactoId: string | null;
};

export type OppAbierta = {
  id: string;
  nombre: string;
  punto: string;
  bloque: number;
  comercial: string | null;
  ultimoContacto: string | null;
};

export type FichaAdministracion = {
  id: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  nombreLegal: string | null;
  cif: string | null;
  direccion: string | null;
  municipio: string | null;
  notas: NotaFicha[];
  comisionEstado: "cobra" | "no_cobra" | "sin_hablar";
  /** El acuerdo de comision de Ecobalance, si lo hay, para "ver ficha". */
  acuerdoId: string | null;
  origen: {
    canalId: string | null;
    quien: string | null;
    notas: string | null;
    respetar: boolean;
    duenoContrataId: string | null;
    servicioReservado: string | null;
    condicionesNotas: string | null;
  } | null;
  personas: PersonaFicha[];
  departamentos: DepartamentoFicha[];
  opps: OppAbierta[];
};

export type OpcionesFicha = {
  comerciales: { id: string; nombre: string }[];
  contratas: { id: string; nombre: string }[];
  canales: Canal[];
  quienes: OpcionQuien[];
};

type Correo = { id: string; email: string; principal: boolean };
const elCorreo = (l: Correo[] | null | undefined) => (l?.find((c) => c.principal) ?? l?.[0]) ?? null;
const limpio = (s: string | null | undefined) => (s && s.trim() !== "" ? s.trim() : null);

export async function leerFicha(id: string): Promise<FichaAdministracion | null> {
  const [empresas, puestos, deptos, origenes, acuerdos, adm] = await Promise.all([
    leer<{
      id: string; nombre_accesalia: string | null; nombre_legal: string | null; cif: string | null; telefono: string | null;
      direccion: string | null; municipio: string | null; notas: string | null; comision_estado: FichaAdministracion["comisionEstado"] | null;
      correo: Correo[];
    }[]>(
      "empresa?select=id,nombre_accesalia,nombre_legal,cif,telefono,direccion,municipio,notas,comision_estado," +
        `correo!correo_empresa_id_fkey(id,email,principal)&id=eq.${id}&tipo=eq.administracion_fincas&limit=1`,
    ),
    leer<{
      id: string; persona_id: string | null; cargo: string | null; cargo_clave: string | null; telefono_empresa: string | null;
      numero_colegiado: string | null; notas: string | null; comercial_id: string | null; departamento_id: string | null;
      persona: { nombre: string | null; apellidos: string | null; telefono_personal: string | null } | null;
      correo: Correo[];
    }[]>(
      "puesto?select=id,persona_id,cargo,cargo_clave,telefono_empresa,numero_colegiado,notas,comercial_id,departamento_id," +
        "persona:persona_id(nombre,apellidos,telefono_personal),correo!correo_puesto_id_fkey(id,email,principal)" +
        `&empresa_id=eq.${id}&hasta=is.null`,
    ),
    leer<{ id: string; departamento: string; telefono: string | null; notas: string | null; correo: Correo[] }[]>(
      `empresa_departamento?select=id,departamento,telefono,notas,correo!correo_departamento_id_fkey(id,email,principal)&empresa_id=eq.${id}&order=departamento.asc`,
    ),
    leer<{
      canal_id: string | null; quien_lo_trae: string | null; quien_comercial_id: string | null; notas: string | null;
      condiciona_oferta: boolean | null; dueno_contrata_id: string | null; servicio_reservado: string | null; condiciones_notas: string | null;
    }[]>(
      `administracion_origen?select=canal_id,quien_lo_trae,quien_comercial_id,notas,condiciona_oferta,dueno_contrata_id,servicio_reservado,condiciones_notas&empresa_id=eq.${id}&order=creado_en.asc&limit=1`,
    ),
    leer<{ acuerdo_id: string }[]>(`comision_acuerdo_empresas?select=acuerdo_id&empresa_id=eq.${id}&limit=1`),
    leer<{ oportunidad_id: string }[]>(`administradores_de_oportunidad?select=oportunidad_id&empresa_id=eq.${id}`),
  ]);
  const e = empresas[0];
  if (!e) return null;

  const puestoIds = puestos.map((p) => p.id);
  const trozos = [`empresa_id.eq.${id}`, ...(puestoIds.length ? [`puesto_id.in.(${puestoIds.join(",")})`] : [])];
  const notas = await leer<{ id: string; fecha: string; autor: string; texto: string; puesto_id: string | null }[]>(
    `notas_ficha_administracion?select=id,fecha,autor,texto,puesto_id&or=(${trozos.join(",")})&order=fecha.desc,creado_en.desc`,
  );
  /** Las de la tabla, de la mas nueva a la mas vieja, y al final el texto suelto de antes. */
  const notasDe = (puestoId: string | null, suelto: string | null): NotaFicha[] => [
    ...notas.filter((n) => n.puesto_id === puestoId).map((n) => ({ id: n.id, fecha: n.fecha, autor: n.autor, texto: n.texto })),
    ...(limpio(suelto) ? [{ id: "antes", fecha: null, autor: null, texto: limpio(suelto)! }] : []),
  ];

  const personas: PersonaFicha[] = puestos
    .map((p) => ({
      puestoId: p.id,
      personaId: p.persona_id,
      nombre: [p.persona?.nombre, p.persona?.apellidos].map((x) => x?.trim()).filter(Boolean).join(" ") || "Sin nombre",
      cargo: limpio(p.cargo),
      jefe: p.cargo_clave === "el que manda",
      telefono: limpio(p.telefono_empresa),
      telefonoPersonal: limpio(p.persona?.telefono_personal),
      correo: elCorreo(p.correo)?.email ?? null,
      colegiado: limpio(p.numero_colegiado),
      comercialId: p.comercial_id,
      departamentoId: p.departamento_id,
      notas: notasDe(p.id, p.notas),
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const departamentos: DepartamentoFicha[] = deptos.map((d) => ({
    id: d.id,
    nombre: d.departamento,
    telefono: limpio(d.telefono),
    correo: elCorreo(d.correo)?.email ?? null,
    queHace: limpio(d.notas),
    contactoId: personas.find((p) => p.departamentoId === d.id)?.puestoId ?? null,
  }));

  const o = origenes[0];
  const quien = o?.quien_lo_trae ? `persona:${o.quien_lo_trae}` : o?.quien_comercial_id ? `comercial:${o.quien_comercial_id}` : null;

  return {
    id: e.id,
    nombre: limpio(e.nombre_accesalia) ?? limpio(e.nombre_legal) ?? "Sin nombre",
    telefono: limpio(e.telefono),
    correo: elCorreo(e.correo)?.email ?? null,
    nombreLegal: limpio(e.nombre_legal),
    cif: limpio(e.cif),
    direccion: limpio(e.direccion),
    municipio: limpio(e.municipio),
    notas: notasDe(null, e.notas),
    comisionEstado: e.comision_estado ?? "sin_hablar",
    acuerdoId: acuerdos[0]?.acuerdo_id ?? null,
    origen: o
      ? {
          canalId: o.canal_id,
          quien,
          notas: limpio(o.notas),
          respetar: !!o.condiciona_oferta,
          duenoContrataId: o.dueno_contrata_id,
          servicioReservado: o.servicio_reservado,
          condicionesNotas: limpio(o.condiciones_notas),
        }
      : null,
    personas,
    departamentos,
    opps: await oppsAbiertas([...new Set(adm.map((a) => a.oportunidad_id))]),
  };
}

/** Sus opps vivas (abiertas o pausadas), por el administrador de su comunidad
 *  (administradores_de_oportunidad), con en que punto estan, quien las lleva y
 *  el ultimo contacto (lo mas reciente de su diario). */
async function oppsAbiertas(ids: string[]): Promise<OppAbierta[]> {
  if (!ids.length) return [];
  const lista = ids.join(",");
  const [opps, notas, inter] = await Promise.all([
    leer<{ id: string; nombre: string | null; codigo: string | null; estado: string; comercial: { nombre: string } | null }[]>(
      `oportunidades?select=id,nombre,codigo,estado,comercial:comercial_id(nombre)&id=in.(${lista})&estado=in.(abierta,pausada)`,
    ),
    leer<{ oportunidad_id: string; fecha: string | null }[]>(`notas_oportunidad?select=oportunidad_id,fecha&oportunidad_id=in.(${lista})&fecha=not.is.null`),
    leer<{ oportunidad_id: string; fecha_evento: string | null }[]>(`interacciones?select=oportunidad_id,fecha_evento&oportunidad_id=in.(${lista})&fecha_evento=not.is.null`),
  ]);
  const ultima = new Map<string, string>();
  const apunta = (opp: string, f: string | null) => {
    if (!f) return;
    const d = f.slice(0, 10);
    if ((ultima.get(opp) ?? "") < d) ultima.set(opp, d);
  };
  notas.forEach((n) => apunta(n.oportunidad_id, n.fecha));
  inter.forEach((i) => apunta(i.oportunidad_id, i.fecha_evento));
  const puntos = await puntosDeOpps(opps);
  return opps
    .map((o) => ({
      id: o.id,
      nombre: nombreDeOpp(o),
      ...puntos.get(o.id)!,
      comercial: o.comercial?.nombre ?? null,
      ultimoContacto: ultima.get(o.id) ?? null,
    }))
    .sort((a, b) => (b.ultimoContacto ?? "").localeCompare(a.ultimoContacto ?? "") || a.nombre.localeCompare(b.nombre, "es"));
}

export async function opcionesFicha(): Promise<OpcionesFicha> {
  const [comerciales, contratas, canales, quienes] = await Promise.all([
    leer<{ id: string; nombre: string; apellidos: string | null }[]>("comerciales?select=id,nombre,apellidos&activo=eq.true&order=nombre.asc"),
    leer<{ id: string; nombre: string }[]>("contratas?select=id,nombre&order=nombre.asc&limit=500").catch(() => []),
    canalesDe("administracion"),
    opcionesQuien(),
  ]);
  return {
    comerciales: comerciales.map((c) => ({ id: c.id, nombre: [c.nombre, c.apellidos].filter(Boolean).join(" ") })),
    contratas,
    canales,
    quienes,
  };
}

// ------------------------------------------------------------- lo que se guarda

export type PersonaGuardar = {
  /** null = nueva. */
  puestoId: string | null;
  /** Jefe o empleado: se puede cambiar de uno a otro (Monica, 20-oct-2026:
   *  "apuntamos un nombre y no sabemos si es jefe o currito"). */
  jefe: boolean;
  nombre: string;
  /** undefined = la pantalla no lo enseña a esta persona: no se toca. */
  cargo?: string | null;
  telefono: string | null;
  correo: string | null;
  colegiado?: string | null;
  /** undefined = la pantalla no lo enseña (el jefe): no se toca. */
  comercialId?: string | null;
  /** "Ya no trabaja aqui": se le cierra el puesto, no se borra. */
  quitar: boolean;
  /** La nota que se acaba de escribir: fecha (hoy) y autor los pone la app. */
  notaNueva: string | null;
};

export type DepartamentoGuardar = {
  id: string | null;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  queHace: string | null;
  contactoId: string | null;
};

export type FichaGuardar = {
  nombre: string | null;
  telefono: string | null;
  correo: string | null;
  nombreLegal: string | null;
  cif: string | null;
  direccion: string | null;
  municipio: string | null;
  notaNueva: string | null;
  /** Solo llega si quien guarda puede tocar la comision. */
  comisionEstado: FichaAdministracion["comisionEstado"] | null;
  origen: {
    canalId: string | null;
    quien: string | null;
    notas: string | null;
    respetar: boolean;
    duenoContrataId: string | null;
    servicioReservado: string | null;
    condicionesNotas: string | null;
  };
  personas: PersonaGuardar[];
  departamentos: DepartamentoGuardar[];
};

const hoy = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

/** Solo lo que cambia: el campo que no se toco no se escribe. */
function cambios<T extends Record<string, unknown>>(antes: T, ahora: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(ahora) as (keyof T)[]) if ((antes[k] ?? null) !== (ahora[k] ?? null)) out[k] = ahora[k];
  return out;
}

async function ponerCorreo(dueno: "empresa_id" | "puesto_id" | "departamento_id", id: string, antes: string | null, ahora: string | null) {
  if ((antes ?? null) === (ahora ?? null) || !ahora) return; // vaciarlo no borra el correo: se habla antes
  const [actual] = await leer<{ id: string }[]>(`correo?select=id&${dueno}=eq.${id}&order=principal.desc&limit=1`);
  if (actual) await escribir("PATCH", `correo?id=eq.${actual.id}`, { email: ahora });
  else await escribir("POST", "correo", { [dueno]: id, email: ahora, etiqueta: "general", principal: true });
}

async function ponerNota(donde: { empresa_id: string } | { puesto_id: string }, texto: string | null, yo: Yo) {
  if (!texto || texto.trim() === "") return;
  await escribir("POST", "notas_ficha_administracion", {
    ...donde,
    texto: texto.trim(),
    fecha: hoy(),
    autor_id: yo.id,
    autor: [yo.nombre, yo.apellidos].filter(Boolean).join(" "),
  });
}

export async function guardarFicha(id: string, d: FichaGuardar, yo: Yo): Promise<void> {
  const antes = await leerFicha(id);
  if (!antes) throw new Error("Esa administración no existe.");

  // 1 · la empresa
  const empresa = cambios(
    { nombre_accesalia: antes.nombre, telefono: antes.telefono, nombre_legal: antes.nombreLegal, cif: antes.cif, direccion: antes.direccion, municipio: antes.municipio, comision_estado: antes.comisionEstado } as Record<string, unknown>,
    { nombre_accesalia: d.nombre ?? antes.nombre, telefono: d.telefono, nombre_legal: d.nombreLegal, cif: d.cif, direccion: d.direccion, municipio: d.municipio, comision_estado: d.comisionEstado ?? antes.comisionEstado },
  );
  if (Object.keys(empresa).length) await escribir("PATCH", `empresa?id=eq.${id}`, empresa);
  await ponerCorreo("empresa_id", id, antes.correo, d.correo);
  await ponerNota({ empresa_id: id }, d.notaNueva, yo);

  // 2 · como le conocimos y las condiciones (una fila, la primera)
  const o = antes.origen;
  const origenAntes = { canal_id: o?.canalId ?? null, ...columnasQuien(o?.quien ?? null), notas: o?.notas ?? null, condiciona_oferta: o?.respetar ?? false, dueno_contrata_id: o?.duenoContrataId ?? null, servicio_reservado: o?.servicioReservado ?? null, condiciones_notas: o?.condicionesNotas ?? null };
  const origenAhora = { canal_id: d.origen.canalId, ...columnasQuien(d.origen.quien), notas: d.origen.notas, condiciona_oferta: d.origen.respetar, dueno_contrata_id: d.origen.duenoContrataId, servicio_reservado: d.origen.servicioReservado, condiciones_notas: d.origen.condicionesNotas };
  const origen = cambios(origenAntes as Record<string, unknown>, origenAhora);
  if (Object.keys(origen).length) {
    if (o) await escribir("PATCH", `administracion_origen?empresa_id=eq.${id}`, origen);
    else await escribir("POST", "administracion_origen", { empresa_id: id, ...origenAhora });
  }

  // 3 · la gente
  const nuevosIds = new Map<PersonaGuardar, string>();
  for (const p of d.personas) {
    const viejo = p.puestoId ? antes.personas.find((x) => x.puestoId === p.puestoId) : null;
    if (p.puestoId && !viejo) continue; // ya no es de aqui: no se toca

    if (viejo) {
      if (p.quitar) {
        await escribir("PATCH", `puesto?id=eq.${viejo.puestoId}`, { hasta: hoy() });
        continue;
      }
      if (p.nombre !== viejo.nombre && viejo.personaId) {
        // Se escribe el nombre entero en una sola casilla: los apellidos van dentro.
        await escribir("PATCH", `persona?id=eq.${viejo.personaId}`, { nombre: p.nombre, apellidos: null });
      }
      const puesto = cambios(
        { cargo: viejo.cargo, telefono_empresa: viejo.telefono, numero_colegiado: viejo.colegiado, comercial_id: viejo.comercialId } as Record<string, unknown>,
        {
          cargo: p.cargo === undefined ? viejo.cargo : p.cargo,
          telefono_empresa: p.telefono,
          numero_colegiado: p.colegiado === undefined ? viejo.colegiado : p.colegiado,
          comercial_id: p.comercialId === undefined ? viejo.comercialId : p.comercialId,
        },
      );
      // De empleado a jefe, o al reves: la marca "el que manda" del puesto.
      if (p.jefe !== viejo.jefe) puesto.cargo_clave = p.jefe ? "el que manda" : null;
      if (Object.keys(puesto).length) await escribir("PATCH", `puesto?id=eq.${viejo.puestoId}`, puesto);
      await ponerCorreo("puesto_id", viejo.puestoId, viejo.correo, p.correo);
      await ponerNota({ puesto_id: viejo.puestoId }, p.notaNueva, yo);
    } else {
      if (p.quitar || p.nombre.trim() === "") continue;
      const persona = await escribir("POST", "persona", { nombre: p.nombre, activa: true });
      const puesto = await escribir("POST", "puesto", {
        persona_id: persona!.id,
        empresa_id: id,
        cargo: p.cargo ?? null,
        cargo_clave: p.jefe ? "el que manda" : null,
        telefono_empresa: p.telefono,
        numero_colegiado: p.colegiado ?? null,
        comercial_id: p.comercialId ?? null,
        desde: hoy(),
      });
      nuevosIds.set(p, puesto!.id);
      if (p.correo) await escribir("POST", "correo", { puesto_id: puesto!.id, email: p.correo, etiqueta: "general", principal: true });
      await ponerNota({ puesto_id: puesto!.id }, p.notaNueva, yo);
    }
  }

  // 4 · los departamentos, y su persona de contacto (la de la casa apuntada a el)
  for (const dep of d.departamentos) {
    const viejo = dep.id ? antes.departamentos.find((x) => x.id === dep.id) : null;
    let depId = viejo?.id ?? null;
    if (viejo) {
      const fila = cambios(
        { departamento: viejo.nombre, telefono: viejo.telefono, notas: viejo.queHace } as Record<string, unknown>,
        { departamento: dep.nombre, telefono: dep.telefono, notas: dep.queHace },
      );
      if (Object.keys(fila).length) await escribir("PATCH", `empresa_departamento?id=eq.${viejo.id}`, fila);
      await ponerCorreo("departamento_id", viejo.id, viejo.correo, dep.correo);
    } else {
      if (dep.nombre.trim() === "") continue;
      depId = (await escribir("POST", "empresa_departamento", { empresa_id: id, departamento: dep.nombre, telefono: dep.telefono, notas: dep.queHace }))!.id;
      if (dep.correo) await escribir("POST", "correo", { departamento_id: depId, email: dep.correo, etiqueta: "general", principal: false });
    }
    const antesContacto = viejo?.contactoId ?? null;
    if (depId && dep.contactoId !== antesContacto) {
      if (antesContacto) await escribir("PATCH", `puesto?id=eq.${antesContacto}`, { departamento_id: null });
      if (dep.contactoId && antes.personas.some((x) => x.puestoId === dep.contactoId)) {
        await escribir("PATCH", `puesto?id=eq.${dep.contactoId}`, { departamento_id: depId });
      }
    }
  }
}
