// lib/altaAdministracion.ts
//
// EL ALTA DE UNA ADMINISTRACION DE FINCAS (Monica, 26-sep-2026, montada por
// ella en el taller: "FORMULARIO ADMIN mONICA").
//
// LO OBLIGATORIO NO ES LA ADMINISTRACION: es UNA PERSONA y UNA FORMA DE
// CONTACTO suya. "A veces no sabemos ni el nombre de la administracion de
// fincas, solo el del tio que nos llama". Si no hay nombre de empresa, la
// persona se guarda SUELTA (`puesto.empresa_id` admite null) y se le engancha
// la administracion el dia que se sepa. No se inventan nombres provisionales:
// "datos sucios = bd inutil en seis meses".
//
// Dos sitios para las personas, que no son lo mismo:
//   EL JEFE          -> su cargo es fijo, "el que manda". Puede quedarse vacio:
//                       no siempre se sabe quien manda alli.
//   QUIEN MAS TRABAJA -> su cargo lo escribe ella, con las palabras de esa casa.

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

export type OpcionSimple = { id: string; nombre: string };
export type OpcionesAdmin = { comerciales: OpcionSimple[]; contratas: OpcionSimple[] };

export async function opcionesAdministracion(): Promise<OpcionesAdmin> {
  const [comerciales, contratas] = await Promise.all([
    leer<{ id: string; nombre: string; apellidos: string | null }[]>(
      "comerciales?select=id,nombre,apellidos&activo=eq.true&order=nombre.asc",
    ),
    leer<{ id: string; nombre: string }[]>("contratas?select=id,nombre&order=nombre.asc&limit=500").catch(() => []),
  ]);
  return {
    comerciales: comerciales.map((c) => ({ id: c.id, nombre: [c.nombre, c.apellidos].filter(Boolean).join(" ") })),
    contratas: contratas.map((c) => ({ id: c.id, nombre: c.nombre })),
  };
}

// ------------------------------------------------------------------ el alta

export type PersonaAlta = {
  nombre: string;
  /** Las palabras de esa casa. En el jefe no se usa: su cargo es fijo. */
  cargo: string | null;
  departamento: string | null;
  telefonoTrabajo: string | null;
  telefonoPersonal: string | null;
  correoTrabajo: string | null;
  correoPersonal: string | null;
  colegiado: string | null;
  desde: string | null;
  notas: string | null;
};

export type DepartamentoAlta = {
  nombre: string;
  queHace: string | null;
  correo: string | null;
  telefono: string | null;
};

export type DatosAdministracion = {
  // la cabecera
  nombre: string | null;
  telefono: string | null;
  municipio: string | null;
  // la empresa
  nombreLegal: string | null;
  cif: string | null;
  direccion: string | null;
  correoGeneral: string | null;
  // nuestra relacion
  comercialId: string | null;
  comercialCaptadorId: string | null;
  altaCartera: string | null;
  comisionEstado: string;
  // como le hemos conocido
  llegoPor: string | null;
  llegoQuien: string | null;
  origenNotas: string | null;
  respetarCartera: boolean;
  deQuienEs: string | null;
  servicioReservado: string | null;
  // la gente
  jefes: PersonaAlta[];
  gente: PersonaAlta[];
  departamentos: DepartamentoAlta[];
};

export type ResultadoAdministracion = { empresaId: string | null; personas: number };

const hoy = () => new Date().toISOString().slice(0, 10);

export async function crearAdministracion(d: DatosAdministracion): Promise<ResultadoAdministracion> {
  // 1 · la empresa, SOLO si tiene nombre. Sin nombre no se inventa una.
  let empresaId: string | null = null;
  if (d.nombre) {
    const e = await crear<{ id: string }>("empresa", {
      nombre_accesalia: d.nombre,
      nombre_legal: d.nombreLegal,
      cif: d.cif,
      direccion: d.direccion,
      telefono: d.telefono,
      municipio: d.municipio,
      comercial_id: d.comercialId,
      comercial_captador_id: d.comercialCaptadorId,
      fecha_alta_cartera: d.altaCartera,
      comision_estado: d.comisionEstado,
      estado: "contacto",
      activa: true,
    });
    empresaId = e.id;

    if (d.correoGeneral) {
      await crear("correo", {
        empresa_id: empresaId,
        email: d.correoGeneral,
        etiqueta: "general",
        principal: true,
      });
    }

    // como le hemos conocido, con el respeto de cartera dentro
    if (d.llegoPor || d.llegoQuien || d.origenNotas || d.respetarCartera) {
      await crear("administracion_origen", {
        empresa_id: empresaId,
        tipo_origen: d.llegoPor ?? "otro",
        referente_externo: d.deQuienEs ?? d.llegoQuien,
        condiciona_oferta: d.respetarCartera,
        servicio_reservado: d.servicioReservado,
        notas: d.origenNotas,
      });
    }

    for (const dep of d.departamentos) {
      const fila = await crear<{ id: string }>("empresa_departamento", {
        empresa_id: empresaId,
        departamento: dep.nombre,
        telefono: dep.telefono,
        notas: dep.queHace,
      });
      if (dep.correo) {
        await crear("correo", {
          empresa_id: empresaId,
          departamento_id: fila.id,
          email: dep.correo,
          etiqueta: "general",
          principal: false,
        });
      }
    }
  }

  // 2 · la gente. El jefe lleva cargo fijo; los demas, el suyo.
  let personas = 0;
  const alta = async (p: PersonaAlta, manda: boolean) => {
    const fila = await crear<{ id: string }>("persona", { nombre: p.nombre, activa: true, notas: p.notas });
    const pue = await crear<{ id: string }>("puesto", {
      persona_id: fila.id,
      empresa_id: empresaId,
      cargo: manda ? null : p.cargo,
      cargo_clave: manda ? "el que manda" : null,
      telefono_empresa: p.telefonoTrabajo,
      telefono_personal: p.telefonoPersonal,
      numero_colegiado: p.colegiado,
      desde: p.desde ?? hoy(),
      notas: p.notas,
    });
    for (const [email, etiqueta] of [
      [p.correoTrabajo, "general"],
      [p.correoPersonal, "personal"],
    ] as const) {
      if (!email) continue;
      await crear("correo", {
        puesto_id: pue.id,
        empresa_id: empresaId,
        email,
        etiqueta,
        principal: etiqueta === "general",
      });
    }
    personas++;
  };

  for (const p of d.jefes) await alta(p, true);
  for (const p of d.gente) await alta(p, false);

  return { empresaId, personas };
}
