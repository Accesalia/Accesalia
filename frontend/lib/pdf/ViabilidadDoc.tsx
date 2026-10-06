// lib/pdf/ViabilidadDoc.tsx
//
// EL PDF DE LA VIABILIDAD, con el aspecto de la maqueta del 3-oct
// (docs/figma/viabilidad.html) y la tabla de costes del 6-oct: honorarios de la
// hoja agrupados, la obra por lineas con su 19% y su IVA, las tasas sin IVA y un
// unico total con todo. Detras, en el mismo PDF, el anexo del edificio.
//
// Medidas: la maqueta esta a 96 ppp (A4 = 794 px); aqui se trabaja en puntos
// (A4 = 595 pt), asi que todo va a 3/4 de lo que dice la maqueta.

import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { DocViabilidad } from "../viabilidadComercial";
import type { Anexo } from "../anexoEdificio";
import { AnexoPagina, imagenesDelAnexo, type ImagenesAnexo } from "./AnexoDoc";

const VERDE_CAB = "#c9dea6";
const RAYA = "#c6dc9f";
const s = StyleSheet.create({
  pagina: { paddingTop: 30, paddingBottom: 40, paddingHorizontal: 34, fontSize: 10, fontFamily: "Helvetica", color: "#2b2b2b" },
  franja: { position: "absolute", left: 0, right: 0, top: 0, height: 7.5, backgroundColor: "#8fae5e" },
  cab: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { fontSize: 22, fontFamily: "Helvetica-Oblique", color: "#4d7a2a", paddingTop: 4 },
  logoA: { fontFamily: "Helvetica-BoldOblique", color: "#7ac943" },
  empresa: { textAlign: "right", fontSize: 8.2, lineHeight: 1.45, color: "#444" },
  titulo: { alignSelf: "flex-start", marginTop: 16, backgroundColor: VERDE_CAB, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 25, fontSize: 12 },
  arriba: { flexDirection: "row", gap: 16, marginTop: 13 },
  datos: { flex: 1, paddingLeft: 4, fontSize: 10.5, lineHeight: 1.9 },
  b: { fontFamily: "Helvetica-Bold" },
  captura: { width: 188, height: 135, borderWidth: 1.5, borderColor: RAYA, borderRadius: 3, objectFit: "cover" },
  raya: { height: 3, backgroundColor: RAYA, marginTop: 13, marginBottom: 10 },
  lead: { fontSize: 10.5, marginBottom: 9 },
  h3: { fontFamily: "Times-Bold", fontSize: 10.5, textTransform: "uppercase", marginTop: 10, marginBottom: 4 },
  cuerpo: { fontFamily: "Times-Roman", fontSize: 10, lineHeight: 1.45, marginBottom: 6, textAlign: "justify" },
  escalera: { fontFamily: "Times-Bold", fontSize: 10, marginTop: 6, marginBottom: 2 },
  pem: { fontFamily: "Times-Roman", fontSize: 10.5 },
  // la tabla de costes
  tabla: { borderWidth: 0.75, borderColor: "#555", marginTop: 4 },
  th: { backgroundColor: VERDE_CAB, paddingVertical: 6, paddingHorizontal: 7.5, fontSize: 10.5, fontFamily: "Helvetica-Bold", borderBottomWidth: 0.75, borderBottomColor: "#555" },
  fila: { flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: "#555" },
  celdaQue: { flex: 1, paddingVertical: 5, paddingHorizontal: 7.5, borderRightWidth: 0.75, borderRightColor: "#555" },
  celdaImp: { width: 205, paddingVertical: 5, paddingHorizontal: 7.5, fontSize: 9.5 },
  rot: { fontSize: 9.75, textTransform: "uppercase" },
  iva: { fontSize: 7.9, color: "#555", textTransform: "none" },
  sub: { fontSize: 8.6, color: "#444", marginTop: 1 },
  dentro: { paddingLeft: 12 },
  total: { fontFamily: "Helvetica-Bold", fontSize: 10.5 },
  nota: { fontSize: 7.9, color: "#555", marginTop: 5 },
  clausulas: { marginTop: 13, fontSize: 7.5, lineHeight: 1.45 },
  clausula: { marginBottom: 5 },
  pie: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 20 },
  contacto: { fontSize: 9, lineHeight: 1.6 },
  firma: { textAlign: "right", fontSize: 11, lineHeight: 1.5 },
  sello: { borderWidth: 0.75, borderStyle: "dashed", borderColor: "#a9a9a9", color: "#8a8a8a", fontSize: 7.5, paddingVertical: 4, paddingHorizontal: 7, marginRight: 10 },
  codigo: { position: "absolute", bottom: 16, left: 34, right: 34, fontSize: 7, color: "#888", flexDirection: "row", justifyContent: "space-between" },
});

// Sin decimales si es redondo; si no, los dos: "1.738,80", nunca "1.738,8".
const num = (n: number) => {
  const d = Number.isInteger(Math.round(n * 100) / 100) ? 0 : 2;
  return new Intl.NumberFormat("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: "always" }).format(n);
};
const eur = (n: number) => new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" }).format(n) + " €";
const fechaCorta = (f: string | null) => (f ? f.split("-").reverse().join("/") : "");
const parrafos = (t: string) => t.split(/\n+/).map((p) => p.trim()).filter(Boolean);

function Franja({ codigo }: { codigo: string }) {
  return (
    <>
      <View style={s.franja} fixed />
      <View style={s.codigo} fixed>
        <Text>Estudio de viabilidad y costes · {codigo}</Text>
        <Text render={({ pageNumber }) => `${pageNumber}`} />
      </View>
    </>
  );
}

function Fila({ rotulo, iva, sub, importe, dentro }: { rotulo: string; iva?: string; sub?: string; importe: React.ReactNode; dentro?: boolean }) {
  return (
    <View style={s.fila} wrap={false}>
      <View style={[s.celdaQue, dentro ? s.dentro : {}]}>
        <Text style={dentro ? { fontSize: 9.5 } : s.rot}>
          {rotulo}
          {iva ? <Text style={s.iva}> ({iva})</Text> : null}
        </Text>
        {sub ? <Text style={s.sub}>{sub}</Text> : null}
      </View>
      <View style={s.celdaImp}>
        <Text>{importe}</Text>
      </View>
    </View>
  );
}

const conIva = (base: number, pct: number, total: number) => (
  <>
    {num(base)} + {num(Math.round((total - base) * 100) / 100)} IVA = <Text style={s.b}>{eur(total)}</Text>
  </>
);

export function ViabilidadDoc({ d, fecha, captura, anexo, imgs }: {
  d: DocViabilidad; fecha: string; captura: Buffer | null; anexo: Anexo | null; imgs: ImagenesAnexo;
}) {
  const codigo = `${d.numero ?? ""} v${d.version}`;
  const obraTotal = d.obra.reduce((t, l) => t + l.total, 0);
  const tasasTotal = d.tasas.reduce((t, l) => t + (l.importe ?? 0), 0);
  const tasas = d.tasas.filter((t) => t.importe);
  const unaObra = d.obra.length === 1 ? d.obra[0] : null;
  const ivasObra = [...new Set(d.obra.map((l) => l.ivaPct))];

  return (
    <Document title={`Estudio de viabilidad y costes · ${d.ubicacion}`} author="Accesalia" creator="Accesalia">
      {/* ===================== pagina 1 · quien, donde y que */}
      <Page size="A4" style={s.pagina}>
        <Franja codigo={codigo} />
        <View style={s.cab}>
          <Text style={s.logo}>
            accesali<Text style={s.logoA}>a</Text>
          </Text>
          <Text style={s.empresa}>
            SOLUCIONES DE ACCESIBILIDAD Y{"\n"}ECOEFICIENCIA ACCESALIA S.L.{"\n"}c/ Alhambra, 24. (28047) Madrid. / B86374055
          </Text>
        </View>
        <Text style={s.titulo}>ESTUDIO DE VIABILIDAD Y COSTES</Text>

        <View style={s.arriba}>
          <View style={s.datos}>
            {[
              ["Proyecto", d.proyecto],
              ["Ubicación", d.ubicacion],
              ["Arquitecto", d.arquitecto],
              ["Fecha de visita", fechaCorta(d.fechaVisita)],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <Text key={k}>
                  •{"   "}
                  <Text style={s.b}>{k}:</Text> {v}
                </Text>
              ))}
          </View>
          {captura ? <Image src={captura} style={s.captura} /> : null}
        </View>

        <View style={s.raya} />
        <Text style={s.lead}>La intervención en el edificio ubicado en {d.ubicacion}, consistirá en:</Text>

        <Text style={s.h3}>Objeto del proyecto:</Text>
        {parrafos(d.objeto).map((p, i) => (
          <Text key={i} style={s.cuerpo}>{p}</Text>
        ))}

        {(d.descripcion.trim() || d.escaleras.some((e) => e.texto.trim())) && (
          <>
            <Text style={s.h3}>Descripción de las intervenciones:</Text>
            {parrafos(d.descripcion).map((p, i) => (
              <Text key={i} style={s.cuerpo}>{p}</Text>
            ))}
            {d.escaleras
              .filter((e) => e.texto.trim())
              .map((e) => (
                <View key={e.accesoId}>
                  <Text style={s.escalera}>{e.nombre}:</Text>
                  {parrafos(e.texto).map((p, i) => (
                    <Text key={i} style={s.cuerpo}>{p}</Text>
                  ))}
                </View>
              ))}
          </>
        )}

        <Text style={s.h3}>Presupuesto de ejecución material estimado:</Text>
        <Text style={s.pem}>
          <Text style={s.b}>{eur(d.pem)}</Text> (IVA no incluido)
        </Text>
        {d.obra.length > 1 &&
          d.obra.map((l, i) => (
            <Text key={i} style={[s.pem, { fontSize: 9.5, marginTop: 2, paddingLeft: 10 }]}>
              {l.concepto}: {eur(l.pem)}
            </Text>
          ))}

        {d.conclusion.trim() ? (
          <>
            <Text style={s.h3}>Conclusión:</Text>
            {parrafos(d.conclusion).map((p, i) => (
              <Text key={i} style={s.cuerpo}>{p}</Text>
            ))}
          </>
        ) : null}
      </Page>

      {/* ===================== pagina 2 · cuanto cuesta y en que condiciones */}
      <Page size="A4" style={s.pagina}>
        <Franja codigo={codigo} />
        <View style={s.tabla}>
          <Text style={s.th}>COSTES</Text>

          {d.conHonorarios &&
            d.honorarios.map((h, i) => (
              <Fila key={`h${i}`} rotulo={h.rotulo} iva={`IVA ${num(h.ivaPct)}%`} sub={h.detalle} importe={conIva(h.base, h.ivaPct, h.total)} />
            ))}

          {unaObra ? (
            <Fila
              rotulo="Coste de obra"
              iva={`contrata · IVA ${num(unaObra.ivaPct)}%`}
              sub={`${unaObra.concepto ? unaObra.concepto + ". " : ""}PEM ${num(unaObra.pem)} + ${num(unaObra.biPct)}% de beneficio industrial = ${num(unaObra.sinIva)} sin IVA. Varía según la empresa contratista.`}
              importe={conIva(unaObra.sinIva, unaObra.ivaPct, unaObra.total)}
            />
          ) : (
            <>
              <Fila
                rotulo="Coste de ejecución de obra"
                iva={ivasObra.length === 1 ? `contrata · IVA ${num(ivasObra[0])}% incluido` : "contrata · IVA incluido"}
                sub="Varía según la empresa contratista."
                importe={<Text style={s.b}>{eur(obraTotal)}</Text>}
              />
              {d.obra.map((l, i) => (
                <Fila
                  key={`o${i}`}
                  dentro
                  rotulo={l.concepto || "Obra"}
                  sub={`PEM ${num(l.pem)} + ${num(l.biPct)}% de beneficio industrial = ${num(l.sinIva)} sin IVA`}
                  importe={conIva(l.sinIva, l.ivaPct, l.total)}
                />
              ))}
            </>
          )}

          {tasas.length === 1 ? (
            <Fila
              rotulo={tasas[0].concepto || "Tasas urbanísticas e ICIO"}
              iva="no aplica IVA"
              sub="Estimación. Depende del Ayuntamiento (ver cláusulas 2 y 3)."
              importe={<Text style={s.b}>{eur(tasasTotal)}</Text>}
            />
          ) : (
            <>
              <Fila
                rotulo="Tasas urbanísticas e ICIO"
                iva="no aplica IVA"
                sub="Estimación. Depende del Ayuntamiento (ver cláusulas 2 y 3)."
                importe={<Text style={s.b}>{eur(tasasTotal)}</Text>}
              />
              {tasas.map((t, i) => (
                <Fila key={`t${i}`} dentro rotulo={t.concepto || "Tasa"} importe={eur(t.importe ?? 0)} />
              ))}
            </>
          )}

          <View style={[s.fila, { borderBottomWidth: 0 }]} wrap={false}>
            <View style={s.celdaQue}>
              <Text style={s.total}>COSTE ESTIMADO TOTAL <Text style={[s.iva, { fontFamily: "Helvetica" }]}>(IVA incluido)</Text></Text>
            </View>
            <View style={s.celdaImp}>
              <Text style={s.total}>{eur(d.total)}</Text>
            </View>
          </View>
        </View>

        {d.conHonorarios && d.hojas.length > 0 && (
          <Text style={s.nota}>
            Honorarios calculados según lo ofertado en{" "}
            {d.hojas
              .map((h) =>
                h.borrador || !h.codigo
                  ? "la hoja de encargo en preparación"
                  : `la hoja de encargo ${h.codigo} v${h.version}${h.fecha ? `, de ${fechaCorta(h.fecha)}` : ""}`,
              )
              .join("; ")}
            .
          </Text>
        )}

        <View style={s.raya} />

        <View style={s.clausulas}>
          {d.clausulas.map((c, i) => (
            <Text key={i} style={s.clausula}>
              <Text style={s.b}>
                {i + 1}.{c.titulo ? ` ${c.titulo}:` : ""}
              </Text>
              {c.titulo ? "\n" : " "}
              {c.texto}
            </Text>
          ))}
        </View>

        <View style={s.pie} wrap={false}>
          <Text style={s.contacto}>www.accesalia.com{"\n"}accesalia@accesalia.es{"\n"}(+34) 644 482 971{"\n"}Accesalia</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={s.sello}>firma digital</Text>
            <Text style={s.firma}>
              Madrid, {fechaCorta(fecha)}
              {"\n"}Fdo.: {d.firmante}
            </Text>
          </View>
        </View>
      </Page>

      {/* ===================== pagina 3 · el anexo del edificio */}
      {anexo ? <AnexoPagina a={anexo} {...imgs} /> : null}
    </Document>
  );
}

export async function pdfDeViabilidad(d: DocViabilidad, o: { fecha: string; captura: Buffer | null; anexo: Anexo | null }): Promise<Buffer> {
  const imgs = o.anexo ? await imagenesDelAnexo(o.anexo) : { croquis: null, aerea: null };
  return renderToBuffer(<ViabilidadDoc d={d} fecha={o.fecha} captura={o.captura} anexo={o.anexo} imgs={imgs} />);
}
