// supabase/functions/_shared/bitacora.ts
//
// BITACORA DE IA — escritor compartido por todas las edges que tocan efectos.
// Un evento por fila en `bitacora_ia`. Doble proposito: transparencia en el
// front + sustrato del "deshacer sin dramas".
//
// Adaptado del bitacora.ts de las apps moviles. Diferencias de dominio:
//   · No hay `entrada_id` (nota de voz) ni `user_id` (aun no hay auth). El
//     contexto es una OPERACION (ej. "extraccion_convocatoria:<uuid>") y el
//     actor puede ser la IA, un humano (personal_interno) o el sistema.
//
// CONTRATO (identico al del movil):
//   · Codigo + params, NO prosa: `tipo` es el codigo; `datos` los params. La
//     frase para la usuaria la compone el FRONT desde tipo+datos.
//   · `datos` DEBE llevar el texto exacto afectado (clave para deshacer luego).
//   · Best-effort: un fallo aqui NUNCA tumba el procesado (la bitacora es
//     accesoria, como uso_llm).
//   · Sin `operacion` no se registra nada: la edge llama igual y esto hace no-op
//     (evita filas huerfanas sin contexto de undo).

import { clienteServicio } from "./db.ts";

export type ActorTipo = "ia" | "humano" | "sistema";

export interface Evento {
  /** Contexto para agrupar/deshacer un lote. Sin el, no se registra. */
  operacion: string | null | undefined;
  /** Codigo del evento (ej. extraccion_generada, requisito_editado, casilla_add). */
  tipo: string;
  actor_tipo?: ActorTipo;
  /** personal_interno hoy; auth.users el dia de manana. */
  actor_id?: string | null;
  target_tabla?: string | null;
  target_id?: string | null;
  /** Params + el texto exacto afectado (sustrato del undo). */
  datos?: Record<string, unknown>;
}

export async function registrarEvento(evento: Evento): Promise<void> {
  if (!evento?.operacion) return; // sin operacion -> no hay bitacora que escribir
  try {
    const supabase = clienteServicio();
    const { error } = await supabase.from("bitacora_ia").insert({
      operacion: evento.operacion,
      tipo: evento.tipo,
      actor_tipo: evento.actor_tipo ?? "ia",
      actor_id: evento.actor_id ?? null,
      target_tabla: evento.target_tabla ?? null,
      target_id: evento.target_id ?? null,
      datos: evento.datos ?? {},
    });
    if (error) console.warn(`bitacora_ia (${evento.tipo}) no registrada: ${error.message}`);
  } catch (e) {
    console.warn(`bitacora_ia (${evento.tipo}) excepcion: ${e}`);
  }
}
