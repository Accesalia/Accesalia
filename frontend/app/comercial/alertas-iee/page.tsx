import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { puedeEntrar, quienSoy } from "../../../lib/sesion";
import {
  agregadoPorMes,
  comercialesActivos,
  diasParaAbrirOportunidad,
  grado,
  porQue,
  radarPorDias,
  repartidas,
} from "../../../lib/alertasIEE";
import { buzonListo } from "../../../lib/correo";
import { Asignador, VolverAlMonton } from "./Piezas";

export const dynamic = "force-dynamic";

// ============================================================================
// EL RADAR DE IEE (Monica, 29-sep-2026; el criterio, el 1-oct-2026)
//
// EMPEZO SIENDO "el radar de IEE desfavorables" y dejo de serlo cuando ella vio
// por que ese filon llega tarde: "casi ninguna comunidad presenta una IEE
// desfavorable si no tiene ya resuelto como hacerla, porque saben que les
// obligaran". El bueno es el contrario, y la regla entera esta en `grado()` de
// lib/alertasIEE.ts. Aqui solo se pinta en ese orden.
//
// Lo que pidio, literal:
//
//   "Sin mas complejidad: una lista diaria de direcciones desfavorables o de NO
//    hay nada. Con link al dato de la IEE que nos hemos descargado para verlo."
//
// Asi que la pantalla es una sucesion de dias, y LOS DIAS VACIOS TAMBIEN SALEN:
// "y si no ha habido, que lo diga tambien". Un dia en blanco y un dia que nadie
// miro se parecen demasiado como para dejarlos iguales.
//
// Debajo, lo que de verdad le importa: "regalarle un cliente y que lo ignore es
// algo que quiero saber". De ahi el reparto, la columna de si salio oportunidad
// y los agregados por mes.
//
// QUIEN ENTRA: quien supervisa el area comercial -hoy Alejandra- y direccion
// -Monica y Daniel-. Va por nivel y no por nombre, asi que Alvaro, que es
// comercial pero no supervisa, no entra a repartir.
// ============================================================================

const CAJA = "rounded-2xl border border-black/5 bg-white shadow-sm";
const ROTULO = "text-[11px] font-bold uppercase tracking-wider text-carbon/45";

const DIA_LARGO = new Intl.DateTimeFormat("es-ES", {
  weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid",
});

function comoSeDice(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  return DIA_LARGO.format(new Date(Date.UTC(a, m - 1, d, 12)));
}

const enCastellano = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");

export default async function AlertasIEE({
  searchParams,
}: {
  searchParams: Promise<{ comercial?: string }>;
}) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/alertas-iee");
  if (!puedeEntrar(yo, "comercial", "supervisar")) redirect("/menu");

  const { comercial: filtro } = await searchParams;

  const [dias, comerciales, lista, meses, plazo] = await Promise.all([
    radarPorDias(14),
    comercialesActivos(),
    repartidas(filtro),
    agregadoPorMes(),
    diasParaAbrirOportunidad(),
  ]);

  const hoy = dias[0]?.dia;
  // Las que ya son nuestras no cuentan como trabajo pendiente: no hay nada que
  // repartir, ya estan dentro.
  const sinAsignar = dias
    .flatMap((d) => d.alertas)
    .filter((a) => a.estado === "nueva" && a.nuestra?.tipo !== "misma_finca").length;
  const sinCorreo = comerciales.filter((c) => !c.correo).map((c) => c.nombre);

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      {/* MARGENES A LOS LADOS (Monica): "al ser una tabla simple, le damos
          margenes a los lados para que no se estire tanto". Cuatro columnas
          repartidas en 1.392 px dejan la fila medio vacia y se lee peor. */}
      <main className="mx-auto w-full max-w-[1120px] px-6 pb-16 pt-5">
        <Link href="/comercial" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
          ← Área comercial
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className={ROTULO}>Canal de captación</div>
            <h1 className="mt-1 text-[25px] font-bold leading-tight text-carbon">
              Radar de IEE
            </h1>
            <p className="mt-1.5 max-w-[70ch] text-[13px] text-carbon/60">
              Cada mañana se mira el registro de la Comunidad de Madrid y se recoge lo que se ha
              inscrito de nuevo. Arriba de cada día va lo mejor:{" "}
              <b className="text-carbon/80">el que no cumple accesibilidad y no puede pagarla solo</b>,
              porque necesita la subvención y porque, al estar su informe favorable, nadie le está
              mirando. Las desfavorables van al final: ésas ya llegan con arquitecto puesto.
            </p>
          </div>
          {sinAsignar > 0 && (
            <div className="rounded-[10px] border border-amber-300 bg-amber-50 px-4 py-2.5">
              <div className="text-[22px] font-bold leading-none text-amber-800">{sinAsignar}</div>
              <div className="mt-1 text-[12px] font-semibold text-amber-800">sin asignar</div>
            </div>
          )}
        </div>

        {/* Lo que no funciona se dice antes de que alguien lo descubra fallando. */}
        {(!buzonListo("comercial") || sinCorreo.length > 0) && (
          <div className="mt-4 rounded-[10px] border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
            {!buzonListo("comercial") && (
              <p>
                <b>El buzón del área comercial todavía no puede mandar correo.</b> Se puede asignar
                y queda guardado, pero al comercial no le llegará el aviso hasta que esté puesta la
                clave de <code>comercial.accesalia@gmail.com</code>.
              </p>
            )}
            {sinCorreo.length > 0 && (
              <p className={buzonListo("comercial") ? "" : "mt-1.5"}>
                Sin correo en su ficha de equipo, así que no se les puede escribir:{" "}
                <b>{sinCorreo.join(", ")}</b>.
              </p>
            )}
          </div>
        )}

        {/* ======================= EL PARTE DIARIO =======================
            CUATRO COLUMNAS Y NADA MAS (Monica): "son 4 columnas: direccion,
            link a la IEE, asignar comercial, y opp abierta si/no. Y alerta
            marcando NO en rojo con: hace 11 dias que se le paso."
            "Sin mas complejidad, ok? Es una cosa facil de usar."

            Un listado casi un excel, con una fila de cabecera por dia. Del
            edificio no se pone ni año ni energetica ni municipio: para eso esta
            el enlace. Aqui solo hace falta decidir a quien se le pasa y ver
            quien no ha hecho nada. */}
        <section className="mt-6">
          <h2 className={ROTULO + " mb-2"}>El parte de cada día</h2>

          <div className={CAJA + " overflow-hidden"}>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-black/10 text-left text-[11px] uppercase tracking-wider text-carbon/45">
                  <th className="px-4 py-2 font-bold">Dirección</th>
                  <th className="px-3 py-2 font-bold">Por qué está aquí</th>
                  <th className="px-3 py-2 font-bold">El informe</th>
                  <th className="px-3 py-2 font-bold">Comercial</th>
                  <th className="px-4 py-2 font-bold">¿Oportunidad abierta?</th>
                </tr>
              </thead>

              {dias.map((d) => (
                <tbody key={d.dia}>
                  <tr className="border-y border-black/5 bg-hueso/60">
                    <td colSpan={5} className="px-4 py-1.5 text-[12px] font-bold text-carbon/70">
                      {d.dia === hoy ? "Hoy · " : ""}
                      {comoSeDice(d.dia)}
                    </td>
                  </tr>

                  {d.alertas.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-1.5 text-[12px] italic text-carbon/35">
                        — {d.dia === hoy ? "hoy" : "ese día"} no había nada —
                      </td>
                    </tr>
                  ) : (
                    d.alertas.map((a) => {
                      const tarde =
                        !a.oportunidadId &&
                        a.asignadaEn &&
                        Math.floor((Date.now() - new Date(a.asignadaEn).getTime()) / 864e5) >= plazo;
                      const dias = a.asignadaEn
                        ? Math.floor((Date.now() - new Date(a.asignadaEn).getTime()) / 864e5)
                        : 0;
                      return (
                        <tr key={a.codigo} className="border-b border-black/5">
                          <td className="px-4 py-2">
                            <div className="font-bold text-carbon">
                              {a.direccion ?? "Sin dirección"}
                            </div>
                            {/* Las dos respuestas del cotejo, y dicen cosas
                                opuestas: la misma finca es un cliente que ya
                                tenemos; la misma calle es el mejor argumento
                                que hay para llamar. */}
                            {a.nuestra && (
                              <div
                                className={
                                  "mt-0.5 text-[11px] " +
                                  (a.nuestra.tipo === "misma_finca"
                                    ? "text-carbon/45"
                                    : "text-lima-dark")
                                }
                              >
                                {a.nuestra.tipo === "misma_finca"
                                  ? `Ya la tenemos: ${a.nuestra.comunidad}`
                                  : `Misma calle que ${a.nuestra.comunidad}`}
                              </div>
                            )}
                          </td>
                          {/* POR QUE ESTA AQUI. La tabla tenia 4 columnas por
                              encargo suyo -"sin mas complejidad"-, y esta quinta
                              entra porque ella lo abrio al cambiar el criterio:
                              "el criterio cambia, porque los datos que se
                              muestran tambien. Demos la info que necesita".
                              Y hace falta: con dos motivos distintos, quien
                              reparte no puede saber cual es cada uno sin abrir
                              el informe. Las dos primeras en negro, que son las
                              buenas; las demas en gris. */}
                          <td className="px-3 py-2">
                            <span
                              className={
                                "text-[12px] " +
                                (grado(a)! <= 2 ? "font-semibold text-carbon/80" : "text-carbon/45")
                              }
                            >
                              {porQue[grado(a)!]}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <Link
                              href={`/comercial/alertas-iee/${a.codigo}`}
                              className="font-semibold text-[#2B6CB0] hover:underline"
                            >
                              Ver el IEE
                            </Link>
                          </td>
                          <td className="px-3 py-2">
                            {/* SI YA ES NUESTRA, NO SE ASIGNA (Monica): "que las
                                que salgan en la lista a asignar no sean de las
                                de nuestra bd". No se le regala a un comercial
                                un cliente que ya tenemos. Pero NO se esconde:
                                una fila que desaparece no se puede repescar, y
                                ademas asi se ve que el cotejo funciona. */}
                            {a.nuestra?.tipo === "misma_finca" && !a.asignadaA ? (
                              <span className="text-[12px] text-carbon/45">
                                Ya es nuestra
                              </span>
                            ) : a.asignadaA ? (
                              <span className="flex items-center gap-2 text-[12px] text-carbon/60">
                                <b className="text-[13px] text-carbon">{a.comercial}</b>
                                {a.asignadaEmailFallo ? (
                                  <span className="text-amber-700">· el correo no salió</span>
                                ) : null}
                                <VolverAlMonton codigo={a.codigo} />
                              </span>
                            ) : (
                              <Asignador codigo={a.codigo} comerciales={comerciales} />
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {a.oportunidadId ? (
                              // Resuelto: check verde y punto. PENDIENTE (v2, suyo):
                              // "deberiamos dar una opcion de 'llame y no quieren
                              // verme' o algo asi" -cerrar sin oportunidad, pero
                              // habiendolo trabajado, que no es lo mismo que ignorarlo-.
                              <Link
                                href={`/comercial/oportunidades/${a.oportunidadId}`}
                                className="inline-flex items-center gap-1.5 font-bold text-lima-dark hover:underline"
                              >
                                <span aria-hidden className="text-[15px] leading-none">✓</span> Sí
                              </Link>
                            ) : !a.asignadaA ? (
                              <span className="text-carbon/35">Sin asignar</span>
                            ) : tarde ? (
                              <span className="font-bold text-[#B91C1C]">
                                No · hace {dias} {dias === 1 ? "día" : "días"} que se le pasó
                              </span>
                            ) : (
                              <span className="text-carbon/45">Todavía no</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              ))}
            </table>
          </div>
        </section>

        {/* ======================= QUE SE HIZO CON ELLAS ======================= */}
        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className={ROTULO}>Qué se hizo con las que se pasaron</h2>
              <p className="mt-1 text-[13px] text-carbon/60">
                Se comprueba solo: si aparece una oportunidad con esa misma finca, se engancha sin
                que nadie marque nada. Pasados <b className="text-carbon/80">{plazo} días</b> sin
                oportunidad, se pregunta qué ha pasado.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Link
                href="/comercial/alertas-iee"
                className={
                  "rounded-full border px-3 py-1 text-[12px] font-semibold transition " +
                  (!filtro
                    ? "border-[#104269] bg-[#104269] text-white"
                    : "border-black/10 text-carbon/60 hover:text-carbon")
                }
              >
                Todos
              </Link>
              {comerciales.map((c) => (
                <Link
                  key={c.id}
                  href={`/comercial/alertas-iee?comercial=${c.id}`}
                  className={
                    "rounded-full border px-3 py-1 text-[12px] font-semibold transition " +
                    (filtro === c.id
                      ? "border-[#104269] bg-[#104269] text-white"
                      : "border-black/10 text-carbon/60 hover:text-carbon")
                  }
                >
                  {c.nombre}
                </Link>
              ))}
            </div>
          </div>

          <div className={CAJA + " mt-3 overflow-hidden"}>
            {lista.length === 0 ? (
              <p className="p-4 text-[13px] text-carbon/45">
                Todavía no se ha pasado ninguna{filtro ? " a este comercial" : ""}.
              </p>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-black/10 text-left text-[11px] uppercase tracking-wider text-carbon/45">
                    <th className="px-4 py-2.5 font-bold">Dirección</th>
                    <th className="px-4 py-2.5 font-bold">Comercial</th>
                    <th className="px-4 py-2.5 font-bold">Se le pasó</th>
                    <th className="px-4 py-2.5 font-bold">Días</th>
                    <th className="px-4 py-2.5 font-bold">¿Se creó oportunidad?</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((a) => {
                    const tarde = !a.oportunidadId && a.diasDesdeAsignacion >= plazo;
                    return (
                      <tr key={a.codigo} className="border-b border-black/5 last:border-b-0">
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/comercial/alertas-iee/${a.codigo}`}
                            className="font-semibold text-[#2B6CB0] hover:underline"
                          >
                            {a.direccion ?? "Sin dirección"}
                          </Link>
                          {a.municipio && <span className="text-carbon/50"> · {a.municipio}</span>}
                        </td>
                        <td className="px-4 py-2.5 font-semibold">{a.comercial ?? "—"}</td>
                        <td className="px-4 py-2.5 tabular-nums text-carbon/70">
                          {a.asignadaEn ? enCastellano(a.asignadaEn.slice(0, 10)) : "—"}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-carbon/70">
                          {a.diasDesdeAsignacion}
                        </td>
                        <td className="px-4 py-2.5">
                          {a.oportunidadId ? (
                            <Link
                              href={`/comercial/oportunidades/${a.oportunidadId}`}
                              className="font-bold text-lima-dark hover:underline"
                            >
                              Sí
                            </Link>
                          ) : tarde ? (
                            <span className="font-bold text-amber-700">
                              No · van {a.diasDesdeAsignacion} días
                            </span>
                          ) : (
                            <span className="text-carbon/45">Todavía no</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* ======================= EL RECUENTO POR MES ======================= */}
        <section className="mt-8">
          <h2 className={ROTULO}>Pasadas y creadas, mes a mes</h2>
          <p className="mt-1 max-w-[70ch] text-[13px] text-carbon/60">
            Por meses cerrados, para que dé tiempo a ir a verlos. Se cuenta por el mes en que se le
            pasó, no por el mes en que abrió la oportunidad: lo que se mide es qué hizo con lo que
            se le dio.
          </p>

          <div className={CAJA + " mt-3 overflow-hidden"}>
            {meses.length === 0 ? (
              <p className="p-4 text-[13px] text-carbon/45">Todavía no hay nada que contar.</p>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-black/10 text-left text-[11px] uppercase tracking-wider text-carbon/45">
                    <th className="px-4 py-2.5 font-bold">Mes</th>
                    <th className="px-4 py-2.5 font-bold">Comercial</th>
                    <th className="px-4 py-2.5 font-bold">Pasadas</th>
                    <th className="px-4 py-2.5 font-bold">Creadas</th>
                    <th className="px-4 py-2.5 font-bold">De cada diez</th>
                  </tr>
                </thead>
                <tbody>
                  {meses.map((m) => (
                    <tr key={m.mes + m.comercialId} className="border-b border-black/5 last:border-b-0">
                      <td className="px-4 py-2.5 tabular-nums text-carbon/70">{m.mes}</td>
                      <td className="px-4 py-2.5 font-semibold">{m.comercial}</td>
                      <td className="px-4 py-2.5 tabular-nums">{m.pasadas}</td>
                      <td className="px-4 py-2.5 tabular-nums font-bold">{m.creadas}</td>
                      <td className="px-4 py-2.5 tabular-nums text-carbon/70">
                        {m.pasadas ? (Math.round((m.creadas / m.pasadas) * 100) / 10).toFixed(1) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
