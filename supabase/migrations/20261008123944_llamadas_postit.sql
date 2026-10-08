-- YA APLICADA el 8-oct-2026 por el MCP. NO volver a ejecutar.
--
-- LA LLAMADA ES UN POSTIT (Monica, 8-oct-2026): "el equivalente al bloc de
-- postit de la secretaria". Ventanita flotante, puede haber varias a la vez, y
-- se guarda SIEMPRE mientras se escribe: tambien si se descarta ("no quiero que
-- no se guarden por pereza"). Por eso dos estados nuevos:
--   abierta    el postit esta escribiendose; nace asi;
--   descartada se pulso Descartar; la fila se queda.
-- Guardar (-> por_colocar) exige haber elegido una persona o una direccion:
-- la nota tiene que poder colgarse de algun sitio.

alter table public.llamadas drop constraint llamadas_estado_check;
alter table public.llamadas add constraint llamadas_estado_check
  check (estado in ('abierta', 'por_colocar', 'descartada', 'colocada', 'archivada'));
alter table public.llamadas alter column estado set default 'abierta';
create index llamadas_autor_idx on public.llamadas (apuntada_por, recibida_en desc);
comment on column public.llamadas.estado is
  'abierta (postit escribiendose, se guarda solo a cada cambio) -> por_colocar (Guardar: exige persona o direccion elegida) -> colocada / archivada. descartada: se pulso Descartar; NO se borra nunca (Monica, 8-oct-2026).';
