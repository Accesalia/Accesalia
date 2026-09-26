-- (Monica, 26-sep-2026, montando el alta de administracion de fincas)
--
-- APLICADA EN PRODUCCION el 26-sep-2026. El backfill de `cargo_clave` marco
-- 56 puestos como "el que manda" y dejo 10 en null, a proposito.

-- 1 · ¿ESTA ADMINISTRACION COBRA COMISION? Tres estados, no dos. "No" tiene que
--     significar "se que no cobra", no "todavia no lo se": la comision no se
--     habla el primer dia, se saca cuando surge el momento.
alter table public.empresa add column if not exists comision_estado text not null default 'sin_hablar';
alter table public.empresa drop constraint if exists empresa_comision_estado_check;
alter table public.empresa add constraint empresa_comision_estado_check
  check (comision_estado in ('cobra', 'no_cobra', 'sin_hablar'));
comment on column public.empresa.comision_estado is
  'cobra | no_cobra | sin_hablar (por defecto). sin_hablar = todavia no se ha sacado el tema, que NO es lo mismo que saber que no cobra.';

-- 2 · RESPETO DE CARTERA: que NO se le puede ofrecer porque nos lo trajo otro.
--     Lista propia y corta, a proposito: no se toca `tipos_servicio` (vacia) ni
--     se ensucia `tipos_proyecto` con un valor "todo". Sirve para el aviso:
--     "ojo, este nos vino por FAIN, no le ofrezcas ascensores".
--     "ascensor_y_sate" se lee entero; "ambas" fuera de contexto no dice nada.
alter table public.administracion_origen add column if not exists servicio_reservado text;
alter table public.administracion_origen drop constraint if exists administracion_origen_servicio_reservado_check;
alter table public.administracion_origen add constraint administracion_origen_servicio_reservado_check
  check (servicio_reservado is null or servicio_reservado in ('ascensor', 'sate', 'ascensor_y_sate'));
comment on column public.administracion_origen.servicio_reservado is
  'Lo que queda RESERVADO a quien nos trajo esta administracion: ascensor | sate | ascensor_y_sate. Un comercial freelance se lo queda todo -> ascensor_y_sate.';

-- 3 · QUIEN MANDA. `cargo` sigue siendo texto libre con las palabras de cada
--     administracion (hay 13 formas distintas y cada casa tiene su esquema).
--     Al lado, nuestra clave normalizada, para poder preguntarle a la base
--     quien decide de verdad.
alter table public.puesto add column if not exists cargo_clave text;
alter table public.puesto drop constraint if exists puesto_cargo_clave_check;
alter table public.puesto add constraint puesto_cargo_clave_check
  check (cargo_clave is null or cargo_clave in ('el que manda'));
comment on column public.puesto.cargo_clave is
  'Nuestra lectura del cargo, normalizada. Hoy solo "el que manda" (quien decide). Los cargos ambiguos (administrador, administradora) se quedan en null a proposito.';

-- La equivalencia que dicto Monica, sobre los cargos que ya existen.
update public.puesto set cargo_clave = 'el que manda'
where lower(trim(cargo)) in (
  'titular', 'socio', 'socia', 'socia administradora',
  'administrador unico', 'administrador único',
  'administrador solidario',
  'administrador autonomo', 'administrador autónomo',
  'administradora autonoma', 'administradora autónoma'
);
