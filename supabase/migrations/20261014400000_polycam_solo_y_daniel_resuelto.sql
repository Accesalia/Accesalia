-- MESA DE VIABILIDADES (Monica, 14-oct-2026, sobre su maqueta "esquema propuesto
-- pantalla viabilidades").
--
-- 1. LA APP VINCULA SOLA cuando no hay duda: el asunto dice calle + numero +
--    municipio y encaja con UN edificio que tiene UNA opp abierta (o habia una
--    visita de escaneo agendada ahi). Se vincula a los accesos de esa opp en ese
--    edificio. Queda marcado: "vinculado por la app", y Alex puede corregirlo.
-- 2. "RESUELTO POR DANIEL": cuando Alex avisa a Daniel de un atasco, la
--    respuesta se guarda (quien y cuando) para que no se quede en el limbo. Si la
--    viabilidad se envia al comercial, el atasco esta resuelto igualmente.

alter table public.relacion_polycam_acceso add column if not exists automatico boolean not null default false;
alter table public.relacion_polycam_acceso add column if not exists motivo text;
comment on column public.relacion_polycam_acceso.automatico is 'Lo vinculo la app sola (no habia duda). Alex puede corregirlo.';
comment on column public.relacion_polycam_acceso.motivo is 'Por que lo vinculo la app: "el asunto dice CL BRASILIA 39 MADRID y tiene una sola opp abierta".';

alter table public.viabilidades add column if not exists daniel_resuelto_en timestamptz;
alter table public.viabilidades add column if not exists daniel_resuelto_por uuid references public.equipo(id);
comment on column public.viabilidades.daniel_resuelto_en is 'Daniel (responsable tecnico) contesto al aviso de atasco. Si la viabilidad se envio, tambien cuenta como resuelto.';
