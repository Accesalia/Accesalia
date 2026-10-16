-- ASIGNAR › NUBE (Monica, 16-oct-2026, maqueta area-dinero-v1 marco 7): de cada
-- trabajo con lineas validadas que llevan tecnico, Alexandra decide si necesita
-- nube de puntos. Si: pasa a Abraham (Proceso de nubes) y, con la nube lista, a
-- Proyectos. No: directo a Proyectos. Vacio = pendiente de decidir.
-- decidida_en es la «recibida» que ve Abraham. Las notas, las de Proceso de nubes.
alter table nubes_puntos
  add column necesita_nube boolean,
  add column decidida_en   timestamptz,
  add column decidida_por  uuid references equipo(id),
  add column notas         text;

comment on column nubes_puntos.necesita_nube is 'Si el trabajo necesita nube de puntos (lo decide facturacion en Asignar). null = pendiente de decidir.';
comment on column nubes_puntos.decidida_en is 'Cuando se decidio nube si/no: la fecha de recibida para quien escanea.';
comment on column nubes_puntos.notas is 'Notas del escaneo (llaves, accesos, lo que falto).';
