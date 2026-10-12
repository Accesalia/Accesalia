import { redirect } from "next/navigation";
import { BarraSuperior } from "../components/BarraSuperior";
import { Salida } from "../components/Salida";
import { quienSoy } from "../../lib/sesion";
import { facturadoEntre, periodo } from "../../lib/negocio";
import { Cifra, eur, Fechas, Hueco, REJILLA, Seccion } from "../negocio/Piezas";

export const dynamic = "force-dynamic";

// RESULTADOS ECONOMICOS (Monica, 12-oct-2026): solo Daniel y Monica. Lo unico
// con dato hoy son las facturas (base sin IVA, abonos restando, anuladas
// fuera). Lo demas, huecos con su nota. Los porcentajes de impuestos, cuando
// lleguen, salen de parametros_economicos, nunca del codigo.

const EMISOR: Record<string, string> = { accesalia: "Accesalia", daniel: "Daniel", ecobalance: "Ecobalance" };

const HUECOS = [
  { titulo: "Gastos", va: "lo que cuesta el trabajo: nóminas, colaboradores, tasas, visados, desplazamientos…", falta: "una fuente de gastos (Factusol de compras o las nóminas de RRHH)." },
  { titulo: "Horas empleadas", va: "las horas de cada proyecto, también las de los requerimientos.", falta: "el fichaje por proyecto (hoy el fichaje no dice en qué se trabaja) y los RQ apuntados." },
  { titulo: "Beneficio antes de impuestos", va: "facturado menos gastos.", falta: "los gastos." },
  { titulo: "Beneficio después de impuestos", va: "el anterior menos impuestos.", falta: "los gastos, y el tipo del impuesto como parámetro." },
  {
    titulo: "Beneficio neto por tipo de proyecto",
    va: "qué deja más dinero: ascensores, SATE, CAES, 3 presupuestos, subvenciones…",
    falta: "gastos y horas por proyecto, y su tipo. Dónde va exactamente, lo vemos luego.",
  },
  { titulo: "Morosidad", va: "lo facturado que no se ha cobrado a su vencimiento, y de quién.", falta: "la fecha de cobro de cada factura (hoy solo se sabe si está cobrada, no cuándo)." },
  { titulo: "Retraso medio firma → cobro", va: "los días entre la hoja firmada y el cobro.", falta: "la fecha de cobro." },
  { titulo: "Retraso medio hito → cobro", va: "los días entre que se cumple el hito y se cobra.", falta: "la fecha del hito cumplido y la del cobro." },
  { titulo: "Administradores que dan más problemas", va: "por retrasos de pago, requerimientos, cambios de hoja…", falta: "las fechas de cobro y los RQ, ligados a su administrador." },
  { titulo: "Administradores sin problemas", va: "los que pagan a tiempo y no dan guerra.", falta: "lo mismo que el anterior." },
  { titulo: "Mejores zonas", va: "municipios y barrios por importe contratado, beneficio y éxito.", falta: "el beneficio por proyecto (lo contratado por zona ya se podría sacar)." },
];

export default async function ResultadosEconomicos({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/resultados-economicos");
  if (!yo.veTodo) redirect("/menu");
  const { desde, hasta } = periodo(await searchParams);
  const fact = await facturadoEntre(desde, hasta);
  const total = fact.reduce((s, f) => s + f.facturado, 0);
  const pendiente = fact.reduce((s, f) => s + f.pendiente, 0);

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <Salida href="/menu">← Menú</Salida>
        <h1 className="mt-3 text-3xl font-bold text-carbon sm:text-4xl">Resultados económicos</h1>
        <p className="mt-1 text-carbon/65">Entre fechas. Solo dirección. Lo que tiene dato se calcula; el resto son huecos con su nota.</p>
        <Fechas desde={desde} hasta={hasta} />

        <Seccion titulo="Importes" sub="Facturas emitidas entre estas fechas: base sin IVA, los abonos restan y las anuladas no cuentan.">
          <div className={REJILLA}>
            <Cifra titulo="Facturado" valor={eur(total)} nota={`pendiente de cobro: ${eur(pendiente)}`} />
            {fact.map((f) => (
              <Cifra key={f.emisor} titulo={EMISOR[f.emisor] ?? f.emisor} valor={eur(f.facturado)} nota={`${f.facturas} documentos · pendiente: ${eur(f.pendiente)}`} />
            ))}
          </div>
        </Seccion>

        <Seccion titulo="Lo que irá aquí">
          <div className={REJILLA}>
            {HUECOS.map((h) => (
              <Hueco key={h.titulo} {...h} />
            ))}
          </div>
        </Seccion>
      </main>
    </div>
  );
}
