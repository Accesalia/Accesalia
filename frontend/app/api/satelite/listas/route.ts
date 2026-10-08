import { NextResponse } from "next/server";
import { opcionesEntrada } from "../../../../lib/entradaDiario";
import { tiposParaMovil } from "../../../../lib/oportunidadMovil";
import { comercialDe, puedeEntrar, quienSoy } from "../../../../lib/sesion";

// EL SATELITE SE LLEVA LAS LISTAS (Monica, 8-oct-2026): todas las oportunidades
// abiertas y toda la agenda, para buscar sin cobertura. Se refrescan cada vez
// que hay red. Y la cartera de quien lo usa, para avisar si la opp es de otro.
export const dynamic = "force-dynamic";

export async function GET() {
  const yo = await quienSoy();
  if (!yo) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  if (!puedeEntrar(yo, "comercial", "trabajar")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const supervisa = yo.veTodo || puedeEntrar(yo, "comercial", "supervisar");
  const [listas, mio, tipos] = await Promise.all([
    opcionesEntrada(),
    supervisa ? Promise.resolve(null) : comercialDe(yo.id),
    // Lo que quieren, para "Es nueva" (8-oct-2026).
    tiposParaMovil().catch(() => []),
  ]);
  return NextResponse.json({ ...listas, tipos, miComercialId: mio?.id ?? null, quien: yo.nombre, cuando: new Date().toISOString() });
}
