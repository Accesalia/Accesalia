// lib/lectorNominas.ts
//
// Lee el PDF de nominas que manda la gestoria: una pagina por persona, en
// texto (no escaneado). Para cada pagina saca solo lo que la app necesita:
//   - el DNI o NIE, para saber de quien es;
//   - el nombre tal como lo escribe la gestoria ("APELLIDOS, NOMBRE"), para
//     proponer a quien es la primera vez, cuando la ficha aun no tiene DNI;
//   - el periodo (el mes);
//   - el liquido a percibir (lo que se transfiere), el total devengado y el
//     coste para la empresa (costes y KPIs de direccion).
// Nada mas: el resto de la nomina se queda en su PDF.
//
// Formato comprobado con las nominas de agosto de 2026 (Monica, 11-sep-2026).
// Si la gestoria cambia de programa, lo que no se lea sale como "no leido" y
// se revisa a mano: nunca se adivina.

import { extractText, getDocumentProxy } from "unpdf";

export type PaginaNomina = {
  pagina: number; // 1..n
  dni: string | null;
  nombre: string | null;
  periodo: string | null; // YYYY-MM
  liquido: number | null;
  devengado: number | null;
  costeEmpresa: number | null;
};

const MESES: Record<string, string> = {
  ENE: "01", FEB: "02", MAR: "03", ABR: "04", MAY: "05", JUN: "06",
  JUL: "07", AGO: "08", SEP: "09", OCT: "10", NOV: "11", DIC: "12",
};

// Importes a la española: 1.869,33
const IMPORTE = /\d{1,3}(?:\.\d{3})*,\d{2}/g;
const aNumero = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));

// DNI (8 cifras + letra) o NIE (X/Y/Z + 7 cifras + letra). El NIF de la
// empresa empieza por B y no encaja.
const DNI = /\b(?:\d{8}|[XYZ]\d{7})[A-Z]\b/;

function leerPagina(texto: string, pagina: number): PaginaNomina {
  const t = texto.replace(/\r/g, "");
  const lineas = t.split("\n").map((l) => l.trim()).filter(Boolean);

  // El DNI va en la fila de datos que sigue a la cabecera "... D.N.I."
  let dni: string | null = null;
  let nombre: string | null = null;
  const iCab = lineas.findIndex((l) => /TRABAJADOR/.test(l) && /D\.N\.I\./.test(l));
  if (iCab >= 0) {
    for (const l of lineas.slice(iCab + 1, iCab + 4)) {
      const m = l.match(DNI);
      if (m) {
        dni = m[0];
        break;
      }
    }
  }
  if (!dni) dni = t.match(DNI)?.[0] ?? null;

  // El nombre completo va arriba, en el sobre: "APELLIDOS, NOMBRE".
  nombre = lineas.find((l) => /^[A-ZÁÉÍÓÚÜÑ' -]+, [A-ZÁÉÍÓÚÜÑ' -]+$/.test(l)) ?? null;

  // Periodo: "MENS 01 AGO 26 a 31 AGO 26" -> el mes del final.
  let periodo: string | null = null;
  const p = t.match(/\d{2} ([A-Z]{3}) (\d{2}) a \d{2} ([A-Z]{3}) (\d{2})/);
  if (p && MESES[p[3]]) periodo = `20${p[4]}-${MESES[p[3]]}`;

  // Liquido: el primer importe despues de "LIQUIDO A PERCIBIR".
  const trasLiquido = t.split(/LIQUIDO A PERCIBIR/)[1] ?? "";
  const liq = trasLiquido.match(IMPORTE)?.[0];

  // Coste empresa: el importe de la MISMA linea que "COSTE EMPRESA:". Ojo: al
  // extraer el texto, el importe sale DELANTE de la etiqueta; lo que va detras
  // es la tabla de cotizaciones, que no es el coste.
  const lCoste = lineas.find((l) => /COSTE EMPRESA:/.test(l));
  const coste = lCoste?.match(IMPORTE)?.[0];

  // Devengado: en la fila de totales, los dos ultimos importes son
  // T. DEVENGADO y T. A DEDUCIR (los de delante pueden faltar).
  let devengado: number | null = null;
  let deducido: number | null = null;
  const iTot = lineas.findIndex((l) => /T\. DEVENGADO/.test(l));
  if (iTot >= 0) {
    const fila = lineas.slice(iTot + 1, iTot + 3).find((l) => (l.match(IMPORTE) ?? []).length >= 2);
    const imps = fila?.match(IMPORTE) ?? [];
    if (imps.length >= 2) {
      devengado = aNumero(imps[imps.length - 2]);
      deducido = aNumero(imps[imps.length - 1]);
    }
  }

  const liquido = liq ? aNumero(liq) : null;
  // Prueba de que se ha leido bien: liquido = devengado - deducido. Si no
  // cuadra, algo se ha leido mal y no se da por bueno ningun importe.
  const cuadra = liquido != null && devengado != null && deducido != null && Math.abs(devengado - deducido - liquido) < 0.02;

  return {
    pagina,
    dni,
    nombre,
    periodo,
    liquido: cuadra ? liquido : null,
    devengado: cuadra ? devengado : null,
    costeEmpresa: cuadra && coste ? aNumero(coste) : null,
  };
}

export async function leerNominas(pdf: Uint8Array): Promise<PaginaNomina[]> {
  const doc = await getDocumentProxy(pdf);
  const { text } = await extractText(doc, { mergePages: false });
  return (text as string[]).map((t, i) => leerPagina(t, i + 1));
}
