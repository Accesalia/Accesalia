import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { quienSoy } from "../../../lib/sesion";
import { periodo, trabajoContratado } from "../../../lib/negocio";
import { Cifra, eur, Fechas, FECHA, Hueco, pct, REJILLA, Seccion } from "../Piezas";

export const dynamic = "force-dynamic";

// TRABAJO CONTRATADO (Monica, 12-oct-2026). Entre fechas. Opp GANADA = hoja
// firmada, por la fecha en que se RECIBIO firmada. Exito: ganadas/(ganadas +
// perdidas) y ganadas/abiertas. Lo que aun no tiene dato sale como hueco.

const MES = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function TrabajoContratado({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/negocio/trabajo-contratado");
  if (!yo.veTodo) redirect("/menu");
  const { desde, hasta } = periodo(await searchParams);
  const d = await trabajoContratado(desde, hasta);
  const t = d.total;
  const th = "px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-wide text-carbon/60";
  const td = "px-3 py-2 tabular-nums";

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <Salida href="/negocio">← Negocio</Salida>
        <h1 className="mt-3 text-3xl font-bold text-carbon sm:text-4xl">Trabajo contratado</h1>
        <Fechas desde={desde} hasta={hasta} />

        <Seccion titulo="De un vistazo" sub="Ganada = hoja de encargo firmada, por la fecha en que la recibimos firmada.">
          <div className={REJILLA}>
            <Cifra titulo="Opps abiertas hoy" valor={t.abiertasAhora} nota={`${t.abiertasEnPeriodo} abiertas entre estas fechas`} />
            <Cifra titulo="Opps ganadas" valor={t.ganadas} nota={`${t.perdidas} perdidas entre estas fechas`} />
            <Cifra titulo="Total contratado" valor={eur(t.importe)} nota="Base sin IVA de las versiones firmadas" />
            <Cifra
              titulo="% éxito"
              valor={pct(t.exitoCerradas)}
              nota={
                <>
                  ganadas / (ganadas + perdidas) · ganadas / abiertas: <b>{pct(t.exitoAbiertas)}</b>
                </>
              }
            />
            <Cifra
              titulo="Administradores nuevos"
              valor={t.adminsNuevos}
              nota={
                <>
                  con al menos una hoja firmada: <b>{t.adminsConFirma}</b> ({pct(t.adminsNuevos ? t.adminsConFirma / t.adminsNuevos : null)})
                </>
              }
            />
            {d.adminsSinFecha > 0 && (
              <Hueco
                titulo="Administradores de antes"
                va={`los ${d.adminsSinFecha} administradores de la cartera no tienen fecha de alta, así que no cuentan como nuevos en ningún periodo.`}
                falta="desde hoy cada alta guarda su fecha; los anteriores, solo si se pone a mano (de Monday no se saca)."
              />
            )}
          </div>
        </Seccion>

        <Seccion titulo="Por comercial">
          <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white shadow-sm">
            <table className="w-full text-[14px]">
              <thead className="border-b border-black/10">
                <tr>
                  <th className={th}>Comercial</th>
                  <th className={th}>Abiertas hoy</th>
                  <th className={th}>Abiertas en el periodo</th>
                  <th className={th}>Ganadas</th>
                  <th className={th}>Perdidas</th>
                  <th className={th}>Contratado</th>
                  <th className={th}>% éxito (gan./cerradas)</th>
                  <th className={th}>% éxito (gan./abiertas)</th>
                  <th className={th}>Admins nuevos</th>
                  <th className={th}>% éxito admins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {[...d.porComercial, t].map((c) => (
                  <tr key={c.id ?? c.nombre} className={c === t ? "bg-lima-soft font-bold" : ""}>
                    <td className="px-3 py-2">{c.nombre}</td>
                    <td className={td}>{c.abiertasAhora}</td>
                    <td className={td}>{c.abiertasEnPeriodo}</td>
                    <td className={td}>{c.ganadas}</td>
                    <td className={td}>{c.perdidas}</td>
                    <td className={td}>{eur(c.importe)}</td>
                    <td className={td}>{pct(c.exitoCerradas)}</td>
                    <td className={td}>{pct(c.exitoAbiertas)}</td>
                    <td className={td}>{c.adminsNuevos}</td>
                    <td className={td}>{pct(c.adminsNuevos ? c.adminsConFirma / c.adminsNuevos : null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Seccion>

        <Seccion titulo="Importes firmados por mes">
          {d.porMes.length === 0 ? (
            <p className="text-carbon/65">Ninguna hoja firmada entre estas fechas.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white shadow-sm sm:max-w-[560px]">
              <table className="w-full text-[14px]">
                <thead className="border-b border-black/10">
                  <tr>
                    <th className={th}>Mes</th>
                    <th className={th}>Hojas firmadas</th>
                    <th className={th}>Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {d.porMes.map((m) => (
                    <tr key={m.mes}>
                      <td className="px-3 py-2 capitalize">{MES.format(new Date(`${m.mes}-01T00:00:00Z`))}</td>
                      <td className={td}>{m.firmadas}</td>
                      <td className={td}>{eur(m.importe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Seccion>

        <Seccion
          titulo={`Lo contratado, dirección por dirección (${d.direcciones.length})`}
          sub="Las oportunidades abiertas con una hoja firmada entre estas fechas: qué se contrató, por cuánto, cuándo y en qué punto está."
        >
          <div className="mb-3 sm:max-w-[560px]">
            <Hueco
              titulo="En qué punto está"
              va="la fase de cada línea: las de proyecto (escaneo, nube, técnico, revisión, visado, licencia…) y las de obra."
              falta="las áreas y sus fases (esperan a tus dos Excel de qué abre cada línea). Hoy solo se sabe la nube de puntos."
            />
          </div>
          <ul className="space-y-3">
            {d.direcciones.map((x) => (
              <li key={x.oppId} className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={`/comercial/oportunidades/${x.oppId}`} className="text-[16px] font-bold text-carbon hover:underline">
                    {x.direccion}
                  </Link>
                  <span className="text-[13px] text-carbon/65">{[x.codigo, x.comercial].filter(Boolean).join(" · ")}</span>
                </div>
                <div className="mt-1 text-[13px] text-carbon/70">
                  {x.hojas.map((h) => `${h.codigo ?? "Hoja"} firmada el ${h.firmada ? FECHA.format(new Date(h.firmada)) : "—"} · ${eur(h.importe)}`).join(" · ")}
                </div>
                {x.lineas.length > 0 ? (
                  <ul className="mt-2 grid gap-1 text-[13.5px] sm:grid-cols-2">
                    {x.lineas.map((l, i) => (
                      <li key={i} className="flex justify-between gap-3 rounded-lg bg-black/[0.03] px-2.5 py-1">
                        <span>{l.descripcion}</span>
                        <span className="tabular-nums text-carbon/75">
                          {l.importe != null ? eur(l.importe) : l.porcentaje != null ? `${l.porcentaje} %` : "a éxito"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-[13px] italic text-carbon/60">Sin líneas de facturación.</p>
                )}
                <div className="mt-2 text-[12.5px] text-carbon/65">
                  <b>Punto:</b>{" "}
                  {x.nube
                    ? [
                        x.nube.prevista && `escaneo previsto ${FECHA.format(new Date(x.nube.prevista))}`,
                        x.nube.escaneado && `escaneado ${FECHA.format(new Date(x.nube.escaneado))}`,
                        x.nube.lista && `nube lista ${FECHA.format(new Date(x.nube.lista))}`,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "nube sin fechas"
                    : "sin dato (pendiente de las áreas)"}
                </div>
              </li>
            ))}
          </ul>
        </Seccion>
      </main>
    </div>
  );
}
