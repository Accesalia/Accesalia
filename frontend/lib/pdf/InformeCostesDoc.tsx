// lib/pdf/InformeCostesDoc.tsx
//
// EL PDF DEL INFORME DE COSTES (Monica, 12-oct-2026). Sale de la FOTO guardada
// en informes_generados, igual que la pantalla: el mismo texto, en el mismo
// orden. No se guarda el fichero: la foto no cambia, asi que el PDF sale igual
// cada vez que se pide (para verlo, descargarlo o adjuntarlo a un correo).

import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { FotoCostes } from "../informeCostes";

// El € de la Helvetica de los PDF mide de menos y se come el espacio de detras
// ("231.456 €con IVA"): se escribe "euros", que ademas es como se lee en una carta.
const eur = (n: number) => Math.round(n).toLocaleString("es-ES", { useGrouping: "always" }) + " euros";
const pct = (n: number) => (n * 100).toLocaleString("es-ES", { maximumFractionDigits: 1 }) + " %";
const entera = (w: string) => [w];
function T(p: React.ComponentProps<typeof Text>) {
  return <Text hyphenationCallback={entera} {...p} />;
}

const s = StyleSheet.create({
  pagina: { paddingTop: 40, paddingBottom: 60, paddingHorizontal: 48, fontSize: 10, fontFamily: "Helvetica", color: "#222", lineHeight: 1.45 },
  titulo: { fontFamily: "Helvetica-Bold", fontSize: 17, lineHeight: 1.2, marginBottom: 4 },
  sub: { color: "#555", marginTop: 2 },
  h2: { fontFamily: "Helvetica-Bold", fontSize: 12, marginTop: 16, marginBottom: 4 },
  b: { fontFamily: "Helvetica-Bold" },
  tabla: { marginTop: 6 },
  cab: { flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: "#444", fontFamily: "Helvetica-Bold", fontSize: 9 },
  fila: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ccc", fontSize: 9 },
  celda: { paddingVertical: 3, paddingRight: 6 },
  nota: { marginTop: 18, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: "#999", fontSize: 8, color: "#666" },
  pie: { position: "absolute", left: 48, right: 48, bottom: 26, fontSize: 7, color: "#888", textAlign: "center" },
});

export function InformeCostesDoc({ f }: { f: FotoCostes }) {
  return (
    <Document title={`Estimación del coste de la obra · ${f.nombre}`} author="Accesalia">
      <Page size="A4" style={s.pagina}>
        <T style={s.titulo}>Estimación del coste de la obra</T>
        <T style={s.sub}>
          <T style={[s.b, { color: "#222" }]}>{f.nombre}</T>
          {f.direccion && f.direccion !== f.nombre ? ` · ${f.direccion}` : ""}
          {f.lugar ? `, ${f.lugar}` : ""}
        </T>
        <T style={s.sub}>
          {f.obra} · {f.fecha}
        </T>

        {!f.precios ? (
          <T style={{ marginTop: 14 }}>No se pudo estimar: {f.sinEstimar}</T>
        ) : (
          <>
            <T style={s.h2}>Lo que cuesta hoy</T>
            <T>
              A día de hoy, se estima que la obra costará a la comunidad unos <T style={s.b}>{eur(f.precios.hoy)}</T> con IVA (lo
              habitual, entre {eur(f.precios.bajo)} y {eur(f.precios.alto)}); de ellos, {eur(f.precios.pem)} son de ejecución
              material. La estimación se basa en {f.precios.obras} obras parecidas que hemos proyectado en los últimos años,
              actualizadas a precios de hoy.
            </T>

            <T style={s.h2}>Si se espera</T>
            <T>
              Los precios de este tipo de obra siguen subiendo: en nuestras obras, en torno a un {pct(f.subidaAnual)} al año. Si la
              obra se hace dentro de un año, se espera que suba como mínimo un {pct(f.subidaMinima)}.
            </T>
            <View style={s.tabla}>
              <View style={s.cab}>
                <T style={[s.celda, { width: "44%" }]}>Cuándo</T>
                <T style={[s.celda, { width: "28%", textAlign: "right" }]}>Coste estimado (con IVA)</T>
                <T style={[s.celda, { width: "28%", textAlign: "right" }]}>Más que hoy</T>
              </View>
              {f.años.map((a) => (
                <View key={a.cuando} style={s.fila}>
                  <T style={[s.celda, { width: "44%" }]}>{a.cuando}</T>
                  <T style={[s.celda, { width: "28%", textAlign: "right" }]}>{eur(a.valor)}</T>
                  <T style={[s.celda, { width: "28%", textAlign: "right" }]}>{a.mas === null ? "—" : "+" + eur(a.mas)}</T>
                </View>
              ))}
            </View>
          </>
        )}

        <T style={s.h2}>Las ayudas a las que podéis acceder</T>
        {f.ayudas.length === 0 ? (
          <T style={{ color: "#555" }}>No encontramos ayudas que encajen con esta obra en este edificio.</T>
        ) : (
          <View style={s.tabla}>
            <View style={s.cab}>
              <T style={[s.celda, { width: "34%" }]}>Ayuda</T>
              <T style={[s.celda, { width: "33%" }]}>Qué da</T>
              <T style={[s.celda, { width: "33%" }]}>Cuándo</T>
            </View>
            {f.ayudas.map((a) => (
              <View key={a.convocatoria} style={s.fila} wrap={false}>
                <View style={[s.celda, { width: "34%" }]}>
                  <T style={s.b}>{a.convocatoria}</T>
                  {a.cubre ? <T style={{ color: "#555" }}>{a.cubre}</T> : null}
                </View>
                <View style={[s.celda, { width: "33%" }]}>
                  <T>{a.cuantoDa}</T>
                  {a.estimacion ? <T style={s.b}>Para esta obra: {a.estimacion}</T> : null}
                </View>
                <T style={[s.celda, { width: "33%" }]}>{a.cuando}</T>
              </View>
            ))}
          </View>
        )}

        {f.esperar && f.precios ? (
          <View wrap={false}>
            <T style={s.h2}>Esperar a la ayuda</T>
            <T>
              Si se espera a {f.esperar.convocatoria}
              {f.esperar.abierta ? ", que está abierta ahora," : ""}, la concesión llegaría previsiblemente dentro de unos{" "}
              {f.esperar.meses} meses. Para entonces, la obra habrá pasado de {eur(f.precios.hoy)} a unos{" "}
              <T style={s.b}>{eur(f.esperar.entonces)}</T> con IVA: <T style={s.b}>{eur(f.esperar.mas)} más</T>, frente a los{" "}
              {eur(f.esperar.importe)} que daría esa ayuda.
            </T>
          </View>
        ) : null}

        <T style={s.nota}>
          Estimación orientativa, a partir de los datos de nuestras obras y de las convocatorias publicadas: precio de la obra con
          gastos generales, beneficio industrial e IVA; sin honorarios técnicos, tasas ni licencia. El precio definitivo depende del
          proyecto, de las mediciones reales y de los precios del momento de contratar; las ayudas, de sus bases y de que se
          convoquen.
          {f.nota ? ` ${f.nota}` : ""}
          {f.entrada.paradasDeCatastro ? ` Paradas tomadas de Catastro (${f.entrada.paradasDeCatastro}).` : ""}
        </T>

        <Text style={s.pie} fixed render={({ pageNumber, totalPages }) => `Accesalia · Estimación del coste de la obra · ${f.fecha} · página ${pageNumber} de ${totalPages}`} />
      </Page>
    </Document>
  );
}

export async function pdfDeInformeCostes(f: FotoCostes): Promise<Buffer> {
  return renderToBuffer(<InformeCostesDoc f={f} />);
}
