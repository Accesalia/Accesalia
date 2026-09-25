import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { ID_FANTASMA } from "../../../../lib/cuadroDemo";
import { fichaDemo } from "../../../../lib/fichaDemo";
import { esComunidad, fichaReal } from "../../../../lib/fichaReal";
import { comercialDe, puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { Bloque, Cobros, DiarioCompleto, Documentos, eur, FichaEdificio, Olfato, Personas, Tiempos, Vacio, ddmm } from "./Piezas";

export const dynamic = "force-dynamic";

// LA FICHA COMERCIAL COMPLETA. Una por oportunidad, con su pagina propia.
// Indice dictado por Monica el 12-sep-2026 (boceto y lista en memoria).
//
// De momento solo tiene datos la DEMOSTRACION del comercial fantasma. Lo de
// verdad ya existe en la base (hojas_encargo, versiones_hoja, hitos_cobro,
// personas_comunidad) pero falta enlazar la hoja con su oportunidad; ese es el
// siguiente paso.

function Si({ v }: { v: boolean }) {
  return (
    <span className={"rounded-full px-2.5 py-0.5 text-sm font-bold " + (v ? "bg-lima text-carbon" : "bg-black/5 text-carbon/50")}>
      {v ? "Sí" : "No"}
    </span>
  );
}

export default async function FichaCompleta({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const { id } = await params;
  const { c } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/comercial/ficha/${id}`);

  const direccion = yo.veTodo || puedeEntrar(yo, "comercial", "supervisar");
  const mio = await comercialDe(yo.id);
  if (!direccion && !mio && !puedeEntrar(yo, "comercial")) redirect("/menu");

  // Dos origenes: la demostracion del fantasma (datos inventados) y una
  // comunidad de verdad (id = comunidad_id). Lo real, de momento, solo lo ve
  // quien ve todas las carteras: cada comercial vera las suyas cuando exista el
  // vinculo comunidad-cartera.
  const f = direccion && c === ID_FANTASMA ? fichaDemo(id) : esComunidad(id) && direccion ? await fichaReal(id) : null;
  if (!f) notFound();
  const real = f.id === id && esComunidad(id);

  const volver = `/comercial${c ? `?c=${c}` : ""}`;

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1100px] px-4 pb-20 pt-5 sm:px-6">
        <Link href={volver} className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">← Área comercial</Link>

        {/* ------------------------------- cabecera ------------------------------- */}
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-carbon sm:text-4xl">{f.nombre}</h1>
            <p className="mt-1 text-lg text-lima-dark">
              {f.empresa ?? <span className="text-carbon/40">sin administración</span>}
              {f.persona && <span> · {f.persona}</span>}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {f.firmada && (
                <span className="inline-flex items-center gap-2 rounded-lg bg-[#FBF3DC] px-3 py-1.5">
                  <span className="text-xl leading-none text-[#C9971B]" aria-hidden>★</span>
                  <span className="text-sm font-bold uppercase tracking-wider text-[#8A6410]">Proyecto firmado</span>
                  <span className="text-sm text-[#8A6410]/70">{ddmm(f.firmada)}</span>
                </span>
              )}
              {f.cobra !== null && (
                <span
                  className={
                    "rounded-lg border px-2.5 py-1 text-sm font-bold uppercase tracking-wide " +
                    (f.cobra ? "border-carbon bg-carbon text-white" : "border-black/15 bg-white text-carbon/50")
                  }
                  title="Si el administrador se lleva comisión"
                >
                  {f.cobra ? "El admin cobra" : "El admin no cobra"}
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            {f.precio !== null ? (
              <div className="text-2xl font-bold tabular-nums text-lima-dark">{eur(f.precio)}</div>
            ) : (
              <div className="text-base text-carbon/40">Sin precio aún</div>
            )}
            {f.que && (
              <div className="mt-1.5">
                <span className="inline-block rounded-lg bg-lima px-3 py-1.5 text-xl font-bold leading-tight text-carbon">{f.que}</span>
              </div>
            )}
          </div>
        </div>

        {f.avisos && f.avisos.length > 0 && (
          <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-base text-amber-900">
            No se ha podido leer {f.avisos.join(", ")}. El resto de la ficha es correcto; esos bloques salen vacíos.
          </div>
        )}

        {/* ------------------------------- el encargo ------------------------------ */}
        <Bloque titulo="El encargo · los tres documentos" de="hojas_encargo · versiones_hoja">
          <Documentos docs={f.documentos} />
        </Bloque>

        <Bloque titulo="Qué lleva y qué no">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-black/5 bg-hueso/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-base font-bold text-carbon">Tres presupuestos</span>
                {f.tresPresupuestos ? <Si v={f.tresPresupuestos.aplica} /> : <span className="text-sm text-carbon/30">sin decidir</span>}
              </div>
              <p className="mt-1.5 text-sm leading-snug text-carbon/60">
                {f.tresPresupuestos?.nota ?? "Casi el 90% de los proyectos van a subvención y los necesitan."}
              </p>
            </div>
            <div className="rounded-xl border border-black/5 bg-hueso/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-base font-bold text-carbon">3D para la junta</span>
                {f.tresD ? <Si v={f.tresD.haceFalta} /> : <span className="text-sm text-carbon/30">sin decidir</span>}
              </div>
              {f.tresD?.cual ? (
                <p className="mt-1.5 text-sm leading-snug text-carbon/70">
                  <b>{f.tresD.cual}</b> · {f.tresD.tipo}
                  <br />
                  <span className="text-carbon/55">{f.tresD.nota}</span>
                </p>
              ) : (
                <p className="mt-1.5 text-sm leading-snug text-carbon/60">{f.tresD?.nota ?? "Sin 3D asociado."}</p>
              )}
            </div>
            <div className="rounded-xl border border-black/5 bg-hueso/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-base font-bold text-carbon">Junta de votación</span>
                {f.junta ? <Si v={f.junta.haceFalta} /> : <span className="text-sm text-carbon/30">sin decidir</span>}
              </div>
              <p className="mt-1.5 text-sm leading-snug text-carbon/60">
                {f.junta ? `${f.junta.fecha ? `${ddmm(f.junta.fecha)} · ` : ""}${f.junta.nota}` : "Sin junta apuntada."}
              </p>
            </div>
            <div className="rounded-xl border border-dashed border-black/15 bg-hueso/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-base font-bold text-carbon/70">Financiación</span>
                <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-carbon/40">
                  Por montar
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-snug text-carbon/55">
                UCI o BBVA. Interesa porque financian el pack completo: el día que la comunidad firma el crédito, cobramos el 100%.
              </p>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {["¿Necesita financiación? sí/no", "Datos enviados a qué entidad y cuándo", "Comisión a recibir", "Persona de contacto de la entidad"].map((x) => (
                  <li key={x} className="rounded-md border border-dashed border-black/15 bg-white px-2.5 py-1 text-sm text-carbon/45">{x}</li>
                ))}
              </ul>
            </div>
          </div>
        </Bloque>

        {/* --------------------------------- cobros -------------------------------- */}
        {f.hitos.length > 0 && (
          <Bloque titulo="Los cobros" de="hitos_cobro · lineas_facturacion">
            <Cobros hitos={f.hitos} />
          </Bloque>
        )}

        {/* -------------------------------- personas ------------------------------- */}
        <Bloque titulo="Quién es quién" de="personas_comunidad">
          <Personas personas={f.personas} />
        </Bloque>

        {/* -------------------------------- edificio ------------------------------- */}
        <Bloque titulo="Ficha del edificio" de="será de la sección IEE">
          <FichaEdificio e={f.edificio} />
        </Bloque>

        {/* --------------------------------- olfato -------------------------------- */}
        <Bloque titulo="Lo que hay que saber de esta comunidad" de="notas_expediente">
          <Olfato notas={f.olfato} />
        </Bloque>

        {/* ----------------------------- administrador ------------------------------ */}
        <Bloque titulo="El administrador">
          {f.administrador ? (
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <span className="text-lg font-bold text-carbon">{f.administrador.nombre}</span>
                <span className="text-sm text-carbon/55">
                  {f.administrador.desde && <>le conocemos desde <b className="text-carbon/80">{f.administrador.desde}</b> · </>}
                  {f.administrador.viabilidades !== null && <><b className="text-carbon/80">{f.administrador.viabilidades}</b> viabilidades pedidas · </>}
                  <b className="text-carbon/80">{f.administrador.firmadas.length}</b> firmadas
                </span>
              </div>
              {f.administrador.firmadas.length > 0 && (
                <ul className="mt-3 divide-y divide-black/5">
                  {f.administrador.firmadas.map((x) => (
                    <li key={x.fecha} className="flex items-baseline justify-between gap-4 py-1.5">
                      <span className="text-sm tabular-nums text-carbon/55">{ddmm(x.fecha)}</span>
                      <span className="flex-1 text-base text-carbon/85">{x.que}</span>
                      <span className="text-base font-bold tabular-nums text-lima-dark">{eur(x.importe)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {f.administrador.valoracion && (
                <p className="mt-3 rounded-xl bg-hueso/60 px-4 py-3 text-base leading-relaxed text-carbon/80">
                  {f.administrador.valoracion}
                </p>
              )}
            </div>
          ) : (
            <Vacio>Sin historial todavía.</Vacio>
          )}
        </Bloque>

        {/* --------------------------------- tiempos -------------------------------- */}
        <Bloque titulo="Cuándo pasó cada cosa" de="alimenta las estadísticas de rendimiento">
          <Tiempos pasos={f.pasos} />
        </Bloque>

        {/* --------------------------------- diario --------------------------------- */}
        <Bloque titulo={real ? "Histórico del expediente" : "Toda la historia con esta comunidad"} de={real ? "observaciones_expediente · licencia y obra, no comercial" : "interacciones · interaccion_comunidad"}>
          <DiarioCompleto entradas={f.diario} />
        </Bloque>
      </main>
    </div>
  );
}
