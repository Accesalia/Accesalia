-- El ESTUDIO DE AYUDAS (Monica, 12-oct-2026): "Subvenciones posibles" en
-- Documentacion de referencia. Las ayudas de la obra con sus plazos, lo
-- concedido cerca, el coste y el resumen de lo que de verdad cubren si se espera.
alter table informes_generados drop constraint informes_generados_tipo_check;
alter table informes_generados add constraint informes_generados_tipo_check check (tipo in ('estimacion_costes', 'estudio_ayudas', 'proteccion'));
