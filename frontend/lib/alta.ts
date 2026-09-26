// lib/alta.ts
//
// EL ALTA DE UNA COMUNIDAD (Monica, 25-sep-2026).
//
// Son TRES altas distintas, con tres condiciones distintas, y no hay que
// mezclarlas (me lo corrigio ella despues de que yo hiciera justo eso):
//
//   COMUNIDAD    gira alrededor de la DIRECCION -> la direccion es obligatoria
//   ADMINISTRADOR gira alrededor de la PERSONA de contacto
//   OPORTUNIDAD  gira alrededor de la ENTRADA DEL DIARIO
//
// Esto es la primera. Sin direccion no hay comunidad, porque la direccion ES
// la comunidad. Lo demas —administrador, comercial, edificio, presidente,
// nota— puede llegar despues.
//
// La nota SI abre oportunidad (Monica): el alta de una comunidad arranca su
// proceso comercial. La diferencia con la tercera puerta no es que aqui no
// haya oportunidad, es que aqui la direccion es obligatoria y alli no.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function leer<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

async function crear<T>(tabla: string, fila: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${tabla}`, {
    method: "POST",
    headers: {
      apikey: SECRETO,
      Authorization: `Bearer ${SECRETO}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(fila),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase ${tabla} ${r.status}: ${await r.text()}`);
  const filas = (await r.json()) as T[];
  return filas[0];
}

// ------------------------------------------------------------ lo que se elige

export type OpcionAdmin = { id: string; nombre: string };
export type OpcionPersona = { id: string; empresaId: string; nombre: string; cargo: string | null };
export type OpcionComercial = { id: string; nombre: string };

export type OpcionesAlta = {
  administraciones: OpcionAdmin[];
  personas: OpcionPersona[];
  comerciales: OpcionComercial[];
};

/** Todo lo que el formulario deja elegir. En cascada: primero la
 *  administracion, y las personas se filtran por ella en el navegador. */
export async function opcionesAlta(): Promise<OpcionesAlta> {
  const [admins, puestos, comerciales] = await Promise.all([
    leer<{ id: string; nombre_accesalia: string }[]>(
      "empresa?select=id,nombre_accesalia&activa=is.true&order=nombre_accesalia.asc&limit=2000",
    ),
    leer<{ id: string; empresa_id: string | null; cargo: string | null; persona: { nombre: string } | null }[]>(
      "puesto?select=id,empresa_id,cargo,persona(nombre)&hasta=is.null&limit=2000",
    ),
    leer<{ id: string; nombre: string; apellidos: string | null }[]>(
      "comerciales?select=id,nombre,apellidos&activo=eq.true&order=nombre.asc",
    ),
  ]);

  return {
    administraciones: admins.map((a) => ({ id: a.id, nombre: a.nombre_accesalia })),
    personas: puestos
      .filter((p) => p.empresa_id && p.persona?.nombre)
      .map((p) => ({ id: p.id, empresaId: p.empresa_id as string, nombre: p.persona!.nombre, cargo: p.cargo }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    comerciales: comerciales.map((c) => ({ id: c.id, nombre: [c.nombre, c.apellidos].filter(Boolean).join(" ") })),
  };
}

// ------------------------------------------------------------------- el alta

export type DatosComunidad = {
  /** La direccion. Un solo texto que no se descompone, a proposito. Obligatoria. */
  direccion: string;
  cp: string | null;
  municipio: string | null;
  provincia: string | null;
  administracionId: string | null;
  puestoId: string | null;
  /** Si la administracion no existe todavia se crea AQUI, sin salir de la
   *  pantalla: "que no tenga que ir a una pantalla para la direccion, a otra
   *  para el canal, a otra para crearle admin" (Monica). */
  administracionNueva: { nombre: string; telefono: string | null; correo: string | null } | null;
  /** Lo mismo con la persona: si la administracion no tiene ninguna, o es
   *  nueva, se da de alta aqui. */
  personaNueva: { nombre: string; cargo: string | null; telefono: string | null; correo: string | null } | null;
  /** El comercial al que le toca. Se guarda en la NOTA, no en la comunidad:
   *  el comercial cuelga de la administracion y de la oportunidad, nunca del
   *  edificio. */
  comercialId: string | null;
  /** Como ha llegado: `oportunidades.tipo_origen`. */
  tipoOrigen: string;
  nota: string | null;
  // el edificio
  anio: number | null;
  viviendas: number | null;
  catastro: string | null;
  cif: string | null;
  // el presidente
  presidente: { nombre: string; telefono: string | null; email: string | null; documento: string | null } | null;
};

export type ResultadoComunidad = { comunidadId: string; oportunidadId: string; interaccionId: string | null };

const hoy = () => new Date().toISOString().slice(0, 10);

export async function crearComunidad(d: DatosComunidad, autorId: string | null): Promise<ResultadoComunidad> {
  // 1 · la comunidad. `nombre` ES la direccion.
  const c = await crear<{ id: string }>("comunidades", {
    nombre: d.direccion,
    cp: d.cp,
    municipio: d.municipio,
    provincia: d.provincia,
    anio_construccion: d.anio,
    num_viviendas: d.viviendas,
    referencia_catastral: d.catastro,
    cif_comunidad: d.cif,
    activa: true,
  });
  const comunidadId = c.id;

  // 2 · su presidente
  if (d.presidente) {
    await crear("personas_comunidad", {
      comunidad_id: comunidadId,
      nombre: d.presidente.nombre,
      rol: "presidente",
      telefono: d.presidente.telefono,
      email: d.presidente.email,
      documento: d.presidente.documento,
      es_contacto_principal: true,
    });
  }

  // 3 · quien la administra. La empresa y la persona pueden nacer aqui mismo.
  let empresaId = d.administracionId;
  if (!empresaId && d.administracionNueva) {
    const e = await crear<{ id: string }>("empresa", {
      nombre_accesalia: d.administracionNueva.nombre,
      telefono: d.administracionNueva.telefono,
      activa: true,
    });
    empresaId = e.id;
    if (d.administracionNueva.correo) {
      await crear("correo", {
        empresa_id: empresaId,
        email: d.administracionNueva.correo,
        etiqueta: "general",
        principal: true,
      });
    }
  }

  let puestoId = d.puestoId;
  if (!puestoId && d.personaNueva && empresaId) {
    const per = await crear<{ id: string }>("persona", { nombre: d.personaNueva.nombre, activa: true });
    const pue = await crear<{ id: string }>("puesto", {
      persona_id: per.id,
      empresa_id: empresaId,
      cargo: d.personaNueva.cargo,
      telefono_empresa: d.personaNueva.telefono,
      desde: hoy(),
    });
    puestoId = pue.id;
    if (d.personaNueva.correo) {
      await crear("correo", {
        puesto_id: puestoId,
        empresa_id: empresaId,
        email: d.personaNueva.correo,
        etiqueta: "general",
        principal: true,
      });
    }
  }

  if (empresaId) {
    await crear("comunidad_admin_responsable", {
      comunidad_id: comunidadId,
      empresa_id: empresaId,
      puesto_id: puestoId,
      vigente: true,
      desde: hoy(),
    });
  }

  // 4 · su oportunidad: dar de alta una comunidad es arrancar su proceso
  //     comercial. De aqui cuelga como ha llegado.
  const op = await crear<{ id: string }>("oportunidades", {
    comunidad_id: comunidadId,
    comercial_id: d.comercialId,
    puesto_id: puestoId,
    tipo_origen: d.tipoOrigen,
    estado: "activa",
    origen_notas: d.nota,
  });

  // 5 · la primera entrada del diario, con su fecha y quien la escribio.
  let interaccionId: string | null = null;
  if (d.nota) {
    const i = await crear<{ id: string }>("interacciones", {
      oportunidad_id: op.id,
      comercial_id: d.comercialId,
      puesto_id: puestoId,
      transcripcion: d.nota,
      origen: "manual",
      fecha_evento: hoy(),
      autor_id: autorId,
    });
    interaccionId = i.id;
    await crear("interaccion_comunidad", {
      interaccion_id: i.id,
      comunidad_id: comunidadId,
      origen: "alta",
    });
  }

  return { comunidadId, oportunidadId: op.id, interaccionId };
}
