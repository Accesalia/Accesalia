import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { BarraSuperior } from "../../../../components/BarraSuperior";
import { Salida } from "../../../../components/Salida";
import { quienSoy } from "../../../../../lib/sesion";
import { leerInforme, type ResumenAyuda } from "../../../../../lib/informeCostes";
import { Imprimir } from "../../../estimacion/informe/Imprimir";

export const dynamic = "force-dynamic";

// EL ESTUDIO DE AYUDAS YA EMITIDO (Monica, 12-oct-2026). Se pinta de la foto
// guardada: es lo que se le dio a la comunidad ese dia. Su idea, que es lo que
// tiene que leer la comunidad: "estas subvenciones podriais tener, pero si
// esperais a tenerlas, la obra se encarece, y al final os ahorrais menos; si lo
// haceis ahora, la subvencion llega igual, pero os ha costado menos en total.
// Pero bien redactado".

const eur = (n: number) => Math.round(n).toLocaleString("es-ES") + " €";
const pct = (n: number) => (n * 100).toLocaleString("es-ES", { maximumFractionDigits: 0 }) + " %";
const pct1 = (n: number) => (n * 100).toLocaleString("es-ES", { maximumFractionDigits: 1 }) + " %";
const HORA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

function H2({ n, children }: { n: number; children: ReactNode }) {
  return (
    <h2 className="mt-7 text-[16px] font-bold">
      <span className="mr-2 text-carbon/45">{n}.</span>
      {children}
    </h2>
  );
}

export default async function EstudioEmitido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/referencia/subvenciones/estudio/${id}`);
  const inf = await leerInforme(id);
  if (!inf || inf.tipo !== "estudio_ayudas") notFound();
  const f = inf.datos;
  const autor = inf.autor ? [inf.autor.nombre, inf.autor.apellidos].filter(Boolean).join(" ") : null;
  const resumen = f.resumen ?? [];
  // La que mas os ahorra de verdad, para contarla con palabras.
  const mejor: ResumenAyuda | undefined = [...resumen].sort((a, b) => b.cubreDeVerdad - a.cubreDeVerdad)[0];

  return (
    <div className="min-h-screen">
      <div className="print:hidden">
        <BarraSuperior />
      </div>
      <main className="mx-auto max-w-[900px] px-4 py-6 sm:px-6 print:max-w-none print:p-0">
        {inf.oportunidad_id && <Salida href={`/comercial/oportunidades/${inf.oportunidad_id}?bloque=2`}>← Oportunidad {inf.oportunidad?.codigo}</Salida>}
        <Salida href="/referencia/subvenciones">← Subvenciones posibles</Salida>
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <p className="text-[13px] text-carbon/65">
            Emitido el {HORA.format(new Date(inf.creado_en))}
            {autor ? ` por ${autor}` : ""}
            {inf.oportunidad_id ? ` · guardado en la oportunidad ${inf.oportunidad?.codigo}` : " · sin oportunidad (queda en «Direcciones vistas»)"}. Es
            lo que se emitió ese día: no se recalcula.
          </p>
          <Imprimir />
        </div>

        <article className="mt-5 rounded-2xl border border-black/5 bg-white p-7 text-[14px] leading-relaxed text-carbon shadow-sm print:border-0 print:p-0 print:shadow-none">
          <h1 className="text-[22px] font-bold">Estudio de ayudas para la obra</h1>
          <p className="mt-1 text-carbon/70">
            <b className="text-carbon">{f.nombre}</b>
            {f.direccion && f.direccion !== f.nombre ? ` · ${f.direccion}` : ""}
            {f.lugar ? `, ${f.lugar}` : ""}
          </p>
          <p className="text-carbon/70">
            {f.obra} · {f.fecha}
          </p>

          {/* ------------------------------------------------ 1 · las ayudas */}
          <H2 n={1}>Las ayudas a las que podéis optar</H2>
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

          {/* ------------------------------------------------ 2 · lo concedido cerca */}
          <H2 n={2}>Lo que ya han conseguido otros {f.entorno ? f.entorno.donde : "cerca"}</H2>
          {!f.entorno ? (
            <p className="mt-1 text-carbon/70">No tenemos registradas ayudas concedidas cerca de este edificio.</p>
          ) : (
            <>
              <p className="mt-1">
                {f.entorno.donde.charAt(0).toUpperCase() + f.entorno.donde.slice(1)} se han concedido ayudas por un total de{" "}
                <b>{eur(f.entorno.total)}</b>. Estas son algunas:
              </p>
              <ul className="mt-1.5 space-y-0.5 text-[13px]">
                {f.entorno.filas.map((x, i) => (
                  <li key={i}>
                    <b>{x.quien}</b>
                    {x.detalle && <span className="text-carbon/65"> · {x.detalle}</span>}
                    {x.importe ? ` · ${eur(x.importe)}` : ""}
                  </li>
                ))}
                {f.entorno.mas > 0 && <li className="text-carbon/65">y {f.entorno.mas} más.</li>}
              </ul>
            </>
          )}

          {/* ------------------------------------------------ 3 · el coste */}
          <H2 n={3}>Lo que cuesta la obra, y cómo sube</H2>
          {!f.precios ? (
            <p className="mt-1 text-carbon/75">No se pudo estimar: {f.sinEstimar}</p>
          ) : (
            <>
              <p className="mt-1">
                A día de hoy, la obra costaría a la comunidad unos <b>{eur(f.precios.hoy)}</b> con IVA (lo habitual, entre{" "}
                {eur(f.precios.bajo)} y {eur(f.precios.alto)}), según {f.precios.obras} obras parecidas que hemos proyectado. Este tipo
                de obra sube en torno a un {pct1(f.subidaAnual)} al año.
              </p>
              <table className="mt-2 w-full border-collapse text-left text-[13px]">
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

          {/* ------------------------------------------------ 4 · el resumen */}
          <H2 n={4}>En resumen: ¿esperar a la ayuda o empezar ya?</H2>
          {!f.precios || resumen.length === 0 ? (
            <p className="mt-1 text-carbon/70">
              No tenemos datos suficientes para echar las cuentas de la espera: de estas ayudas no sabemos todavía cuánto darían para
              esta obra o cuánto tardan en concederse.
            </p>
          ) : (
            <>
              <table className="mt-2 w-full border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b-2 border-carbon/70 align-bottom">
                    <th className="py-1.5 pr-2">Ayuda</th>
                    <th className="py-1.5 pr-2 text-right">Os daría</th>
                    <th className="py-1.5 pr-2 text-right">Llegaría en</th>
                    <th className="py-1.5 pr-2 text-right">La obra costaría entonces</th>
                    <th className="py-1.5 pr-2 text-right">Diferencia</th>
                    <th className="py-1.5 pr-2 text-right">Cubre, sobre el papel</th>
                    <th className="py-1.5 text-right">Cubre, si esperáis</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.map((r) => (
                    <tr key={r.convocatoria} className="border-b border-black/10 align-top">
                      <td className="py-1.5 pr-2">{r.convocatoria}</td>
                      <td className="py-1.5 pr-2 text-right">{eur(r.importe)}</td>
                      <td className="py-1.5 pr-2 text-right">{r.meses} meses</td>
                      <td className="py-1.5 pr-2 text-right">{eur(r.entonces)}</td>
                      <td className="py-1.5 pr-2 text-right">+{eur(r.encarece)}</td>
                      <td className="py-1.5 pr-2 text-right">{pct(r.cubrePapel)}</td>
                      <td className="py-1.5 text-right font-bold">{pct(r.cubreDeVerdad)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {mejor && (
                <div className="mt-4 space-y-2.5 rounded-xl bg-lima-soft/70 p-4 print:bg-transparent print:p-0">
                  <p>
                    Hoy la obra cuesta unos <b>{eur(mejor.hoy)}</b>. Con {mejor.convocatoria} podríais recibir unos <b>{eur(mejor.importe)}</b>,
                    que sobre el papel cubren el {pct(mejor.cubrePapel)} de la obra.
                  </p>
                  <p>
                    Pero una ayuda no llega enseguida: la concesión tardaría unos <b>{mejor.meses} meses</b>, y en ese tiempo la misma
                    obra habrá subido hasta unos {eur(mejor.entonces)}, <b>{eur(mejor.encarece)} más</b>. Si esperáis a tener la ayuda
                    para empezar, lo que de verdad os ahorráis son {eur(Math.max(0, mejor.importe - mejor.encarece))}: el{" "}
                    <b>{pct(mejor.cubreDeVerdad)}</b> de lo que cuesta hoy, no el {pct(mejor.cubrePapel)}.
                  </p>
                  <p>
                    Si la hacéis ahora, la obra os cuesta {eur(mejor.hoy)} y la ayuda se puede tramitar igualmente: os ahorráis esos{" "}
                    {eur(mejor.encarece)} de subida y disfrutáis antes de la obra. Lo que hay que cuidar son las bases de cada
                    convocatoria —por ejemplo, si exigen pedirla antes de empezar la obra—, y eso lo revisamos con vosotros.
                  </p>
                </div>
              )}
            </>
          )}

          <p className="mt-6 border-t border-black/15 pt-2 text-[11.5px] text-carbon/65">
            Estudio orientativo, a partir de los datos de nuestras obras y de las convocatorias publicadas. Los plazos son hasta la
            concesión de la ayuda; el pago suele llegar algo después. Los precios incluyen gastos generales, beneficio industrial e
            IVA; no incluyen honorarios técnicos, tasas ni licencia. El precio definitivo depende del proyecto y de los precios del
            momento de contratar; las ayudas, de sus bases y de que se convoquen.
            {f.entrada.paradasDeCatastro ? ` Paradas tomadas de Catastro (${f.entrada.paradasDeCatastro}).` : ""}
          </p>
        </article>
        {inf.oportunidad_id && (
          <Link href={`/comercial/oportunidades/${inf.oportunidad_id}?bloque=2`} className="mt-4 inline-block text-sm font-semibold text-carbon/65 hover:text-carbon print:hidden">
            Ir a la oportunidad →
          </Link>
        )}
      </main>
    </div>
  );
}
