# -*- coding: utf-8 -*-
r"""
Hoja de las comunidades que SIGUEN teniendo mas de un administrador despues de
aplicar el tachado.

Eran 56; el tachado resolvio 31 (la administracion vieja quedaba tachada en la
ficha). Las 25 que quedan son discrepancias de verdad: dos fichas de la misma
comunidad que dicen cosas distintas sin que ninguna este tachada.

Una fila por (comunidad, valor), para poder marcar cada uno como actual o
anterior sin tener que reescribir nada.

Uso: python scripts/hoja_25_dos_administradores.py
"""
import sys, io, csv, subprocess
from collections import defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HOJA = r"C:\accesalia-fichas\comunidades_dos_administradores.csv"
DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "--csv", "-c"]

def sql(q):
    r = subprocess.run(DB + [q], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    t = r.stdout.decode("utf-8", "replace")
    if r.returncode:
        print(t); sys.exit(1)
    return list(csv.DictReader(io.StringIO(t)))

filas = sql("""
with v as (select distinct registro_id id from migracion_monday where tabla_destino='comunidades'),
conf as (
  select f.comunidad_id cid
    from migracion_ficha f
    join v on v.id = f.comunidad_id
    join migracion_ficha_campo k on k.ficha_id = f.id and k.seccion='administrador'
         and k.valor <> '' and not k.tachado
   where k.etiqueta in ('NOMBRE','E-MAIL','TELEFONO','PERSONA DE CONTACTO','DIRECCION')
   group by f.comunidad_id, k.etiqueta
  having count(distinct upper(btrim(k.valor))) > 1)
select coalesce(nullif(c.direccion,''), c.nombre) comunidad,
       coalesce(c.municipio,'') localidad,
       f.ficha_ref, f.nombre_fichero, f.carpeta,
       coalesce(to_char(f.modificado_en,'YYYY-MM-DD'),'') fecha,
       k.etiqueta, k.valor, k.tachado
  from migracion_ficha f
  join comunidades c on c.id = f.comunidad_id
  join migracion_ficha_campo k on k.ficha_id = f.id and k.seccion='administrador' and k.valor <> ''
 where f.comunidad_id in (select cid from conf)
   and k.etiqueta in ('NOMBRE','E-MAIL','TELEFONO','PERSONA DE CONTACTO','DIRECCION')
 order by 1, 6 desc, k.orden""")

# una fila por (comunidad, ficha): el bloque entero junto, que es como se lee
por_ficha = defaultdict(dict)
meta = {}
for f in filas:
    k = (f["comunidad"], f["ficha_ref"])
    por_ficha[k][f["etiqueta"]] = f["valor"] + ("   [TACHADO]" if f["tachado"] == "t" else "")
    meta[k] = f

com = defaultdict(list)
for k in por_ficha:
    com[k[0]].append(k)
print(f"comunidades con dos administradores : {len(com)}")
print(f"bloques de administrador a comparar : {len(por_ficha)}")

CAB = ["comunidad", "localidad", "fecha_ficha", "carpeta_ficha", "nombre_fichero",
       "ADMINISTRACION", "persona_contacto", "telefono", "email", "direccion",
       "ESTADO", "nota"]
with open(HOJA, "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(CAB)
    for c in sorted(com):
        for k in sorted(com[c], key=lambda x: meta[x]["fecha"], reverse=True):
            d, m = por_ficha[k], meta[k]
            w.writerow([c, m["localidad"], m["fecha"], m["carpeta"], m["nombre_fichero"],
                        d.get("NOMBRE", ""), d.get("PERSONA DE CONTACTO", ""),
                        d.get("TELEFONO", ""), d.get("E-MAIL", ""), d.get("DIRECCION", ""),
                        "", ""])
print(f"\n  -> {HOJA}  ({sum(len(v) for v in com.values())} filas)")
print("\n  muestra:")
for c in sorted(com)[:4]:
    print(f"   {c[:52]}")
    for k in sorted(com[c], key=lambda x: meta[x]["fecha"], reverse=True):
        d = por_ficha[k]
        print(f"      {meta[k]['fecha']}  {d.get('NOMBRE','(sin nombre)')[:42]:42} "
              f"{d.get('PERSONA DE CONTACTO','')[:26]}")
