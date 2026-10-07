import { ascensorDe, ieeDe, informeEdificio } from "../../../../lib/informeEdificio";
import { accionPatios } from "./acciones";

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

/** Un dato del informe: etiqueta a la izquierda, valor a la derecha, y debajo su
 *  traduccion, que es lo que lo hace util ("con ese porcentaje entrais en
 *  Rehabilita").
 *
 *  Lo que falta se dice -no se esconde- pero en GRIS, no en ambar. Ella,
 *  5-oct-2026, mirando la columna del Catastro: "¿ambar? en la columna 1 no
 *  estan asi". En su maqueta lo que no se sabe es una raya gris y ya: el ambar
 *  de la guia de estilo es para un hueco que hay que rellenar, y esto es un dato
 *  que el Catastro no da. */
function Dato({ que, valor, significa, falta }: { que: string; valor: string; significa?: string; falta?: boolean }) {
  return (
    <div className="py-px">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-[12px]">
        <span className="text-[#6e6e6e]">{que}</span>
        <span className={"font-semibold " + (falta ? "text-[#8a8a8a]" : "text-[#1c1c1c]")}>{valor}</span>
      </div>
      {significa && <p className="mt-0.5 text-[11px] leading-snug text-[#2B6CB0]">{significa}</p>}
    </div>
  );
}

/** Un dato de las cards del centro, como en la maqueta: su nombre en la banda
 *  de la familia y debajo el valor. */
function Sub({ familia, que, valor, significa, falta }: { familia: Familia; que: string; valor: string; significa?: string; falta?: boolean }) {
  return (
    <div className="mb-[11px] last:mb-0">
      <Banda familia={familia}>{que}</Banda>
      <div className={"pl-0.5 text-[12px] leading-[1.4] " + (falta ? "text-[#8a8a8a]" : "text-[#1c1c1c]")}>{valor}</div>
      {significa && <p className="mt-0.5 pl-[13px] text-[11px] leading-snug text-[#2B6CB0]">{significa}</p>}
    </div>
  );
}

/** LO QUE HEMOS VISTO NOSOTROS. Los dos en paralelo, separados por su linea
 *  verde, tal como los dibujo: no es un aviso de que falte algo, es el sitio
 *  donde se apunta lo que no dice ningun servicio. Por eso NO va en ambar.
 *
 *  El que esta puesto va en negrita y el otro en gris; si no se sabe, los dos en
 *  gris. Y debajo la firma, que es lo que lo hace fiable: quien lo vio y cuando. */
function Visto({
  que,
  hay,
  cuantos,
  quien,
  cuando,
}: {
  que: string;
  hay: boolean | null;
  cuantos?: number | null;
  quien?: string | null;
  cuando?: string | null;
}) {
  return (
    <div>
      <div className="mb-1 text-[12px] font-bold text-[#14781E]">{que}</div>
      <div className="flex items-baseline gap-[5px] text-[12px]">
        <span className={BOT(hay === true)}>Sí</span>
        <span className={BOT(hay === false)}>No</span>
        {cuantos !== undefined && (
          <span className="flex items-baseline gap-1.5">
            <span className="text-[11px] text-carbon/50">¿cuántos?</span>
            <span className="inline-block min-w-[34px] rounded-[5px] border border-[#bdbdbd] px-1.5 py-px text-center text-[11.5px] text-carbon">
              {cuantos ?? ""}
            </span>
          </span>
        )}
      </div>
      <p className="mt-[5px] text-[11px] leading-[1.3] text-[#8a8a8a]">
        {quien ? (
          <>
            lo vio {quien}
            {cuando && <> el {cuando.slice(8, 10)}/{cuando.slice(5, 7)}</>}
          </>
        ) : (
          "sin mirar"
        )}
      </p>
    </div>
  );
}

/** El boton Si / No de la maqueta: el que esta puesto, oscuro. */
const BOT = (on: boolean) =>
  "rounded-[5px] border px-2 py-px text-[11.5px] " +
  (on ? "border-[#2b2b2b] bg-[#2b2b2b] font-bold text-white" : "border-[#bdbdbd] bg-white text-[#5a5a5a]");

const EUR = new Intl.NumberFormat("es-ES");

/** Devuelve las TRES primeras columnas de su rejilla: 278 · 346 · 190. La cuarta
 *  -el diario- la pone la pantalla. */
export async function Edificio({ referencia, id }: { referencia: string; id: string }) {
  const [i, asc, iee] = await Promise.all([
    informeEdificio(referencia),
    ascensorDe(referencia),
    ieeDe(referencia),
  ]);

  // Catastro puede no contestar, o la referencia puede estar mal escrita. Eso se
  // DICE, no se esconde, y se dice donde iba el informe.
  if (!i)
    return (
      <div className="rounded-[10px] border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-[12px] leading-snug text-amber-900/80 xl:col-span-3">
        <b>No se ha podido traer el edificio.</b> O no contesta Catastro, o la referencia{" "}
        <span className="font-mono">{referencia}</span> no existe. Si no la encuentra, casi siempre
        es que la dirección está mal escrita.
      </div>
    );

  const de = (titulo: string) => i.secciones.find((s) => s.titulo === titulo)?.datos ?? [];

  const edificio = de("El edificio");
  const usos = de("Los usos");
  const hacer = [...de("Restricciones"), ...de("Protección")];
  // La fila "¿Tiene IEE registrada?" del informe era un hueco con la nota
  // "consulta pendiente de montar". Ya esta montada aqui arriba, con el dato de
  // verdad, asi que se quita de la lista para no decirlo dos veces.
  const pedir = de("Dinero: a qué ayudas entra").filter((d) => !/IEE/i.test(d.que));

  return (
    <>
      {/* ---------------- 278 · lo que dice el Catastro ---------------- */}
      <section className={CAJA}>
        <div className={ROT + " mb-[7px] text-[#104269]"}>Lo que dice el Catastro</div>
        <div className="mb-2.5">
          <Banda familia="catastro">El edificio</Banda>
          {edificio.map((d) => (
            <Dato key={d.que} {...d} />
          ))}
        </div>
        {usos.length > 0 && (
          <div className="mb-2.5">
            <Banda familia="catastro">Usos</Banda>
            {usos.map((d) => (
              <Dato key={d.que} {...d} />
            ))}
          </div>
        )}

        {/* Lo que no dice ningun servicio: lo vimos nosotros, y por eso va
            firmado con quien y cuando. */}
        <div className="rounded-[8px] bg-[#E4EED9] px-[9px] py-[7px]">
          <div className="text-[12px] font-bold uppercase tracking-[0.09em] text-[#1c1c1c] underline underline-offset-2">Lo que hemos visto nosotros</div>
          <div className="mt-1.5 grid grid-cols-[1fr_1px_1fr] gap-x-[11px]">
            <Visto que="Ascensor" hay={asc.hay} quien={asc.quien} cuando={asc.cuando} />
            <div className="bg-[#438538]" />
            {/* Los patios son un NUMERO, no un si/no: su maqueta pregunta
                "¿cuantos?". El 0 es un dato -no tiene- y el nulo es otro. */}
            {/* Los patios SE RELLENAN aqui: es el unico dato de esta columna que
                no viene de fuera. Un numero, no un si/no -su maqueta pregunta
                "¿cuantos?"-, y se guarda firmado. */}
            <form action={accionPatios.bind(null, referencia, id)}>
              <div className="mb-1 text-[12px] font-bold text-[#14781E]">Patios</div>
              <div className="flex items-baseline gap-[5px] text-[12px]">
                <span className={BOT(asc.patios !== null && asc.patios > 0)}>Sí</span>
                <span className={BOT(asc.patios === 0)}>No</span>
              </div>
              <div className="mt-[5px] flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[11.5px]">
                <span className="text-[#8a8a8a]">¿cuántos?</span>
                <input
                  name="patios"
                  type="number"
                  min={0}
                  max={99}
                  defaultValue={asc.patios ?? ""}
                  aria-label="Cuántos patios tiene"
                  className="w-[38px] rounded-[5px] border border-[#bdbdbd] bg-white px-1 py-px text-center text-[11.5px] text-carbon outline-none focus:border-lima"
                />
                <button className="text-[11px] font-semibold text-[#14781E] hover:underline">guardar</button>
              </div>
              <p className="mt-[5px] text-[11px] leading-[1.3] text-[#8a8a8a]">
                {asc.patiosQuien ? (
                  <>
                    los contó {asc.patiosQuien}
                    {asc.patiosCuando && <> el {asc.patiosCuando.slice(8, 10)}/{asc.patiosCuando.slice(5, 7)}</>}
                  </>
                ) : (
                  "sin mirar"
                )}
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* ------------- 346 · lo que puedo hacer y lo que puedo pedir ------------- */}
      <div className="flex flex-col gap-[10px]">
        <section className={CARD + " border-[#820707]"}>
          <div className={ROT + " mb-[9px] text-[#820707]"}>Lo que condiciona lo que puedo hacer</div>
          {hacer.length === 0 ? (
            <p className="text-[11px] text-[#8a8a8a]">Nada que lo ate, o no se ha podido consultar.</p>
          ) : (
            hacer.map((d) => <Sub key={d.que} familia="hacer" {...d} />)
          )}
        </section>

        <section className={CARD + " border-[#0C8124]"}>
          <div className={ROT + " mb-[9px] text-[#0C8124]"}>Lo que condiciona lo que puedo pedir</div>

          {/* EL IEE, primero, porque es lo que mas vende. Dos lecturas suyas:
              el filon son las FAVORABLES pendientes de accesibilidad -"al estar
              su informe favorable, nadie les esta mirando"-, y "ajustes
              razonables = NO es la senal de compra", porque significa que la
              obra pasa de tres veces la cuota. */}
          <div className="mb-[11px]">
            <Banda familia="pedir">IEE</Banda>
            <div className="pl-0.5">
              <span className="text-[12px] font-semibold text-[#1c1c1c]">
                {!iee ? (
                  <span className="text-[#8a8a8a]">no nos consta</span>
                ) : (
                  <>
                    Sí
                    {iee.fecha && <span className="font-normal text-carbon/65"> · {iee.fecha.split("-").reverse().join("/")}</span>}
                    {iee.valoracion && (
                      <span className={iee.valoracion.toLowerCase().startsWith("desfav") ? " text-[#820707]" : ""}>
                        {" "}· {iee.valoracion.toLowerCase()}
                      </span>
                    )}
                  </>
                )}
              </span>
            </div>
            {!iee ? (
              <p className="mt-0.5 text-[11px] leading-snug text-[#2B6CB0]">
                Solo sabemos de los edificios que ha barrido el radar del registro. Que no conste
                no quiere decir que no lo tengan.
              </p>
            ) : (
              <>
                <div className="flex items-baseline gap-x-1.5 pl-[13px] text-[11.5px]">
                  <span className="text-[#6e6e6e]">Accesibilidad</span>
                  <span className="text-[#4a4a4a]">
                    {iee.accesibilidadCumple === null ? "—" : iee.accesibilidadCumple ? "cumple" : "no cumple"}
                  </span>
                </div>
                <div className="flex items-baseline gap-x-1.5 pl-6 text-[11.5px]">
                  <span className="text-[#6e6e6e]">ajustes razonables</span>
                  <span className={iee.admiteAjustes === false ? "font-bold text-[#0C8124]" : "text-[#4a4a4a]"}>
                    {iee.admiteAjustes === null ? "—" : iee.admiteAjustes ? "los admite" : "NO los admite"}
                  </span>
                </div>
                {iee.admiteAjustes === false && (
                  <p className="mt-0.5 text-[11px] leading-snug text-[#2B6CB0]">
                    Es la señal de compra: la obra pasa de tres veces la cuota, así que van a
                    querer la subvención.
                  </p>
                )}
                {iee.accesibilidadCumple === false && iee.valoracion?.toLowerCase().startsWith("favo") && (
                  <p className="mt-0.5 text-[11px] leading-snug text-[#2B6CB0]">
                    Informe favorable con la accesibilidad sin resolver: nadie les está mirando.
                  </p>
                )}
                <div className="flex items-baseline gap-x-1.5 pl-[13px] text-[11.5px]">
                  <span className="text-[#6e6e6e]">Calificación energética</span>
                  <span className="text-[#4a4a4a]">{iee.energetica ?? "—"}</span>
                </div>
              </>
            )}
          </div>
          {/* El IEE sale aqui dentro, en su fila "¿Tiene IEE registrada?", que hoy
              dice "—" y "consulta pendiente de montar". No se le pone un aviso
              encima: el informe ya lo dice en su sitio. */}
          {pedir.map((d) => (
            <Sub key={d.que} familia="pedir" {...d} />
          ))}
        </section>

        {/* Lo que han cobrado los de al lado: es el argumento de venta, no un
            adorno. "Sus vecinos han accedido a subvencion de tal y ellos solo a X." */}
        {i.subvencionesCerca.length > 0 && (
          <section className={CAJA}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-2">
              <div className={ROT_GRIS}>Subvenciones ya concedidas a menos de 800 m</div>
              <div className="text-[13px]">
                <b>{EUR.format(Math.round(i.subvencionesCerca.reduce((t, s) => t + (s.importe ?? 0), 0)))} €</b>
                <span className="text-[11px] text-[#8a8a8a]"> en {i.subvencionesCerca.length} obras</span>
              </div>
            </div>
            <table className="mt-1.5 w-full border-collapse text-[11.5px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.07em] text-[#8a8a8a]">
                  <th className="border-b border-[#e2e2e2] px-1.5 py-[3px] text-left font-bold">Dirección</th>
                  <th className="border-b border-[#e2e2e2] px-1.5 py-[3px] text-right font-bold">Concedido</th>
                  <th className="border-b border-[#e2e2e2] px-1.5 py-[3px] text-right font-bold">Viv.</th>
                </tr>
              </thead>
              <tbody>
                {i.subvencionesCerca.slice(0, 8).map((s, n) => (
                  <tr key={n}>
                    <td className="border-b border-[#f0f0f0] px-1.5 py-[2.5px]">{s.direccion}</td>
                    <td className="border-b border-[#f0f0f0] px-1.5 py-[2.5px] text-right tabular-nums">
                      {s.importe === null ? "—" : `${EUR.format(Math.round(s.importe))} €`}
                    </td>
                    <td className="border-b border-[#f0f0f0] px-1.5 py-[2.5px] text-right tabular-nums">{s.viviendas ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>

      {/* ---------------------- 190 · las imágenes ---------------------- */}
      <section className={CAJA}>
        <div className={ROT_GRIS}>Las imágenes</div>
        <div className="mt-2 flex flex-col gap-2.5">
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
          <a
            href={i.visorCatastro}
            target="_blank"
            rel="noreferrer"
            className={ENLACE}
          >
            Visor oficial del Catastro
          </a>
          {i.pdfs.slice(0, 4).map((p) => (
            <a key={p.url} href={p.url} target="_blank" rel="noreferrer" className={ENLACE}>
              {p.que} (PDF)
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
