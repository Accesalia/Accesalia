// lib/hojaPapel.ts
//
// EL PAPEL DE LA HOJA DE ENCARGO: su estilo y su esqueleto. Lo comparten la
// pantalla donde se genera, el visor y la pagina de imprimir, para que la hoja
// se vea IGUAL en los tres sitios. La foto que se guarda en cada version
// (versiones_hoja.contenido_html) es solo el CONTENIDO del papel; el estilo se
// le pone al pintarla.
//
// Sacado de la plantilla que usaban en Word (cabecera, bandas gris y verde,
// desglose, nota de tasas, clausula del ICIO, forma de pago, conforme) y de la
// maqueta aprobada el 2-oct-2026 (docs/figma/hoja-de-encargo.html).
//
// Las piezas que la pantalla rellena o cambia llevan `data-p`: la cabecera, los
// bloques, el desglose, la clausula del ICIO, la forma de pago y el conforme.
// Todo lo demas se puede editar a mano y se queda como se escriba.

export const ESTILO_PAPEL = `
.hoja-papel{background:#fff;color:#222;font-family:Arial,Helvetica,sans-serif;font-size:11.5px;line-height:1.5}
.hoja-papel h3{text-align:center;font-size:13px;letter-spacing:.02em;margin:0 0 8px}
.hoja-papel p{margin:0 0 6px}
.hoja-papel .membrete{font-size:9px;color:#888;text-align:right}
.hoja-papel .centro{text-align:center}
.hoja-papel .banda{background:#7f7f7f;color:#fff;text-align:center;font-weight:700;padding:3px;margin-top:14px}
.hoja-papel .banda2{background:#92d050;text-align:center;font-weight:700;padding:3px}
.hoja-papel .bloque{margin:10px 0}
.hoja-papel .bloque b{display:block}
.hoja-papel .bloque ul{margin:0 0 0 18px;padding:0;list-style:disc}
.hoja-papel table{width:100%;border-collapse:collapse;margin:8px 0}
.hoja-papel td{padding:3px 4px;border-bottom:1px solid #eee;vertical-align:top}
.hoja-papel td.r{text-align:right;white-space:nowrap}
.hoja-papel .totalbanda{background:#92d050;text-align:center;font-weight:700;padding:3px;margin-top:4px}
.hoja-papel .clausula{font-size:10px;color:#444;margin-top:10px}
.hoja-papel ul.pago{margin:0 0 0 18px;padding:0;list-style:disc}
.hoja-papel .conforme td{border:1px solid #999;height:22px}
.hoja-papel .conforme td:first-child{background:#e6e6e6;width:38%}
.hoja-papel .firma{text-align:right;margin-top:14px}
.hoja-papel .validez{font-size:10px}
`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** La fecha larga de la hoja: "6 de octubre de 2026". */
export const fechaLarga = (d = new Date()) =>
  new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" }).format(d);

/** El esqueleto de una hoja nueva. Las piezas con data-p las rellena la
 *  pantalla segun se marca; el resto es la plantilla y se edita a mano. */
export function esqueletoHoja(): string {
  return `
<div class="membrete">c/ Alhambra 24. 28047 Madrid · B86374055</div>
<h3>HOJA DE ENCARGO DE SERVICIOS PROFESIONALES DE ARQUITECTURA</h3>
<p>Presupuesto del arquitecto D. Daniel de Soto Martín-Caro colegiado nº 24.103 del COAM para la realización de los siguientes trabajos profesionales de arquitectura:</p>
<div data-p="cab" class="centro" style="margin-top:8px"></div>
<div class="banda">IMPORTE HONORARIOS ARQUITECTURA</div>
<div class="banda2">Desglose de Importes:</div>
<div data-p="bloques"></div>
<div data-p="desglose"></div>
<p style="margin-top:8px"><i>Nota:</i> Los importes mencionados no incluyen tasas administrativas, que serán abonadas por la Comunidad de Propietarios.</p>
<div data-p="icio"></div>
<div data-p="pago"></div>
<p class="firma">En Madrid, a <span data-p="fecha">${esc(fechaLarga())}</span><br>Daniel de Soto</p>
<p style="margin-top:16px">Conforme:</p>
<table class="conforme">
<tr><td>Razón Social</td><td data-p="razon"></td></tr>
<tr><td>Dirección</td><td></td></tr>
<tr><td>CIF</td><td data-p="cif"></td></tr>
<tr><td>Firma</td><td></td></tr>
<tr><td>Fecha firma</td><td></td></tr>
<tr><td>Nombre (Representante)</td><td></td></tr>
<tr><td>Nº cuenta para el cargo</td><td></td></tr>
</table>
<p class="validez">(*) Importes válidos durante los 3 meses siguientes a la fecha de emisión.</p>`;
}

/** La clausula del ICIO: solo sale si la hoja lleva la tramitacion de la
 *  licencia (decision del 2-oct-2026, aprobada con la maqueta). */
export const CLAUSULA_ICIO = `<div class="clausula"><b>** Cláusula de Responsabilidad sobre la Bonificación del ICIO</b><br>El arquitecto se compromete a gestionar la solicitud de bonificación del Impuesto sobre Construcciones, Instalaciones y Obras (ICIO) ante el Ayuntamiento correspondiente. No obstante, la concesión de dicha bonificación queda exclusivamente sujeta a los criterios y resoluciones de la administración municipal.<br>En caso de que la bonificación no sea concedida, ya sea por razones imputables o no al arquitecto, incluyendo la declaración de ineficacia de la Declaración Responsable (DR) que implicaría el pago íntegro de la tasa del ICIO incluso si la obra no llegase a ejecutarse, la Comunidad de Propietarios asumirá íntegramente el abono de dicho impuesto, exonerando al arquitecto de cualquier responsabilidad derivada de esta circunstancia.</div>`;

/** Las formas de pago habituales, para elegir en cada linea que se cobra. Se
 *  pueden retocar en la propia hoja. */
export const FORMAS_PAGO = [
  "50% a la contratación (provisión de fondos) · 50% a la entrega del Proyecto",
  "100% a la firma del Plan de Seguridad y Salud",
  "100% a la contratación",
  "1.980 € a la contratación · 3% de lo concedido a la concesión",
];

/** Una version guardada, como pagina entera: para el visor y para imprimir. */
export function paginaHoja(contenido: string, titulo: string, imprimir: boolean): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
<style>${ESTILO_PAPEL}
@page{size:A4;margin:18mm 16mm}
body{margin:0;background:#e9e9e6}
.hoja-papel{max-width:780px;margin:20px auto;padding:38px 46px;box-shadow:0 2px 10px rgba(0,0,0,.12)}
@media print{body{background:#fff}.hoja-papel{margin:0;padding:0;box-shadow:none;max-width:none}}
</style></head><body><div class="hoja-papel">${contenido}</div>${imprimir ? "<script>window.onload=()=>setTimeout(()=>window.print(),200)</script>" : ""}</body></html>`;
}
