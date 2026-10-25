import { puntoActual, HITO_ESTADO, type HitoOportunidad, type HitoCatalogo } from "../../../lib/comercial";

// Barra "¿en qué punto estamos?": hitos aplicables en orden + ramales (3D).
// Presentacional (sin estado); se reutiliza en el hub y en la lista de oportunidades.
export function Barra({ hitos, catalogo, sinEnlaces = false }: { hitos: HitoOportunidad[]; catalogo: HitoCatalogo[]; sinEnlaces?: boolean }) {
  const cat = new Map(catalogo.map((h) => [h.clave, h]));
  const pasos = hitos
    .filter((h) => h.aplicable && cat.get(h.hito) && !cat.get(h.hito)!.es_ramal)
    .map((h) => ({ h, c: cat.get(h.hito)! }))
    .sort((a, b) => a.c.orden - b.c.orden);
  const ramales = hitos
    .filter((h) => h.aplicable && cat.get(h.hito)?.es_ramal)
    .map((h) => ({ h, c: cat.get(h.hito)! }));
  const actual = puntoActual(hitos, catalogo);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
        {pasos.map(({ h, c }, i) => {
          const est = HITO_ESTADO[h.estado] ?? HITO_ESTADO.pendiente;
          const esActual = actual?.clave === c.clave;
          return (
            <span key={c.clave} className="flex items-center gap-1">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${est.clase} ${esActual ? "ring-2 ring-lima ring-offset-1" : ""}`}>
                {c.nombre}
              </span>
              {i < pasos.length - 1 && <span className="text-carbon/25">→</span>}
            </span>
          );
        })}
      </div>
      {ramales.map(({ h, c }) => {
        const est = HITO_ESTADO[h.estado] ?? HITO_ESTADO.pendiente;
        return (
          <div key={c.clave} className="mt-1.5 text-[11px] text-carbon/50">
            ↳ {c.nombre}: <span className={`rounded-full px-2 py-0.5 font-medium ${est.clase}`}>{est.label}</span>
            {h.enlace_url && !sinEnlaces && <a href={h.enlace_url} target="_blank" className="ml-1 text-lima-dark hover:underline">Dropbox ↗</a>}
            {h.enlace_url && sinEnlaces && <span className="ml-1 text-carbon/40">📎</span>}
          </div>
        );
      })}
    </div>
  );
}
