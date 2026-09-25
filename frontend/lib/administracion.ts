// lib/administracion.ts
//
// El area de ADMINISTRACION: los maestros que el estudio necesita mantener a
// mano (Monica, 25-sep-2026): administraciones de fincas y comunidades de
// vecinos, con consultar / abrir ficha / corregir, y crear nueva.
//
// De momento esto SOLO LEE produccion. Escribir (alta y correccion) es el paso
// siguiente y va con su permiso explicito.
//
// Definiciones de Monica:
//   comunidad   = "Mayor 15 Alcorcon"
//   oportunidad = "Mayor 15 Alcorcon + Ascensor"
// La direccion es UN SOLO CAMPO de texto y NO se descompone, a proposito:
// "no quiero que se pueda descomponer, para evitar errores".

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

// ---------------------------------------------------------------- la lista

export type FilaLista = {
  id: string;
  nombre: string;
  municipio: string | null;
  cp: string | null;
  administrador: string | null;
  conProyecto: boolean;
  conHojaFirmada: boolean;
};

/** Comunidades que coinciden con lo buscado. Sin texto, las primeras por nombre. */
export async function listarComunidades(q: string, tope = 60): Promise<{ filas: FilaLista[]; total: number }> {
  const t = q.trim();
  // La direccion es un solo texto y NO lleva el tipo de via ("Mayor 34
  // Leganes", no "Calle Mayor 34"), asi que buscar por "mayor" discrimina.
  const filtro = t.length >= 2 ? `&nombre=ilike.${encodeURIComponent(`*${t.replace(/[,()*]/g, " ")}*`)}` : "";

  const filas = await rest<
    {
      id: string; nombre: string; municipio: string | null; cp: string | null;
      comunidad_admin_responsable: { vigente: boolean; empresa: { nombre_accesalia: string } | null }[];
      proyectos: { id: string }[];
      hojas_encargo: { estado: string | null }[];
    }[]
  >(
    "comunidades?select=id,nombre,municipio,cp," +
      "comunidad_admin_responsable(vigente,empresa(nombre_accesalia))," +
      "proyectos(id),hojas_encargo(estado)" +
      `${filtro}&order=nombre&limit=${tope}`,
  );

  const total = filas.length;
  return {
    total,
    filas: filas.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      municipio: c.municipio,
      cp: c.cp,
      administrador: c.comunidad_admin_responsable.find((x) => x.vigente)?.empresa?.nombre_accesalia ?? null,
      conProyecto: c.proyectos.length > 0,
      conHojaFirmada: c.hojas_encargo.some((h) => h.estado === "devuelta_firmada"),
    })),
  };
}

// ---------------------------------------------------------------- la ficha

export type PersonaAdmin = { nombre: string | null; cargo: string | null; telefono: string | null };
export type AdminDeComunidad = {
  vigente: boolean;
  desde: string | null;
  hasta: string | null;
  notas: string | null;
  empresa: string | null;
  cif: string | null;
  telefono: string | null;
  municipio: string | null;
  persona: PersonaAdmin | null;
};

export type ContactoComunidad = {
  nombre: string;
  rol: string | null;
  telefono: string | null;
  email: string | null;
  documento: string | null;
  notas: string | null;
};

export type ContratadoLinea = { que: string; importe: number | null };
export type EncargoComunidad = {
  id: string;
  que: string | null;
  estado: string | null;
  fecha: string | null;
  pagador: string | null;
  comercial: string | null;
  loTrajo: string | null;
  lineas: ContratadoLinea[];
  versionEnviada: string | null;
  pdf: string | null;
  firmados: number;
};

export type FichaComunidad = {
  id: string;
  nombre: string;
  municipio: string | null;
  cp: string | null;
  provincia: string | null;
  // seccion 1: el DNI del edificio (lo que no cambia nunca)
  edificio: { anio: number | null; viviendas: number | null; catastro: string | null };
  // seccion 2: quien la administra, con su historico
  administradores: AdminDeComunidad[];
  // seccion 3: la comunidad
  cif: string | null;
  presidentes: ContactoComunidad[];
  otrosContactos: ContactoComunidad[];
  // seccion 4: lo comercial
  encargos: EncargoComunidad[];
  // datos economicos (solo facturacion)
  iban: string | null;
  // derivados
  conProyecto: boolean;
  avisos: string[];
};

const num = (x: string | null) => (x === null ? null : Number(x));

export async function fichaComunidad(id: string): Promise<FichaComunidad | null> {
  const avisos: string[] = [];
  const intenta = async <T,>(p: Promise<T[]>, que: string): Promise<T[]> => {
    try {
      return await p;
    } catch (e) {
      console.error(`ficha comunidad: ${que}`, e);
      avisos.push(que);
      return [];
    }
  };

  const [comunidad] = await rest<
    { id: string; nombre: string; municipio: string | null; cp: string | null; provincia: string | null;
      anio_construccion: number | null; num_viviendas: number | null; referencia_catastral: string | null;
      cif_comunidad: string | null; iban: string | null }[]
  >(
    "comunidades?select=id,nombre,municipio,cp,provincia,anio_construccion,num_viviendas," +
      `referencia_catastral,cif_comunidad,iban&id=eq.${id}`,
  );
  if (!comunidad) return null;

  const [admins, contactos, encargos, proyectos] = await Promise.all([
    intenta(
      rest<
        { vigente: boolean; desde: string | null; hasta: string | null; notas: string | null;
          empresa: { nombre_accesalia: string; cif: string | null; telefono: string | null; municipio: string | null } | null;
          puesto: { cargo: string | null; telefono_empresa: string | null; telefono_personal: string | null; persona: { nombre: string } | null } | null }[]
      >(
        "comunidad_admin_responsable?select=vigente,desde,hasta,notas," +
          "empresa(nombre_accesalia,cif,telefono,municipio)," +
          "puesto(cargo,telefono_empresa,telefono_personal,persona(nombre))" +
          `&comunidad_id=eq.${id}&order=vigente.desc,desde.desc.nullslast`,
      ),
      "el administrador",
    ),
    intenta(
      rest<ContactoComunidad[]>(
        `personas_comunidad?select=nombre,rol,telefono,email,documento,notas&comunidad_id=eq.${id}&order=rol`,
      ),
      "los contactos",
    ),
    intenta(
      rest<
        { id: string; descripcion: string | null; estado: string | null; fecha_creacion: string | null;
          pagador_tipo: string | null; comercial_interno: string | null; quien_lo_trae: string | null;
          lineas_facturacion: { descripcion: string | null; importe: string | null }[];
          versiones_hoja: { numero_version: number; fecha_enviada: string | null; url_pdf_hoja: string | null; pdfs_firmados: string[] | null }[] }[]
      >(
        "hojas_encargo?select=id,descripcion,estado,fecha_creacion,pagador_tipo,comercial_interno,quien_lo_trae," +
          "lineas_facturacion(descripcion,importe)," +
          // hay DOS relaciones hoja<->version: hay que decir por cual se embebe
          "versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(numero_version,fecha_enviada,url_pdf_hoja,pdfs_firmados)" +
          `&comunidad_id=eq.${id}&order=fecha_creacion.desc.nullslast`,
      ),
      "los encargos",
    ),
    intenta(rest<{ id: string }[]>(`proyectos?select=id&comunidad_id=eq.${id}&limit=1`), "los proyectos"),
  ]);

  return {
    id: comunidad.id,
    nombre: comunidad.nombre,
    municipio: comunidad.municipio,
    cp: comunidad.cp,
    provincia: comunidad.provincia,
    edificio: {
      anio: comunidad.anio_construccion,
      viviendas: comunidad.num_viviendas,
      catastro: comunidad.referencia_catastral,
    },
    administradores: admins.map((a) => ({
      vigente: a.vigente,
      desde: a.desde,
      hasta: a.hasta,
      notas: a.notas,
      empresa: a.empresa?.nombre_accesalia ?? null,
      cif: a.empresa?.cif ?? null,
      telefono: a.empresa?.telefono ?? null,
      municipio: a.empresa?.municipio ?? null,
      persona: a.puesto
        ? {
            nombre: a.puesto.persona?.nombre ?? null,
            cargo: a.puesto.cargo,
            telefono: a.puesto.telefono_empresa ?? a.puesto.telefono_personal,
          }
        : null,
    })),
    cif: comunidad.cif_comunidad,
    presidentes: contactos.filter((c) => (c.rol ?? "").toLowerCase() === "presidente"),
    otrosContactos: contactos.filter((c) => (c.rol ?? "").toLowerCase() !== "presidente"),
    encargos: encargos.map((h) => {
      const v = [...h.versiones_hoja].sort((a, b) => b.numero_version - a.numero_version)[0] ?? null;
      return {
        id: h.id,
        que: h.descripcion,
        estado: h.estado,
        fecha: h.fecha_creacion,
        pagador: h.pagador_tipo,
        comercial: h.comercial_interno,
        loTrajo: h.quien_lo_trae,
        lineas: h.lineas_facturacion.map((l) => ({ que: l.descripcion ?? "sin concepto", importe: num(l.importe) })),
        versionEnviada: v?.fecha_enviada ?? null,
        pdf: v?.url_pdf_hoja ?? null,
        firmados: v?.pdfs_firmados?.length ?? 0,
      };
    }),
    iban: comunidad.iban,
    conProyecto: proyectos.length > 0,
    avisos,
  };
}
