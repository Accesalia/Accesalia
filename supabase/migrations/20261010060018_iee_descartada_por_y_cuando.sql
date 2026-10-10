-- DESCARTAR UNA IEE DEL RADAR (Monica, 10-oct-2026): "las opciones deberian
-- ser vincular / descartar, para que en epocas de mucho trabajo no se acumulen".
-- El estado 'descartada' y motivo_descarte ya existian; faltaba quien y cuando,
-- igual que al asignar (asignada_por, asignada_en). El motivo es opcional.
alter table public.iee_registrado
  add column descartada_por uuid references public.equipo(id) on delete set null,
  add column descartada_en timestamptz;

comment on column public.iee_registrado.descartada_por is 'Quien la descarto en el radar. Las descartadas salen de los pendientes, pero se pueden revisar y recuperar.';
comment on column public.iee_registrado.descartada_en is 'Cuando se descarto.';
