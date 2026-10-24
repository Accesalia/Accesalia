"use client";

// FORMAS DE PAGO, la pantalla (Monica, 24-oct-2026), igual que la maqueta validada (docs/figma/formas-de-pago.html):
// vigentes arriba (editar · desactivar), el formulario como una conversacion, desactivadas abajo con su rastro.

import { useState, useTransition } from "react";
import { Elegir } from "../../components/Elegir";
import { ESTILOS } from "./estilosFormas";
import { accionCambiarActiva, accionGuardarForma } from "./acciones";

type HitoForma = { momento: string; tipo: "fijo" | "exito"; porcentaje: number | null; frase: string };
type Caso = { bloqueId: string; pagador: string };
type Forma = { id: string; nombre: string; notas: string; activa: boolean; orden: number; hitos: HitoForma[]; casos: Caso[]; lineas: number };
type Opcion = { valor: string; texto: string };

const MOMENTOS: Record<string, [string, string]> = {
  encargo: ["encargo", "a la contratación"],
  entrega: ["entrega", "a la entrega del proyecto"],
  licencia: ["licencia", "a la concesión de la licencia"],
  pss: ["PSS", "a la firma del Plan de Seguridad y Salud"],
  inicio_obra: ["inicio de obra", "al inicio de obra"],
  cfo: ["CFO", "al certificado de fin de obra"],
  presentacion: ["presentación", "a la presentación de la subvención"],
  concesion: ["concesión", "a la concesión de la subvención"],
};
const ORDINAL = ["Primer", "Segundo", "Tercer", "Cuarto"];
const pct = (n: number | string) => String(n).replace(".", ",") + " %";
const vacio = (p: unknown) => p === "" || p == null;
const nombreDeMomento = (m: string) => MOMENTOS[m]?.[0] ?? m;

// Lo que se esta escribiendo en el formulario
type HitoEdit = { momento: string; exito: boolean; p: string; frase: string; fraseAMano: boolean };
type Edicion = { id: string | null; original: Forma | null; hitos: HitoEdit[]; nombre: string; nombreAMano: boolean; porDefecto: boolean | null; casos: Caso[]; notas: string };
const fraseDe = (h: HitoEdit) => (h.exito ? `el % a éxito, ${MOMENTOS[h.momento][1]}` : `${vacio(h.p) ? "…" : pct(h.p)} ${MOMENTOS[h.momento][1]}`);
const nombreDe = (hs: HitoEdit[]) => hs.map((h) => (h.exito ? `${nombreDeMomento(h.momento)} a éxito` : `${vacio(h.p) ? "…" : pct(h.p)} ${nombreDeMomento(h.momento)}`)).join(" · ");
const hitoNuevo = (momento: string, p: string): HitoEdit => ({ momento, exito: false, p, frase: "", fraseAMano: false });

function comprobar(e: Edicion): { ok: boolean; bien: boolean; txt: string } {
  const fijos = e.hitos.filter((h) => !h.exito);
  const suma = Math.round(fijos.reduce((s, h) => s + (Number(h.p.replace(",", ".")) || 0), 0) * 100) / 100;
  if (e.hitos.filter((h) => h.exito).length > 1) return { ok: false, bien: false, txt: "Solo un hito puede ser a éxito." };
  if (fijos.some((h) => !(Number(h.p.replace(",", ".")) > 0))) return { ok: false, bien: false, txt: "Falta el porcentaje de algún hito." };
  if (fijos.length && suma !== 100)
    return { ok: false, bien: false, txt: suma < 100 ? `Entre todos suman ${pct(suma)}: faltan ${pct(Math.round((100 - suma) * 100) / 100)} para llegar al 100 %.` : `Entre todos suman ${pct(suma)}: sobran ${pct(Math.round((suma - 100) * 100) / 100)}.` };
  const txt = fijos.length ? "Entre todos suman el 100 %." : "Es solo a éxito: el % lo pone cada línea.";
  return { ok: e.porDefecto != null && !!e.nombre.trim(), bien: true, txt };
}

export function FormasDePago({ formas, bloques, pagadores }: { formas: Forma[]; bloques: Opcion[]; pagadores: Opcion[] }) {
  const [ed, setEd] = useState<Edicion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();
  const textoDe = (lista: Opcion[], v: string) => lista.find((o) => o.valor === v)?.texto ?? "—";
  const vigentes = formas.filter((f) => f.activa), desactivadas = formas.filter((f) => !f.activa);

  // La forma que ya sale en ese caso (para avisar de que esta la sustituira)
  const choqueDe = (c: Caso) => formas.find((f) => f.activa && f.id !== ed?.id && f.casos.some((x) => x.bloqueId === c.bloqueId && x.pagador === c.pagador));

  const cambiar = (f: (e: Edicion) => Edicion) => setEd((e) => (e ? recalcular(f(e)) : e));
  const recalcular = (e: Edicion): Edicion => {
    const hitos = e.hitos.map((h) => (h.fraseAMano ? h : { ...h, frase: fraseDe(h) }));
    return { ...e, hitos, nombre: e.nombreAMano ? e.nombre : nombreDe(hitos) };
  };
  const abrirNueva = () => { setError(null); setEd(recalcular({ id: null, original: null, hitos: [hitoNuevo("encargo", "50"), hitoNuevo("entrega", "50")], nombre: "", nombreAMano: false, porDefecto: null, casos: [], notas: "" })); };
  const abrirEditar = (f: Forma) => {
    setError(null);
    setEd({ id: f.id, original: f, nombre: f.nombre, nombreAMano: true, porDefecto: f.casos.length > 0, casos: f.casos.map((c) => ({ ...c })), notas: f.notas,
      hitos: f.hitos.map((h) => ({ momento: h.momento, exito: h.tipo === "exito", p: h.porcentaje == null ? "" : String(h.porcentaje).replace(".", ","), frase: h.frase, fraseAMano: true })) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const guardar = () => {
    if (!ed) return;
    const g = {
      id: ed.id, nombre: ed.nombre, notas: ed.notas,
      hitos: ed.hitos.map((h) => ({ momento: h.momento, tipo: (h.exito ? "exito" : "fijo") as "fijo" | "exito", porcentaje: h.exito ? null : Number(h.p.replace(",", ".")), frase: h.frase })),
      casos: ed.porDefecto ? ed.casos.filter((c) => c.bloqueId && c.pagador) : [],
    };
    empezar(async () => {
      const r = await accionGuardarForma(g);
      if (r.ok) setEd(null); else setError(r.error);
    });
  };
  const activar = (f: Forma, activa: boolean) => empezar(async () => { const r = await accionCambiarActiva(f.id, activa); if (!r.ok) setError(r.error); });

  const listaHitos = (hs: HitoForma[]) => (
    <div className="hitos">{hs.map((h, i) => (
      <span key={i} className={`hito${h.tipo === "exito" ? " exito" : ""}`}><span className="n">{i + 1}.</span>{nombreDeMomento(h.momento)} · <b>{h.tipo === "exito" ? "a éxito" : pct(h.porcentaje ?? "")}</b></span>
    ))}</div>
  );
  const listaFrases = (hs: HitoForma[]) => <div className="hitos">{hs.map((h, i) => <span key={i} className="hito">{h.frase}</span>)}</div>;
  const listaCasos = (cs: Caso[]) => cs.length ? (
    <div className="reglas">{cs.map((c, i) => (
      <span key={i} className="regla"><b>{textoDe(bloques, c.bloqueId)}</b> · {c.pagador === "cualquiera" ? "pague quien pague" : <>si paga <b>{textoDe(pagadores, c.pagador)}</b></>}</span>
    ))}</div>
  ) : <span className="vacio">solo a mano</span>;

  const ok = ed ? comprobar(ed) : null;

  return (
    <div className="fp">
      <style dangerouslySetInnerHTML={{ __html: ESTILOS }} />
      <div className="cab-pag">
        <h1>Formas de pago</h1>
        <p>Las que se eligen en cada línea de la hoja de encargo. De cada una salen solos sus hitos de cobro.</p>
        <button type="button" className="boton" onClick={abrirNueva} disabled={pendiente}>+ Añadir forma de pago</button>
      </div>
      {error && !ed && <p className="aviso" style={{ marginBottom: 8 }}>{error}</p>}

      {ed && ok && (
        <section className="nueva" aria-label="Forma de pago">
          <div className="nueva-cab">
            <div>
              {ed.original ? (
                <><h3>Estás modificando «{ed.original.nombre}»</h3>
                  <p className="aviso">{ed.original.lineas
                    ? `Ya está en ${ed.original.lineas.toLocaleString("es-ES")} líneas firmadas. Puedes cambiar el nombre, las notas y cuándo sale por defecto sin más. Si cambias los hitos o sus frases, al guardar la actual pasará a desactivadas con su historial y se creará esta como nueva: lo firmado no cambia.`
                    : "Todavía no la lleva ninguna línea: se cambia tal cual."}</p></>
              ) : (
                <><h3>Estás creando una forma de pago nueva</h3>
                  <p className="aviso">Si haces esto es porque es habitual. No añadas todas: si no, la lista que elige el comercial será excesivamente larga.</p></>
              )}
              {error && <p className="aviso" style={{ fontWeight: 700 }}>{error}</p>}
            </div>
            <button type="button" className="boton sec" onClick={() => setEd(null)} disabled={pendiente}>Cancelar</button>
            <button type="button" className="boton" onClick={guardar} disabled={!ok.ok || pendiente}>{pendiente ? "Guardando…" : "Guardar"}</button>
          </div>
          <p className="intro">{ed.original ? "Esta es la forma de pago tal como está; cambia lo que necesites:" : "Vamos a describir la nueva forma de pago:"}</p>

          <div className="pregunta"><span className="q"><span className="num">1</span>¿Cómo debe aparecerle al comercial en pantalla?<span className="pista">Te propongo este nombre; puedes cambiarlo.</span></span>
            <input type="text" className="ancho" id="fp-nombre" value={ed.nombre} onChange={(e) => cambiar((x) => ({ ...x, nombre: e.target.value, nombreAMano: true }))} /></div>

          <div className="pregunta"><span className="q"><span className="num">2</span>Así saldrá en la hoja de encargo, para la comunidad o la contrata:<span className="pista">Se forma con la frase de cada hito; se cambia en el punto 3.</span></span>
            <div style={{ fontWeight: 600 }}>{ed.hitos.map((h) => h.frase).join(" · ")}</div></div>

          <div className="pregunta"><span className="q"><span className="num">3</span>Vamos a definir qué hitos tiene.</span>
            <div className="sub"><span>¿Cuántos hitos son?</span>
              <select id="fp-cuantos" value={ed.hitos.length} onChange={(e) => cambiar((x) => {
                const k = Number(e.target.value); const hs = [...x.hitos];
                while (hs.length < k) hs.push(hitoNuevo("cfo", "")); hs.length = k; return { ...x, hitos: hs };
              })}>{[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select></div>
            {ed.hitos.map((h, i) => {
              const poner = (cambio: Partial<HitoEdit>) => cambiar((x) => ({ ...x, hitos: x.hitos.map((y, j) => (j === i ? { ...y, ...cambio } : y)) }));
              return (
                <div key={i} className="hito-form"><h4>{ORDINAL[i]} hito</h4>
                  <div className="sub"><span>¿En qué momento lo vamos a cobrar?</span>
                    <select id={`fp-m${i}`} value={h.momento} onChange={(e) => poner({ momento: e.target.value })}>{Object.entries(MOMENTOS).map(([k, [n]]) => <option key={k} value={k}>{n}</option>)}</select></div>
                  <div className="sub"><span>¿Qué porcentaje del importe de la línea vamos a cobrar aquí?</span>
                    <span><input type="text" className="pct" id={`fp-p${i}`} inputMode="decimal" value={h.exito ? "" : h.p} disabled={h.exito} onChange={(e) => poner({ p: e.target.value })} aria-label="Porcentaje" /> %
                      <label className="check"><input type="checkbox" id={`fp-e${i}`} checked={h.exito} onChange={(e) => poner(e.target.checked ? { exito: true, p: "", momento: h.momento === "encargo" ? "concesion" : h.momento } : { exito: false })} /> es a éxito (el % lo pone cada línea)</label></span></div>
                  <div className="sub"><span>¿Cómo quieres que aparezca en la hoja de encargo?<span className="pista">Mi propuesta es esta:</span></span>
                    <input type="text" id={`fp-f${i}`} value={h.frase} onChange={(e) => poner({ frase: e.target.value, fraseAMano: true })} aria-label="Cómo aparece en la hoja" /></div>
                </div>
              );
            })}
            <div className={`suma ${ok.bien ? "bien" : "mal"}`}>{ok.txt}</div>
          </div>

          <div className="pregunta"><span className="q"><span className="num">4</span>¿Quieres que salga por defecto en algún caso?</span>
            <span className="sino" role="group">
              <button type="button" aria-pressed={ed.porDefecto === true} onClick={() => cambiar((x) => ({ ...x, porDefecto: true, casos: x.casos.length ? x.casos : [{ bloqueId: "", pagador: "cualquiera" }] }))}>Sí</button>
              <button type="button" aria-pressed={ed.porDefecto === false} onClick={() => cambiar((x) => ({ ...x, porDefecto: false }))}>No</button>
            </span>
            {ed.porDefecto && (
              <><p style={{ margin: "8px 0 0" }}>Vamos a definir cuándo y con quién la pondremos por defecto:</p>
                <div className="casos">
                  {ed.casos.map((c, i) => {
                    const ch = c.bloqueId ? choqueDe(c) : undefined;
                    const poner = (cambio: Partial<Caso>) => cambiar((x) => ({ ...x, casos: x.casos.map((y, j) => (j === i ? { ...y, ...cambio } : y)) }));
                    return (
                      <div key={i} className="caso">
                        <div style={{ display: "grid", gap: 2, fontWeight: 600, minWidth: 240 }}>¿A qué proyecto o servicio?
                          <Elegir id={`fp-b${i}`} nombre="Proyecto o servicio" opciones={bloques} valor={c.bloqueId} vacio="elegir" alElegir={(v) => poner({ bloqueId: v })} /></div>
                        <div style={{ display: "grid", gap: 2, fontWeight: 600, minWidth: 260 }}>¿Cuando el que paga es…?
                          <Elegir id={`fp-q${i}`} nombre="Quién paga" opciones={pagadores} valor={c.pagador} alElegir={(v) => poner({ pagador: v })} /></div>
                        {ed.casos.length > 1 && <button type="button" className="enlace" onClick={() => cambiar((x) => ({ ...x, casos: x.casos.filter((_, j) => j !== i) }))}>quitar este caso</button>}
                        {ch && <span className="choque">Ahora, en este caso sale «{ch.nombre}». Si guardas, saldrá esta en su lugar.</span>}
                      </div>
                    );
                  })}
                  <button type="button" className="enlace" style={{ marginTop: 6 }} onClick={() => cambiar((x) => ({ ...x, casos: [...x.casos, { bloqueId: "", pagador: "cualquiera" }] }))}>+ añadir otro caso</button>
                </div></>
            )}
          </div>

          <div className="pregunta"><span className="q">Notas<span className="pista">Opcional: para qué es o quién la usa.</span></span>
            <input type="text" className="ancho" id="fp-notas" value={ed.notas} onChange={(e) => cambiar((x) => ({ ...x, notas: e.target.value }))} /></div>
        </section>
      )}

      <h2>Vigentes</h2>
      <div className="marco"><table>
        <thead>
          <tr className="grupo-cab"><th className="sin" /><th colSpan={2} className="gr">Lo que se ve en la hoja y lo que se cobra</th><th className="sin" colSpan={3} /></tr>
          <tr><th>Cómo le sale al comercial</th><th className="g1">Cómo sale en la hoja</th><th className="g2">Hitos</th><th>Sale por defecto cuando</th><th>Notas</th><th /></tr>
        </thead>
        <tbody>
          {vigentes.length ? vigentes.map((f) => (
            <tr key={f.id}>
              <td className="nombre">{f.nombre}</td><td className="papel g1">{listaFrases(f.hitos)}</td><td className="g2">{listaHitos(f.hitos)}</td>
              <td>{listaCasos(f.casos)}</td><td className="notas">{f.notas}</td>
              <td className="acc"><button type="button" className="enlace" onClick={() => abrirEditar(f)} disabled={pendiente}>editar</button> · <button type="button" className="enlace" onClick={() => activar(f, false)} disabled={pendiente}>desactivar</button></td>
            </tr>
          )) : <tr><td colSpan={6} className="vacio">Ninguna.</td></tr>}
        </tbody>
      </table></div>

      <h2>Desactivadas</h2>
      <div className="marco"><table>
        <thead>
          <tr className="grupo-cab"><th className="sin" /><th colSpan={2} className="gr">Lo que se veía en la hoja y lo que se cobraba</th><th className="sin" colSpan={3} /></tr>
          <tr><th>Cómo le salía al comercial</th><th className="g1">Cómo salía en la hoja</th><th className="g2">Hitos</th><th>Notas</th><th>Salió en</th><th /></tr>
        </thead>
        <tbody>
          {desactivadas.length ? desactivadas.map((f) => (
            <tr key={f.id} className="apagada">
              <td className="nombre">{f.nombre}</td><td className="papel g1">{listaFrases(f.hitos)}</td><td className="g2">{listaHitos(f.hitos)}</td>
              <td className="notas">{f.notas}</td><td className="num">{f.lineas ? `${f.lineas.toLocaleString("es-ES")} líneas antes de desactivarla` : "ninguna línea"}</td>
              <td className="acc"><button type="button" className="enlace" onClick={() => activar(f, true)} disabled={pendiente}>reactivar</button></td>
            </tr>
          )) : <tr><td colSpan={6} className="vacio">Ninguna.</td></tr>}
        </tbody>
      </table></div>
    </div>
  );
}
