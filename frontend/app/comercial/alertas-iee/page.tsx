import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { puedeEntrar, quienSoy } from "../../../lib/sesion";
import {
  agregadoPorMes,
  carteraPorMunicipio,
  comercialesActivos,
  diasParaAbrirOportunidad,
  grado,
  municipioLimpio,
  diaEnMadrid,
  pendientesPorDia,
  porQue,
  repartidas,
} from "../../../lib/alertasIEE";
import { buzonListo } from "../../../lib/correo";
import { ListaPendientes, type DiaPendiente } from "./ListaPendientes";
import { VolverAlMonton } from "./Piezas";

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
const enCastellano = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");

export default async function AlertasIEE({
  searchParams,
}: {
  searchParams: Promise<{ comercial?: string; nuestras?: string; descartadas?: string; municipio?: string; vista?: string; conopp?: string }>;
}) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/alertas-iee");
  if (!puedeEntrar(yo, "comercial", "supervisar")) redirect("/menu");

  const { comercial: filtro, nuestras, descartadas, municipio: municipioPedido, vista, conopp } = await searchParams;
  // DOS VISTAS (Monica, 10-oct-2026): por defecto, lo que hay POR HACER; lo ya
  // repartido, en su propia vista. "Se ve lo que hay por hacer, no todo mezclado".
  const verAsignadas = vista === "asignadas";
  const verConOpp = conopp === "1";
  const verNuestras = nuestras === "1";
  const verDescartadas = descartadas === "1";

  const [todos, comerciales, lista, meses, plazo, cartera] = await Promise.all([
    pendientesPorDia(true),
    comercialesActivos(),
    repartidas(filtro),
    agregadoPorMes(),
    diasParaAbrirOportunidad(),
    carteraPorMunicipio(),
  ]);

  // LO JUSTO PARA PINTAR CADA FILA (10-oct-2026): la lista se filtra en el
  // navegador, asi que viaja entera, pero sin la nota del IEE en bruto.
  const diasLigeros: DiaPendiente[] = todos.map((d) => ({
    dia: d.dia,
    alertas: d.alertas.map((a) => {
      const g = grado(a)!;
      return {
        codigo: a.codigo,
        direccion: a.direccion,
        municipio: municipioLimpio(a.municipio),
        municipioTexto: a.municipio ? a.municipio.replace(/\s*\(MADRID\)\s*$/i, "").trim() : null,
        nuestra: a.nuestra,
        estado: a.estado,
        motivo: porQue[g],
        buena: g <= 2,
        descartadaPor: a.descartadaPor,
        motivoDescarte: a.motivoDescarte,
      };
    }),
  }));
  // Solo los municipios que salen en la lista: el resto no hace falta mandarlo.
  const enLaLista = new Set(diasLigeros.flatMap((d) => d.alertas.map((a) => a.municipio)).filter((m): m is string => !!m));
  const carteraQueHace = Object.fromEntries(Object.entries(cartera).filter(([m]) => enLaLista.has(m)));

  const conOpp = lista.filter((a) => a.oportunidadId);
  const sinOpp = lista.filter((a) => !a.oportunidadId);
  const vistaAsignadas = (comercial: string | undefined = filtro, conO: boolean = verConOpp) => {
    const q = new URLSearchParams({ vista: "asignadas" });
    if (comercial) q.set("comercial", comercial);
    if (conO) q.set("conopp", "1");
    return `/comercial/alertas-iee?${q}`;
  };
  const BOTON_VISTA =
    "rounded-full border border-[#104269] bg-white px-3.5 py-1.5 text-[12px] font-bold text-[#104269] transition hover:bg-[#104269] hover:text-white";

  const hoy = diaEnMadrid();
  // Las que ya son nuestras no cuentan como trabajo pendiente: no hay nada que
  // repartir, ya estan dentro.
  const sinAsignar = todos
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

        <div className="mt-4 flex flex-wrap gap-2">
          {verAsignadas ? (
            <Link href="/comercial/alertas-iee" className={BOTON_VISTA}>
              ← Pendientes de asignar{sinAsignar > 0 ? ` (${sinAsignar})` : ""}
            </Link>
          ) : (
            <Link href={vistaAsignadas(undefined, false)} className={BOTON_VISTA}>
              Ver qué pasó con las ya asignadas ({lista.length}) →
            </Link>
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
        {!verAsignadas && (
          <ListaPendientes
            dias={diasLigeros}
            comerciales={comerciales}
            cartera={carteraQueHace}
            hoy={hoy}
            inicial={{ municipio: municipioPedido ?? null, nuestras: verNuestras, descartadas: verDescartadas }}
          />
        )}

        {/* ================== QUE PASO CON LAS YA ASIGNADAS ==================
            (Monica, 10-oct-2026) En dos columnas: a la izquierda, 1/3, la vision
            general mes a mes, "a mano arriba a la izquierda"; a la derecha, 2/3,
            las asignadas que aun no tienen oportunidad. */}
        {verAsignadas && (
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-1">
        {/* ======================= EL RECUENTO POR MES ======================= */}
        <section>
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
                    <th className="px-2.5 py-1.5 font-bold">Mes</th>
                    <th className="px-2.5 py-1.5 font-bold">Comercial</th>
                    <th className="px-2.5 py-1.5 font-bold">Pasadas</th>
                    <th className="px-2.5 py-1.5 font-bold">Creadas</th>
                    <th className="px-2.5 py-1.5 font-bold">De cada diez</th>
                  </tr>
                </thead>
                <tbody>
                  {meses.map((m) => (
                    <tr key={m.mes + m.comercialId} className="border-b border-black/5 last:border-b-0">
                      <td className="px-2.5 py-1.5 tabular-nums text-carbon/70">{m.mes}</td>
                      <td className="px-2.5 py-1.5 font-semibold">{m.comercial}</td>
                      <td className="px-2.5 py-1.5 tabular-nums">{m.pasadas}</td>
                      <td className="px-2.5 py-1.5 tabular-nums font-bold">{m.creadas}</td>
                      <td className="px-2.5 py-1.5 tabular-nums text-carbon/70">
                        {m.pasadas ? (Math.round((m.creadas / m.pasadas) * 100) / 10).toFixed(1) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
            </div>
            <div className="min-w-0 lg:col-span-2">
        {/* ======================= QUE SE HIZO CON ELLAS ======================= */}
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className={ROTULO}>Asignadas que aún no tienen oportunidad · {sinOpp.length}</h2>
              <p className="mt-1 text-[13px] text-carbon/60">
                Se comprueba solo: si aparece una oportunidad con esa misma finca, se engancha sin
                que nadie marque nada. Pasados <b className="text-carbon/80">{plazo} días</b> sin
                oportunidad, se pregunta qué ha pasado.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Link
                href={vistaAsignadas(undefined)}
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
                  href={vistaAsignadas(c.id)}
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
            {sinOpp.length === 0 ? (
              <p className="p-4 text-[13px] text-carbon/45">
                {lista.length === 0 ? "Todavía no se ha pasado ninguna" : "Todas las asignadas tienen ya oportunidad"}{filtro ? " de este comercial" : ""}.
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
                  {sinOpp.map((a) => {
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
                        {/* DESHACER (Monica, 10-oct-2026): "asigne por error una a Alvaro
                            y quiero enviarsela a Daniel". La devuelve a pendientes, y
                            desde alli se asigna a quien era. */}
                        <td className="px-4 py-2.5">
                          <span className="flex flex-wrap items-center gap-x-2">
                            <b>{a.comercial ?? "—"}</b>
                            <VolverAlMonton codigo={a.codigo} />
                          </span>
                        </td>
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
        
          {/* LAS QUE YA TIENEN OPORTUNIDAD (Monica, 10-oct-2026): "ya se pueden
              quitar de la cabeza". Breve, y a demanda: con el volumen de dentro
              de tres meses no pueden salir por defecto. */}
          {conOpp.length > 0 && (
            <div className="mt-4">
              <Link href={vistaAsignadas(filtro, !verConOpp)} scroll={false} className="text-[12px] font-semibold text-carbon/55 underline hover:text-carbon">
                {verConOpp ? "Ocultar las que ya tienen oportunidad" : `Ver las que ya tienen oportunidad (${conOpp.length})`}
              </Link>
              {verConOpp && (
                <ul className={CAJA + " mt-2 divide-y divide-black/5 overflow-hidden text-[13px]"}>
                  {conOpp.map((a) => (
                    <li key={a.codigo} className="flex flex-wrap items-baseline gap-x-3 px-4 py-2">
                      <span className="min-w-0 flex-1">
                        <b className="text-carbon">{a.direccion ?? "Sin dirección"}</b>
                        {a.municipio && <span className="text-carbon/50"> · {a.municipio}</span>}
                      </span>
                      <span className="font-semibold text-carbon/70">{a.comercial ?? "—"}</span>
                      <Link href={`/comercial/oportunidades/${a.oportunidadId}`} className="font-bold text-lima-dark hover:underline">
                        Ver la oportunidad →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
