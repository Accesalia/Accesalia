import { redirect } from "next/navigation";
import { IndiceSubmenu, PaginaSubmenu, TarjetaIndice } from "../components/Submenu";
import { quienSoy } from "../../lib/sesion";

export const dynamic = "force-dynamic";

// NEGOCIO (Monica, 12-oct-2026): solo Daniel y Monica. Aqui iran los demas
// cuadros de seguimiento del negocio: "esta area esta creciendo cada dia".
// Submenu con la estetica de los submenus (21-oct-2026, ../components/Submenu).

export default async function Negocio() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/negocio");
  if (!yo.veTodo) redirect("/menu");
  return (
    <PaginaSubmenu grupo="direccion" titulo="Negocio" subtitulo="Cómo va el negocio, entre las fechas que elijas. Solo dirección.">
      <IndiceSubmenu>
        <TarjetaIndice
          nombre="Trabajo contratado"
          desc="Oportunidades abiertas y ganadas, importes firmados, % de éxito y administradores nuevos, por comercial; y cada dirección con lo contratado"
          href="/negocio/trabajo-contratado"
          color="verde"
          icono="firma"
        />
        {/* La ficha financiera de una direccion (Monica, 17-oct-2026): su ficha de 2025, con datos vivos. */}
        <TarjetaIndice
          nombre="Ficha financiera"
          desc="Una dirección en una hoja: lo contratado, comisiones, subvenciones, financiación, CAES, por dónde va el cobro y el resumen; con PDF"
          href="/ficha-financiera"
          color="azul"
          icono="ficha"
        />
        {/* Historico facturado (Monica, 21-oct-2026): facturado, gastos y resultado por mes y año, por empresa y juntas. */}
        <TarjetaIndice
          nombre="Histórico facturado"
          desc="Lo facturado por mes y año, por Accesalia, por Daniel y las dos juntas (sin duplicar lo de casa); los gastos del banco y el resultado"
          href="/negocio/historico"
          color="ambar"
          icono="historico"
        />
      </IndiceSubmenu>
    </PaginaSubmenu>
  );
}
