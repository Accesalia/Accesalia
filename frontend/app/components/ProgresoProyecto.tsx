// Stepper del proyecto: muestra el ciclo de fases APLICABLES (las retiradas =
// no_aplica no se ven) con el punto actual resaltado. Si esta pausado, el punto
// se pinta en rojo + nota. Ver memoria modelo-estado-proyecto.
import { CICLO_PROYECTO, puntoDe, PUNTO_LABEL, type Proyecto } from "../../lib/proyecto";

// Indice del ciclo (escaneo=0 … revision=4) donde esta cada punto.
const PUNTO_IDX: Record<string, number> = {
  pendiente_cobro: -1,
  pendiente_escaneo: 0,
  pendiente_nube: 1,
  pendiente_estado_actual: 2,
  pendiente_tecnico: 3,
  en_desarrollo: 3,
  pendiente_revision: 4,
  listo_para_visar: 5,
};

type Status = "done" | "active" | "todo";

function stagesDe(p: Proyecto): { clave: string; label: string; status: Status }[] {
  const punto = puntoDe(p);
  const idx = PUNTO_IDX[punto] ?? 0;
  const byKey: Record<string, string> = {};
  for (const e of p.etapas_proyecto) byKey[e.tipo_etapa] = e.estado;
  const out: { clave: string; label: string; status: Status }[] = [];
  CICLO_PROYECTO.forEach((f, i) => {
    // las 4 primeras son pasos con etapa; revision (i=4) no es etapa
    if (i < 4 && byKey[f.clave] === "no_aplica") return; // fase retirada: no se ve
    const status: Status = i < idx ? "done" : i === idx ? "active" : "todo";
    out.push({ clave: f.clave, label: f.label, status });
  });
  return out;
}

const BARRA: Record<Status, string> = { done: "bg-emerald-400", active: "bg-amber-400", todo: "bg-black/10" };
const PUNTO_CLS: Record<Status, string> = {
  done: "bg-emerald-400 text-white border-emerald-400",
  active: "bg-amber-400 text-white border-amber-400 ring-4 ring-amber-100",
  todo: "bg-white text-carbon/30 border-black/15",
};

export function ProgresoProyecto({ p, compacto = false }: { p: Proyecto; compacto?: boolean }) {
  const stages = stagesDe(p);
  const pausado = p.estado === "en_pausa";
  const punto = puntoDe(p);

  if (compacto) {
    return (
      <div>
        <div className="flex gap-1">
          {stages.map((s) => (
            <div
              key={s.clave}
              className={`h-1.5 flex-1 rounded-full ${s.status === "active" && pausado ? "bg-red-500" : BARRA[s.status]}`}
              title={s.label}
            />
          ))}
        </div>
        <p className={`mt-1.5 text-[11px] font-semibold ${pausado ? "text-red-600" : "text-amber-700"}`}>
          {pausado ? "⏸ Pausado · " : ""}
          {PUNTO_LABEL[punto] ?? punto}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start">
        {stages.map((s, i) => {
          const rojo = s.status === "active" && pausado;
          return (
            <div key={s.clave} className="flex flex-1 items-start">
              <div className="flex flex-col items-center text-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${
                    rojo ? "border-red-500 bg-red-500 text-white ring-4 ring-red-100" : PUNTO_CLS[s.status]
                  }`}
                >
                  {s.status === "done" ? "✓" : rojo ? "⏸" : i + 1}
                </div>
                <div className={`mt-1.5 text-[11px] font-semibold ${s.status === "active" ? (rojo ? "text-red-600" : "text-amber-700") : "text-carbon/70"}`}>
                  {s.label}
                </div>
              </div>
              {i < stages.length - 1 && <div className={`mt-4 h-0.5 flex-1 ${s.status === "done" ? "bg-emerald-300" : "bg-black/10"}`} />}
            </div>
          );
        })}
      </div>
      {pausado && p.notas && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <span className="font-semibold">Pausa:</span> {p.notas}
        </p>
      )}
    </div>
  );
}
