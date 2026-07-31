import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { revisionInteraccion, ORIGEN_LABEL, TIPO_EVENTO_LABEL, nombreComercial, type EventoBitacora } from "../../../../lib/comercial";
import { confirmarComunidadNueva, vincularAComunidad, deshacerEvento, validarRevision, reprocesarEntrada } from "./acciones";
import { BotonEliminar } from "./BotonEliminar";
import { Guardando } from "../../../components/Guardando";

export const dynamic = "force-dynamic";

function fecha(v: string | null): string {
  if (!v) return "";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

// Cómo se presenta cada tipo de evento de la bitácora en la columna derecha.
const PINTA: Record<string, { label: string; icono: string; clase: string }> = {
  pendiente_crear_comunidad: { label: "Comunidad nueva por confirmar", icono: "◆", clase: "border-amber-300 bg-amber-50" },
  comunidad_creada:          { label: "Comunidad guardada en histórico", icono: "🏠", clase: "border-lima/40 bg-lima-soft/40" },
  oportunidad_creada:        { label: "Oportunidad creada",             icono: "✓", clase: "border-lima/40 bg-lima-soft/40" },
  oportunidad_anotada:       { label: "Anotado en oportunidad activa",  icono: "✎", clase: "border-sky-200 bg-sky-50" },
  tarea_creada:              { label: "Recordatorio puesto",            icono: "⏰", clase: "border-indigo-200 bg-indigo-50" },
  avance_hito:               { label: "Avance del pipeline",            icono: "▸", clase: "border-sky-200 bg-sky-50" },
  item_deseo_tecnico:        { label: "Deseo técnico (para el técnico)", icono: "🔧", clase: "border-violet-200 bg-violet-50" },
  item_actualizacion:        { label: "Actualización",                  icono: "•", clase: "border-black/10 bg-black/[0.02]" },
  item_nuevo_contacto:       { label: "Nuevo contacto",                 icono: "👤", clase: "border-black/10 bg-black/[0.02]" },
  // Sali ya no da de alta personas por su cuenta: las propone. Dar de alta a
  // un ser humano lo decide una persona, buscando primero si ya existe.
  pendiente_nueva_persona:   { label: "Persona nueva por dar de alta",  icono: "◆", clase: "border-amber-300 bg-amber-50" },
  item_resultado_junta:      { label: "Resultado de junta",             icono: "🗳", clase: "border-black/10 bg-black/[0.02]" },
  item_otro:                 { label: "Anotado",                        icono: "•", clase: "border-black/10 bg-black/[0.02]" },
  item_error:                { label: "No pude procesar este trozo",    icono: "⚠", clase: "border-red-200 bg-red-50" },
};

// Detalles legibles de un item (datos jsonb del evento).
function detalles(d: Record<string, unknown>): { k: string; v: string }[] {
  const campos: [string, string][] = [
    ["sujeto_nombre", "Quién/qué"], ["direccion", "Dirección"], ["tipo_proyecto", "Tipo"],
    ["importe", "Importe"], ["interes", "Interés"], ["deseo_o_condicionante", "Deseo/condicionante"],
    ["tarea", "Tarea"], ["condicion_cierre", "Se cierra cuando"], ["fecha_limite", "Antes de"],
    ["contacto", "Contacto"], ["notas", "Notas"],
  ];
  return campos.map(([k, label]) => ({ k: label, v: String(d[k] ?? "").trim() })).filter((x) => x.v !== "");
}

// Etiqueta legible de lo que hizo un evento (para el aviso de borrado).
function resumenAccion(e: EventoBitacora): string | null {
  const d = e.datos ?? {};
  const nombre = (d.sujeto_nombre as string) || (d.direccion as string) || "";
  switch (e.tipo) {
    case "comunidad_creada": return `Comunidad creada${nombre ? ` «${nombre}»` : ""} (y su oportunidad)`;
    case "oportunidad_creada": return "Oportunidad creada";
    case "oportunidad_anotada": return "Anotación en una oportunidad existente";
    case "tarea_creada": return `Recordatorio: ${(d.tarea as string) || nombre || "seguimiento"}`;
    case "item_deseo_tecnico": return "Deseo técnico guardado en el brief";
    case "item_nuevo_contacto": return `Contacto creado${nombre ? `: ${nombre}` : ""}`;
    case "pendiente_crear_comunidad": return `Comunidad pendiente${nombre ? ` «${nombre}»` : ""}`;
    case "pendiente_nueva_persona": return `Persona por dar de alta${nombre ? `: ${nombre}` : ""}`;
    default: return null;
  }
}

function Hidden({ interaccionId, comercialId }: { interaccionId: string; comercialId?: string | null }) {
  return (
    <>
      <input type="hidden" name="interaccion_id" value={interaccionId} />
      {comercialId ? <input type="hidden" name="comercial_id" value={comercialId} /> : null}
    </>
  );
}

export default async function RevisionInteraccion({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ c?: string; e?: string }>;
}) {
  const { id } = await params;
  const { c, e: edicion } = await searchParams;
  const rev = await revisionInteraccion(id);
  if (!rev) notFound();

  const { interaccion: it, eventos, comunidadesDelAdmin } = rev;
  const comercialId = c ?? it.comercial_id ?? undefined;
  const suf = comercialId ? `?c=${comercialId}` : "";
  const admin = it.administrador;

  // Eventos de COMUNIDAD (van al panel "Detectado", izquierda) vs el resto (derecha).
  const TIPOS_COM = new Set(["pendiente_crear_comunidad", "comunidad_creada", "oportunidad_creada", "oportunidad_anotada"]);
  const activos = eventos.filter((e) => !e.deshecho);
  const pendientesCom = activos.filter((e) => e.tipo === "pendiente_crear_comunidad");
  const linkedCom = activos.filter((e) => TIPOS_COM.has(e.tipo) && e.tipo !== "pendiente_crear_comunidad");
  const hechos = activos.filter((e) => !TIPOS_COM.has(e.tipo)); // tareas, deseos, contactos, avances…
  const deshechos = eventos.filter((e) => e.deshecho);

  const procesado = it.extraccion_estado !== "sin_procesar";
  const resumen = it.extraccion?.resumen_para_comercial;

  // Efecto dominó que se avisará al eliminar la entrada.
  const accionesEncadenadas = ["La nota grabada (el texto)", ...activos.map(resumenAccion).filter(Boolean) as string[]];

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-[1100px] px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href={`/comercial${suf}`} className="text-sm text-carbon/50 hover:text-carbon">← Área comercial</Link>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            it.extraccion_estado === "validada" ? "bg-lima-soft text-lima-dark"
              : it.extraccion_estado === "propuesta" ? "bg-amber-100 text-amber-700"
              : it.extraccion_estado === "aplicada" ? "bg-sky-100 text-sky-700"
              : "bg-black/5 text-carbon/50"
          }`}>
            {{ validada: "Revisado", propuesta: "Necesita tu confirmación", aplicada: "Aplicado", sin_procesar: "Sin procesar", descartada: "Descartado" }[it.extraccion_estado] ?? it.extraccion_estado}
          </span>
        </div>

        <h1 className="mt-3 flex items-center gap-2 text-2xl font-bold text-carbon">
          <span className="text-lima-dark">◇</span> Lo que entendí
        </h1>

        {edicion === "cosmetico" && (
          <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-800">
            Guardé el texto. El cambio era <b>menor</b> (no cambia los datos), así que no toqué lo ya procesado.
          </div>
        )}
        {edicion === "reprocesado" && (
          <div className="mt-3 rounded-xl border border-lima/40 bg-lima-soft/50 px-4 py-2.5 text-sm text-carbon/80">
            El cambio era <b>relevante</b>: Sali releyó el texto corregido y rehízo el análisis.
          </div>
        )}

        {/* Resumen cálido de Ordelia: "esto entendí y esto he hecho por ti" */}
        {resumen ? (
          <div className="mt-4 rounded-2xl border border-lima/30 bg-lima-soft/30 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-lima-dark/80">Sali</div>
            <p className="mt-1 text-[15px] leading-relaxed text-carbon/85">{resumen}</p>
          </div>
        ) : !procesado ? (
          /* Lo normal nada más guardar: Sali tarda entre veinte segundos y un
             minuto, y ya no se la espera antes de traerte aquí. Se dice claro
             que está trabajando, para que no parezca que se ha perdido. */
          <div className="mt-4 rounded-2xl border border-dashed border-black/15 bg-white p-4 text-sm text-carbon/60">
            <span className="font-medium text-carbon/80">Sali está leyendo esta nota.</span>{" "}
            Suele tardar menos de un minuto.{" "}
            <a href={`/comercial/interaccion/${it.id}${comercialId ? `?c=${comercialId}` : ""}`}
              className="font-medium text-lima-dark hover:underline">
              Actualizar
            </a>
            <p className="mt-1 text-carbon/45">
              El texto ya está guardado, así que no se pierde nada aunque cierres.
            </p>
          </div>
        ) : null}

        {it.requiere_humano && it.motivo_requiere_humano ? (
          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            <b>Necesito que confirmes:</b> {it.motivo_requiere_humano}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          {/* IZQUIERDA — lo que grabaste */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-carbon/35">Lo que grabaste</h2>
            <div className="mt-3 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-carbon/50">
                <span className="font-semibold text-carbon/70">{fecha(it.fecha_evento) || fecha(it.creado_en.slice(0, 10))}</span>
                {it.tipo_evento && <span className="rounded-full bg-black/5 px-2 py-0.5 font-semibold">{TIPO_EVENTO_LABEL[it.tipo_evento] ?? it.tipo_evento}</span>}
                <span>{ORIGEN_LABEL[it.origen] ?? it.origen}</span>
                {it.comercial && <span className="text-carbon/40">· {nombreComercial(it.comercial)}</span>}
              </div>
              {admin ? (
                <div className="mt-2 text-sm text-lima-dark">Administrador: <b>{admin.nombre}</b>{admin.empresa ? ` (${admin.empresa})` : ""}</div>
              ) : (
                <div className="mt-2 text-sm text-amber-700">Nota suelta (sin administrador anclado)</div>
              )}
              <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-carbon/85">{it.transcripcion}</p>
            </div>

            {/* DETECTADO EN LA NOTA: valida (✓) o quita (✗) admin y comunidades */}
            {procesado && (
              <section className="mt-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-carbon/35">Detectado en la nota</h3>

                <div className="mt-2 text-[11px] font-medium uppercase tracking-wide text-carbon/40">Administrador</div>
                {admin ? (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-lima-soft px-2.5 py-1 text-sm text-lima-dark">✓ {admin.nombre}{admin.empresa ? ` (${admin.empresa})` : ""}</span>
                ) : (
                  <span className="mt-1 block text-sm text-carbon/40">— ninguno (nota suelta) —</span>
                )}

                <div className="mt-3 text-[11px] font-medium uppercase tracking-wide text-carbon/40">Comunidades (direcciones)</div>
                {pendientesCom.length === 0 && linkedCom.length === 0 ? (
                  <span className="mt-1 block text-sm text-carbon/40">— ninguna —</span>
                ) : (
                  <div className="mt-1.5 space-y-2">
                    {/* Enlazadas: ✓ + quitar */}
                    {linkedCom.map((e) => {
                      const d = e.datos ?? {};
                      const nom = (d.sujeto_nombre as string) || (d.direccion as string) || "comunidad";
                      return (
                        <div key={e.id} className="flex items-center justify-between gap-2 rounded-xl border border-lima/30 bg-lima-soft/40 px-3 py-1.5">
                          <span className="text-sm text-carbon/80">✓ {nom}</span>
                          <form action={deshacerEvento}>
                            <Guardando />
                            <Hidden interaccionId={it.id} comercialId={comercialId} />
                            <input type="hidden" name="evento_id" value={e.id} />
                            <input type="hidden" name="evento_tipo" value={e.tipo} />
                            <input type="hidden" name="target_tabla" value={e.target_tabla ?? ""} />
                            <input type="hidden" name="target_id" value={e.target_id ?? ""} />
                            <button className="shrink-0 rounded px-1.5 py-0.5 text-xs text-carbon/35 hover:text-red-600" title="esa no era">✗</button>
                          </form>
                        </div>
                      );
                    })}
                    {/* Pendientes: por confirmar (candidatos + confirmar/vincular/descartar) */}
                    {pendientesCom.map((e) => {
                      const d = e.datos ?? {};
                      const nom = (d.sujeto_nombre as string) || (d.direccion as string) || "comunidad";
                      const cands = d.candidatos as { id: string; nombre: string; direccion?: string | null }[] | undefined;
                      return (
                        <div key={e.id} className="rounded-xl border border-amber-300 bg-amber-50 p-3">
                          <div className="text-sm font-semibold text-amber-800">◆ {nom} — por confirmar</div>
                          {Array.isArray(cands) && cands.length > 0 && (
                            <div className="mt-2">
                              <div className="text-[11px] font-medium text-carbon/50">¿Se parece a alguna?</div>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {cands.map((cand) => (
                                  <form key={cand.id} action={vincularAComunidad}>
                                    <Hidden interaccionId={it.id} comercialId={comercialId} />
                                    <input type="hidden" name="puesto_id" value={it.puesto_id ?? ""} />
                                    <input type="hidden" name="evento_id" value={e.id} />
                                    <input type="hidden" name="comunidad_id" value={cand.id} />
                                    <button className="rounded-full border border-lima/50 bg-white px-2.5 py-1 text-xs font-semibold text-carbon/80 hover:bg-lima hover:text-carbon">{cand.nombre}{cand.direccion ? ` · ${cand.direccion}` : ""}</button>
                                  </form>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="mt-2 flex flex-wrap items-end gap-2">
                            <form action={confirmarComunidadNueva}>
                              <Guardando />
                              <Hidden interaccionId={it.id} comercialId={comercialId} />
                              <input type="hidden" name="puesto_id" value={it.puesto_id ?? ""} />
                              <input type="hidden" name="empresa_id" value={admin?.empresaId ?? ""} />
                              <input type="hidden" name="evento_id" value={e.id} />
                              <button className="rounded-lg bg-lima px-3 py-1.5 text-sm font-semibold text-carbon hover:bg-lima-dark hover:text-white">✓ Es nueva, guárdala</button>
                            </form>
                            {comunidadesDelAdmin.length > 0 && (
                              <form action={vincularAComunidad} className="flex items-end gap-1.5">
                                <Guardando />
                                <Hidden interaccionId={it.id} comercialId={comercialId} />
                                <input type="hidden" name="puesto_id" value={it.puesto_id ?? ""} />
                                <input type="hidden" name="evento_id" value={e.id} />
                                <select name="comunidad_id" defaultValue="" required className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm outline-none focus:border-lima">
                                  <option value="" disabled>…o una de estas</option>
                                  {comunidadesDelAdmin.map((cm) => <option key={cm.id} value={cm.id}>{cm.nombre}</option>)}
                                </select>
                                <button className="rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-sm font-semibold text-carbon/70 hover:border-lima">Vincular</button>
                              </form>
                            )}
                            <form action={deshacerEvento}>
                              <Guardando />
                              <Hidden interaccionId={it.id} comercialId={comercialId} />
                              <input type="hidden" name="evento_id" value={e.id} />
                              <input type="hidden" name="evento_tipo" value={e.tipo} />
                              <button className="rounded px-2 py-1.5 text-sm text-carbon/40 hover:text-red-600">✗ Descartar</button>
                            </form>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Editar la nota (errata, quitar/añadir algo) -> Sali la relee limpia */}
            <details className="mt-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
              <summary className="cursor-pointer text-sm font-semibold text-carbon/60 hover:text-carbon">✎ Editar la nota</summary>
              <form action={reprocesarEntrada} className="mt-3 space-y-2">
                <Guardando />
                <Hidden interaccionId={it.id} comercialId={comercialId} />
                <textarea
                  name="transcripcion"
                  defaultValue={it.transcripcion ?? ""}
                  rows={5}
                  className="w-full rounded-lg border border-black/15 bg-white p-2.5 text-sm leading-relaxed outline-none focus:border-lima"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button className="rounded-lg bg-lima px-3 py-1.5 text-sm font-semibold text-carbon hover:bg-lima-dark hover:text-white">Guardar y reprocesar</button>
                  <button type="reset" className="rounded-lg border border-black/15 px-3 py-1.5 text-sm font-semibold text-carbon/55 hover:border-carbon/40 hover:text-carbon">Cancelar</button>
                  <span className="text-[11px] text-carbon/45">Sali releerá el texto corregido y rehará el análisis (revierte el anterior).</span>
                </div>
              </form>
            </details>
          </section>

          {/* DERECHA — lo que hice (bitácora) */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-carbon/35">Lo que hice con ella</h2>

            {hechos.length === 0 && (
              <p className="mt-3 rounded-2xl border border-dashed border-black/15 bg-white px-5 py-8 text-center text-sm text-carbon/40">
                {procesado ? "Sin tareas, deseos ni avances en esta nota. (Las comunidades, arriba a la izquierda.)" : "Pendiente de procesar."}
              </p>
            )}

            {/* HECHOS: lo materializado o anotado, cada uno con su deshacer */}
            {hechos.map((e) => {
              const p = PINTA[e.tipo] ?? PINTA.item_otro;
              const d = e.datos ?? {};
              return (
                <div key={e.id} className={`mt-3 rounded-2xl border p-4 shadow-sm ${p.clase}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-carbon/80"><span>{p.icono}</span> {p.label}</div>
                    <DeshacerBtn evento={e} interaccionId={it.id} comercialId={comercialId} />
                  </div>
                  <dl className="mt-2 space-y-0.5 text-sm text-carbon/75">
                    {detalles(d).map((x) => (<div key={x.k} className="flex gap-1.5"><dt className="text-carbon/45">{x.k}:</dt><dd>{x.v}</dd></div>))}
                  </dl>
                </div>
              );
            })}

            {deshechos.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-xs text-carbon/40 hover:text-carbon/60">{deshechos.length} deshecho(s)</summary>
                <ul className="mt-2 space-y-1">
                  {deshechos.map((e) => (
                    <li key={e.id} className="text-xs text-carbon/40 line-through">{(PINTA[e.tipo] ?? PINTA.item_otro).label}: {String(e.datos?.sujeto_nombre ?? e.datos?.tarea ?? "")}</li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        </div>

        {/* Cierre */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-black/5 pt-5">
          <p className="text-sm text-carbon/50">
            {pendientesCom.length > 0
              ? `Quedan ${pendientesCom.length} comunidad(es) por confirmar (izquierda).`
              : "Cuando esté todo bien, ciérralo y vuelve a tu área."}
          </p>
          <div className="flex items-center gap-2">
            <BotonEliminar acciones={accionesEncadenadas} interaccionId={it.id} comercialId={comercialId} />
            <form action={validarRevision}>
              <Guardando />
              <Hidden interaccionId={it.id} comercialId={comercialId} />
              <button className="rounded-lg bg-carbon px-5 py-2.5 text-sm font-semibold text-white hover:bg-carbon/85">✓ Todo correcto</button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

// Botón "esa no era" para un evento ya materializado (lleva el target para revertir).
function DeshacerBtn({ evento, interaccionId, comercialId }: { evento: EventoBitacora; interaccionId: string; comercialId?: string | null }) {
  return (
    <form action={deshacerEvento}>
      <Guardando />
      <Hidden interaccionId={interaccionId} comercialId={comercialId} />
      <input type="hidden" name="evento_id" value={evento.id} />
      <input type="hidden" name="evento_tipo" value={evento.tipo} />
      <input type="hidden" name="target_tabla" value={evento.target_tabla ?? ""} />
      <input type="hidden" name="target_id" value={evento.target_id ?? ""} />
      <button className="shrink-0 rounded px-1.5 py-0.5 text-xs text-carbon/35 hover:text-red-600" title="Esa no era: deshacer">✗ esa no era</button>
    </form>
  );
}
