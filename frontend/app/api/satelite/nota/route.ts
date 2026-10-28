import { NextResponse } from "next/server";
import { crearEntrada } from "../../../../lib/entradaDiario";
import type { NuevaDesdeMovil } from "../../../../lib/oportunidadMovil";
import type { AdminDesdeMovil } from "../../../../lib/adminMovil";
import type { ContactoSat } from "../../../../lib/colaSatelite";
import { notaYaApuntada } from "../../../../lib/apuntesSatelite";
import { adminDesdeSatelite, contactoDesdeSatelite, oppDesdeSatelite } from "../../../../lib/altaSatelite";
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
  /** La direccion que ya tenemos (clave), si se eligio de la lista. */
  claveId?: string | null;
  fotos?: string[];
  /** "Es nueva": la oportunidad que nace con esta nota (8-oct-2026). */
  nueva?: (Omit<NuevaDesdeMovil, "direccion" | "fecha"> & { contactoCorreo?: string | null }) | null;
  /** "+ Crear nuevo adm": el administrador que nace con esta nota (13-oct-2026). */
  nuevoAdmin?: AdminDesdeMovil | null;
  /** "Crear nuevo contacto" (19-oct-2026): el que sustituye a nuevoAdmin. */
  nuevoContacto?: ContactoSat | null;
  /** La persona escrita que no estaba, para revisar despues. */
  quienTexto?: string | null;
};

const TIPOS_CONTACTO: Record<string, string> = { administrador: "Administrador", vecino: "Vecino", contratista: "Contratista", otro: "Otro" };

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
    // DESDE EL 28-OCT-2026 SE CREA DE VERDAD (Monica: «que exista; a pendientes
    // para completar, si hace falta»). Antes se apuntaba y se completaba en la
    // oficina (apuntes_satelite). Ver lib/altaSatelite.ts.
    const autor = { id: yo.id, nombre: yo.nombre };
    const base = { notaId: id ?? crypto.randomUUID(), texto: c.texto ?? "", canal: c.canal ?? "", fecha, fotos };
    // NUEVO CONTACTO (19-oct-2026): administrador, vecino, contratista u otro.
    if (c.nuevoContacto) {
      const n = c.nuevoContacto;
      if (!(c.texto ?? "").trim()) throw new Error("Falta la nota: es obligatoria.");
      if (!n.nombre?.trim()) throw new Error("Falta el nombre del contacto.");
      if (!n.telefono?.trim() && !n.correo?.trim()) throw new Error("Falta el teléfono o el correo del contacto: al menos uno.");
      if (!TIPOS_CONTACTO[n.tipo]) throw new Error("Falta qué es: administrador, vecino, contratista u otro.");
      if (n.tipo === "otro" && !n.otro?.trim()) throw new Error("Has marcado «Otro»: escribe qué es.");
      const oportunidadId = n.oportunidadId && /^[0-9a-f-]{36}$/.test(n.oportunidadId) ? n.oportunidadId : null;
      if (n.tipo === "administrador") {
        await adminDesdeSatelite(autor, { ...base, nombre: n.nombre, telefono: n.telefono?.trim() || null, correo: n.correo?.trim() || null, oportunidadId });
        return NextResponse.json({ ok: true, donde: "administrador creado: lo llevas tú" });
      }
      await contactoDesdeSatelite(autor, {
        ...base,
        nombre: n.nombre,
        telefono: n.telefono?.trim() || null,
        correo: n.correo?.trim() || null,
        cargo: n.tipo === "otro" ? n.otro!.trim() : TIPOS_CONTACTO[n.tipo],
        esVecino: n.tipo === "vecino",
        oportunidadId,
      });
      return NextResponse.json({ ok: true, donde: "contacto creado en la agenda" });
    }
    // NUEVO ADMINISTRADOR (lo que aun espere en algun movil con la version del 13-oct).
    if (c.nuevoAdmin) {
      if (!(c.texto ?? "").trim()) throw new Error("Falta la nota: es obligatoria.");
      if (!c.nuevoAdmin.nombre?.trim()) throw new Error("Falta el nombre del administrador.");
      if (!c.nuevoAdmin.telefono?.trim() && !c.nuevoAdmin.correo?.trim()) throw new Error("Falta el teléfono o el correo del administrador: al menos uno.");
      await adminDesdeSatelite(autor, { ...base, nombre: c.nuevoAdmin.nombre, telefono: c.nuevoAdmin.telefono ?? null, correo: c.nuevoAdmin.correo ?? null, oportunidadId: null });
      return NextResponse.json({ ok: true, donde: "administrador creado: lo llevas tú" });
    }
    // ES NUEVA: la oportunidad nace ya.
    if (c.nueva && c.dondeTexto) {
      if (!(c.texto ?? "").trim()) throw new Error("Falta la nota: es obligatoria.");
      await oppDesdeSatelite(autor, {
        ...base,
        direccion: c.dondeTexto,
        claveId: c.claveId && /^[0-9a-f-]{36}$/.test(c.claveId) ? c.claveId : null,
        contacto: c.nueva.contacto ?? null,
        contactoNombre: c.nueva.contactoNombre ?? null,
        contactoTelefono: c.nueva.contactoTelefono ?? null,
        contactoCorreo: c.nueva.contactoCorreo ?? null,
        tipos: Array.isArray(c.nueva.tipos) ? c.nueva.tipos.map(String) : [],
        paso: c.nueva.paso ?? null,
      });
      return NextResponse.json({ ok: true, donde: "oportunidad creada: confirma su dirección en el Catastro desde su ficha" });
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
      quienTexto: c.quienTexto || null,
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
