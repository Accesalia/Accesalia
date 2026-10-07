import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import {
  catalogoTipos,
  contactosDeComunidad,
  equipoOpciones,
  gestionOportunidad,
  ESTADOS_HITO,
  ESTADOS_3D,
  RESULTADOS_JUNTA,
  TIPOS_3D,
} from "../../../../lib/gestionOportunidad";
import { COMO_FUE } from "../../../../lib/entradaDiario";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { accionEntrada, accionHito, accionJunta, accionNegociacion, accionTipos, accionTresD } from "./acciones";
import { Fases, QueContratan, Serie, Titulo } from "./Piezas";
import { AZUL, Carril, bloquesDe } from "./Carril";
import { Cabecera } from "./Cabecera";
import { Edificio } from "./Edificio";
import { distritoDe } from "../../../../lib/informeEdificio";
import { viabilidadDeOpp } from "../../../../lib/viabilidadComercial";
import { documentacionDe } from "../../../../lib/bloqueDocumentacion";
import { Bloque2 } from "./Bloque2";
import { BOTON, CAJA, CAMPO, ROTULO, ROT_CAJA } from "./estilo";

export const dynamic = "force-dynamic";
// El informe del edificio sale a Catastro y al geoportal de Madrid: tarda.
export const maxDuration = 60;

// GESTIONAR UNA OPORTUNIDAD (Monica, 28-sep-2026).
//
// "Tenemos una pagina de crear opp, pero no una de seguimiento". Esta es. La
// ficha que se despliega en el listado es un RESUMEN y se queda como esta; aqui
// se trabaja.
//
// Siete bloques, y el orden no es casual: primero donde esta (las fases), luego
// que se le vende, y al final lo que se ha ido contando. Lo que se toca a
// diario, arriba.
//
// Cada bloque se guarda solo: un unico "guardar" al final obliga a repasar la
// pantalla entera para cambiar una fecha.

const EUR = new Intl.NumberFormat("es-ES");

/** 2026-03-14 -> 14/03/26 */
function fechaCorta(v: string): string {
  const [a, m, d] = v.split("-");
  return `${d}/${m}/${a.slice(2)}`;
}

// LAS VISTAS DEL BLOQUE 1 (Monica, 6-oct-2026): "un switch de vista
// ficha/vista informe". Vendra una tercera ("apoyo comercial"): se anade aqui.
const VISTAS = [
  { clave: "ficha", rotulo: "Vista ficha" },
  { clave: "informe", rotulo: "Vista informe" },
] as const;

export default async function GestionOportunidad({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vista?: string; bloque?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const vista = sp.vista === "informe" ? "informe" : "ficha";
  // El bloque que se ESTA VIENDO, que no tiene por que ser por el que va la
  // oportunidad: el carril es menu ademas de indicador. Hoy hay pantalla para el
  // 1 y el 2.
  const bloque = sp.bloque === "2" ? 2 : 1;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/oportunidades/" + id);
  if (!puedeEntrar(yo, "comercial")) redirect("/menu");

  const [g, tipos, equipo] = await Promise.all([gestionOportunidad(id), catalogoTipos(), equipoOpciones()]);
  if (!g) notFound();

  const pausada = g.estado === "pausada";
  const hechos = g.hitos.filter((h) => h.estado === "hecho").length;
  const aplican = g.hitos.filter((h) => h.estado !== "no_aplica").length;
  const ahora = g.hitos.find((h) => h.estado === "en_curso") ?? g.hitos.find((h) => h.estado === "pendiente" && h.aplicable);
  // "Dicen que estan interesados en": los tipos marcados, con su nombre.
  const quieren = tipos.filter((t) => g.tiposElegidos.includes(t.id)).map((t) => t.nombre);
  // El bloque por el que va, para el "Por donde vamos" de la cabecera.
  const bloqueAhora = bloquesDe(g.hitos).find((b) => b.activo) ?? null;
  const [contactos, distrito, viabilidad] = await Promise.all([
    g.comunidadId ? contactosDeComunidad(g.comunidadId) : Promise.resolve([]),
    g.referenciaCatastral ? distritoDe(g.referenciaCatastral) : Promise.resolve(null),
    viabilidadDeOpp(id),
  ]);
  const documentacion = bloque === 2 ? await documentacionDe(id, g.comunidadId) : null;

  // QUE LE VENDEMOS Y POR CUANTO. El mismo formulario en dos sitios: abajo, en
  // el trabajo del bloque 1, y dentro de "El trato" del bloque 2, que es donde
  // se negocia. Un solo sitio donde se guarda.
  const trato = (dentro: boolean) => (
    <form action={accionNegociacion.bind(null, id)} className={dentro ? "" : CAJA + " p-4"}>
      {!dentro && (
      <Titulo
        extra={
          <span className="text-[11px] text-carbon/50">Cada cambio queda guardado: un precio que baja cuenta algo</span>
        }
      >
        Qué le vendemos
      </Titulo>
      )}
      <div className="flex flex-wrap gap-3">
        <label className="block min-w-[260px] flex-1">
          <span className={ROTULO}>Qué le vendemos</span>
          <input
            name="que_vendemos"
            defaultValue={g.negociacion?.queVendemos ?? ""}
            placeholder="Ascensor + licencia"
            className={CAMPO + " mt-1"}
          />
        </label>
        <label className="block w-[150px]">
          <span className={ROTULO}>Precio (€)</span>
          <input
            name="precio"
            defaultValue={g.negociacion?.precio != null ? EUR.format(g.negociacion.precio) : ""}
            inputMode="decimal"
            className={CAMPO + " mt-1"}
          />
        </label>
        <label className="block min-w-[260px] flex-1">
          <span className={ROTULO}>Alcance</span>
          <input name="alcance" defaultValue={g.negociacion?.alcance ?? ""} className={CAMPO + " mt-1"} />
        </label>
      </div>
      <label className="mt-3 block">
        <span className={ROTULO}>Notas de la negociación</span>
        <input name="notas" defaultValue={g.negociacion?.notas ?? ""} className={CAMPO + " mt-1"} />
      </label>
      <div className="mt-3 flex justify-end">
        <button className={BOTON}>Guardar</button>
      </div>
    </form>
  );

  return (
    // El verde de su maqueta del bloque 1 (#8EB180), en todos los bloques
    // (Monica, 7-oct-2026).
    <div className="min-h-screen" style={{ background: "#8EB180" }}>
      <BarraSuperior />
      {/* El lienzo es el suyo: 1300, el ancho real de su pantalla. Lo que se
          dibuje aqui mide lo que va a medir de verdad (esqueleto del 30-sep).
          Y TODO es contenido, como en la maqueta: en cuanto cabe, sin margenes
          a los lados (Monica, 7-oct-2026: "me parece un desperdicio"). */}
      <main className="mx-auto w-full max-w-[1300px] px-4 pb-16 pt-5 sm:px-6 min-[1300px]:px-0">
        <Link href="/comercial?ver=oportunidades" className="text-sm font-semibold text-carbon/75 transition hover:text-carbon">
          ← Oportunidades abiertas
        </Link>

        {/* ------------------------- 1 · cabecera ------------------------- */}
        <Cabecera
          id={id}
          g={g}
          hechos={hechos}
          aplican={aplican}
          ahora={ahora}
          quieren={quieren}
          bloqueAhora={bloqueAhora}
          contactos={contactos}
          distrito={distrito}
        />
        {pausada && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900">
            <b>Pausada{g.pausa && <> desde el {fechaCorta(g.pausa.desde)}</>}.</b> No está perdida: está esperando.
            {g.pausa?.condicion && <> Se retoma {g.pausa.condicion}.</>}
            {g.pausa?.motivo && <> Motivo: {g.pausa.motivo}.</>}
          </div>
        )}

        {/* ------------------- el carril y el panel -------------------
            La columna de bloques es menu e indicador de avance a la vez, y el
            activo cruza el hueco para fundirse con el panel: "sin linea entre
            ellos, el ojo lee una pieza" (Monica, 30-sep-2026). */}
        <div className="mt-6 flex items-stretch gap-[14px]">
          <Carril hitos={g.hitos} visto={bloque} id={id} />
          <div
            // El panel azul relleno de la maqueta: "el fondo tiene que decir
            // esto que estas viendo ES el bloque 1".
            style={{ borderColor: AZUL, borderRadius: "0 10px 10px 10px", background: AZUL }}
            className="min-w-0 flex-1 border p-[11px]"
          >

        {/* SUS CUATRO ANCHOS FIJOS: 278 · 346 · 190 · 246. Salen del esqueleto
            del 30-sep (262 · 330 · 190 · 282) y de su reparto del 7-oct: al
            quitar los margenes de los lados sobraban 48 px, y "no se lo daria
            todo al diario": van a partes iguales al Catastro, a los
            condicionantes y al diario; el carril y las fotos "no necesitan
            crecer". "Sus anchos son el diseno": no se reparten en fracciones.
            Las tres primeras las llena el informe del edificio; la cuarta, el
            diario. Y el trabajo que todavia no tiene bloque asignado va en una
            segunda fila, a lo ancho.

            Se colocan por rejilla y no por orden en el fichero, para no mover de
            sitio codigo que ya funciona. */}
        {bloque === 1 && (g.referenciaCatastral || viabilidad) && (
          <div className="mb-[10px] flex items-center gap-1">
            {g.referenciaCatastral && VISTAS.map((v) => (
              <Link
                key={v.clave}
                href={`/comercial/oportunidades/${id}${v.clave === "ficha" ? "" : `?vista=${v.clave}`}`}
                scroll={false}
                replace
                className={
                  "rounded-full border px-3 py-1 text-[12px] font-semibold transition " +
                  (vista === v.clave ? "border-carbon bg-carbon text-white" : "border-carbon/25 bg-white text-carbon/70 hover:border-carbon/50")
                }
              >
                {v.rotulo}
              </Link>
            ))}
            {/* La viabilidad, cuando la hay: Alex la empezo y el comercial la
                remata aqui (Monica, 6-oct-2026). */}
            {viabilidad && (
              <Link
                href={`/comercial/viabilidad/${viabilidad.id}`}
                className="ml-auto rounded-full border border-lima/60 bg-lima-soft px-3 py-1 text-[12px] font-semibold text-lima-dark transition hover:border-lima-dark"
              >
                📄 Viabilidad{viabilidad.numero ? ` ${viabilidad.numero} v${viabilidad.version}` : " (sin generar)"} →
              </Link>
            )}
          </div>
        )}
        <div className="grid items-start gap-[10px] xl:grid-cols-[278px_346px_190px_minmax(0,246px)]">
          {bloque === 2 && documentacion ? (
            // El bloque 2 ocupa el sitio del edificio: las tres primeras
            // columnas. El diario y el trabajo de abajo son de toda la
            // oportunidad y se quedan donde estan (Monica, 6-oct-2026).
            <div className="min-w-0 xl:col-span-3">
              <Bloque2 id={id} g={g} d={documentacion} trato={trato(true)} />
            </div>
          ) : g.referenciaCatastral && vista === "informe" ? (
            // El anexo tal cual sale en la viabilidad: lo que ve el cliente.
            <div className="xl:col-span-3">
              <iframe
                src={`/comercial/oportunidades/${id}/anexo#view=FitH`}
                title="Informe del edificio"
                className="h-[1000px] w-full rounded-[10px] border border-carbon/20 bg-white"
              />
            </div>
          ) : g.referenciaCatastral ? (
            <Edificio referencia={g.referenciaCatastral} id={id} />
          ) : (
            <div className="rounded-[10px] border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-[12px] leading-snug text-amber-900/80 xl:col-span-3">
              <b>Todavía no hay edificio que mirar.</b> Esta oportunidad no tiene referencia
              catastral, así que no se puede traer ni el Catastro, ni la zona, ni las
              subvenciones. Se arregla fijando la dirección.
            </div>
          )}

          {/* ================== el trabajo (segunda fila, a lo ancho) ================== */}
          <div className="flex min-w-0 flex-col gap-5 xl:col-span-4 xl:row-start-2">
            {/* --------------------- 2 · las diez fases ---------------------
                Una barra, y abierta solo la que toca. Antes eran diez filas con
                cuatro botones cada una: dos pantallas de cosas que hoy no
                aplican (Monica, 29-sep-2026). */}
            <Fases hitos={g.hitos} estados={ESTADOS_HITO} equipo={equipo} guardar={accionHito.bind(null, id)} />

            {/* --------------------- 3 · qué contratan --------------------- */}
            <QueContratan tipos={tipos} elegidos={g.tiposElegidos} guardar={accionTipos.bind(null, id)} />

            {/* ----------------- 4 · qué vendemos y por cuánto ----------------- */}
            {/* En el bloque 2 va dentro de "El trato": no se repite. */}
            {bloque === 1 && trato(false)}

            <div className="flex flex-col gap-5">
              {/* ------------------------- 5 · el 3D ------------------------- */}
              <form id="el-3d" action={accionTresD.bind(null, id)} className={CAJA + " p-4"}>
                <Titulo>El 3D</Titulo>
                <div className="flex flex-col gap-3">
                  <label className="block">
                    <span className={ROTULO}>De qué tipo</span>
                    <select name="tipo" defaultValue={g.tresD?.tipo ?? "generico_escalera"} className={CAMPO + " mt-1"}>
                      {TIPOS_3D.map((t) => (
                        <option key={t.valor} value={t.valor}>{t.texto}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className={ROTULO}>Cómo va</span>
                    <select name="estado" defaultValue={g.tresD?.estado ?? "pedido"} className={CAMPO + " mt-1"}>
                      {ESTADOS_3D.map((e) => (
                        <option key={e.valor} value={e.valor}>{e.texto}</option>
                      ))}
                    </select>
                  </label>
                  <div className="flex gap-3">
                    <label className="block flex-1">
                      <span className={ROTULO}>Para cuándo hace falta</span>
                      <input type="date" name="fecha_necesaria" defaultValue={g.tresD?.fechaNecesaria ?? ""} className={CAMPO + " mt-1"} />
                    </label>
                    <label className="block flex-1">
                      <span className={ROTULO}>Entregado el</span>
                      <input type="date" name="fecha_entrega" defaultValue={g.tresD?.fechaEntrega ?? ""} className={CAMPO + " mt-1"} />
                    </label>
                  </div>
                </div>
                <p className="mt-3 text-[11px] leading-snug text-carbon/50">
                  Quién lo monta se apunta en el responsable de la fase «3D para junta», ahí arriba. Y el enlace al modelo,
                  en esa misma fase.
                </p>
                <div className="mt-3 flex justify-end">
                  <button className={BOTON}>Guardar</button>
                </div>
              </form>

              {/* ------------------------ 6 · las juntas ------------------------
                  SERIE, no ficha: una junta se aplaza, piden mas presupuestos y
                  se vuelve a votar. "Ya nos han dado planton dos veces" es
                  informacion de venta, y guardando solo la ultima se pierde. */}
              <Serie
                titulo="Las juntas"
                pie="Una línea por junta: se aplazan, se repiten"
                vacio="Todavía no hay ninguna junta apuntada."
                estados={RESULTADOS_JUNTA}
                guardar={accionJunta.bind(null, id)}
                intentos={g.juntas.map((x) => ({
                  id: x.id,
                  fecha: x.fecha,
                  estado: x.resultado,
                  detalle: x.detalle,
                  marca: x.seguimiento,
                  marcaTexto: "perseguir",
                }))}
              />
            </div>
          </div>

          {/* ============ cuarta columna: 7 · el diario de esta opp ============ */}
          <div className="flex min-w-0 flex-col gap-5 xl:col-start-4 xl:row-start-1">
            <form action={accionEntrada.bind(null, id)} className={CAJA + " p-4"}>
              <div className={ROT_CAJA + " mb-2"}>Grabar aquí</div>
              <textarea
                name="texto"
                rows={4}
                required
                placeholder="Cuéntalo como se lo contarías a un compañero. Puedes dictarlo con el micro de tu teclado."
                className={CAMPO + " resize-y leading-relaxed"}
              />
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="block w-[135px]">
                  <span className={ROTULO}>Cuándo</span>
                  <input type="date" name="fecha" className={CAMPO + " mt-1"} />
                </label>
                <label className="block min-w-0 flex-1">
                  <span className={ROTULO}>Cómo fue</span>
                  <select name="como_fue" defaultValue="visita" className={CAMPO + " mt-1"}>
                    {COMO_FUE.map((c) => (
                      <option key={c.valor} value={c.valor}>{c.texto}</option>
                    ))}
                  </select>
                </label>
                <button className={BOTON}>Guardar</button>
              </div>
            </form>

            <section className={CAJA + " overflow-hidden"}>
              <div className="px-4 pt-4">
                <div className={ROT_CAJA + " mb-2"}>Lo que va pasando</div>
              </div>
              {g.diario.length === 0 ? (
                <p className="px-4 pb-6 text-[13px] text-carbon/50">Todavía no hay nada grabado en esta oportunidad.</p>
              ) : (
                <ul className="max-h-[36rem] divide-y divide-black/5 overflow-y-auto">
                  {g.diario.map((e) => {
                    // La cabecera es igual venga de donde venga la entrada. Lo que
                    // cambia es como se lee el texto largo:
                    //   - una INTERACCION se abre: se pincha y va a su ficha.
                    //   - una NOTA rescatada de Dropbox no tiene ficha propia, asi
                    //     que se DESPLIEGA aqui mismo. Sin esto, el recorte a tres
                    //     lineas dejaria ilegible la mitad del diario: muchas son
                    //     correos enteros de doce o veinte lineas.
                    const cabecera = (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-carbon/55">
                        <span className="font-bold text-carbon/80">
                          {e.fecha ? e.fecha.split("-").reverse().join("/") : "sin fecha"}
                        </span>
                        <span className="rounded-full border border-black/5 bg-hueso px-2 py-px text-[11px] font-semibold">{e.comoFue}</span>
                        {e.con && <span className="text-lima-dark">{e.con}</span>}
                      </div>
                    );
                    const TEXTO = "mt-1 whitespace-pre-line text-[14px] leading-snug text-carbon/80";
                    const largo = e.texto.length > 150 || e.texto.includes("\n");

                    if (e.enlazable) {
                      return (
                        <li key={e.id}>
                          <Link href={`/comercial/interaccion/${e.id}`} className="block px-4 py-3 transition hover:bg-black/[0.02]">
                            {cabecera}
                            <p className={TEXTO + " line-clamp-3"}>{e.texto}</p>
                          </Link>
                        </li>
                      );
                    }
                    if (!largo) {
                      return (
                        <li key={e.id} className="px-4 py-3">
                          {cabecera}
                          <p className={TEXTO}>{e.texto}</p>
                        </li>
                      );
                    }
                    return (
                      <li key={e.id}>
                        <details className="group px-4 py-3 transition hover:bg-black/[0.02]">
                          <summary className="cursor-pointer list-none">
                            {cabecera}
                            <p className={TEXTO + " line-clamp-3 group-open:hidden"}>{e.texto}</p>
                            <span className="mt-0.5 inline-block text-[11px] font-semibold text-lima-dark group-open:hidden">
                              leer entera
                            </span>
                          </summary>
                          <p className={TEXTO}>{e.texto}</p>
                        </details>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
          </div>
        </div>
      </main>
    </div>
  );
}
