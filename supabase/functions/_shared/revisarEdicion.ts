// supabase/functions/_shared/revisarEdicion.ts
//
// DECISOR DE EDICION (transversal, reutilizable por CUALQUIER punto de entrada por
// texto natural, no solo comercial). Dado el texto ANTERIOR y el EDITADO, decide
// con CRITERIO DE ACCESALIA si el cambio es:
//   - COSMETICO -> no se toca lo ya procesado (solo se guarda el texto).
//   - RELEVANTE -> toca datos/entidades -> hay que reprocesar desde cero.
// Idea de la app Dora de Monica. Nivel 'base' (Mistral, UE): barato + RGPD.

import { llamarIA } from "./ia.ts";

const SYS =
  `Eres un revisor de ediciones de Accesalia (arquitectura en Madrid: accesibilidad y eficiencia ` +
  `energetica). Te dan el TEXTO ANTERIOR y el TEXTO EDITADO de una nota ya procesada. UNA sola ` +
  `pregunta: ¿el cambio es RELEVANTE o COSMETICO? Es decir: ¿cambia el SENTIDO de lo dicho de forma ` +
  `que ahora tiene IMPLICACIONES que antes no tenia en este contexto (afecta a los DATOS que se ` +
  `extraen)? -> RELEVANTE. ¿O no cambia el fondo? -> COSMETICO.\n\n` +
  `Es RELEVANTE si toca algo que cambiaria lo extraido: nombres de entidades (comunidad, administrador, ` +
  `contacto), IMPORTES/precios/numeros (¡un 0 de mas o de menos es MUY relevante!), tipos de proyecto ` +
  `(SATE, ascensor, accesibilidad, rampa, cubierta, cota cero...), añadir o quitar un servicio/hecho ` +
  `(ej. "ademas SATE"), condiciones o deseos tecnicos, fechas, o cualquier dato nuevo o eliminado.\n\n` +
  `Es COSMETICO si solo arregla ortografia, acentos, mayusculas, puntuacion, o reescribe SIN cambiar ` +
  `ningun dato.\n\nAnte la duda, RELEVANTE (mejor reprocesar de mas que perder un cambio importante). ` +
  `Devuelve SOLO el JSON {relevante, motivo}; motivo = una frase corta.`;

const ESQUEMA = {
  type: "object",
  additionalProperties: false,
  properties: { relevante: { type: "boolean" }, motivo: { type: "string" } },
  required: ["relevante", "motivo"],
};

export async function revisarEdicion(opts: {
  antes: string;
  despues: string;
  actorId?: string | null;
}): Promise<{ relevante: boolean; motivo: string }> {
  const r = await llamarIA({
    nivel: "ligero", // juicio binario trivial: no necesita el Large
    system: SYS,
    prompt: `TEXTO ANTERIOR:\n"""\n${opts.antes}\n"""\n\nTEXTO EDITADO:\n"""\n${opts.despues}\n"""\n\n¿El cambio es relevante para los datos extraidos?`,
    esquemaJson: ESQUEMA,
    maxTokens: 300,
    origen: "revisar-edicion",
    actorId: opts.actorId ?? null,
  });
  const j = r.json as { relevante?: boolean; motivo?: string } | null;
  // Ante fallo de parseo -> RELEVANTE por seguridad (se reprocesa).
  if (!j || typeof j.relevante !== "boolean") {
    return { relevante: true, motivo: "No se pudo evaluar el cambio; se reprocesa por seguridad." };
  }
  return { relevante: j.relevante, motivo: j.motivo ?? "" };
}
