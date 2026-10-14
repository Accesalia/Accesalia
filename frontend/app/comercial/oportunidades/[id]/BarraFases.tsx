import type { BarraOportunidad, EstadoTramo, Paso } from "../../../../lib/cuadroComercial";

// LA BARRA DE FASES DE LA LISTA DE OPPS ABIERTAS, en la cabecera de la ficha
// (Monica, 14-oct-2026): "sin NINGUN cambio salvo algun toque estetico: fondo
// negro, contrastes y algo de color en los textos para que se lean". Lee lo
// mismo que la de la lista (lib/cuadroComercial.ts, leerBarra): aqui solo se
// pinta sobre negro.

const ddmmaa = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`;

function Tramo({ estado, paso }: { estado: EstadoTramo; paso: Paso }) {
  const base = "self-center rounded-full ";
  const t = paso.corto.join(" ").trim();
  if (estado === "saltado" || estado === "no_aplica")
    return <span title={`${t}: ${estado === "saltado" ? "saltado (sigue abierto)" : "no aplica"}`} className={base + "h-2 border border-dashed border-white/30"} />;
  if (estado === "hecho") return <span title={`${t}: hecho`} className={base + "h-2 bg-[#8CCB4E]"} />;
  if (estado === "actual")
    return (
      <span
        title={`${t}: aquí está`}
        className={base + "h-3.5 border-2 " + (paso.ajeno ? "border-[#9DBDE6] bg-[#5680A1]" : "border-[#B5E08A] bg-[#4E8A25]")}
      />
    );
  return <span title={`${t}: pendiente`} className={base + "h-2 bg-white/25"} />;
}

export function BarraFases({ b }: { b: BarraOportunidad }) {
  return (
    <div className="mt-[10px] rounded-[10px] bg-[#232323] px-4 pb-3 pt-3">
      {/* EL NOMBRE DE CADA FASE, encima de su tramo (Monica, 14-oct-2026: "creo
          que cabe bien con ese ancho de pantalla"). El de la fase actual, en claro. */}
      <div className="mb-1.5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${b.pasos.length}, minmax(0, 1fr))` }}>
        {b.pasos.map((p) => {
          const aqui = b.tramos[p.clave] === "actual";
          return (
            <div
              key={p.clave}
              className={"min-w-0 truncate text-[10.5px] font-semibold leading-tight " + (aqui ? (p.ajeno ? "text-[#9DBDE6]" : "text-white") : "text-white/50")}
              title={p.corto.join(" ").trim()}
            >
              {p.numero && <span className="mr-1 tabular-nums opacity-60">{p.numero}</span>}
              {p.corto.join(" ").trim()}
            </div>
          );
        })}
      </div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${b.pasos.length}, minmax(0, 1fr))` }}>
        {b.pasos.map((p) => (
          <Tramo key={p.clave} paso={p} estado={b.tramos[p.clave] ?? "pendiente"} />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap items-baseline gap-x-8 gap-y-1 text-[12.5px] text-white/70">
        {b.actual && (
          <span>
            Está en{" "}
            <b className={b.actual.ajeno ? "text-[#9DBDE6]" : "text-white"}>
              {b.actual.numero ? `${b.actual.numero} · ` : ""}
              {b.actual.nombre}
            </b>
          </span>
        )}
        {b.esperando ? (
          <span className="font-semibold text-[#9DBDE6]">
            esperando {b.esperando}
            {b.diasAqui !== null ? `, ${b.diasAqui} ${b.diasAqui === 1 ? "día" : "días"}` : ""}
          </span>
        ) : b.diasAqui !== null ? (
          <span>
            {b.diasAqui} {b.diasAqui === 1 ? "día" : "días"} aquí
          </span>
        ) : null}
        {b.proximo && <span className="font-semibold text-white/90">{b.proximo}</span>}
        <span className="ml-auto text-[15px] font-bold text-white">últ. contacto {b.ultimoContacto ? ddmmaa(b.ultimoContacto) : "—"}</span>
      </div>
    </div>
  );
}
