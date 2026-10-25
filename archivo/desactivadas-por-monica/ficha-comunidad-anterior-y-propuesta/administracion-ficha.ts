// La parte de lib/administracion.ts que solo alimentaba las fichas viejas (retirada el 25-oct-2026). Referencia.

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
  // EL TIPO DE PROYECTO (Monica, 25-sep-2026): sale de `proyectos.tipo`, tal
  // como ella lo escribe — ASCENSOR, SATE, ACCESIB, SATE + ASC... NO del
  // catalogo `tipos_proyecto`, que son las cosas que se contratan.
  tipos: string[];
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
      cif_comunidad: string | null }[]
  >(
    "comunidades?select=id,nombre,municipio,cp,provincia,anio_construccion,num_viviendas," +
      `referencia_catastral,cif_comunidad&id=eq.${id}`,
  );
  if (!comunidad) return null;

  const [admins, contactos, encargos, proyectos, cuentas] = await Promise.all([
    intenta(
      rest<
        { vigente: boolean; desde: string | null; hasta: string | null; notas: string | null;
          empresa: { nombre_accesalia: string; cif: string | null; telefono: string | null; municipio: string | null } | null;
          puesto: { cargo: string | null; telefono_empresa: string | null;
            persona: { nombre: string; telefono_personal: string | null } | null } | null }[]
      >(
        "comunidad_admin_responsable?select=vigente,desde,hasta,notas," +
          "empresa(nombre_accesalia,cif,telefono,municipio)," +
          "puesto(cargo,telefono_empresa,persona(nombre,telefono_personal))" +
          `&comunidad_id=eq.${id}&order=vigente.desc,desde.desc.nullslast`,
      ),
      "el administrador",
    ),
    // UNA SOLA AGENDA (15-oct-2026): de persona + puesto, no de personas_comunidad.
    intenta(
      personasDeComunidad(id).then((ps) =>
        ps.map((p) => ({ nombre: p.nombre, rol: p.rol, telefono: p.telefono, email: p.email, documento: p.documento, notas: p.notas }) as ContactoComunidad),
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
    intenta(
      rest<{ id: string; tipo: string | null }[]>(`proyectos?select=id,tipo&comunidad_id=eq.${id}`),
      "los proyectos",
    ),
    // La cuenta vive en `cuentas_bancarias` (8-oct-2026): se ensena la vigente.
    intenta(
      rest<{ iban: string }[]>(
        `cuentas_bancarias?select=iban&titular_tipo=eq.comunidad&titular_id=eq.${id}&vigente=is.true&order=desde.desc.nullslast&limit=1`,
      ),
      "la cuenta",
    ),
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
            telefono: a.puesto.telefono_empresa ?? a.puesto.persona?.telefono_personal ?? null,
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
    iban: cuentas[0]?.iban ?? null,
    tipos: [...new Set(proyectos.map((p) => p.tipo).filter((x): x is string => !!x))],
    conProyecto: proyectos.length > 0,
    avisos,
  };
}
