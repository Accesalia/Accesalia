-- =============================================================================
-- ERP Accesalia — VIA de tramitacion de licencia + si el proyecto requiere visado
--
-- La via (entidad + modalidad) se decide al INICIO del proyecto (como las fases),
-- editable. A veces es eleccion, a veces imposicion del tipo/localidad -> matriz
-- `tipo x localidad x entidad -> DR/licencia obligatorio/electivo` (sprint licencia).
--
-- Cambia el "OK de Daniel": por AYUNTAMIENTO el proyecto salta a "listo para visar";
-- por ECU salta a "pendiente de tramite ECU" -> se arreglan los fallos que ve la
-- ECU (requerimientos origen='ecu', vuelven al tecnico) y LUEGO se visa (asi no se
-- pagan tasas de visado dobles). ecu_visto_bueno = la ECU ya dio paso.
--
-- El visado existe para poder tramitar la licencia: por eso la via vive aqui, en
-- el proyecto, aunque solape conceptualmente con la futura fase de licencia.
-- =============================================================================

alter table proyectos
  add column entidad_responsable text,                        -- ayuntamiento | ecu
  add column modalidad_licencia text,                         -- declaracion_responsable | licencia
  add column requiere_visado boolean not null default true,   -- memorias valoradas / servicios: false
  add column ecu_visto_bueno boolean not null default false;  -- la ECU dio paso: ya se puede visar

alter table proyectos
  add constraint proyectos_entidad_responsable_check
    check (entidad_responsable is null or entidad_responsable in ('ayuntamiento', 'ecu')),
  add constraint proyectos_modalidad_licencia_check
    check (modalidad_licencia is null or modalidad_licencia in ('declaracion_responsable', 'licencia'));

comment on column proyectos.entidad_responsable is 'Quien concede la licencia de obra: ayuntamiento | ecu. Por ECU se arreglan los fallos antes de visar (evita tasas de visado dobles). Se fija al inicio, editable; a veces impuesto por tipo/localidad (matriz en sprint licencia).';
comment on column proyectos.modalidad_licencia is 'Modalidad de la licencia: declaracion_responsable | licencia. Obligatorio/electivo segun tipo y localidad (matriz futura).';
comment on column proyectos.requiere_visado is 'Si el proyecto se visa en el colegio. Todo lo que es proyecto se visa; las memorias valoradas y los servicios (pericial, DF, doc tecnica) no.';
comment on column proyectos.ecu_visto_bueno is 'Via ECU: la ECU ha dado el visto bueno y ya se puede mandar a visar.';

-- Memoria valorada: es proyecto (naturaleza), pero NO se visa (unica excepcion).
insert into tipos_proyecto (clave, nombre, naturaleza, orden) values
  ('memoria_valorada', 'Memoria valorada', 'proyecto', 55);

-- Default inteligente: no requieren visado los que no tienen ningun tag de
-- naturaleza 'proyecto' (solo servicios / doc tecnica), ni las memorias valoradas.
-- La migracion de board 5 afina ademas con el "NO SE VISA" real (75 items).
update proyectos p set requiere_visado = false
where not exists (
  select 1 from proyecto_tipos pt
  join tipos_proyecto t on t.id = pt.tipo_id
  where pt.proyecto_id = p.id
    and t.naturaleza = 'proyecto'
    and t.clave <> 'memoria_valorada'
);
