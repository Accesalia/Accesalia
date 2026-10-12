import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { comercialDe, puedeEntrar, quienSoy } from "../../../lib/sesion";
import { listarComerciales } from "../../../lib/comercial";
import { opcionesEntrada } from "../../../lib/entradaDiario";
import { tiposParaMovil } from "../../../lib/oportunidadMovil";
import { datosEstimacion } from "../../../lib/estimacionCostes";
import { Estimador } from "./Estimador";
import { Salida } from "../../components/Salida";

export const dynamic = "force-dynamic";

// ESTIMACION DE COSTES DE OBRA (Monica, 11-oct-2026): un documento vivo, de
// consulta general. Sale de nuestras obras (el historico de proyectos) y se
// actualiza solo cada vez que entra un proyecto nuevo.

export default async function Estimacion() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/referencia/estimacion");
  // Para el informe: nuestras oportunidades, y las listas de la ventana rapida.
  const [d, listas, tipos, mio, comerciales] = await Promise.all([
    datosEstimacion(),
    opcionesEntrada(),
    tiposParaMovil().catch(() => []),
    comercialDe(yo.id),
    listarComerciales(),
  ]);

  return (
    <div className="min-h-screen">
      <div className="print:hidden">
        <BarraSuperior />
      </div>
      <main className="mx-auto max-w-[1000px] px-4 py-6 sm:px-6 print:max-w-none print:p-0">
        <div className="print:hidden">
          <Salida href="/referencia">
            ← Documentación de referencia
          </Salida>
          <h1 className="mt-3 text-3xl font-bold text-carbon">Estimación de costes de obra</h1>
          <p className="mt-1 max-w-[75ch] text-carbon/55">
            Lo que cuesta hoy una obra según las que ya hemos proyectado, cómo ha subido y lo que se espera. Se actualiza sola
            con cada proyecto nuevo.
          </p>
        </div>
        <Estimador
          d={d}
          oportunidades={listas.oportunidades.map((o) => ({ valor: o.valor, texto: o.texto, pista: o.pista }))}
          personas={listas.personas}
          tipos={tipos}
          puedeCrear={puedeEntrar(yo, "comercial", "trabajar")}
          // Si no es comercial, la ventana rapida le pide de quien es.
          comerciales={mio ? null : comerciales.map((c) => ({ valor: c.id, texto: [c.nombre, c.apellidos].filter(Boolean).join(" ") }))}
        />
      </main>
    </div>
  );
}
