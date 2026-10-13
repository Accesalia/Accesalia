import { NextResponse } from "next/server";
import { crearEntrada } from "../../../../lib/entradaDiario";
import type { NuevaDesdeMovil } from "../../../../lib/oportunidadMovil";
import type { AdminDesdeMovil } from "../../../../lib/adminMovil";
import { apuntar, notaYaApuntada } from "../../../../lib/apuntesSatelite";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";

// GUARDAR UNA NOTA QUE LLEGA DEL SATELITE (8-oct-2026). Es la misma nota que
// la del PC: texto + sitio, con su canal, su fecha y sus fotos ya subidas. El
// movil le da su propio id al escribirla: si la reenvia porque se corto la
// cobertura, no se duplica.
//
// LO NUEVO NO SE CREA DESDE EL MOVIL (Monica, 13-oct-2026): "el satelite debe
// permitir coger el dato rapido, no necesariamente completo: es para que no se
// les olvide, no para que trabajen desde el movil". Una opp o un administrador
// nuevos se APUNTAN (lib/apuntesSatelite) con su nota y todo lo que mando el
// movil, y salen en Pendientes para completarlos y darlos de alta en la oficina.
export const dynamic = "force-dynamic";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function yaEsta(id: string): Promise<boolean> {
  const mirar = async (tabla: string) => {
    const r = await fetch(`${URL_BASE}/rest/v1/${tabla}?select=id&id=eq.${id}&limit=1`, {
      headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` },
      cache: "no-store",
    });
    return r.ok && ((await r.json()) as unknown[]).length > 0;
  };
  const hay = await Promise.all(["notas_oportunidad", "notas_administracion_fincas", "notas_pendientes"].map(mirar));
  return hay.some(Boolean) || (await notaYaApuntada(id));
}

type Cuerpo = {
  id?: string;
  texto?: string;
  canal?: string;
  fecha?: string | null;
  oportunidadId?: string | null;
  persona?: string | null;
  dondeTexto?: string | null;
  fotos?: string[];
  /** "Es nueva": la oportunidad que nace con esta nota (8-oct-2026). */
  nueva?: Omit<NuevaDesdeMovil, "direccion" | "fecha"> | null;
  /** "+ Crear nuevo adm": el administrador que nace con esta nota (13-oct-2026). */
  nuevoAdmin?: AdminDesdeMovil | null;
};

export async function POST(req: Request) {
  const yo = await quienSoy();
  if (!yo) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  if (!puedeEntrar(yo, "comercial", "trabajar")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const c = (await req.json().catch(() => ({}))) as Cuerpo;
  const id = c.id && /^[0-9a-f-]{36}$/.test(c.id) ? c.id : undefined;
  if (id && (await yaEsta(id))) return NextResponse.json({ ok: true, repetida: true });

  try {
    const fecha = c.fecha && /^\d{4}-\d{2}-\d{2}$/.test(c.fecha) ? c.fecha : new Date().toISOString().slice(0, 10);
    const fotos = Array.isArray(c.fotos) ? c.fotos.map(String) : [];
    // NUEVO ADMINISTRADOR: se apunta, no se crea. La nota es obligatoria.
    if (c.nuevoAdmin) {
      if (!(c.texto ?? "").trim()) throw new Error("Falta la nota: es obligatoria.");
      if (!c.nuevoAdmin.nombre?.trim()) throw new Error("Falta el nombre del administrador.");
      if (!c.nuevoAdmin.telefono?.trim() && !c.nuevoAdmin.correo?.trim()) throw new Error("Falta el teléfono o el correo del administrador: al menos uno.");
      await apuntar(yo, {
        tipo: "administrador", notaId: id ?? null, fecha, nota: c.texto ?? "", canal: c.canal ?? null, direccion: null,
        nombre: c.nuevoAdmin.nombre, datos: { telefono: c.nuevoAdmin.telefono ?? null, correo: c.nuevoAdmin.correo ?? null, fotos },
      });
      return NextResponse.json({ ok: true, donde: "apuntado: lo completas en la oficina (Pendientes)" });
    }
    // ES NUEVA: la oportunidad se apunta, no se crea.
    if (c.nueva && c.dondeTexto) {
      await apuntar(yo, {
        tipo: "oportunidad", notaId: id ?? null, fecha, nota: c.texto ?? "", canal: c.canal ?? null, direccion: c.dondeTexto, nombre: null,
        datos: {
          administrador: c.nueva.administrador ?? null,
          contacto: c.nueva.contacto ?? null,
          contactoNombre: c.nueva.contactoNombre ?? null,
          contactoTelefono: c.nueva.contactoTelefono ?? null,
          tipos: Array.isArray(c.nueva.tipos) ? c.nueva.tipos.map(String) : [],
          paso: c.nueva.paso ?? null,
          fotos,
        },
      });
      return NextResponse.json({ ok: true, donde: "apuntada: la completas y das de alta en la oficina (Pendientes)" });
    }
    const oportunidadId = c.oportunidadId || null;
    const dondeTexto = c.dondeTexto || null;
    const persona = c.persona || null;
    const destino = await crearEntrada({
      id,
      texto: c.texto ?? "",
      canal: c.canal ?? "",
      fecha: c.fecha && /^\d{4}-\d{2}-\d{2}$/.test(c.fecha) ? c.fecha : null,
      oportunidadId,
      persona,
      dondeTexto,
      autorId: yo.id,
      autorNombre: yo.nombre,
      fotos,
    });
    return NextResponse.json({ ok: true, donde: destino.donde });
  } catch (e) {
    // Un fallo de la base o del almacen se arregla reintentando (503, la nota
    // sigue en el movil). Un error de lo escrito (falta el sitio, el canal...)
    // no: 422, y el movil lo enseña para que se corrija.
    const msg = (e as Error).message;
    const deLaBase = /^(Supabase|Storage)/.test(msg);
    return NextResponse.json({ error: msg }, { status: deLaBase ? 503 : 422 });
  }
}
