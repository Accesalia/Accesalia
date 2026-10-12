import { redirect } from "next/navigation";
import { BarraSuperior } from "../components/BarraSuperior";
import { Salida } from "../components/Salida";
import { RejillaAccesos, TarjetaAcceso } from "../components/Accesos";
import { quienSoy } from "../../lib/sesion";
import { puedeVerEcobalance } from "../../lib/cobros";
import { listaEcobalance } from "../../lib/ecobalance";

export const dynamic = "force-dynamic";

// ECOBALANCE (Monica, 12-oct-2026): desde el menu de Daniel y Monica (y el de
// Ana, que es quien lo lleva), dos botones: 3 PPTOS y CAES. Nadie mas lo ve.

export default async function Ecobalance() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/ecobalance");
  if (!puedeVerEcobalance(yo)) redirect("/menu");
  const [tres, caes] = await Promise.all([listaEcobalance("3pp"), listaEcobalance("caes")]);
  const cuantas = (n: number) => (
    <span className="shrink-0 rounded-full bg-lima-soft px-2.5 py-0.5 text-[12px] font-bold text-lima-dark">{n}</span>
  );
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        <Salida href="/menu">← Menú</Salida>
        <h1 className="mt-3 text-3xl font-bold text-carbon sm:text-4xl">Ecobalance</h1>
        <p className="mt-1 text-carbon/65">Lo que lleva Ecobalance. Solo lo ven Ana, Daniel y Mónica.</p>
        <RejillaAccesos className="mt-8">
          <TarjetaAcceso
            nombre="3 PPTOS"
            desc="Las direcciones con 3 presupuestos en una hoja firmada: se cobran a éxito, si gana la contrata que presentamos"
            href="/ecobalance/3pp"
            color="verde"
            insignia={cuantas(tres.length)}
          />
          <TarjetaAcceso nombre="CAES" desc="Las direcciones con CAES en una hoja firmada" href="/ecobalance/caes" color="turquesa" insignia={cuantas(caes.length)} />
        </RejillaAccesos>
      </main>
    </div>
  );
}
