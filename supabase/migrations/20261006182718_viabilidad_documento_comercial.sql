-- LA VIABILIDAD, PARTE DEL COMERCIAL (Monica, 6-oct-2026): la plantilla del
-- 3-oct (docs/figma/viabilidad.html) hecha pantalla.

-- 1 · LAS CLAUSULAS, con sus cifras (5-7%, 90 dias, 21%) "editables en un
--     sitio, no escritas en el codigo" (nota de la maqueta). Una tabla para los
--     documentos que las lleven; hoy solo la viabilidad.
create table public.clausulas_documento (
  id         uuid primary key default gen_random_uuid(),
  documento  text not null,
  orden      integer not null,
  titulo     text,
  texto      text not null,
  activo     boolean not null default true,
  creado_en  timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint clausulas_documento_documento_check check (documento = any (array['viabilidad']))
);
comment on table public.clausulas_documento is
  'Las clausulas fijas de cada documento, en orden. Las cifras van dentro del texto y se cambian aqui, no en el codigo.';
alter table public.clausulas_documento enable row level security;

insert into public.clausulas_documento (documento, orden, titulo, texto) values
('viabilidad', 1, 'Cláusula de Responsabilidad sobre la Bonificación del ICIO', 'El arquitecto se compromete a gestionar la solicitud de bonificación del Impuesto sobre Construcciones, Instalaciones y Obras (ICIO) ante el Ayuntamiento correspondiente. No obstante, la concesión de dicha bonificación queda exclusivamente sujeta a los criterios y resoluciones de la administración municipal. En caso de que la bonificación no sea concedida, ya sea por razones imputables o no al arquitecto, incluyendo la declaración de ineficacia de la Declaración Responsable (DR) que implicaría el pago íntegro de la tasa del ICIO incluso si la obra no llegase a ejecutarse, la Comunidad de Propietarios asumirá íntegramente el abono de dicho impuesto, exonerando al arquitecto de cualquier responsabilidad derivada de esta circunstancia.'),
('viabilidad', 2, 'Tasas Administrativas', 'Las tasas administrativas dependen exclusivamente del organismo competente (Ayuntamiento) y pueden variar según sus criterios y normativas. La cantidad indicada en este presupuesto es una estimación basada en cálculos previos, por lo que el importe final puede diferir.'),
('viabilidad', 3, null, 'A día de hoy el precio de estas tasas se encuentra entre el 5 y 7%. Este precio es susceptible de variar dependiendo de criterios internos del Ayuntamiento, no pudiendo garantizar su importe antes de la presentación de la solicitud.'),
('viabilidad', 4, 'Validez de Precios', 'Los precios reflejados en este presupuesto son válidos por 90 días desde la fecha de emisión.'),
('viabilidad', 5, 'Coste de Obras', 'Los costes de obra pueden variar al alza o a la baja, dependiendo de la empresa contratista seleccionada.'),
('viabilidad', 6, null, 'A día de hoy el IVA es del 21%.');

-- 2 · SIN HONORARIOS. El caso 2 de los cuatro: "mirame si cabe ascensor; no me
--     pases precio, que es solo para que empiecen a pensarselo". La viabilidad
--     sale sin nuestros honorarios (la hoja queda en borrador).
alter table public.viabilidades add column con_honorarios boolean not null default true;
comment on column public.viabilidades.con_honorarios is
  'false = la viabilidad sale sin nuestros honorarios ("no me pases precio"). La hoja se prepara igual, en borrador.';
