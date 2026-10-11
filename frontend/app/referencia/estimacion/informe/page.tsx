import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { quienSoy } from "../../../../lib/sesion";
import { datosEstimacion } from "../../../../lib/estimacionCostes";
import { CASOS, dentroDe, esSate, estimar, indiceDe, TIPOS, tresPrecios, type TipoObra } from "../../../../lib/estimacionCalculo";
import { anexoDeOportunidad } from "../../../../lib/anexoEdificio";
import { plazosPorPrograma } from "../../../../lib/plazosAyudas";
import { Imprimir } from "./Imprimir";

export const dynamic = "force-dynamic";

// EL INFORME PARA LA COMUNIDAD, DESDE SU OPORTUNIDAD (Monica, 11-oct-2026):
// "comunidad, tu ascensor a dia de hoy se estima que costara X; si esperais 1
// año, sube como minimo un x %; si esperais 2, x. Estas son las subvenciones a
// las que podeis acceder y lo que dan. Tardan de media X en convocarse y se
// conceden en X meses: en ese tiempo el ascensor habra pasado de X a Y euros".
// En texto normal, sin ironia. Las ayudas salen del mismo calculo que el anexo
// de la viabilidad; los plazos, de lib/plazosAyudas.ts.

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

const eur = (n: number) => Math.round(n).toLocaleString("es-ES") + " €";
const pct = (n: number) => (n * 100).toLocaleString("es-ES", { maximumFractionDigits: 1 }) + " %";
const MES = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });
const mesesHasta = (iso: string) => Math.max(0, (new Date(iso).getTime() - Date.now()) / (30.44 * 864e5));

export default async function Informe({
  searchParams,
}: {
  searchParams: Promise<{ opp?: string; tipo?: string; caso?: string; paradas?: string; m2f?: string; m2c?: string }>;
}) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/referencia/estimacion");
  const q = await searchParams;
  const tipo = (TIPOS.find((t) => t.clave === q.tipo)?.clave ?? "ascensor") as TipoObra;
  const caso = CASOS.some(([c]) => c === q.caso) ? q.caso! : "B";

  const r = await fetch(
    `${URL_BASE}/rest/v1/oportunidades?select=id,codigo,nombre,comunidad_provisional,comunidad:comunidad_id(nombre)&codigo=eq.${encodeURIComponent((q.opp ?? "").trim().toUpperCase())}`,
    { headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` }, cache: "no-store" },
  );
  const [opp] = r.ok ? ((await r.json()) as { id: string; codigo: string; nombre: string | null; comunidad_provisional: string | null; comunidad: { nombre: string } | null }[]) : [];

  const volver = (
    <Link href="/referencia/estimacion" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon print:hidden">
      ← Estimación de costes de obra
    </Link>
  );
  if (!opp) {
    return (
      <div className="min-h-screen">
        <BarraSuperior />
        <main className="mx-auto max-w-[900px] px-4 py-6 sm:px-6">
          {volver}
          <p className="mt-6 rounded-2xl border border-black/5 bg-white p-5 text-[14px] text-carbon/70 shadow-sm">
            No encuentro la oportunidad «{q.opp}». Escribe su código tal cual (por ejemplo, DAN-2025-277).
          </p>
        </main>
      </div>
    );
  }

  const d = await datosEstimacion();
  // Las paradas: las que se den; si no, las plantas de Catastro (baja + X = X + 1).
  const anexoSin = q.paradas || tipo !== "ascensor" ? null : await anexoDeOportunidad(opp.id);
  const plantas = anexoSin?.cifras.find((c) => c.que === "plantas")?.valor ?? "";
  const deCatastro = plantas ? (plantas === "PB" ? 1 : Number(plantas.match(/PB \+ (\d+)/)?.[1] ?? 0) + 1) : null;
  const paradas = Number(q.paradas) || deCatastro || 0;
  const m2f = Number(q.m2f) || 0;
  const m2c = Number(q.m2c) || 0;
  const est = estimar(d, tipo, { caso, paradas, m2Fachada: m2f, m2Cubierta: m2c });
  const ind = indiceDe(d, tipo);
  const conIva = (pem: number) => tresPrecios(d, pem).conIva;
  const [anexo, plazos] = await Promise.all([
    est && Number.isFinite(est.hoy) ? anexoDeOportunidad(opp.id, { pem: est.hoy }) : Promise.resolve(null),
    plazosPorPrograma(),
  ]);

  const nombre = opp.comunidad?.nombre ?? opp.nombre ?? opp.comunidad_provisional ?? opp.codigo;
  const año = Number(d.hoy.slice(0, 4));
  const obra =
    tipo === "ascensor"
      ? `Instalación de ascensor (${CASOS.find(([c]) => c === caso)![1].slice(4).toLowerCase()}), ${paradas} paradas`
      : esSate(tipo)
        ? `${TIPOS.find((t) => t.clave === tipo)!.nombre}: ${[m2f && tipo !== "cubierta" ? `${m2f} m² de fachada` : null, m2c && tipo !== "fachada" ? `${m2c} m² de cubierta` : null].filter(Boolean).join(" y ")}`
        : TIPOS.find((t) => t.clave === tipo)!.nombre;

  // Cada ayuda con sus plazos y lo que costaria la obra cuando se conceda.
  const ayudas = (anexo?.ayudas ?? []).map((a) => {
    const p = a.clave ? plazos.get(a.clave) : undefined;
    const abierta = a.estado === "abierta ahora";
    const hastaConvocar = abierta ? 0 : p?.proxima ? mesesHasta(p.proxima) : null;
    const hastaConceder = hastaConvocar !== null && p?.mesesConcesion ? hastaConvocar + p.mesesConcesion : null;
    return { ...a, p, abierta, hastaConvocar, hastaConceder, precioEntonces: est && hastaConceder !== null ? conIva(dentroDe(est.hoy, hastaConceder, ind.subidaAnual)) : null };
  });
  const principal = ayudas.find((a) => a.hastaConceder !== null && a.importe);

  return (
    <div className="min-h-screen">
      <div className="print:hidden">
        <BarraSuperior />
      </div>
      <main className="mx-auto max-w-[900px] px-4 py-6 sm:px-6 print:max-w-none print:p-0">
        <div className="flex items-center justify-between gap-3 print:hidden">
          {volver}
          <Imprimir />
        </div>

        {!est || !Number.isFinite(est.hoy) ? (
          <p className="mt-6 rounded-2xl border border-black/5 bg-white p-5 text-[14px] text-carbon/70 shadow-sm">
            No se puede estimar: {est?.nota ?? (esSate(tipo) ? "faltan los m² (escríbelos en la estimación)." : "faltan las paradas (no las encuentro en Catastro: escríbelas en la estimación).")}
          </p>
        ) : (
          <article className="mt-5 rounded-2xl border border-black/5 bg-white p-7 text-[14px] leading-relaxed text-carbon shadow-sm print:border-0 print:p-0 print:shadow-none">
            <h1 className="text-[22px] font-bold">Estimación del coste de la obra</h1>
            <p className="mt-1 text-carbon/70">
              <b className="text-carbon">{nombre}</b>
              {anexo?.direccion ? ` · ${anexo.direccion}` : ""}
              {anexo?.lugar ? `, ${anexo.lugar}` : ""}
            </p>
            <p className="text-carbon/70">{obra}</p>

            <h2 className="mt-5 text-[16px] font-bold">Lo que cuesta hoy</h2>
            <p className="mt-1">
              A día de hoy, se estima que la obra costará a la comunidad unos <b>{eur(conIva(est.hoy))}</b> con IVA (lo habitual,
              entre {eur(conIva(est.bajo))} y {eur(conIva(est.alto))}); de ellos, {eur(est.hoy)} son de ejecución material. La
              estimación se basa en {est.obras} obras parecidas que hemos proyectado en los últimos años, actualizadas a precios
              de hoy.
            </p>

            <h2 className="mt-5 text-[16px] font-bold">Si se espera</h2>
            <p className="mt-1">
              Los precios de este tipo de obra siguen subiendo: en nuestras obras, en torno a un {pct(ind.subidaAnual)} al año. Si
              la obra se hace dentro de un año, se espera que suba como mínimo un {pct(ind.subidaMinima)}.
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
                {(
                  [
                    [`Hoy (${año})`, conIva(est.hoy)],
                    [`Dentro de 1 año (${año + 1})`, conIva(dentroDe(est.hoy, 12, ind.subidaAnual))],
                    [`Dentro de 2 años (${año + 2})`, conIva(dentroDe(est.hoy, 24, ind.subidaAnual))],
                  ] as const
                ).map(([k, v]) => (
                  <tr key={k} className="border-b border-black/10">
                    <td className="py-1.5">{k}</td>
                    <td className="py-1.5 text-right">{eur(v)}</td>
                    <td className="py-1.5 text-right">{k.startsWith("Hoy") ? "—" : "+" + eur(v - conIva(est.hoy))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h2 className="mt-5 text-[16px] font-bold">Las ayudas a las que podéis acceder</h2>
            {ayudas.length === 0 ? (
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
                  {ayudas.map((a) => (
                    <tr key={a.convocatoria} className="border-b border-black/10 align-top">
                      <td className="py-1.5 pr-2">
                        <b>{a.convocatoria}</b>
                        {a.cubre && <div className="text-carbon/60">{a.cubre}</div>}
                      </td>
                      <td className="py-1.5 pr-2">
                        {a.cuantoDa}
                        {a.estimacion && <div className="font-semibold">Para esta obra: {a.estimacion}</div>}
                      </td>
                      <td className="py-1.5">
                        {a.abierta
                          ? "Abierta ahora."
                          : a.p?.proxima
                            ? `Próxima convocatoria prevista hacia ${MES.format(new Date(a.p.proxima))}.`
                            : `${a.estado.charAt(0).toUpperCase()}${a.estado.slice(1)}.`}
                        {a.p?.mesesConcesion
                          ? ` Se suele conceder unos ${Math.round(a.p.mesesConcesion)} meses después de convocarse.`
                          : " Sin datos de cuánto tarda en concederse."}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {principal && principal.precioEntonces && (
              <>
                <h2 className="mt-5 text-[16px] font-bold">Esperar a la ayuda</h2>
                <p className="mt-1">
                  Si se espera a {principal.convocatoria}
                  {principal.abierta ? ", que está abierta ahora," : ""}, la concesión llegaría previsiblemente dentro de unos{" "}
                  {Math.round(principal.hastaConceder!)} meses. Para entonces, la obra habrá pasado de {eur(conIva(est.hoy))} a unos{" "}
                  <b>{eur(principal.precioEntonces)}</b> con IVA: <b>{eur(principal.precioEntonces - conIva(est.hoy))} más</b>, frente a los{" "}
                  {eur(principal.importe!)} que daría esa ayuda.
                </p>
              </>
            )}

            <p className="mt-6 border-t border-black/15 pt-2 text-[11.5px] text-carbon/60">
              Estimación orientativa, a partir de los datos de nuestras obras y de las convocatorias publicadas: precio de la obra
              con gastos generales, beneficio industrial e IVA; sin honorarios técnicos, tasas ni licencia. El precio definitivo
              depende del proyecto, de las mediciones reales y de los precios del momento de contratar; las ayudas, de sus bases y
              de que se convoquen.
              {est.nota ? ` ${est.nota}` : ""}
              {!q.paradas && deCatastro ? ` Paradas tomadas de Catastro (${plantas}).` : ""}
            </p>
          </article>
        )}
      </main>
    </div>
  );
}
