// lib/pdf/PresupuestoDoc.tsx
//
// EL PDF DEL PRESUPUESTO (Monica, 10-oct-2026). Lleva los mismos datos que el de
// Factusol ("el formato me da mas igual, pero los datos conservaria los mismos,
// que sabemos que funcionan"), en el mismo orden:
//   emisor (nombre, domicilio, telefono, NIF) · cliente (nombre, domicilio, CP,
//   poblacion, provincia) · documento, numero, pagina, fecha · NIF del cliente y
//   forma de pago · lineas (descripcion, cantidad, precio, total) · cuadro de IVA
//   (tipo, base, cuota) · total.
// Fuera lo que Factusol imprime vacio o sin uso: articulo, agente, descuento,
// pronto pago, portes, financiacion, recargo de equivalencia y observaciones.

import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { EMISOR, IVA, TEXTO_FORMA_PAGO, type Cliente, type FormaPago, type LineaPresupuesto } from "../motorPresupuesto";

export type DocPresupuesto = {
  codigo: string;
  fecha: string;
  cliente: Cliente;
  formaPago: FormaPago;
  lineas: LineaPresupuesto[];
  base: number;
  cuota: number;
  total: number;
};

const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const fecha = (f: string) => f.slice(0, 10).split("-").reverse().join("/");
const GRIS = "#d9d9d9";

// Sin cortar palabras con guion ("ECOEFICIEN-CIA", "res-idencial"): la palabra
// entera pasa a la linea siguiente. Solo en este documento.
const entera = (w: string) => [w];
// Sin interlineado propio en la pagina: puesto ahi, react-pdf deja en blanco
// los textos que se rellenan al final (el numero de pagina).
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
  caja: { borderWidth: 1, borderColor: "#999", marginTop: 12 },
  cab: { flexDirection: "row", backgroundColor: GRIS, fontFamily: "Helvetica-Bold", fontSize: 7.5 },
  celda: { paddingVertical: 3, paddingHorizontal: 5 },
  dato: { flexDirection: "row" },
  lineaTabla: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: "#ccc" },
  desc: { width: "64%" },
  num: { width: "12%", textAlign: "right" },
  pie: { position: "absolute", left: 40, right: 40, bottom: 26, fontSize: 7, color: "#888", textAlign: "center" },
  totalCaja: { marginTop: 10, flexDirection: "row", justifyContent: "flex-end" },
  total: { borderWidth: 1, borderColor: "#999", flexDirection: "row", alignItems: "center" },
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

export function PresupuestoDoc({ d }: { d: DocPresupuesto }) {
  const c = d.cliente;
  return (
    <Document title={`Presupuesto ${d.codigo}`} author="Accesalia">
      <Page size="A4" style={s.pagina}>
        <View style={s.fila}>
          <View style={s.emisor}>
            <T style={s.emisorNombre}>{EMISOR.nombre}</T>
            <T>{EMISOR.domicilio}</T>
            <T>
              {EMISOR.cp} {EMISOR.poblacion} {EMISOR.provincia}
            </T>
            <T>
              {EMISOR.telefono} · {EMISOR.nif}
            </T>
          </View>
          <View style={s.cliente}>
            <T style={s.clienteNombre}>{c.nombre}</T>
            {c.domicilio ? <T>{c.domicilio}</T> : null}
            <T>{[c.cp, c.poblacion].filter(Boolean).join(" ")}</T>
            {c.provincia ? <T>{c.provincia}</T> : null}
          </View>
        </View>

        <View style={s.caja}>
          <Celdas cab anchos={["25%", "25%", "25%", "25%"]} textos={["DOCUMENTO", "NÚMERO", "PÁGINA", "FECHA"]} />
          <View style={s.dato}>
            <T style={[s.celda, { width: "25%" }]}>Presupuesto</T>
            <T style={[s.celda, { width: "25%", fontFamily: "Helvetica-Bold" }]}>{d.codigo}</T>
            <Text style={[s.celda, { width: "25%" }]} render={({ pageNumber }) => String(pageNumber)} />
            <T style={[s.celda, { width: "25%" }]}>{fecha(d.fecha)}</T>
          </View>
          <Celdas cab anchos={["25%", "75%"]} textos={["N.I.F.", "FORMA DE PAGO"]} />
          <Celdas anchos={["25%", "75%"]} textos={[c.nif || " ", TEXTO_FORMA_PAGO[d.formaPago]]} />
        </View>

        <View style={s.caja}>
          <View style={s.cab} fixed>
            <T style={[s.celda, s.desc]}>DESCRIPCIÓN</T>
            <T style={[s.celda, s.num]}>CANTIDAD</T>
            <T style={[s.celda, s.num]}>PRECIO UD.</T>
            <T style={[s.celda, s.num]}>TOTAL</T>
          </View>
          {d.lineas.map((l, i) => (
            <View key={i} style={s.lineaTabla} wrap={false}>
              <T style={[s.celda, s.desc]}>{l.concepto}</T>
              <T style={[s.celda, s.num]}>1,00</T>
              <T style={[s.celda, s.num]}>{EUR.format(l.importe)}</T>
              <T style={[s.celda, s.num]}>{EUR.format(l.importe)}</T>
            </View>
          ))}
        </View>

        <View wrap={false}>
          <View style={s.caja}>
            <Celdas cab anchos={["25%", "25%", "25%", "25%"]} textos={["TIPO I.V.A.", "BASE", "I.V.A.", "TOTAL"]} />
            <Celdas
              anchos={["25%", "25%", "25%", "25%"]}
              textos={[`${EUR.format(IVA)} %`, EUR.format(d.base), EUR.format(d.cuota), EUR.format(d.total)]}
            />
          </View>
          <View style={s.totalCaja}>
            <View style={s.total}>
              <T style={[s.celda, { backgroundColor: GRIS, fontFamily: "Helvetica-Bold" }]}>TOTAL</T>
              <T style={[s.celda, { fontFamily: "Helvetica-Bold", fontSize: 11, minWidth: 90, textAlign: "right" }]}>{EUR.format(d.total)} €</T>
            </View>
          </View>
        </View>

        <Text style={s.pie} fixed render={({ pageNumber, totalPages }) => `Presupuesto ${d.codigo} · página ${pageNumber} de ${totalPages}`} />
      </Page>
    </Document>
  );
}

export async function pdfDePresupuesto(d: DocPresupuesto): Promise<Buffer> {
  return renderToBuffer(<PresupuestoDoc d={d} />);
}
