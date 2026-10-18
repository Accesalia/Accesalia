import Link from "next/link";
import { redirect } from "next/navigation";
import { quienSoy } from "../../../lib/sesion";
import { puedeVerCobros } from "../../../lib/cobros";
import type { TrabajoNube } from "../../../lib/nubes";
import { datosProyectos } from "../../../lib/trabajosTecnico";
import { MarcoDinero } from "../MarcoDinero";
import { Proyectos } from "./Proyectos";
import { Decidir } from "./Decidir";

export const dynamic = "force-dynamic";

// ASIGNAR (Monica, 16-oct-2026; maqueta area-dinero-v1, marco 7): un selector
// Nube | Proyectos. NUBE: a la izquierda lo pendiente de decidir (nube si / no,
// lo marca Alexandra); a la derecha lo asignado como nube, lo que va a llegar.
// «Ver proceso nubes» lleva a la pantalla de Abraham (../nubes). PROYECTOS: lo
// que Alex ya estimo, por asignar a mano, y la lista de cada tecnico con la
// simulacion de cobro (Proyectos.tsx, lib/trabajosTecnico.ts).

const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" });
const hoyIso = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
const ddmmaa = (v: string) => v.slice(0, 10).split("-").reverse().join("/");
const ddmm = (v: string) => ddmmaa(v).slice(0, 5);
function validada(v: string | null) {
  if (!v) return "";
  const dia = new Date(v).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
  return dia === hoyIso() ? "validada hoy" : `validada el ${FECHA.format(new Date(v)).replace(".", "")}`;
}
const frase = (t: string | null) => (t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : null);
const detalle = (t: TrabajoNube) => [t.hoja, frase(t.bloque), validada(t.validada)].filter(Boolean).join(" · ");
function estadoNube(t: TrabajoNube) {
  const n = t.decision;
  if (n?.escaneado) return `escaneado el ${ddmm(n.escaneado)}`;
  if (n?.prevista) return `escaneo previsto el ${ddmm(n.prevista)}`;
  return "sin fecha de escaneo";
}

function Cnt({ n, on }: { n: number; on?: boolean }) {
  return <span className={`rounded-[10px] px-2 py-px text-[12px] font-extrabold ${on ? "bg-white/20" : "bg-black/[.08]"}`}>{n}</span>;
}

export default async function PaginaAsignar({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion/caja");
  if (!puedeVerCobros(yo)) redirect("/menu");
  const ver = (await searchParams).ver === "proyectos" ? "proyectos" : "nube";
  const p = await datosProyectos();
  const d = p.asignar;
  const sw = (clave: "nube" | "proyectos", titulo: string, n?: number) => (
    <Link
      href={clave === "nube" ? "/facturacion/caja" : "/facturacion/caja?ver=proyectos"}
      className={`inline-flex items-center gap-2 rounded-[9px] px-[26px] py-2 text-[15px] font-bold ${ver === clave ? "bg-carbon text-white" : "text-[#55594f] hover:text-carbon"}`}
    >
      {titulo}
      {n != null && <Cnt n={n} on={ver === clave} />}
    </Link>
  );

  return (
    <MarcoDinero yo={yo} area="asignar">
      <div className="mb-[18px] flex items-center gap-6">
        <h1 className="text-[30px] font-[750] leading-[1.1] tracking-[-.5px] text-carbon">Asignar</h1>
        <div className="inline-flex rounded-xl bg-[#e3e6df] p-1">
          {sw("nube", "Nube")}
          {sw("proyectos", "Proyectos", p.porAsignar.length)}
        </div>
      </div>

      {ver === "nube" ? (
        <div className="flex flex-wrap items-start gap-[22px]">
          <div className="w-[560px]">
            <div className="mb-2 flex items-center gap-2 text-[16px] font-extrabold">
              Pendiente de decidir <Cnt n={d.pendientes.length} />
            </div>
            <div className="-mt-1 mb-2.5 text-[14.5px] text-carbon/65">Líneas validadas que implican técnico. ¿Necesitan nube de puntos?</div>
            <div className="overflow-hidden rounded-[14px] border border-[#e3e6df] bg-white">
              <Decidir filas={d.pendientes.map((t) => ({ oppId: t.oppId, nombre: t.nombre, detalle: detalle(t) }))} />
            </div>
          </div>
          <div className="w-[520px]">
            <div className="mb-2 flex items-center gap-2 text-[16px] font-extrabold">
              Asignado como nube <Cnt n={d.enNube.length} />
              <Link href="/facturacion/nubes" className="ml-4 inline-flex h-8 items-center rounded-[9px] border border-[#d6dad2] bg-white px-3 text-[13px] font-bold text-carbon-soft hover:border-carbon/40">
                Ver proceso nubes →
              </Link>
            </div>
            <div className="-mt-1 mb-2.5 text-[14.5px] text-carbon/65">Lo que está en manos de Abraham: lo que va a llegar a Proyectos.</div>
            <div className="overflow-hidden rounded-[14px] border border-[#e3e6df] bg-white">
              {d.enNube.length ? (
                d.enNube.map((t) => (
                  <div key={t.oppId} className="flex items-center gap-3.5 border-b border-[#f0f2ee] px-4 py-[13px] last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="text-[14.5px] font-bold">{t.nombre}</div>
                      <div className="mt-0.5 text-[12.5px] text-[#7b8077]">
                        {t.decision?.decidida ? `recibida el ${ddmmaa(new Date(t.decision.decidida).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }))} · ` : ""}
                        {estadoNube(t)}
                      </div>
                    </div>
                    <span className="inline-flex h-[22px] shrink-0 items-center rounded-full bg-[#e2eaf3] px-2.5 text-[12px] font-bold text-[#3b5f86]">en nube</span>
                  </div>
                ))
              ) : (
                <p className="p-[26px] text-center text-[#7b8077]">Nada asignado como nube.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <Proyectos
            porAsignar={p.porAsignar}
            asignados={p.asignados}
            entregados={p.entregados}
            tecnicos={d.caja.tecnicos}
            fijos={d.caja.fijos}
            sinFecha={d.caja.sinFecha}
            visadoDias={p.visadoDias}
            esperandoNube={d.pendientes.length + d.enNube.length}
            porEstimar={p.porEstimar.length}
          />
        </>
      )}
    </MarcoDinero>
  );
}
