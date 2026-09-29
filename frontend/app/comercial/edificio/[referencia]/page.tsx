import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { ascensorDe, informeEdificio } from "../../../../lib/informeEdificio";
import { marcarAscensor } from "./acciones";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// EL EDIFICIO, EN TRES VISTAS (Monica, 29-sep-2026).
//
// Todo lo que se sabe de un edificio sin llamar a nadie. La escena que lo
// explica, contada por ella: un comercial con el portatil en el despacho de un
// administrador le dice "dime una direccion tuya y te digo como esta". La pone,
// sale la ficha, el administrador flipa y le da otra, y otra. Y TODAS SE
// GUARDAN, asi que tres semanas despues el comercial puede llamar y decir "de
// aquella que me diste, ¿les comentaste lo de la subvencion? Los de al lado
// consiguieron tal".
//
// TRES VISTAS SOBRE LO MISMO, como la agenda y el calendario:
//
//   FICHA       el conjunto crudo, denso, a columnas. "Lo que echo de menos es
//               el entramado, no solo el resultado." Sin explicaciones y sin
//               letras grandes: "no es elegante para una venta".
//   INFORME     el texto, con la traduccion de cada dato. Para leer y adjuntar
//               al de viabilidad.
//   RESULTADOS  lo que significa ESTE edificio: la conversacion con el
//               administrador, ya escrita.
//
// Y una regla para las tres: LO VACIO SE DICE, NO SE ESCONDE.

const CAJA = "rounded-2xl border border-black/5 bg-white shadow-sm";

const TONO: Record<string, { marco: string; punto: string; rotulo: string }> = {
  favor: { marco: "border-lima/50 bg-lima-soft/30", punto: "bg-lima-dark", rotulo: "text-lima-dark" },
  ojo: { marco: "border-amber-300/70 bg-amber-50/60", punto: "bg-amber-600", rotulo: "text-amber-700" },
  dato: { marco: "border-black/5 bg-white", punto: "bg-carbon/30", rotulo: "text-carbon/50" },
};
const NOMBRE_TONO: Record<string, string> = { favor: "a favor", ojo: "ojo", dato: "contexto" };

/** La diana. Las dos imagenes se piden CENTRADAS en el centroide de la parcela,
 *  asi que el edificio esta exactamente en el medio. Sin marcarlo no hay manera
 *  de saber cual es, que era justo lo que fallaba. */
function Diana({ nota }: { nota: string }) {
  return (
    <>
      <span className="pointer-events-none absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#FF2D2D] shadow-[0_0_0_2px_rgba(255,255,255,.9)]" />
      <span className="pointer-events-none absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF2D2D] shadow-[0_0_0_2px_rgba(255,255,255,.9)]" />
      <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-carbon">
        {nota}
      </span>
    </>
  );
}

export default async function Edificio({
  params,
  searchParams,
}: {
  params: Promise<{ referencia: string }>;
  searchParams: Promise<{ vista?: string; refrescar?: string }>;
}) {
  const { referencia } = await params;
  const { vista, refrescar } = await searchParams;
  const yo = (await quienSoy()) ?? ({ id: "mirar", veTodo: true, areas: {} } as never);
  if (!puedeEntrar(yo, "comercial")) redirect("/menu");

  // Una pantalla NO SE CAE porque un servicio de fuera este de mal humor. Si
  // Catastro no contesta se dice, y ya esta: caerse obliga a adivinar.
  let i = null;
  let seRompio: string | null = null;
  try {
    i = await informeEdificio(referencia, { refrescar: refrescar === "1" });
  } catch (e) {
    seRompio = e instanceof Error ? e.message : String(e);
  }

  if (!i)
    return (
      <div className="min-h-screen">
        <BarraSuperior />
        <main className="mx-auto w-full max-w-[820px] px-6 pb-16 pt-5">
          <Link href="/comercial" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
            ← Área comercial
          </Link>
          <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5">
            <h1 className="text-[18px] font-bold text-amber-900">
              {seRompio ? "Catastro no contesta ahora mismo" : "No hay ninguna finca con esa referencia"}
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-amber-900/90">
              {seRompio ? (
                <>
                  Es un servicio público y a veces corta la conexión cuando se le pregunta mucho seguido. Vuelve a
                  intentarlo en un minuto: no se ha perdido nada.
                </>
              ) : (
                <>
                  La referencia <b>{referencia}</b> no existe en Catastro, o está mal copiada. Tiene que tener 14
                  caracteres.
                </>
              )}
            </p>
            {seRompio && <p className="mt-3 text-[12px] text-amber-900/70">Lo que dijo exactamente: {seRompio}</p>}
            <div className="mt-4">
              <Link
                href={`/comercial/edificio/${referencia}?refrescar=1`}
                className="inline-flex h-[32px] items-center rounded-[6px] border border-[#223A5D] bg-[#5680A1] px-3.5 text-[12px] font-bold uppercase text-white transition hover:bg-[#46769c]"
              >
                Volver a intentarlo
              </Link>
            </div>
          </div>
        </main>
      </div>
    );

  const asc = await ascensorDe(referencia);

  const cual = vista === "informe" ? "informe" : vista === "resultados" ? "resultados" : "ficha";
  const solapa = (v: string, texto: string) => (
    <Link
      href={`/comercial/edificio/${referencia}` + (v === "ficha" ? "" : `?vista=${v}`)}
      className={
        "rounded-full px-3.5 py-1 text-[11px] font-bold uppercase tracking-wide transition " +
        (cual === v ? "bg-[#104269] text-[#FFCD00]" : "text-carbon/55 hover:text-carbon")
      }
    >
      {texto}
    </Link>
  );

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1440px] px-6 pb-16 pt-5">
        <Link href="/comercial" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
          ← Área comercial
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-carbon/45">El edificio</div>
            <h1 className="mt-1 text-[25px] font-bold leading-tight text-carbon">{i.direccionOficial || "—"}</h1>
            <p className="mt-1.5 text-[13px] text-carbon/60">
              Referencia catastral <b className="text-carbon/80">{i.referencia}</b>
              {i.municipio && <> · {i.municipio}</>}
            </p>
            {/* De cuando son los datos. Se consulta una vez y se guarda: pasar de
                una pestaña a otra no debe relanzar ocho consultas a dos servicios
                publicos. */}
            <p className="mt-1 text-[12px] text-carbon/45">
              Consultado el{" "}
              {new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" }).format(new Date(i.consultadoEn))}
              {" · "}
              <Link href={`/comercial/edificio/${referencia}?refrescar=1${vista ? `&vista=${vista}` : ""}`} className="font-semibold text-[#2B6CB0] hover:underline">
                volver a consultar
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-0.5 rounded-full border border-black/10 bg-hueso p-0.5">
              {solapa("ficha", "Ficha")}
              {solapa("informe", "Informe")}
              {solapa("resultados", "Resultados")}
            </div>
            <a
              href={i.visorCatastro}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-[32px] items-center rounded-[6px] border border-[#223A5D] bg-[#5680A1] px-3.5 text-[12px] font-bold uppercase text-white transition hover:bg-[#46769c]"
            >
              Abrir en Catastro
            </a>
          </div>
        </div>

        {/* ------------------ las dos imagenes, en las tres vistas ------------------ */}
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <section className={CAJA + " overflow-hidden"}>
            <div className="px-4 pt-3.5">
              <h2 className="text-[15px] font-bold text-carbon">El croquis</h2>
              <p className="mt-0.5 text-[12px] text-carbon/55">
                Cartografía catastral: la parcela, los patios, las plantas de cada cuerpo y las escaleras rotuladas.
              </p>
            </div>
            <div className="relative mt-3 aspect-square w-full bg-hueso">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {i.croquis ? <img src={i.croquis} alt="Croquis catastral" className="h-full w-full object-cover" /> : null}
              {i.croquis && <Diana nota="Este edificio" />}
            </div>
          </section>

          <section className={CAJA + " overflow-hidden"}>
            <div className="px-4 pt-3.5">
              <h2 className="text-[15px] font-bold text-carbon">Desde el aire</h2>
              <p className="mt-0.5 text-[12px] text-carbon/55">
                <b>Mira la azotea:</b> si hay casetón, hay ascensor. Si no lo hay, no lo tienen.
              </p>
            </div>
            <div className="relative mt-3 aspect-square w-full bg-hueso">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {i.aerea ? <img src={i.aerea} alt="Ortofoto del edificio" className="h-full w-full object-cover" /> : null}
              {i.aerea && <Diana nota="Este edificio" />}
            </div>

            {/* La pregunta que decide si hay negocio, y que no dice ningun dato.
                Se contesta aqui, mirando la foto, en dos segundos. */}
            <div className="flex flex-wrap items-center gap-3 border-t border-black/5 px-4 py-3">
              <span className="text-[13px] font-semibold text-carbon">¿Hay ascensor?</span>
              <form action={marcarAscensor.bind(null, referencia, true)}>
                <button
                  className={
                    "h-[30px] rounded-full border px-4 text-[12px] font-bold uppercase transition " +
                    (asc.hay === true
                      ? "border-[#237812] bg-[#237812] text-white"
                      : "border-carbon/20 bg-white text-carbon/55 hover:border-carbon/45")
                  }
                >
                  Sí
                </button>
              </form>
              <form action={marcarAscensor.bind(null, referencia, false)}>
                <button
                  className={
                    "h-[30px] rounded-full border px-4 text-[12px] font-bold uppercase transition " +
                    (asc.hay === false
                      ? "border-[#B45309] bg-[#B45309] text-white"
                      : "border-carbon/20 bg-white text-carbon/55 hover:border-carbon/45")
                  }
                >
                  No
                </button>
              </form>

              {asc.hay === null ? (
                <span className="text-[12px] text-carbon/45">Nadie lo ha mirado todavía</span>
              ) : (
                <span className="text-[12px] text-carbon/50">
                  {asc.quien ? `Lo marcó ${asc.quien}` : "Marcado"}
                  {asc.cuando && ` el ${new Intl.DateTimeFormat("es-ES", { dateStyle: "short" }).format(new Date(asc.cuando))}`}
                  {" · "}
                  <form action={marcarAscensor.bind(null, referencia, null)} className="inline">
                    <button className="font-semibold text-[#2B6CB0] hover:underline">borrar</button>
                  </form>
                </span>
              )}
            </div>
          </section>
        </div>

        {/* ============================== RESULTADOS ============================== */}
        {cual === "resultados" && (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {i.conclusiones.map((x) => {
              const t = TONO[x.tono];
              return (
                <div key={x.texto} className={"rounded-2xl border p-4 " + t.marco}>
                  <div className="flex items-baseline gap-2.5">
                    <span className={"mt-1.5 size-2 shrink-0 rounded-full " + t.punto} />
                    <div className="min-w-0">
                      <div className={"text-[10px] font-bold uppercase tracking-wider " + t.rotulo}>
                        {NOMBRE_TONO[x.tono]}
                      </div>
                      <div className="mt-0.5 text-[15px] font-bold leading-tight text-carbon">{x.texto}</div>
                      <p className="mt-1 text-[13px] leading-snug text-carbon/70">{x.porque}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* =============================== INFORME =============================== */}
        {cual === "informe" && (
          <>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {i.secciones.map((s) => (
                <section key={s.titulo} className={CAJA + " p-4"}>
                  <h2 className="mb-3 text-[15px] font-bold text-carbon">{s.titulo}</h2>
                  <dl>
                    {s.datos.map((x) => (
                      <div key={x.que} className="border-t border-black/5 py-2.5 first:border-t-0 first:pt-0">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <dt className="text-[12px] text-carbon/55">{x.que}</dt>
                          <dd className={"text-[14px] font-semibold " + (x.falta ? "text-carbon/40" : "text-carbon")}>
                            {x.valor}
                          </dd>
                        </div>
                        {/* La traduccion: que permite, que impide, que hay que hacer. */}
                        {x.significa && <p className="mt-1 text-[12px] leading-snug text-[#2B6CB0]">{x.significa}</p>}
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>

            <section className={CAJA + " mt-4 p-4"}>
              <h2 className="mb-3 text-[15px] font-bold text-carbon">Documentos que trae el edificio</h2>
              {i.pdfs.length === 0 ? (
                <p className="text-[13px] text-carbon/50">Este edificio no tiene planos ni informes publicados.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {i.pdfs.map((p) => (
                    <li key={p.url}>
                      <a href={p.url} target="_blank" rel="noreferrer" className="text-[14px] font-semibold text-[#2B6CB0] hover:underline">
                        {p.que}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={CAJA + " mt-4 p-4"}>
              <h2 className="text-[15px] font-bold text-carbon">Lo que solo se sabe yendo</h2>
              <p className="mt-0.5 text-[12px] text-carbon/55">
                Todo lo demás está aquí arriba. Esto es lo único que hay que llevarse anotado a la visita.
              </p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {i.soloYendo.map((t) => (
                  <li key={t} className="flex gap-2 text-[14px] text-carbon">
                    <span className="mt-[3px] size-4 shrink-0 rounded-[3px] border border-carbon/40" />
                    {t}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {/* ================================ FICHA ================================
            El entramado entero, a columnas y sin explicaciones. */}
        {cual === "ficha" && (
          <div className="mt-4 lg:columns-3 lg:gap-4">
            {i.secciones.map((s) => (
              <section key={s.titulo} className={CAJA + " mb-4 break-inside-avoid p-3.5"}>
                <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-carbon/45">{s.titulo}</h2>
                <dl className="text-[13px]">
                  {s.datos.map((x) => (
                    <div
                      key={x.que}
                      className="flex items-baseline justify-between gap-3 border-t border-black/5 py-1.5 first:border-t-0 first:pt-0"
                    >
                      <dt className="shrink-0 text-carbon/55">{x.que}</dt>
                      <dd className={"text-right font-semibold " + (x.falta ? "text-carbon/35" : "text-carbon")}>
                        {x.valor}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}

            {/* Lo que NO se sabe tambien es parte del entramado. */}
            <section className={CAJA + " mb-4 break-inside-avoid p-3.5"}>
              <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-carbon/45">Solo yendo</h2>
              <ul className="text-[13px] text-carbon/70">
                {i.soloYendo.map((t) => (
                  <li key={t} className="border-t border-black/5 py-1.5 first:border-t-0 first:pt-0">
                    {t.split(" — ")[0]}
                  </li>
                ))}
              </ul>
            </section>

            <section className={CAJA + " mb-4 break-inside-avoid p-3.5"}>
              <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-carbon/45">Documentos</h2>
              {i.pdfs.length === 0 ? (
                <p className="text-[13px] text-carbon/45">Ninguno publicado.</p>
              ) : (
                <ul className="text-[13px]">
                  {i.pdfs.map((d) => (
                    <li key={d.url} className="border-t border-black/5 py-1.5 first:border-t-0 first:pt-0">
                      <a href={d.url} target="_blank" rel="noreferrer" className="font-semibold text-[#2B6CB0] hover:underline">
                        {d.que}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}


        {/* --------- lo que ya ha cobrado el barrio: el mejor argumento --------- */}
        {cual !== "resultados" && i.subvencionesCerca.length > 0 && (
          <section className={CAJA + " mt-4 p-4"}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[15px] font-bold text-carbon">Subvenciones ya concedidas a menos de 800 m</h2>
              <span className="text-[13px] font-bold text-lima-dark">
                {i.subvencionesCerca
                  .reduce((t, x) => t + (x.importe ?? 0), 0)
                  .toLocaleString("es-ES", { maximumFractionDigits: 0 })}{" "}
                € repartidos
              </span>
            </div>
            <ul className="mt-2">
              {i.subvencionesCerca.map((x, n) => (
                <li
                  key={x.direccion + n}
                  className={
                    "flex flex-wrap items-baseline gap-x-3 border-t border-black/5 py-2 text-[13px] first:border-t-0 " +
                    (x.aqui ? "font-bold text-carbon" : "text-carbon/75")
                  }
                >
                  <span className="min-w-[220px] flex-1">
                    {x.direccion}
                    {x.aqui && <span className="ml-2 rounded-full bg-amber-50 px-2 py-px text-[11px] uppercase text-amber-700">este edificio</span>}
                  </span>
                  <span className="w-[120px] text-right tabular-nums">
                    {x.importe ? x.importe.toLocaleString("es-ES", { maximumFractionDigits: 0 }) + " €" : "—"}
                  </span>
                  <span className="w-[80px] text-right text-carbon/55">{x.viviendas ? `${x.viviendas} viv.` : ""}</span>
                  <span className="min-w-[180px] flex-1 text-carbon/55">{x.convocatoria ?? ""}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {i.fallos.length > 0 && (
          <section className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
            <p className="text-[13px] font-bold text-amber-900">Algo no se ha podido consultar</p>
            <ul className="mt-1 text-[13px] text-amber-900">
              {i.fallos.map((f) => (
                <li key={f}>· {f}</li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
