import type { ReactNode } from "react";
import type { Gestion } from "../../../../lib/gestionOportunidad";
import { RESULTADOS_JUNTA } from "../../../../lib/gestionOportunidad";
import type { DecisionCierre } from "../../../../lib/bloquesDecisionCierre";

// BLOQUES 3 Y 4, EN CRUDO (Monica, 15-oct-2026): "no me importa que esten feos, o
// que no esten aun con la fontaneria conectada, pero quiero ver que campos
// tienen, para saber si existen".
//
// La estructura es la del esqueleto gris del 29-sep
// (docs/figma/gestion-oportunidad-gris.html, bloques 3 y 4). Cada campo lleva
// debajo DONDE VIVE en la base -o "no existe"- para decidir desde aqui. Solo
// lee: las juntas se editan abajo, en "Las juntas", y el diario a la derecha.

const AZUL = "#104269";
const CAJA = "rounded-[10px] border border-[#d9d9d9] bg-white px-[13px] py-[11px]";
const BANDA = "rounded-[5px] border border-[#104269] bg-[#E3EAF0] px-[7px] py-[3px] text-[10px] font-bold uppercase tracking-[0.09em] text-[#1c1c1c]";
const ROT = "text-[10px] font-bold uppercase tracking-[0.09em] text-[#8a8a8a]";
const HUECA = "rounded-[8px] border border-dashed border-[#cfcfcf] bg-[#fafafa] px-2.5 py-2 text-[12px] text-[#a0a0a0]";
const EUR = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2, useGrouping: "always" });
const fecha = (v: string | null) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "—");

/** Donde vive el dato. Sin sitio, en rojo. */
function Vive({ en }: { en: string | null }) {
  return en ? (
    <span className="rounded bg-[#D8ECC4] px-1.5 py-px font-mono text-[10px] text-[#3c5a2a]">{en}</span>
  ) : (
    <span className="rounded bg-red-100 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-red-700">no existe</span>
  );
}

function Campo({ rotulo, en, children }: { rotulo: string; en: string | null; children?: ReactNode }) {
  return (
    <div className="border-t border-black/5 py-2 first:border-t-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className={ROT}>{rotulo}</span>
        <Vive en={en} />
      </div>
      <div className="mt-1 text-[13px] text-[#1c1c1c]">{children ?? <span className="text-[#a0a0a0]">—</span>}</div>
    </div>
  );
}

function Caja({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <div className={CAJA}>
      <div className={BANDA}>{titulo}</div>
      {nota && <div className="mt-1.5 text-[11px] text-[#8a8a8a]">{nota}</div>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Cabeza({ titulo, sale }: { titulo: string; sale: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-[12px] font-bold uppercase tracking-[0.09em] underline" style={{ color: AZUL }}>
        {titulo}
      </h2>
      <span className="text-[11px] text-[#8a8a8a]">{sale}</span>
    </div>
  );
}

/** La caja de Sali existe en la ficha (FichaDesplegada); el relato, no. */
function Sali() {
  return (
    <Caja titulo="Sali">
      <Campo rotulo="El relato" en={null}>
        <span className="text-[#a0a0a0]">La caja existe; lo que cuenta Sali está sin montar (va en serie, al acabar los 4 bloques).</span>
      </Campo>
    </Caja>
  );
}

const resultado = (v: string | null) =>
  v === "modificar_oferta" ? "Piden modificar la oferta" : RESULTADOS_JUNTA.find((r) => r.valor === v)?.texto ?? v ?? "—";

export function Bloque3({ g, d }: { g: Gestion; d: DecisionCierre }) {
  return (
    <section className={CAJA + " flex flex-col gap-3 text-[13px] text-[#1c1c1c]"}>
      <Cabeza titulo="Decisión de los vecinos" sale="Se sale de aquí cuando han decidido" />
      <Sali />
      <div className="grid gap-3 lg:grid-cols-2">
        <Caja titulo="Las juntas" nota="Se editan abajo, en «Las juntas». Aquí, qué campos tiene cada una.">
          {g.juntas.length === 0 ? (
            <div className={HUECA}>Ninguna junta apuntada.</div>
          ) : (
            g.juntas.map((j, i) => (
              <div key={j.id} className="border-t border-black/5 py-1.5 text-[12.5px] first:border-t-0">
                <b>{i + 1}</b> · {fecha(j.fecha)} · {j.celebrada ? "celebrada" : "sin celebrar"} · {resultado(j.resultado)}
                {j.detalle && <span className="text-[#6a6a6a]"> — {j.detalle}</span>}
                {j.seguimiento && <span className="text-[#6a6a6a]"> · perseguir</span>}
              </div>
            ))
          )}
          <div className="mt-2 flex flex-col gap-1 text-[11px] text-[#6a6a6a]">
            <div>Fecha <Vive en="juntas.fecha_junta" /></div>
            <div>Celebrada <Vive en="juntas.celebrada" /></div>
            <div>Resultado (aplazada, piden más presupuestos, modificar oferta…) <Vive en="juntas.resultado" /></div>
            <div>Lo que pasó («no hubo quórum, 9 de 24») <Vive en="juntas.resultado_detalle" /></div>
            <div>Perseguir <Vive en="juntas.requiere_seguimiento" /></div>
            <div>Quórum / votos a favor y en contra <Vive en={null} /></div>
          </div>
        </Caja>

        <Caja titulo="Lo que han pedido cambiar" nota="Lo que obliga a volver al bloque 2">
          <Campo rotulo="La junta pide modificar la oferta" en="juntas.resultado = modificar_oferta" />
          <Campo rotulo="Qué piden cambiar, en concreto" en={null}>
            <span className="text-[#a0a0a0]">Hoy solo cabe en el detalle de la junta.</span>
          </Campo>
          <Campo rotulo="Versiones de la oferta revisadas (el ok de Daniel, por hoja)" en="he_estados_hoja (pendiente_ok_daniel · ok_daniel · cambios_daniel)">
            {d.revisiones.length === 0 ? null : (
              <ul>
                {d.revisiones.map((r) => (
                  <li key={r.clave}>
                    {r.hoja} · {r.estado === "pendiente" ? "pide el ok" : r.estado === "ok" ? "ok" : "cambios"} · {fecha(r.fecha)}
                    {r.quien && <> · {r.quien}</>}
                    {r.nota && <span className="text-[#6a6a6a]"> — {r.nota}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Campo>
          <Campo rotulo="Contratas con las que comparan" en={null} />
        </Caja>
      </div>
      <Caja titulo="Contactos de la comunidad" nota="En la maqueta: «Toñi Cárdenas · vecina · comisión de obras»">
        <Campo rotulo="Administración y presidente" en="comunidad_admin_responsable / puestos" />
        <Campo rotulo="Vecinos que empujan (comisión de obras…)" en={null} />
      </Caja>
    </section>
  );
}

export function Bloque4({ d }: { d: DecisionCierre }) {
  const firmadas = d.hojas.filter((h) => h.fecha_firma);
  const sinFirma = d.hojas.filter((h) => !h.fecha_firma && h.motivo_sin_firma);
  return (
    <section className={CAJA + " flex flex-col gap-3 text-[13px] text-[#1c1c1c]"}>
      <Cabeza titulo="Cierre" sale="Se sale de aquí cuando el dinero está en cuenta — y eso abre el área de proyecto" />
      <Sali />
      <div className="grid gap-3 lg:grid-cols-2">
        <Caja titulo="Han dicho que SÍ">
          <Campo rotulo="Hoja firmada y su fecha" en="he_estados_hoja (firmada_recibida)">
            {firmadas.length === 0
              ? null
              : firmadas.map((h) => (
                  <div key={h.id}>
                    {h.codigo} · firmada {fecha(h.fecha_firma)}
                  </div>
                ))}
          </Campo>
          <Campo rotulo="Qué versión se firmó y por cuánto" en="he_versiones_hoja · he_lineas_compromisos (lo que se cobra)">
            {firmadas.map((h) => (
              <div key={h.id}>
                {h.codigo} · {EUR.format(h.importe)} €
              </div>
            ))}
          </Campo>
          <Campo rotulo="Verificada (lo firmado = lo enviado)" en="he_estados_hoja (ok_comercial)">
            {firmadas.filter((h) => h.verificada).map((h) => (
              <div key={h.id}>
                {h.codigo} · validada {fecha(h.verificada!.fecha)}{h.verificada!.quien && <> · {h.verificada!.quien}</>}
              </div>
            ))}
          </Campo>
          <Campo rotulo="Cambios a boli en la hoja firmada" en={null}>
            <span className="text-[#a0a0a0]">Hoy solo en el diario.</span>
          </Campo>
          <Campo rotulo="Los cobros: hito, importe, factura, cobrado" en="hitos_cobro (por la ficha de facturación de cada línea de la hoja)">
            {d.cobros.length === 0
              ? null
              : d.cobros.map((c, i) => (
                  <div key={i}>
                    {c.hito} · {c.importe != null ? `${EUR.format(c.importe)} €` : "—"} · {c.estado ?? "—"}
                    {c.numero_factura && <> · factura {c.numero_factura}</>}
                    {c.fecha_cobro && <> · cobrado {fecha(c.fecha_cobro)}</>}
                  </div>
                ))}
          </Campo>
        </Caja>

        <Caja titulo="Si han dicho que NO" nota="Se abre siempre, también con un no. Y el porqué del no vale dinero.">
          <Campo rotulo="Resultado final" en="motivo_cierre_oportunidad.resultado_final">
            {d.cierres[0]?.resultado_final ?? null}
          </Campo>
          <Campo rotulo="Por qué no (texto libre)" en="motivo_cierre_oportunidad.motivo_perdido">
            {d.cierres[0]?.motivo_perdido ?? null}
          </Campo>
          <Campo rotulo="Por qué no, de una lista (no hay dinero · otro arquitecto · no lo ven necesario…)" en={null} />
          <Campo rotulo="Fecha del cierre" en="motivo_cierre_oportunidad.fecha_cierre">
            {d.cierres[0]?.fecha_cierre ? fecha(d.cierres[0].fecha_cierre) : null}
          </Campo>
          <Campo rotulo="Hoja que no se firmó y por qué" en="he_estados_hoja (no_firmada / anulada, su nota)">
            {sinFirma.length === 0 ? null : sinFirma.map((h) => <div key={h.id}>{h.codigo} — {h.motivo_sin_firma}</div>)}
          </Campo>
          <Campo rotulo="Y entonces qué hacemos (volver a llamar en 6 meses · avisar si sale subvención · nada)" en={null}>
            <span className="text-[#a0a0a0]">
              Lo más cercano: un recordatorio con fecha (tareas_seguimiento), sin tipo.
              {d.recordatorios.length > 0 && <> Esta opp tiene {d.recordatorios.length}.</>}
            </span>
          </Campo>
        </Caja>
      </div>
    </section>
  );
}
