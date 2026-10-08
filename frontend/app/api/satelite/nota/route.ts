import { NextResponse } from "next/server";
import { crearEntrada } from "../../../../lib/entradaDiario";
import { crearOportunidadDesdeMovil, type NuevaDesdeMovil } from "../../../../lib/oportunidadMovil";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";

// GUARDAR UNA NOTA QUE LLEGA DEL SATELITE (8-oct-2026). Es la misma nota que
// la del PC: texto + sitio, con su canal, su fecha y sus fotos ya subidas. El
// movil le da su propio id al escribirla: si la reenvia porque se corto la
// cobertura, no se duplica.
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
  return hay.some(Boolean);
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
};

export async function POST(req: Request) {
  const yo = await quienSoy();
  if (!yo) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  if (!puedeEntrar(yo, "comercial", "trabajar")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const c = (await req.json().catch(() => ({}))) as Cuerpo;
  const id = c.id && /^[0-9a-f-]{36}$/.test(c.id) ? c.id : undefined;
  if (id && (await yaEsta(id))) return NextResponse.json({ ok: true, repetida: true });

  try {
    // ES NUEVA: primero nace la oportunidad (coja), y la nota va a ella.
    let oportunidadId = c.oportunidadId || null;
    let dondeTexto = c.dondeTexto || null;
    if (c.nueva && c.dondeTexto) {
      oportunidadId = await crearOportunidadDesdeMovil(yo, {
        ...c.nueva,
        direccion: c.dondeTexto,
        fecha: c.fecha && /^\d{4}-\d{2}-\d{2}$/.test(c.fecha) ? c.fecha : new Date().toISOString().slice(0, 10),
        tipos: Array.isArray(c.nueva.tipos) ? c.nueva.tipos.map(String) : [],
      });
      dondeTexto = null;
    }
    const destino = await crearEntrada({
      id,
      texto: c.texto ?? "",
      canal: c.canal ?? "",
      fecha: c.fecha && /^\d{4}-\d{2}-\d{2}$/.test(c.fecha) ? c.fecha : null,
      oportunidadId,
      persona: c.persona || null,
      dondeTexto,
      autorId: yo.id,
      autorNombre: yo.nombre,
      fotos: Array.isArray(c.fotos) ? c.fotos.map(String) : [],
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
