import { ascensorDe, informeEdificio } from "../../../../lib/informeEdificio";

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

const ROT = "text-[12px] font-bold uppercase tracking-[0.05em] underline underline-offset-2";
const CAJA = "rounded-[10px] border border-[#d9d9d9] bg-white p-[11px_13px] px-[13px] py-[11px]";

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
    <div className="border-t border-black/5 py-[5px] first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="text-[11px] text-carbon/65">{que}</span>
        <span className={"text-[12px] font-semibold " + (falta ? "text-[#8a8a8a]" : "text-carbon")}>{valor}</span>
      </div>
      {significa && <p className="mt-0.5 text-[11px] leading-snug text-[#2B6CB0]">{significa}</p>}
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
  const marca = (v: boolean) =>
    hay === v ? "font-bold text-carbon" : "text-[#8a8a8a]";
  return (
    <div>
      <div className="text-[11px] text-carbon/65">{que}</div>
      <div className="mt-0.5 flex items-baseline gap-3 text-[12px]">
        <span className={marca(true)}>Sí</span>
        <span className={marca(false)}>No</span>
        {cuantos !== undefined && (
          <span className="flex items-baseline gap-1.5">
            <span className="text-[11px] text-carbon/50">¿cuántos?</span>
            <span className="inline-block min-w-[34px] rounded-[5px] border border-[#bdbdbd] px-1.5 py-px text-center text-[11.5px] text-carbon">
              {cuantos ?? ""}
            </span>
          </span>
        )}
      </div>
      <p className="mt-0.5 text-[11px] text-[#8a8a8a]">
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

const EUR = new Intl.NumberFormat("es-ES");

/** Devuelve las TRES primeras columnas de su rejilla: 262 · 330 · 190. La cuarta
 *  -el diario- la pone la pantalla. */
export async function Edificio({ referencia }: { referencia: string }) {
  const [i, asc] = await Promise.all([informeEdificio(referencia), ascensorDe(referencia)]);

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
  const pedir = de("Dinero: a qué ayudas entra");

  return (
    <>
      {/* ---------------- 262 · lo que dice el Catastro ---------------- */}
      <section className={CAJA}>
        <div className={ROT + " text-[#104269]"}>Lo que dice el Catastro</div>
        <div className="mt-2">
          {edificio.map((d) => (
            <Dato key={d.que} {...d} />
          ))}
        </div>
        {usos.length > 0 && (
          <div className="mt-3 border-t border-black/10 pt-2">
            {usos.map((d) => (
              <Dato key={d.que} {...d} />
            ))}
          </div>
        )}

        {/* Lo que no dice ningun servicio: lo vimos nosotros, y por eso va
            firmado con quien y cuando. */}
        <div className="mt-3 border-t border-black/10 pt-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.05em] text-carbon/55">Lo que hemos visto nosotros</div>
          <div className="mt-1.5 grid grid-cols-[1fr_1px_1fr] gap-x-[11px]">
            <Visto que="Ascensor" hay={asc.hay} quien={asc.quien} cuando={asc.cuando} />
            <div className="bg-[#438538]" />
            {/* Los patios todavia no tienen columna en ficha_catastro: entran en
                la etapa de los patios. Hasta entonces el control se ve, vacio. */}
            <Visto que="Patios" hay={null} cuantos={null} />
          </div>
        </div>
      </section>

      {/* ------------- 330 · lo que puedo hacer y lo que puedo pedir ------------- */}
      <div className="flex flex-col gap-[10px]">
        <section className={CAJA}>
          <div className={ROT + " text-[#820707]"}>Lo que condiciona lo que puedo hacer</div>
          <div className="mt-2">
            {hacer.length === 0 ? (
              <p className="text-[11px] text-carbon/50">Nada que lo ate, o no se ha podido consultar.</p>
            ) : (
              hacer.map((d) => <Dato key={d.que} {...d} />)
            )}
          </div>
        </section>

        <section className={CAJA}>
          <div className={ROT + " text-[#0C8124]"}>Lo que condiciona lo que puedo pedir</div>
          {/* El IEE sale aqui dentro, en su fila "¿Tiene IEE registrada?", que hoy
              dice "—" y "consulta pendiente de montar". No se le pone un aviso
              encima: el informe ya lo dice en su sitio. */}
          <div className="mt-2">{pedir.map((d) => <Dato key={d.que} {...d} />)}</div>
        </section>

        {/* Lo que han cobrado los de al lado: es el argumento de venta, no un
            adorno. "Sus vecinos han accedido a subvencion de tal y ellos solo a X." */}
        {i.subvencionesCerca.length > 0 && (
          <section className={CAJA}>
            <div className={ROT + " text-[#0C8124]"}>Subvenciones concedidas a menos de 800 m</div>
            <p className="mt-1 text-[12px] font-bold text-carbon">
              {EUR.format(Math.round(i.subvencionesCerca.reduce((t, s) => t + (s.importe ?? 0), 0)))} €
              <span className="font-normal text-carbon/55"> en {i.subvencionesCerca.length} obras</span>
            </p>
            <table className="mt-1.5 w-full border-collapse text-[11px]">
              <tbody>
                {i.subvencionesCerca.slice(0, 8).map((s, n) => (
                  <tr key={n} className="border-t border-black/5">
                    <td className="py-1 pr-2 text-carbon/75">{s.direccion}</td>
                    <td className="py-1 pr-2 text-right font-semibold tabular-nums text-carbon">
                      {s.importe === null ? "—" : `${EUR.format(Math.round(s.importe))} €`}
                    </td>
                    <td className="py-1 text-right text-carbon/50">{s.viviendas ? `${s.viviendas} viv.` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>

      {/* ---------------------- 190 · las imágenes ---------------------- */}
      <section className={CAJA}>
        <div className={ROT + " text-carbon/55 no-underline"}>Las imágenes</div>
        <div className="mt-2 flex flex-col gap-2.5">
          {[
            { que: "Croquis catastral", src: i.croquis },
            { que: "Vista aérea", src: i.aerea },
          ].map((x) => (
            <div key={x.que}>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-carbon/45">{x.que}</div>
              {x.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={x.src} alt={x.que} className="mt-1 aspect-square w-full rounded-[10px] border border-black/10 object-cover" />
              ) : (
                <div className="mt-1 grid aspect-square w-full place-items-center rounded-[10px] border border-dashed border-amber-200 bg-amber-50/60 px-2 text-center text-[11px] text-amber-900/70">
                  no se ha podido traer
                </div>
              )}
            </div>
          ))}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-carbon/45">Polycam</div>
            <div className="mt-1 grid aspect-square w-full place-items-center rounded-[10px] border border-dashed border-amber-200 bg-amber-50/60 px-2 text-center text-[11px] text-amber-900/70">
              llega solo por el buzón
            </div>
          </div>
          <a
            href={i.visorCatastro}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-semibold text-[#2B6CB0] hover:underline"
          >
            Visor oficial del Catastro →
          </a>
          {i.pdfs.slice(0, 4).map((p) => (
            <a key={p.url} href={p.url} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-[#2B6CB0] hover:underline">
              {p.que} (PDF)
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
