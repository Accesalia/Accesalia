// ============================================================================
// EL REGISTRO DE IEE DE LA COMUNIDAD DE MADRID (Monica, 29-sep-2026)
//
// LA IDEA ES SUYA:
//
//   "IEE desfavorables de menos de 6 meses emitidas = gente que NECESITA un
//    arquitecto. Con mas de 6 meses ya se lo habran buscado, porque el
//    ayuntamiento da un plazo de 6 meses para resolver."
//
// El registro (rieecm.es) es publico y no pide certificado. Tiene un buscador
// por municipio -> calle -> numero, pero eso obligaria a barrer 3.742 calles de
// Madrid para 22.000 portales. NO HACE FALTA: los numeros de registro son
// CORRELATIVOS, asi que se tantea hacia delante desde el ultimo conocido.
//
// SOLO HACIA DELANTE, y es decision suya: "me da igual las IEE de 2021, me
// interesan las de mañana, que son las que no tienen arquitecto". Son unas 6 a
// la semana en toda la Comunidad.
//
// DOS TRAMPAS DEL SERVICIO, que costaron encontrar:
//
//   1. La nota declara charset UTF-8 SIEMPRE, y unas veces lo es y otras viene
//      en ISO-8859-1 -depende de si contesta la pagina entera o el trozo-. Hay
//      que ADIVINARLO, no creerse la cabecera: si los bytes son UTF-8 valido es
//      UTF-8, y si no, es ISO-8859-1. Leerlo mal no rompe nada ruidosamente:
//      simplemente no encuentra ningun campo y guarda filas vacias.
//   2. El JSON del buscador (get_edificio) NO trae ni fecha ni referencia
//      catastral. La NOTA INFORMATIVA si, y eso es lo que hace esto posible:
//      sin referencia catastral habria que casar direcciones a mano.
// ============================================================================

const RAIZ = "https://www.rieecm.es/portal/home/nota_informativa_codigo_iee";
const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cab = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
const cabJson = { ...cab, "Content-Type": "application/json" };

export type NotaIEE = {
  codigo: string;
  referencia: string | null;
  referenciaParcela: string | null;
  direccion: string | null;
  municipio: string | null;
  cp: string | null;
  anioConstruccion: number | null;
  anioRehabilitacion: number | null;
  fechaEmision: string | null;
  valoracion: string | null;
  deficienciasSubsanadas: string | null;
  fechaSubsanacion: string | null;
  accesibilidadSatisface: boolean | null;
  accesibilidadAjustes: boolean | null;
  calificacionEnergetica: string | null;
  estadoExpediente: string | null;
  validez: string | null;
  bruto: Record<string, string>;
};

const codigoDe = (n: number) => String(n).padStart(8, "0");

/** La cabecera dice UTF-8 siempre y miente la mitad de las veces. Se prueba a
 *  leerlo como UTF-8 estricto: si los bytes son UTF-8 validos, lo es; si el
 *  decodificador protesta, entonces es ISO-8859-1. No hay tercera opcion. */
function decodificar(buf: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("iso-8859-1").decode(buf);
  }
}

function limpiar(html: string): string {
  return html
    .replace(/&mdash;/g, "—")
    .replace(/&nbsp;/g, " ")
    .replace(/&aacute;/g, "á").replace(/&eacute;/g, "é").replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó").replace(/&uacute;/g, "ú").replace(/&ntilde;/g, "ñ")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** La nota es una sucesion de <th>rotulo</th><td>valor</td>. Se recogen todos
 *  los pares y luego se pesca por rotulo: asi, si mañana añaden una fila, no se
 *  rompe nada y el campo nuevo queda guardado en `bruto`.
 *
 *  SE RECORREN LAS CELDAS EN ORDEN, y no se busca el par de golpe, por dos
 *  cosas que tiene esta pagina:
 *
 *    - Hay <th> de cabecera de tabla que NO llevan <td> detras ("Estado de
 *      conservacion del edificio"). Buscando el par de una vez, la expresion
 *      saltaba por encima de ese <th> y se tragaba el rotulo siguiente, con lo
 *      que la valoracion final se perdia EN SILENCIO.
 *    - Hay un <td> sin cerrar (el de "Deficiencias subsanadas"), asi que no se
 *      puede confiar en encontrar el </td>.
 *
 *  Recorriendo: un <th> deja el rotulo esperando, y el primer <td> que llegue
 *  se lo queda. Un <th> detras de otro simplemente pisa al anterior, que es lo
 *  que hay que hacer con las cabeceras. */
function paresDe(html: string): Record<string, string> {
  const pares: Record<string, string> = {};
  // El \b no es adorno: sin el, <thead> encaja como <th> seguido de "ead".
  const celda = /<(th|td)\b[^>]*>([\s\S]*?)(?=<\/?(?:th|td|tr|table|thead|tbody)\b)/gi;
  let rotulo: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = celda.exec(html)) !== null) {
    const texto = limpiar(m[2]);
    if (m[1].toLowerCase() === "th") {
      rotulo = texto || null;
    } else if (rotulo) {
      if (!(rotulo in pares)) pares[rotulo] = texto;
      rotulo = null;
    }
  }
  return pares;
}

const aFecha = (s: string | undefined): string | null => {
  const m = (s ?? "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
const aEntero = (s: string | undefined): number | null => {
  const m = (s ?? "").match(/\d{4}/);
  return m ? Number(m[0]) : null;
};
const aSiNo = (s: string | undefined): boolean | null => {
  const t = (s ?? "").trim().toLowerCase();
  if (t === "si" || t === "sí") return true;
  if (t === "no") return false;
  return null;
};

/** Lee la nota informativa de un numero de registro. Devuelve null si ese
 *  numero todavia no existe, que es como el barrido sabe que ha llegado al
 *  final de lo publicado. */
export async function leerNota(codigo: string): Promise<NotaIEE | null> {
  const r = await fetch(`${RAIZ}/${encodeURIComponent(codigo)}`, {
    headers: { "X-Requested-With": "XMLHttpRequest", "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });
  if (!r.ok) return null;

  const html = decodificar(await r.arrayBuffer());
  const p = paresDe(html);

  // Sin numero de registro no hay informe: ese codigo aun no se ha emitido.
  if (!p["Número de registro"]) return null;

  // "CALLE GENERAL RICARDOS, 3 — 28019 MADRID": delante la via, detras el CP y
  // el municipio. A veces detras no viene nada.
  const entera = p["Dirección"] ?? "";
  const [izq, der] = entera.split("—").map((x) => x.trim());
  const mCp = (der ?? "").match(/\b(\d{5})\b/);

  const ref = (p["Referencia catastral"] ?? "").replace(/\s/g, "").toUpperCase() || null;

  return {
    codigo: p["Número de registro"],
    referencia: ref,
    referenciaParcela: ref ? ref.slice(0, 14) : null,
    direccion: izq || null,
    municipio: (der ?? "").replace(/\b\d{5}\b/, "").trim() || null,
    cp: mCp ? mCp[1] : null,
    anioConstruccion: aEntero(p["Año de construcción"]),
    anioRehabilitacion: aEntero(p["Año de rehabilitación"]),
    fechaEmision: aFecha(p["Fecha emisión informe"]),
    valoracion: p["Valoración final"] || null,
    deficienciasSubsanadas: p["Deficiencias subsanadas"] || null,
    fechaSubsanacion: aFecha(p["Fecha"]),
    accesibilidadSatisface: aSiNo(p["El edificio satisface completamente las condiciones de accesibilidad"]),
    accesibilidadAjustes: aSiNo(p["El edificio es susceptible de realizar ajustes razonables"]),
    calificacionEnergetica: p["Calificación de eficiencia energética"] || null,
    estadoExpediente: p["Estado"] || null,
    validez: p["Validez"] || null,
    bruto: p,
  };
}

const esDesfavorable = (n: NotaIEE) => (n.valoracion ?? "").toLowerCase().startsWith("desfavorable");

async function desdeDondeSeguir(): Promise<number> {
  const r = await fetch(`${URL_BASE}/rest/v1/barrido_iee?select=ultimo_codigo&order=ultimo_codigo.desc&limit=1`, {
    headers: cab, cache: "no-store",
  });
  const filas = r.ok ? await r.json() : [];
  // 33558 era el ultimo emitido el 29-09-2026, cuando se monto esto. Es la
  // marca de salida: de aqui hacia delante, nunca hacia atras.
  return filas[0]?.ultimo_codigo ?? 33558;
}

/** A quien se avisa. NO va por nombre a proposito: va por FUNCION, y por la
 *  CLAVE de la funcion, no por su nombre, que se puede reescribir. Hoy la lleva
 *  Alejandra; el dia que la lleve otra persona esto sigue funcionando sin tocar
 *  una linea. `hasta is null` = el cargo sigue vigente. */
const FUNCION_QUE_REPARTE = "supervision_comercial";

async function aQuienSeAvisa(): Promise<string[]> {
  const r = await fetch(
    `${URL_BASE}/rest/v1/equipo_funciones` +
      `?select=equipo_id,funciones!inner(clave),equipo!inner(activo)` +
      `&funciones.clave=eq.${FUNCION_QUE_REPARTE}` +
      `&equipo.activo=is.true&hasta=is.null`,
    { headers: cab, cache: "no-store" },
  );
  if (!r.ok) return [];
  const filas = (await r.json()) as { equipo_id: string }[];
  return Array.from(new Set(filas.map((f) => f.equipo_id)));
}

/** Cuantas desfavorables siguen sin repartir, de cualquier dia. Es lo que
 *  convierte el aviso en un recordatorio: mientras quede una, vuelve a sonar. */
async function cuantasSinAsignar(): Promise<number> {
  const r = await fetch(
    `${URL_BASE}/rest/v1/iee_registrado?select=codigo&estado=eq.nueva&limit=1`,
    { headers: { ...cab, Prefer: "count=exact", Range: "0-0" }, cache: "no-store" },
  );
  if (!r.ok) return 0;
  // PostgREST devuelve el total en Content-Range: "0-0/7".
  const total = (r.headers.get("content-range") ?? "").split("/")[1];
  return Number(total) || 0;
}

export type ResultadoBarrido = {
  desde: number;
  hasta: number;
  encontrados: number;
  desfavorables: number;
  huecos: number;
  segundos: number;
  avisados: number;
  pendientes: number;
  falloAviso: string | null;
  nuevas: { codigo: string; direccion: string | null; valoracion: string | null }[];
};

/** Tantea hacia delante hasta encadenar `huecosParaParar` numeros que no
 *  existen: ahi se acaba lo publicado. El tope es por seguridad, para que una
 *  pasada nunca se eternice. */
export async function barrer({
  maximo = 60,
  huecosParaParar = 8,
  pausaMs = 250,
}: { maximo?: number; huecosParaParar?: number; pausaMs?: number } = {}): Promise<ResultadoBarrido> {
  const t0 = Date.now();
  const desde = await desdeDondeSeguir();
  let n = desde;
  let huecos = 0;
  let encontrados = 0;
  let desfavorables = 0;
  let ultimoBueno = desde;
  const nuevas: ResultadoBarrido["nuevas"] = [];
  const avisar: NotaIEE[] = [];

  while (n - desde < maximo && huecos < huecosParaParar) {
    n += 1;
    const nota = await leerNota(codigoDe(n));
    // Ir despacio es obligatorio: es un registro publico y pequeño, y si lo
    // aporreamos nos corta, como nos paso con Catastro.
    if (pausaMs) await new Promise((r) => setTimeout(r, pausaMs));

    if (!nota) { huecos += 1; continue; }

    huecos = 0;
    ultimoBueno = n;
    encontrados += 1;
    const malo = esDesfavorable(nota);
    if (malo) desfavorables += 1;

    await fetch(`${URL_BASE}/rest/v1/iee_registrado?on_conflict=codigo`, {
      method: "POST",
      headers: { ...cabJson, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        codigo: nota.codigo,
        referencia: nota.referencia,
        referencia_parcela: nota.referenciaParcela,
        direccion: nota.direccion,
        municipio: nota.municipio,
        cp: nota.cp,
        anio_construccion: nota.anioConstruccion,
        anio_rehabilitacion: nota.anioRehabilitacion,
        fecha_emision: nota.fechaEmision,
        valoracion: nota.valoracion,
        deficiencias_subsanadas: nota.deficienciasSubsanadas,
        fecha_subsanacion: nota.fechaSubsanacion,
        accesibilidad_satisface: nota.accesibilidadSatisface,
        accesibilidad_ajustes: nota.accesibilidadAjustes,
        calificacion_energetica: nota.calificacionEnergetica,
        estado_expediente: nota.estadoExpediente,
        validez: nota.validez,
        bruto: nota.bruto,
        // Una favorable se guarda, pero no se reparte a nadie.
        estado: malo ? "nueva" : "sin_interes",
      }),
    });

    nuevas.push({ codigo: nota.codigo, direccion: nota.direccion, valoracion: nota.valoracion });
    if (malo) avisar.push(nota);
  }

  // EL AVISO: UNO AL DIA, Y SOLO SI HAY ALGO QUE HACER (Monica).
  //
  //   "A Alejandra deberia llegarle una alerta solo cuando hay IEE desfavorable
  //    en esa barrida diaria: 'tienes IEE para asignar'."
  //   "Ella puede entrar en la pagina a ver, pero si se olvida, que algo se lo
  //    recuerde."
  //
  // Las dos frases juntas dan la regla: no una linea por informe, sino UN toque
  // al dia; y no solo el dia que aparecen, sino MIENTRAS SIGA HABIENDO ALGO SIN
  // ASIGNAR. Un aviso que suena una vez y se calla no es un recordatorio: es una
  // notificacion que se pierde. Los dias sin nada pendiente, silencio.
  //
  // VA APARTE Y NO PUEDE TUMBAR EL BARRIDO: lo importante es que la IEE quede
  // guardada. Si el aviso falla se dice en el resultado, pero no se pierde el
  // hallazgo, que es lo unico que no se puede recuperar: esto solo va hacia
  // delante.
  let avisados = 0;
  let pendientes = 0;
  let falloAviso: string | null = null;
  try {
    pendientes = await cuantasSinAsignar();
  } catch {
    pendientes = avisar.length;
  }

  if (pendientes > 0) {
    try {
      const para = await aQuienSeAvisa();
      if (para.length) {
        const nuevasHoy = avisar.length;
        const cabeza =
          nuevasHoy > 0
            ? `${nuevasHoy === 1 ? "1 IEE desfavorable nueva" : `${nuevasHoy} IEE desfavorables nuevas`} para asignar`
            : `Sigues teniendo ${pendientes === 1 ? "1 IEE desfavorable" : `${pendientes} IEE desfavorables`} sin asignar`;
        // Cuando hay nuevas, van sus direcciones: asi se sabe de que va sin
        // abrir nada. Y si ademas quedan viejas, se dice cuantas.
        const cola =
          nuevasHoy > 0
            ? `: ${avisar.map((n) => n.direccion ?? "sin direccion").join(" · ")}.` +
              (pendientes > nuevasHoy ? ` Quedan ${pendientes} sin asignar en total.` : "")
            : ".";

        const ra = await fetch(`${URL_BASE}/rest/v1/avisos`, {
          method: "POST",
          headers: { ...cabJson, Prefer: "return=minimal" },
          body: JSON.stringify(
            para.map((id) => ({
              para_id: id,
              motivo: "alerta_iee",
              texto: cabeza + cola,
              enlace: "/comercial/alertas-iee",
            })),
          ),
        });
        if (!ra.ok) falloAviso = `avisos: ${ra.status} ${(await ra.text()).slice(0, 200)}`;
        else avisados = para.length;
      } else {
        falloAviso = "no hay nadie activo con la funcion supervision_comercial";
      }
    } catch (e) {
      falloAviso = e instanceof Error ? e.message : String(e);
    }
  }

  const segundos = Math.round((Date.now() - t0) / 100) / 10;

  await fetch(`${URL_BASE}/rest/v1/barrido_iee`, {
    method: "POST",
    headers: { ...cabJson, Prefer: "return=minimal" },
    body: JSON.stringify({
      desde_codigo: desde,
      ultimo_codigo: ultimoBueno,
      encontrados,
      desfavorables,
      huecos,
      segundos,
      fallo: falloAviso,
    }),
  });

  return { desde, hasta: ultimoBueno, encontrados, desfavorables, huecos, segundos, avisados, pendientes, falloAviso, nuevas };
}
