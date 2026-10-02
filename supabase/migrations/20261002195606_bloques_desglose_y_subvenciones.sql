-- ===========================================================================
-- CATALOGO DE BLOQUES: COMO SALE CADA UNO EN EL DESGLOSE   (2-oct-2026)
--
-- Monica, al montar la hoja de encargo. Un bloque marcado siempre pone su
-- parrafo en la hoja; lo que cambia es que pinta en el DESGLOSE DE IMPORTES:
--
--   no_aparece   nunca se cobra y no sale en el desglose: solo su parrafo, si
--                aplica (licencia, toma de datos, tres presupuestos, CFO)
--   incluido     sale en el desglose, sin importe y sin linea de facturacion
--   se_cobra     sale con su importe y genera su linea de facturacion
--
-- Esto es SOLO LO QUE SALE POR DEFECTO. Quien manda es la hoja: cada bloque
-- marcado lleva un interruptor con las mismas tres posiciones. Asi el caso
-- raro (la CSS gratis en el paquete de obra, el CFO que se cobra sin DF,
-- Vinateros 138) se resuelve con un clic y su importe llega a facturacion, en
-- vez de escribirse a mano en el texto, donde no lo ve nadie.
--
-- Y de paso, las dos subvenciones pasan a ser UNA: "TRAMITACION DE
-- SUBVENCIONES" (en la hoja se dice tramitacion, no gestion). Las dos viejas se
-- DESACTIVAN, no se borran: 641 + 271 conceptos de hojas antiguas las usan.
-- Tambien se desactivan los tres que ella quito de la lista: financiacion y los
-- dos paquetes de SATE con CAES.
-- ===========================================================================

begin;

alter table bloques
  add column desglose text not null default 'se_cobra',
  add constraint bloques_desglose_check
    check (desglose in ('no_aparece', 'incluido', 'se_cobra'));

comment on column bloques.desglose is
  'Como sale por defecto en el desglose de importes de la hoja: no_aparece (solo el parrafo), incluido (sin importe) o se_cobra (importe + linea de facturacion). La hoja puede cambiarlo.';

-- Los cuatro que nunca se cobran. El resto se queda en se_cobra, que es su
-- clasificacion (la DF sale incluida cuando la hoja lleva proyecto, pero esa
-- regla es de la hoja, no del catalogo).
update bloques set desglose = 'no_aparece', actualizado_en = now()
 where codigo in ('TOMA DE DATOS Y MODELADO 3D', 'TRAMITACION LICENCIAS',
                  'TRAMITACION 3 PRESUPUESTOS', 'CERTIFICADO FIN DE OBRA');

-- La subvencion, una sola.
insert into bloques (codigo, nombre, texto_plantilla, naturaleza, es_paquete, orden, activo, desglose)
values (
  'TRAMITACION SUBVENCIONES',
  'TRAMITACIÓN DE SUBVENCIONES',
  E'TRAMITACIÓN DE SUBVENCIONES\n'
  '• Asesoramiento técnico sobre las subvenciones aplicables al proyecto.\n'
  '• Preparación y presentación de la documentación técnica necesaria para la solicitud.\n'
  '• Gestión continuada de la tramitación de las ayudas hasta su concesión, incluyendo la atención a posibles requerimientos administrativos.\n'
  '• Acompañamiento a la Comunidad de Propietarios durante todo el proceso, incluyendo las fases de justificación y seguimiento, hasta la percepción efectiva de la ayuda concedida.\n'
  '• Coordinación con la Comunidad para la recopilación de la documentación adicional necesaria en cada fase.\n'
  '────────────────────────────────────────────────────────────────────',
  'servicio', false, 7, true, 'se_cobra'
);

update bloques set activo = false, actualizado_en = now()
 where codigo in ('TRAMITACION SUBVENCIONES ACCESIBILIDAD',
                  'TRAMITACION SUBVENCIONES EFICIENCIA ENERGETICA',
                  'SOLICITUD DE FINANCIACION',
                  'SATE CON CESION DE CAES',
                  'SATE + ASCENSOR CON CESION DE CAES');

-- FRENO. Lo que tiene que quedar: 14 activos (los 15 de su lista, con las dos
-- subvenciones hechas una), 4 de ellos no_aparece, y 5 desactivados.
do $$
declare activos int; no_ap int; inactivos int;
begin
  select count(*) filter (where activo),
         count(*) filter (where activo and desglose = 'no_aparece'),
         count(*) filter (where not activo)
    into activos, no_ap, inactivos
    from bloques;
  if activos <> 14 or no_ap <> 4 or inactivos <> 5 then
    raise exception 'Esperaba 14 activos / 4 no_aparece / 5 inactivos y salen % / % / %. Nada escrito.',
      activos, no_ap, inactivos;
  end if;
end $$;

commit;
