"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Elegir, type Opcion } from "../../components/Elegir";
import { ESTILOS_COBRO_AJUSTES } from "../estilosCobroAjustes";
import { cuandoPaga } from "../../../lib/condicionesCobroTexto";
import type { Condicion, Emisor, FormaCobro, GuardarCondicion, ReglaPago } from "../../../lib/condicionesCobro";
import { accionGuardarCondicion } from "./acciones";

// CONDICIONES DE COBRO (Monica, 25-oct-2026), la maqueta validada tal cual (docs/figma/condiciones-cobro-y-clientes-
// factusol.html): arriba lo que falta por completar; luego lo de por defecto (comunidad y particular) y las contratas.
// «cambiar» abre el formulario en amarillo, en el sitio.

const FORMA: Record<FormaCobro, [string, string]> = { cargo_cuenta: ["f-cargo", "Cargo en cuenta"], transferencia: ["f-trans", "Transferencia"], confirming: ["f-conf", "Confirming"] };
const EMISORES: Opcion[] = [{ valor: "", texto: "Sin regla (Accesalia por defecto)" }, { valor: "accesalia", texto: "Accesalia" }, { valor: "daniel_autonomo", texto: "Daniel autónomo" }];
const QUIEN: Record<string, string> = { comunidad: "Comunidad", persona: "Particular" };

type Form = {
  id: string | null; titulo: string; general: boolean; contrataId: string;
  forma: FormaCobro | ""; regla: ReglaPago | ""; dias: string; diaCorte: string; diaRemesa: string;
  correo: string; alComercial: boolean; comoSeEnvia: string; notas: string; faltan: boolean; emisor: string; codigos: string;
};

const deCondicion = (c: Condicion): Form => ({
  id: c.id, titulo: c.contrata?.nombre ?? QUIEN[c.pagadorTipo], general: !c.contrata, contrataId: c.contrata?.id ?? "",
  forma: c.forma ?? "", regla: c.regla ?? "", dias: c.dias?.toString() ?? "", diaCorte: c.diaCorte?.toString() ?? "", diaRemesa: c.diaRemesa?.toString() ?? "",
  correo: c.correo, alComercial: c.alComercial, comoSeEnvia: c.comoSeEnvia, notas: c.notas,
  // Si esta pendiente pero ya tiene lo basico, es que faltan otras cosas: se queda marcada.
  faltan: c.pendiente && !!(c.forma && c.regla), emisor: c.contrata?.emisor ?? "", codigos: (c.contrata?.codigos ?? []).join(", "),
});
const nueva = (): Form => ({ id: null, titulo: "Contrata nueva", general: false, contrataId: "", forma: "", regla: "", dias: "", diaCorte: "", diaRemesa: "", correo: "", alComercial: false, comoSeEnvia: "", notas: "", faltan: false, emisor: "", codigos: "" });
const num = (s: string) => (s.trim() === "" ? null : Number(s));

export function CondicionesCobro({ condiciones, contratasSin }: { condiciones: Condicion[]; contratasSin: Opcion[] }) {
  const router = useRouter();
  const [ed, setEd] = useState<Form | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();
  const vivas = condiciones.filter((c) => c.activa);
  const generales = vivas.filter((c) => !c.contrata);
  const contratas = vivas.filter((c) => c.contrata && c.forma);
  const pendientes = vivas.filter((c) => c.contrata && c.pendiente);
  const cambiar = (p: Partial<Form>) => setEd((x) => (x ? { ...x, ...p } : x));

  const guardar = () => {
    if (!ed) return;
    setError(null);
    const g: GuardarCondicion = {
      id: ed.id, contrataId: ed.id ? null : ed.contrataId || null,
      forma: ed.forma || null, regla: ed.regla || null, dias: num(ed.dias), diaCorte: num(ed.diaCorte), diaRemesa: num(ed.diaRemesa),
      correo: ed.correo, alComercial: ed.alComercial, comoSeEnvia: ed.comoSeEnvia, faltanDatos: ed.faltan, notas: ed.notas,
      emisor: ed.general ? undefined : ((ed.emisor || null) as Emisor), codigos: ed.general ? undefined : ed.codigos.split(",").map((x) => x.trim()).filter(Boolean),
    };
    empezar(async () => {
      const r = await accionGuardarCondicion(g);
      if (!r.ok) return setError(r.error);
      setEd(null);
      router.refresh();
    });
  };

  const editor = ed && (
    <div className="editor" role="region" aria-label={`Condiciones de ${ed.titulo}`}>
      <div className="editor-cab"><h3>{ed.titulo}</h3>
        <div className="der">
          <button type="button" className="btn sec" onClick={() => { setEd(null); setError(null); }} disabled={ocupado}>Cancelar</button>
          <button type="button" className="btn" onClick={guardar} disabled={ocupado || (!ed.id && !ed.contrataId)}>{ocupado ? "Guardando…" : "Guardar"}</button>
        </div></div>
      {error && <p className="aviso">{error}</p>}
      <div className="rej">
        {!ed.id && <div className="campo"><span className="et">Contrata</span>
          <Elegir id="cc-contrata" nombre="Contrata" opciones={contratasSin} valor={ed.contrataId} vacio="Buscar la contrata…" alElegir={(v) => cambiar({ contrataId: v })} /></div>}
        <div className="campo"><span className="et">Cómo cobra</span><div className="opciones">
          {(Object.keys(FORMA) as FormaCobro[]).map((v) => (
            <label key={v}><input type="radio" name="cc-forma" checked={ed.forma === v} onChange={() => cambiar({ forma: v })} /> {FORMA[v][1]}</label>))}</div></div>
        <div className="campo ancho2"><span className="et">Cuándo paga</span><div className="opciones">
          <label><input type="radio" name="cc-regla" checked={ed.regla === "al_cargo"} onChange={() => cambiar({ regla: "al_cargo" })} /> Al hacer el cargo</label>
          <label><input type="radio" name="cc-regla" checked={ed.regla === "dias"} onChange={() => cambiar({ regla: "dias", dias: ed.dias || "30" })} /> Días después de la factura</label>
          <label><input type="radio" name="cc-regla" checked={ed.regla === "corte_remesa"} onChange={() => cambiar({ regla: "corte_remesa", diaCorte: ed.diaCorte || "20", diaRemesa: ed.diaRemesa || "6" })} /> Corte y remesa</label></div>
          <div className="regla">
            {ed.regla === "dias" && <><input type="number" id="cc-dias" value={ed.dias} onChange={(e) => cambiar({ dias: e.target.value })} aria-label="Días" /> días después de la fecha de la factura</>}
            {ed.regla === "corte_remesa" && <>Emitida hasta el día <input type="number" id="cc-corte" value={ed.diaCorte} onChange={(e) => cambiar({ diaCorte: e.target.value })} aria-label="Día de corte" />, se paga en la remesa del día <input type="number" id="cc-remesa" value={ed.diaRemesa} onChange={(e) => cambiar({ diaRemesa: e.target.value })} aria-label="Día de la remesa" /> del mes siguiente; después, en la del otro mes.</>}
          </div></div>
        {!ed.general && <div className="campo"><label htmlFor="cc-correo">Facturas a</label>
          <input type="text" id="cc-correo" value={ed.correo} onChange={(e) => cambiar({ correo: e.target.value })} placeholder="El buzón donde recibe las facturas" />
          <label className="check"><input type="checkbox" checked={ed.alComercial} onChange={(e) => cambiar({ alComercial: e.target.checked })} /> y al comercial de la contrata que lleva la obra</label></div>}
        {!ed.general && <div className="campo"><span className="et">Le factura</span>
          <Elegir id="cc-emisor" nombre="Le factura" opciones={EMISORES} valor={ed.emisor} alElegir={(v) => cambiar({ emisor: v })} /></div>}
        {!ed.general && <div className="campo"><label htmlFor="cc-cod">Exige en la factura</label>
          <input type="text" id="cc-cod" value={ed.codigos} onChange={(e) => cambiar({ codigos: e.target.value })} placeholder="Orden de compra, Pedido…" /></div>}
        <div className="campo ancho2"><label htmlFor="cc-envio">Cómo se envía</label>
          <textarea id="cc-envio" value={ed.comoSeEnvia} onChange={(e) => cambiar({ comoSeEnvia: e.target.value })} placeholder="Lo que no cabe arriba: correo postal, portal propio, antes de qué día…" /></div>
        <div className="campo ancho2"><label htmlFor="cc-notas">Notas</label>
          <textarea id="cc-notas" value={ed.notas} onChange={(e) => cambiar({ notas: e.target.value })} placeholder="Para nosotros: de dónde sale, quién lo confirmó…" />
          {!ed.general && <label className="check"><input type="checkbox" checked={ed.faltan} onChange={(e) => cambiar({ faltan: e.target.checked })} /> Aún faltan datos (sigue en «Por completar»)</label>}</div>
      </div>
      {!ed.general && <p className="nota-ed">«Le factura» y «Exige en la factura» son de la contrata: se guardan en su ficha y se ven también allí.</p>}
    </div>
  );

  const abrir = (c: Condicion) => { setError(null); setEd(deCondicion(c)); };

  return (
    <div className="cc">
      <style dangerouslySetInnerHTML={{ __html: ESTILOS_COBRO_AJUSTES }} />
      <main className="mx-auto max-w-[1300px] px-4 pb-16 pt-5 sm:px-6">
        <a className="salida" href="/facturacion/cobrar">← Cobrar</a>
        <div className="cab">
          <div>
            <h1>Condiciones de cobro</h1>
            <p>Cómo nos paga cada uno. Al facturar salen solas, y se pueden cambiar en ese momento.</p>
          </div>
          <div className="der"><button type="button" className="btn" onClick={() => { setError(null); setEd(nueva()); }} disabled={ocupado}>+ Añadir una contrata</button></div>
        </div>
        {ed && !ed.id && editor}

        {pendientes.length > 0 && <>
          <div className="sec-tit">Por completar <span className="n">{pendientes.length} {pendientes.length === 1 ? "contrata" : "contratas"} · faltan datos: los completa facturación</span></div>
          <div className="pendientes">
            <p>Mientras falten, al facturarles hay que elegir a mano cómo cobran.</p>
            <div className="lista-pend">{pendientes.map((c) => (
              <button key={c.id} type="button" onClick={() => abrir(c)}>{c.contrata!.nombre} <small>completar</small></button>))}</div>
          </div>
          {ed && ed.id && pendientes.some((c) => c.id === ed.id) && !contratas.some((c) => c.id === ed.id) && editor}
        </>}

        <div className="sec-tit">Por defecto</div>
        <div className="caja"><table>
          <thead><tr><th>Quién paga</th><th>Cómo cobra</th><th>Cuándo paga</th><th>Cómo se le envía</th><th /></tr></thead>
          <tbody>{generales.map((c) => (
            <tr key={c.id}>
              <td className="nom">{QUIEN[c.pagadorTipo]}</td>
              <td>{c.forma && <span className={`forma ${FORMA[c.forma][0]}`}>{FORMA[c.forma][1]}</span>}</td>
              <td className="corto">{cuandoPaga(c)}</td>
              <td className="largo">{c.comoSeEnvia}</td>
              <td><button type="button" className="enlace" onClick={() => abrir(c)}>cambiar</button></td>
            </tr>))}</tbody>
        </table></div>
        {ed && ed.general && editor}

        <div className="sec-tit">Contratas</div>
        <div className="caja"><table>
          <thead><tr><th>Contrata</th><th>Cómo cobra</th><th>Cuándo paga</th><th>Facturas a · cómo se envía</th><th>Le factura</th><th>Exige en la factura</th><th /></tr></thead>
          <tbody>{contratas.map((c) => {
            const k = c.contrata!;
            return (
              <tr key={c.id} className={c.pendiente ? "pend" : ""}>
                <td className="nom">{k.nombre}</td>
                <td>{c.forma && <span className={`forma ${FORMA[c.forma][0]}`}>{FORMA[c.forma][1]}</span>}</td>
                <td className="cuando">{cuandoPaga(c)}</td>
                <td className="correo">
                  {c.correo || (!c.comoSeEnvia && <span className="falta">{c.pendiente ? "por completar" : "—"}</span>)}
                  {c.alComercial && <small>y al comercial de la contrata que lleva la obra</small>}
                  {c.comoSeEnvia && <span className="envio">{c.comoSeEnvia}</span>}
                  {c.pendiente && <span className="falta envio">faltan datos</span>}
                </td>
                <td className="corto">{k.emisor === "daniel_autonomo" ? <b>Daniel autónomo</b> : "Accesalia"}</td>
                <td>{k.codigos.length ? <div className="codigos">{k.codigos.map((x) => <span key={x} className="cod">{x}</span>)}</div> : <span className="falta">nada</span>}</td>
                <td><button type="button" className="enlace" onClick={() => abrir(c)}>cambiar</button></td>
              </tr>
            );
          })}</tbody>
        </table></div>
        {ed && ed.id && !ed.general && contratas.some((c) => c.id === ed.id) && editor}
      </main>
    </div>
  );
}
