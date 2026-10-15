-- UNA SOLA AGENDA (Monica, 15-oct-2026): personas_comunidad se retira. Cada fila
-- apunta a quien es en la agenda (puesto + persona); la tabla queda de archivo.
-- (Aplicada en prod por MCP; este fichero la deja registrada.)
alter table public.personas_comunidad
  add column if not exists migrado_puesto_id uuid references public.puesto(id),
  add column if not exists migrado_persona_id uuid references public.persona(id);
comment on table public.personas_comunidad is 'RETIRADA 15-oct-2026: la gente de la comunidad vive en la agenda (persona + puesto con figura_legal_propietaria_id = la comunidad). Archivo; nadie la lee ni la escribe. migrado_* = a quien corresponde en la agenda.';
