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
