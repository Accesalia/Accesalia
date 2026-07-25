import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { comunidadPorId } from "../../../lib/comunidades";
import { resumenFacturacionComunidad } from "../../../lib/hojas";
import { resumenProyectoComunidad, responsableDe, tiposDe } from "../../../lib/proyecto";
import { resumenVisadoComunidad, ESTADO_VISADO } from "../../../lib/visado";
import { resumenLicenciaComunidad, ESTADO_LICENCIA, TIPO_TRAMITE_LABEL } from "../../../lib/licencia";
import { resumenObraComunidad, ESTADO_OBRA, CFO_ESTADO } from "../../../lib/obra";
import { resumenLicitacionComunidad, ESTADO_LICITACION } from "../../../lib/licitacion";
import { resumenesComunidad, condicionantesComunidad, interaccionesDeComunidad, FASE_LABEL, ORIGEN_LABEL, TIPO_EVENTO_LABEL } from "../../../lib/comercial";
import { ProgresoProyecto } from "../../components/ProgresoProyecto";
import { SelectorComunidad } from "../SelectorComunidad";
import { FASES } from "../fases";

function eur0(n: number): string {
  return `${Math.round(n).toLocaleString("es-ES")} €`;
}

function fechaConv(v: string | null): string {
  if (!v) return "";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

export const dynamic = "force-dynamic";

function Mini({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-black/5 py-1 last:border-0">
      <span className="text-xs text-carbon/45">{etiqueta}</span>
      <span className="truncate text-right text-sm text-carbon">{valor || <span className="text-carbon/25">—</span>}</span>
    </div>
  );
}

function Ventana({
  icono,
  titulo,
  href,
  activa,
  children,
}: {
  icono: string;
  titulo: string;
  href?: string;
  activa: boolean;
  children: React.ReactNode;
}) {
  const cuerpo = (
    <section
      className={`flex h-full flex-col rounded-2xl border bg-white p-5 shadow-sm transition ${
        activa ? "border-black/5 hover:border-lima hover:shadow-md" : "border-dashed border-black/10"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-lg ${activa ? "text-lima-dark" : "text-carbon/25"}`}>{icono}</span>
          <h2 className={`text-sm font-semibold uppercase tracking-wide ${activa ? "text-carbon" : "text-carbon/35"}`}>
            {titulo}
          </h2>
        </div>
        {activa ? (
          <span className="text-xs font-medium text-lima-dark">Abrir →</span>
        ) : (
          <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-carbon/35">
            Próximamente
          </span>
        )}
      </div>
      <div className="mt-4 flex-1">{children}</div>
    </section>
  );
  return activa && href ? (
    <Link href={href} className="block h-full">
      {cuerpo}
    </Link>
  ) : (
    cuerpo
  );
}

export default async function Expediente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await comunidadPorId(id);
  if (!ficha) notFound();

  const { comunidad: c, administracion, personas, numHojas } = ficha;
  const [fact, proy, vis, lic, obr, tp, resumenesIA, condicionantes, conversaciones] = await Promise.all([
    resumenFacturacionComunidad(id),
    resumenProyectoComunidad(id),
    resumenVisadoComunidad(id),
    resumenLicenciaComunidad(id),
    resumenObraComunidad(id),
    resumenLicitacionComunidad(id),
    resumenesComunidad(id),
    condicionantesComunidad(id),
    interaccionesDeComunidad(id, 20),
  ]);
  const presidente = personas.find((p) => p.rol === "presidente");
  const dir2 = [c.cp, c.municipio].filter(Boolean).join(" ");
  const subtitulo = [c.direccion, dir2, c.provincia].filter(Boolean).join(" · ");

  // Contenido del resumen por fase activa.
  function cuerpo(clave: string) {
    if (clave === "datos") {
      return (
        <div className="space-y-0.5">
          <Mini etiqueta="CIF" valor={c.cif_comunidad} />
          <Mini etiqueta="Ref. catastral" valor={c.referencia_catastral} />
          <Mini etiqueta="Presidente" valor={presidente?.nombre} />
          <Mini etiqueta="Administración" valor={administracion?.nombre} />
          <Mini etiqueta="Personas" valor={personas.length || null} />
        </div>
      );
    }
    if (clave === "comercial") {
      return (
        <div className="flex h-full flex-col justify-between">
          <div className="space-y-0.5">
            <Mini etiqueta="Hojas de encargo" valor={numHojas || "0"} />
            <Mini etiqueta="Administración" valor={administracion?.nombre} />
          </div>
          <span className="mt-3 inline-block w-fit rounded-full bg-lima-soft px-3 py-1 text-xs font-semibold text-lima-dark">
            + Crear hoja de encargo
          </span>
        </div>
      );
    }
    if (clave === "proyecto") {
      if (!proy.hay) return <p className="text-sm text-carbon/35">Sin proyecto registrado todavía.</p>;
      const p = proy.principal!;
      const paso = p.etapas_proyecto.find((e) => e.tipo_etapa === "proyecto");
      const ea = p.etapas_proyecto.find((e) => e.tipo_etapa === "estado_actual");
      return (
        <div className="flex h-full flex-col justify-between">
          <div className="space-y-2">
            <ProgresoProyecto p={p} compacto />
            {(tiposDe(p).length > 0 || p.proyecto_externo) && (
              <div className="flex flex-wrap gap-1 pt-1">
                {tiposDe(p).map((t) => (
                  <span key={t.clave} className="rounded bg-lima-soft px-1.5 py-0.5 text-[10px] font-semibold text-lima-dark">
                    {t.nombre}
                  </span>
                ))}
                {p.proyecto_externo && (
                  <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">Externo</span>
                )}
              </div>
            )}
            <div className="space-y-0.5 pt-1">
              <Mini etiqueta="Estado actual" valor={ea ? responsableDe(ea) : null} />
              <Mini etiqueta="Solución" valor={paso ? responsableDe(paso) : null} />
            </div>
          </div>
          {proy.num > 1 && <span className="mt-2 text-xs text-carbon/40">{proy.num} proyectos</span>}
        </div>
      );
    }
    if (clave === "visado") {
      if (!vis.hay) return <p className="text-sm text-carbon/35">Sin visado registrado todavía.</p>;
      const est = vis.ultimoEstado ? ESTADO_VISADO[vis.ultimoEstado] : null;
      return (
        <div className="flex h-full flex-col justify-between">
          <div className="space-y-0.5">
            <Mini etiqueta="Estado" valor={est ? <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${est.clase}`}>{est.label}</span> : null} />
            <Mini etiqueta="Código TL" valor={vis.referencia ? <span className="font-mono text-xs">{vis.referencia}</span> : null} />
            <Mini etiqueta="Visados" valor={`${vis.visados}/${vis.total}`} />
          </div>
          {vis.tasasPendientes > 0 && (
            <span className="mt-2 inline-block w-fit rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
              tasa pendiente {eur0(vis.tasasPendientes)}
            </span>
          )}
        </div>
      );
    }
    if (clave === "licencia") {
      if (!lic.hay) return <p className="text-sm text-carbon/35">Sin licencia registrada todavía.</p>;
      const est = lic.ultimoEstado ? ESTADO_LICENCIA[lic.ultimoEstado] : null;
      return (
        <div className="flex h-full flex-col justify-between">
          <div className="space-y-0.5">
            <Mini etiqueta="Estado" valor={est ? <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${est.clase}`}>{est.label.split(" (")[0]}</span> : null} />
            <Mini etiqueta="Tipo" valor={lic.tipoTramite ? TIPO_TRAMITE_LABEL[lic.tipoTramite] ?? lic.tipoTramite : null} />
            <Mini etiqueta="Organismo" valor={lic.organismo} />
            <Mini etiqueta="Aprobadas" valor={`${lic.aprobadas}/${lic.total}`} />
          </div>
        </div>
      );
    }
    if (clave === "obra") {
      if (!obr.hay) return <p className="text-sm text-carbon/35">Sin obra registrada todavía.</p>;
      const est = obr.estado ? ESTADO_OBRA[obr.estado] : null;
      const cfo = obr.cfoEstado ? CFO_ESTADO[obr.cfoEstado] : null;
      return (
        <div className="flex h-full flex-col justify-between">
          <div className="space-y-0.5">
            <Mini etiqueta="Estado" valor={est ? <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${est.clase}`}>{est.label}</span> : null} />
            <Mini etiqueta="Constructora" valor={obr.constructora} />
            <Mini etiqueta="CFO" valor={cfo ? <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cfo.clase}`}>{cfo.label}</span> : null} />
          </div>
        </div>
      );
    }
    if (clave === "tres_presupuestos") {
      if (!tp.hay) return <p className="text-sm text-carbon/35">Sin licitación registrada todavía.</p>;
      const est = tp.estado ? ESTADO_LICITACION[tp.estado] : null;
      return (
        <div className="flex h-full flex-col justify-between">
          <div className="space-y-0.5">
            <Mini etiqueta="Estado" valor={est ? <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${est.clase}`}>{est.label}</span> : null} />
            <Mini etiqueta="Presupuestos" valor={tp.numPresupuestos || null} />
            <Mini etiqueta="Ganador" valor={tp.ganador} />
          </div>
          <span className={`mt-2 inline-block w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${tp.subvencionOk ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
            {tp.subvencionOk ? "subvención ✓" : "subvención pendiente"}
          </span>
        </div>
      );
    }
    if (clave === "facturacion") {
      if (fact.numLineas === 0) return <p className="text-sm text-carbon/35">Sin facturación registrada todavía.</p>;
      return (
        <div className="flex h-full flex-col justify-between">
          <div className="space-y-0.5">
            <Mini etiqueta="Contratado" valor={eur0(fact.totalContratado)} />
            <Mini etiqueta="Cobrado" valor={<span className="font-semibold text-lima-dark">{eur0(fact.cobrado)}</span>} />
            <Mini etiqueta="Pendiente" valor={eur0(fact.pendiente + fact.facturado)} />
            {fact.devuelto > 0 && <Mini etiqueta="Devuelto" valor={<span className="text-red-600">{eur0(fact.devuelto)}</span>} />}
          </div>
          {fact.hayEstimado && (
            <span className="mt-2 inline-block w-fit rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
              estimado (Monday)
            </span>
          )}
        </div>
      );
    }
    return null;
  }

  const hrefDe: Record<string, string> = {
    datos: `/comunidades/${c.id}`,
    comercial: `/comunidades/${c.id}/comercial`,
    proyecto: `/comunidades/${c.id}/proyecto`,
    visado: `/comunidades/${c.id}/visado`,
    licencia: `/comunidades/${c.id}/licencia`,
    obra: `/comunidades/${c.id}/obra`,
    tres_presupuestos: `/comunidades/${c.id}/tres-presupuestos`,
    facturacion: `/comunidades/${c.id}/facturacion`,
  };

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-[1100px] px-6 py-8">
        {/* Barra de cambio de comunidad + volver */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/expediente" className="text-sm text-carbon/50 hover:text-carbon">
            ← Expediente virtual
          </Link>
          <SelectorComunidad compacto />
        </div>

        {/* Cabecera: el edificio, sujeto del expediente */}
        <div className="mt-4 rounded-2xl bg-carbon px-6 py-5 text-white">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-lima">
            <span>◉</span> Expediente virtual
          </div>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{c.nombre}</h1>
          {subtitulo && <p className="mt-1 text-white/60">{subtitulo}</p>}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {c.cif_comunidad && <span className="rounded-full bg-white/10 px-2.5 py-1">CIF {c.cif_comunidad}</span>}
            {administracion && <span className="rounded-full bg-white/10 px-2.5 py-1">Admin: {administracion.nombre}</span>}
            <span className="rounded-full bg-white/10 px-2.5 py-1">{numHojas} hoja(s) de encargo</span>
          </div>
        </div>

        {/* Sali: "ponerse al día" — resumen vivo por fase (semilla del ciclo de vida) */}
        {resumenesIA.length > 0 && (
          <section className="mt-4 rounded-2xl border border-lima/30 bg-lima-soft/25 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-lima-dark/80">Sali · al día, por fase</div>
            <div className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {resumenesIA.map((r) => (
                <div key={r.fase}>
                  <div className="text-xs font-semibold text-lima-dark">{FASE_LABEL[r.fase] ?? r.fase}</div>
                  <p className="mt-0.5 text-sm leading-relaxed text-carbon/80">{r.texto}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Brief técnico: lo que la comunidad dijo que quiere (oro para el redactor) */}
        {condicionantes.length > 0 && (
          <section className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/60 p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-violet-700/80">
              <span>🔧</span> Deseos y condicionantes de la comunidad · para el técnico
            </div>
            <ul className="mt-3 space-y-1.5">
              {condicionantes.map((cc) => (
                <li key={cc.id} className="flex gap-2 text-sm text-carbon/80">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" aria-hidden />
                  <span>{cc.texto}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Tablero de ventanitas (fases) */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FASES.map((f) => (
            <Ventana key={f.clave} icono={f.icono} titulo={f.titulo} activa={f.activa} href={hrefDe[f.clave]}>
              {f.activa ? cuerpo(f.clave) : <p className="text-sm text-carbon/35">{f.descripcion}</p>}
            </Ventana>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-carbon/35">
          Cada ventanita se irá llenando según montemos su fase. Las grises aún no tienen pantalla.
        </p>

        {/* Conversaciones que mencionan esta comunidad (vía el puente; texto no duplicado) */}
        {conversaciones.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-carbon/35">
              Conversaciones de esta comunidad ({conversaciones.length})
            </h2>
            <div className="mt-3 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
              <ul className="divide-y divide-black/5">
                {conversaciones.map((i) => (
                  <li key={i.id} className="transition hover:bg-black/[0.015]">
                    <Link href={`/comercial/interaccion/${i.id}`} className="block px-5 py-3">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-carbon/50">
                        <span className="font-semibold text-carbon/70">{fechaConv(i.fecha_evento) || fechaConv(i.creado_en.slice(0, 10))}</span>
                        {i.tipo_evento && <span className="rounded-full bg-black/5 px-2 py-0.5 font-semibold">{TIPO_EVENTO_LABEL[i.tipo_evento] ?? i.tipo_evento}</span>}
                        <span>{ORIGEN_LABEL[i.origen] ?? i.origen}</span>
                        {i.administradores?.nombre && <span className="text-lima-dark">· {i.administradores.nombre}</span>}
                        {i.requiere_humano && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">revisar</span>}
                      </div>
                      {i.transcripcion && <p className="mt-1 line-clamp-2 text-sm text-carbon/75">{i.transcripcion}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
