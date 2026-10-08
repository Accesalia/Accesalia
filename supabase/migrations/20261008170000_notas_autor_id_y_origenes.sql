-- =====================================================================
-- QUIEN ESCRIBE CADA NOTA, Y DE DONDE SALE
-- Monica, 8-oct-2026.
--
-- Ella daba por hecho que cada nota llevaba el id de la persona de Accesalia
-- que la escribio. No era asi: las seis tablas notas_* solo tenian `autor` en
-- TEXTO ("Monica", "texto de origen"...). Con texto no se puede decidir quien
-- ve que nota -la confidencialidad de lo comercial va a depender de eso-, asi
-- que se arregla "antes de ninguna otra cosa".
--
-- 1. autor_id -> equipo. `autor` (texto) se queda como estaba: no se borra nada.
--
-- 2. ORIGEN, al menos tres familias (Monica):
--      persona   -> la escribe alguien con la sesion iniciada. OBLIGA autor_id.
--      sali      -> la crea Sali.
--      migracion -> la creamos nosotros al migrar. Se conserva el detalle de
--                   donde se migro: ficha_dropbox, monday, lectura_hoja.
--                   'migracion' a secas = migrada sin fuente mas concreta.
--    'app' desaparece: era "escrita en la app" cuando aun no habia sesion.
--
-- 3. Lo que ya habia con origen 'app':
--    - 51 notas con autor "Monica" (administracion de fincas, contratas,
--      expediente): las escribio ella -> persona, con su id.
--    - 12 notas de oportunidad "Monica (5/6-oct-2026, en el barrido)": las
--      escribio Claude en el barrido con lo que ella decidia -> migracion
--      (Monica, 8-oct).
--    Las de Dropbox, Monday y la relectura de hojas se quedan sin autor_id:
--    no se sabe quien las escribio y no se inventa.
--
-- 4. El origen por defecto pasa a 'persona'. Un insert sin autor_id falla:
--    asi ninguna pantalla nueva puede olvidarse de guardar quien escribe.
-- =====================================================================

-- 1. La columna, en las seis
alter table public.notas_oportunidad           add column autor_id uuid references public.equipo(id);
alter table public.notas_subvencion            add column autor_id uuid references public.equipo(id);
alter table public.notas_administracion_fincas add column autor_id uuid references public.equipo(id);
alter table public.notas_contratas             add column autor_id uuid references public.equipo(id);
alter table public.notas_expediente            add column autor_id uuid references public.equipo(id);
alter table public.notas_facturacion           add column autor_id uuid references public.equipo(id);

-- 2. Fuera las restricciones viejas de origen
alter table public.notas_oportunidad           drop constraint notas_opp_origen_ck;
alter table public.notas_subvencion            drop constraint notas_subv_origen_ck;
alter table public.notas_administracion_fincas drop constraint notas_af_origen_ck;
alter table public.notas_contratas             drop constraint notas_contratas_origen_ck;
alter table public.notas_expediente            drop constraint notas_expediente_origen_ck;
alter table public.notas_facturacion           drop constraint notas_fact_origen_ck;

-- 3. Lo que habia con 'app'
update public.notas_administracion_fincas
   set origen = 'persona', autor_id = (select id from public.equipo where email = 'gerencia.accesalia@gmail.com')
 where origen = 'app' and autor = 'Monica';
update public.notas_contratas
   set origen = 'persona', autor_id = (select id from public.equipo where email = 'gerencia.accesalia@gmail.com')
 where origen = 'app' and autor = 'Monica';
update public.notas_expediente
   set origen = 'persona', autor_id = (select id from public.equipo where email = 'gerencia.accesalia@gmail.com')
 where origen = 'app' and autor = 'Monica';
update public.notas_oportunidad
   set origen = 'migracion'
 where origen = 'app' and autor like 'Monica (%en el barrido)';

-- 4. Las restricciones nuevas (si quedara algun 'app' suelto, esto falla y no
--    se aplica nada)
alter table public.notas_oportunidad           add constraint notas_opp_origen_ck        check (origen in ('persona','sali','migracion','ficha_dropbox','monday','lectura_hoja'));
alter table public.notas_subvencion            add constraint notas_subv_origen_ck       check (origen in ('persona','sali','migracion','ficha_dropbox','monday','lectura_hoja'));
alter table public.notas_administracion_fincas add constraint notas_af_origen_ck         check (origen in ('persona','sali','migracion','ficha_dropbox','monday','lectura_hoja'));
alter table public.notas_contratas             add constraint notas_contratas_origen_ck  check (origen in ('persona','sali','migracion','ficha_dropbox','monday','lectura_hoja'));
alter table public.notas_expediente            add constraint notas_expediente_origen_ck check (origen in ('persona','sali','migracion','ficha_dropbox','monday','lectura_hoja'));
alter table public.notas_facturacion           add constraint notas_fact_origen_ck       check (origen in ('persona','sali','migracion','ficha_dropbox','monday','lectura_hoja'));

alter table public.notas_oportunidad           add constraint notas_opp_persona_autor_ck        check (origen <> 'persona' or autor_id is not null);
alter table public.notas_subvencion            add constraint notas_subv_persona_autor_ck       check (origen <> 'persona' or autor_id is not null);
alter table public.notas_administracion_fincas add constraint notas_af_persona_autor_ck         check (origen <> 'persona' or autor_id is not null);
alter table public.notas_contratas             add constraint notas_contratas_persona_autor_ck  check (origen <> 'persona' or autor_id is not null);
alter table public.notas_expediente            add constraint notas_expediente_persona_autor_ck check (origen <> 'persona' or autor_id is not null);
alter table public.notas_facturacion           add constraint notas_fact_persona_autor_ck       check (origen <> 'persona' or autor_id is not null);

-- 5. Por defecto, escrita por una persona
alter table public.notas_oportunidad           alter column origen set default 'persona';
alter table public.notas_subvencion            alter column origen set default 'persona';
alter table public.notas_administracion_fincas alter column origen set default 'persona';
alter table public.notas_contratas             alter column origen set default 'persona';
alter table public.notas_expediente            alter column origen set default 'persona';
alter table public.notas_facturacion           alter column origen set default 'persona';

-- 6. Indices: la confidencialidad filtrara por autor
create index notas_oportunidad_autor_idx           on public.notas_oportunidad (autor_id)           where autor_id is not null;
create index notas_subvencion_autor_idx            on public.notas_subvencion (autor_id)            where autor_id is not null;
create index notas_administracion_fincas_autor_idx on public.notas_administracion_fincas (autor_id) where autor_id is not null;
create index notas_contratas_autor_idx             on public.notas_contratas (autor_id)             where autor_id is not null;
create index notas_expediente_autor_idx            on public.notas_expediente (autor_id)            where autor_id is not null;
create index notas_facturacion_autor_idx           on public.notas_facturacion (autor_id)           where autor_id is not null;

-- 7. Comentarios
comment on column public.notas_oportunidad.autor_id           is 'Quien la escribio (equipo). Obligatorio si origen = persona; vacio en lo migrado.';
comment on column public.notas_subvencion.autor_id            is 'Quien la escribio (equipo). Obligatorio si origen = persona; vacio en lo migrado.';
comment on column public.notas_administracion_fincas.autor_id is 'Quien la escribio (equipo). Obligatorio si origen = persona; vacio en lo migrado.';
comment on column public.notas_contratas.autor_id             is 'Quien la escribio (equipo). Obligatorio si origen = persona; vacio en lo migrado.';
comment on column public.notas_expediente.autor_id            is 'Quien la escribio (equipo). Obligatorio si origen = persona; vacio en lo migrado.';
comment on column public.notas_facturacion.autor_id           is 'Quien la escribio (equipo). Obligatorio si origen = persona; vacio en lo migrado.';

comment on column public.notas_oportunidad.autor           is 'Texto historico de quien la escribio. Lo que manda es autor_id.';
comment on column public.notas_subvencion.autor            is 'Texto historico de quien la escribio. Lo que manda es autor_id.';
comment on column public.notas_administracion_fincas.autor is 'Texto historico de quien la escribio. Lo que manda es autor_id.';
comment on column public.notas_contratas.autor             is 'Texto historico de quien la escribio. Lo que manda es autor_id.';
comment on column public.notas_expediente.autor            is 'Texto historico de quien la escribio. Lo que manda es autor_id.';
comment on column public.notas_facturacion.autor           is 'Texto historico de quien la escribio. Lo que manda es autor_id.';
