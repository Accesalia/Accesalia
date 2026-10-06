// lib/pdf/AnexoDoc.tsx
//
// EL PDF DEL ANEXO DE LA VIABILIDAD, con el aspecto de la maqueta aprobada
// (docs/figma/anexo-viabilidad-edificio.html, con la vuelta de Daniel). Los
// datos los junta lib/anexoEdificio.ts; aqui solo se pintan, y lo que no viene
// no se pinta (ni rotulo ni hueco).

import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { Anexo, LineaAyuda } from "../anexoEdificio";

const VERDE = "#92d050";
const s = StyleSheet.create({
  pagina: { paddingTop: 30, paddingBottom: 30, paddingHorizontal: 40, fontSize: 8.6, fontFamily: "Helvetica", color: "#222", lineHeight: 1.4 },
  membrete: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1.5, borderBottomColor: VERDE, paddingBottom: 5 },
  logo: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  logoVerde: { color: "#7ac943" },
  que: { fontSize: 7, color: "#777", textAlign: "right" },
  titular: { flexDirection: "row", marginTop: 10, gap: 9 },
  h1: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  dir: { fontSize: 8.6, color: "#555", marginTop: 2 },
  ref: { fontSize: 7.4, color: "#888", marginTop: 5 },
  img: { width: 110, height: 86, borderRadius: 4, objectFit: "cover" },
  cifras: { flexDirection: "row", gap: 5, marginTop: 10, marginBottom: 2 },
  cifra: { flex: 1, backgroundColor: "#f4f8ef", borderRadius: 4, paddingVertical: 5, alignItems: "center" },
  cifraN: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  cifraQ: { fontSize: 6.5, color: "#555", textTransform: "uppercase" },
  h2: { flexDirection: "row", justifyContent: "space-between", backgroundColor: VERDE, paddingVertical: 2, paddingHorizontal: 6, marginTop: 9, marginBottom: 5 },
  h2t: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  h2f: { fontSize: 6.8, color: "#335c12" },
  resumen: { fontSize: 9, marginBottom: 4 },
  fila3: { flexDirection: "row", gap: 5 },
  punto: { flex: 1, borderWidth: 0.7, borderColor: "#e3e6df", borderRadius: 4, padding: 5 },
  b: { fontFamily: "Helvetica-Bold" },
  peq: { fontSize: 7.6, color: "#444" },
  luz: { flex: 1, borderWidth: 0.7, borderRadius: 4, padding: 4 },
  bien: { backgroundColor: "#eef7e4", borderColor: "#b9dc97" },
  mal: { backgroundColor: "#fbeeee", borderColor: "#e6b9b9" },
  dato: { backgroundColor: "#f5f5f2", borderColor: "#e0e0da" },
  pedido: { fontSize: 9, marginTop: 1, marginBottom: 3 },
  th: { flexDirection: "row", borderBottomWidth: 0.7, borderBottomColor: "#cfe5b8", paddingBottom: 2 },
  thT: { fontSize: 6.5, color: "#666", textTransform: "uppercase", fontFamily: "Helvetica-Bold" },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#eef2e8", paddingVertical: 3 },
  c1: { width: "30%", paddingRight: 4 },
  c2: { width: "30%", paddingRight: 4 },
  c3: { width: "26%", paddingRight: 4 },
  c4: { width: "14%", textAlign: "right", fontFamily: "Helvetica-Bold", color: "#2f6510" },
  aviso: { fontSize: 6.8, color: "#777", marginTop: 3 },
  entorno: { marginTop: 6, borderWidth: 0.7, borderColor: "#cfe5b8", borderRadius: 4, padding: 6 },
  entornoT: { fontSize: 8, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  er: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: "#eef2e8", paddingVertical: 2 },
  pie: { marginTop: 10, borderTopWidth: 0.5, borderTopColor: "#ddd", paddingTop: 4, flexDirection: "row", justifyContent: "space-between", fontSize: 6.4, color: "#888" },
});

// Helvetica no trae ≥ ni ≤ (salen como otra letra): se dicen con palabras.
const enLetra = (t: string) => t.replace(/≥\s*([\d.,]+\s*%?)/g, "$1 o más").replace(/≤\s*([\d.,]+\s*%?)/g, "hasta $1").replace(/[≈~]\s*/g, "unos ");

const eur = (n: number | null) => (n == null ? "" : new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" }).format(n) + " €");

function Titulo({ t, fuente }: { t: string; fuente?: string }) {
  return (
    <View style={s.h2} wrap={false}>
      <Text style={s.h2t}>{t}</Text>
      {fuente ? <Text style={s.h2f}>{fuente}</Text> : null}
    </View>
  );
}

function Tabla({ filas, cabecera }: { filas: LineaAyuda[]; cabecera: boolean }) {
  return (
    <View>
      {cabecera && (
        <View style={s.th}>
          <Text style={[s.thT, s.c1]}>Convocatoria</Text>
          <Text style={[s.thT, s.c2]}>Qué cubre</Text>
          <Text style={[s.thT, s.c3]}>Cuánto da</Text>
          <Text style={[s.thT, s.c4]}>Para este edificio</Text>
        </View>
      )}
      {filas.map((f, i) => (
        <View key={i} style={s.tr} wrap={false}>
          <View style={s.c1}>
            <Text>{enLetra(f.convocatoria)}</Text>
            <Text style={{ fontSize: 6.6, color: "#777" }}>{f.estado}</Text>
          </View>
          <Text style={[s.c2, s.peq]}>{enLetra(f.cubre)}</Text>
          <Text style={[s.c3, s.peq]}>{enLetra(f.cuantoDa)}</Text>
          <Text style={s.c4}>{f.estimacion ?? ""}</Text>
        </View>
      ))}
    </View>
  );
}

export type ImagenesAnexo = { croquis: Buffer | null; aerea: Buffer | null };

/** La pagina sola: va suelta (el anexo por su cuenta) o detras de la
 *  viabilidad, dentro de su mismo PDF. */
export function AnexoPagina({ a, croquis, aerea }: { a: Anexo } & ImagenesAnexo) {
  let n = 0;
  const num = () => ++n;
  const iee = a.iee;
  return (
      <Page size="A4" style={s.pagina}>
        <View style={s.membrete}>
          <Text style={s.logo}>
            acces<Text style={s.logoVerde}>alia</Text>
          </Text>
          <Text style={s.que}>
            Anexo al informe de viabilidad{"\n"}Ficha del edificio · {a.fecha}
          </Text>
        </View>

        <View style={s.titular}>
          <View style={{ flex: 1 }}>
            <Text style={s.h1}>{a.direccion}</Text>
            {a.lugar ? <Text style={s.dir}>{a.lugar}</Text> : null}
            <Text style={s.ref}>Referencia catastral {a.referencia}</Text>
          </View>
          {croquis ? <Image src={croquis} style={s.img} /> : null}
          {aerea ? <Image src={aerea} style={s.img} /> : null}
        </View>

        {a.cifras.length > 0 && (
          <View style={s.cifras}>
            {a.cifras.map((c) => (
              <View key={c.que} style={s.cifra}>
                <Text style={s.cifraN}>{c.valor}</Text>
                <Text style={s.cifraQ}>{c.que}</Text>
              </View>
            ))}
          </View>
        )}

        <Titulo t={`${num()} · El edificio y lo que implica su época`} fuente="Catastro" />
        <Text style={s.resumen}>{a.resumen}</Text>
        {a.epoca.length > 0 && (
          <View style={s.fila3}>
            {a.epoca.map((p) => (
              <View key={p.titulo} style={s.punto}>
                <Text style={s.b}>{p.titulo}</Text>
                <Text style={s.peq}>{p.texto}</Text>
              </View>
            ))}
          </View>
        )}

        <Titulo t={`${num()} · Su Informe de Evaluación del Edificio (IEE)`} fuente="Registro de la Comunidad de Madrid" />
        {iee ? (
          <View style={s.fila3}>
            {iee.valoracion && (
              <View style={[s.luz, /favorable/i.test(iee.valoracion) && !/desf/i.test(iee.valoracion) ? s.bien : s.mal]}>
                <Text style={s.b}>{iee.valoracion}</Text>
                <Text style={s.peq}>valoración final</Text>
              </View>
            )}
            {iee.accesibilidadCumple !== null && (
              <View style={[s.luz, iee.accesibilidadCumple ? s.bien : s.mal]}>
                <Text style={s.b}>{iee.accesibilidadCumple ? "Cumple" : "No cumple"}</Text>
                <Text style={s.peq}>accesibilidad</Text>
              </View>
            )}
            {iee.admiteAjustes !== null && (
              <View style={[s.luz, iee.admiteAjustes ? s.bien : s.mal]}>
                <Text style={s.b}>{iee.admiteAjustes ? "Admite" : "No admite"}</Text>
                <Text style={s.peq}>ajustes razonables</Text>
              </View>
            )}
            {iee.energetica && (
              <View style={[s.luz, /^[ABC]/.test(iee.energetica) ? s.bien : s.mal]}>
                <Text style={s.b}>{iee.energetica}</Text>
                <Text style={s.peq}>eficiencia energética</Text>
              </View>
            )}
            {iee.fecha && (
              <View style={[s.luz, s.dato]}>
                <Text style={s.b}>{Number(iee.fecha.slice(0, 4)) + 10}</Text>
                <Text style={s.peq}>vence (emitido {iee.fecha.slice(5, 7)}/{iee.fecha.slice(0, 4)})</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[s.dato, { borderWidth: 0.7, borderRadius: 4, padding: 4 }]}>
            <Text style={s.b}>No consta ninguna IEE registrada</Text>
            <Text style={s.peq}>En el registro de la Comunidad de Madrid no figura ningún informe para este edificio.</Text>
          </View>
        )}

        {a.condiciona && (
          <>
            <Titulo t={`${num()} · Lo que condiciona la obra`} fuente="Geoportal del Ayuntamiento de Madrid" />
            <View style={s.fila3}>
              {a.condiciona.map((c) => (
                <View key={c.titulo} style={s.punto}>
                  {/* Helvetica no tiene el ✓: el color dice si es bueno. */}
                  <Text style={[s.b, { color: c.bien ? "#2f6510" : "#9b2c2c" }]}>{c.titulo}</Text>
                  <Text style={s.peq}>{c.texto}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {(a.ayudas.length > 0 || a.ademasEficiencia.length > 0 || a.entorno) && (
          <>
            <Titulo t={`${num()} · Ayudas a las que puede optar`} fuente="según el histórico de convocatorias" />
            {a.ayudas.length > 0 && (
              <>
                <Text style={s.pedido}>
                  {a.pedido ? (
                    <>
                      Para {a.pedido.includes(" y ") ? "lo" : "el"} <Text style={s.b}>{a.pedido}</Text> que nos han pedido podría acceder a:
                    </>
                  ) : (
                    "Podría acceder a:"
                  )}
                </Text>
                <Tabla filas={a.ayudas} cabecera />
              </>
            )}
            {a.ademasEficiencia.length > 0 && (
              <>
                <Text style={[s.pedido, a.ayudas.length ? { marginTop: 6 } : {}]}>
                  {a.ayudas.length ? (
                    <>
                      Y si además se incluyera <Text style={s.b}>eficiencia energética</Text> en la misma obra:
                    </>
                  ) : (
                    <>
                      Para mejorar su <Text style={s.b}>eficiencia energética</Text> podría acceder a:
                    </>
                  )}
                </Text>
                <Tabla filas={a.ademasEficiencia} cabecera={a.ayudas.length === 0} />
              </>
            )}
            {a.estimacionNota && <Text style={s.aviso}>{a.estimacionNota}</Text>}

            {a.entorno && (
              <View style={s.entorno} wrap={false}>
                <Text style={s.entornoT}>
                  {a.entorno.donde.charAt(0).toUpperCase() + a.entorno.donde.slice(1)}, otras comunidades ya las han conseguido
                </Text>
                {a.entorno.filas.map((f, i) => (
                  <View key={i} style={s.er}>
                    <Text style={{ flex: 1 }}>
                      {f.quien}
                      {f.detalle ? <Text style={{ color: "#666" }}> · {f.detalle}</Text> : null}
                    </Text>
                    <Text style={s.b}>{eur(f.importe)}</Text>
                  </View>
                ))}
                <View style={s.er}>
                  <Text style={{ flex: 1, color: "#555" }}>
                    {a.entorno.mas > 0 ? `y ${a.entorno.mas} comunidades más` : `${a.entorno.filas.length} comunidades`} · en total
                  </Text>
                  <Text style={s.b}>{eur(a.entorno.total)}</Text>
                </View>
              </View>
            )}
          </>
        )}

        {a.visto.length > 0 && (
          <>
            <Titulo t={`${num()} · Lo que hemos comprobado en la visita`} />
            <View style={s.fila3}>
              {a.visto.map((v) => (
                <View key={v.titulo} style={s.punto}>
                  <Text style={s.b}>{v.titulo}</Text>
                  {v.texto ? <Text style={s.peq}>{v.texto}</Text> : null}
                </View>
              ))}
            </View>
          </>
        )}

        <View style={s.pie} fixed>
          <Text>Fuentes: {a.fuentes}. Consultado el {a.fecha}.</Text>
          <Text>Accesalia · B86374055</Text>
        </View>
      </Page>
  );
}

export function AnexoDoc({ a, croquis, aerea }: { a: Anexo } & ImagenesAnexo) {
  return (
    <Document title={`Ficha del edificio · ${a.direccion}`} author="Accesalia" creator="Accesalia">
      <AnexoPagina a={a} croquis={croquis} aerea={aerea} />
    </Document>
  );
}

/** Las dos imagenes, bajadas antes y con plazo: si Catastro o el IGN tardan, el
 *  anexo sale igual, sin ellas. */
async function imagen(url: string | null): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!r.ok || !(r.headers.get("content-type") ?? "").startsWith("image/")) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch {
    return null;
  }
}

export async function imagenesDelAnexo(a: Anexo): Promise<ImagenesAnexo> {
  const [croquis, aerea] = await Promise.all([imagen(a.croquis), imagen(a.aerea)]);
  return { croquis, aerea };
}

export async function pdfDelAnexo(a: Anexo): Promise<Buffer> {
  return renderToBuffer(<AnexoDoc a={a} {...await imagenesDelAnexo(a)} />);
}
