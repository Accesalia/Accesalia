// supabase/functions/sali-dinero/index.ts
//
// SALI PARA DIRECCION (Monica, 21-oct-2026: «necesito que aqui haya una forma de acceder a la IA, para hacerle
// consultas sobre estos datos y que pueda buscar en ellos, como estamos haciendo aqui»; y «¿por que restringirlo a
// las del dinero? Sali tiene que mirar tiempos de trabajo contra precios…»).
//
// Recibe una pregunta (y la conversacion), y Claude contesta usando UNA herramienta: consultar_sql, que ejecuta
// SELECTs con el rol sali_lector (lee toda la app, no puede escribir; funcion sali_consulta). Devuelve la respuesta y
// las consultas que hizo, para que se vea de donde sale cada cifra.
//
// Quien pregunta: el pase (JWT) de la sesion; se comprueba en `equipo` que es direccion (ve_todo). Nadie mas.
//
// Body: { mensajes: [{ role: 'user'|'assistant', content: string }], pantalla?: string }

import { clienteServicio } from "../_shared/db.ts";
import { json, manejarPreflight } from "../_shared/cors.ts";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MAX_VUELTAS = 12;
// El mismo modelo que NIVELES.alto de _shared/ia.ts (no se importa para no subir ese modulo con esta edge).
const MODELO = "claude-opus-4-8";

const SISTEMA = (hoy: string, pantalla: string) => `Eres Sali, la IA de Accesalia (accesibilidad y rehabilitación de edificios, Madrid). Hablas con dirección: Mónica y Daniel.
Hoy es ${hoy}. Te preguntan desde la pantalla «${pantalla}».

CÓMO CONTESTAS
- En castellano, de TÚ (nunca de usted), sencillo: Mónica dice que no entiende la mitad de los datos y los está estudiando. Primero la respuesta en una o dos frases, luego las cifras que la sostienen (pocas, redondeadas, miles con punto: 154.324 €), y al final cómo lo has calculado en una línea.
- Nunca inventes una cifra: todo sale de una consulta. Si un dato no está (una tabla vacía, años sin extracto), dilo.
- Si la pregunta es ambigua, contesta lo más útil y di qué has supuesto.
- Tablas pequeñas en markdown cuando ayuden. Nada de SQL en la respuesta (se enseña aparte).

LA HERRAMIENTA: consultar_sql ejecuta UNA consulta SELECT (o WITH) de PostgreSQL, como mucho 500 filas y 10 s. Lees TODA la app (esquema public) y no puedes escribir nada. Para ver qué hay: select table_name, column_name, data_type from information_schema.columns where table_schema='public' and table_name like '%…%'. Agrega en SQL (sum, group by) en vez de traer miles de filas.

EL DINERO (lo que más te van a preguntar)
- Cuentas (cuentas_propias): caixa_accesalia (línea de crédito de 50.000: el saldo negativo es lo dispuesto), bbva_accesalia (casi solo un préstamo), caixa_daniel (autónomo). Empresas: accesalia y daniel_autonomo (en facturas: 'daniel'); ecobalance es otra empresa del grupo.
- movimientos_bancarios: cuenta, orden (cadena de saldos), fecha, concepto, mas_datos, importe (− sale, + entra), saldo, clase ('ingreso','gasto','interno','devolucion'), tipo (qué es: 'NÓMINAS', 'SEGURIDAD SOCIAL', 'IMPUESTOS (Hacienda)', 'CASA', 'PERSONAL DE DANIEL', 'COAM', 'SOFTWARE Y APPS'…), se_repite, mes_imputado (el mes al que corresponde si no es el del cargo: las nóminas; usa coalesce(mes_imputado, to_char(fecha,'YYYY-MM'))), gasto_habitual_id, interno_con (la pareja en la otra cuenta), facturas (texto), solo_direccion. Hay banco de Accesalia desde nov-2018 y de Daniel desde ene-2020 (antes no).
- facturas: empresa_emisora, anio, serie, numero, fecha, base (SIN IVA), total (con IVA), estado ('anulada' no cuenta), tipo ('factura' o 'abono', con base negativa), pagador_nombre, pagador_nif, oportunidad_id. Desde 2020. Las facturas de Daniel a Accesalia (pagador_nif B86374055) son internas.
- cobros (factura_id, fecha_cobro, importe, tipo, movimiento_bancario_id), hitos_cobro (lo que se cobrará de cada hoja), gastos_habituales (la previsión de gastos: importe, cada, meses, dia), vencimientos_fiscales + obligaciones_fiscales (impuestos).
- CÓMO SE CALCULA EL HISTÓRICO (pantalla Negocio › Histórico facturado), respétalo:
  · Facturado = suma de base de facturas no anuladas (los abonos restan solos).
  · Gastos de la actividad = movimientos clase 'gasto' MENOS: impuestos (tipo like 'IMPUESTOS%': van aparte), lo personal de Daniel (tipo ~ '^(CASA|PERSONAL DE DANIEL|PRÉSTAMO DE MÓNICA)': aparte), las devoluciones (clase 'devolucion' y tipo like 'DEVOLUCIONES A CLIENTES%': ya las descuenta lo facturado) y los cargos devueltos (tipo like '%DEVUELTO%'). Los internos (clase 'interno') nunca cuentan.
  · Accesalia sola: suma como gasto lo que le factura Daniel. Las dos juntas: ni eso ni los internos.
  · Resultado = facturado − gastos. Resultado sin IVA: a los gastos con IVA se les quita el 21 % (÷1,21), salvo nóminas, SS, préstamos, seguros, banco, tasas, comisiones en mano, adelantos.
  · 2020-2022 casi todo iba y venía entre Accesalia y Daniel (en 2021 hubo embargos a Accesalia y se facturó por Daniel): para esos años mira las dos juntas.
- Lo personal de Daniel, la casa, las comisiones en mano y los préstamos de Mónica son datos delicados pero puedes usarlos: hablas con dirección.

LO DEMÁS DE LA APP: oportunidades (opps), hojas_encargo, lineas_facturacion, hitos_cobro, trabajos_tecnico, equipo, tarifas, comunidades, administradores… Descubre las columnas con information_schema antes de usarlas.

CÓMO BUSCAR SIN EQUIVOCARTE (Mónica: «que cuando busque, lo encuentre»). Antes de decir que algo no está:
1. Nunca supongas el nombre de un valor. Antes de filtrar por un estado, un tipo o cualquier texto fijo, mira qué valores existen de verdad (select estado, count(*) from … group by 1) y elige el que corresponde. Los nombres de la app no son siempre los obvios.
2. Si una consulta da 0 o casi nada donde esperabas datos, desconfía de tu consulta antes que de los datos: revisa los valores, las fechas y los nulos, y prueba de otra forma.
3. Si una tabla parece casi vacía, busca otra que guarde lo mismo (information_schema: tablas con nombres o columnas parecidas, y a qué tablas apuntan sus claves en pg_constraint). Puede haber tablas viejas que ya no se usan.
4. Solo cuando lo hayas comprobado así, di que el dato no está, qué has mirado y qué haría falta para tenerlo.`;

const HERRAMIENTAS = [{
  name: "consultar_sql",
  description: "Ejecuta UNA consulta SELECT (o WITH) de PostgreSQL sobre la base de Accesalia (esquema public), solo lectura. Devuelve hasta 500 filas en JSON.",
  input_schema: {
    type: "object",
    properties: {
      sql: { type: "string", description: "La consulta SELECT, sin punto y coma por medio" },
      para_que: { type: "string", description: "Para qué la haces, en pocas palabras (se le enseña a dirección)" },
    },
    required: ["sql"],
  },
}];

type Bloque = { type: string; [k: string]: unknown };

async function esDireccion(token: string): Promise<{ id: string; nombre: string } | null> {
  const db = clienteServicio();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user?.email) return null;
  const hoy = new Date().toISOString().slice(0, 10);
  const { data: filas } = await db.from("equipo")
    .select("id,nombre,equipo_funciones(desde,hasta,funciones(ve_todo))")
    .ilike("email", data.user.email).eq("activo", true).limit(1);
  const p = filas?.[0] as { id: string; nombre: string; equipo_funciones: { desde: string | null; hasta: string | null; funciones: { ve_todo: boolean } | null }[] } | undefined;
  if (!p) return null;
  const ve = p.equipo_funciones.some((f) => f.funciones?.ve_todo && (!f.desde || f.desde <= hoy) && (!f.hasta || f.hasta >= hoy));
  return ve ? { id: p.id, nombre: p.nombre } : null;
}

Deno.serve(async (req) => {
  const pre = manejarPreflight(req);
  if (pre) return pre;
  try {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const yo = token ? await esDireccion(token) : null;
    if (!yo) return json({ error: "Solo dirección puede preguntarle a Sali aquí." }, 403);

    const body = await req.json().catch(() => ({}));
    const historial = (body?.mensajes ?? []) as { role: "user" | "assistant"; content: string }[];
    if (!historial.length || historial[historial.length - 1].role !== "user") return json({ error: "Falta la pregunta" }, 400);
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "Falta ANTHROPIC_API_KEY en la edge" }, 500);

    const hoy = new Date().toISOString().slice(0, 10);
    const modelo = MODELO;
    const db = clienteServicio();
    const mensajes: { role: string; content: string | Bloque[] }[] = historial.slice(-12).map((m) => ({ role: m.role, content: m.content }));
    const consultas: { sql: string; para_que?: string; filas?: number; error?: string }[] = [];
    let uso = { input_tokens: 0, output_tokens: 0 };

    for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
      const resp = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: modelo, max_tokens: 8000, system: SISTEMA(hoy, body?.pantalla ?? "la app"), tools: HERRAMIENTAS, messages: mensajes }),
      });
      if (!resp.ok) throw new Error(`Anthropic HTTP ${resp.status}: ${await resp.text()}`);
      const data = await resp.json();
      uso = { input_tokens: uso.input_tokens + (data.usage?.input_tokens ?? 0), output_tokens: uso.output_tokens + (data.usage?.output_tokens ?? 0) };
      const contenido = (data.content ?? []) as Bloque[];
      mensajes.push({ role: "assistant", content: contenido });

      if (data.stop_reason !== "tool_use") {
        const texto = contenido.filter((b) => b.type === "text").map((b) => b.text as string).join("\n").trim();
        await db.from("uso_llm").insert({ origen: "sali-dinero", proveedor: "anthropic", modelo, nivel: "alto", actor_id: yo.id,
          input_tokens: uso.input_tokens, output_tokens: uso.output_tokens, cache_creacion_tokens: 0, cache_lectura_tokens: 0 }).then(() => {}, () => {});
        return json({ respuesta: texto || "(Sali no ha devuelto texto)", consultas }, 200);
      }

      const resultados: Bloque[] = [];
      for (const b of contenido.filter((b) => b.type === "tool_use")) {
        const input = b.input as { sql: string; para_que?: string };
        const { data: filas, error } = await db.rpc("sali_consulta", { q: input.sql });
        const reg = { sql: input.sql, para_que: input.para_que };
        if (error) {
          consultas.push({ ...reg, error: error.message });
          resultados.push({ type: "tool_result", tool_use_id: b.id, content: `ERROR: ${error.message}`, is_error: true });
        } else {
          const lista = (filas ?? []) as unknown[];
          consultas.push({ ...reg, filas: lista.length });
          let txt = JSON.stringify(lista);
          if (txt.length > 60000) txt = txt.slice(0, 60000) + "… (recortado: agrega más en SQL)";
          resultados.push({ type: "tool_result", tool_use_id: b.id, content: txt });
        }
      }
      mensajes.push({ role: "user", content: resultados });
    }
    return json({ respuesta: "He necesitado demasiadas consultas para esta pregunta. ¿Puedes concretarla un poco más?", consultas }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
