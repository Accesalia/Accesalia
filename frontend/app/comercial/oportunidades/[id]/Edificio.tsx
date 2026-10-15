import { ascensorDe, ieeDe, informeEdificio } from "../../../../lib/informeEdificio";
import { accionAscensor, accionPortal } from "./acciones";
import { Patios } from "./Patios";
import { ConsultarIee } from "./ConsultarIee";
import { VolverAConsultar } from "./VolverAConsultar";

// EL EDIFICIO, DENTRO DEL BLOQUE 1 (Monica, 5-oct-2026).
//
// "Esta pantalla es exactamente lo que visualiza lo del catastro, las zonas, las
// subvenciones... es lo que se debe ver."
//
// Nada de esto es nuevo: es el informe que ya existe en /comercial/edificio, que
// consulta Catastro y el geoportal de Madrid y esta probado contra los servicios
// reales. Aqui se vuelca dentro de la oportunidad, repartido en sus tres
// rotulos, que son los que mandan y llevan SU color:
//
//   Lo que dice el CATASTRO              #104269  lo que hay
//   Lo que condiciona lo que puedo HACER #820707  lo que me ata
//   Lo que condiciona lo que puedo PEDIR #0C8124  lo que me da dinero
//
// La pantalla del edificio NO desaparece: se abre por referencia catastral y
// vive sin oportunidad -"dime una direccion tuya y te digo como esta", delante
// del administrador-. Un mismo informe, dos puertas.

// LOS COLORES DE SU MAQUETA (docs/figma/bloque1-toma-de-datos.html), con sus
// valores tal cual (Monica, 7-oct-2026: "lo que se creo se aleja mucho de la
// maqueta").
const ROT = "text-[12px] font-bold uppercase tracking-[0.05em] underline underline-offset-2";
const ROT_GRIS = "text-[10px] font-bold uppercase tracking-[0.09em] text-[#8a8a8a]";
const CAJA = "rounded-[10px] border border-[#d9d9d9] bg-white px-[13px] py-[11px]";
// Las dos cards del centro llevan el borde de SU color, y algo mas de aire.
const CARD = "rounded-[10px] bg-white px-[15px] py-[13px] border";
// "La banda del titulo": cada subtitulo con el color de SU tarjeta -azul lo del
// Catastro, rojo lo que condiciona, verde lo que se puede pedir-, tinte flojo y
// borde a todo color. Asi se sabe de que familia es sin leerlo.
const BANDA = {
  catastro: "border-[#104269] bg-[#E3EAF0] text-[10px] uppercase tracking-[0.09em]",
  hacer: "border-[#820707] bg-[#F7EAEA] text-[11.5px]",
  pedir: "border-[#0C8124] bg-[#E9F3EC] text-[11.5px]",
};
type Familia = keyof typeof BANDA;
function Banda({ familia, children }: { familia: Familia; children: React.ReactNode }) {
  return <div className={`mb-1.5 rounded-[5px] border px-[7px] py-[3px] font-bold text-[#1c1c1c] ${BANDA[familia]}`}>{children}</div>;
}
const ENLACE = "text-[11.5px] text-[#1c1c1c] underline underline-offset-2 hover:text-[#104269]";
// Lo que no se ha podido traer: el hueco gris punteado de la maqueta.
const HUECO = "grid aspect-square w-full place-items-center rounded-[10px] border border-dashed border-[#cfcfcf] bg-[#fafafa] px-2 text-center text-[11px] text-[#9a9a9a]";

/** Una fila de las tres cards: campo, dato y lo que significa (y su enlace). */
type FilaDato = {
  que: string;
  valor: string;
  significa?: string;
  falta?: boolean;
  enlace?: { texto: string; url: string };
  tono?: "rojo" | "verde";
  /** Algo que se hace desde la fila (el boton de consultar la IEE). */
  extra?: React.ReactNode;
};

/** LO QUE HEMOS VISTO NOSOTROS. Los dos en paralelo, separados por su linea
 *  verde, tal como los dibujo: no es un aviso de que falte algo, es el sitio
 *  donde se apunta lo que no dice ningun servicio. Por eso NO va en ambar.
 *
 *  El que esta puesto va en negrita y el otro en gris; si no se sabe, los dos en
 *  gris. Y debajo la firma, que es lo que lo hace fiable: quien lo vio y cuando. */
function Visto({
  que,
  hay,
  quien,
  cuando,
  marcar,
  campo = "ascensor",
}: {
  que: string;
  /** El nombre con el que lo lee su accion ("ascensor", "portal"). */
  campo?: string;
  hay: boolean | null;
  quien?: string | null;
  cuando?: string | null;
  /** Al pulsar Si o No se guarda; pulsar el que ya esta puesto lo quita. */
  marcar: (fd: FormData) => Promise<void>;
}) {
  // EN FILA (Monica, 15-oct-2026, su captura "lo que hemos visto"): la pregunta a
  // la izquierda; el Si / No y debajo quien lo vio, a la derecha.
  return (
    <form action={marcar} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
      <div className="pt-px text-[12.5px] font-bold text-[#14781E]">{que}</div>
      <div className="text-center">
        <div className="flex items-baseline justify-center gap-[5px] text-[12px]">
          <button name={campo} value={hay === true ? "" : "si"} className={BOT(hay === true) + " hover:border-[#2b2b2b]"}>
            Sí
          </button>
          <button name={campo} value={hay === false ? "" : "no"} className={BOT(hay === false) + " hover:border-[#2b2b2b]"}>
            No
          </button>
        </div>
        <p className="mt-[3px] text-[11px] leading-[1.3] text-[#8a8a8a]">
          {quien ? (
            <>
              {quien}
              {cuando && <> el {cuando.slice(8, 10)}/{cuando.slice(5, 7)}</>}
            </>
          ) : (
            "sin mirar"
          )}
        </p>
      </div>
    </form>
  );
}

/** El boton Si / No de la maqueta: el que esta puesto, oscuro. */
const BOT = (on: boolean) =>
  "rounded-[5px] border px-2 py-px text-[11.5px] " +
  (on ? "border-[#2b2b2b] bg-[#2b2b2b] font-bold text-white" : "border-[#bdbdbd] bg-white text-[#5a5a5a]");

const EUR = new Intl.NumberFormat("es-ES");

/** Ocupa las TRES primeras columnas de la rejilla de la pantalla; la cuarta -el
 *  diario- la pone ella.
 *
 *  REORDENADO EL 15-OCT-2026 sobre su maqueta ("propusta para reordenar bloque
 *  1"), sin tocar el contenido, solo de sitio:
 *    - arriba, las IMAGENES en una tira, y a su lado el 3D (lo unico nuevo) sobre
 *      LO QUE HEMOS VISTO NOSOTROS (ascensor y patios);
 *    - en medio, LO QUE CONDICIONA LO QUE PUEDO HACER y LO QUE DICE EL CATASTRO,
 *      con el edificio y los usos en paralelo en vez de apilados;
 *    - abajo, a lo ancho, LO QUE CONDICIONA LO QUE PUEDO PEDIR: el IEE y la zona a
 *      la izquierda; lo ya concedido aqui y a 800 m, con su tabla, a la derecha. */
export async function Edificio({
  referencia,
  id,
  fotos,
}: {
  referencia: string;
  id: string;
  /** El apartado de fotos de la opp, abajo del todo. */
  fotos?: React.ReactNode;
}) {
  const [i, asc, iee] = await Promise.all([
    informeEdificio(referencia),
    ascensorDe(referencia),
    ieeDe(referencia),
  ]);
  return <EdificioVista i={i} asc={asc} iee={iee} referencia={referencia} id={id} fotos={fotos} />;
}

/** Lo que se ve, con los datos ya traidos: aparte para poder mirarlo con datos de muestra. */
export function EdificioVista({
  i,
  asc,
  iee,
  referencia,
  id,
  fotos,
}: {
  i: Awaited<ReturnType<typeof informeEdificio>>;
  asc: Awaited<ReturnType<typeof ascensorDe>>;
  iee: Awaited<ReturnType<typeof ieeDe>>;
  referencia: string;
  id: string;
  fotos?: React.ReactNode;
}) {

  // Catastro puede no contestar, o la referencia puede estar mal escrita. Eso se
  // DICE, no se esconde, y se dice donde iba el informe.
  if (!i)
    return (
      <div className="rounded-[10px] border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-[12px] leading-snug text-amber-900/80 xl:col-span-1">
        <b>No se ha podido traer el edificio.</b> O no contesta Catastro, o la referencia{" "}
        <span className="font-mono">{referencia}</span> no existe. Si no la encuentra, casi siempre
        es que la dirección está mal escrita.
        <div className="mt-2">
          <VolverAConsultar oppId={id} referencia={referencia} />
        </div>
      </div>
    );

  const de = (titulo: string) => i.secciones.find((s) => s.titulo === titulo)?.datos ?? [];

  // LOS PATIOS, EN LOS DATOS DEL EDIFICIO, con lo que se apunto abajo en "lo
  // que hemos visto nosotros" (Monica, 7-oct-2026): "deberia reflejar el
  // resultado, aunque no venga de Catastro". Catastro no los da; el informe
  // solo decia "miralos en el croquis".
  const patios = (d: (typeof i.secciones)[number]["datos"][number]) =>
    d.que !== "Patios"
      ? d
      : asc.patios === null
        ? { ...d, valor: "Pendiente de ver", falta: true }
        : { que: d.que, valor: asc.patios === 0 ? "No" : String(asc.patios) };
  const edificio = de("El edificio").map(patios);
  const usos = de("Los usos");
  const hacer = [...de("Restricciones"), ...de("Protección")];
  // La fila "¿Tiene IEE registrada?" del informe era un hueco con la nota
  // "consulta pendiente de montar". Ya esta montada aqui arriba, con el dato de
  // verdad, asi que se quita de la lista para no decirlo dos veces.
  const pedir = de("Dinero: a qué ayudas entra").filter((d) => !/IEE/i.test(d.que));
  // Lo concedido (aqui y a 800 m, y el CO2 de eso) va a la derecha, con su tabla.
  const esConcedido = (d: { que: string }) => /concedi|CO₂/i.test(d.que);
  const pedirZona = pedir.filter((d) => !esConcedido(d));
  const pedirConcedido = pedir.filter(esConcedido);

  // EL IEE, en filas como todo lo demas (Monica, 15-oct-2026). Dos lecturas
  // suyas: el filon son las FAVORABLES pendientes de accesibilidad -"al estar su
  // informe favorable, nadie les esta mirando"-, y "ajustes razonables = NO es la
  // senal de compra", porque significa que la obra pasa de tres veces la cuota.
  const filasIee: FilaDato[] = !iee
    ? [
        {
          que: "IEE",
          valor: "no nos consta",
          falta: true,
          significa: "Solo sabemos de los edificios que ha barrido el radar del registro. Que no conste no quiere decir que no lo tengan.",
          // Se pregunta aposta por esta direccion (15-oct-2026).
          extra: <ConsultarIee oppId={id} />,
        },
      ]
    : [
        {
          que: "IEE",
          valor: ["Sí", iee.fecha ? iee.fecha.split("-").reverse().join("/") : null, iee.valoracion?.toLowerCase() ?? null].filter(Boolean).join(" · "),
          tono: iee.valoracion?.toLowerCase().startsWith("desfav") ? "rojo" : undefined,
        },
        {
          que: "Accesibilidad",
          valor: iee.accesibilidadCumple === null ? "—" : iee.accesibilidadCumple ? "cumple" : "no cumple",
          falta: iee.accesibilidadCumple === null,
          significa:
            iee.accesibilidadCumple === false && iee.valoracion?.toLowerCase().startsWith("favo")
              ? "Informe favorable con la accesibilidad sin resolver: nadie les está mirando."
              : undefined,
        },
        {
          que: "Ajustes razonables",
          valor: iee.admiteAjustes === null ? "—" : iee.admiteAjustes ? "los admite" : "NO los admite",
          falta: iee.admiteAjustes === null,
          tono: iee.admiteAjustes === false ? "verde" : undefined,
          significa: iee.admiteAjustes === false ? "Es la señal de compra: la obra pasa de tres veces la cuota, así que van a querer la subvención." : undefined,
        },
        { que: "Calificación energética", valor: iee.energetica ?? "—", falta: !iee.energetica },
      ];

  /** UNA FILA A LO ANCHO, igual en las tres cards (Monica, 15-oct-2026: "la ficha
   *  del catastro ahora se predigiere en la pantalla antes de llegar a los ojos"):
   *  el campo, el dato, y lo que añadimos nosotros (lo que significa, y el enlace
   *  para comprobarlo si lo hay). */
  const fila = (d: FilaDato) => (
    <tr key={d.que} className="align-top">
      <td className="border-b border-[#eef0f2] py-[3px] pr-3 text-[12px] text-[#6e6e6e]">{d.que}</td>
      <td
        className={
          "border-b border-[#eef0f2] py-[3px] pr-4 text-[12px] font-semibold " +
          (d.falta ? "text-[#8a8a8a]" : d.tono === "rojo" ? "text-[#820707]" : d.tono === "verde" ? "text-[#0C8124]" : "text-[#1c1c1c]")
        }
      >
        {d.valor}
      </td>
      <td className="border-b border-[#eef0f2] py-[3px] text-[11.5px] leading-snug text-[#2B6CB0]">
        {d.significa ?? ""}
        {d.enlace && (
          <a href={d.enlace.url} target="_blank" rel="noreferrer" className={(d.significa ? "ml-2 " : "") + "whitespace-nowrap font-semibold text-[#820707] underline underline-offset-2"}>
            {d.enlace.texto} ↗
          </a>
        )}
        {d.extra}
      </td>
    </tr>
  );
  const grupo = (familia: Familia, titulo: string, datos: FilaDato[]) =>
    datos.length > 0 && (
      <tbody key={titulo}>
        <tr>
          <td colSpan={3} className="pb-1 pt-2.5">
            <Banda familia={familia}>{titulo}</Banda>
          </td>
        </tr>
        {datos.map(fila)}
      </tbody>
    );
  /** La tabla de las tres columnas, con el mismo ancho de columnas en las tres cards. */
  const tabla = (grupos: React.ReactNode) => (
    <table className="w-full border-collapse">
      <colgroup>
        <col className="w-[200px]" />
        <col className="w-[30%]" />
        <col />
      </colgroup>
      {grupos}
    </table>
  );

  return (
    <div className="flex min-w-0 flex-col gap-[10px] xl:col-span-1">
      {/* ================= arriba: las imágenes · lo que hemos visto ================= */}
      <div className="grid gap-[10px] lg:grid-cols-[minmax(0,2.4fr)_minmax(280px,1fr)]">
        <section className={CAJA}>
          <div className={ROT_GRIS}>Las imágenes</div>
          <div className="mt-2 grid grid-cols-3 gap-2.5">
            {[
              { que: "Croquis catastral", src: i.croquis },
              { que: "Vista aérea", src: i.aerea },
            ].map((x) => (
              <div key={x.que}>
                {x.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={x.src} alt={x.que} className="aspect-square w-full rounded-[10px] border border-[#d9d9d9] object-cover" />
                ) : (
                  <div className={HUECO}>no se ha podido traer</div>
                )}
                <div className="mt-0.5 text-center text-[10px] text-[#9a9a9a]">{x.que}</div>
              </div>
            ))}
            <div>
              <div className={HUECO}>Polycam · llega solo por el buzón</div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <a href={i.visorCatastro} target="_blank" rel="noreferrer" className={ENLACE}>
              Visor oficial del Catastro
            </a>
            {i.pdfs.slice(0, 4).map((p) => (
              <a key={p.url} href={p.url} target="_blank" rel="noreferrer" className={ENLACE}>
                {p.que} (PDF)
              </a>
            ))}
          </div>
        </section>

        {/* Lo que no dice ningun servicio: lo vimos nosotros, y por eso va firmado
            con quien y cuando. En filas (15-oct-2026), con el portal accesible. */}
        <section className="rounded-[10px] bg-[#E4EED9] px-3 py-2.5">
          <div className="border-b border-[#1c1c1c]/15 pb-1 text-[12px] font-bold uppercase tracking-[0.09em] text-[#1c1c1c] underline underline-offset-2">
            Lo que hemos visto nosotros
          </div>
          <div className="mt-2.5 flex flex-col gap-3">
            <Visto que="¿Tiene ascensor?" hay={asc.hay} quien={asc.quien} cuando={asc.cuando} marcar={accionAscensor.bind(null, referencia, id)} />
            {/* EL PORTAL ACCESIBLE (Monica, 15-oct-2026): si tiene escalones,
                dentro o fuera, se le vende una rampa o una plataforma. */}
            <Visto
              que="¿Portal accesible?"
              campo="portal"
              hay={asc.portal}
              quien={asc.portalQuien}
              cuando={asc.portalCuando}
              marcar={accionPortal.bind(null, referencia, id)}
            />
            {/* Los patios SE RELLENAN aqui: un numero, no un si/no -su maqueta
                pregunta "¿cuantos?"-, y se guarda firmado. */}
            <Patios referencia={referencia} id={id} patios={asc.patios} quien={asc.patiosQuien} cuando={asc.patiosCuando} />
          </div>
        </section>
      </div>

      {/* ======== las tres cards, iguales y a lo ancho (Monica, 15-oct-2026) ========
          Campo · lo que dice · lo que añadimos nosotros. Catastro, pedir, hacer. */}
      <section className={CAJA}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <div className={ROT + " mb-[3px] text-[#104269]"}>Lo que dice el Catastro</div>
          {/* Solo si falta algo: si esta todo, no se ofrece (15-oct-2026). */}
          {i.fallos.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-amber-900/80">
              <span>No se pudo traer: {i.fallos.join(" · ")}</span>
              <VolverAConsultar oppId={id} referencia={referencia} />
            </div>
          )}
        </div>
        {tabla(
          <>
            {grupo("catastro", "El edificio", edificio)}
            {grupo("catastro", "Usos", usos)}
          </>,
        )}
      </section>

      <section className={CARD + " border-[#0C8124]"}>
        <div className={ROT + " mb-[3px] text-[#0C8124]"}>Lo que condiciona lo que puedo pedir</div>
        {tabla(
          <>
            {grupo("pedir", "IEE", filasIee)}
            {grupo("pedir", "Zona y ayudas", pedirZona)}
            {grupo("pedir", "Lo ya concedido", pedirConcedido)}
          </>,
        )}
        {/* Lo que han cobrado los de al lado, debajo y a lo ancho: es el argumento
            de venta, no un adorno. "Sus vecinos han accedido a subvencion de tal y
            ellos solo a X." */}
        {i.subvencionesCerca.length > 0 && (
          <div className="mt-3 rounded-[8px] border border-[#d9d9d9] px-2.5 py-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2">
              <div className={ROT_GRIS}>Subvenciones ya concedidas a menos de 800 m</div>
              <div className="text-[12.5px]">
                <b>{EUR.format(Math.round(i.subvencionesCerca.reduce((t, s) => t + (s.importe ?? 0), 0)))} €</b>
                <span className="text-[11px] text-[#8a8a8a]"> en {i.subvencionesCerca.length} obras</span>
              </div>
            </div>
            <table className="mt-1 w-full border-collapse text-[11.5px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.07em] text-[#8a8a8a]">
                  <th className="border-b border-[#e2e2e2] px-1.5 py-[2px] text-left font-bold">Dirección</th>
                  <th className="border-b border-[#e2e2e2] px-1.5 py-[2px] text-right font-bold">Concedido</th>
                  <th className="border-b border-[#e2e2e2] px-1.5 py-[2px] text-right font-bold">Viviendas</th>
                  <th className="border-b border-[#e2e2e2] px-1.5 py-[2px] pl-4 text-left font-bold">Convocatoria</th>
                  <th className="border-b border-[#e2e2e2] px-1.5 py-[2px] text-right font-bold">Año</th>
                </tr>
              </thead>
              <tbody>
                {i.subvencionesCerca.slice(0, 8).map((s, n) => (
                  <tr key={n}>
                    <td className="border-b border-[#f0f0f0] px-1.5 py-[2px]">{s.direccion}</td>
                    <td className="border-b border-[#f0f0f0] px-1.5 py-[2px] text-right tabular-nums">
                      {s.importe === null ? "—" : `${EUR.format(Math.round(s.importe))} €`}
                    </td>
                    <td className="border-b border-[#f0f0f0] px-1.5 py-[2px] text-right tabular-nums">{s.viviendas ?? ""}</td>
                    <td className="border-b border-[#f0f0f0] px-1.5 py-[2px] pl-4 text-[#4a4a4a]">{s.convocatoria ?? "—"}</td>
                    {/* El año de la concesion: sale de la tabla de subvenciones, siempre (15-oct-2026). */}
                    <td className="border-b border-[#f0f0f0] px-1.5 py-[2px] text-right tabular-nums text-[#4a4a4a]">{s.anio ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={CARD + " border-[#820707]"}>
        <div className={ROT + " mb-[3px] text-[#820707]"}>Lo que condiciona lo que puedo hacer</div>
        {hacer.length === 0 ? (
          <p className="mt-1 text-[11px] text-[#8a8a8a]">Nada que lo ate, o no se ha podido consultar.</p>
        ) : (
          tabla(
            <>
              {grupo("hacer", "Restricciones", de("Restricciones"))}
              {grupo("hacer", "Protección", de("Protección"))}
            </>,
          )
        )}
      </section>

      {/* ================= las fotos de la opp, abajo del todo ================= */}
      {fotos}
    </div>
  );
}
