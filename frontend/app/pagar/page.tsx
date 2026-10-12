import { redirect } from "next/navigation";
import { BarraSuperior } from "../components/BarraSuperior";
import { Salida } from "../components/Salida";
import { quienSoy } from "../../lib/sesion";
import { puedeVerCobros } from "../../lib/cobros";
import { calendarioFiscal, librosFiscales } from "../../lib/fiscal";
import { Hueco, Seccion } from "../negocio/Piezas";
import { hoyMadrid, ImpuestosLibro } from "./Calendario";
import { Areas } from "../facturacion/Areas";

export const dynamic = "force-dynamic";

// PAGAR (Monica, 12-oct-2026). Empieza por los IMPUESTOS, "lo facil": las
// fechas las pone Hacienda. Arriba lo que viene (y lo que se ha pasado sin
// hacer), con semaforo; debajo el ano entero, mes a mes. Lo fraccionado sale
// plazo a plazo, en su mes. Cada libro aparte: Accesalia y Daniel juntos (cada
// uno con su cifra y el total), Ecobalance solo para Ana y direccion.
// Lo demas del area, huecos con su nota.

const HUECOS = [
  {
    titulo: "Nóminas",
    va: "lo que se transfiere cada mes a cada persona, y el día.",
    falta: "engancharlo: las nóminas ya se suben en RRHH (líquido de cada una); falta sacar aquí el total del mes.",
  },
  {
    titulo: "Proveedores",
    va: "las facturas que nos hacen y cuándo vence cada una.",
    falta: "dónde se apuntan las facturas recibidas (hoy van a GMA cada mes).",
  },
  {
    titulo: "Gastos fijos",
    va: "alquiler, luz, internet, seguro de SOFISE, los coches, FARO, licencias, GMA, la línea de crédito, dietas, gasolina (estimada)…",
    falta: "la lista con su importe y su día. La semilla está en tu Excel «IMPUESTOS RESUMEN ACCESALIA + DANIEL».",
  },
];

export default async function PaginaPagar() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/pagar");
  const libros = librosFiscales(yo);
  if (!libros.length) redirect("/menu");
  const hoy = hoyMadrid();
  const deCobros = puedeVerCobros(yo);
  const pagos = await Promise.all(libros.map(calendarioFiscal));
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1500px] px-4 pb-16 pt-5 text-sm sm:px-6">
        {deCobros ? <Salida href="/facturacion">← Facturación y asignación</Salida> : <Salida href="/ecobalance">← Ecobalance</Salida>}
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-b border-black/10 pb-4">
          <h1 className="text-3xl font-bold leading-tight text-carbon">Pagar</h1>
          {deCobros && <Areas yo={yo} activa="pagar" />}
        </div>

        {libros.map((l, i) => (
          <ImpuestosLibro key={l} libro={l} pagos={pagos[i]} hoy={hoy} />
        ))}

        <Seccion titulo="Lo que irá aquí" sub="El resto de lo que se paga. Cada hueco se cambia por su pantalla cuando esté.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {HUECOS.map((h) => (
              <Hueco key={h.titulo} {...h} />
            ))}
          </div>
        </Seccion>
      </main>
    </div>
  );
}
