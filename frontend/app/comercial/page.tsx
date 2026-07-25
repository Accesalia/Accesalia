import Link from "next/link";
import { BarraSuperior } from "../components/BarraSuperior";
import { SelectorComunidad } from "../expediente/SelectorComunidad";
import {
  listarComerciales,
  interaccionesRecientes,
  oportunidadesEnMarcha,
  catalogoHitos,
  ultimoContactoComunidades,
  nombreComercial,
  ORIGEN_LABEL,
  TIPO_EVENTO_LABEL,
} from "../../lib/comercial";
import { Barra } from "./oportunidades/Barra";

export const dynamic = "force-dynamic";

function fecha(v: string | null): string {
  if (!v) return "";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}
function eur(n: number | null | undefined): string {
  return n == null ? "" : `${n.toLocaleString("es-ES")} €`;
}

// Acceso rápido compacto (icono arriba, etiqueta corta) para la fila de 3.
function Accion({ icono, titulo, href, disponible = true }: { icono: string; titulo: string; href: string; disponible?: boolean }) {
  const cuerpo = (
    <div className={`flex h-full flex-col items-center justify-center gap-1 rounded-xl border bg-white p-3 text-center shadow-sm transition ${disponible ? "border-black/5 hover:border-lima hover:shadow-md" : "border-dashed border-black/10 opacity-60"}`}>
      <span className="text-2xl text-lima-dark">{icono}</span>
      <div className="text-xs font-semibold leading-tight text-carbon">{titulo}</div>
    </div>
  );
  return disponible ? <Link href={href} className="block h-full">{cuerpo}</Link> : <div className="h-full cursor-not-allowed">{cuerpo}</div>;
}

// Botón de navegación superior (fondo de armario / otras pantallas).
function NavBtn({ icono, titulo, href, disponible = true }: { icono: string; titulo: string; href: string; disponible?: boolean }) {
  const cls = `inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${disponible ? "border-black/10 bg-white text-carbon/75 hover:border-lima hover:text-carbon" : "border-dashed border-black/10 text-carbon/35 cursor-not-allowed"}`;
  return disponible ? <Link href={href} className={cls}><span>{icono}</span>{titulo}</Link> : <span className={cls}><span>{icono}</span>{titulo}</span>;
}

export default async function AreaComercial({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const [comerciales, recientes, oportunidades, catalogo] = await Promise.all([
    listarComerciales(),
    interaccionesRecientes(c, 5),
    oportunidadesEnMarcha(c),
    catalogoHitos(),
  ]);
  const yo = comerciales.find((x) => x.id === c) ?? null;
  const suf = c ? `?c=${c}` : "";

  // Limitar a 4 en el hub (para que el diario se vea); "ver más" lleva a la lista.
  const opsView = oportunidades.slice(0, 4);
  const diarioView = recientes.slice(0, 4);
  const ultimoCont = await ultimoContactoComunidades(opsView.map((o) => o.comunidad?.id).filter((x): x is string => !!x));

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-[1100px] px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-carbon sm:text-3xl"><span className="text-lima-dark">◇</span> Área comercial</h1>
            <p className="mt-1 text-carbon/55">{yo ? <>Hola, <b>{nombreComercial(yo)}</b>. Esto es lo tuyo.</> : "Elige quién eres para ver lo tuyo (provisional, hasta que haya login)."}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href="/comercial" className={`rounded-full border px-3 py-1 text-sm ${!c ? "border-lima bg-lima font-semibold text-carbon" : "border-black/10 bg-white text-carbon/60 hover:border-lima"}`}>Todos</Link>
            {comerciales.map((m) => (
              <Link key={m.id} href={`/comercial?c=${m.id}`} className={`rounded-full border px-3 py-1 text-sm ${c === m.id ? "border-lima bg-lima font-semibold text-carbon" : "border-black/10 bg-white text-carbon/60 hover:border-lima"}`}>{m.nombre}</Link>
            ))}
          </div>
        </div>

        {/* Entrar a una comunidad (buscador → su cockpit comercial) */}
        <div className="mt-5">
          <SelectorComunidad hrefBase="/comunidades/" hrefSuffix="/comercial" />
          <p className="mt-1.5 text-xs text-carbon/45">Entra a una comunidad para ver o crear sus oportunidades.</p>
        </div>

        {/* Navegación a lo mío (otras pantallas del área comercial) */}
        <div className="mt-5 flex flex-wrap gap-2">
          <NavBtn icono="🗂" titulo="Mis administradores" href="/administraciones" />
          <NavBtn icono="📊" titulo="Mis proyectos contratados" href={`/comercial/proyectos${suf}`} />
        </div>

        {/* Tablero: PC = oportunidades (2/3) | acciones+diario (1/3). Móvil = apilado. */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ACCIONES RÁPIDAS — móvil 1º · PC columna derecha, fila 1. Fila de 3. */}
          <section className="order-1 lg:order-none lg:col-start-3 lg:row-start-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-carbon/35">Acciones rápidas</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Accion icono="🎤" titulo="Grabar entrada" href={`/comercial/contacto${suf}`} />
              <Accion icono="✎" titulo="Hoja de encargo" href="/expediente" />
              <Accion icono="▤" titulo="Informe viabilidad" href="#" disponible={false} />
            </div>
          </section>

          {/* OPORTUNIDADES EN MARCHA — móvil 2º · PC columna izquierda 2/3, ocupa 2 filas */}
          <section className="order-2 lg:order-none lg:col-span-2 lg:col-start-1 lg:row-start-1 lg:row-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-carbon/35">Oportunidades en marcha ({oportunidades.length})</h2>
              <Link href={`/comercial/oportunidades/nueva${suf}`} className="rounded-full bg-lima px-3 py-1 text-xs font-semibold text-carbon transition hover:bg-lima-dark hover:text-white">+ Crear nueva</Link>
            </div>
            <div className="mt-3 space-y-2">
              {opsView.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/15 bg-white px-5 py-10 text-center text-sm text-carbon/45">
                  Nada en marcha aún. <Link href={`/comercial/oportunidades/nueva${suf}`} className="font-semibold text-lima-dark hover:underline">Crea la primera →</Link>
                </div>
              ) : (
                opsView.map((o) => {
                  const titulo = o.comunidad?.nombre ?? o.comunidad_provisional ?? "Comunidad sin identificar";
                  const neg = o.negociacion_oportunidad[0] ?? null;
                  const ultimo = o.comunidad ? ultimoCont[o.comunidad.id] : undefined;
                  const destino = o.comunidad ? `/comunidades/${o.comunidad.id}/comercial` : "/comercial/oportunidades";
                  return (
                    <Link key={o.id} href={destino} className="block rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition hover:border-lima hover:shadow-md">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-carbon">{titulo}</div>
                          {o.comunidad?.direccion && <div className="truncate text-xs text-carbon/50">{o.comunidad.direccion}</div>}
                          <div className="mt-0.5 text-xs">
                            {o.administrador?.nombre ? <span className="text-lima-dark">{o.administrador.nombre}</span> : <span className="text-carbon/35">sin admin</span>}
                            {o.comercial?.nombre && !c && <span className="text-carbon/50"> · {o.comercial.nombre}</span>}
                          </div>
                        </div>
                        {neg && (neg.precio != null || neg.que_vendemos) && (
                          <div className="shrink-0 text-right">
                            {neg.precio != null && <div className="text-sm font-bold text-lima-dark">{eur(neg.precio)}</div>}
                            {neg.que_vendemos && <div className="text-[11px] text-carbon/50">{neg.que_vendemos}</div>}
                          </div>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-carbon/45">
                        <span>1er contacto: <b className="text-carbon/60">{fecha(o.creado_en.slice(0, 10))}</b></span>
                        <span>últ. contacto: <b className="text-carbon/60">{ultimo ? fecha(ultimo) : "—"}</b></span>
                        {!o.comunidad && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">sin dar de alta</span>}
                      </div>

                      <div className="mt-2">
                        <Barra hitos={o.hitos_oportunidad} catalogo={catalogo} sinEnlaces />
                      </div>
                    </Link>
                  );
                })
              )}
              {oportunidades.length > opsView.length && (
                <Link href={`/comercial/oportunidades${suf}`} className="block rounded-xl border border-black/10 bg-white px-4 py-2.5 text-center text-sm font-semibold text-lima-dark transition hover:border-lima">
                  Ver las {oportunidades.length} oportunidades →
                </Link>
              )}
            </div>
          </section>

          {/* DIARIO — móvil 3º · PC columna derecha, fila 2 */}
          <section className="order-3 lg:order-none lg:col-start-3 lg:row-start-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-carbon/35">Últimos contactos</h2>
              <Link href={`/comercial/contacto${suf}`} className="text-xs font-semibold text-lima-dark hover:underline">+ Grabar</Link>
            </div>
            <div className="mt-3 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
              {diarioView.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-carbon/40">Aún no hay contactos. Empieza dictando uno.</p>
              ) : (
                <ul className="divide-y divide-black/5">
                  {diarioView.map((i) => (
                    <li key={i.id} className="transition hover:bg-black/[0.015]">
                      <Link href={`/comercial/interaccion/${i.id}${suf}`} className="block px-4 py-2.5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-carbon/50">
                          <span className="font-semibold text-carbon/70">{fecha(i.fecha_evento) || fecha(i.creado_en.slice(0, 10))}</span>
                          <span className="rounded-full bg-black/5 px-1.5 py-0.5 font-semibold">{TIPO_EVENTO_LABEL[i.tipo_evento] ?? i.tipo_evento}</span>
                          <span>{ORIGEN_LABEL[i.origen] ?? i.origen}</span>
                          {i.administradores?.nombre && <span className="text-lima-dark">· {i.administradores.nombre}</span>}
                          {i.requiere_humano && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-700">revisar</span>}
                        </div>
                        {i.transcripcion && <p className="mt-0.5 line-clamp-2 text-xs text-carbon/75">{i.transcripcion}</p>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {recientes.length >= 4 && (
              <Link href={`/comercial/diario${suf}`} className="mt-2 block rounded-xl border border-black/10 bg-white px-4 py-2 text-center text-xs font-semibold text-lima-dark transition hover:border-lima">
                Ver más contactos →
              </Link>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
