import { redirect } from "next/navigation";
import { quienSoy } from "../../../lib/sesion";
import { horasSemana, periodo, trabajoContratado, type Colchon, type UmbralesColchon } from "../../../lib/negocio";
import { BotonUmbrales } from "./UmbralesColchon";
import { BloqueTrabajo, PaginaTrabajo, Periodo } from "../../components/CabeceraTrabajo";
import { eur, pct } from "../Piezas";

export const dynamic = "force-dynamic";

// TRABAJO CONTRATADO (Monica, 12-oct-2026; rehecha el 21-oct-2026 sobre su maqueta,
// https://claude.ai/artifact/KMxfsqi9jepAwbhnTnQzW3). Entrar y saber QUE tenemos
// contratado, QUIEN lo trajo y EN QUE SE TRADUCE (horas de tecnico y el colchon de
// proyectos). Opp GANADA = hoja firmada, por la fecha en que se RECIBIO firmada.
// Lo contratado sale de las lineas de las hojas firmadas: lo que es cada una y su
// importe (lib/negocio.ts). Los textos estan por matizar con ella.

const RUTA = "/negocio/trabajo-contratado";
const MES = new Intl.DateTimeFormat("es-ES", { month: "short", timeZone: "UTC" });
const N = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });
const VERDE = "#3f8a1c";
const TINTA = "#2f6a14";
const VELO = "#d3ecbf";

function Cifra({ titulo, valor, nota, primera }: { titulo: string; valor: React.ReactNode; nota?: React.ReactNode; primera?: boolean }) {
  return (
    <div className="min-w-0 border-l border-black/10 px-5 py-[18px] first:border-l-0" style={primera ? { background: `linear-gradient(150deg, ${VELO}, #fff 80%)` } : undefined}>
      <div className="text-[11.5px] font-extrabold uppercase tracking-[0.07em]" style={{ color: TINTA }}>{titulo}</div>
      <div className={`mt-1 font-[family-name:var(--letra-menu)] font-extrabold tabular-nums tracking-[-0.02em] ${primera ? "text-[40px]" : "text-[28px]"}`}>{valor}</div>
      {nota && <div className="mt-0.5 text-[12.5px] text-carbon/65">{nota}</div>}
    </div>
  );
}

/** EL COLCHON DE PROYECTOS: la regla de 0 a 8 semanas con sus zonas y la aguja. */
function CifraColchon({ c, u }: { c: Colchon; u: UmbralesColchon }) {
  const s = c.semanas;
  const malo = s != null && (s < u.minimo || s > u.maximo);
  const ideal = s != null && s >= u.idealDesde && s <= u.idealHasta;
  const texto =
    s == null
      ? "Aún no hay proyectos en la cola de Asignar."
      : s < u.minimo
        ? `Poco colchón: con menos de ${u.minimo} semanas no da tiempo a reaccionar.`
        : s > u.maximo
          ? `Colapso: hay trabajo en cola para ${N.format(s)} semanas de espera.`
          : ideal
            ? "Vamos bien, en lo ideal."
            : `Vamos bien (lo ideal, de ${u.idealDesde} a ${u.idealHasta} semanas).`;
  const tope = Math.max(8, Math.ceil(u.maximo + 2));
  const pos = (w: number) => `${(Math.min(w, tope) / tope) * 100}%`;
  const zonas = [
    { hasta: u.minimo, color: "#e8b1aa" },
    { hasta: u.idealDesde, color: "#bfe0a8" },
    { hasta: u.idealHasta, color: "#4fae2c" },
    { hasta: u.maximo, color: "#bfe0a8" },
    { hasta: tope, color: "#e8b1aa" },
  ];
  return (
    <div className="min-w-0 border-l border-black/10 px-5 py-[18px]">
      <div className="text-[11.5px] font-extrabold uppercase tracking-[0.07em]" style={{ color: TINTA }}>Colchón de proyectos</div>
      <div className="mt-1 flex items-center gap-2.5">
        <span className="h-4 w-4 rounded-full" style={{ background: s == null ? "rgba(43,43,43,.18)" : malo ? "#d94c3d" : "#4fae2c" }} />
        <span className={`font-[family-name:var(--letra-menu)] text-[26px] font-extrabold tabular-nums ${s == null ? "text-carbon/45" : malo ? "text-[#b23a2c]" : ""}`} style={!malo && s != null ? { color: TINTA } : undefined}>
          {s == null ? "Por medir" : `${N.format(s)} semanas`}
        </span>
      </div>
      <div className="mt-0.5 text-[12.5px] text-carbon/70">{texto}</div>
      <div className="relative mt-3 flex h-2">
        {zonas.map((z, i) => (
          <span key={i} style={{ width: `${((z.hasta - (i ? zonas[i - 1].hasta : 0)) / tope) * 100}%`, background: z.color }} />
        ))}
        {s != null && <span className="absolute -top-[5px] h-[18px] w-[3px] -translate-x-1/2 rounded-[1px] bg-carbon" style={{ left: pos(s) }} />}
      </div>
      <div className="relative mt-[3px] h-4 text-[10.5px] text-carbon/60">
        {[u.minimo, u.idealDesde, u.idealHasta, u.maximo].map((w) => (
          <span key={w} className="absolute -translate-x-1/2" style={{ left: pos(w) }}>{w}</span>
        ))}
        <span className="absolute right-0">{tope}+ sem</span>
      </div>
      <div className="mt-1 text-[11.5px] text-carbon/60">
        {c.proyectos} proyectos en cola · {N.format(Math.round(c.horas))} h frente a {horasSemana(u)} h por semana
        {c.sinHoras > 0 && ` · ${c.sinHoras} sin horas estimadas`}
      </div>
      <div className="mt-1.5">
        <BotonUmbrales umbrales={u} />
      </div>
    </div>
  );
}

export default async function TrabajoContratado({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=${RUTA}`);
  if (!yo.veTodo) redirect("/menu");
  const { desde, hasta } = periodo(await searchParams);
  const d = await trabajoContratado(desde, hasta);
  const t = d.total;
  const sube = d.anterior.importe ? t.importe / d.anterior.importe - 1 : null;
  const maxCom = Math.max(1, ...d.porComercial.map((c) => c.importe));
  const maxMes = Math.max(1, ...d.porMes.flatMap((m) => [m.importe, m.importeAnterior]));
  const th = "px-4 py-2.5 text-right align-bottom text-[11px] font-extrabold uppercase tracking-[0.07em] text-[#f3f4f1]/80 whitespace-nowrap";
  const sub = "mt-0.5 block text-[10px] font-semibold normal-case tracking-normal text-[#f3f4f1]/55";
  const td = "px-4 py-3 text-right tabular-nums whitespace-nowrap";
  const chico = "block text-[11.5px] font-semibold text-carbon/60";
  const tarjeta = "rounded-[7px] bg-white shadow-[0_1px_2px_rgba(0,0,0,.25),0_12px_26px_-14px_rgba(0,0,0,.6)]";
  const [primeras, resto] = [d.administraciones.slice(0, 3), d.administraciones.slice(3, 15)];
  const filaAdm = (a: (typeof d.administraciones)[number], i: number) => (
    <li key={a.nombre} className="grid grid-cols-[26px_1fr_auto_100px] items-baseline gap-2.5 border-t border-black/10 px-[18px] py-2">
      <span className="tabular-nums text-carbon/45">{i + 1}</span>
      <span className="min-w-0 font-bold">{a.nombre}</span>
      <span className="whitespace-nowrap text-right tabular-nums text-carbon/65">{a.opps} {a.opps === 1 ? "opp" : "opps"}</span>
      <span className="text-right font-bold tabular-nums">{eur(a.importe)}</span>
    </li>
  );

  return (
    <PaginaTrabajo
      grupo="direccion"
      area="Negocio"
      salida={{ href: "/negocio", texto: "← Negocio" }}
      titulo="Trabajo contratado"
      subtitulo="Qué hemos contratado, quién lo trajo y en qué se traduce."
      color="verde"
      icono="firma"
      cabecera={
        <>
          <Periodo ruta={RUTA} desde={desde} hasta={hasta} color="verde" />
          {sube != null && (
            <p className="mt-2.5 text-[13px] text-[#f3f4f1]/70">
              Comparado con el mismo periodo de un año antes:{" "}
              <b className="text-[#a6dc7e]">{sube >= 0 ? "+" : ""}{Math.round(sube * 100)} %</b> contratado
            </p>
          )}
        </>
      }
    >
      <BloqueTrabajo titulo="Lo contratado" color="verde" nota="Sale de las líneas de las hojas firmadas: lo que es cada línea y su importe.">
        <div className={`${tarjeta} grid grid-cols-2 overflow-hidden lg:grid-cols-[1.25fr_1fr_1.25fr_1.4fr]`}>
          <Cifra
            primera
            titulo="Total contratado"
            valor={eur(t.importe)}
            nota={d.anterior.importe ? <>base sin IVA · un año antes, {eur(d.anterior.importe)}</> : "base sin IVA"}
          />
          <Cifra titulo="Ticket medio" valor={d.hojas ? eur(t.importe / d.hojas) : "—"} nota="por hoja firmada" />
          <Cifra
            titulo="Horas de técnico"
            valor={`≈ ${N.format(Math.round(d.horasTecnico))} h`}
            nota={`lo que piden los proyectos contratados, en tiempos estándar: ${horasSemana(d.umbrales) ? N.format(d.horasTecnico / horasSemana(d.umbrales)) : "—"} semanas del equipo`}
          />
          <CifraColchon c={d.colchon} u={d.umbrales} />
        </div>

        <div className="mt-4 rounded-[7px] border-[1.5px] border-white/55 bg-white/[0.06] p-4">
          <h3 className="font-[family-name:var(--letra-menu)] text-[16px] font-extrabold tracking-[-0.01em] text-[#f3f4f1]">Qué hemos contratado de cada tipo</h3>
          <div className="mt-3 grid grid-cols-1 items-start gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {d.columnas.map((c) => (
              <div key={c.titulo} className={`${tarjeta} overflow-hidden`}>
                <div className="flex items-baseline justify-between gap-2 bg-[#2e3236] px-3.5 py-2.5 font-[family-name:var(--letra-menu)] text-[14px] font-extrabold text-[#f3f4f1]">
                  <span>{c.titulo}</span>
                  <span className="whitespace-nowrap text-[12.5px] font-bold tabular-nums text-[#f3f4f1]/80">
                    <b className="text-[#a6dc7e]">{c.lineas}</b> · {eur(c.importe)}
                  </span>
                </div>
                {c.tipos.map((x) => (
                  <div key={x.nombre} className={`flex justify-between gap-2 border-t border-black/10 px-3.5 py-[5px] text-[13px] leading-snug ${x.lineas ? "" : "text-carbon/45"}`}>
                    <span className="min-w-0">{x.nombre}</span>
                    {x.lineas ? (
                      <span className="whitespace-nowrap tabular-nums text-carbon/65">
                        <b className="text-carbon">{x.lineas}</b> · {x.importe ? eur(x.importe) : "a éxito"}
                        {x.importe > 0 && x.aExito > 0 && <span className="text-[11.5px]" style={{ color: TINTA }}> +{x.aExito} a éxito</span>}
                      </span>
                    ) : (
                      <span className="text-[12px] italic">nada</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          {d.sinTipo.lineas > 0 && (
            <div className="mt-3 flex flex-wrap items-baseline gap-x-3.5 gap-y-1 rounded-[7px] bg-[#fff4c6] px-4 py-2.5 text-[13px] text-[#7a5a00]">
              <b>
                Sin tipo apuntado: {d.sinTipo.lineas} {d.sinTipo.lineas === 1 ? "línea" : "líneas"} · {eur(d.sinTipo.importe)}
              </b>
              <span>{d.sinTipo.porBloque.map((b) => `${b.bloque.charAt(0) + b.bloque.slice(1).toLowerCase()} ${b.lineas} · ${eur(b.importe)}`).join(" · ")}</span>
            </div>
          )}
          {Math.abs(d.importeLineas - t.importe) >= 1 && (
            <p className="mt-2.5 text-[12.5px] text-[#f3f4f1]/70">
              Las líneas suman {eur(d.importeLineas)} y las hojas, {eur(t.importe)}: hay {eur(Math.abs(t.importe - d.importeLineas))} que no están en ninguna línea con importe.
            </p>
          )}
        </div>
      </BloqueTrabajo>

      <BloqueTrabajo titulo="Quién lo trajo" color="verde" nota="Arriba el total; debajo, cada comercial con las mismas preguntas.">
        <div className="flex justify-center">
          <div className={`${tarjeta} max-w-full overflow-x-auto`}>
            <table className="border-collapse text-[14px]">
              <thead className="bg-[#2e3236]">
                <tr>
                  <th className={th + " text-left"}>Comercial</th>
                  <th className={th}>Opps nuevas<span className={sub}>abrió en el periodo</span></th>
                  <th className={th}>Admins nuevos<span className={sub}>dio de alta</span></th>
                  <th className={th}>Opps abiertas<span className={sub}>tiene hoy</span></th>
                  <th className={th}>Opps firmadas<span className={sub}>en el periodo</span></th>
                  <th className={th}>Dinero<span className={sub}>contratado</span></th>
                </tr>
              </thead>
              <tbody>
                <tr className="font-[family-name:var(--letra-menu)] text-[22px] font-extrabold" style={{ background: `linear-gradient(90deg, ${VELO}, #f4faef)` }}>
                  <td className="px-4 py-3 text-left text-[14px] uppercase tracking-[0.07em]" style={{ color: TINTA }}>Total</td>
                  <td className={td}>{t.abiertasEnPeriodo}</td>
                  <td className={td}>
                    {t.adminsNuevos}
                    {d.adminsSinFecha > 0 && <span className={chico + " font-sans"}>{d.adminsSinFecha} sin fecha de alta</span>}
                  </td>
                  <td className={td}>{t.abiertasAhora}</td>
                  <td className={td}>
                    {t.ganadas}
                    <span className={chico + " font-sans"}>{pct(t.exitoCerradas)} de las cerradas</span>
                  </td>
                  <td className={td}>{eur(t.importe)}</td>
                </tr>
                {d.porComercial.map((c) => (
                  <tr key={c.id ?? c.nombre} className="border-t border-black/10">
                    <td className="px-4 py-3 text-left font-bold">{c.nombre}</td>
                    <td className={td}>{c.abiertasEnPeriodo}</td>
                    <td className={td}>{c.adminsNuevos}</td>
                    <td className={td}>{c.abiertasAhora}</td>
                    <td className={td}>
                      {c.ganadas}
                      {c.exitoCerradas != null && <span className={chico}>{pct(c.exitoCerradas)} de las cerradas</span>}
                    </td>
                    <td className={td}>
                      <div className="flex items-center justify-end gap-2.5">
                        <span>{eur(c.importe)}</span>
                        <span className="flex h-2 w-[120px] rounded-[2px] bg-black/[0.07]">
                          <i className="block h-2 rounded-[2px]" style={{ width: `${Math.max(1.5, (c.importe / maxCom) * 100)}%`, background: VERDE }} />
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {d.administraciones.length > 0 && (
          <div className="mt-4 flex justify-center">
            <div className={`${tarjeta} w-[min(100%,640px)]`}>
              <div className="px-[18px] pb-2 pt-3.5 text-[11.5px] font-extrabold uppercase tracking-[0.07em]" style={{ color: TINTA }}>
                Y de qué administraciones vino
              </div>
              <ol>{primeras.map(filaAdm)}</ol>
              {resto.length > 0 ? (
                <details className="group">
                  <ol className="hidden group-open:block">{resto.map((a, i) => filaAdm(a, i + 3))}</ol>
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 border-t border-black/10 px-[18px] py-2.5 text-[12.5px] text-carbon/65 [&::-webkit-details-marker]:hidden">
                    <span>
                      {d.administraciones.length} administraciones han firmado algo
                      {d.ganadasSinAdministracion > 0 && ` · ${d.ganadasSinAdministracion} opps ganadas sin administración vinculada`}
                    </span>
                    <span className="rounded-[5px] border px-3 py-1 text-[13px] font-extrabold" style={{ borderColor: `${VERDE}73`, color: TINTA }}>
                      <span className="group-open:hidden">Ver todas</span>
                      <span className="hidden group-open:inline">Ver menos</span>
                    </span>
                  </summary>
                </details>
              ) : (
                d.ganadasSinAdministracion > 0 && (
                  <p className="border-t border-black/10 px-[18px] py-2.5 text-[12.5px] text-carbon/65">{d.ganadasSinAdministracion} opps ganadas sin administración vinculada</p>
                )
              )}
            </div>
          </div>
        )}
      </BloqueTrabajo>

      {d.porMes.length > 0 && (
        <BloqueTrabajo titulo="Firmado por mes" color="verde" nota="Cada mes, en verde, al lado del mismo mes un año antes, en gris: para ver si vamos por delante o por detrás.">
          <div className={`${tarjeta} px-5 pb-3.5 pt-5`}>
            <div className="grid h-[220px] items-end gap-2.5 border-b border-black/10" style={{ gridTemplateColumns: `repeat(${d.porMes.length}, minmax(0, 1fr))` }}>
              {d.porMes.map((m) => (
                <div key={m.mes} className="flex h-full items-end justify-center gap-[3px]">
                  <div className="w-[42%] rounded-t-[2px] bg-black/[0.16]" style={{ height: `${(m.importeAnterior / maxMes) * 100}%` }} title={`Un año antes: ${eur(m.importeAnterior)}`} />
                  <div className="relative w-[42%] rounded-t-[2px]" style={{ height: `${(m.importe / maxMes) * 100}%`, background: VERDE }} title={`${eur(m.importe)} · ${m.firmadas} hojas`}>
                    <span className="absolute bottom-full left-1/2 hidden -translate-x-1/2 whitespace-nowrap pb-[3px] text-[11px] font-extrabold tabular-nums sm:block" style={{ color: TINTA }}>
                      {Math.round(m.importe / 1000)}k
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-1.5 grid gap-2.5 text-center text-[12px] text-carbon/65" style={{ gridTemplateColumns: `repeat(${d.porMes.length}, minmax(0, 1fr))` }}>
              {d.porMes.map((m) => (
                <div key={m.mes} className="capitalize">
                  {MES.format(new Date(`${m.mes}-01T00:00:00Z`)).replace(".", "")}
                  <small className="block normal-case tabular-nums">{Math.round(m.importeAnterior / 1000)}k antes</small>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-4 text-[12.5px] text-carbon/65">
              <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] align-[-1px]" style={{ background: VERDE }} />Este periodo</span>
              <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] bg-black/[0.16] align-[-1px]" />Un año antes</span>
            </div>
          </div>
        </BloqueTrabajo>
      )}
    </PaginaTrabajo>
  );
}
