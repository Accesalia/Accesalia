// lib/pdf/HojaDoc.tsx
//
// EL PDF DE LA HOJA DE ENCARGO (Monica, 6-oct-2026: "el pdf lo saca la app").
//
// La hoja se escribe en el papel de la pantalla (HTML editable a mano) y se
// guarda tal cual en cada version. Aqui ese HTML se TRADUCE a react-pdf, pieza a
// pieza, con el mismo aspecto que el papel (lib/hojaPapel.ts):
//   - lo que se conserva: negrita, cursiva, subrayado, listas de puntos, la
//     tabla del desglose, las bandas de color, la clausula y el conforme;
//   - lo que se simplifica: un formato raro pegado de otro sitio (colores,
//     letras de Word) sale como texto normal. Se le dijo a ella antes de hacerlo.
//
// El HTML es el que serializa el navegador (etiquetas cerradas, atributos entre
// comillas), y por eso basta un lector pequeño en vez de una libreria.

import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { ReactNode } from "react";

type EstiloVista = React.ComponentProps<typeof View>["style"];

// --------------------------------------------------------------- el lector

type Nodo = { tag: string; clase: string; estilo: string; hijos: Nodo[] } | string;
const VACIAS = new Set(["br", "hr", "img", "input", "meta", "link", "wbr"]);

function entidades(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");
}
const attr = (a: string, n: string) => a.match(new RegExp(`\\b${n}="([^"]*)"`, "i"))?.[1] ?? "";

export function leerHtml(html: string): Nodo[] {
  const raiz: Nodo = { tag: "raiz", clase: "", estilo: "", hijos: [] };
  const pila: Exclude<Nodo, string>[] = [raiz];
  const re = /<(\/?)([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const arriba = pila[pila.length - 1];
    if (m[4] !== undefined) {
      const t = entidades(m[4]);
      if (t) arriba.hijos.push(t);
      continue;
    }
    const tag = m[2].toLowerCase();
    if (m[1]) {
      // cierre: se sube hasta su apertura (tolera algun cierre de mas)
      const i = pila.map((n) => n.tag).lastIndexOf(tag);
      if (i > 0) pila.length = i;
      continue;
    }
    const n: Nodo = { tag, clase: attr(m[3], "class"), estilo: attr(m[3], "style"), hijos: [] };
    arriba.hijos.push(n);
    if (!VACIAS.has(tag) && !m[3].trim().endsWith("/")) pila.push(n);
  }
  return raiz.hijos;
}

// ------------------------------------------------------------- el aspecto

// El papel mide 11.5px de letra en pantalla; en A4 eso son unos 9 puntos.
const s = StyleSheet.create({
  pagina: { paddingTop: 34, paddingBottom: 34, paddingHorizontal: 46, fontSize: 9, fontFamily: "Helvetica", color: "#222", lineHeight: 1.4 },
  membrete: { fontSize: 7, color: "#888", textAlign: "right" },
  // El codigo, en TODAS las paginas: la firmada que vuelva dice que hoja y que
  // version es, y una pagina suelta tambien.
  codigo: { position: "absolute", top: 16, right: 46, fontSize: 7, color: "#888" },
  h3: { fontSize: 10.5, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 6 },
  p: { marginBottom: 4 },
  centro: { textAlign: "center" },
  banda: { backgroundColor: "#7f7f7f", color: "#fff", fontFamily: "Helvetica-Bold", textAlign: "center", padding: 2, marginTop: 10 },
  banda2: { backgroundColor: "#92d050", fontFamily: "Helvetica-Bold", textAlign: "center", padding: 2 },
  bloque: { marginVertical: 6 },
  ul: { marginLeft: 12 },
  li: { flexDirection: "row" },
  punto: { width: 9 },
  tabla: { marginVertical: 6 },
  fila: { flexDirection: "row" },
  celda: { flex: 1, padding: 2, borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  celdaR: { padding: 2, borderBottomWidth: 0.5, borderBottomColor: "#eee", textAlign: "right" },
  totalbanda: { backgroundColor: "#92d050", fontFamily: "Helvetica-Bold", textAlign: "center", padding: 2, marginTop: 3 },
  clausula: { fontSize: 7.5, color: "#444", marginTop: 8 },
  firma: { textAlign: "right", marginTop: 10 },
  confEtq: { width: "38%", backgroundColor: "#e6e6e6", borderWidth: 0.5, borderColor: "#999", padding: 2.5, minHeight: 14 },
  confValor: { flex: 1, borderWidth: 0.5, borderColor: "#999", padding: 2.5, minHeight: 14 },
  validez: { fontSize: 7.5 },
});

const BLOQUES = new Set(["div", "p", "h1", "h2", "h3", "h4", "ul", "ol", "li", "table", "tbody", "thead", "tr", "td", "th", "section"]);
const esBloque = (n: Nodo) => typeof n !== "string" && BLOQUES.has(n.tag);
const tieneClase = (n: Exclude<Nodo, string>, c: string) => n.clase.split(/\s+/).includes(c);

/** Del atributo style, lo unico que usa el papel: "margin-top:12px" en los
 *  bloques y "padding-left:16px" en las lineas de dentro del proyecto conjunto. */
function margenArriba(estilo: string) {
  const m = estilo.match(/margin-top\s*:\s*(\d+)px/i);
  return m ? { marginTop: Math.round(Number(m[1]) * 0.75) } : {};
}
function sangria(estilo: string) {
  const m = estilo.match(/padding-left\s*:\s*(\d+)px/i);
  return m ? { paddingLeft: Math.round(Number(m[1]) * 0.75) } : {};
}

type Marca = { b?: boolean; i?: boolean; u?: boolean };
const fuente = (m: Marca) =>
  m.b && m.i ? "Helvetica-BoldOblique" : m.b ? "Helvetica-Bold" : m.i ? "Helvetica-Oblique" : undefined;

/** Lo de dentro de una linea de texto: negrita, cursiva, subrayado, saltos. */
function enLinea(nodos: Nodo[], m: Marca, k = "t"): ReactNode[] {
  return nodos.map((n, i) => {
    const clave = `${k}${i}`;
    if (typeof n === "string") return n.replace(/\s+/g, " ");
    if (n.tag === "br") return "\n";
    const mm: Marca = {
      b: m.b || n.tag === "b" || n.tag === "strong",
      i: m.i || n.tag === "i" || n.tag === "em",
      u: m.u || n.tag === "u",
    };
    const estilo = { fontFamily: fuente(mm), textDecoration: mm.u ? ("underline" as const) : undefined };
    return (
      <Text key={clave} style={estilo}>
        {enLinea(n.hijos, mm, clave + "-")}
      </Text>
    );
  });
}

/** Un trozo de hijos: los bloques van como View; las rachas de texto suelto
 *  entre ellos, juntas en un Text. */
function hijos(nodos: Nodo[], m: Marca, k: string): ReactNode[] {
  const out: ReactNode[] = [];
  let racha: Nodo[] = [];
  const soltar = () => {
    if (racha.some((r) => (typeof r === "string" ? r.trim() : true)))
      out.push(<Text key={`${k}r${out.length}`}>{enLinea(racha, m, `${k}r${out.length}-`)}</Text>);
    racha = [];
  };
  nodos.forEach((n, i) => {
    if (esBloque(n)) {
      soltar();
      out.push(bloque(n as Exclude<Nodo, string>, m, `${k}${i}`));
    } else racha.push(n);
  });
  soltar();
  return out;
}

function bloque(n: Exclude<Nodo, string>, m: Marca, k: string): ReactNode {
  const extra = margenArriba(n.estilo);
  const tag = n.tag;

  if (tag === "ul" || tag === "ol")
    return (
      <View key={k} style={[s.ul, extra]}>
        {n.hijos
          .filter((h) => typeof h !== "string" || h.trim())
          .map((h, i) =>
            typeof h !== "string" && h.tag === "li" ? (
              <View key={`${k}${i}`} style={s.li} wrap={false}>
                <Text style={s.punto}>•</Text>
                <View style={{ flex: 1 }}>{hijos(h.hijos, m, `${k}${i}-`)}</View>
              </View>
            ) : (
              <View key={`${k}${i}`}>{hijos([h], m, `${k}${i}-`)}</View>
            ),
          )}
      </View>
    );

  if (tag === "table") {
    const conforme = tieneClase(n, "conforme");
    const filas: Exclude<Nodo, string>[] = [];
    const juntar = (ns: Nodo[]) =>
      ns.forEach((x) => {
        if (typeof x === "string") return;
        if (x.tag === "tr") filas.push(x);
        else juntar(x.hijos);
      });
    juntar(n.hijos);
    return (
      <View key={k} style={[s.tabla, extra]}>
        {filas.map((f, i) => {
          const celdas = f.hijos.filter((c): c is Exclude<Nodo, string> => typeof c !== "string" && (c.tag === "td" || c.tag === "th"));
          return (
            <View key={`${k}${i}`} style={s.fila} wrap={false}>
              {celdas.map((c, j) => {
                const estilo = conforme ? (j === 0 ? s.confEtq : s.confValor) : tieneClase(c, "r") ? s.celdaR : s.celda;
                return (
                  <View key={`${k}${i}-${j}`} style={[estilo, sangria(c.estilo)]}>
                    {hijos(c.hijos, m, `${k}${i}-${j}-`)}
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    );
  }

  const clases = [
    tag === "h3" ? s.h3 : null,
    tag === "p" ? s.p : null,
    tieneClase(n, "membrete") ? s.membrete : null,
    tieneClase(n, "centro") ? s.centro : null,
    tieneClase(n, "banda") ? s.banda : null,
    tieneClase(n, "banda2") ? s.banda2 : null,
    tieneClase(n, "bloque") ? s.bloque : null,
    tieneClase(n, "totalbanda") ? s.totalbanda : null,
    tieneClase(n, "clausula") ? s.clausula : null,
    tieneClase(n, "firma") ? s.firma : null,
    tieneClase(n, "validez") ? s.validez : null,
    extra,
  ].filter(Boolean) as unknown as EstiloVista;
  // El titulo de un bloque (<b> suelto al principio) va en su propia linea.
  return (
    <View key={k} style={clases} wrap={!tieneClase(n, "bloque")}>
      {hijos(n.hijos, m, k + "-")}
    </View>
  );
}

export function HojaDoc({ html, titulo, codigo }: { html: string; titulo: string; codigo: string }) {
  return (
    <Document title={titulo} author="Accesalia" creator="Accesalia">
      <Page size="A4" style={s.pagina}>
        <Text style={s.codigo} fixed>{codigo}</Text>
        {hijos(leerHtml(html), {}, "h")}
      </Page>
    </Document>
  );
}

/** El PDF ya hecho, en bytes: para guardarlo en el almacen y para servirlo.
 *  `codigo` es el de la hoja con su version: "HE-2026-0142 v2". */
export async function pdfDeHoja(html: string, titulo: string, codigo: string): Promise<Buffer> {
  return renderToBuffer(<HojaDoc html={html} titulo={titulo} codigo={codigo} />);
}
