import "server-only";
import nodemailer from "nodemailer";

// ENVIAR UN CORREO DESDE LA APP.
//
// UN BUZON POR AREA, NINGUNO DE UNA PERSONA. El criterio completo, con el porque
// de cada decision, esta en docs/correos.md: leerlo antes de tocar esto.
//
// Cada area tiene su buzon <area>.accesalia@gmail.com y su contraseña de
// aplicacion en Vercel, en GMAIL_<AREA>. La direccion NO es secreta -la sabe
// cualquiera- y va escrita aqui, a la vista, para no tener que entrar en ningun
// panel para leerla o corregirla. Secreta es solo la clave.
//
// Una llave sin puerta no abre nada: las seis claves llevaban en Vercel desde el
// 25-sep-2026 sin servir de nada, porque nadie le habia dicho a la app que buzon
// abria cada una. Eso es lo que arregla este fichero.
//
// PARA AÑADIR UN AREA: una linea en BUZONES y otra en CLAVES. Nada mas.

export type Area =
  | "comercial"
  | "oficina"
  | "obras"
  | "subvenciones"
  | "gerencia"
  | "facturacion"
  | "tecnicos"
  | "licencias"
  | "daniel";

// El nombre es lo que lee en su bandeja quien recibe el correo, antes de abrirlo.
// Son de Monica: cambiarlos aqui cuando ella lo diga y no darle mas vueltas.
const BUZONES: Record<Area, { direccion: string; nombre: string }> = {
  comercial: { direccion: "comercial.accesalia@gmail.com", nombre: "Accesalia · Comercial" },
  oficina: { direccion: "oficina.accesalia@gmail.com", nombre: "Accesalia · Oficina" },
  obras: { direccion: "obras.accesalia@gmail.com", nombre: "Accesalia · Obras" },
  subvenciones: { direccion: "subvenciones.accesalia@gmail.com", nombre: "Accesalia · Subvenciones" },
  gerencia: { direccion: "gerencia.accesalia@gmail.com", nombre: "Accesalia · Gerencia" },
  facturacion: { direccion: "facturacion.accesalia@gmail.com", nombre: "Accesalia · Facturación" },
  tecnicos: { direccion: "tecnicos.accesalia@gmail.com", nombre: "Accesalia · Técnicos" },
  licencias: { direccion: "licencias.accesalia@gmail.com", nombre: "Accesalia · Licencias" },
  // No es el correo de trabajo de Daniel: se creo para el CRM, es funcional
  // como los demas. Lo usa la agenda.
  daniel: { direccion: "daniel.accesalia@gmail.com", nombre: "Accesalia · Daniel" },
};

// Una a una y por su nombre, no con `process.env[variable]`: asi se ve de un
// vistazo que variable hace falta para cada area, y no depende de que el
// empaquetado sepa resolver un nombre calculado.
//
// facturacion, tecnicos y licencias son de hoy (30-sep): sus claves puede que todavia no
// esten en Vercel. No pasa nada -el area se queda "sin configurar" y se dice en
// pantalla-, pero el nombre de la variable tiene que ser EXACTAMENTE el de aqui.
const CLAVES: Record<Area, string | undefined> = {
  comercial: process.env.GMAIL_COMERCIAL,
  oficina: process.env.GMAIL_OFICINA,
  obras: process.env.GMAIL_OBRAS,
  subvenciones: process.env.GMAIL_SUBVENCIONES,
  gerencia: process.env.GMAIL_GERENCIA,
  facturacion: process.env.GMAIL_FACTURACION,
  tecnicos: process.env.GMAIL_TECNICOS,
  licencias: process.env.GMAIL_LICENCIAS,
  daniel: process.env.GMAIL_DANIEL,
};

/** Si el buzon de esa area puede mandar hoy. Para poder DECIRLO en pantalla:
 *  un correo que no sale en silencio es peor que un correo que no sale. */
export function buzonListo(area: Area): boolean {
  return Boolean(CLAVES[area]);
}

export function direccionDe(area: Area): string {
  return BUZONES[area].direccion;
}

export type Enviado = { ok: boolean; dice?: string };

export async function enviarCorreo({
  desde,
  para,
  asunto,
  texto,
  html,
  responderA,
}: {
  /** De que AREA sale, que lo decide la tarea y no quien la ejecuta. */
  desde: Area;
  para: string;
  asunto: string;
  texto: string;
  html?: string;
  /** A donde van las respuestas. Normalmente el correo de quien hizo la accion:
   *  le escribe "Accesalia · Comercial" y, si responde, le contesta a ella. Son
   *  dos campos distintos del correo y aqui se ponen distintos a proposito. */
  responderA?: string | null;
}): Promise<Enviado> {
  const buzon = BUZONES[desde];
  const clave = CLAVES[desde];
  if (!clave)
    return {
      ok: false,
      dice: `el buzon de ${desde} no esta configurado (falta su clave en Vercel; ver docs/correos.md)`,
    };
  if (!para) return { ok: false, dice: "no hay direccion a la que escribir" };

  try {
    const transporte = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: buzon.direccion, pass: clave },
    });
    await transporte.sendMail({
      from: `"${buzon.nombre}" <${buzon.direccion}>`,
      to: para,
      replyTo: responderA || undefined,
      subject: asunto,
      text: texto,
      html,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, dice: e instanceof Error ? e.message : String(e) };
  }
}
