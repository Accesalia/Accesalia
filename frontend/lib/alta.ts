// lib/alta.ts
//
// EL ALTA (Monica, 25-sep-2026). Es la puerta por la que entra todo lo
// comercial. Su regla, dicha por ella:
//
//   "lo que debe ser necesario es O direccion O administrador O nota
//    comercial, alguna cosa tiene que haber."
//
// Los tres casos que tiene que aguantar:
//   1. una direccion y nada mas (no sabemos quien la administra);
//   2. un administrador y NINGUNA direccion todavia ("Valentin me dice que
//      pase el martes, tiene 3 comunidades para ascensor"): la nota queda
//      colgada de el, y cuando lleguen las direcciones cada una abre su
//      oportunidad apuntando a esta con `oportunidad_origen_id`;
//   3. ni una cosa ni la otra: un contacto suelto de la web (Vanesa Lopez y su
//      telefono). DECIDIDO por Monica: "la idea es que Vanesa y su telefono no
//      existan mas que como nota comercial, hasta que al menos tengamos una
//      direccion de la que tirar. Si no, no tenemos nada". O sea que NO se le
//      busca sitio como persona: vive en el texto de la nota hasta que haya
//      direccion, y entonces se crea la comunidad y ella pasa a ser suya.
//
// Lo que se escribe, en este orden:
//   comunidad (si hay direccion) -> su presidente -> su administrador
//   -> oportunidad (con comunidad de verdad o `comunidad_provisional`)
//   -> primera nota del diario, con fecha y autor.

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

export type DatosAlta = {
  direccion: string | null;
  cp: string | null;
  municipio: string | null;
  provincia: string | null;
  administracionId: string | null;
  puestoId: string | null;
  comercialId: string | null;
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

export type ResultadoAlta = {
  comunidadId: string | null;
  oportunidadId: string;
  interaccionId: string | null;
};

const hoy = () => new Date().toISOString().slice(0, 10);

export async function crearAlta(d: DatosAlta, autorId: string | null): Promise<ResultadoAlta> {
  // 1 · la comunidad, solo si hay direccion. `nombre` ES la direccion: un solo
  //     texto que no se descompone, a proposito.
  let comunidadId: string | null = null;
  if (d.direccion) {
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
    comunidadId = c.id;

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

    if (d.administracionId) {
      await crear("comunidad_admin_responsable", {
        comunidad_id: comunidadId,
        empresa_id: d.administracionId,
        puesto_id: d.puestoId,
        vigente: true,
        desde: hoy(),
      });
    }
  }

  // 2 · la oportunidad. Si no hay comunidad todavia, la direccion prometida (o
  //     el nombre de quien llama) va en `comunidad_provisional`: el lead
  //     fantasma que ya estaba previsto en el modelo.
  const op = await crear<{ id: string }>("oportunidades", {
    comunidad_id: comunidadId,
    comunidad_provisional: comunidadId ? null : d.direccion,
    comercial_id: d.comercialId,
    puesto_id: d.puestoId,
    tipo_origen: d.tipoOrigen,
    estado: "activa",
    origen_notas: d.nota,
  });

  // 3 · la primera nota del diario comercial: fecha, autor y texto.
  let interaccionId: string | null = null;
  if (d.nota) {
    const i = await crear<{ id: string }>("interacciones", {
      oportunidad_id: op.id,
      comercial_id: d.comercialId,
      puesto_id: d.puestoId,
      transcripcion: d.nota,
      origen: "manual",
      fecha_evento: hoy(),
      autor_id: autorId,
    });
    interaccionId = i.id;
    if (comunidadId) {
      await crear("interaccion_comunidad", {
        interaccion_id: i.id,
        comunidad_id: comunidadId,
        origen: "alta",
      });
    }
  }

  return { comunidadId, oportunidadId: op.id, interaccionId };
}
