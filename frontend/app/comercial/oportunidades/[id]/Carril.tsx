import type { HitoGestion } from "../../../../lib/gestionOportunidad";

// EL CARRIL DE LOS CUATRO BLOQUES (Monica, 5-oct-2026).
//
// "Que es un bloque esta mas que decidido: es el flujo de hitos comerciales que
// ya existe, pero agregado por bloques."
//
// Asi que aqui NO se guarda nada: los cuatro bloques son los diez hitos de
// `hitos_comerciales` agrupados, y el estado de cada card se calcula de sus
// hitos. La maqueta se delataba sola -pone "Bloque 1 · Falta el Polycam", que es
// el tercer hito del bloque 1-, y eso dijo donde mirar.
//
// Medidas suyas, del esqueleto de Figma (docs/figma/bloque1-toma-de-datos.html):
// carril de 172, hueco de 14, y el bloque activo de 183 con -11 de margen para
// que CRUCE el hueco y se coma el borde del panel. Ella: "el fondo tiene que
// decir 'esto que estas viendo ES el bloque 1'. Sin linea entre ellos, el ojo
// lee una pieza".

export const AZUL = "#104269";

/** Los diez hitos, en cuatro. El 3D (`tresd`, ramal) va en TOMA DE DATOS, no en
 *  Documentacion: ella, 5-oct-2026, "el 3D es en el bloque 1, exactamente donde
 *  estaba, PORQUE PARA HACERLO PRIMERO HAY QUE MARCARLO" -y la casilla
 *  "necesita 3D" esta en la cabecera del bloque 1-. Cuadra ademas con el
 *  catalogo, donde "Toma de datos y Modelado 3D" es un solo tipo. */
export const BLOQUES: { n: number; titulo: string; hitos: string[] }[] = [
  { n: 1, titulo: "Toma de datos", hitos: ["primer_contacto", "visita", "polycam", "tresd"] },
  { n: 2, titulo: "Documentación", hitos: ["viabilidad_arquitecto", "preparacion_documentos", "envio_documentos"] },
  { n: 3, titulo: "Decisión de los vecinos", hitos: ["junta"] },
  { n: 4, titulo: "Cierre", hitos: ["firma", "cobro"] },
];

/** Las palabras del subtitulo son SUYAS, copiadas de las dos maquetas. Donde no
 *  escribio ninguna se pone el nombre del hito tal cual: antes eso que inventarle
 *  yo una frase. */
const FALTA: Record<string, string> = {
  polycam: "Falta el Polycam",
  envio_documentos: "Falta enviarla",
  cobro: "Falta cobrar",
};

/** 2026-03-14 -> 14/03 */
const dia = (v: string) => `${v.slice(8, 10)}/${v.slice(5, 7)}`;

export type EstadoBloque = { n: number; titulo: string; pie: string; activo: boolean };

/** De los hitos de la oportunidad al estado de cada card. Un bloque esta EN CURSO
 *  si dentro de el cae el hito por el que va la oportunidad. */
export function bloquesDe(hitos: HitoGestion[]): EstadoBloque[] {
  const por = new Map(hitos.map((h) => [h.clave, h]));
  const ahora =
    hitos.find((h) => h.estado === "en_curso") ?? hitos.find((h) => h.estado === "pendiente" && h.aplicable);

  return BLOQUES.map((b) => {
    const mios = b.hitos.map((c) => por.get(c)).filter((h): h is HitoGestion => Boolean(h));
    const cuentan = mios.filter((h) => h.estado !== "no_aplica" && h.aplicable);
    const hechos = cuentan.filter((h) => h.estado === "hecho");
    const pendiente = cuentan.find((h) => h.estado !== "hecho");
    const activo = Boolean(ahora && b.hitos.includes(ahora.clave));

    let pie: string;
    if (cuentan.length === 0) pie = "No aplica";
    else if (!pendiente) {
      const ultima = hechos.map((h) => h.fecha).filter(Boolean).sort().pop();
      pie = ultima ? `Hecho · ${dia(ultima as string)}` : "Hecho";
    } else if (hechos.length === 0 && !activo) pie = "Sin empezar";
    else pie = FALTA[pendiente.clave] ?? `Falta · ${pendiente.nombre}`;

    return { n: b.n, titulo: b.titulo, pie, activo };
  });
}

export function Carril({ hitos }: { hitos: HitoGestion[] }) {
  return (
    <div className="flex w-[172px] shrink-0 flex-col gap-2">
      {bloquesDe(hitos).map((b) => (
        <div
          key={b.n}
          style={
            b.activo
              ? { background: AZUL, width: 183, marginRight: -11, borderLeft: "2px solid #fff" }
              : undefined
          }
          className={
            "relative px-[11px] py-[10px] " +
            (b.activo
              ? "z-20 rounded-l-[10px] text-white"
              : "rounded-[10px] border border-[#dcdcdc] bg-[#fbfbfb]")
          }
        >
          <div
            className={
              "text-[10px] font-bold uppercase tracking-[0.08em] " + (b.activo ? "text-white" : "text-[#9a9a9a]")
            }
          >
            Bloque {b.n}
          </div>
          <div className={"mt-0.5 text-[13px] font-bold leading-[1.2] " + (b.activo ? "text-white" : "text-carbon")}>
            {b.titulo}
          </div>
          <div className={"mt-1.5 text-[11px] leading-snug " + (b.activo ? "text-[#cfcfcf]" : "text-[#8a8a8a]")}>
            {b.pie}
          </div>
        </div>
      ))}
    </div>
  );
}
