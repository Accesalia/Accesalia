import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import type { InformeGuardado } from "../../../../lib/informeCostes";
import type { AdminNegociacion } from "../../../../lib/negociacion";
import type { ContactoComunidad } from "../../../../lib/gestionOportunidad";
import { textoReservado, type ReservaAdmin } from "../../../../lib/bloque1";
import { Edificio, type ParteEdificio } from "./Edificio";
import { accionEntrada } from "./acciones";
import { AnadirContacto, DatoEditable } from "./DatoEditable";
import { SubirConTipo } from "./SubirConTipo";
import type { DocCajon } from "../../../../lib/cajonDocumentos";

// BLOQUE 1 · TOMA DE DATOS, CON MENU (Monica, 29-oct-2026; su maqueta «Bloque 1 con menú»): como el 2 y el 3, el menu a
// la izquierda, lo elegido en el centro y el diario a la derecha, en un solo recuadro. Arriba del centro, siempre, la tira
// del 3D y la viabilidad sobre una banda gris. Cada grupo del menu, con su linea de color a la izquierda (como la hoja de
// encargo). Nada de lo que hace funcionar cada parte cambia: solo se ve una cada vez.

export type VistaBloque1 = "catastro" | "pedir" | "hacer" | "visto" | "datos" | "costes" | "informe" | "fotos" | "documentos";
export const VISTAS_BLOQUE1: VistaBloque1[] = ["catastro", "pedir", "hacer", "visto", "datos", "costes", "informe", "fotos", "documentos"];

const AZUL = "#104269";
const ENLACE = "font-semibold text-[#104269] underline-offset-2 hover:underline";
const BOTON_P = "inline-flex items-center rounded-[7px] bg-lima px-3.5 py-2 text-[13px] font-bold text-white transition hover:bg-lima-dark";
const HORA = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
const EUR = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" });

type Item = { v: VistaBloque1; num: string; texto: ReactNode; cuenta?: number };
const GRUPOS: { titulo: string; color: string; items: Item[] }[] = [
  {
    titulo: "1 · El edificio",
    color: "#2f6fb3",
    items: [
      { v: "catastro", num: "1.1", texto: <>Lo que dice el <span className="font-semibold text-[#4a7aab]">Catastro</span></> },
      { v: "pedir", num: "1.2", texto: <>Lo que condiciona lo que puedo <span className="font-semibold text-[#4f8a3c]">pedir</span></> },
      { v: "hacer", num: "1.3", texto: <>Lo que condiciona lo que puedo <span className="font-semibold text-[#9a4a48]">hacer</span></> },
    ],
  },
  {
    titulo: "2 · Lo que sabemos nosotros",
    color: "#3f8a1c",
    items: [
      { v: "visto", num: "2.1", texto: "Lo que vimos en la visita" },
      { v: "datos", num: "2.2", texto: "Datos y contactos" },
    ],
  },
  { titulo: "3 · Soporte para vender", color: "#d4860b", items: [{ v: "costes", num: "3.1", texto: "Estudio de costes" }, { v: "informe", num: "3.2", texto: "Informe comercial" }] },
  { titulo: "4 · Archivo", color: "#8a929b", items: [{ v: "fotos", num: "4.1", texto: "Fotos" }, { v: "documentos", num: "4.2", texto: "Documentos" }] },
];

const TITULOS: Record<VistaBloque1, [string, string]> = {
  catastro: ["Lo que dice el Catastro", "El edificio, según Catastro y el geoportal."],
  pedir: ["Lo que condiciona lo que puedo pedir", "Las ayudas a las que puede ir y lo que han cobrado los de al lado."],
  hacer: ["Lo que condiciona lo que puedo hacer", "Lo que me ata: restricciones y protección."],
  visto: ["Lo que vimos en la visita", "Lo que no dice ningún servicio: lo vimos nosotros. Cada respuesta queda firmada con quién y cuándo."],
  datos: ["Datos y contactos", "Quién es quién en esta opp, y lo que hay que tener en cuenta con cada uno. Las notas van al diario."],
  costes: ["Estudio de costes", "Lo que costaría la obra, las ayudas y cuánto sube si se espera. Útil también para la junta."],
  informe: ["Informe comercial", "El informe del edificio tal como lo ve el cliente."],
  fotos: ["Fotos", "Las de las notas del diario y las que se suban aquí."],
  documentos: ["Documentos", "Lo archivado de esta opp: CIF, actas, planos, el presupuesto de la contrata…"],
};

/** Una caja de «Datos y contactos»: blanca con borde gris oscuro sobre el fondo gris. */
function Caja({ titulo, extra, children }: { titulo: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-[10px] border border-[#5d646c] bg-white px-4 py-3">
      <div className="mb-2 flex items-baseline gap-3 text-[11.5px] font-extrabold uppercase tracking-[0.08em]" style={{ color: AZUL }}>
        {titulo}
        {extra && <span className="ml-auto text-[12px] font-semibold normal-case tracking-normal">{extra}</span>}
      </div>
      {children}
    </div>
  );
}

/** Una nota sobre lo de esa caja: va al diario de la opp, con su «Sobre …» delante. */
function Nota({ id, sobre, placeholder }: { id: string; sobre: string; placeholder: string }) {
  return (
    <form action={accionEntrada.bind(null, id)} className="mt-2.5 flex items-start gap-2">
      <input type="hidden" name="canal" value="escrito" />
      <input type="hidden" name="sobre" value={sobre} />
      <textarea
        name="texto"
        rows={1}
        required
        aria-label={`Nota sobre ${sobre}`}
        placeholder={placeholder}
        className="min-h-[34px] w-full resize-none rounded-[6px] border border-carbon/25 bg-white px-2.5 py-1.5 text-[13px] leading-relaxed [field-sizing:content]"
      />
      <button className="rounded-[6px] border border-carbon bg-white px-3 py-1.5 text-[12.5px] font-bold hover:bg-[#f3f3f3]">Anotar</button>
    </form>
  );
}

export function Bloque1({
  id,
  ver,
  tira,
  referencia,
  distrito,
  comunidadId,
  admins,
  reservas,
  contactos,
  trajo,
  informes,
  fotos,
  nFotos,
  cajon,
  nDocs,
  presupuestosContrata,
  tipoPresupuestoContrata,
  diario,
}: {
  id: string;
  ver: VistaBloque1 | null;
  tira: ReactNode;
  referencia: string | null;
  distrito: string | null;
  comunidadId: string | null;
  admins: AdminNegociacion[];
  reservas: Map<string, ReservaAdmin>;
  contactos: ContactoComunidad[];
  trajo: string | null;
  informes: InformeGuardado[];
  fotos: ReactNode;
  nFotos: number;
  cajon: ReactNode;
  nDocs: number;
  /** Los documentos archivados como «Presupuesto de la contrata»: si los hay, el proyecto se ajusta a ellos. */
  presupuestosContrata: DocCajon[];
  /** El tipo «Presupuesto de la contrata» del cajon, para subirlo desde su hueco ya archivado. */
  tipoPresupuestoContrata: string | null;
  diario: ReactNode;
}) {
  const vista: VistaBloque1 = ver ?? "catastro";
  const href = (v: VistaBloque1) => `/comercial/oportunidades/${id}?bloque=1&ver=${v}`;
  const costes = informes.filter((x) => x.tipo === "estimacion_costes");
  const cuenta: Partial<Record<VistaBloque1, number>> = { costes: costes.length, fotos: nFotos, documentos: nDocs };
  const [titulo, sub] = TITULOS[vista];
  const sinEdificio = (
    <div className="rounded-[10px] border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-[12px] leading-snug text-amber-900/80">
      <b>Todavía no hay edificio que mirar.</b> Esta oportunidad no tiene referencia catastral, así que no se puede traer ni el
      Catastro, ni la zona, ni las subvenciones. Se arregla fijando la dirección.
    </div>
  );
  const edificio = (parte: ParteEdificio) =>
    referencia ? (
      <Suspense fallback={<p className="animate-pulse px-1 text-[12px] text-[#8a8a8a]">Trayendo el edificio de Catastro…</p>}>
        <Edificio referencia={referencia} id={id} distrito={distrito} solo={parte} />
      </Suspense>
    ) : (
      sinEdificio
    );

  return (
    <section className="grid min-h-[620px] overflow-hidden rounded-[10px] bg-white text-[13px] text-carbon xl:grid-cols-[250px_minmax(0,1fr)_300px]">
      {/* ============================== EL MENU ============================== */}
      <nav className="border-b border-[#e6e6e6] bg-[#fafbfc] py-3.5 pr-2 xl:border-b-0 xl:border-r">
        {GRUPOS.map((g) => (
          <div key={g.titulo} className="mb-3.5 ml-2.5 border-l-4" style={{ borderColor: g.color }}>
            <div className="px-3 pb-1 pt-0.5 text-[11px] font-extrabold uppercase tracking-[0.08em]" style={{ color: g.color }}>
              {g.titulo}
            </div>
            {g.items.map((it) => (
              <Link
                key={it.v}
                href={href(it.v)}
                scroll={false}
                replace
                className={"flex items-center gap-2 rounded-r-[6px] px-3 py-1.5 transition " + (vista === it.v ? "font-bold" : "hover:bg-[#eef2f6]")}
                style={vista === it.v ? { background: `color-mix(in srgb, ${g.color} 14%, #fff)` } : undefined}
              >
                <span className="min-w-[24px] text-[11.5px] font-normal text-carbon/65">{it.num}</span>
                <span className="flex-1 leading-snug">{it.texto}</span>
                {cuenta[it.v] !== undefined && cuenta[it.v]! > 0 && (
                  <span className="rounded-[20px] bg-[#dbe5ee] px-2 py-px text-[11px] font-bold text-[#104269]">{cuenta[it.v]}</span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* ============================== EL CONTENIDO ============================== */}
      <div className="min-w-0">
        {/* La tira del 3D y la viabilidad, siempre, sobre una banda gris de lado a lado (29-oct-2026). */}
        <div className="bg-[#575d64] px-4 py-2.5">{tira}</div>
        <div className={"px-5 pb-5 pt-4 " + (vista === "datos" ? "min-h-full bg-[#f1f3f5]" : "")}>
          <div className="mb-3">
            <div className="flex flex-wrap items-baseline gap-3">
              <h3 className="text-[18px] font-bold">{titulo}</h3>
              {vista === "costes" && (
                <Link href="/referencia/estimacion" className={"ml-auto " + BOTON_P}>
                  + Emitir
                </Link>
              )}
              {vista === "informe" && referencia && (
                <a href={`/comercial/oportunidades/${id}/anexo`} target="_blank" rel="noreferrer" className={"ml-auto " + ENLACE}>
                  Abrir el PDF
                </a>
              )}
            </div>
            <p className="mt-0.5 text-[13px] text-carbon/70">{sub}</p>
          </div>

          {(vista === "catastro" || vista === "pedir" || vista === "hacer" || vista === "visto") && edificio(vista)}

          {vista === "datos" && (
            <div className="flex flex-col gap-3">
              <Caja titulo={admins.length > 1 ? "Administradores de la comunidad" : "Administrador de la comunidad"}>
                {admins.length === 0 && (
                  <DatoEditable oppId={id} campo="admin" hayDato={false}>
                    <span className="text-carbon/60">— no se apuntó.</span>
                  </DatoEditable>
                )}
                {admins.map((a) => {
                  const r = a.empresaId ? reservas.get(a.empresaId) : undefined;
                  return (
                    <div key={(a.personaId ?? "") + (a.empresaId ?? "")} className="border-b border-dashed border-[#e5e5e5] py-1.5 last:border-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                        <DatoEditable oppId={id} campo="admin" hayDato>
                          <b className="text-[14px]">{a.persona}</b>
                          {a.empresa && (
                            <span className="text-carbon/65">
                              {" "}
                              · {a.empresa}
                            </span>
                          )}
                        </DatoEditable>
                        {a.telefono && <span className="text-carbon/75">{a.telefono}</span>}
                      </div>
                      {r?.reservado && (
                        <div className="mt-2 flex gap-2.5 rounded-[8px] border-[1.5px] border-[#e2a3a1] bg-[#fbeaea] px-3 py-2 text-[#5c1f1e]">
                          ⚠
                          <span>
                            <b className="text-[#720808]">No ofrecerle jamás: {textoReservado(r.reservado)}.</b>
                            {r.condiciones && <> {r.condiciones}</>}
                          </span>
                        </div>
                      )}
                      {a.comision && (
                        <div className="mt-1.5 flex gap-3 text-[13px]">
                          <b className="min-w-[170px] font-semibold text-carbon/70">Comisión que le pagamos</b>
                          <span>
                            {a.comision}
                            {a.cobraOtro && <span className="text-carbon/65"> · {a.cobraOtro}</span>}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
                <Nota id={id} sobre="el administrador" placeholder="Nota sobre el administrador en esta opp (va al diario)" />
              </Caja>

              <Caja
                titulo="Contactos de la comunidad"
              >
                {contactos.length === 0 && <p className="text-carbon/60">Ningún contacto apuntado.</p>}
                {contactos.map((c, i) => (
                  <div key={i} className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-dashed border-[#e5e5e5] py-1.5 last:border-0">
                    <span>
                      <b className="text-[14px]">{c.nombre}</b>
                      {c.papel && <span className="text-carbon/65"> · {c.papel}</span>}
                    </span>
                    {c.telefono && <span className="text-carbon/75">{c.telefono}</span>}
                  </div>
                ))}
                <AnadirContacto oppId={id} />
                <Nota id={id} sobre="los contactos de la comunidad" placeholder="Nota sobre los vecinos o el presidente (va al diario)" />
              </Caja>

              <Caja titulo="Quién nos lo trae">
                <div className="flex gap-3 text-[13px]">
                  <b className="min-w-[170px] font-semibold text-carbon/70">Lo trae</b>
                  <DatoEditable oppId={id} campo="trajo" hayDato={!!trajo}>
                    <span>{trajo ?? <span className="text-carbon/55">— no se apuntó.</span>}</span>
                  </DatoEditable>
                </div>
                {/* EL PRESUPUESTO DE LA CONTRATA (Monica, 29-oct-2026): no se exige, pero su hueco esta siempre para completarlo
                    si viene. Si esta, hay que tenerlo en cuenta: el proyecto se ajusta a lo que presupuesto la contrata. */}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                  <b className="min-w-[170px] font-semibold text-carbon/70">Presupuesto de la contrata</b>
                  {presupuestosContrata.length === 0 ? (
                    <>
                      <span className="text-carbon/50">— si viene,</span>
                      {tipoPresupuestoContrata && <SubirConTipo oppId={id} tipoId={tipoPresupuestoContrata} rotulo="súbelo aquí" />}
                    </>
                  ) : (
                    <span className="flex flex-wrap items-center gap-x-2">
                      {presupuestosContrata.map((d, i) => (
                        <span key={d.id}>
                          {i > 0 && " · "}
                          {d.url ? (
                            <a href={d.url} target="_blank" rel="noreferrer" className={ENLACE}>
                              {d.nombre}
                            </a>
                          ) : (
                            d.nombre
                          )}
                        </span>
                      ))}
                      {tipoPresupuestoContrata && <SubirConTipo oppId={id} tipoId={tipoPresupuestoContrata} rotulo="+ otro" />}
                    </span>
                  )}
                </div>
                {presupuestosContrata.length > 0 && (
                  <div className="mt-2 flex gap-2.5 rounded-[8px] border-[1.5px] border-[#e0b04a] bg-[#fffaf0] px-3 py-2 text-[#5a3d00]">
                    ⚠<b>Hay presupuesto de la contrata: el proyecto tiene que ajustarse a lo que presupuestó.</b>
                  </div>
                )}
                <Nota id={id} sobre="quién nos lo trae" placeholder="Lo que contó al traerla, o lo que hay que tener en cuenta (va al diario)" />
              </Caja>
            </div>
          )}

          {vista === "costes" &&
            (costes.length === 0 ? (
              <div className="rounded-[12px] border-[1.5px] border-dashed border-[#cfcfcf] bg-[#fafafa] p-8 text-center text-[13px] text-carbon/65">
                Todavía no se ha emitido ninguno para esta opp.
              </div>
            ) : (
              <ul className="divide-y divide-[#eee]">
                {costes.map((x) => (
                  <li key={x.id} className="flex flex-wrap gap-x-2 py-2 text-[13px]">
                    <a href={`/referencia/estimacion/informe/${x.id}`} className={ENLACE}>{HORA.format(new Date(x.creado_en))}</a>
                    <span>· {x.datos.obra}</span>
                    {x.datos.precios && <span>· {EUR.format(Math.round(x.datos.precios.hoy))} € con IVA</span>}
                    {x.autor && <span className="text-carbon/65">· {x.autor.nombre}</span>}
                  </li>
                ))}
              </ul>
            ))}

          {vista === "informe" &&
            (referencia ? (
              <iframe src={`/comercial/oportunidades/${id}/anexo#view=FitH`} title="Informe comercial" className="h-[1000px] w-full rounded-[10px] border border-carbon/20 bg-white" />
            ) : (
              sinEdificio
            ))}

          {vista === "fotos" && fotos}
          {vista === "documentos" && cajon}
        </div>
      </div>

      {/* ============================== EL DIARIO ============================== */}
      <aside className="min-w-0 border-t border-[#e6e6e6] px-3 py-4 xl:border-l xl:border-t-0">
        <div className="mb-1.5 px-1 text-[10.5px] font-extrabold uppercase tracking-[0.08em]" style={{ color: AZUL }}>
          Diario
        </div>
        {diario}
      </aside>
    </section>
  );
}
