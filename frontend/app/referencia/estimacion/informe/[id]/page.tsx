import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BarraSuperior } from "../../../../components/BarraSuperior";
import { quienSoy } from "../../../../../lib/sesion";
import { leerInforme } from "../../../../../lib/informeCostes";
import { Imprimir } from "../Imprimir";

export const dynamic = "force-dynamic";

// UN INFORME DE COSTES YA EMITIDO (Monica, 12-oct-2026). Se pinta de la foto
// guardada en informes_generados, sin recalcular nada: es lo que se le dio a la
// comunidad ese dia. El texto es el del informe del 11-oct ("comunidad, tu
// ascensor a dia de hoy se estima que costara X; si esperais 1 año..."), en
// texto normal, sin ironia.

const eur = (n: number) => Math.round(n).toLocaleString("es-ES") + " €";
const pct = (n: number) => (n * 100).toLocaleString("es-ES", { maximumFractionDigits: 1 }) + " %";
const HORA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

export default async function InformeEmitido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/referencia/estimacion/informe/${id}`);
  const inf = await leerInforme(id);
  if (!inf || inf.tipo !== "estimacion_costes") notFound();
  const f = inf.datos;
  const autor = inf.autor ? [inf.autor.nombre, inf.autor.apellidos].filter(Boolean).join(" ") : null;

  return (
    <div className="min-h-screen">
      <div className="print:hidden">
        <BarraSuperior />
      </div>
      <main className="mx-auto max-w-[900px] px-4 py-6 sm:px-6 print:max-w-none print:p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {inf.oportunidad_id && (
              <Link href={`/comercial/oportunidades/${inf.oportunidad_id}?bloque=2`} className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
                ← Oportunidad {inf.oportunidad?.codigo}
              </Link>
            )}
            <Link href="/referencia/estimacion" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
              ← Estimación de costes de obra
            </Link>
          </div>
          <div className="flex items-center gap-2.5">
            <a href={`/referencia/estimacion/informe/${id}/pdf`} target="_blank" rel="noreferrer" className="rounded-xl border border-carbon/30 bg-white px-4 py-2 text-[14px] font-bold text-carbon transition hover:border-carbon">
              Ver PDF
            </a>
            <a href={`/referencia/estimacion/informe/${id}/pdf?descargar=1`} className="rounded-xl border border-carbon/30 bg-white px-4 py-2 text-[14px] font-bold text-carbon transition hover:border-carbon">
              Descargar PDF
            </a>
            <Imprimir />
          </div>
        </div>
        <p className="mt-2 text-[13px] text-carbon/65 print:hidden">
          Emitido el {HORA.format(new Date(inf.creado_en))}
          {autor ? ` por ${autor}` : ""}
          {inf.oportunidad_id ? ` · guardado en la oportunidad ${inf.oportunidad?.codigo}` : " · sin oportunidad (queda en «Direcciones vistas»)"}.
          Es lo que se emitió ese día: no se recalcula.
        </p>

        <article className="mt-5 rounded-2xl border border-black/5 bg-white p-7 text-[14px] leading-relaxed text-carbon shadow-sm print:border-0 print:p-0 print:shadow-none">
          <h1 className="text-[22px] font-bold">Estimación del coste de la obra</h1>
          <p className="mt-1 text-carbon/70">
            <b className="text-carbon">{f.nombre}</b>
            {f.direccion && f.direccion !== f.nombre ? ` · ${f.direccion}` : ""}
            {f.lugar ? `, ${f.lugar}` : ""}
          </p>
          <p className="text-carbon/70">
            {f.obra} · {f.fecha}
          </p>

          {!f.precios ? (
            <p className="mt-5 text-carbon/75">No se pudo estimar: {f.sinEstimar}</p>
          ) : (
            <>
              <h2 className="mt-5 text-[16px] font-bold">Lo que cuesta hoy</h2>
              <p className="mt-1">
                A día de hoy, se estima que la obra costará a la comunidad unos <b>{eur(f.precios.hoy)}</b> con IVA (lo habitual,
                entre {eur(f.precios.bajo)} y {eur(f.precios.alto)}); de ellos, {eur(f.precios.pem)} son de ejecución material. La
                estimación se basa en {f.precios.obras} obras parecidas que hemos proyectado en los últimos años, actualizadas a
                precios de hoy.
              </p>

              <h2 className="mt-5 text-[16px] font-bold">Si se espera</h2>
              <p className="mt-1">
                Los precios de este tipo de obra siguen subiendo: en nuestras obras, en torno a un {pct(f.subidaAnual)} al año. Si la
                obra se hace dentro de un año, se espera que suba como mínimo un {pct(f.subidaMinima)}.
              </p>
              <table className="mt-3 w-full border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b-2 border-carbon/70">
                    <th className="py-1.5">Cuándo</th>
                    <th className="py-1.5 text-right">Coste estimado (con IVA)</th>
                    <th className="py-1.5 text-right">Más que hoy</th>
                  </tr>
                </thead>
                <tbody>
                  {f.años.map((a) => (
                    <tr key={a.cuando} className="border-b border-black/10">
                      <td className="py-1.5">{a.cuando}</td>
                      <td className="py-1.5 text-right">{eur(a.valor)}</td>
                      <td className="py-1.5 text-right">{a.mas === null ? "—" : "+" + eur(a.mas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <h2 className="mt-5 text-[16px] font-bold">Las ayudas a las que podéis acceder</h2>
          {f.ayudas.length === 0 ? (
            <p className="mt-1 text-carbon/70">No encontramos ayudas que encajen con esta obra en este edificio.</p>
          ) : (
            <table className="mt-2 w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b-2 border-carbon/70">
                  <th className="py-1.5 pr-2">Ayuda</th>
                  <th className="py-1.5 pr-2">Qué da</th>
                  <th className="py-1.5">Cuándo</th>
                </tr>
              </thead>
              <tbody>
                {f.ayudas.map((a) => (
                  <tr key={a.convocatoria} className="border-b border-black/10 align-top">
                    <td className="py-1.5 pr-2">
                      <b>{a.convocatoria}</b>
                      {a.cubre && <div className="text-carbon/65">{a.cubre}</div>}
                    </td>
                    <td className="py-1.5 pr-2">
                      {a.cuantoDa}
                      {a.estimacion && <div className="font-semibold">Para esta obra: {a.estimacion}</div>}
                    </td>
                    <td className="py-1.5">{a.cuando}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {f.esperar && f.precios && (
            <>
              <h2 className="mt-5 text-[16px] font-bold">Esperar a la ayuda</h2>
              <p className="mt-1">
                Si se espera a {f.esperar.convocatoria}
                {f.esperar.abierta ? ", que está abierta ahora," : ""}, la concesión llegaría previsiblemente dentro de unos{" "}
                {f.esperar.meses} meses. Para entonces, la obra habrá pasado de {eur(f.precios.hoy)} a unos <b>{eur(f.esperar.entonces)}</b>{" "}
                con IVA: <b>{eur(f.esperar.mas)} más</b>, frente a los {eur(f.esperar.importe)} que daría esa ayuda.
              </p>
            </>
          )}

          <p className="mt-6 border-t border-black/15 pt-2 text-[11.5px] text-carbon/65">
            Estimación orientativa, a partir de los datos de nuestras obras y de las convocatorias publicadas: precio de la obra con
            gastos generales, beneficio industrial e IVA; sin honorarios técnicos, tasas ni licencia. El precio definitivo depende
            del proyecto, de las mediciones reales y de los precios del momento de contratar; las ayudas, de sus bases y de que se
            convoquen.
            {f.nota ? ` ${f.nota}` : ""}
            {f.entrada.paradasDeCatastro ? ` Paradas tomadas de Catastro (${f.entrada.paradasDeCatastro}).` : ""}
          </p>
        </article>
      </main>
    </div>
  );
}
