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
