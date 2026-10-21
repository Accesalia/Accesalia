import Link from "next/link";
import { redirect } from "next/navigation";
import { quienSoy } from "../../../lib/sesion";
import { puedeVerGastos } from "../../../lib/gastosMes";
import { porSaber } from "../../../lib/extractos";
import { MarcoDinero } from "../../facturacion/MarcoDinero";
import { Subir } from "./Subir";

export const dynamic = "force-dynamic";

// PREVER › SUBIR EL EXTRACTO (Monica, 21-oct-2026; marco 4 de docs/figma/gastos-del-mes.html). Cuando se quiera.
// Ver lib/extractos.ts.

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
async function leer<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` }, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}`);
  return r.json() as Promise<T>;
}

export default async function PaginaExtracto() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/prever/extracto");
  if (!puedeVerGastos(yo)) redirect("/menu");
  const [cuentas, pendientes, gastos, tipos] = await Promise.all([
    leer<{ clave: string; banco: string; empresa: string }[]>("cuentas_propias?select=clave,banco,empresa&vigente=eq.true&order=clave"),
    porSaber(yo.veTodo),
    leer<{ id: string; empresa: string; concepto: string; solo_direccion: boolean }[]>("gastos_habituales?select=id,empresa,concepto,solo_direccion&activo=eq.true&order=concepto"),
    leer<{ tipo: string }[]>("reglas_movimientos?select=tipo&activa=eq.true&solo_direccion=eq.false"),
  ]);
  const ultimas = await Promise.all(
    cuentas.map(async (c) => {
      const [u] = await leer<{ fecha: string }[]>(`movimientos_bancarios?select=fecha&cuenta=eq.${c.clave}&order=orden.desc&limit=1`);
      return { clave: c.clave, nombre: `${c.banco} ${c.empresa === "accesalia" ? "Accesalia" : "Daniel"}`, hasta: u?.fecha ?? null };
    }),
  );
  return (
    <MarcoDinero yo={yo} area="prever" activo="gastos">
      <Link href="/prever/gastos" className="text-sm font-semibold text-carbon/55 hover:text-carbon">← Gastos del mes</Link>
      <h1 className="mb-3 mt-1 border-b border-black/10 pb-3 text-[24px] font-bold leading-tight text-carbon">Subir el extracto</h1>
      <Subir
        cuentas={ultimas}
        pendientes={pendientes}
        gastos={gastos.filter((g) => yo.veTodo || !g.solo_direccion).map((g) => ({ id: g.id, empresa: g.empresa, concepto: g.concepto }))}
        tipos={[...new Set(tipos.map((t) => t.tipo))].sort()}
      />
    </MarcoDinero>
  );
}
