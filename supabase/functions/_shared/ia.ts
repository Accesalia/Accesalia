// supabase/functions/_shared/ia.ts
//
// CLIENTE IA COMPARTIDO — multi-proveedor, por NIVELES.
//
// Hereda el patron de las apps moviles (deepseek.ts): un solo sitio con las
// keys, backoff ante 429, y contabilidad en uso_llm best-effort. Lo generaliza
// a dos naturalezas de API distintas detras de una interfaz unica:
//
//   NIVEL 'alto'   -> Anthropic (Claude Opus 4.8): fiabilidad, PDF nativo,
//                     JSON garantizado por esquema. Para lo que importa.
//   NIVEL 'base'   -> Mistral Large (UE): solvente y economico. Extraccion/
//                     resumenes con matiz. (No procesa datos personales fuera UE.)
//   NIVEL 'ligero' -> Mistral Small (UE): barato y RAPIDO. Para juicios triviales
//                     (clasificar, decidir relevante/cosmetico): no necesitan el Large.
//
// Cada edge declara su nivel. Para cambiar de modelo en el futuro: editar SOLO
// el mapa NIVELES de abajo.
//
// CONTRATO:
//   · llamarIA({ nivel, ... }) devuelve { contenido, json?, usage, stopReason }.
//   · Si se pasa `esquemaJson`, el proveedor DEVUELVE JSON valido por
//     construccion (Anthropic: output_config.format; Mistral: response_format).
//     Se parsea y se entrega en `json`. El try/catch queda como red.
//   · Si se pasan `documentos` (PDF base64), solo el nivel 'alto' (Anthropic)
//     los procesa de forma nativa. Con Mistral se lanza error explicito.
//   · Contabilidad: si se pasa `origen`, se registra una fila en uso_llm.
//     Best-effort: un fallo aqui NUNCA tumba la llamada (la usuaria ya tiene su
//     resultado; la contabilidad es accesoria).

import { clienteServicio } from "./db.ts";

// =============================================================================
// Configuracion de niveles. EDITAR SOLO AQUI para cambiar modelo/version.
// =============================================================================
export type Nivel = "alto" | "base" | "ligero";
export type Proveedor = "anthropic" | "mistral";

interface ConfigNivel {
  proveedor: Proveedor;
  modelo: string;
}

export const NIVELES: Record<Nivel, ConfigNivel> = {
  // Claude Opus 4.8: 1M de contexto, PDF nativo, structured outputs.
  alto: { proveedor: "anthropic", modelo: "claude-opus-4-8" },
  // Mistral Large 3 (dic-2025), snapshot explicito para que el precio no cambie
  // solo si el alias salta de version.
  base: { proveedor: "mistral", modelo: "mistral-large-2512" },
  // Mistral Small (UE): ~una fraccion del coste del Large, mas rapido. Para juicios
  // triviales. Alias por ahora; se puede pinar a un snapshot cuando se confirme.
  ligero: { proveedor: "mistral", modelo: "mistral-small-latest" },
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";

// =============================================================================
// Tipos publicos
// =============================================================================
export interface DocumentoPDF {
  /** PDF en base64 SIN saltos de linea, sin el prefijo data:. */
  base64: string;
  /** Nombre/titulo opcional (ayuda al modelo). */
  titulo?: string;
}

export type Mensaje = { role: "user" | "assistant"; content: string };

export interface OpcionesIA {
  nivel: Nivel;
  /** Instruccion de sistema. */
  system?: string;
  /** Atajo: un unico mensaje de usuario. Alternativa a `mensajes`. */
  prompt?: string;
  /** Historial de mensajes ya construido. */
  mensajes?: Mensaje[];
  /** PDFs a adjuntar (solo nivel 'alto'/Anthropic los procesa de forma nativa). */
  documentos?: DocumentoPDF[];
  /** JSON Schema: si se pasa, la respuesta se fuerza a ese esquema. */
  esquemaJson?: Record<string, unknown>;
  /** Tope de tokens de salida. Default 16000. */
  maxTokens?: number;
  /** Esfuerzo/profundidad (solo Anthropic): low|medium|high|xhigh|max. Default 'high'. */
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  /** Pensamiento adaptativo como borrador (solo Anthropic). Default true en 'alto'. */
  pensar?: boolean;
  // --- Contabilidad (uso_llm) ---
  /** Nombre de la edge que llama. Si se pasa, se registra en uso_llm. */
  origen?: string;
  /** Actor que dispara la llamada (personal_interno). Opcional. */
  actorId?: string | null;
}

export interface UsoNormalizado {
  input_tokens: number;
  output_tokens: number;
  cache_creacion_tokens: number;
  cache_lectura_tokens: number;
}

export interface RespuestaIA {
  contenido: string;
  /** Si se pidio esquemaJson y se pudo parsear, el objeto ya parseado. */
  json?: unknown;
  usage: UsoNormalizado;
  proveedor: Proveedor;
  modelo: string;
  nivel: Nivel;
  /** Motivo de parada del modelo (para detectar truncado/refusal). */
  stopReason?: string;
}

// =============================================================================
// Backoff ante 429 (rate limit). Devuelve la Response con el body SIN consumir.
// =============================================================================
async function fetchConBackoff(url: string, init: RequestInit, maxIntentos = 3): Promise<Response> {
  let esperaMs = 1000;
  for (let intento = 1; ; intento++) {
    const resp = await fetch(url, init);
    if (resp.status !== 429 || intento >= maxIntentos) return resp;
    const retryAfter = Number(resp.headers.get("retry-after"));
    const espera = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : esperaMs;
    console.warn(`IA 429 (intento ${intento}/${maxIntentos}), reintento en ${espera}ms`);
    await resp.body?.cancel().catch(() => {});
    await new Promise((r) => setTimeout(r, espera));
    esperaMs *= 2;
  }
}

// =============================================================================
// Punto de entrada unico
// =============================================================================
export async function llamarIA(opts: OpcionesIA): Promise<RespuestaIA> {
  const cfg = NIVELES[opts.nivel];
  const respuesta = cfg.proveedor === "anthropic"
    ? await llamarAnthropic(opts, cfg.modelo)
    : await llamarMistral(opts, cfg.modelo);

  // Parseo del JSON si se pidio esquema (red ante fallos del proveedor).
  if (opts.esquemaJson) {
    try {
      respuesta.json = JSON.parse(respuesta.contenido);
    } catch (e) {
      console.warn(`IA: no se pudo parsear JSON (${opts.origen ?? "?"}): ${e}`);
    }
  }

  // Contabilidad best-effort.
  if (opts.origen) {
    await registrarUso({
      origen: opts.origen,
      proveedor: respuesta.proveedor,
      modelo: respuesta.modelo,
      nivel: respuesta.nivel,
      actorId: opts.actorId ?? null,
      usage: respuesta.usage,
    });
  }

  return respuesta;
}

// =============================================================================
// Adaptador Anthropic (Messages API)
// =============================================================================
async function llamarAnthropic(opts: OpcionesIA, modelo: string): Promise<RespuestaIA> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY no configurado");

  // Construir el primer mensaje de usuario: documentos (PDF) + texto.
  const primerTexto = opts.prompt ?? opts.mensajes?.[0]?.content ?? "";
  const bloques: unknown[] = [];
  for (const doc of opts.documentos ?? []) {
    bloques.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: doc.base64 },
      ...(doc.titulo ? { title: doc.titulo } : {}),
    });
  }
  bloques.push({ type: "text", text: primerTexto });

  const mensajes: unknown[] = [{ role: "user", content: bloques }];
  // Mensajes adicionales (assistant/user) mas alla del primero, si los hay.
  for (const m of (opts.mensajes ?? []).slice(1)) {
    mensajes.push({ role: m.role, content: m.content });
  }

  const outputConfig: Record<string, unknown> = { effort: opts.effort ?? "high" };
  if (opts.esquemaJson) {
    outputConfig.format = { type: "json_schema", schema: opts.esquemaJson };
  }

  const body: Record<string, unknown> = {
    model: modelo,
    max_tokens: opts.maxTokens ?? 16000,
    output_config: outputConfig,
    messages: mensajes,
  };
  if (opts.system) body.system = opts.system;
  if (opts.pensar ?? true) body.thinking = { type: "adaptive" };

  const resp = await fetchConBackoff(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => "(sin cuerpo)");
    throw new Error(`Anthropic HTTP ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  if (data.stop_reason === "refusal") {
    throw new Error(`Anthropic rechazo la peticion (refusal): ${JSON.stringify(data.stop_details ?? {})}`);
  }
  // El texto es el primer (y con output_config.format, unico) bloque de texto.
  const contenido: string = (data.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");
  if (!contenido.trim()) {
    throw new Error("Anthropic devolvio contenido vacio");
  }

  const u = data.usage ?? {};
  return {
    contenido,
    usage: {
      input_tokens: u.input_tokens ?? 0,
      output_tokens: u.output_tokens ?? 0,
      cache_creacion_tokens: u.cache_creation_input_tokens ?? 0,
      cache_lectura_tokens: u.cache_read_input_tokens ?? 0,
    },
    proveedor: "anthropic",
    modelo,
    nivel: opts.nivel,
    stopReason: data.stop_reason,
  };
}

// =============================================================================
// Adaptador Mistral (chat/completions, formato OpenAI)
// =============================================================================
async function llamarMistral(opts: OpcionesIA, modelo: string): Promise<RespuestaIA> {
  const apiKey = Deno.env.get("MISTRAL_API_KEY");
  if (!apiKey) throw new Error("MISTRAL_API_KEY no configurado");
  if (opts.documentos?.length) {
    throw new Error("El nivel 'base' (Mistral) no procesa PDF nativo. Usa nivel 'alto' para documentos.");
  }

  const mensajes: unknown[] = [];
  if (opts.system) mensajes.push({ role: "system", content: opts.system });
  if (opts.mensajes?.length) {
    for (const m of opts.mensajes) mensajes.push({ role: m.role, content: m.content });
  } else {
    mensajes.push({ role: "user", content: opts.prompt ?? "" });
  }

  const body: Record<string, unknown> = {
    model: modelo,
    max_tokens: opts.maxTokens ?? 16000,
    messages: mensajes,
  };
  // Mistral no valida contra un JSON Schema, pero garantiza JSON valido.
  if (opts.esquemaJson) body.response_format = { type: "json_object" };

  const resp = await fetchConBackoff(MISTRAL_URL, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => "(sin cuerpo)");
    throw new Error(`Mistral HTTP ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  if (data.error) throw new Error(`Mistral API error: ${data.error.message}`);
  const contenido: string = data.choices?.[0]?.message?.content ?? "";
  if (!contenido.trim()) throw new Error("Mistral devolvio contenido vacio");

  const u = data.usage ?? {};
  const promptTokens = u.prompt_tokens ?? 0;
  const cacheHit = u.prompt_tokens_details?.cached_tokens ?? 0;
  return {
    contenido,
    usage: {
      input_tokens: promptTokens - cacheHit,
      output_tokens: u.completion_tokens ?? 0,
      cache_creacion_tokens: 0,
      cache_lectura_tokens: cacheHit,
    },
    proveedor: "mistral",
    modelo,
    nivel: opts.nivel,
    stopReason: data.choices?.[0]?.finish_reason,
  };
}

// =============================================================================
// Contabilidad (uso_llm) — best-effort
// =============================================================================
async function registrarUso(datos: {
  origen: string;
  proveedor: Proveedor;
  modelo: string;
  nivel: Nivel;
  actorId: string | null;
  usage: UsoNormalizado;
}): Promise<void> {
  try {
    const supabase = clienteServicio();
    await supabase.from("uso_llm").insert({
      origen: datos.origen,
      proveedor: datos.proveedor,
      modelo: datos.modelo,
      nivel: datos.nivel,
      actor_id: datos.actorId,
      input_tokens: datos.usage.input_tokens,
      output_tokens: datos.usage.output_tokens,
      cache_creacion_tokens: datos.usage.cache_creacion_tokens,
      cache_lectura_tokens: datos.usage.cache_lectura_tokens,
    });
  } catch (e) {
    console.warn(`uso_llm no registrado (${datos.origen}): ${e}`);
  }
}
