import Link from "next/link";
import type { Yo } from "../../lib/sesion";
import {
  ausenciasEntre,
  calendarioEntre,
  contratosVigentes,
  datosPersonales,
  funcionesSinSuplente,
  lunesDe,
  nombreCompleto,
  personas,
  saldos,
  solicitudesPendientes,
  sumarDias,
  vigenteEn,
  type Ausencia,
  type Persona,
} from "../../lib/rrhh";
import { resolverSolicitud } from "./acciones";
import { Copiar } from "./Copiar";
import { Ficha } from "./Ficha";
import { ChipTipo, Cuenta, diasTxt, EUR, NotaAcceso, Proximamente, QuienEstaFuera, Titulo, tramo } from "./Piezas";

// La vista de RRHH y direccion: lo que hay que resolver, quien esta fuera, los
// empleados con su ficha y las transferencias del mes (las hace RRHH). En la
// ficha, el salario bruto solo lo ve direccion.

const campo = "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-lima focus:ring-2 focus:ring-lima/30";

function Solicitud({ a, equipo, yo, quedanAntes, solapes, error }: {
  a: Ausencia;
  equipo: Persona[];
  yo: Yo;
  quedanAntes: number | null;
  solapes: string[];
  error: string | null;
}) {
  const p = equipo.find((x) => x.id === a.personaId);
  const nombre = p ? nombreCompleto(p) : "¿?";
  const funciones = p ? p.funciones.filter((f) => vigenteEn(f, a.desde)).map((f) => f.nombre).join(" · ") : "";
  const huecos = funcionesSinSuplente(a.personaId, a.desde, a.hasta, equipo);
  const propia = a.personaId === yo.id;

  return (
    <article id={`s-${a.id}`} className="flex scroll-mt-24 flex-col gap-2.5 rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-bold text-carbon">{nombre}</div>
          <div className="text-sm text-carbon/45">{funciones}</div>
        </div>
        <ChipTipo tipo={a.tipo} />
      </div>
      <div className="text-lg font-bold text-carbon">
        {tramo(a.desde, a.hasta)} <span className="text-sm font-normal text-carbon/55">· {diasTxt(a.dias)} laborables</span>
      </div>
      {a.tipo === "vacaciones" && quedanAntes != null && (
        <div className="text-sm text-carbon/65 tabular-nums">
          Le quedan <b className="text-carbon">{quedanAntes + (a.dias ?? 0)}</b> días; si se aprueba, <b className="text-carbon">{quedanAntes}</b>.
        </div>
      )}
      {a.tipo === "vacaciones" && quedanAntes == null && (
        <div className="text-sm text-carbon/50">Sus días de este año no están cargados: no se puede comprobar el saldo.</div>
      )}
      {a.notas && <div className="text-sm text-carbon/65">«{a.notas}»</div>}
      {solapes.length > 0 && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Coincide con {solapes.join("; ")}.</div>
      )}

      {propia ? (
        <p className="text-sm text-carbon/50">Es tuya: la resuelve otra persona de RRHH o dirección.</p>
      ) : (
        <>
          <form action={resolverSolicitud} className="grid gap-2.5">
            <input type="hidden" name="id" value={a.id} />
            {huecos.map((h) => (
              <label key={h.funcionId} className="grid gap-1.5 rounded-lg bg-ajeno-soft px-3 py-2.5 text-sm text-[#3d5f84]">
                <b>¿Quién cubre {h.funcion} esos días?</b>
                <select name={`cubre_${h.funcionId}`} required defaultValue="" className={campo}>
                  <option value="" disabled>Elige a alguien…</option>
                  {h.candidatos.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                  <option value="nadie">Nadie: lo suyo espera a la vuelta</option>
                </select>
                <span className="text-xs">
                  Solo {nombre.split(" ")[0]} tiene esta función. Quien elijas la tendrá del {tramo(a.desde, a.hasta)} y se le quitará sola al acabar.
                </span>
              </label>
            ))}
            {error === "cubre" && <p className="text-sm font-semibold text-alerta">Falta decir quién cubre.</p>}
            <div className="flex flex-wrap gap-2">
              <button type="submit" name="decision" value="aprobar" className="rounded-full bg-lima px-4 py-2 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white">
                Aprobar
              </button>
            </div>
          </form>
          <details className="group" open={error === "motivo"}>
            <summary className="cursor-pointer list-none text-sm font-semibold text-carbon/55 hover:text-carbon [&::-webkit-details-marker]:hidden">
              Rechazar…
            </summary>
            <form action={resolverSolicitud} className="mt-2 grid gap-2">
              <input type="hidden" name="id" value={a.id} />
              <input type="hidden" name="decision" value="rechazar" />
              <input name="motivo" required placeholder="El motivo: se lo verá quien la pidió" className={campo} />
              {error === "motivo" && <p className="text-sm font-semibold text-alerta">Pon el motivo para rechazarla.</p>}
              <div>
                <button type="submit" className="rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-carbon transition hover:border-alerta hover:text-alerta">
                  Rechazar
                </button>
              </div>
            </form>
          </details>
        </>
      )}
    </article>
  );
}

export async function Gestion({ yo, hoy, verEx, fichaId, sId, error }: {
  yo: Yo;
  hoy: string;
  verEx: boolean;
  fichaId: string | null;
  sId: string | null;
  error: string | null;
}) {
  const anio = Number(hoy.slice(0, 4));
  const desde = lunesDe(hoy);
  const hasta = sumarDias(desde, 41);
  const [activos, antiguos, pendientes, ausencias, cal] = await Promise.all([
    personas(true),
    personas(false),
    solicitudesPendientes(),
    ausenciasEntre(desde, hasta),
    calendarioEntre(desde, hasta),
  ]);
  const ids = activos.map((p) => p.id);
  const direccion = yo.veTodo;
  const [saldoM, contratoM, datosM] = await Promise.all([saldos(anio, ids), contratosVigentes(ids, hoy), datosPersonales(ids)]);

  // Saldo de cada solicitud en el año que le toca (casi siempre, este).
  const otrosAnios = [...new Set(pendientes.map((a) => Number(a.desde.slice(0, 4))).filter((y) => y !== anio))];
  const saldosOtros = new Map<number, Awaited<ReturnType<typeof saldos>>>();
  for (const y of otrosAnios) saldosOtros.set(y, await saldos(y, [...new Set(pendientes.map((a) => a.personaId))]));
  const saldoPara = (a: Ausencia) => {
    const y = Number(a.desde.slice(0, 4));
    const s = (y === anio ? saldoM : saldosOtros.get(y))?.get(a.personaId);
    return s?.cargado ? s.quedan : null;
  };

  // Coincidencias: otra persona con alguna funcion en comun, fuera algun dia del tramo.
  const vivas = await ausenciasEntre(
    pendientes.reduce((m, a) => (a.desde < m ? a.desde : m), hoy),
    pendientes.reduce((m, a) => (a.hasta > m ? a.hasta : m), hoy),
  );
  const solapesDe = (a: Ausencia) => {
    const yoP = activos.find((p) => p.id === a.personaId);
    if (!yoP) return [];
    const mias = new Set(yoP.funciones.filter((f) => vigenteEn(f, a.desde)).map((f) => f.funcionId));
    return vivas
      .filter((b) => b.id !== a.id && b.personaId !== a.personaId && b.desde <= a.hasta && b.hasta >= a.desde)
      .map((b) => ({ b, p: activos.find((x) => x.id === b.personaId) }))
      .filter(({ p }) => p && p.funciones.some((f) => mias.has(f.funcionId) && vigenteEn(f, a.desde)))
      .map(({ b, p }) => `${nombreCompleto(p!)} (${tramo(b.desde, b.hasta)}${b.estado === "solicitada" ? ", pedido" : ""})`);
  };

  const lista = verEx ? antiguos : activos;
  const ficha = fichaId ? [...activos, ...antiguos].find((p) => p.id === fichaId) ?? null : null;
  const base = verEx ? "/rrhh?ex=1" : "/rrhh";
  const conFicha = (id: string) => `${base}${base.includes("?") ? "&" : "?"}p=${id}#ficha`;

  const transferencias = activos
    .map((p) => ({ p, iban: datosM.get(p.id)?.iban ?? null, neto: datosM.get(p.id)?.netoMensual ?? null }))
    .filter((t) => t.iban || t.neto != null);
  const totalNeto = transferencias.reduce((s, t) => s + (t.neto ?? 0), 0);

  return (
    <>
      <NotaAcceso>
        <b>Quién ve esta vista:</b> la función RRHH (hoy, Alexandra) y dirección (Mónica y Daniel). Cada empleado ve solo su
        espacio. El salario bruto, solo dirección.
      </NotaAcceso>

      {/* ---------- por resolver ---------- */}
      <section className="mt-9">
        <Titulo extra="Aprueba cualquiera de RRHH o dirección, salvo lo suyo.">
          Por resolver <Cuenta n={pendientes.length} />
        </Titulo>
        {pendientes.length === 0 ? (
          <p className="rounded-2xl border border-black/5 bg-white px-5 py-6 text-base text-carbon/50 shadow-sm">
            No hay nada pendiente. Las solicitudes que se hagan desde la app aparecerán aquí.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pendientes.map((a) => (
              <Solicitud key={a.id} a={a} equipo={activos} yo={yo} quedanAntes={saldoPara(a)} solapes={solapesDe(a)} error={sId === a.id ? error : null} />
            ))}
          </div>
        )}
      </section>

      {/* ---------- quién está fuera ---------- */}
      <section className="mt-10">
        <Titulo extra="Próximas seis semanas · días laborables">Quién está fuera</Titulo>
        <QuienEstaFuera desde={desde} hasta={hasta} hoy={hoy} equipo={activos} ausencias={ausencias} calendario={cal} />
        {cal.length === 0 && (
          <p className="mt-2 text-sm text-carbon/50">Aún no hay festivos ni cierres cargados: el calendario de la empresa llega en la tercera entrega.</p>
        )}
      </section>

      {/* ---------- empleados ---------- */}
      <section className="mt-10">
        <Titulo
          extra={
            <span className="inline-flex gap-1">
              <Link href="/rrhh" className={`rounded-full border px-3 py-1 text-sm ${!verEx ? "border-carbon bg-carbon text-white" : "border-black/10 bg-white text-carbon/60 hover:border-lima"}`}>
                En activo · {activos.length}
              </Link>
              <Link href="/rrhh?ex=1" className={`rounded-full border px-3 py-1 text-sm ${verEx ? "border-carbon bg-carbon text-white" : "border-black/10 bg-white text-carbon/60 hover:border-lima"}`}>
                Ex-empleados · {antiguos.length}
              </Link>
            </span>
          }
        >
          Empleados
        </Titulo>
        <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-[11px] font-bold uppercase tracking-wider text-carbon/40">
                <th className="px-4 pb-2 pt-3">Persona</th>
                <th className="px-4 pb-2 pt-3">Contrato</th>
                <th className="px-4 pb-2 pt-3">Vacaciones {anio}</th>
                <th className="px-4 pb-2 pt-3">Le falta</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => {
                const s = saldoM.get(p.id);
                const c = contratoM.get(p.id);
                const d = datosM.get(p.id);
                const faltan = verEx ? [] : [!d?.dni && "DNI", !d?.iban && "cuenta", !c && "contrato", !s?.cargado && "días"].filter(Boolean) as string[];
                const fns = p.funciones.filter((f) => vigenteEn(f, hoy)).map((f) => f.nombre);
                const ultima = p.funciones.filter((f) => f.hasta).sort((a, b) => (b.hasta! > a.hasta! ? 1 : -1))[0];
                return (
                  <tr key={p.id} className={`border-b border-black/[0.04] ${fichaId === p.id ? "bg-lima-soft" : "hover:bg-hueso/60"}`}>
                    <td className="px-4 py-2.5">
                      <Link href={conFicha(p.id)} className="block">
                        <b className="font-semibold text-carbon">{nombreCompleto(p)}</b>
                        <span className="block text-xs text-carbon/45">
                          {verEx ? (ultima ? `${ultima.nombre} · hasta ${tramo(ultima.hasta!, ultima.hasta!)} ${ultima.hasta!.slice(0, 4)}` : "—") : fns.join(" · ") || "—"}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-carbon/70">{c ? [c.tipo, c.horasSemana != null ? `${c.horasSemana} h` : null].filter(Boolean).join(" · ") || "—" : <span className="text-carbon/35">—</span>}</td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {s?.cargado ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-block h-1.5 w-16 overflow-hidden rounded-full bg-black/5">
                            <i className="block h-full bg-lima" style={{ width: `${s.total ? Math.max(0, (s.quedan / s.total) * 100) : 0}%` }} />
                          </span>
                          quedan {s.quedan}
                        </span>
                      ) : (
                        <span className="text-carbon/35">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {verEx ? (
                        <span className="text-xs text-carbon/45">Su ficha se conserva</span>
                      ) : faltan.length === 0 ? (
                        <span className="text-xs font-semibold text-lima-dark">Nada</span>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {faltan.map((f) => (
                            <span key={f} className="rounded-md bg-[#f6e9e8] px-1.5 py-0.5 text-xs font-semibold text-alerta">{f}</span>
                          ))}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {ficha && <Ficha persona={ficha} hoy={hoy} direccion={direccion} volverA={base} />}
      </section>

      {/* ---------- transferencias (las hace RRHH) ---------- */}
        <section className="mt-10">
          <Titulo extra="Con el neto de un mes normal">Transferencias de las nóminas</Titulo>
          <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
            {transferencias.length === 0 ? (
              <p className="px-5 py-6 text-base text-carbon/50">
                Aún no hay cuentas ni netos en las fichas. Se ponen en la ficha de cada uno, en <i>Datos personales</i>.
              </p>
            ) : (
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-black/5 text-left text-[11px] font-bold uppercase tracking-wider text-carbon/40">
                    <th className="px-4 pb-2 pt-3">Persona</th>
                    <th className="px-4 pb-2 pt-3">Cuenta</th>
                    <th className="px-4 pb-2 pt-3 text-right">Neto</th>
                  </tr>
                </thead>
                <tbody>
                  {transferencias.map(({ p, iban, neto }) => (
                    <tr key={p.id} className="border-b border-black/[0.04]">
                      <td className="px-4 py-2.5 font-semibold text-carbon">{nombreCompleto(p)}</td>
                      <td className="px-4 py-2.5 tabular-nums">
                        {iban ? (
                          <span className="inline-flex flex-wrap items-center gap-2">
                            {iban.replace(/(.{4})/g, "$1 ").trim()} <Copiar valor={iban} etiqueta="la cuenta" />
                          </span>
                        ) : (
                          <span className="rounded-md bg-[#f6e9e8] px-1.5 py-0.5 text-xs font-semibold text-alerta">falta la cuenta</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {neto != null ? (
                          <span className="inline-flex items-center gap-2">
                            {EUR.format(neto)} <Copiar valor={neto.toFixed(2).replace(".", ",")} etiqueta="el importe" />
                          </span>
                        ) : (
                          <span className="rounded-md bg-[#f6e9e8] px-1.5 py-0.5 text-xs font-semibold text-alerta">falta el neto</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="px-4 py-3 font-bold" colSpan={2}>Total</td>
                    <td className="px-4 py-3 text-right text-base font-bold tabular-nums">{EUR.format(totalNeto)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
          <p className="mt-2 text-sm text-carbon/50">
            Cuando lleguen las nóminas a la app, el neto de cada mes saldrá de su propia nómina (pagas extra y bajas incluidas), y
            se podrá sacar el fichero de transferencias para CaixaBankNow.
          </p>
        </section>

      {/* ---------- lo que llega en las siguientes entregas ---------- */}
      <section className="mt-10 grid gap-3 md:grid-cols-2">
        <Proximamente titulo="Nóminas del mes" texto="Subes el PDF de la gestoría y la app lo reparte a cada uno. Sin iLovePDF, sin script, sin correos." />
        <Proximamente titulo="Calendario de la empresa" texto="Festivos y cierres de cada año, que descuentan solos al pedir días." />
      </section>
    </>
  );
}
