-- =============================================================================
-- Se puede saber quien lleva una comunidad sin saber todavia de que casa es
--
-- El caso real, que salio dos veces en la migracion: en la ficha pone "ADMIN
-- TOMAS 645748010" o solo un correo, "admonfincas@mjr.es". Sabes con quien
-- hablas, pero no como se llama su administracion. Hasta ahora el modelo lo
-- prohibia: puesto.empresa_id era obligatorio.
--
-- Lo que hacia la gente ante esa prohibicion era inventarse una empresa que se
-- llamara "ADMIN TOMAS", y eso es basura: mete una persona en la lista de
-- administraciones y ensucia la cartera. Preferimos que el hueco se vea.
--
-- Asi que empresa_id pasa a ser opcional, y significa exactamente eso:
-- "trabaja en una administracion que todavia no sabemos cual es".
--
-- Lo que se afloja, y conviene saberlo: car_una_sola_administracion garantiza
-- que una comunidad no tenga dos administraciones vigentes distintas. Esa
-- garantia se comprueba comparando empresa_id, y con empresa_id vacio la
-- comparacion no dice ni si ni no, asi que esas filas quedan fuera del control.
-- Podria convivir "la lleva Del Brio" con "la lleva Tomas, casa por saber". Es
-- el precio de admitir que no siempre se sabe, y es un precio pequeno: la
-- pantalla marca en rojo a quien le falta la casa, asi que se ve y se arregla.
-- =============================================================================

alter table puesto alter column empresa_id drop not null;

alter table comunidad_admin_responsable alter column empresa_id drop not null;

-- Pero una fila tiene que decir ALGO: o quien, o de que casa. Las dos vacias no.
alter table comunidad_admin_responsable
  drop constraint if exists car_dice_algo_check;
alter table comunidad_admin_responsable
  add constraint car_dice_algo_check
  check (puesto_id is not null or empresa_id is not null);

comment on column puesto.empresa_id is 'La administracion donde trabaja. Vacio significa que aun no se sabe cual es, no que trabaje por libre: la pantalla lo marca como pendiente.';
comment on column comunidad_admin_responsable.empresa_id is 'La administracion que lleva la comunidad. Vacio = se sabe quien es la persona pero no de que casa.';

-- Para la lista de "esto falta por averiguar"
create index if not exists puesto_sin_empresa_idx on puesto (persona_id) where empresa_id is null;
