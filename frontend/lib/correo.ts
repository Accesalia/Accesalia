import "server-only";
import nodemailer from "nodemailer";

// ENVIAR UN CORREO DESDE LA APP.
//
// Primera pieza de envio que tiene la app: hasta ahora solo sabia LEER un buzon
// (el del Polycam, por IMAP). Va por la misma via que acordo Monica para los
// buzones funcionales: cuenta de Gmail con CONTRASEÑA DE APLICACION -los 16
// caracteres-, nunca la contraseña de la cuenta.
//
// Las credenciales viven SOLO en las variables de entorno de Vercel. Si no
// estan puestas, esto no revienta ni se lo calla: devuelve "no configurado", y
// quien llame se encarga de que eso se vea en pantalla. Un correo que no sale
// en silencio es peor que un correo que no sale.

const USUARIO = process.env.CORREO_SALIENTE_USUARIO ?? "";
const CLAVE = process.env.CORREO_SALIENTE_CLAVE ?? "";
const NOMBRE = process.env.CORREO_SALIENTE_NOMBRE ?? "Accesalia";

export const correoConfigurado = () => Boolean(USUARIO && CLAVE);

export type Enviado = { ok: boolean; dice?: string };

export async function enviarCorreo({
  para,
  asunto,
  texto,
  html,
}: {
  para: string;
  asunto: string;
  texto: string;
  html?: string;
}): Promise<Enviado> {
  if (!correoConfigurado())
    return { ok: false, dice: "el correo saliente no esta configurado (faltan CORREO_SALIENTE_USUARIO y CORREO_SALIENTE_CLAVE)" };
  if (!para) return { ok: false, dice: "no hay direccion a la que escribir" };

  try {
    const transporte = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: USUARIO, pass: CLAVE },
    });
    await transporte.sendMail({
      from: `"${NOMBRE}" <${USUARIO}>`,
      to: para,
      subject: asunto,
      text: texto,
      html,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, dice: e instanceof Error ? e.message : String(e) };
  }
}
