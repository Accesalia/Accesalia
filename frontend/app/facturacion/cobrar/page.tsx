import { redirect } from "next/navigation";
import Link from "next/link";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { quienSoy } from "../../../lib/sesion";
import { porCobrar, puedeVerCobros } from "../../../lib/cobros";
import { Hueco, Seccion } from "../../negocio/Piezas";
import { Areas } from "../Areas";
import { PorCobrar } from "../PorCobrar";

export const dynamic = "force-dynamic";

// COBRAR (Monica, 12-oct-2026). Cuatro vistas y dos tareas; mientras no estan,
// huecos con su nota para no perder de vista el objetivo. Debajo, lo que ya hay:
// lo que queda por cobrar, con su buscador y la entrada a cada oportunidad.

const VISTAS = [
  {
    titulo: "1 · Bandeja de entrada",
    va: "las hojas firmadas que acaban de llegar. Al abrir una: a un lado la hoja firmada para leerla, al otro lo extraído, cada línea con sus importes e hitos, todo editable. Cada línea se valida por separado (una duda en una no frena las demás) y la hoja sale de la bandeja cuando se valida la última. Bandeja vacía = todo listo para trabajar.",
    falta: "la pantalla. La marca de línea comprobada ya existe en la base (lineas_facturacion.verificado); faltan quién y cuándo la validó.",
  },
  {
    titulo: "2 · Buscar por dirección",
    va: "se escribe una dirección y salen todas sus hojas vivas; se elige una, salen sus líneas e hitos, y en una línea «Añadir subhitos»: la nueva forma de pago y la NOTA de dónde viene el cambio («no tienen fondos, derrama, no pagan hasta el 15 de enero»). También bajar un importe.",
    falta: "la pantalla. Hoy se hace con el buscador de abajo y la vista de cada oportunidad (fraccionar con nota).",
  },
  {
    titulo: "3 · Todo lo contratado",
    va: "qué se ha contratado, a cuánto y cuándo se paga, entre fechas.",
    falta: "la pantalla; los datos ya están (hojas firmadas, líneas, hitos con su fecha prevista).",
  },
  {
    titulo: "4 · Próximos hitos a facturar",
    va: "lo siguiente que habrá que emitir, por fecha.",
    falta: "la pantalla; los hitos con fecha prevista y los avisos de facturable ya existen.",
  },
];

const TAREAS = [
  {
    titulo: "Registrar factura y cargo en cuenta",
    va: "la factura de Factusol (su PDF) y, aparte, el justificante del cargo en cuenta: dos documentos.",
    falta: "la pantalla de subida; las facturas de Factusol ya están volcadas.",
  },
];

export default async function PaginaCobrar() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion/cobrar");
  if (!puedeVerCobros(yo)) redirect("/menu");
  const filas = await porCobrar();
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1500px] px-4 pb-16 pt-5 text-sm sm:px-6">
        <Salida href="/facturacion">← Facturación y asignación</Salida>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-b border-black/10 pb-4">
          <h1 className="text-3xl font-bold leading-tight text-carbon">Cobrar</h1>
          <Areas yo={yo} activa="cobrar" />
        </div>

        <Seccion titulo="Lo que irá aquí" sub="Las cuatro vistas y las tareas de cobro. Cada hueco se cambia por su pantalla cuando esté.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...VISTAS, ...TAREAS].map((h) => (
              <Hueco key={h.titulo} {...h} />
            ))}
            {/* EMITIR PROFORMA ya existe (12-oct-2026): se emite desde cada oportunidad marcando sus hitos. */}
            <Link href="/facturacion/proformas" className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm transition hover:border-lima">
              <div className="text-[12.5px] font-semibold uppercase tracking-wide text-carbon/60">Emitir proforma</div>
              <p className="mt-2 text-[13.5px] text-carbon/80">
                Se emite desde cada oportunidad, marcando sus hitos; su texto se copia y pega en Factusol.
              </p>
              <p className="mt-2 text-[13.5px] font-semibold text-lima-dark">Ver las proformas →</p>
            </Link>
          </div>
        </Seccion>

        <Seccion titulo="Lo que queda por cobrar" sub="Lo que ya funciona: cada oportunidad con documentos firmados; se entra a cada una para ver sus hitos y facturas.">
          <PorCobrar filas={filas} />
        </Seccion>
      </main>
    </div>
  );
}
