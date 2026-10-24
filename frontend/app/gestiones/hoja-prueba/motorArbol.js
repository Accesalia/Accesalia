// @ts-nocheck
// EL MOTOR DE LA HOJA EN ARBOL, para la pantalla de prueba (Monica, 22-oct-2026: «en un apartado solo para mi,
// para probarlo con la base»). Es la logica de la maqueta validada (docs/figma/hoja-encargo-arbol.html y su .md),
// tal cual, con los importes del CATALOGO DE BLOQUES y las formas de pago de he_formas_pago (con su caso por defecto).
// GUARDA EN BORRADOR (24-oct): cada fila lleva su bloque (y su tipo si lo pide) y recoger() la pasa a las tablas nuevas.
// Las reglas (que pregunta cada paquete) estan aqui de momento; al implementarlo de verdad pasan al catalogo.
// Generado desde la maqueta: lo de debajo de «const hoja» es su codigo, cambiando document por la raiz.
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

  let uid = 0;
  const ln = (nombre, bloque, o = {}) => ({ id: ++uid, t: "linea", nombre, bloque, cobra: false, importe: null, pct: null, forma: "", formaPropia: "", papel: true, quitada: false, ...o });
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
  const lleva = [() => ln("Toma de datos y modelado 3D", "TOMA DE DATOS Y MODELADO 3D"), () => ln("Visado colegial", "VISADO", { papel: false }), () => ln("Tramitación de licencias", "TRAMITACION LICENCIAS")];

  const CATALOGO = [
    ["Proyectos", "proyecto", [["Proyecto · ascensor", proyecto.asc, INT.has("asc")], ["Proyecto · accesibilidad", proyecto.acc, INT.has("acc")], ["Proyecto · eficiencia energética", proyecto.efi, INT.has("efi")], ["Proyecto conjunto", proyecto.con]]],
    ["Documentos técnicos", "doc", [["Memoria técnica", suelto("Memoria técnica", "MEMORIA TECNICA"), INT.has("mem")], ["Informe técnico", suelto("Informe técnico", "INFORME TECNICO"), INT.has("inf")], ["Informe pericial", suelto("Informe pericial", "INFORME PERICIAL"), INT.has("per")],
      ["Consulta urbanística", suelto("Consulta urbanística", "CONSULTA URBANISTICA", lleva), INT.has("cons")],
      ["Mediciones y ciego", suelto("Mediciones y ciego", "MEDICIONES Y CIEGO")], ["Modificación de proyecto", suelto("Modificación de proyecto", "MODIFICACION DE PROYECTO")]]],
    ["Servicios", "servicio", [["Subvención", subvencion, INT.has("subv")], ["IEE", suelto("IEE", "IEE"), INT.has("iee")], ["CSS", () => cab("CSS", "CSS", [css()]), INT.has("css")],
      ["Dirección facultativa", dfBloque, INT.has("df")], ["3 presupuestos", () => cab("3 presupuestos", "TRAMITACION 3 PRESUPUESTOS", [tres()]), INT.has("tres")], ["Financiación", () => cab("Financiación", "SOLICITUD DE FINANCIACION", [fin()]), INT.has("fin")], ["CAES", () => cab("CAES", "GESTION DE CAES", [caes()]), INT.has("caes")]]],
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
      const etq = { proyecto: "PROYECTO", doc: "DOC. TÉCNICO", servicio: "SERVICIO" }[n.clase];
      return `<tr data-d="${nivel}" class="cabecera n${Math.min(nivel, 1)}${nivel === 0 && n.clase ? " top " + n.clase : ""}${q ? " quitada" : ""}"><td class="que">${rama(nivel)}${nivel === 0 && etq ? `<span class="clase ${n.clase}">${etq}</span>` : ""}<span class="txt">${n.nombre}</span>${(() => { const e = n.hijos.find((h) => h.t === "preg" && h.resp != null && (h.multi || h.opciones.some((o) => o.nombre))); return e && !q ? ` <button type="button" class="accion" data-cambiar="${e.id}" style="text-transform:none;font-weight:400">cambiar</button>` : ""; })()}${n.dePreg && !q ? ` <button type="button" class="accion" data-quitar="${n.id}" style="text-transform:none;font-weight:400">Eliminar</button>` : ""}${n.conjunto && !q ? ` <select class="desglosa" data-desglosa="${n.id}" aria-label="Precios en el papel"><option value="si"${n.desglosar ? " selected" : ""}>desglosar precios</option><option value="no"${n.desglosar ? "" : " selected"}>solo el total</option></select>` : ""}${nivel === 0 && !q ? selPortales(n) : ""}</td>${pr ? `<td class="papel">${pr.papel}</td><td class="cobra">${pr.cobra}</td><td class="imp">${pr.imp}</td><td class="forma">${pr.forma}</td>` : `<td></td><td></td><td class="imp">${q || !st ? "" : eur(st)}</td><td></td>`}<td class="acc">${n.dePreg ? "" : accion}</td></tr>` +
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
    const cobra = q ? "" : n.pct ? "sí" : `<select data-cobra="${n.id}" aria-label="Se cobra"><option${n.cobra ? " selected" : ""}>sí</option><option${n.cobra ? "" : " selected"}>incluido</option></select>`;
    const imp = q ? "" : n.pct ? n.pct : n.cobra ? `<input type="text" class="imp" data-imp="${n.id}" value="${n.importe ? mil(n.importe) : ""}" aria-label="Importe">` : "incluido";
    const forma = q || !n.cobra ? "" : selForma(n);
    return { papel, cobra, imp, forma };
  }
  
  function pintar() {
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
    const f = pendientes.length ? [`Falta contestar: ${pendientes.join(" · ")}`] : [];
    const sinDatos = [];
    for (const x of recoger()) {
      if (!x.seCobra) continue;
      const nombre = buscar(x.ref)?.nombre ?? "";
      if (x.importe == null && x.porcentaje == null && !x.esTotal && !x.aExito) sinDatos.push(`el importe de «${nombre}»`);
      if (!x.formaId && !x.formaPropia && !x.sinForma) sinDatos.push(`la forma de pago de «${nombre}»`);
    }
    if (sinDatos.length) f.push(`Falta ${sinDatos.join(" · ")}`);
    return f;
  }
  function avisar() {
    const f = faltas();
    document_.getElementById("avisos").innerHTML = f.map((x) => `<div class="avisos">${esc(x)}</div>`).join("");
    document_.getElementById("generar").disabled = !hoja.length || f.length > 0 || guardando;
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
      const f = { ref: n.id, padre, bloque: n.bloque, desglose: n.desglose || null, enPapel: true, desglosar: n.conjunto ? n.desglosar !== false : null, portales,
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
    if (t.dataset.cobra) { buscar(t.dataset.cobra).cobra = t.value === "sí"; pintar(); }
    if (t.dataset.forma) { buscar(t.dataset.forma).forma = t.value; pintar(); }
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
  });
  document_.addEventListener("toggle", (e) => { const d = e.target; if (!d.matches) return; if (d.matches("details.portales")) buscar(d.dataset.pid).abiertoP = d.open; else if (d.matches("details.multi")) buscar(d.dataset.id).abierto = d.open; }, true);
  document_.addEventListener("focusout", (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.imp) { buscar(t.dataset.imp).importe = Number(t.value.replace(/\./g, "").replace(",", ".")) || 0; pintar(); }
  });
  root.querySelector("#generar").addEventListener("click", async () => {
    if (guardando || faltas().length) return;
    guardando = true; avisar();
    const filas = recoger().map(({ ref, padre, bloque, desglose, enPapel, seCobra, importe, porcentaje, formaId, formaPropia, desglosar, portales }) =>
      ({ ref, padre, bloque, desglose, enPapel, seCobra, importe, porcentaje, formaId, formaPropia, desglosar, portales }));
    await datos.alGuardar?.(filas);
    guardando = false; avisar();
  }, { signal: ac.signal });
  pintarCatalogo();
  pintar();
  return () => ac.abort();
}
