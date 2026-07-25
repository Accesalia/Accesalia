// Fases del expediente virtual (las ventanitas del tablero). Coinciden a grandes
// rasgos con los tableros de Monday. `activa` = ya tiene pantalla; el resto son
// esqueleto ("proximamente"). Lista compartida por la portada y el tablero.

export type Fase = {
  clave: string;
  titulo: string;
  icono: string;
  activa: boolean;
  descripcion: string; // que mostrara/agrupara cuando este montada
};

export const FASES: Fase[] = [
  { clave: "datos", titulo: "Datos administrativos", icono: "⌂", activa: true, descripcion: "Identidad, dirección, presidencia y administración." },
  { clave: "comercial", titulo: "Fase comercial", icono: "◇", activa: true, descripcion: "Hojas de encargo, presupuestos y captación." },
  { clave: "facturacion", titulo: "Facturación", icono: "€", activa: true, descripcion: "Items, hitos de cobro, facturado vs pendiente." },
  { clave: "proyecto", titulo: "Fase proyecto", icono: "▤", activa: true, descripcion: "Escaneo, nube, estado actual, solución, revisión de Daniel." },
  { clave: "visado", titulo: "Fase visado", icono: "✎", activa: true, descripcion: "Visado COAM: código TL, tasas y PDF maestro." },
  { clave: "licencia", titulo: "Fase licencia", icono: "✓", activa: true, descripcion: "Licencia/DR, ayto o ECU, tasas y requerimientos." },
  { clave: "tres_presupuestos", titulo: "Tres Presupuestos", icono: "⚑", activa: true, descripcion: "Presupuestos de contrata, comparación, votación y adjudicación." },
  { clave: "obra", titulo: "Fase obra", icono: "⬒", activa: true, descripcion: "Inicio, seguimiento y fin de obra; constructora, CSS y CFO." },
  { clave: "doc_tecnica", titulo: "Documentación técnica", icono: "▦", activa: false, descripcion: "IEE, LEE, CEE, informes periciales — documentos del edificio, reutilizables." },
  { clave: "subvenciones", titulo: "Fase subvenciones", icono: "★", activa: false, descripcion: "Convocatorias, presentaciones, importes concedidos, justificación." },
  { clave: "caes", titulo: "Fase CAES", icono: "⛑", activa: false, descripcion: "Coordinación de actividades empresariales." },
];
