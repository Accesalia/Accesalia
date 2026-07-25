// lib/pdf/ViabilidadDoc.tsx
//
// Plantilla PDF del INFORME DE VIABILIDAD (react-pdf). Replica la estructura del
// informe real (Meson de Paredes): cabecera + datos + textos + tabla de costes +
// clausulas + pie. Se rellena con los datos de la BD. Reutilizable como base
// para otros documentos comerciales.

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { DatosViabilidadPdf } from "./viabilidad-datos";

const CARBON = "#2b2b2b";
const LIMA = "#5fa62f";

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 50, paddingHorizontal: 48, fontSize: 10, color: CARBON, fontFamily: "Helvetica", lineHeight: 1.4 },
  brand: { fontSize: 8, color: "#888", textAlign: "right", marginBottom: 2 },
  titulo: { fontSize: 15, fontFamily: "Helvetica-Bold", color: CARBON, marginTop: 8, marginBottom: 10 },
  datosRow: { flexDirection: "row", marginBottom: 2 },
  datoLabel: { width: 90, color: "#666" },
  datoVal: { flex: 1, fontFamily: "Helvetica-Bold" },
  h2: { fontSize: 10, fontFamily: "Helvetica-Bold", color: LIMA, marginTop: 14, marginBottom: 4, textTransform: "uppercase" },
  parrafo: { marginBottom: 4, textAlign: "justify" },
  // tabla
  tRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ddd", paddingVertical: 3 },
  tHead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: CARBON, paddingBottom: 3, marginTop: 2 },
  cConcepto: { flex: 1 },
  cNum: { width: 80, textAlign: "right" },
  tTotal: { flexDirection: "row", marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: CARBON },
  bold: { fontFamily: "Helvetica-Bold" },
  clausula: { fontSize: 7.5, color: "#555", marginBottom: 3, textAlign: "justify" },
  pie: { position: "absolute", bottom: 24, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: "#888", borderTopWidth: 0.5, borderTopColor: "#ddd", paddingTop: 5 },
});

function eur(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}
function fecha(v: string | null): string {
  if (!v) return "—";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y}`;
}

const CLAUSULAS = [
  "1. Bonificación del ICIO: el arquitecto gestionará la solicitud de bonificación del ICIO ante el Ayuntamiento; su concesión queda sujeta a la administración municipal. Si no se concede, la Comunidad asumirá íntegramente el impuesto, exonerando al arquitecto.",
  "2. Tasas administrativas: dependen del organismo competente y pueden variar; la cantidad indicada es una estimación.",
  "3. A día de hoy las tasas se encuentran entre el 5 y el 7%, susceptible de variar según criterios del Ayuntamiento.",
  "4. Validez de precios: 90 días desde la fecha de emisión.",
  "5. Coste de obras: puede variar al alza o a la baja según la empresa contratista seleccionada.",
  "6. A día de hoy el IVA es del 21%.",
];

export function ViabilidadDoc({ d, fechaEmision }: { d: DatosViabilidadPdf; fechaEmision: string }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>SOLUCIONES DE ACCESIBILIDAD Y ECOEFICIENCIA ACCESALIA S.L. · c/ Alhambra, 24 (28047) Madrid · B86374055</Text>
        <Text style={s.titulo}>ESTUDIO DE VIABILIDAD Y COSTES</Text>

        <View style={s.datosRow}><Text style={s.datoLabel}>Proyecto:</Text><Text style={s.datoVal}>{(d.tipo ?? "—").toUpperCase()}</Text></View>
        <View style={s.datosRow}><Text style={s.datoLabel}>Ubicación:</Text><Text style={s.datoVal}>{d.comunidad.nombre}{d.comunidad.direccion ? ` · ${d.comunidad.direccion}` : ""}</Text></View>
        <View style={s.datosRow}><Text style={s.datoLabel}>Arquitecto:</Text><Text style={s.datoVal}>{d.arquitecto ? `${d.arquitecto.nombre}${d.arquitecto.colegiado ? ` (${d.arquitecto.colegiado})` : ""}` : "—"}</Text></View>
        <View style={s.datosRow}><Text style={s.datoLabel}>Fecha de visita:</Text><Text style={s.datoVal}>{fecha(d.fechaVisita)}</Text></View>

        {d.objeto && (<><Text style={s.h2}>Objeto del proyecto</Text><Text style={s.parrafo}>{d.objeto}</Text></>)}
        {d.descripcion && (<><Text style={s.h2}>Descripción de las intervenciones</Text><Text style={s.parrafo}>{d.descripcion}</Text></>)}

        {d.costeObra && (
          <><Text style={s.h2}>Presupuesto de ejecución material</Text>
          <Text style={s.parrafo}>{eur(d.costeObra.base)} (IVA no incluido)</Text></>
        )}

        {(d.conclusion || d.viable != null) && (
          <><Text style={s.h2}>Conclusión</Text>
          <Text style={s.parrafo}>{d.conclusion ?? (d.viable ? "La actuación es viable." : "La actuación no es viable.")}</Text></>
        )}

        {/* Tabla de costes */}
        <Text style={s.h2}>Costes</Text>
        <View style={s.tHead}>
          <Text style={[s.cConcepto, s.bold]}>Concepto</Text>
          <Text style={[s.cNum, s.bold]}>Base</Text>
          <Text style={[s.cNum, s.bold]}>IVA</Text>
          <Text style={[s.cNum, s.bold]}>Total</Text>
        </View>
        {d.costeObra && (
          <View style={s.tRow}>
            <Text style={s.cConcepto}>Coste de obra (estimativo)</Text>
            <Text style={s.cNum}>{eur(d.costeObra.base)}</Text>
            <Text style={s.cNum}>{d.costeObra.iva}%</Text>
            <Text style={s.cNum}>{eur(d.costeObra.total)}</Text>
          </View>
        )}
        {d.lineas.map((l, i) => (
          <View key={i} style={s.tRow}>
            <Text style={s.cConcepto}>{l.nombre}{l.porcentaje != null ? ` (+${l.porcentaje}% a éxito)` : ""}</Text>
            <Text style={s.cNum}>{eur(l.base)}</Text>
            <Text style={s.cNum}>{l.iva}%</Text>
            <Text style={s.cNum}>{eur(l.total)}</Text>
          </View>
        ))}
        <View style={s.tTotal}>
          <Text style={[s.cConcepto, s.bold]}>TOTAL</Text>
          <Text style={[s.cNum, s.bold]}> </Text>
          <Text style={[s.cNum, s.bold]}> </Text>
          <Text style={[s.cNum, s.bold]}>{eur(d.total)}</Text>
        </View>

        {/* Clausulas */}
        <Text style={s.h2}>Condiciones</Text>
        {CLAUSULAS.map((c, i) => <Text key={i} style={s.clausula}>{c}</Text>)}

        <Text style={{ marginTop: 12, fontSize: 9 }}>Madrid, {fecha(fechaEmision)} · Fdo.: {d.arquitecto?.nombre ?? "Daniel de Soto Martín-Caro"}</Text>

        <View style={s.pie} fixed>
          <Text>www.accesalia.com · accesalia@accesalia.es · (+34) 644 482 971</Text>
          <Text>Viabilidad {d.numero ?? ""} v{d.version}</Text>
        </View>
      </Page>
    </Document>
  );
}
