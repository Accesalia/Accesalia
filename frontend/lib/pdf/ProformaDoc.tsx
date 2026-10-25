// lib/pdf/ProformaDoc.tsx
//
// EL PDF DE LA PROFORMA (Monica, 12-oct-2026). Los mismos datos que la factura
// de Factusol, en el mismo orden que el presupuesto (PresupuestoDoc): emisor ·
// cliente · documento, numero, fecha · NIF del cliente · lineas · IVA (y la
// retencion de Daniel) · total. Y la cuenta para la transferencia, si la hay.
// No se guarda el fichero: sale de la proforma guardada, siempre igual.

import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { Proforma } from "../proformas";

const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const fecha = (f: string) => f.slice(0, 10).split("-").reverse().join("/");
const GRIS = "#d9d9d9";
const entera = (w: string) => [w];
function T(p: React.ComponentProps<typeof Text>) {
  return <Text hyphenationCallback={entera} {...p} />;
}

const s = StyleSheet.create({
  pagina: { paddingTop: 34, paddingBottom: 60, paddingHorizontal: 40, fontSize: 9, fontFamily: "Helvetica", color: "#222" },
  fila: { flexDirection: "row" },
  emisor: { width: "50%", paddingRight: 12 },
  emisorNombre: { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 3 },
  cliente: { width: "50%", borderWidth: 1, borderColor: "#999", borderRadius: 3, padding: 8, minHeight: 74 },
  clienteNombre: { fontFamily: "Helvetica-Bold", marginBottom: 2 },
  titulo: { marginTop: 16, fontFamily: "Helvetica-Bold", fontSize: 14 },
  caja: { borderWidth: 1, borderColor: "#999", marginTop: 12 },
  cab: { flexDirection: "row", backgroundColor: GRIS, fontFamily: "Helvetica-Bold", fontSize: 7.5 },
  celda: { paddingVertical: 3, paddingHorizontal: 5 },
  dato: { flexDirection: "row" },
  lineaTabla: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: "#ccc" },
  desc: { width: "80%" },
  num: { width: "20%", textAlign: "right" },
  pie: { position: "absolute", left: 40, right: 40, bottom: 26, fontSize: 7, color: "#888", textAlign: "center" },
  totalCaja: { marginTop: 10, flexDirection: "row", justifyContent: "flex-end" },
  total: { borderWidth: 1, borderColor: "#999", flexDirection: "row", alignItems: "center" },
  nota: { marginTop: 16, fontSize: 8.5, color: "#444" },
});

function Celdas({ anchos, textos, cab }: { anchos: string[]; textos: string[]; cab?: boolean }) {
  return (
    <View style={cab ? s.cab : s.dato}>
      {textos.map((t, i) => (
        <T key={i} style={[s.celda, { width: anchos[i] }]}>
          {t}
        </T>
      ))}
    </View>
  );
}

export function ProformaDoc({ p }: { p: Proforma }) {
  const e = p.emisora;
  const conIrpf = p.irpfPct > 0;
  const anchos = conIrpf ? ["20%", "20%", "20%", "20%", "20%"] : ["25%", "25%", "25%", "25%"];
  return (
    <Document title={`Proforma ${p.codigo}`} author={e.nombre}>
      <Page size="A4" style={s.pagina}>
        <View style={s.fila}>
          <View style={s.emisor}>
            <T style={s.emisorNombre}>{e.nombre_legal}</T>
            <T>{e.domicilio}</T>
            <T>{[e.telefono, e.nif].filter(Boolean).join(" · ")}</T>
          </View>
          <View style={s.cliente}>
            <T style={s.clienteNombre}>{p.pagador.nombre}</T>
            {p.pagador.domicilio ? <T>{p.pagador.domicilio}</T> : null}
          </View>
        </View>

        <T style={s.titulo}>FACTURA PROFORMA</T>

        <View style={s.caja}>
          <Celdas cab anchos={["34%", "33%", "33%"]} textos={["NÚMERO", "FECHA", "N.I.F. DEL CLIENTE"]} />
          <View style={s.dato}>
            <T style={[s.celda, { width: "34%", fontFamily: "Helvetica-Bold" }]}>{p.codigo}</T>
            <T style={[s.celda, { width: "33%" }]}>{fecha(p.fecha)}</T>
            <T style={[s.celda, { width: "33%" }]}>{p.pagador.nif || " "}</T>
          </View>
        </View>

        <View style={s.caja}>
          <View style={s.cab} fixed>
            <T style={[s.celda, s.desc]}>DESCRIPCIÓN</T>
            <T style={[s.celda, s.num]}>IMPORTE</T>
          </View>
          {p.lineas.map((l, i) => (
            <View key={i} style={s.lineaTabla} wrap={false}>
              <T style={[s.celda, s.desc]}>{l.concepto}</T>
              <T style={[s.celda, s.num]}>{EUR.format(l.base)}</T>
            </View>
          ))}
        </View>

        <View wrap={false}>
          <View style={s.caja}>
            <Celdas cab anchos={anchos} textos={["BASE", "TIPO I.V.A.", "CUOTA I.V.A.", ...(conIrpf ? [`RETENCIÓN I.R.P.F. ${EUR.format(p.irpfPct)} %`] : []), "TOTAL"]} />
            <Celdas anchos={anchos} textos={[EUR.format(p.base), `${EUR.format(p.ivaPct)} %`, EUR.format(p.iva), ...(conIrpf ? [`- ${EUR.format(p.irpf)}`] : []), EUR.format(p.total)]} />
          </View>
          <View style={s.totalCaja}>
            <View style={s.total}>
              <T style={[s.celda, { backgroundColor: GRIS, fontFamily: "Helvetica-Bold" }]}>TOTAL</T>
              <T style={[s.celda, { fontFamily: "Helvetica-Bold", fontSize: 11, minWidth: 90, textAlign: "right" }]}>{EUR.format(p.total)} euros</T>
            </View>
          </View>
          {p.formaCobro === "cargo_cuenta" ? (
            <T style={s.nota}>Forma de pago: cargo en cuenta{p.cuenta ? `, ${p.cuenta}` : ""}.</T>
          ) : p.formaCobro === "confirming" ? (
            <T style={s.nota}>Forma de pago: confirming.</T>
          ) : (p.cuenta ?? e.iban) ? (
            <T style={s.nota}>Forma de pago: transferencia a la cuenta {p.cuenta ?? e.iban}, indicando {p.codigo} en el concepto.</T>
          ) : null}
          <T style={s.nota}>Documento proforma, sin validez como factura. La factura se emitirá al recibir su conformidad.</T>
        </View>

        <Text style={s.pie} fixed render={({ pageNumber, totalPages }) => `Proforma ${p.codigo} · página ${pageNumber} de ${totalPages}`} />
      </Page>
    </Document>
  );
}

export async function pdfDeProforma(p: Proforma): Promise<{ nombre: string; contenido: Uint8Array }> {
  const buf = await renderToBuffer(<ProformaDoc p={p} />);
  const donde = (p.opp?.nombre ?? "").replace(/^CP\s+/i, "");
  return { nombre: `Proforma ${p.codigo}${donde ? ` - ${donde}` : ""}.pdf`.replace(/[\\/:*?"<>|]/g, ""), contenido: new Uint8Array(buf) };
}
