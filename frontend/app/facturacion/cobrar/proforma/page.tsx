import Link from "next/link";
import { redirect } from "next/navigation";
import { quienSoy } from "../../../../lib/sesion";
import { detalleCobro, puedeVerCobros } from "../../../../lib/cobros";
import { leerProforma, listaProformas, paraEnviarProforma, proformasPorHito, referenciaFactusol, type Proforma } from "../../../../lib/proformas";
import { EnviarFactura } from "./EnviarFactura";
import { MarcoDinero } from "../../MarcoDinero";
import { Buscador } from "../modificar/Buscador";
import { opcionesFicha } from "../../../../lib/fichaFinanciera";
import { Copiar } from "../../proforma/[id]/AccionesProforma";
import { MarcarHitos } from "./MarcarHitos";

export const dynamic = "force-dynamic";

// COBRAR › GENERAR PROFORMA (maqueta validada, Monica, 12-oct-2026). "Al entrar,
// solo el buscador [...] Elegida, salen sus hojas firmadas con sus lineas e
// hitos: marcas los que entran y «Generar proforma». Sale la proforma con su
// correo («Enviar proforma»). Cuando llega el OK, en la misma opp: copiar en
// Factusol y «Enviar factura y Registro del cargo»."
// La proforma se crea y se envia en /facturacion/proforma/nueva y /[id] (ya
// existian). Aqui, arriba, las que esperan el OK, con lo que se copia en Factusol.

const EUR = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" } as Intl.NumberFormatOptions);

export default async function Pagina({ searchParams }: { searchParams: Promise<{ opp?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion/cobrar/proforma");
  if (!puedeVerCobros(yo)) redirect("/menu");
  const { opp } = await searchParams;
  const oppId = opp && /^[0-9a-f-]{36}$/.test(opp) ? opp : null;
  const opciones = opcionesFicha();
  const [d, enProforma, lista] = oppId
    ? await Promise.all([detalleCobro(oppId, "accesalia"), proformasPorHito(oppId), listaProformas("accesalia", { oppId })])
    : [null, {}, []];
  const esperando = (await Promise.all(lista.filter((p) => p.estado === "emitida" && !p.facturada).map((p) => leerProforma(p.id)))).filter(
    (p): p is Proforma => !!p,
  );
  // A quien se envia la factura: los de la proforma (agenda de la comunidad, y la contrata si paga ella).
  const envios = await Promise.all(esperando.map((p) => paraEnviarProforma(p).catch(() => null)));

  return (
    <MarcoDinero yo={yo} area="cobrar" activo="proforma">
      {!d && <h1 className="mb-4 text-[28px] font-bold leading-tight text-carbon">Generar Proforma</h1>}
      <Buscador ruta="/facturacion/cobrar/proforma" opciones={await opciones} inicial={d?.opp.nombre ?? undefined} />
      {oppId && !d && <p className="mt-6 text-[14px] text-carbon/60">No se ha encontrado esa dirección.</p>}
      {!oppId && (
        <p className="mt-4 text-[13.5px] text-carbon/55">
          Todas las proformas, en <Link href="/facturacion/proformas" className="font-semibold text-lima-dark hover:underline">la lista de proformas</Link>.
        </p>
      )}
      {d && (
        <>
          <h1 className="mt-6 text-[28px] font-bold leading-tight text-carbon">{d.opp.nombre ?? d.opp.codigo}</h1>
          {esperando.map((p, i) => (
            <Esperando key={p.id} p={p} destinatarios={envios[i]?.destinatarios ?? []} />
          ))}
          {d.documentos.length ? (
            <MarcarHitos documentos={d.documentos} enProforma={enProforma} />
          ) : (
            <p className="mt-6 text-[14px] text-carbon/60">Esta dirección no tiene hojas de encargo firmadas.</p>
          )}
        </>
      )}
    </MarcoDinero>
  );
}

/** Una proforma esperando el OK: (1) lo que se copia en Factusol; (2) enviar la factura. */
function Esperando({ p, destinatarios }: { p: Proforma; destinatarios: { email: string; quien: string }[] }) {
  const enviada = p.envios.find((e) => e.ok);
  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-[#ecdcae] bg-white">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[#f1e6c6] bg-[#fdf8ec] px-5 py-3.5">
        <div className="min-w-0 flex-1 text-[14px] text-carbon/75">
          <Link href={`/facturacion/proforma/${p.id}`} className="font-bold text-carbon hover:underline">
            Proforma {p.codigo}
          </Link>
          {enviada ? ` · enviada el ${enviada.creado_en.slice(0, 10).split("-").reverse().join("/")}` : " · sin enviar todavía"} · paga {p.pagador.nombre}
        </div>
        <span className="rounded-full bg-[#fbefd0] px-2.5 py-0.5 text-[12px] font-bold text-[#875f07]">Esperando el OK</span>
        <span className="text-[15px] font-bold tabular-nums text-carbon">{EUR(p.total)} €</span>
      </div>
      <div className="grid gap-0 md:grid-cols-2">
        <div className="border-b border-black/5 p-5 md:border-b-0 md:border-r">
          <div className="mb-2 text-[13px] font-bold text-carbon">
            <span className="mr-2 rounded-full bg-carbon px-2 py-0.5 text-[11px] text-white">1</span>Copiar en Factusol
          </div>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[11.5px] text-carbon/55">Referencia</div>
              <div className="font-mono text-[13px]">{referenciaFactusol(p)}</div>
            </div>
            <Copiar texto={referenciaFactusol(p)} />
          </div>
          {p.lineas.map((l, i) => (
            <div key={i} className="mt-3 flex items-start gap-2 border-t border-black/5 pt-3">
              <div className="min-w-0 flex-1">
                <div className="text-[11.5px] text-carbon/55">Línea {i + 1}</div>
                <div className="whitespace-pre-wrap text-[13px]">{l.concepto}</div>
              </div>
              <Copiar texto={l.concepto} />
            </div>
          ))}
          <div className="mt-3 border-t border-black/5 pt-3 text-[13px] text-carbon/70">
            Base {EUR(p.base)} € · IVA {p.ivaPct} % {EUR(p.iva)} €{p.irpf ? ` · IRPF ${p.irpfPct} % −${EUR(p.irpf)} €` : ""} · <b className="text-carbon">Total {EUR(p.total)} €</b>
          </div>
        </div>
        <div className="bg-[#f7f8f5] p-5">
          <div className="mb-2 text-[13px] font-bold text-carbon">
            <span className="mr-2 rounded-full bg-carbon px-2 py-0.5 text-[11px] text-white">2</span>Enviar factura y registro del cargo
          </div>
          <EnviarFactura
            proformaId={p.id}
            codigo={p.codigo}
            donde={(p.opp?.nombre ?? "").replace(/^CP\s+/i, "")}
            total={EUR(p.total)}
            destinatarios={destinatarios}
          />
          <Link href={`/facturacion/proforma/${p.id}`} className="mt-3 inline-block text-[13px] font-semibold text-lima-dark hover:underline">
            Abrir la proforma (reenviarla, anularla, el PDF) →
          </Link>
        </div>
      </div>
    </section>
  );
}
