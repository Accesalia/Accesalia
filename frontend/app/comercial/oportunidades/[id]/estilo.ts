// Las clases que comparten la pantalla (servidor) y sus piezas (cliente).
//
// VIVEN AQUI Y NO EN Piezas.tsx POR UNA RAZON: un fichero con "use client"
// convierte TODOS sus exports en referencias de cliente. Al importar una de esas
// constantes desde un componente de servidor no llega el texto de las clases,
// llega un trasto que acaba escrito tal cual en el className —y la tarjeta sale
// sin marco y sin fondo, que es lo que pasaba— (28-sep-2026, visto al mirar la
// pantalla renderizada).
//
// La escala de la casa y ni un tamaño mas:
//   25 el titulo de la pantalla · 15 titulo de tarjeta y rotulo de boton ·
//   14 texto principal · 12 secundario · 11 etiquetas.

// La caja de su maqueta del bloque 1: esquina de 10, borde que se ve, sin sombra.
export const CAJA = "rounded-[10px] border border-[#d9d9d9] bg-white";
// El rotulo de una caja ("Direccion", "Por donde vamos"): gris, pequeño, en
// versalitas. El verde de ROTULO se queda para las etiquetas de los campos.
export const ROT_CAJA = "block text-[10px] font-bold uppercase tracking-[0.09em] text-[#8a8a8a]";
export const ROTULO = "block text-[10px] font-bold uppercase tracking-[0.05em] text-[#237812]";
export const CAMPO =
  "w-full rounded-lg border border-carbon/40 bg-white px-2.5 py-1.5 text-[13px] text-carbon outline-none transition placeholder:text-carbon/45 focus:border-lima";
export const BOTON =
  "inline-flex h-[32px] shrink-0 items-center justify-center rounded-[6px] border border-[#223A5D] bg-[#5680A1] px-3.5 text-[12px] font-bold uppercase text-white transition hover:bg-[#46769c] disabled:cursor-not-allowed disabled:opacity-40";
