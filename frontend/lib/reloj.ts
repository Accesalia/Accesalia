// QUIEN LLAMA ES EL RELOJ DE VERCEL?
//
// El reloj no tiene navegador: llega sin cookie de sesion. Con el login
// obligatorio encendido, el middleware lo mandaba a /entrar con un 307 y la
// ruta no se ejecutaba NUNCA. No daba error: simplemente no entraba nadie.
// Se descubrio el 30-sep-2026 leyendo los logs: tres pasadas de polycam
// puntuales, las tres con `source: edge-middleware` y `307`.
//
// Asi que el reloj tiene que poder identificarse, y de dos maneras:
//
// 1. CRON_SECRET (la buena). Si esa variable existe en Vercel, Vercel manda en
//    cada pasada la cabecera `Authorization: Bearer <ese secreto>`. Nadie de
//    fuera lo sabe, asi que es imposible de falsificar.
// 2. La cabecera `x-vercel-cron`, que la plataforma pone y borra de las
//    peticiones de fuera. Solo se acepta MIENTRAS no haya secreto, para que
//    los relojes no se queden muertos esperando a que se configure. En cuanto
//    hay secreto, este camino se cierra.

export function esElReloj(req: Request): boolean {
  const secreto = process.env.CRON_SECRET;
  if (secreto) return req.headers.get("authorization") === `Bearer ${secreto}`;
  return !!req.headers.get("x-vercel-cron");
}

// Para poder CONTARLO en una pantalla sin destripar el secreto.
export function comoSeIdentificaElReloj(): "secreto" | "cabecera" {
  return process.env.CRON_SECRET ? "secreto" : "cabecera";
}

// DEJAR CONSTANCIA DE LA PASADA.
//
// Una tabla que nadie rellena es peor que no tenerla, asi que esto lo llaman las
// tres rutas de reloj. Y nunca tumba el trabajo: si apuntar la pasada falla, el
// trabajo ya esta hecho y lo que se pierde es la anotacion, no la faena.

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

export async function apuntarPasada(p: {
  tarea: string;
  empezada: number;
  ok: boolean;
  dice?: string | null;
  detalle?: unknown;
  quien: "reloj" | "persona";
}): Promise<void> {
  if (!URL_BASE || !SECRETO) return;
  try {
    await fetch(`${URL_BASE}/rest/v1/pasada_reloj`, {
      method: "POST",
      headers: {
        apikey: SECRETO,
        Authorization: `Bearer ${SECRETO}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        tarea: p.tarea,
        empezada_en: new Date(p.empezada).toISOString(),
        acabada_en: new Date().toISOString(),
        ms: Date.now() - p.empezada,
        ok: p.ok,
        dice: p.dice ?? null,
        detalle: p.detalle ?? null,
        quien: p.quien,
      }),
      cache: "no-store",
    });
  } catch {
    // A proposito en silencio: ver arriba.
  }
}

// ============================================================================
// LEER LO APUNTADO. Para la pantalla de control de /relojes.
// ============================================================================

export type Reloj = { tarea: string; nombre: string; cada: string; ruta: string };

// LOS RELOJES SE DECLARAN AQUI, no se deducen de lo apuntado. La diferencia
// importa: un reloj que NUNCA ha corrido no tiene ni una linea en la tabla, y si
// la pantalla se hiciera solo con lo apuntado, ese reloj -el unico que de verdad
// esta roto- seria el unico que no saldria. Es exactamente lo que paso el
// 29-sep: tres relojes muertos y ninguna señal.
export const RELOJES: Reloj[] = [
  { tarea: "buzon_polycam", nombre: "Buzón del Polycam", cada: "cada 10 minutos", ruta: "/api/buzon/polycam" },
  // A LAS 5 DE LA MADRUGADA, por encargo de Monica (2-oct-2026): "Accesalia
  // abre a las 7, asi cuando entre por la mañana Alejandra, esta listo".
  //
  // En vercel.json pone 3:00, y no es un despiste: los horarios de Vercel son
  // en UTC y no admiten zona horaria. 3:00 UTC son las 5:00 en Madrid con
  // horario de verano y las 4:00 en invierno. Se eligio la hora que cumple SU
  // condicion todo el año -antes de las 7, siempre- en vez de clavar las 5:00
  // la mitad del año y quedarse en las 6:00 la otra mitad.
  { tarea: "iee_barrido", nombre: "Barrido de IEE", cada: "todos los días a las 5 de la madrugada", ruta: "/api/iee/barrido" },
];

// ============================================================================
// LOS RETIRADOS: tareas que ACABARON y ya no tienen horario.
// ============================================================================
//
// Criterio de Monica (1-oct-2026), y es el bueno: un reloj dormido es peor que
// no tenerlo. "No siempre nos daremos cuenta de que existen, si no los buscamos
// expresamente, y quitarlos / ponerlos parece bastante trivial: creo que sera
// mas facil ponerlos desde cero mas adelante que recuperarlos".
//
// Asi que el HORARIO se borra de vercel.json y la tarea baja aqui. Lo que NO se
// borra nunca es la RUTA ni su codigo: ahi vive el trabajo de verdad (el cotejo
// del callejero por conjunto de palabras, las abreviaturas, el BIS -> (B)...),
// y eso si seria costoso de rehacer. Sin horario la ruta sigue viva y se lanza
// a mano añadiendole ?hacer=1 a la direccion.
//
// Esta lista hace dos cosas: deja constancia de que existieron (es la respuesta
// a "documentemos que estan ahi") y da nombre a sus pasadas antiguas en el
// historial de /relojes, que si no saldrian con el nombre tecnico a secas.
//
// Para volver a encender cualquiera: una entrada en frontend/vercel.json con su
// ruta y un horario de cron. Nada mas.

export type Retirado = Reloj & { porque: string };

export const RETIRADOS: Retirado[] = [
  // ESTE NO ACABO: ESTA PARADO. Es la unica entrada de esta lista que no
  // termino su trabajo, y se dice aqui para que nadie lo lea como hecho.
  {
    tarea: "iee_direcciones",
    nombre: "IEE de nuestras direcciones",
    cada: "PARADO el 2-oct-2026 · no acabó",
    ruta: "/api/iee/direcciones",
    porque:
      "PARADO POR UN BUCLE, no por haber acabado. Se acuerda de por qué MUNICIPIO seguir, " +
      "pero no de por qué CALLE: Madrid tiene 422 calles con IEE y no cabe en los 240 " +
      "segundos de una tanda, así que se cortaba a media faena, apuntaba 'sigo por MADRID' " +
      "y la pasada siguiente empezaba Madrid otra vez desde el principio. Estuvo tres horas " +
      "repreguntando las mismas 420 calles cada cuarto de hora, sin pasar nunca a Leganés, " +
      "Alcorcón ni Móstoles. Monica lo mandó parar el 2-oct a mediodía, y bien mandado: " +
      "machacar un registro público pequeño es la manera de que nos corten. " +
      "QUEDA PENDIENTE: que recuerde la calle además del municipio, y entonces se vuelve a " +
      "programar. Lo ya guardado es bueno y no se repite: las notas se guardan por número " +
      "de registro.",
  },
  {
    tarea: "comunidades_catastro",
    nombre: "Rellenar Catastro",
    cada: "retirado · acabó el 30-sep-2026",
    ruta: "/api/comunidades/catastro",
    porque: "Escribió la referencia catastral, el CP y las coordenadas de las 1.218 comunidades que se pudieron cotejar. No quedan pendientes.",
  },
  {
    tarea: "callejero_catastro",
    nombre: "Callejero oficial",
    cada: "retirado · acabó el 1-oct-2026",
    ruta: "/api/callejero/cargar",
    porque: "Bajó las 71.802 vías de los 185 municipios de Madrid. El refresco debe ir donde se usa (la pantalla de alta, cuando una calle no aparezca), no en un horario.",
  },
  {
    tarea: "fichas_catastro",
    nombre: "Fichas de Catastro",
    cada: "retirado · acabó el 1-oct-2026",
    ruta: "/api/catastro/fichas",
    porque: "Bajó la ficha de los 1.244 accesos: 1.184 parcelas, 2.524 portales y 46.456 inmuebles. Para comunidades nuevas se lanza a mano con ?hacer=1.",
  },
];

export type Pasada = {
  id: number;
  tarea: string;
  empezada_en: string;
  ms: number | null;
  ok: boolean | null;
  dice: string | null;
  quien: string;
};

export async function ultimasPasadas(cuantas = 60): Promise<Pasada[]> {
  if (!URL_BASE || !SECRETO) return [];
  const r = await fetch(
    `${URL_BASE}/rest/v1/pasada_reloj` +
      `?select=id,tarea,empezada_en,ms,ok,dice,quien&order=empezada_en.desc&limit=${cuantas}`,
    { headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` }, cache: "no-store" },
  );
  if (!r.ok) return [];
  return (await r.json()) as Pasada[];
}

/** La ultima de cada reloj, para la foto de arriba. Se pide una a una y no de
 *  golpe: con un solo `limit` alto, un reloj que corre cada 5 minutos tapa al
 *  que corre una vez al dia y ese se queda sin ultima pasada. */
export async function ultimaDeCadaReloj(): Promise<Record<string, Pasada | undefined>> {
  const salida: Record<string, Pasada | undefined> = {};
  if (!URL_BASE || !SECRETO) return salida;
  await Promise.all(
    RELOJES.map(async ({ tarea }) => {
      const r = await fetch(
        `${URL_BASE}/rest/v1/pasada_reloj` +
          `?select=id,tarea,empezada_en,ms,ok,dice,quien&tarea=eq.${tarea}` +
          `&order=empezada_en.desc&limit=1`,
        { headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` }, cache: "no-store" },
      );
      if (!r.ok) return;
      const [p] = (await r.json()) as Pasada[];
      salida[tarea] = p;
    }),
  );
  return salida;
}
