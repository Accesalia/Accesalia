// lib/necesidadesOpp.ts
//
// ¿NECESITA POLYCAM? ¿NECESITA VIABILIDAD? (Monica, 15-oct-2026). Dos fases de
// la escalera que pueden no aplicar: una memoria valorada no lleva ni Polycam ni
// viabilidad, y un SATE lleva viabilidad (Alex escribe el tipo de obra y los
// precios) pero no Polycam (se calcula con Google Earth). Lo de accesibilidad,
// siempre las dos.
//
// AUTOMATICO segun lo que dicen que quieren (oportunidad_tipos), y siempre se
// puede cambiar a mano en la ficha: "debe existir el boton para desmarcar fases
// que no aplican en todos los casos, claros o por defecto". Lo marcado a mano
// manda (oportunidades.necesita_polycam / necesita_viabilidad; vacio =
// automatico). Sin ningun interes, las dos.

import "server-only";
import { COLUMNAS_INTERES } from "./columnasInteres";
import { recalcularLuego } from "./estadoOportunidad";
import type { Yo } from "./sesion";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...init, headers: { ...CAB, ...(init.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${ruta.split("?")[0]} ${r.status}: ${await r.text()}`);
  return (r.status === 204 || r.headers.get("content-length") === "0" ? null : await r.json()) as T;
}

export type Necesidades = {
  polycam: boolean;
  viabilidad: boolean;
  /** Lo marco una persona (si no, es automatico). */
  polycamAMano: boolean;
  viabilidadAMano: boolean;
  /** El aviso para la ficha cuando lo automatico quita alguna fase: "Como es
   *  Memoria valorada, no anoto que haya que hacer ni Polycam ni viabilidad...". */
  aviso: string | null;
};

type Tipo = { id: string; nombre: string; parent_id: string | null };

/** De que familia es cada interes: accesibilidad (Polycam + viabilidad),
 *  eficiencia o arreglos exteriores (solo viabilidad), o lo demas (nada). Por la
 *  columna del alta y por su familia en tipos_proyecto. */
function familias(tipos: Tipo[]) {
  const porId = new Map(tipos.map((t) => [t.id, t]));
  const ancestros = (t: Tipo): string[] => {
    const out: string[] = [];
    let p = t.parent_id ? porId.get(t.parent_id) : undefined;
    while (p && out.length < 5) {
      out.push(p.nombre);
      p = p.parent_id ? porId.get(p.parent_id) : undefined;
    }
    return out;
  };
  const col = (titulo: string) => new Set(COLUMNAS_INTERES.find((c) => c.titulo === titulo)?.nombres ?? []);
  const acc = col("Accesibilidad");
  const efi = col("Eficiencia");
  const familia = new Map<string, "accesibilidad" | "eficiencia" | "otra">();
  for (const t of tipos) {
    // La propia categoria cuenta: un interes "Accesibilidad" o "Eficiencia
    // energetica" a secas (Tomas Borras 6, 15-oct-2026).
    const arriba = [t.nombre, ...ancestros(t)];
    familia.set(
      t.id,
      acc.has(t.nombre) || t.nombre === "Ascensor" || arriba.includes("Accesibilidad")
        ? "accesibilidad"
        : efi.has(t.nombre) || arriba.includes("Eficiencia energética") || arriba.includes("Intervenciones exterior")
          ? "eficiencia"
          : "otra",
    );
  }
  return familia;
}

const enLista = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} y ${xs.at(-1)}` : xs[0] ?? "");

/** Las necesidades de muchas opps de golpe (para la escalera y la tabla de estado). */
export async function necesidadesDeMuchas(ids: string[]): Promise<Map<string, Necesidades>> {
  const out = new Map<string, Necesidades>();
  const unicos = [...new Set(ids)];
  if (!unicos.length) return out;
  const tipos = await pedir<Tipo[]>("tipos_proyecto?select=id,nombre,parent_id");
  const familia = familias(tipos);
  const nombre = new Map(tipos.map((t) => [t.id, t.nombre]));
  // Los tramos EN PARALELO: uno detras de otro cuadruplicaba el tiempo de la escalera.
  const tramos: string[][] = [];
  for (let i = 0; i < unicos.length; i += 150) tramos.push(unicos.slice(i, i + 150));
  await Promise.all(tramos.map(async (trozo) => {
    const [opps, intereses] = await Promise.all([
      pedir<{ id: string; necesita_polycam: boolean | null; necesita_viabilidad: boolean | null }[]>(
        `oportunidades?select=id,necesita_polycam,necesita_viabilidad&id=in.(${trozo.join(",")})`,
      ),
      pedir<{ oportunidad_id: string; tipo_id: string }[]>(`oportunidad_tipos?select=oportunidad_id,tipo_id&oportunidad_id=in.(${trozo.join(",")})`),
    ]);
    for (const o of opps) {
      const suyos = intereses.filter((x) => x.oportunidad_id === o.id).map((x) => x.tipo_id);
      const fams = suyos.map((t) => familia.get(t) ?? "otra");
      // Automatico: sin intereses, las dos; con accesibilidad, las dos; con
      // eficiencia o arreglos, solo viabilidad; lo demas, ninguna.
      const autoPolycam = !suyos.length || fams.includes("accesibilidad");
      const autoViab = !suyos.length || fams.includes("accesibilidad") || fams.includes("eficiencia");
      const polycam = o.necesita_polycam ?? autoPolycam;
      const viabilidad = o.necesita_viabilidad ?? autoViab;
      // En el aviso, lo que decide: lo de eficiencia si solo se quita el Polycam;
      // lo tecnico (memoria, informe...) si se quitan los dos. Los servicios (CSS,
      // DF, subvenciones...) no deciden y no se nombran.
      const servicios = new Set(COLUMNAS_INTERES.find((c) => c.titulo === "Servicios")?.nombres ?? []);
      const deciden = suyos.filter((t) => (autoViab ? familia.get(t) === "eficiencia" : !servicios.has(nombre.get(t) ?? "")));
      const nombres = enLista((deciden.length ? deciden : suyos).map((t) => nombre.get(t) ?? "").filter(Boolean));
      const quita = [o.necesita_polycam == null && !autoPolycam ? "Polycam" : null, o.necesita_viabilidad == null && !autoViab ? "viabilidad" : null].filter(
        Boolean,
      ) as string[];
      out.set(o.id, {
        polycam,
        viabilidad,
        polycamAMano: o.necesita_polycam != null,
        viabilidadAMano: o.necesita_viabilidad != null,
        aviso: quita.length
          ? `Como es ${nombres}, no anoto que haya que hacer ${quita.length === 2 ? "ni Polycam ni viabilidad: pasamos directamente a darles precio" : quita[0] === "Polycam" ? "Polycam: se calcula sin ir (sí la viabilidad del arquitecto)" : "viabilidad"}. Si hay que cambiarlo, solo tienes que desmarcarlo aquí.`
          : null,
      });
    }
  }));
  return out;
}

export async function necesidadesDe(oppId: string): Promise<Necesidades | null> {
  return (await necesidadesDeMuchas([oppId])).get(oppId) ?? null;
}

/** Marcar o desmarcar a mano. `null` = volver a lo automatico. Queda quien y
 *  cuando; el paso de la opp se recalcula. */
export async function marcarNecesidades(
  oppId: string,
  d: { polycam?: boolean | null; viabilidad?: boolean | null },
  yo: Yo,
): Promise<void> {
  if (!/^[0-9a-f-]{36}$/.test(oppId)) throw new Error("Oportunidad no válida.");
  const cambio: Record<string, unknown> = { necesidades_por: yo.id, necesidades_en: new Date().toISOString() };
  if (d.polycam !== undefined) cambio.necesita_polycam = d.polycam;
  if (d.viabilidad !== undefined) cambio.necesita_viabilidad = d.viabilidad;
  await pedir(`oportunidades?id=eq.${oppId}`, { method: "PATCH", body: JSON.stringify(cambio) });
  recalcularLuego(oppId);
}
