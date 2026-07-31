# -*- coding: utf-8 -*-
r"""
Segunda mitad del paquete de subida: las filas que faltan, el reapuntado, la
comprobacion y el borrado del modelo viejo. Se anade a SUBIR_A_PRODUCCION.sql.

Uso: python scripts/generar_subida_produccion2.py
"""
import io, os, sys, csv, subprocess
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

SALIDA = r"C:\accesalia-fichas\SUBIR_A_PRODUCCION.sql"
DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-q", "--csv", "-c"]

def sql(q):
    r = subprocess.run(DB + [q], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    t = r.stdout.decode("utf-8", "replace")
    if r.returncode:
        print(t); sys.exit(1)
    return list(csv.DictReader(io.StringIO(t)))

def lit(v):
    if v is None or v == "":
        return "null"
    return "'" + str(v).replace("\\", "\\\\").replace("'", "''") + "'"

EQ = [("ACAYMA", "ACAYMA ASESORES"),
    ("AEA / MC GESTION FINCAS", "MC GESTION ADMINISTRACION DE FINCAS"),
    ("ABACO", "ABACO CONSULTORES Y ASESORES, S.L."),
      ("ABOGADOS DE COSLADA", "ABOGADOS Y FINCAS COSLADA"),
      ("ADMINISTRACIONES RIVERA", "RIVERA"), ("AMGESTION", "AM EUROGESTION SL"),
      ("ARESTE", "CUESTA Y ARESTE"), ("BUJARUELO", "GESTIONES Y FINCAS BUJARUELO, S.L."),
      ("DIMAS RODRIGUEZ RODRIGUEZ", "Asesoría DR"), ("FINCASA", "FINCASA FIXCONTE"),
      ("GESTORIA JIMENEZ MLJP, SLP", "Gestoría Jiménez"), ("LOZANO PASIPE", "Lozano Masipie SLP"),
      ("MIR YARA", "YARA ASESORES"), ("MONGE", "FINCAS MONGE"),
      ("ROSARIO MOLANO", "Gestoria MyM"),
      ("SANCHEZ ADMINISTRADOR DE FINCAS", "INMHO Gestion de la Propiedad (MOSTOLES)"),
      ("VERCO", "FINCAS VERCO SL")]

# comparar nombres sin tildes, sin espacios y sin puntuacion: es la misma regla
# con la que se caso todo en local
N = "regexp_replace(upper(translate(%s,'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNAEIOUUN')),'[^A-Z0-9]','','g')"

CPC = ["id","creado_en","actualizado_en","comunidad_id","nombre","rol","telefono",
       "email","es_contacto_principal","notas","documento"]
COE = ["id","creado_en","actualizado_en","comunidad_id","proyecto_id","fase","fecha",
       "fecha_estimada","orden","texto","autor","origen","ficha_ref"]

pc = sql("select " + ",".join(CPC) + """ from personas_comunidad
 where left(comunidad_id::text,8) in
   ('2a4804e5','74eb5445','91e1d8a1','a0f85ec0','d23baeca','dee4c825','ea43c3a9','fbfd81e3')""")
oe = sql("select " + ",".join(COE) + """ from observaciones_expediente
 where left(comunidad_id::text,3) in ('343','699','aa5')""")

def filas(tabla, cols, datos):
    return (f"insert into {tabla} (" + ", ".join(cols) + ") values\n" +
            ",\n".join("  (" + ",".join(lit(f[c]) for c in cols) + ")" for f in datos) +
            "\non conflict (id) do nothing;\n")

t = ["""
-- ---------------------------------------------------------------------------
-- 3. las 14 filas que produccion no tenia
--    8 presidentes y 6 observaciones historicas sacadas de las fichas. Sus
--    comunidad_id ya son los de produccion, asi que entran tal cual.
-- ---------------------------------------------------------------------------"""]
t.append(filas("personas_comunidad", CPC, pc))
t.append(filas("observaciones_expediente", COE, oe))

eq_vals = ",\n".join("  (" + lit(a) + "," + lit(b) + ")" for a, b in EQ)
t.append(f"""
-- ---------------------------------------------------------------------------
-- 4. EXPANDIR: columnas nuevas al lado de las viejas, y rellenarlas.
--    El puente se calcula aqui: nombre normalizado, mas las equivalencias que
--    Monica reviso una a una (mismas casas escritas de otra forma).
-- ---------------------------------------------------------------------------
create temp table _eq (viejo text, nuevo text) on commit drop;
insert into _eq values
{eq_vals};

create temp table _emp (admin_id uuid, empresa_id uuid) on commit drop;
insert into _emp
select a.id, e.id from administraciones_fincas a
  join empresa e on {N % 'e.nombre_accesalia'} = {N % 'a.nombre'};
insert into _emp
select a.id, e.id from administraciones_fincas a
  join _eq q on {N % 'q.viejo'} = {N % 'a.nombre'}
  join empresa e on {N % 'e.nombre_accesalia'} = {N % 'q.nuevo'}
 where not exists (select 1 from _emp x where x.admin_id = a.id);

-- administradores viejos -> puesto. Primero por correo, que identifica mejor
-- que el nombre; despues por nombre dentro de su propia casa.
create temp table _pue (admin_viejo uuid, puesto_id uuid) on commit drop;
insert into _pue
select distinct on (ad.id) ad.id, c.puesto_id
  from administradores ad
  join correo c on lower(btrim(c.direccion)) = lower(btrim(ad.email)) and c.puesto_id is not null
 where coalesce(ad.email,'') <> '';
insert into _pue
select distinct on (ad.id) ad.id, pu.id
  from administradores ad
  join _emp m on m.admin_id = ad.administracion_id
  join puesto pu on pu.empresa_id = m.empresa_id
  join persona pe on pe.id = pu.persona_id
 where {N % 'pe.nombre'} = {N % 'ad.nombre'}
   and not exists (select 1 from _pue x where x.admin_viejo = ad.id);

alter table acuerdos_comision     add column if not exists empresa_id uuid references empresa(id);
alter table acuerdos_comision     add column if not exists puesto_id  uuid references puesto(id);
alter table comisiones_proyecto   add column if not exists empresa_id uuid references empresa(id);
alter table comisiones_proyecto   add column if not exists puesto_id  uuid references puesto(id);
alter table administracion_origen add column if not exists empresa_id uuid references empresa(id);
alter table administracion_origen add column if not exists puesto_id  uuid references puesto(id);
alter table migracion_ficha       add column if not exists empresa_id uuid references empresa(id);
alter table interacciones         add column if not exists puesto_id  uuid references puesto(id);
alter table tareas_seguimiento    add column if not exists puesto_id  uuid references puesto(id);
alter table oportunidades         add column if not exists puesto_id  uuid references puesto(id);
alter table resumenes_ia          add column if not exists puesto_id  uuid references puesto(id);
alter table beneficiarios_reparto_caes add column if not exists puesto_id uuid references puesto(id);

update acuerdos_comision t   set empresa_id = m.empresa_id from _emp m where m.admin_id = t.administracion_id;
update acuerdos_comision t   set puesto_id  = p.puesto_id  from _pue p where p.admin_viejo = t.administrador_id;
update comisiones_proyecto t set empresa_id = m.empresa_id from _emp m where m.admin_id = t.administracion_id;
update comisiones_proyecto t set puesto_id  = p.puesto_id  from _pue p where p.admin_viejo = t.administrador_id;
update administracion_origen t set empresa_id = m.empresa_id from _emp m where m.admin_id = t.administracion_id;
update administracion_origen t set puesto_id  = p.puesto_id from _pue p where p.admin_viejo = t.admin_referente_id;
update migracion_ficha t     set empresa_id = m.empresa_id from _emp m where m.admin_id = t.administracion_id;
update interacciones t       set puesto_id = p.puesto_id from _pue p where p.admin_viejo = t.administrador_id;
update tareas_seguimiento t  set puesto_id = p.puesto_id from _pue p where p.admin_viejo = t.administrador_id;
update oportunidades t       set puesto_id = p.puesto_id from _pue p where p.admin_viejo = t.administrador_id;
update resumenes_ia t        set puesto_id = p.puesto_id from _pue p where p.admin_viejo = t.administrador_id;
update beneficiarios_reparto_caes t set puesto_id = p.puesto_id from _pue p where p.admin_viejo = t.administrador_id;
""")

t.append("""
-- ---------------------------------------------------------------------------
-- 5. COMPROBAR antes de borrar. Si algo no cuadra, la transaccion se cae aqui
--    y produccion se queda exactamente como estaba.
-- ---------------------------------------------------------------------------
do $verificar$
declare
  v_empresas int; v_personas int; v_car int; v_acu_sin int; v_com_sin int;
begin
  select count(*) into v_empresas from empresa;
  select count(*) into v_personas from persona;
  select count(*) into v_car      from comunidad_admin_responsable;
  if v_empresas < 276 or v_personas < 411 or v_car < 591 then
    raise exception 'Faltan datos: empresa=%, persona=%, car=%', v_empresas, v_personas, v_car;
  end if;

  -- ni un solo acuerdo de comision puede quedarse sin empresa a la que apuntar
  select count(*) into v_acu_sin from acuerdos_comision
   where administracion_id is not null and empresa_id is null;
  if v_acu_sin > 0 then
    raise exception 'Se perderia el vinculo de % acuerdos de comision. No se acepta perder ninguno', v_acu_sin;
  end if;

  -- comunidades de FASE 1 que tenian administracion y se quedarian sin ella
  select count(*) into v_com_sin
    from comunidades c
    join migracion_monday m on m.registro_id = c.id and m.tabla_destino = 'comunidades'
   where c.administracion_id is not null
     and not exists (select 1 from comunidad_admin_responsable k
                      where k.comunidad_id = c.id and k.vigente);
  -- Esto NO es perdida: son las 37 del cajon "cliente de contrata" y las
  -- autogestionadas, que en el modelo viejo tenian apuntada una administracion
  -- que no existia. Quedarse sin ella es lo correcto. Se comprueba por si el
  -- numero se dispara, que si seria senal de otra cosa.
  if v_com_sin > 60 then
    raise exception 'Se quedarian % comunidades de fase 1 sin administracion (se esperaban 49)', v_com_sin;
  end if;

  raise notice 'COMPROBACION OK: % empresas, % personas, % vinculos. Acuerdos sin casar: %. Comunidades fase 1 sin admin: %',
    v_empresas, v_personas, v_car, v_acu_sin, v_com_sin;
end
$verificar$;

-- ---------------------------------------------------------------------------
-- 6. CONTRAER: fuera el modelo viejo. Con el se van las 176 filas de basura
--    del 27 de julio, que nunca vinieron de Monday.
-- ---------------------------------------------------------------------------
alter table comunidades           drop column if exists administracion_id, drop column if exists administrador_id;
alter table acuerdos_comision     drop column if exists administracion_id, drop column if exists administrador_id;
alter table comisiones_proyecto   drop column if exists administracion_id, drop column if exists administrador_id;
alter table administracion_origen drop column if exists administracion_id, drop column if exists admin_referente_id;
alter table interacciones              drop column if exists administrador_id;
alter table tareas_seguimiento         drop column if exists administrador_id;
alter table oportunidades              drop column if exists administrador_id;
alter table resumenes_ia               drop column if exists administrador_id;
alter table beneficiarios_reparto_caes drop column if exists administrador_id;
alter table migracion_ficha            drop column if exists administracion_id;

drop table if exists contactos;
drop table if exists administradores cascade;
drop table if exists administraciones_fincas cascade;

commit;

-- =============================================================================
-- Si ha llegado hasta aqui sin error, produccion tiene el modelo nuevo y el
-- viejo ha desaparecido. Para comprobarlo:
--   select count(*) from empresa;                      -- 274
--   select count(*) from persona;                      -- 409
--   select count(*) from puesto;                       -- 410
--   select count(*) from correo;                       -- 444
--   select count(*) from comunidad_admin_responsable;  -- 591
-- =============================================================================
""")

with open(SALIDA, "a", encoding="utf-8") as fh:
    fh.write("\n".join(t))
print(f"fichero completo: {os.path.getsize(SALIDA)//1024} KB")
print(f"  presidentes que se suben  : {len(pc)}")
print(f"  observaciones que se suben: {len(oe)}")
