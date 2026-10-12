import { redirect } from "next/navigation";
import { BarraSuperior } from "../components/BarraSuperior";
import { Salida } from "../components/Salida";
import { quienSoy } from "../../lib/sesion";
import { calendarioFiscal } from "../../lib/fiscal";
import { Cifra, eur, Hueco, REJILLA, Seccion } from "../negocio/Piezas";
import { Areas } from "../facturacion/Areas";

export const dynamic = "force-dynamic";

// PREVER (Monica, 12-oct-2026): "una pantalla que avise: este mes, gastos
// previstos... e ingresos estimados, para saber si llegamos. ¿Tenemos caja para
// hacer frente a todo o tocamos asignaciones para adelantar proyectos?". Hoy
// solo tiene dato lo fiscal (lo que ya se sabe que se carga este mes); el resto,
// huecos con su nota. Es del libro de Accesalia y Daniel.

const HUECOS = [
  {
    titulo: "Impuestos estimados",
    va: "lo que saldrá en cada declaración antes de presentarla: IVA (por lo facturado), retenciones (por las nóminas), el 202 (18 % del último Sociedades), Sociedades (por el beneficio).",
    falta: "leer los importes de las declaraciones de 2019-2026 de tu carpeta de Hacienda, para calibrar con lo real.",
  },
  {
    titulo: "Nóminas y Seguridad Social",
    va: "lo que sale cada mes por personal.",
    falta: "engancharlo a las nóminas de RRHH y el importe de los seguros sociales.",
  },
  {
    titulo: "Gastos fijos",
    va: "alquiler, luz, internet, SOFISE, coches, licencias, GMA, línea de crédito, dietas, gasolina…",
    falta: "la lista de gastos fijos de PAGAR.",
  },
  {
    titulo: "Ingresos previstos",
    va: "lo que se cobrará este mes por los hitos que se prevé alcanzar (precios, tiempos, quién paga, retrasos, visados).",
    falta: "unir los hitos con fecha prevista y el cronograma de ASIGNAR, más el desfase de cobro de cada pagador.",
  },
  {
    titulo: "¿Llegamos?",
    va: "ingresos menos gastos del mes, y qué proyectos adelantar en ASIGNAR si no llega.",
    falta: "los cuatro huecos de arriba.",
  },
];

const hoyMadrid = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
const MES = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function PaginaPrever() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/prever");
  if (!(yo.veTodo || yo.funciones.some((f) => f.clave === "facturacion"))) redirect("/menu");
  const hoy = hoyMadrid();
  const mes = hoy.slice(0, 7);
  const delMes = (await calendarioFiscal("accesalia")).filter((p) => p.fecha.startsWith(mes) && p.estado !== "fraccionado" && !p.sinCargo);
  const conocido = delMes.filter((p) => p.importe != null).reduce((s, p) => s + (p.importe ?? 0), 0);
  const porSaber = delMes.filter((p) => p.importe == null && p.estado === "pendiente").length;
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1500px] px-4 pb-16 pt-5 text-sm sm:px-6">
        <Salida href="/facturacion">← Facturación y asignación</Salida>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-b border-black/10 pb-4">
          <h1 className="text-3xl font-bold leading-tight text-carbon">Prever</h1>
          <Areas yo={yo} activa="prever" />
        </div>

        <Seccion titulo={`Este mes · ${MES.format(new Date(mes + "-01T00:00:00Z"))}`} sub="Accesalia y Daniel de Soto. Lo que ya tiene dato.">
          <div className={REJILLA}>
            <Cifra
              titulo="Impuestos ya conocidos"
              valor={eur(conocido)}
              nota={`los plazos de lo fraccionado${porSaber ? ` · y ${porSaber} declaraciones con el importe por saber` : ""}`}
            />
          </div>
        </Seccion>

        <Seccion titulo="Lo que irá aquí" sub="Cada hueco se cambia por su cifra cuando haya dato.">
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
