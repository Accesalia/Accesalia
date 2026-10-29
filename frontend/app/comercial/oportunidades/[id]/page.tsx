import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import {
  catalogoTipos,
  contactosDeComunidad,
  gestionOportunidad,
  ESTADOS_3D,
  RESULTADOS_JUNTA,
  TIPOS_3D,
} from "../../../../lib/gestionOportunidad";
import { CANALES } from "../../../../lib/entradaDiario";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { accionAdminAComunidad, accionEntrada, accionJunta, accionTresD } from "./acciones";
import { Serie, Titulo } from "./Piezas";
import { AZUL, Pestanas } from "./Carril";
import { Cabecera, Estado } from "./Cabecera";
import { Edificio } from "./Edificio";
import { FotosOpp } from "./FotosOpp";
import { CajonOpp } from "./CajonOpp";
import { cajonDeOpp, tiposCajon } from "../../../../lib/cajonDocumentos";
import { fotosDeOpp } from "../../../../lib/fotos";
import { distritoDe } from "../../../../lib/informeEdificio";
import { viabilidadDeOpp } from "../../../../lib/viabilidadComercial";
import { documentacionDe } from "../../../../lib/bloqueDocumentacion";
import { Bloque4 } from "./Bloque34";
import { decisionCierreDe } from "../../../../lib/bloquesDecisionCierre";
import { informesDeOportunidad } from "../../../../lib/informeCostes";
import { correosEnviados } from "../../../../lib/envioCorreo";
import { Miniaturas } from "../../../components/Miniaturas";
import { Completar } from "./Completar";
import { completitud, propuestaAdminComunidad, TEXTO_FALTA, type Falta } from "../../../../lib/completa";
import { opcionesEntrada } from "../../../../lib/entradaDiario";
import { BOTON, CAJA, CAMPO, ROTULO, ROT_CAJA } from "./estilo";
import { Salida } from "../../../components/Salida";
import { cabeceraDe } from "../../../../lib/cabeceraOpp";
import { recalcular } from "../../../../lib/estadoOportunidad";
import { aHoraMadrid, escaneoDe } from "../../../../lib/citas";
import { COLUMNAS_INTERES } from "../../../../lib/columnasInteres";
import { PASTILLA_PEDIR, TiraBloque1 } from "./Necesidades";
import { columnasDeInteres } from "../../../../lib/columnasInteres";
import { necesidadesDe } from "../../../../lib/necesidadesOpp";
import { datosPedirViabilidad } from "../../viabilidad-sin-polycam/datos";
import { PedirViabilidad } from "../../viabilidad-sin-polycam/PedirViabilidad";
import { DropboxAntiguo } from "./DropboxAntiguo";
import { OfertasComunidad, VISTAS_OFERTA, type VistaOferta } from "./OfertasComunidad";
import { SeguimientoNegociacion, VISTAS_NEGOCIACION, type VistaNegociacion } from "./SeguimientoNegociacion";
import { Bloque1, VISTAS_BLOQUE1, type VistaBloque1 } from "./Bloque1";
import { reservasDeAdministraciones } from "../../../../lib/bloque1";
import { negociacionDe } from "../../../../lib/negociacion";

export const dynamic = "force-dynamic";
// El informe del edificio sale de lo guardado; solo si no hay nada va a Catastro
// y al geoportal de Madrid, y eso tarda.
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


/** 2026-03-14 -> 14/03/26 */
function fechaCorta(v: string): string {
  const [a, m, d] = v.split("-");
  return `${d}/${m}/${a.slice(2)}`;
}

// LAS VISTAS DEL BLOQUE 1 (Monica, 6-oct-2026): "un switch de vista
// ficha/vista informe". Vendra una tercera ("apoyo comercial"): se anade aqui.
const VISTAS = [
  { clave: "ficha", rotulo: "Ficha" },
  { clave: "informe", rotulo: "Informe" },
] as const;

export default async function GestionOportunidad({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vista?: string; bloque?: string; ver?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const vista = sp.vista === "informe" ? "informe" : "ficha";
  // El bloque que se ESTA VIENDO, que no tiene por que ser por el que va la
  // oportunidad: el carril es menu ademas de indicador. Hoy hay pantalla para el
  // 1 y el 2, y el 3 y el 4 en crudo (15-oct-2026).
  const bloque = sp.bloque === "2" ? 2 : sp.bloque === "3" ? 3 : sp.bloque === "4" ? 4 : 1;
  // Lo elegido en el menu del bloque 2 (27-oct-2026). Sin nada, el bloque abre lo que pide atencion.
  const ver = (VISTAS_OFERTA as string[]).includes(sp.ver ?? "") ? (sp.ver as VistaOferta) : null;
  const ver3 = (VISTAS_NEGOCIACION as string[]).includes(sp.ver ?? "") ? (sp.ver as VistaNegociacion) : null;
  // Lo elegido en el menu del bloque 1 (29-oct-2026). Sin nada, el Catastro.
  const ver1 = (VISTAS_BLOQUE1 as string[]).includes(sp.ver ?? "") ? (sp.ver as VistaBloque1) : null;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/oportunidades/" + id);
  if (!puedeEntrar(yo, "comercial")) redirect("/menu");

  const [g, tipos] = await Promise.all([gestionOportunidad(id), catalogoTipos()]);
  if (!g) notFound();

  const pausada = g.estado === "pausada";
  // "Dicen que estan interesados en": los tipos marcados, con su nombre.
  const elegidos = tipos.filter((t) => g.tiposElegidos.includes(t.id));
  const quieren = elegidos.map((t) => t.nombre);
  // Lo que se puede anadir desde la cabecera: lo que se ofrece en el alta.
  const delAlta = new Set(COLUMNAS_INTERES.flatMap((c) => c.nombres));
  const paraAnadir = tipos.filter((t) => delAlta.has(t.nombre) && !g.tiposElegidos.includes(t.id));
  const [cab, escaneo, contactos, distrito, viabilidad, completa, necesita, pedir] = await Promise.all([
    // AL ABRIR LA FICHA se recalcula su paso (estado_oportunidad), y la cabecera
    // lo lee ya al dia.
    recalcular(id, "ficha").catch(() => undefined).then(() => cabeceraDe(id)),
    escaneoDe(id).catch(() => null),
    g.comunidadId ? contactosDeComunidad(g.comunidadId) : Promise.resolve([]),
    g.referenciaCatastral ? distritoDe(g.referenciaCatastral) : Promise.resolve(null),
    viabilidadDeOpp(id),
    // ¿Le falta algo de lo que exige el camino? (8-oct-2026). Si falla, la
    // ficha sale igual, sin el aviso.
    completitud(id).catch(() => ({ aplica: false, falta: [] as Falta[] })),
    // Que hace falta antes de darles precio: Polycam y viabilidad (15-oct-2026).
    bloque === 1 || bloque === 2 ? necesidadesDe(id).catch(() => null) : Promise.resolve(null),
    // Pedir viabilidad y costes al arquitecto sin Polycam (el formulario es del hilo grafico).
    bloque === 1 || bloque === 2 ? datosPedirViabilidad(id).catch(() => null) : Promise.resolve(null),
  ]);
  // Su administrador, a la comunidad, si la comunidad no tiene (8-oct-2026).
  const propuestaAdmin = await propuestaAdminComunidad(id).catch(() => null);
  // Las listas para completar, solo si hace falta completar: son largas.
  const paraCompletar = completa.falta.length ? await opcionesEntrada().catch(() => null) : null;
  const [documentacion, informes, enviados] =
    bloque === 2 || bloque === 3
      ? await Promise.all([documentacionDe(id), informesDeOportunidad(id).catch(() => []), correosEnviados(null, id).catch(() => [])])
      : bloque === 1
        ? [null, await informesDeOportunidad(id).catch(() => []), []]
        : [null, [], []];
  const decision = bloque === 3 || bloque === 4 ? await decisionCierreDe(id) : null;
  // BLOQUE 3 · SEGUIMIENTO Y NEGOCIACION (28-oct-2026): administradores con su comision, agenda de la comunidad, juntas
  // y cambios pedidos (lib/negociacion.ts).
  // En el bloque 1, sus administradores con su comision van en «Datos y contactos» (29-oct-2026).
  const negociacion = bloque === 3 || bloque === 1 ? await negociacionDe(id, g.direccion).catch(() => null) : null;
  const reservas = bloque === 1 && negociacion ? await reservasDeAdministraciones(negociacion.admins.map((a) => a.empresaId ?? "")).catch(() => new Map()) : new Map();
  // Las fotos de la opp, abajo del bloque 1 (15-oct-2026).
  const fotos = bloque === 1 || bloque === 2 ? await fotosDeOpp(id).catch(() => []) : [];
  // EL CAJON DE DOCUMENTOS (25-oct-2026): al lado de las fotos en el bloque 1, y debajo de lo suyo en los demas
  // (la orden de compra o el contrato llegan sobre todo despues de firmar).
  const [docsCajon, tiposDelCajon] = await Promise.all([cajonDeOpp(id).catch(() => []), tiposCajon().catch(() => [])]);
  const cajon = <CajonOpp oppId={id} docs={docsCajon} tipos={tiposDelCajon} />;
  const apartadoFotos =
    bloque === 1 ? (
      <>
        <FotosOpp oppId={id} fotos={fotos} />
        {cajon}
      </>
    ) : null;

  // «EL TRATO» (que le vendemos, precio, alcance y notas) salio de la pantalla el 27-oct-2026 con el bloque 2 nuevo:
  // «no se si lo van a usar». Los datos siguen guardados (negociacion_oportunidad); el formulario vive en el historial.

  // EL DIARIO: la nota nueva y lo que va pasando. En los bloques 1, 3 y 4 va en su columna crema; en el 2, integrado en
  // el mismo recuadro del bloque (Monica, 27-oct-2026, opcion B: «se ve el contenido sin generar ruido»).
  const diarioDentro = (
    <>
            <form action={accionEntrada.bind(null, id)} className="flex items-start gap-2">
              {/* Una linea que crece al escribir. */}
              <textarea
                name="texto"
                rows={1}
                required
                aria-label="Añadir una nueva nota"
                placeholder="Añadir una nueva nota"
                title="Cuéntalo como se lo contarías a un compañero. Puedes dictarlo con el micro de tu teclado."
                className={CAMPO + " max-h-[240px] min-h-[34px] resize-none leading-relaxed [field-sizing:content]"}
              />
              {/* SIN "CUANDO" NI "COMO TE HAS ENTERADO" (Monica, 15-oct-2026): esa
                  informacion ya va dentro del texto de la nota. Se guarda con la
                  fecha de hoy, como escrita. */}
              <input type="hidden" name="canal" value="escrito" />
              <button className={BOTON}>Guardar</button>
            </form>

            <section>
              <div className="px-2 pt-1">
                <div className={ROT_CAJA + " mb-1"}>Lo que va pasando</div>
              </div>
              {g.diario.length === 0 ? (
                <p className="px-2 pb-3 text-[13px] text-carbon/50">Todavía no hay nada grabado en esta oportunidad.</p>
              ) : (
                <ul className="max-h-[36rem] divide-y divide-black/10 overflow-y-auto">
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
                        <span className="rounded-full border border-black/5 bg-white/70 px-2 py-px text-[11px] font-semibold">{e.comoFue}</span>
                        {e.con && <span className="text-lima-dark">{e.con}</span>}
                      </div>
                    );
                    const TEXTO = "mt-1 whitespace-pre-line text-[14px] leading-snug text-carbon/80";
                    const largo = e.texto.length > 150 || e.texto.includes("\n");

                    if (e.enlazable) {
                      return (
                        <li key={e.id}>
                          <Link href={`/comercial/interaccion/${e.id}`} className="block px-2 py-2.5 transition hover:bg-black/[0.03]">
                            {cabecera}
                            <p className={TEXTO + " line-clamp-3"}>{e.texto}</p>
                          </Link>
                        </li>
                      );
                    }
                    if (!largo) {
                      return (
                        <li key={e.id} className="px-2 py-2.5">
                          {cabecera}
                          <p className={TEXTO}>{e.texto}</p>
                          <Miniaturas fotos={e.fotos} />
                        </li>
                      );
                    }
                    return (
                      <li key={e.id}>
                        <details className="group px-2 py-2.5 transition hover:bg-black/[0.03]">
                          <summary className="cursor-pointer list-none">
                            {cabecera}
                            <p className={TEXTO + " line-clamp-3 group-open:hidden"}>{e.texto}</p>
                            <span className="mt-0.5 inline-block text-[11px] font-semibold text-lima-dark group-open:hidden">
                              leer entera
                            </span>
                          </summary>
                          <p className={TEXTO}>{e.texto}</p>
                        </details>
                        <div className="-mt-2 px-2 pb-2.5">
                          <Miniaturas fotos={e.fotos} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
    </>
  );

  // El 3D y las juntas se editaban en la segunda fila del bloque 3; desde el 28-oct van dentro de «Lo que quieren» y de
  // «Juntas y reuniones» del bloque nuevo.
  const formulario3D = (
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
  );
  const editorJuntas = (
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
  );

  const tiraBloque1 =
    bloque === 1 && necesita ? (
            <TiraBloque1
              oppId={id}
              n={necesita}
              escaneo={escaneo ? aHoraMadrid(escaneo.inicio) : ""}
              polycamRecibido={(() => {
                const h = g.hitos.find((x) => x.clave === "polycam");
                return h?.estado === "hecho" ? (h.fecha ?? "") : null;
              })()}
              viabilidadRecibida={g.hitos.find((x) => x.clave === "viabilidad_arquitecto")?.estado === "hecho"}
              // La viabilidad, cuando la hay: Alex la empezo y el comercial la remata
              // en su pantalla (Monica, 6-oct-2026).
              viabilidad={
                viabilidad
                  ? {
                      // La historica (traida del Drive, 26-oct-2026) abre su PDF.
                      href: viabilidad.historica !== null ? `/comercial/viabilidad/${viabilidad.id}/pdf` : `/comercial/viabilidad/${viabilidad.id}`,
                      rotulo:
                        viabilidad.historica !== null
                          ? `Viabilidad${viabilidad.historica ? ` del ${new Date(viabilidad.historica).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" })}` : " (histórica)"}`
                          : `Viabilidad${viabilidad.numero ? ` ${viabilidad.numero} v${viabilidad.version}` : " (sin generar)"}`,
                    }
                  : null
              }
              pedir={
                // El boton solo cuando hace falta viabilidad y aun no ha llegado
                // el Polycam ni se ha pedido (pasos A, B, C y C').
                pedir && necesita.viabilidad && ["cerrar_visita", "esperando_visita", "enviar_polycam", "pedir_viabilidad"].includes(cab?.falta.clave ?? "") ? (
                  <PedirViabilidad {...pedir} rotulo="Pedir al arquitecto" claseBoton={PASTILLA_PEDIR} />
                ) : undefined
              }
            />
    ) : null;

  return (
    // El verde de su maqueta del bloque 1 (#8EB180), en todos los bloques
    // (Monica, 7-oct-2026).
    <div className="min-h-screen" style={{ background: "#8EB180" }}>
      <BarraSuperior />
      {/* EL LIENZO CRECE CON LA VENTANA, HASTA UN TOPE (Monica, 7-oct-2026).
          Parte de su esqueleto de 1300 y crece con la pantalla, con su margen
          de 24 a cada lado siempre puesto. A partir de 1600 de contenido se
          queda quieto y centrado: "centrado y con aire a los lados antes de
          estirarlo como una goma y que quede ilegible". Lo de pantallas
          grandes de verdad (el 27") se mira cuando se vea en ellas. */}
      <main className="mx-auto w-full max-w-[1648px] px-4 pb-16 pt-5 sm:px-6">
        {/* Ir a otra opp: el propio nombre de la opp hace de selector (15-oct-2026). */}
        <Salida href="/comercial?ver=oportunidades">← Oportunidades abiertas</Salida>

        {/* ------------------------- 1 · cabecera ------------------------- */}
        {cab && (
          <Cabecera
            id={id}
            g={g}
            cab={cab}
            contactos={contactos}
            intereses={elegidos.map((t) => ({ id: t.id, nombre: t.nombre }))}
            paraAnadir={paraAnadir.map((t) => ({ id: t.id, nombre: t.nombre }))}
            gruposAnadir={columnasDeInteres(paraAnadir)}
          />
        )}
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
        {/* LAS PESTAÑAS ARRIBA (Monica, 15-oct-2026): el carril de la izquierda se
            comia pantalla; asi el panel aprovecha todo el ancho. */}
        <div className="mt-3">
          {/* LAS PESTAÑAS LLEGAN HASTA EL DIARIO, y en el hueco de encima del diario
              va el estado con pausar y cerrar (Monica, 16-oct-2026, "reducir
              espacios"). El ancho es el del diario mas el borde del panel. */}
          <div className="grid items-end gap-[10px] xl:grid-cols-[minmax(0,1fr)_max(332px,calc(352px+(100%-1424px)/3))]">
            <Pestanas hitos={g.hitos} visto={bloque} id={id} />
            {cab && (
              <div className="mb-1.5">
                <Estado id={id} g={g} cab={cab} />
              </div>
            )}
          </div>
          <div
            // El panel azul relleno de la maqueta: "el fondo tiene que decir
            // esto que estas viendo ES el bloque 1".
            style={{ borderColor: AZUL, borderRadius: bloque === 1 ? "0 10px 10px 10px" : bloque === 4 ? "10px 0 10px 10px" : "10px", background: AZUL }}
            className="min-w-0 border p-[11px]"
          >

        {/* SUS ANCHOS: 278 · 346 · 190 · 246 en el lienzo de 1300, que salen
            del esqueleto del 30-sep (262 · 330 · 190 · 282) y de su reparto del
            7-oct. Cuando el lienzo crece, LO QUE SOBRA SE REPARTE A PARTES
            IGUALES entre el Catastro, los condicionantes y el diario: "no se lo
            daria todo al diario". Las fotos (190) "no necesitan crecer", y el
            carril va fuera de la rejilla. Por eso cada columna es su medida mas
            un tercio de lo que sobre: 1090 = 1060 de columnas + 30 de huecos.
            Las tres primeras las llena el informe del edificio; la cuarta, el
            diario. Y el trabajo que todavia no tiene bloque asignado va en una
            segunda fila, a lo ancho.

            Se colocan por rejilla y no por orden en el fichero, para no mover de
            sitio codigo que ya funciona. */}
        {/* LA TIRA DEL BLOQUE 1 (Monica, 16-oct-2026, "reducir espacios"): el 3D, el
            Polycam y la viabilidad en una linea crema sobre el contenido, y Ficha /
            Informe encima del diario. El codigo baja a la cabecera, y la referencia
            y el distrito a la card del Catastro. */}
        {/* LA TIRA DEL BLOQUE 1 va ahora dentro de su recuadro, sobre la banda gris (Bloque1, 29-oct-2026). El paso de
            «Ficha / Informe» es «3.2 Informe comercial» del menu. */}
        {/* LO QUE LE FALTA para seguir el camino (8-oct-2026): direccion,
            contacto y siguiente paso. Solo en las que se miran (2025 en
            adelante y sin hoja enviada o firmada). */}
        {propuestaAdmin && (
          <form
            action={accionAdminAComunidad.bind(null, id)}
            className="mb-[10px] flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#76749D]/40 bg-[#76749D]/10 px-4 py-2.5 text-[13px] text-carbon"
          >
            <span>
              Su comunidad no tiene administración. El administrador de esta oportunidad es <b>{propuestaAdmin.quien}</b>. ¿Lo pongo
              también como administración de la comunidad?
            </span>
            <button className="rounded-lg border border-[#76749D] bg-white px-4 py-1.5 text-[13px] font-bold text-[#4c4a73] transition hover:bg-[#76749D]/10">
              Sí, ponerlo
            </button>
          </form>
        )}
        {completa.falta.length > 0 && (
          <Completar
            id={id}
            falta={completa.falta.map((f) => ({ clave: f, texto: TEXTO_FALTA[f] }))}
            personas={paraCompletar?.personas ?? []}
          />
        )}
        {/* EL REPARTO (Monica, 16-oct-2026, "reducir espacios"): el diario parte de
            340 px en su lienzo de 1470 y sigue creciendo con la ventana como antes
            (un tercio de lo que sobre). El contenido lleva dentro su columna
            estrecha de lo visto y las imagenes. */}
        <div className="grid items-start gap-[10px] xl:grid-cols-[minmax(0,1fr)_max(320px,calc(340px+(100%-1400px)/3))]">
          {bloque === 1 ? (
            // BLOQUE 1 · TOMA DE DATOS, con su menu como el 2 y el 3 (29-oct-2026).
            <div className="min-w-0 xl:col-span-2">
              <Bloque1
                id={id}
                ver={ver1}
                tira={tiraBloque1}
                referencia={g.referenciaCatastral}
                distrito={distrito}
                comunidadId={g.comunidadId}
                admins={negociacion?.admins ?? []}
                reservas={reservas}
                contactos={contactos}
                trajo={g.trajo}
                informes={informes}
                fotos={<FotosOpp oppId={id} fotos={fotos} />}
                nFotos={fotos.length}
                cajon={cajon}
                nDocs={docsCajon.length}
                diario={<div className="flex flex-col gap-2 text-[13px]">{diarioDentro}</div>}
              />
            </div>
          ) : bloque === 2 && documentacion ? (
            // BLOQUE 2 · OFERTAS A LA COMUNIDAD (27-oct-2026): menu, contenido y diario en un solo recuadro, a todo el ancho.
            <div className="min-w-0 xl:col-span-2">
              <OfertasComunidad
                id={id}
                ver={ver}
                d={documentacion}
                necesita={necesita}
                pedir={pedir}
                faltaClave={cab?.falta.clave ?? null}
                polycamRecibido={(() => {
                  const h = g.hitos.find((x) => x.clave === "polycam");
                  return h?.estado === "hecho" ? (h.fecha ?? "") : null;
                })()}
                escaneo={escaneo ? aHoraMadrid(escaneo.inicio) : ""}
                referencia={g.referenciaCatastral}
                informes={informes}
                enviados={enviados}
                fotos={<FotosOpp oppId={id} fotos={fotos} />}
                cajon={cajon}
                diario={<div className="flex flex-col gap-2 text-[13px]">{diarioDentro}</div>}
              />
            </div>
          ) : bloque === 3 && documentacion && negociacion && decision ? (
            <div className="min-w-0 xl:col-span-2">
              <SeguimientoNegociacion
                id={id}
                ver={ver3}
                nombreOpp={g.direccion}
                d={documentacion}
                neg={negociacion}
                contactos={contactos}
                trajo={g.trajo}
                quieren={quieren}
                referencia={g.referenciaCatastral}
                polycam={(() => {
                  const h = g.hitos.find((x) => x.clave === "polycam");
                  return h?.estado === "hecho" ? (h.fecha ?? "") : null;
                })()}
                tresD={g.tresD}
                enviados={enviados}
                diario={<div className="flex flex-col gap-2 text-[13px]">{diarioDentro}</div>}
                cierres={decision.cierres}
                formulario3D={formulario3D}
                editorJuntas={editorJuntas}
              />
            </div>
          ) : decision ? (
            // El bloque 4, en crudo: cada campo con donde vive (15-oct-2026). Pasa a ser el del cobro (28-oct).
            <div className="flex min-w-0 flex-col gap-[10px] xl:col-span-1">
              <Bloque4 d={decision} />
              {cajon}
            </div>
          ) : g.referenciaCatastral && vista === "informe" ? (
            // El anexo tal cual sale en la viabilidad: lo que ve el cliente.
            <div className="xl:col-span-1">
              <iframe
                src={`/comercial/oportunidades/${id}/anexo#view=FitH`}
                title="Informe del edificio"
                className="h-[1000px] w-full rounded-[10px] border border-carbon/20 bg-white"
              />
            </div>
          ) : g.referenciaCatastral ? (
            // EL EDIFICIO LLEGA DESPUES (Monica, 27-oct-2026: «abrir la ficha, este o no el dato de Catastro, y que se
            // complete y se vea despues»). Si le faltan datos sale a Catastro y al geoportal, y eso tardaba hasta dos
            // minutos con la pantalla quieta. Ahora la ficha se pinta ya y el edificio entra cuando llega.
            <Suspense
              fallback={
                <div className="flex min-w-0 flex-col gap-[10px]">
                  {["Lo que dice el Catastro", "Lo que condiciona lo que puedo pedir", "Lo que condiciona lo que puedo hacer"].map((t) => (
                    <div key={t} className="flex items-baseline gap-2 rounded-[10px] border border-[#d9d9d9] bg-white px-[11px] py-[9px]">
                      <span className="w-3 text-[11px] text-[#c4c4c4]">▶</span>
                      <span className="text-[13px] font-bold uppercase tracking-[0.05em] text-[#b0b0b0]">{t}</span>
                    </div>
                  ))}
                  <p className="animate-pulse px-1 text-[12px] text-[#8a8a8a]">Trayendo el edificio de Catastro…</p>
                  {apartadoFotos}
                </div>
              }
            >
              <Edificio referencia={g.referenciaCatastral} id={id} fotos={apartadoFotos} distrito={distrito} />
            </Suspense>
          ) : (
            <div className="flex min-w-0 flex-col gap-[10px]">
              <div className="rounded-[10px] border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-[12px] leading-snug text-amber-900/80">
                <b>Todavía no hay edificio que mirar.</b> Esta oportunidad no tiene referencia
                catastral, así que no se puede traer ni el Catastro, ni la zona, ni las
                subvenciones. Se arregla fijando la dirección.
              </div>
              {apartadoFotos}
            </div>
          )}


          {/* ============ cuarta columna: 7 · el diario de esta opp ============
              La nota nueva y lo que va pasando, bajo un mismo fondo crema: "ahorro
              sitio y da continuidad" (Monica, 16-oct-2026). */}
          {bloque !== 1 && bloque !== 2 && bloque !== 3 && (
          <div className="flex min-w-0 flex-col gap-2 rounded-[10px] bg-[#fbf3d9] p-2 xl:col-start-2 xl:row-start-1">
            {diarioDentro}
          </div>
          )}
        </div>
          </div>
          {/* Lo antiguo de Dropbox, debajo de los bloques (19-oct-2026). */}
          <DropboxAntiguo ficha={g.dropboxFicha} carpeta={g.dropboxCarpeta} />
        </div>
      </main>
    </div>
  );
}
