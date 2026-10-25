// @ts-nocheck
// EL MOTOR DE LA HOJA EN ARBOL, para la pantalla de prueba (Monica, 22-oct-2026: «en un apartado solo para mi,
// para probarlo con la base»). Es la logica de la maqueta validada (docs/figma/hoja-encargo-arbol.html y su .md),
// tal cual, con los importes del CATALOGO DE BLOQUES y las formas de pago de he_formas_pago (con su caso por defecto).
// GUARDA EN BORRADOR (24-oct): cada fila lleva su bloque (y su tipo si lo pide) y recoger() la pasa a las tablas nuevas.
// Y ademas (Monica, 24-oct): debajo del boton, POR QUE aun no deja guardar; con varios portales, confirmarlos antes de
// guardar; PREVISUALIZAR el papel antes de guardar; y SEGUIR EDITANDO un borrador guardado (cargar() lo rehace).
// Las reglas (que pregunta cada paquete) estan aqui de momento; al implementarlo de verdad pasan al catalogo.
// Generado desde la maqueta: lo de debajo de «const hoja» es su codigo, cambiando document por la raiz.
// A QUIEN VA Y TARIFAS (Monica, 25-oct-2026): quien paga elige la tarifa (su convenio o la general) y la forma de pago por
// defecto; cada linea propone el precio de la tarifa con el calculo del generador viejo (fijo, tramo de viviendas de SUS
// portales, % del PEM o % a exito) y sale «incluido» lo que el precio de otra ya incluye. Lo escrito a mano manda.
export function montarArbol(root, datos) {
  const ac = new AbortController();
  const document_ = {
    getElementById: (id) => root.querySelector("#" + id),
    addEventListener: (tipo, fn, captura) => root.addEventListener(tipo, fn, { capture: !!captura, signal: ac.signal }),
  };
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const D = datos.defectos || {};
  const ACCESOS = datos.accesos || [];
  const FORMAS = datos.formas || [];
  const INT = new Set(datos.interesa || []);
  const def = (codigo) => D[codigo] || {};
  const PRECIOS = datos.tarifas || [];
  const CASOS = datos.casos || [];
  let PAG = datos.pagador || { tipo: "comunidad", contrataId: null, tarifaId: null, razon: "", cif: "" };
  // LA FORMA DE PAGO POR DEFECTO de un bloque segun quien paga: la de esa contrata, si no la de su tipo, si no «pague quien pague».
  const formaDefecto = (codigo) => {
    const de = CASOS.filter((c) => c.bloque === codigo);
    return (de.find((c) => c.pagador === "contrata" && PAG.tipo === "contrata" && c.contrataId === PAG.contrataId)
      ?? de.find((c) => c.pagador === PAG.tipo && !c.contrataId) ?? de.find((c) => c.pagador === "cualquiera"))?.forma ?? "";
  };

  let uid = 0;
  // cobraBase / importeBase: lo que trae del catalogo, por si la tarifa no dice nada.
  const ln = (nombre, bloque, o = {}) => { const r = { id: ++uid, t: "linea", nombre, bloque, cobra: false, importe: null, pct: null, forma: "", formaPropia: "", papel: true, quitada: false, ...o }; r.cobraBase = r.cobra; r.importeBase = r.importe; return r; };
  // Cada cabecera es la fila de su bloque (la DF, la CSS, el proyecto con su tipo…), colgando sus lineas.
  const cab = (nombre, bloque, hijos, o = {}) => ({ id: ++uid, t: "cab", nombre, bloque, hijos, quitada: false, forma: "", formaPropia: "", ...o });
  const preg = (texto, opciones, o = {}) => ({ id: ++uid, t: "preg", texto, opciones, resp: null, creado: [], ...o });
  const opc = (nombre, crea) => ({ id: ++uid, t: "opc", nombre, crea, creado: [] });
  // Una linea de un bloque del catalogo: si se cobra y su importe y su forma de pago por defecto salen de alli.
  const linea = (nombre, codigo, extra = {}) => { const d = def(codigo); return ln(nombre, codigo, { cobra: !!d.cobra, importe: d.importe ?? null, forma: d.forma ?? "", ...extra }); };

  const dfBloque = () => cab("Dirección facultativa", "DF", [
    ln("Inicio de obra", "INICIO DE OBRA", { papel: false }),
    linea("Dirección facultativa (visitas de obra)", "DF"),
    ln("Certificado de fin de obra (CFO)", "CERTIFICADO FIN DE OBRA"),
  ]);
  const css = () => linea("CSS", "CSS");
  const caes = () => linea("Gestión de CAES", "GESTION DE CAES");
  const fin = () => linea("Solicitud de financiación", "SOLICITUD DE FINANCIACION");
  const pregCaes = () => preg("¿Gestionamos los CAES?", [{ txt: "Sí", crea: () => [cab("CAES", "GESTION DE CAES", [caes()])] }, { txt: "No" }], { caes: true });
  // A la comunidad, los 3 presupuestos no se le cobran (lo de Ecobalance va aparte y no se ve).
  const tres = () => linea("Solicitud y análisis de 3 presupuestos", "TRAMITACION 3 PRESUPUESTOS", { papel: false, cobra: false });
  const restoProyecto = (efi) => [
    ln("Toma de datos y modelado 3D", "TOMA DE DATOS Y MODELADO 3D"), ln("Visado colegial", "VISADO", { papel: false }), ln("Tramitación de licencias", "TRAMITACION LICENCIAS"),
    preg("¿Lleva dirección facultativa?", [{ txt: "Sí", crea: () => [dfBloque()] }, { txt: "No" }]),
    preg("¿Pedimos los 3 presupuestos?", [{ txt: "Sí", crea: () => [cab("3 presupuestos", "TRAMITACION 3 PRESUPUESTOS", [tres()])] }, { txt: "No" }]),
    preg("¿Gestionamos la financiación?", [{ txt: "Sí", crea: () => [cab("Financiación", "SOLICITUD DE FINANCIACION", [fin()])] }, { txt: "No" }]),
    ...(efi ? [pregCaes()] : []),
    preg("¿Llevamos la CSS?", [{ txt: "Sí", crea: () => [cab("CSS", "CSS", [css()])] }, { txt: "No" }]),
  ];
  // Lo que se elige en pantalla -> su nombre en tipos_proyecto (los demas se llaman igual).
  const TIPO = { "SATE completo": "SATE envolvente completa", "Plataforma elevadora": "Plataforma" };
  const redaccion = () => linea("Redacción del proyecto básico y de ejecución", "REDACCION PROYECTO");
  const proyecto = {
    asc: () => cab("Proyecto de ascensor", "REDACCION PROYECTO", [redaccion(), ...restoProyecto(false)], { desglose: "Ascensor" }),
    acc: () => cab("Proyecto de accesibilidad", "REDACCION PROYECTO", [preg("¿Qué obra de accesibilidad?", ["Rampa", "Plataforma elevadora", "Cota cero", "Cambio de puertas", "Cambio de cabina", "Añadir parada", "Sustitución de ascensor"].map((x) => ({ txt: x, nombre: "Proyecto de " + x.toLowerCase(), desglose: TIPO[x] ?? x }))), redaccion(), ...restoProyecto(false)]),
    efi: () => { const c = cab("Proyecto de SATE completo", "REDACCION PROYECTO", [preg("Tipo de SATE", ["SATE completo", "SATE fachada", "SATE cubierta"].map((x) => ({ txt: x, nombre: "Proyecto de " + x, desglose: TIPO[x] ?? x }))), redaccion(), ...restoProyecto(true)], { desglose: TIPO["SATE completo"] }); c.hijos[0].resp = "SATE completo"; return c; },
    con: () => {
      const q = preg("¿Qué obras van juntas?", ["Ascensor", "SATE completo", "SATE fachada", "SATE cubierta", "Rampa", "Plataforma elevadora", "Cota cero", "Cambio de puertas", "Añadir parada", "Aerotermia", "Fotovoltaica"].map((x) => ({ txt: x })), { multi: true, marcadas: [] });
        // Cada proyecto del conjunto es su propia linea, con su precio; el conjunto es la cabecera (su total = la suma)
      // y decide si el papel desglosa los precios o solo da el total.
      const resto = restoProyecto(true);
      const c = cab("Proyecto conjunto", "PROYECTO CONJUNTO", [q, ...resto], { conjunto: true, desglosar: true });
      q.alHecho = () => { c.hijos = [q, ...q.marcadas.map((o) => ({ ...redaccion(), nombre: "Proyecto de " + (o.startsWith("SATE") ? o : o.toLowerCase()), desglose: TIPO[o] ?? o, conPortales: true })), ...resto]; if (!c.forma) c.forma = c.hijos.find((h) => h.conPortales)?.forma ?? ""; };
      todos(c.hijos).filter((x) => x.caes).forEach((x) => (x.cond = () => (q.resp ?? "").includes("SATE")));
      return c;
    },
  };
  const subvencion = () => {
    const q = preg("¿De qué es?", [{ txt: "Accesibilidad", nombre: "Subvención de accesibilidad", desglose: "Accesibilidad" }, { txt: "Eficiencia energética", nombre: "Subvención de eficiencia energética", desglose: "Eficiencia energética" }]);
    const caesQ = pregCaes(); caesQ.cond = () => q.resp === "Eficiencia energética";
    const pct = def("TRAMITACION SUBVENCIONES").pct;
    return cab("Subvención", "TRAMITACION SUBVENCIONES", [
      q,
      ln("Tramitación de la subvención", "TRAMITACION SUBVENCIONES", { cobra: true, pct: pct != null ? `${String(pct).replace(".", ",")} % de lo concedido` : "a éxito", pctNum: pct ?? null, forma: def("TRAMITACION SUBVENCIONES").forma ?? "" }),
      cab("Documentación técnica", "DOCUMENTACION TECNICA SUBVENCIONES", [ln("IEE", "IEE"), ln("Libro del edificio", "LEE"), ln("Certificado de eficiencia energética", "CEE")], { precio: linea("Documentación técnica", "DOCUMENTACION TECNICA SUBVENCIONES") }),
      caesQ,
    ]);
  };
  const suelto = (n, codigo, extra = []) => () => cab(n, codigo, [linea(n, codigo, { cobra: true }), ...extra.map((f) => f())]);
  // OTRO (Monica, 24-oct): «Nada encaja, lo pongo a mano». Los mismos datos que los demas (que es, si sale, si se cobra,
  // cuanto y como), sin nada por defecto: el nombre lo escribe el comercial y va a he_lineas_compromisos.texto.
  const otro = () => cab("Otro", "OTRO", [], { aMano: true, texto: "", precio: ln("Otro", "OTRO", { cobra: true, importe: null, forma: "" }) });
  const lleva = [() => ln("Toma de datos y modelado 3D", "TOMA DE DATOS Y MODELADO 3D"), () => ln("Visado colegial", "VISADO", { papel: false }), () => ln("Tramitación de licencias", "TRAMITACION LICENCIAS")];

  const CATALOGO = [
    ["Proyectos", "proyecto", [["Proyecto · ascensor", proyecto.asc, INT.has("asc")], ["Proyecto · accesibilidad", proyecto.acc, INT.has("acc")], ["Proyecto · eficiencia energética", proyecto.efi, INT.has("efi")], ["Proyecto conjunto", proyecto.con]]],
    ["Documentos técnicos", "doc", [["Memoria técnica", suelto("Memoria técnica", "MEMORIA TECNICA"), INT.has("mem")], ["Informe técnico", suelto("Informe técnico", "INFORME TECNICO"), INT.has("inf")], ["Informe pericial", suelto("Informe pericial", "INFORME PERICIAL"), INT.has("per")],
      ["Consulta urbanística", suelto("Consulta urbanística", "CONSULTA URBANISTICA", lleva), INT.has("cons")],
      ["Mediciones y ciego", suelto("Mediciones y ciego", "MEDICIONES Y CIEGO")], ["Modificación de proyecto", suelto("Modificación de proyecto", "MODIFICACION DE PROYECTO")]]],
    ["Servicios", "servicio", [["Subvención", subvencion, INT.has("subv")], ["IEE", suelto("IEE", "IEE"), INT.has("iee")], ["CSS", () => cab("CSS", "CSS", [css()]), INT.has("css")],
      ["Dirección facultativa", dfBloque, INT.has("df")], ["3 presupuestos", () => cab("3 presupuestos", "TRAMITACION 3 PRESUPUESTOS", [tres()]), INT.has("tres")], ["Financiación", () => cab("Financiación", "SOLICITUD DE FINANCIACION", [fin()]), INT.has("fin")], ["CAES", () => cab("CAES", "GESTION DE CAES", [caes()]), INT.has("caes")]]],
    ["Otro", "otro", [["Nada encaja, lo pongo a mano", otro]]],
  ];
  const hoja = [];
  let filtro = "";
  
  // --- recorrer
  const hijosDe = (n) => (n.t === "cab" ? n.hijos : n.t === "preg" || n.t === "opc" ? n.creado : []);
  const todos = (ns = hoja) => ns.flatMap((n) => [n, ...(n.precio ? [n.precio] : []), ...todos(hijosDe(n))]);
  const buscar = (id) => todos().find((n) => n.id === Number(id));
  const padreDe = (id, ns = hoja, p = null) => { for (const n of ns) { if (n.id === Number(id)) return p; const r = padreDe(id, hijosDe(n), n); if (r !== undefined) return r; } return undefined; };
  function subtotal(n) {
    if (n.quitada) return 0;
    if (n.t === "linea") return n.cobra && !n.pct ? n.importe || 0 : 0;
    // solo lo que ya esta en la hoja: en una cabecera, hasta la primera pregunta sin contestar
    let t = n.precio ? subtotal(n.precio) : 0;
    for (const h of hijosDe(n)) { if (h.t === "preg" && h.resp == null && visible(h) && esDeObra(h)) break; t += subtotal(h); }
    return t;
  }
  const mil = (x) => Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const eur = (x) => mil(x) + " €";
  
  // --- pintar
  function rama() { return ""; }
  const esDeObra = (h) => h.multi || h.opciones.some((o) => o.nombre); // la que dice qué es: va primero, sola
  const visible = (h) => !(h.cond && !h.cond()) && !(h.caes && h !== caesQueSePregunta());
  // PORTALES: con un solo acceso no se ve nada; con varios, «portales: todos ▾» en cada cabecera de arriba y en cada
  // proyecto de un conjunto. Lo de dentro los hereda. Por defecto, todos.
  function selPortales(n) {
    if (ACCESOS.length < 2) return "";
    const sel = n.portales;
    const txt = !sel ? "todos" : ACCESOS.filter((a) => sel.includes(a.id)).map((a) => a.texto).join(", ");
    const lista = ACCESOS.map((a) => `<label><input type="checkbox" data-portal="${n.id}:${a.id}"${!sel || sel.includes(a.id) ? " checked" : ""}> ${esc(a.texto)}</label>`).join("");
    return ` <details class="multi portales" data-pid="${n.id}"${n.abiertoP ? " open" : ""}><summary>portales: ${esc(txt)}</summary><div class="pop">${lista}</div></details>`;
  }
  function porPasos(ns, nivel, q) {
    let h = "";
    for (const x of ns) { h += fila(x, nivel, q); if (x.t === "preg" && x.resp == null && visible(x) && esDeObra(x)) break; }
    return h;
  }
  let pendientes = [];
  function filas(ns, nivel, quitadoArriba) {
    return ns.map((n) => fila(n, nivel, quitadoArriba)).join("");
  }
  function fila(n, nivel, quitadoArriba) {
    const q = quitadoArriba || n.quitada;
    const accion = quitadoArriba ? "" : `<button type="button" class="accion" data-quitar="${n.id}">${n.quitada ? "poner" : "quitar"}</button>`;
    if (n.t === "cab") {
      const st = subtotal(n);
      let pr = n.precio && !q ? celdasPrecio(n.precio, false) : null;
      // Conjunto con «solo el total»: en el papel solo sale el total, asi que la forma de pago va aqui, en el conjunto.
      if (n.conjunto && n.desglosar === false && !q)
        pr = { papel: "sale", cobra: "sí", imp: `<b>${eur(st)}</b>`, forma: selForma(n) };
      const etq = { proyecto: "PROYECTO", doc: "DOC. TÉCNICO", servicio: "SERVICIO", otro: "OTRO" }[n.clase];
      return `<tr data-d="${nivel}" class="cabecera n${Math.min(nivel, 1)}${nivel === 0 && n.clase ? " top " + n.clase : ""}${q ? " quitada" : ""}"><td class="que">${rama(nivel)}${nivel === 0 && etq ? `<span class="clase ${n.clase}">${etq}</span>` : ""}${n.aMano && !q ? `<input type="text" class="amano" data-texto="${n.id}" value="${esc(n.texto)}" placeholder="¿Qué es? Escríbelo como saldrá en la hoja" aria-label="Qué es">` : `<span class="txt">${n.nombre}</span>`}${(() => { const e = n.hijos.find((h) => h.t === "preg" && h.resp != null && (h.multi || h.opciones.some((o) => o.nombre))); return e && !q ? ` <button type="button" class="accion" data-cambiar="${e.id}" style="text-transform:none;font-weight:400">cambiar</button>` : ""; })()}${n.dePreg && !q ? ` <button type="button" class="accion" data-quitar="${n.id}" style="text-transform:none;font-weight:400">Eliminar</button>` : ""}${n.conjunto && !q ? ` <select class="desglosa" data-desglosa="${n.id}" aria-label="Precios en el papel"><option value="si"${n.desglosar ? " selected" : ""}>desglosar precios</option><option value="no"${n.desglosar ? "" : " selected"}>solo el total</option></select>` : ""}${nivel === 0 && !q ? selPortales(n) : ""}</td>${pr ? `<td class="papel">${pr.papel}</td><td class="cobra">${pr.cobra}</td><td class="imp">${pr.imp}</td><td class="forma">${pr.forma}</td>` : `<td></td><td></td><td class="imp">${q || !st ? "" : eur(st)}</td><td></td>`}<td class="acc">${n.dePreg ? "" : accion}</td></tr>` +
        (q ? "" : porPasos(n.hijos, nivel + 1, q));
    }
    if (n.t === "preg") {
      if (n.cond && !n.cond()) return "";
      if (n.caes && n !== caesQueSePregunta()) return "";
      if (n.resp == null) pendientes.push(n.texto);
      if (n.resp === "Sí" && n.creado.length) return filas(n.creado, nivel, q);
      // Mas de dos respuestas: un desplegable en la propia fila (el tipo de obra), no una fila de botones.
      if ((n.multi || n.opciones.some((o) => o.nombre)) && n.resp != null) return filas(n.creado, nivel, q);
      if (n.multi) {
        const lista = n.opciones.map((o, i) => `<label><input type="checkbox" data-marca="${n.id}:${i}"${n.marcadas.includes(o.txt) ? " checked" : ""}> ${o.txt}</label>`).join("");
        return `<tr data-d="${nivel}" class="fuera ${n.resp == null ? "pregunta" : "respondida"}"><td colspan="6">${n.texto} ` +
          `<details class="multi" data-id="${n.id}"${n.abierto ? " open" : ""}><summary>${n.resp ?? (n.marcadas.length ? n.marcadas.join(" + ") : "elegir las obras")}</summary><div class="pop">${lista}` +
          `<button type="button" data-hecho="${n.id}"${n.marcadas.length < 2 ? " disabled" : ""}>Hecho</button></div></details></td></tr>`;
      }
      if (n.opciones.length > 2)
        return `<tr data-d="${nivel}" class="fuera ${n.resp == null ? "pregunta" : "respondida"}"><td colspan="6">${n.texto} ` +
          `<select data-elige="${n.id}">${n.resp == null ? `<option value="">elegir</option>` : ""}${n.opciones.map((o, i) => `<option value="${i}"${o.txt === n.resp ? " selected" : ""}>${o.txt}</option>`).join("")}</select></td></tr>` + filas(n.creado, nivel, q);
      if (n.resp == null)
        return `<tr data-d="${nivel}" class="fuera pregunta"><td colspan="6">${rama(nivel)}${n.texto}<span class="resp">${n.opciones.map((o, i) => `<button type="button" data-resp="${n.id}:${i}">${o.txt}</button>`).join("")}</span></td></tr>`;
      const otras = n.opciones.length > 2 ? ` <button type="button" class="accion" data-cambiar="${n.id}">cambiar</button>` : ` <button type="button" class="accion" data-cambiar="${n.id}">cambiar</button>`;
      const txt = n.opciones.some((o) => o.nombre) ? "" : `${n.texto} ${n.resp}`;
      return (txt ? `<tr data-d="${nivel}" class="fuera respondida"><td colspan="6">${rama(nivel)}${txt}${otras}</td></tr>` : `<tr data-d="${nivel}" class="fuera respondida"><td colspan="6">${rama(nivel)}${n.texto}: ${n.resp}${otras}</td></tr>`) + filas(n.creado, nivel, q);
    }
    if (n.t === "opc") {
      if (n.creado.length) return filas(n.creado, nivel, q);
      return `<tr data-d="${nivel}" class="fuera opcion"><td colspan="6">${rama(nivel)}<button type="button" class="opc" data-opc="${n.id}">+ ${n.nombre}</button></td></tr>`;
    }
    // linea
    let { papel, cobra, imp, forma } = celdasPrecio(n, q);
    // Dentro de un conjunto con «solo el total», cada proyecto guarda su importe pero no su forma de pago: se cobra el conjunto.
    if (n.conPortales && padreDe(n.id)?.desglosar === false) forma = "";
    const oculto = n.conPortales && padreDe(n.id)?.desglosar === false && n.cobra ? `<span class="precio-oculto">no sale en el papel</span>` : "";
    return `<tr data-d="${nivel}" class="linea ${n.cobra ? "cobrable" : "incl"}${q ? " quitada" : ""}"><td class="que">${rama(nivel)}<span class="txt">${n.nombre}</span>${n.conPortales && !q ? selPortales(n) : ""}</td><td class="papel">${papel}</td><td class="cobra">${cobra}</td><td class="imp">${imp}${oculto}</td><td class="forma">${forma}</td><td class="acc">${accion}</td></tr>`;
  }
  function selForma(n) {
    const op = (v, t) => `<option value="${v}"${n.forma === v ? " selected" : ""}>${esc(t)}</option>`;
    const sel = `<select class="forma" data-forma="${n.id}" aria-label="Cómo se cobra">${op("", "elegir")}${FORMAS.map((f) => op(f.id, f.nombre)).join("")}${op("otra", "otra (escribirla)")}</select>`;
    return n.forma === "otra" ? sel + ` <input type="text" class="forma propia" data-propia="${n.id}" value="${esc(n.formaPropia)}" placeholder="cómo se cobra" aria-label="Cómo se cobra (a mano)">` : sel;
  }
  function celdasPrecio(n, q) {
    const papel = q ? "" : `<button type="button" class="sale${n.papel ? "" : " no"}" data-papel="${n.id}">${n.papel ? "sale" : "no sale"}</button>`;
    const cobra = q ? "" : `<select data-cobra="${n.id}" aria-label="Se cobra"><option${n.cobra ? " selected" : ""}>sí</option><option${n.cobra ? "" : " selected"}>incluido</option></select>`;
    const imp = q ? "" : !n.cobra ? "incluido" : n.pct ? n.pct : `<input type="text" class="imp" data-imp="${n.id}" value="${n.importe ? mil(n.importe) : ""}" aria-label="Importe"${n.origen ? ` title="${esc(n.origen)}"` : ""}>`;
    const forma = q || !n.cobra ? "" : selForma(n);
    return { papel, cobra, imp, forma };
  }
  
  function pintar() {
    recalcular();
    const cf = document_.getElementById("confirma"); if (cf) cf.innerHTML = "";
    const total = hoja.reduce((s, n) => s + subtotal(n), 0);
    pendientes = [];
    const tb = document_.getElementById("hoja");
    tb.innerHTML = (hoja.length ? filas(hoja, 0, false) : `<tr><td colspan="6" style="color:var(--tinta2);font-style:italic">Aún no hay nada: añade desde el catálogo, a la izquierda.</td></tr>`) +
      `<tr class="total"><td>Total</td><td></td><td></td><td class="imp">${eur(total)}</td><td>+ IVA</td><td></td></tr>`;
    arbolDeLineas(tb);
    avisar();
  }
  // Lo que falta para poder guardar: las preguntas sin contestar y, en lo que se cobra, su importe y su forma de pago.
  function faltas() {
    const f = pendientes.map((t) => `Te falta contestar: ${t}`);
    for (const n of todos()) if (n.aMano && !n.quitada && !n.texto.trim()) f.push("Te falta escribir qué es lo que pones a mano (en «Otro»)");
    for (const x of recoger()) {
      if (!x.seCobra) continue;
      const n = buscar(x.ref);
      const nombre = n?.nombre ?? "";
      if (x.importe == null && x.porcentaje == null && !x.esTotal && !x.aExito) f.push(`Te falta indicar el precio de «${nombre}»${n?.avisoTarifa ? ` (${n.avisoTarifa})` : ""}`);
      if (!x.formaId && !x.formaPropia && !x.sinForma) {
        const quien = n?.precio && !n.conjunto ? n.precio : n;
        f.push(quien?.forma === "otra" ? `Te falta escribir cómo se cobra «${nombre}»` : `Te falta elegir cómo se cobra «${nombre}»`);
      }
    }
    return f;
  }
  function avisar() {
    const f = faltas();
    document_.getElementById("avisos").innerHTML = pendientes.length ? `<div class="avisos">Falta contestar: ${esc(pendientes.join(" · "))}</div>` : "";
    const listo = hoja.length > 0 && f.length === 0;
    document_.getElementById("faltan").innerHTML = hoja.length && f.length
      ? `<div class="faltan"><b>Aún no se puede previsualizar ni guardar:</b><ul>${f.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : "";
    document_.getElementById("generar").disabled = !listo || guardando;
    document_.getElementById("previsualizar").disabled = !listo;
    const em = document_.getElementById("emitir"); if (em) em.disabled = !listo || guardando;
    if (!listo) { document_.getElementById("confirma").innerHTML = ""; }
    pintarPrevia(listo);
  }
  // LO QUE SE GUARDA: una fila por cada fila de la tabla, colgada de la suya, con su bloque y los portales que le tocan
  // (los suyos o, si no, los de arriba; por defecto todos). Lo quitado y las preguntas no se guardan: solo lo que queda.
  function recoger(ns = hoja, padre = null, arriba = ACCESOS.map((a) => a.id), soloTotal = false, out = []) {
    const precio = (n) => ({
      seCobra: !!n.cobra,
      importe: n.cobra && !n.pct ? n.importe || null : null,
      porcentaje: n.cobra && n.pct ? n.pctNum ?? null : null,
      aExito: !!(n.cobra && n.pct),
      formaId: n.cobra && n.forma && n.forma !== "otra" ? n.forma : null,
      formaPropia: n.cobra && n.forma === "otra" ? n.formaPropia.trim() || null : null,
    });
    for (const n of ns) {
      if (n.t === "preg" || n.t === "opc") { if (n.t === "preg" && !visible(n)) continue; recoger(n.creado, padre, arriba, soloTotal, out); continue; }
      if (n.quitada) continue;
      const portales = n.portales || arriba;
      if (n.t === "linea") {
        const f = { ref: n.id, padre, bloque: n.bloque, desglose: n.desglose || null, enPapel: !!n.papel, desglosar: null, portales, ...precio(n) };
        // En un conjunto con «solo el total», cada proyecto guarda su importe (dato interno) pero no su forma: se cobra el conjunto.
        if (soloTotal && n.conPortales) Object.assign(f, { formaId: null, formaPropia: null, sinForma: true });
        out.push(f);
        continue;
      }
      const f = { ref: n.id, padre, bloque: n.bloque, desglose: n.desglose || null, enPapel: true, desglosar: n.conjunto ? n.desglosar !== false : null, portales, texto: n.aMano ? n.texto.trim() || null : null,
        seCobra: false, importe: null, porcentaje: null, formaId: null, formaPropia: null };
      if (n.precio && !n.precio.quitada) Object.assign(f, precio(n.precio), { enPapel: !!n.precio.papel });
      // «Solo el total»: se cobra el conjunto, con su forma; el total no se guarda (es la suma de sus proyectos).
      if (n.conjunto && n.desglosar === false) Object.assign(f, precio({ ...n, cobra: true, importe: null, pct: null }), { esTotal: true });
      out.push(f);
      recoger(n.hijos, n.id, portales, n.conjunto && n.desglosar === false, out);
    }
    return out;
  }
  let guardando = false;

  // ---- VISTA PREVIA: el papel tal como se va a generar (el mismo esqueleto y estilo que el generador de hojas).
  let previaAbierta = false;
  const P = datos.papel || {};
  // Miles con punto siempre (el es-ES del navegador no lo pone en los de cuatro cifras) y dos decimales.
  const eur2 = (x) => { const [e, d] = (Math.round(Number(x) * 100) / 100).toFixed(2).split("."); return mil(Number(e)) + "," + d; };
  const precioIva = (x) => `${eur2(x)} € + ${eur2(x * 0.21)} IVA = ${eur2(x * 1.21)} €`;
  const pctTxt = (x) => String(x).replace(".", ",") + " %";
  const nombreAcc = (ids) => ACCESOS.filter((a) => ids.includes(a.id)).map((a) => a.texto).join(" · ");
  const textoForma = (f, nodo) => {
    if (f.formaPropia) return f.formaPropia;
    const fp = FORMAS.find((x) => x.id === f.formaId);
    if (!fp) return "";
    const t = (fp.frases && fp.frases.length ? fp.frases : [fp.nombre]).join(" · ");
    return f.porcentaje != null ? t.replace(/el % a éxito/, `el ${pctTxt(f.porcentaje)} de lo concedido`) : t;
  };
  function papel() {
    const fs = recoger();
    const nodo = (f) => buscar(f.ref);
    const bloqueDe = (c) => D[c] || {};
    // De que proyecto es cada fila (su tipo): el suyo o el de la fila de arriba del mismo bloque.
    const porRef = new Map(fs.map((f) => [f.ref, f]));
    const tipoDe = (f) => { let x = f; while (x) { if (x.desglose) return x.desglose; const pa = porRef.get(x.padre); x = pa && pa.bloque === f.bloque ? pa : null; } return null; };
    // Cabecera: un «Proyecto para …» por proyecto (los de arriba y los de un conjunto).
    const proyectos = fs.filter((f) => f.bloque === "REDACCION PROYECTO" && f.desglose);
    const cab = proyectos.map((f) => `<div>Proyecto para <b>${esc(f.desglose)}</b> en edificio residencial existente en: <b>${esc(nombreAcc(f.portales) || "…")}</b>${P.municipio ? ", " + esc(P.municipio) : ""}</div>`).join("");
    // Los parrafos: uno por bloque con texto que sale en el papel (el proyecto, uno por tipo).
    const vistos = new Set();
    let parrafos = "";
    for (const f of fs) {
      if (!f.enPapel) continue;
      const b = f.texto ? { titulo: f.texto.toUpperCase(), puntos: [] } : bloqueDe(f.bloque);
      if (!b.titulo) continue;
      const tipo = f.bloque === "REDACCION PROYECTO" ? tipoDe(f) : null;
      const clave = f.bloque + "|" + (tipo ?? "") + "|" + (f.texto ? f.ref : "");
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      let titulo = b.titulo + (tipo ? " DE " + tipo.toUpperCase() : "");
      let puntos = b.puntos || [];
      if (f.bloque === "PROYECTO CONJUNTO") {
        const tipos = fs.filter((x) => x.padre === f.ref && x.desglose).map((x) => (/^SATE/.test(x.desglose) ? x.desglose : x.desglose.toLowerCase()));
        const lista = tipos.length > 1 ? tipos.slice(0, -1).join(", ") + " y " + tipos.at(-1) : tipos.join("");
        puntos = puntos.map((x) => (/:\s*$/.test(x) ? x.trim() + " " + lista : x));
      }
      parrafos += `<div class="bloque"><b>${esc(titulo)}</b>${puntos.length ? `<ul>${puntos.map((y) => `<li>${esc(y.replace(/^•\s*/, ""))}</li>`).join("")}</ul>` : ""}</div>`;
    }
    // El desglose: cada linea que sale, con su precio, su % o «incluido»; el conjunto con los suyos debajo.
    let total = 0, exito = [];
    const filas = [];
    for (const f of fs) {
      const n = nodo(f);
      if (!f.enPapel || !n) continue;
      const esCab = n.t === "cab";
      if (esCab && !n.precio && !f.esTotal && !n.conjunto) continue;
      const dentro = !!(n.conPortales && porRef.get(f.padre)?.bloque === "PROYECTO CONJUNTO");
      const soloTotal = dentro && porRef.get(f.padre)?.desglosar === false;
      let valor;
      if (n.conjunto) {
        const suma = fs.filter((x) => x.padre === f.ref && x.seCobra && x.importe).reduce((t, x) => t + x.importe, 0);
        valor = precioIva(suma);
        if (n.desglosar !== false) { filas.push(`<tr><td><b>${esc(n.nombre)}</b></td><td class="r"><b>${valor}</b></td></tr>`); continue; }
        total += suma;
        filas.push(`<tr><td><b>${esc(n.nombre)}</b></td><td class="r"><b>${valor}</b></td></tr>`);
        continue;
      }
      if (soloTotal) valor = "<i>incluido en el conjunto</i>";
      else if (f.seCobra && f.porcentaje != null) { valor = `${pctTxt(f.porcentaje)} de lo concedido + IVA`; exito.push(pctTxt(f.porcentaje) + " de lo concedido"); }
      else if (f.seCobra && f.aExito) valor = "a éxito";
      else if (f.seCobra && f.importe) { valor = precioIva(f.importe); total += f.importe; }
      else valor = "<i>incluido</i>";
      filas.push(`<tr><td${dentro ? ' style="padding-left:16px"' : ""}>${esc(n.nombre)}</td><td class="r">${valor}</td></tr>`);
    }
    const desglose = `<table>${filas.join("")}</table><div class="totalbanda">Total Honorarios Profesionales: ${eur2(total)} €${exito.map((x) => " + " + x).join("")} + IVA</div>`;
    // La forma de pago: de lo que se cobra en el papel (el conjunto con «solo el total», como una sola cosa).
    const pagos = fs.filter((f) => f.seCobra && !f.sinForma && (f.formaId || f.formaPropia)).map((f) => `<li>${esc(nodo(f)?.nombre ?? "")}: ${esc(textoForma(f))}</li>`);
    const pago = pagos.length ? `<p style="margin-top:12px"><b><u>Forma de Pago de Honorarios:</u></b></p><ul class="pago">${pagos.join("")}</ul>` : "";
    const icio = fs.some((f) => f.bloque === "TRAMITACION LICENCIAS") ? P.icio || "" : "";
    const caja = document.createElement("div");
    caja.innerHTML = P.esqueleto || "";
    const pon = (k, h) => { const el = caja.querySelector(`[data-p="${k}"]`); if (el) el.innerHTML = h; };
    pon("cab", cab); pon("bloques", parrafos); pon("desglose", desglose); pon("icio", icio); pon("pago", pago);
    const r = caja.querySelector('[data-p="razon"]'); if (r) r.textContent = PAG.razon || "";
    const c = caja.querySelector('[data-p="cif"]'); if (c) c.textContent = PAG.cif || "";
    return caja.innerHTML;
  }
  function pintarPrevia(listo) {
    const el = document_.getElementById("previa");
    if (!previaAbierta) { el.innerHTML = ""; return; }
    el.innerHTML = `<div class="previa-cab"><b>Así quedará la hoja</b> <button type="button" class="accion" id="cerrar-previa">cerrar</button></div>` +
      (listo ? `<div class="previa"><div class="hoja-papel">${papel()}</div></div>` : `<p class="faltan">Cuando no falte nada, aquí verás la hoja.</p>`);
  }

  // ---- CONFIRMAR LOS PORTALES (con mas de uno): salen todos por defecto, asi que se validan al guardar.
  function confirmarPortales() {
    const lineas = [];
    const ver = (ns, arriba) => {
      for (const n of ns) {
        if (n.t === "preg" || n.t === "opc") { if (n.t !== "preg" || visible(n)) ver(n.creado, arriba); continue; }
        if (n.quitada) continue;
        const ps = n.portales || arriba;
        if (n.t === "cab" && arriba === null) lineas.push([n.nombre, ps]);
        if (n.conPortales) lineas.push(["— " + n.nombre, ps]);
        if (n.t === "cab") ver(n.hijos, ps);
      }
    };
    for (const n of hoja) { if (n.quitada) continue; const ps = n.portales || ACCESOS.map((a) => a.id); lineas.push([n.nombre, ps]); ver(n.hijos, ps); }
    const todos = (ps) => ps.length === ACCESOS.length;
    document_.getElementById("confirma").innerHTML = `<div class="confirma"><b>Vas a guardarlo así. ¿Seguro que cada cosa aplica a esos portales?</b><ul>` +
      lineas.map(([n, ps]) => `<li>${esc(n)}: <b>${todos(ps) ? "todos" : "solo"}</b> · ${esc(nombreAcc(ps))}</li>`).join("") +
      `</ul><button type="button" class="generar" id="si-guardar">Sí, guardar</button> <button type="button" class="secundario" id="no-guardar">No, voy a cambiarlos</button></div>`;
  }
  async function guardar() {
    if (guardando || faltas().length) return;
    document_.getElementById("confirma").innerHTML = "";
    guardando = true; avisar();
    const filas = recoger().map(({ ref, padre, bloque, desglose, enPapel, seCobra, importe, porcentaje, formaId, formaPropia, desglosar, portales, texto }) =>
      ({ ref, padre, bloque, desglose, enPapel, seCobra, importe, porcentaje, formaId, formaPropia, desglosar, portales, texto: texto ?? null }));
    await datos.alGuardar?.(filas);
    guardando = false; avisar();
  }

  // ---- SEGUIR EDITANDO UN BORRADOR: se rehace el arbol desde lo guardado (los datos mandan). Cada cosa de arriba se
  // monta como si se añadiera del catalogo, se contestan sus preguntas segun lo que se guardo debajo y se le ponen sus
  // valores; lo que el paquete trae y no se guardo, sale quitado.
  const DE_TIPO = Object.fromEntries(Object.entries(TIPO).map(([k, v]) => [v, k]));
  function cargar(ls) {
    const hijosG = (id) => ls.filter((l) => l.padre === id);
    const todosP = (ps) => (ps.length === ACCESOS.length && ACCESOS.every((a) => ps.includes(a.id)) ? null : ps);
    const contestar = (p, o) => { p.resp = o.txt; p.creado = o.crea ? o.crea() : []; p.creado.forEach((c) => (c.dePreg = p.id)); if (o.nombre) padreDe(p.id).nombre = o.nombre; if (o.desglose) padreDe(p.id).desglose = o.desglose; };
    const deObra = (n, txt) => { const p = n.hijos.find((h) => h.t === "preg" && esDeObra(h)); const o = p?.opciones.find((x) => x.txt === txt); if (o) contestar(p, o); };
    function aplicar(n, g) {
      if (n.t === "linea") {
        n.cobra = g.seCobra; n.papel = g.enPapel;
        if (!n.pct) n.importe = g.importe;
        n.forma = g.formaId || (g.formaPropia ? "otra" : ""); n.formaPropia = g.formaPropia || "";
      } else {
        if (n.precio) aplicar(n.precio, g);
        if (n.conjunto) { n.desglosar = g.desglosar !== false; if (n.desglosar === false) { n.forma = g.formaId || (g.formaPropia ? "otra" : ""); n.formaPropia = g.formaPropia || ""; } }
      }
      if (n.conPortales || padreDe(n.id) == null) n.portales = todosP(g.portales);
    }
    function ajustar(n, g) {
      aplicar(n, g);
      if (n.t !== "cab") return;
      const usados = new Set();
      const tomar = (x) => { const c = hijosG(g.id).find((y) => !usados.has(y.id) && y.bloque === x.bloque && (!x.desglose || !y.desglose || y.desglose === x.desglose)); if (c) usados.add(c.id); return c; };
      const recorrer = (lista) => {
        for (const x of lista) {
          if (x.t === "opc") continue;
          if (x.t === "preg") {
            if (!visible(x)) continue;
            if (x.resp == null && !esDeObra(x)) {
              const si = x.opciones.find((o) => o.crea);
              const no = x.opciones.find((o) => !o.crea);
              const bl = si ? si.crea()[0]?.bloque : null;
              if (si && hijosG(g.id).some((y) => !usados.has(y.id) && y.bloque === bl)) contestar(x, si); else if (no) contestar(x, no);
            }
            recorrer(x.creado);
            continue;
          }
          const c = tomar(x);
          if (c) ajustar(x, c); else x.quitada = true;
        }
      };
      recorrer(n.hijos);
    }
    for (const g of hijosG(null)) {
      let n = null, clase = null;
      if (g.bloque === "REDACCION PROYECTO") {
        const t = DE_TIPO[g.desglose] ?? g.desglose;
        if (g.desglose === "Ascensor") n = proyecto.asc();
        else if (/^SATE/.test(g.desglose || "")) { n = proyecto.efi(); n.hijos[0].resp = null; n.tipoG = t; }
        else { n = proyecto.acc(); n.tipoG = t; }
        clase = "proyecto";
      } else if (g.bloque === "PROYECTO CONJUNTO") {
        n = proyecto.con(); clase = "proyecto";
        const q = n.hijos[0];
        q.marcadas = hijosG(g.id).filter((y) => y.bloque === "REDACCION PROYECTO" && y.desglose).map((y) => DE_TIPO[y.desglose] ?? y.desglose);
        q.resp = q.marcadas.join(" + "); n.nombre = "Proyecto conjunto: " + q.resp; q.alHecho();
      } else if (g.bloque === "TRAMITACION SUBVENCIONES") {
        n = subvencion(); clase = "servicio";
      } else {
        for (const [, cl, items] of CATALOGO) for (const [, hacer] of items) { if (n) break; const m = hacer(); if (m.bloque === g.bloque && m.bloque !== "REDACCION PROYECTO") { n = m; clase = cl; } }
      }
      if (!n) continue;
      n.clase = clase;
      if (n.aMano) { n.texto = g.texto || ""; n.nombre = n.texto || "Otro"; n.precio.nombre = n.nombre; }
      hoja.push(n);
      // El tipo se contesta con la cabecera ya en la hoja (la respuesta le pone su nombre).
      if (n.tipoG) deObra(n, n.tipoG);
      if (g.bloque === "TRAMITACION SUBVENCIONES") deObra(n, g.desglose);
      ajustar(n, g);
    }
  }
  // ---- LAS TARIFAS (el calculo del generador viejo, 18-oct-2026)
  // Las lineas que estan de verdad en la hoja (ni quitadas, ni bajo una pregunta que no toca).
  function activas(ns = hoja, out = []) {
    for (const n of ns) {
      if (n.t === "preg" || n.t === "opc") { if (n.t === "opc" || visible(n)) activas(n.creado, out); continue; }
      if (n.quitada) continue;
      if (n.t === "linea") { out.push(n); continue; }
      if (n.precio && !n.precio.quitada) out.push(n.precio);
      activas(n.hijos, out);
    }
    return out;
  }
  const duenoDe = (n) => { const p = padreDe(n.id); return p !== undefined ? p : todos().find((c) => c.precio === n) ?? null; };
  const cadena = (n) => { const out = []; let x = duenoDe(n); while (x) { out.push(x); x = duenoDe(x); } return out; };
  // Que se hace: el tipo de la linea o el de la cabecera de arriba; en un conjunto, los de sus proyectos.
  function tiposDe(n) {
    if (n.desglose) return [n.desglose];
    for (const c of cadena(n)) {
      if (c.desglose) return [c.desglose];
      if (c.conjunto) return c.hijos.filter((h) => h.conPortales && !h.quitada && h.desglose).map((h) => h.desglose);
    }
    return [];
  }
  // Las viviendas donde se hace: las de SUS portales (los suyos o los de arriba; por defecto todos), una vez por portal.
  function viviendasDe(n) {
    const ps = n.portales || cadena(n).find((c) => c.portales)?.portales || ACCESOS.map((a) => a.id);
    const el = ACCESOS.filter((a) => ps.includes(a.id));
    if (!el.length || el.some((a) => a.viviendas == null)) return null;
    return [...new Map(el.map((a) => [a.portalId ?? a.id, a.viviendas])).values()].reduce((s, v) => s + v, 0);
  }
  const pctTexto = (x) => String(Number(x)).replace(".", ",");
  function propuesta(n) {
    const deBloque = PAG.tarifaId ? PRECIOS.filter((p) => p.tarifaId === PAG.tarifaId && p.bloque === n.bloque) : [];
    if (!deBloque.length) return null;
    const tipos = tiposDe(n);
    const tipo = tipos.find((t) => deBloque.some((p) => p.tipo === t)) ?? null;
    const cand = deBloque.filter((p) => p.tipo === tipo);
    if (!cand.length) return null;
    const tarifa = cand[0].tarifa;
    const conTramo = cand.some((p) => p.desde != null || p.hasta != null);
    const v = conTramo ? viviendasDe(n) : null;
    if (conTramo && v == null) return { valor: null, incluye: [], donde: tarifa, aviso: "no sé las viviendas del edificio para elegir el tramo de la tarifa" };
    const p = conTramo ? cand.find((x) => (x.desde ?? 0) <= v && (x.hasta == null || v <= x.hasta)) : cand[0];
    if (!p) return { valor: null, incluye: [], donde: tarifa, aviso: `la tarifa «${tarifa}» no tiene precio para ${v} viviendas` };
    const donde = `Tarifa ${tarifa}${conTramo ? ` · ${v} viviendas` : ""}`;
    if (p.forma === "fijo") return { valor: p.importe == null ? null : Number(p.importe), incluye: p.incluye, donde, aviso: null };
    if (p.forma === "pct_exito") return { pct: Number(p.porcentaje), incluye: p.incluye, donde, aviso: null };
    if (datos.pem == null) return { valor: null, incluye: p.incluye, donde, aviso: `la tarifa es el ${pctTexto(p.porcentaje)} % del PEM y la viabilidad no tiene PEM` };
    return { valor: Math.round((datos.pem * Number(p.porcentaje)) / 100), incluye: p.incluye, donde: `${donde} · ${pctTexto(p.porcentaje)} % de ${mil(datos.pem)} € de PEM`, aviso: null };
  }
  // Pone en cada linea lo que propone la tarifa (o el catalogo), salvo lo que el comercial ha tocado a mano.
  function recalcular() {
    const ls = activas();
    const props = new Map(ls.map((n) => [n, n.bloque === "OTRO" ? null : propuesta(n)]));
    for (const n of ls) {
      if (n.bloque === "OTRO") continue;
      const p = props.get(n);
      n.origen = p?.donde ?? null; n.avisoTarifa = p?.aviso ?? null;
      // Incluido si el precio de otra linea de la hoja ya lo incluye (el del ascensor incluye la DF y la CSS).
      const incluido = ls.some((m) => m !== n && props.get(m)?.incluye.includes(n.bloque));
      if (!n.manoCobra) n.cobra = n.cobraBase && !incluido;
      if (!n.manoImp) {
        if (p && p.pct != null) { n.pctNum = p.pct; n.pct = `${pctTexto(p.pct)} % de lo concedido`; }
        else if (p) n.importe = p.valor;
        else if (!n.pct) n.importe = n.importeBase;
      }
      if (!n.manoForma) n.forma = formaDefecto(n.bloque);
    }
    // El conjunto con «solo el total» lleva su propia forma de pago.
    for (const c of todos()) if (c.conjunto && !c.manoForma) c.forma = formaDefecto("PROYECTO CONJUNTO") || c.hijos.find((h) => h.conPortales)?.forma || "";
  }
  // Al abrir un borrador: lo guardado manda. Lo que coincide con lo que propondria hoy sigue la tarifa; lo demas, a mano.
  function marcarAMano() {
    const ls = activas();
    const antes = new Map(ls.map((n) => [n, { cobra: n.cobra, importe: n.importe, forma: n.forma }]));
    const conj = todos().filter((c) => c.conjunto).map((c) => [c, c.forma]);
    recalcular();
    for (const [n, a] of antes) {
      if (n.bloque === "OTRO") continue;
      if (n.cobra !== a.cobra) { n.manoCobra = true; n.cobra = a.cobra; }
      // Lo incluido no guarda importe ni forma de pago: ahi no hay nada escrito a mano.
      if (!a.cobra) continue;
      if (!n.pct && (n.importe ?? null) !== (a.importe ?? null)) { n.manoImp = true; n.importe = a.importe; }
      if (n.forma !== a.forma) { n.manoForma = true; n.forma = a.forma; }
    }
    for (const [c, f] of conj) if (c.forma !== f) { c.manoForma = true; c.forma = f; }
  }
  function caesQueSePregunta() { return todos().find((x) => x.caes && !x.quitada && !estaQuitado(x.id) && (!x.cond || x.cond())) ?? null; }
  // EL ARBOL: una linea vertical baja de cada cabecera y se ramifica hacia cada una de sus lineas, hasta la ultima.
  const PASO = 22, X0 = 12;
  function arbolDeLineas(tb) {
    const filas = [...tb.querySelectorAll("tr[data-d]")];
    const d = filas.map((f) => Number(f.dataset.d));
    const real = filas.map((f) => !f.classList.contains("fuera")); // las preguntas sin contestar y los "+" no son lineas: sin rama
    const esUltima = (j) => { for (let m = j + 1; m < d.length; m++) { if (!real[m]) continue; if (d[m] < d[j]) return true; if (d[m] === d[j]) return false; } return true; };
    // la rama de nivel k sigue abierta en la fila i si la ultima linea de verdad de ese nivel, antes de i, no es la ultima de su grupo
    const abierta = (i, k) => { for (let j = i - 1; j >= 0; j--) { if (!real[j]) continue; if (d[j] < k) return false; if (d[j] === k) return !esUltima(j); } return false; };
    const x = (k) => X0 + (k - 1) * PASO;
    filas.forEach((f, i) => {
      const td = f.firstElementChild;
      td.style.paddingLeft = (6 + d[i] * PASO) + "px";
      if (!d[i]) return;
      let g = "";
      const hasta = real[i] ? d[i] - 1 : d[i];
      for (let k = 1; k <= hasta; k++) if (abierta(i, k)) g += `<i class="g v" style="left:${x(k)}px"></i>`;
      if (real[i]) g += `<i class="g ${esUltima(i) ? "mitad" : "v"}" style="left:${x(d[i])}px"></i><i class="g h" style="left:${x(d[i])}px"></i>`;
      td.insertAdjacentHTML("afterbegin", g);
    });
  }
  function estaQuitado(id) { let p = padreDe(id); while (p) { if (p.quitada) return true; p = padreDe(p.id); } return false; }
  
  function pintarCatalogo() {
    const f = filtro.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    let h = "";
    CATALOGO.forEach(([g, clase, items], gi) => {
      const vis = items.map((it, ii) => [it, ii]).filter(([[n]]) => n.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().includes(f));
      if (!vis.length) return;
      h += `<div class="grupo ${clase}">${g}</div><div class="bloque ${clase}">` + vis.map(([[n, , int], ii]) => `<div class="item${int ? " int" : ""}"><span>${n}${int ? '<span class="tag">les interesa</span>' : ""}</span><button type="button" data-nuevo="${gi}:${ii}">Añadir</button></div>`).join("") + `</div>`;
    });
    const c = document_.getElementById("cat"); const enf = document.activeElement?.id === "buscar";
    c.innerHTML = h;
    if (enf) { const b = document_.getElementById("buscar"); b.focus(); b.setSelectionRange(b.value.length, b.value.length); }
  }
  
  document_.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.nuevo) { const [g, i] = b.dataset.nuevo.split(":").map(Number); const n = CATALOGO[g][2][i][1](); n.clase = CATALOGO[g][1]; hoja.push(n); }
    else if (b.dataset.resp) {
      const [id, i] = b.dataset.resp.split(":"); const p = buscar(id); const o = p.opciones[Number(i)];
      p.resp = o.txt; p.creado = o.crea ? o.crea() : []; p.creado.forEach((c) => (c.dePreg = p.id));
      if (o.nombre) padreDe(p.id).nombre = o.nombre;
      if (o.desglose) padreDe(p.id).desglose = o.desglose;
    }
    else if (b.dataset.hecho) { const p = buscar(b.dataset.hecho); p.resp = p.marcadas.join(" + "); p.abierto = false; padreDe(p.id).nombre = "Proyecto conjunto: " + p.resp; if (p.alHecho) p.alHecho(); }
    else if (b.dataset.cambiar) { const p = buscar(b.dataset.cambiar); p.resp = null; p.creado = []; }
    else if (b.dataset.opc) { const o = buscar(b.dataset.opc); o.creado = o.crea(); }
    else if (b.dataset.quitar) {
      const n = buscar(b.dataset.quitar); const p = padreDe(n.id);
      if (n.dePreg) { const pr = buscar(n.dePreg); pr.resp = "No"; pr.creado = []; pintar(); return; }
      if (!p && n.t === "cab") hoja.splice(hoja.indexOf(n), 1); // una cabecera de arriba se quita del todo
      else if (p && p.t === "opc") p.creado = []; // lo que se añadio con "+" vuelve a ser "+"
      else n.quitada = !n.quitada;
    }
    else if (b.dataset.papel) { const n = buscar(b.dataset.papel); n.papel = !n.papel; }
    else return;
    pintar();
  });
  document_.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.cobra) { const n = buscar(t.dataset.cobra); n.cobra = t.value === "sí"; n.manoCobra = true; pintar(); }
    if (t.dataset.forma) { const n = buscar(t.dataset.forma); n.forma = t.value; n.manoForma = true; pintar(); }
    if (t.dataset.elige) { const p = buscar(t.dataset.elige); const o = p.opciones[Number(t.value)]; if (!o) return; p.resp = o.txt; p.creado = o.crea ? o.crea() : []; if (o.nombre) padreDe(p.id).nombre = o.nombre; if (o.desglose) padreDe(p.id).desglose = o.desglose; pintar(); }
    if (t.dataset.desglosa) { buscar(t.dataset.desglosa).desglosar = t.value === "si"; pintar(); }
    if (t.dataset.portal) {
      const [id, aid] = t.dataset.portal.split(":"); const n = buscar(id);
      let s = n.portales ? [...n.portales] : ACCESOS.map((a) => a.id);
      s = t.checked ? [...new Set([...s, aid])] : s.filter((x) => x !== aid);
      if (!s.length) { t.checked = true; return; } // siempre al menos un portal
      n.portales = s.length === ACCESOS.length ? null : s;
      t.closest("details").querySelector("summary").textContent = "portales: " + (!n.portales ? "todos" : ACCESOS.filter((a) => n.portales.includes(a.id)).map((a) => a.texto).join(", "));
    }
    if (t.dataset.marca) {
      const [id, i] = t.dataset.marca.split(":"); const p = buscar(id); const x = p.opciones[Number(i)].txt;
      p.marcadas = t.checked ? [...p.marcadas, x] : p.marcadas.filter((y) => y !== x);
      const d = t.closest("details"); d.querySelector("summary").textContent = p.marcadas.length ? p.marcadas.join(" + ") : "elegir las obras";
      d.querySelector("[data-hecho]").disabled = p.marcadas.length < 2;
    }
  });
  document_.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "buscar") { filtro = t.value; pintarCatalogo(); }
    if (t.dataset.propia) { buscar(t.dataset.propia).formaPropia = t.value; avisar(); }
    if (t.dataset.texto) { const n = buscar(t.dataset.texto); n.texto = t.value; n.nombre = t.value.trim() || "Otro"; n.precio.nombre = n.nombre; avisar(); }
  });
  document_.addEventListener("toggle", (e) => { const d = e.target; if (!d.matches) return; if (d.matches("details.portales")) buscar(d.dataset.pid).abiertoP = d.open; else if (d.matches("details.multi")) buscar(d.dataset.id).abierto = d.open; }, true);
  document_.addEventListener("focusout", (e) => {
    const t = e.target;
    // Vaciar la casilla devuelve el precio de la tarifa; escribir uno lo deja a mano.
    if (t.dataset && t.dataset.imp) { const n = buscar(t.dataset.imp); const v = t.value.trim(); n.manoImp = v !== ""; if (v !== "") n.importe = Number(v.replace(/\./g, "").replace(",", ".")) || 0; pintar(); }
  });
  root.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.id === "generar") { if (faltas().length) return; if (ACCESOS.length > 1) confirmarPortales(); else guardar(); }
    else if (b.id === "si-guardar") guardar();
    else if (b.id === "no-guardar") document_.getElementById("confirma").innerHTML = "";
    else if (b.id === "previsualizar") { previaAbierta = true; avisar(); document_.getElementById("previa").scrollIntoView?.({ behavior: "smooth", block: "start" }); }
    else if (b.id === "cerrar-previa") { previaAbierta = false; avisar(); }
    // GENERAR LA HOJA: el boton ya esta; se conecta con el ciclo de la hoja (borrador -> pendiente del ok de Daniel).
    else if (b.id === "emitir") document_.getElementById("confirma").innerHTML = `<div class="confirma">«Generar la hoja» pedirá el ok de Daniel. Todavía no está conectado: de momento, guárdala como borrador.</div>`;
  }, { signal: ac.signal });
  if (datos.inicial && datos.inicial.length) { cargar(datos.inicial); marcarAMano(); }
  pintarCatalogo();
  pintar();
  return {
    quitar: () => ac.abort(),
    // Cambia quien paga: otra tarifa, otras formas por defecto, otra razon social en el papel. Lo tocado a mano se queda.
    ponerPagador: (p) => { if (p.tipo === PAG.tipo && p.contrataId === PAG.contrataId && p.tarifaId === PAG.tarifaId && p.razon === PAG.razon) return; PAG = p; pintar(); },
  };
}
