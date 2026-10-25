import { redirect } from "next/navigation";
import { BarraSuperior } from "../components/BarraSuperior";
import { Salida } from "../components/Salida";
import { quienSoy } from "../../lib/sesion";
import { bandeja, puedeBandeja } from "../../lib/recorridoHoja";
import { ESTILOS_RECORRIDO } from "../facturacion/cobrar/estilosRecorrido";
import { Bandeja } from "./Bandeja";

export const dynamic = "force-dynamic";

// BANDEJA COMERCIAL (Monica, 25-oct-2026; maqueta validada docs/figma/recorrido-hoja-firmada.html, pantalla 3): la
// bandeja de entrada de la secretaria comercial. Cada hoja que ya se puede trabajar (cobrado su primer hito, o
// «pasa a produccion ya»): comprobar la direccion, ver los documentos que ha soltado el comercial en la opp y abrir
// las areas de cada linea; con todo, «Meter en produccion» (hoy eso es Asignar; facturacion la vera en Cosas vivas).
// Debajo, las pausas que facturacion ha levantado (para reanudar) y las que siguen en pausa.

export default async function PaginaBandeja() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/bandeja-comercial");
  if (!puedeBandeja(yo)) redirect("/menu");
  const b = await bandeja();
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1300px] px-4 pb-16 pt-5 sm:px-6">
        <Salida href="/menu">← Menú</Salida>
        <div className="rh">
          <style dangerouslySetInnerHTML={{ __html: ESTILOS_RECORRIDO }} />
          <div className="cab">
            <div>
              <div className="ceja">Secretaria comercial</div>
              <h1>Bandeja comercial</h1>
              <p className="sub">Cada hoja que ya se puede trabajar: comprobar la dirección, colocar los documentos que ha soltado el comercial y abrir las áreas de cada línea.</p>
            </div>
          </div>
          <Bandeja datos={b} />
        </div>
      </main>
    </div>
  );
}
