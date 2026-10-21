import { redirect } from "next/navigation";
import { IndiceSubmenu, PaginaSubmenu, TarjetaIndice } from "../components/Submenu";
import { quienSoy } from "../../lib/sesion";
import { puedeVerEcobalance } from "../../lib/cobros";
import { listaEcobalance } from "../../lib/ecobalance";

export const dynamic = "force-dynamic";

// ECOBALANCE (Monica, 12-oct-2026): desde el menu de Daniel y Monica (y el de
// Ana, que es quien lo lleva), dos botones: 3 PPTOS y CAES. Nadie mas lo ve.
// Submenu con la estetica de los submenus (21-oct-2026, ../components/Submenu).

export default async function Ecobalance() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/ecobalance");
  if (!puedeVerEcobalance(yo)) redirect("/menu");
  const [tres, caes] = await Promise.all([listaEcobalance("3pp"), listaEcobalance("caes")]);
  const cuantas = (n: number) => (
    <span className="shrink-0 rounded-full bg-lima-soft px-2.5 py-0.5 text-[12px] font-bold text-lima-dark">{n}</span>
  );
  return (
    <PaginaSubmenu grupo="dinero" titulo="Ecobalance" subtitulo="Lo que lleva Ecobalance. Solo lo ven Ana, Daniel y Mónica.">
      <IndiceSubmenu>
        <TarjetaIndice
          nombre="3 PPTOS"
          desc="Las direcciones con 3 presupuestos en una hoja firmada: se cobran a éxito, si gana la contrata que presentamos"
          href="/ecobalance/3pp"
          color="turquesa"
          icono="capas"
          insignia={cuantas(tres.length)}
        />
        <TarjetaIndice nombre="CAES" desc="Las direcciones con CAES en una hoja firmada" href="/ecobalance/caes" color="verde" icono="hoja" insignia={cuantas(caes.length)} />
        {/* PAGAR (12-oct-2026): los impuestos de Ecobalance, que Ana lleva aparte. */}
        <TarjetaIndice nombre="Pagar" desc="Los impuestos de Ecobalance: qué se presenta, qué se paga y cuándo, mes a mes" href="/pagar" color="ambar" icono="euro" />
        {/* COMISIONES (17-oct-2026): lo pactado con cada administrador y lo que se le debe. */}
        <TarjetaIndice nombre="Comisiones" desc="Lo pactado con cada administrador y lo que se le debe, opp a opp" href="/ecobalance/comisiones" color="frambuesa" icono="porcentaje" />
      </IndiceSubmenu>
    </PaginaSubmenu>
  );
}
