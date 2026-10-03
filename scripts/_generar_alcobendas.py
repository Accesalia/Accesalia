# -*- coding: utf-8 -*-
"""Genera la migracion de Alcobendas. De usar y tirar: el resultado es el .sql.

OJO CON LOS BACKSLASH: las rutas NO se escriben a mano en este fichero. Se leen
del CSV del barrido. Ayer se perdieron tres veces porque Python se come "\\1" como
escape octal, y una ruta mal escrita manda al traste la subida del fichero.
"""
import csv
import io
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
RAIZ_REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DROPBOX = r"C:\accesalia Dropbox\D SM\Ascensores y rehabilitaciones"

# Lo que he leido en cada tarjeta, a ojo, el 3-oct-2026.
# carpeta -> (nif, denominacion, figura, nota)
LEIDO = {
 "constitucion65":      ("H80737760", "CDAD PROP CL CONSTITUCION N 65 ALCOBENDAS",
                         "Comunidad de Propietarios", None),
 "jarama24":            ("H79155727", "CDAD PROP CL JARAMA N 24 ALCOBENDAS",
                         "Comunidad de Propietarios", None),
 "franciscadelgado7":   ("H81791089", "CDAD PROP SOTO VEGA",
                         "Comunidad de Propietarios",
                         "La denominacion es un NOMBRE PROPIO, no una direccion: la "
                         "comunidad se llama Soto Vega y su domicilio es Francisca "
                         "Delgado 7. A la direccion se llega por la opp y por los accesos."),
 "kerria30":            ("H79726097", "CDAD PROP CL KERRIA N 28 AL 40 LA MORALEJA ALCOBENDAS",
                         "Comunidad de Propietarios",
                         "La comunidad abarca SIETE portales (28 al 40) y la opp es solo "
                         "del 30: nos llamo un ascensorista por ese portal. Los ocho "
                         "accesos ya existen en la base."),
 "marquesdevaldavia76": ("H78758497", "CDAD PROP CL MARQUES DE VALDAVIA 76 ALCO",
                         "Comunidad de Propietarios",
                         "Le CAMBIARON LA LETRA del CIF: era E78758497 y es H78758497 "
                         "desde el 02-10-2024. Se guardan las dos tarjetas."),
 "miraflores12":        ("H79173191", "CDAD PROP CL MIRAFLORES N 12 ALCOBENDAS",
                         "Comunidad de Propietarios",
                         "NIF PROVISIONAL (1989). La tarjeta avisa de que falta aportar "
                         "documentacion para el definitivo."),
 "plazaconcordia1":     ("H80745524", "CDAD PROP PZ CONCORDIA N 1 ALCOBENDAS",
                         "Comunidad de Propietarios",
                         "TARJETA PROVISIONAL Y CADUCADA: pone 'CADUCA: 10-06-94'. "
                         "Hay que pedir la definitiva."),
 "aveuropa20":          ("B83402883", "CBRE GWS ESPAÑA S.L.",
                         "Propietario Empresa",
                         "NO ES UNA COMUNIDAD y el fichero NO ES UNA TARJETA: es un correo "
                         "de Schindler impreso, donde pasan el CIF de la empresa cliente. "
                         "El titular es una sociedad de facility management."),
}
# La tarjeta vieja de Valdavia, que se guarda como version 1.
VIEJA_VALDAVIA = ("marquesdevaldavia76", "E78758497")

q = lambda s: "'" + s.replace("'", "''") + "'"


def ruta_vieja_valdavia():
    base = os.path.join(DROPBOX, "MADRID", "1APROVINCIA", "ALCOBENDAS",
                        "marquesdevaldavia76", "1.DATOS", "2.DOCUMENTACION")
    for f in os.listdir(base):
        if f.lower() == "cif_viejo.pdf":
            return os.path.relpath(os.path.join(base, f), DROPBOX)
    raise SystemExit("no encuentro cif_viejo.pdf")


filas = {f["carpeta"]: f for f in
         csv.DictReader(io.open(os.path.join(RAIZ_REPO, "tanda_alcobendas.csv"), encoding="utf-8"))}

for carp in LEIDO:
    if carp not in filas:
        raise SystemExit("falta %s en el CSV" % carp)
    if not filas[carp]["comunidad_id"]:
        raise SystemExit("%s no tiene comunidad_id" % carp)

CAB = u"""-- ===========================================================================
-- ALCOBENDAS, SEGUNDA TANDA   (Monica, 3-oct-2026)
--
-- Mismo metodo que Alcorcon, esta vez con el script `scripts/tanda_municipio.py`
-- en vez de a mano. De 35 carpetas, casan 14 con su lista; de esas, 8 tenian
-- tarjeta y se han mirado una a una.
--
-- LO QUE HA TRAIDO ESTE MUNICIPIO Y ALCORCON NO TENIA:
--
--   * UN NOMBRE PROPIO. Francisca Delgado 7 se llama "CDAD PROP SOTO VEGA". La
--     denominacion oficial no tiene por que contener la direccion. Decision suya:
--     manda la tarjeta, y a la direccion se llega por la opp y por los accesos.
--   * UNA COMUNIDAD QUE ABARCA SIETE PORTALES. Kerria 30 es en realidad
--     "KERRIA N 28 AL 40". Nos llamo un ascensorista por el portal 30 y ni el ni
--     nosotros sabiamos que la comunidad era el bloque entero. Los ocho accesos
--     ya estaban en la base. De aqui sale una oportunidad comercial nueva, que es
--     para lo que existe `oportunidades.oportunidad_origen_id` (hoy vacio en las
--     1.228).
--   * UN CAMBIO DE LETRA documentado. Marques de Valdavia 76 era E78758497 y es
--     H78758497 desde el 02-10-2024, por un requerimiento de la CAM. Estan las
--     DOS tarjetas en la carpeta, `cif_viejo.pdf` y `Cif actual.pdf`, y se guardan
--     las dos: version 1 no vigente y version 2 vigente.
--   * DOS NIF PROVISIONALES, uno de ellos con la tarjeta CADUCADA EN 1994.
--   * UN TITULAR QUE NO ES UNA COMUNIDAD. Av. Europa 20 es de CBRE GWS ESPAÑA
--     S.L., y el fichero no es una tarjeta: es un correo de Schindler impreso.
--     Tercer caso en dos dias (ROSERSE, OSTALAZAR, CBRE) y los tres entran por un
--     ascensorista. Cuando el encargo viene por ahi, el cliente es una empresa.
--
-- FIGURA. Se rellena con lo que dice la tarjeta y solo donde la hemos leido: si
-- pone "CDAD PROP", Comunidad de Propietarios; si es una sociedad, Propietario
-- Empresa. Donde no hay tarjeta, se queda vacia. No se deduce de nada.
-- ===========================================================================

begin;

-- 1 ------------------------------------------ una figura mas: Organismo
-- "incluiria en figura un termino mas: organismo, por lo del castillo de Avila",
-- cuyo propietario era el ayuntamiento. No existe tabla de organismos todavia y
-- NO se crea hoy: los organismos volveran a aparecer, y con mas fuerza, por el
-- lado de licencias -ayuntamiento, junta de distrito, ECU, COAM-, y conviene
-- modelarlos conociendo los dos usos y no solo este.
alter table comunidades drop constraint if exists comunidades_figura_check;
alter table comunidades add constraint comunidades_figura_check check (
  figura is null or figura in (
    'Comunidad de Propietarios',
    'Mancomunidad',
    'Entidad Urbanística',
    'Propietario Particular',
    'Propietario Empresa',
    'Subcomunidad',
    'Comunidad sin título constitutivo',
    'Organismo'
  )
);

-- 2 --------------------------------------------- lo que dice cada tarjeta
create temporary table _leido (
  comunidad_id uuid,
  carpeta      text,
  nif          text,
  denominacion text,
  figura       text,
  ruta_dropbox text,
  nota         text
) on commit drop;

insert into _leido values
"""

PIE = u"""
-- FRENO. Si algun CIF que YA esta en la base no coincide con el de la tarjeta,
-- aborta. En Alcobendas no pasa: los que ya estaban coinciden los cinco.
do $$
declare chocan int;
begin
  select count(*) into chocan
  from _leido l join comunidades c on c.id = l.comunidad_id
  where c.cif_comunidad is not null and c.cif_comunidad <> l.nif;
  if chocan > 0 then
    raise exception 'Hay % CIF en la base que NO coinciden con la tarjeta. Nada escrito.', chocan;
  end if;
end $$;

-- 3 ------------------------------- nombre oficial, CIF y figura
update comunidades c
set nombre         = l.denominacion,
    cif_comunidad  = coalesce(c.cif_comunidad, l.nif),
    figura         = l.figura,
    actualizado_en = now()
from _leido l
where c.id = l.comunidad_id;

-- 4 -------------------------------------------- las tarjetas, como documento
insert into documentos (comunidad_id, tipo_documento_id, naturaleza, backend,
                        origen_ruta_dropbox, estado_firma, vigente, grupo_id,
                        n_version, justificacion)
select l.comunidad_id,
       (select id from tipos_documento where nombre = 'tarjeta_cif'),
       'migrado', 'dropbox', l.ruta_dropbox, 'no_aplica', true, gen_random_uuid(), 1,
       l.nota
from _leido l;

-- 5 ------------------------------- la tarjeta VIEJA de Marques de Valdavia
-- El mecanismo de versiones, estrenado: mismo grupo_id que la vigente,
-- n_version = 0 porque es ANTERIOR, y vigente = false. No se borra: es la prueba
-- de que esa comunidad tuvo el CIF con letra E.
insert into documentos (comunidad_id, tipo_documento_id, naturaleza, backend,
                        origen_ruta_dropbox, estado_firma, vigente, grupo_id,
                        n_version, justificacion)
select d.comunidad_id,
       d.tipo_documento_id,
       'migrado', 'dropbox', @@RUTA_VIEJA@@, 'no_aplica', false, d.grupo_id, 0,
       'Tarjeta ANTERIOR, con el CIF @@NIF_VIEJO@@ (letra E). Sustituida por la '
       'de 02-10-2024 con letra H. Se conserva porque documenta el cambio.'
from documentos d
join _leido l on l.comunidad_id = d.comunidad_id and l.carpeta = 'marquesdevaldavia76'
where d.n_version = 1;

-- 6 ---------------------------------------- lo que caduca y lo provisional
-- `documentos` ya tiene `fecha_caducidad`: no hace falta campo nuevo para decir
-- "el archivo que hay esta caducado". La pantalla deriva de ahi el chivato.
update documentos d
set fecha_caducidad = date '1994-06-10', actualizado_en = now()
from _leido l
where d.comunidad_id = l.comunidad_id and l.carpeta = 'plazaconcordia1'
  and d.n_version = 1;

commit;
"""

PROVISIONAL = u"""
begin;
-- 7 ------------------------- las carpetas de Alcobendas fuera de su lista
insert into comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una
  (comunidad_autonoma, municipio, carpeta, ruta_dropbox, tiene_tarjeta_cif,
   cif_en_la_ficha, nombre_en_la_ficha)
values
"""

# --- cuerpo
vals = []
for carp, (nif, den, figura, nota) in sorted(LEIDO.items()):
    f = filas[carp]
    vals.append(u"(%s, %s, %s, %s, %s, %s, %s)" % (
        q(f["comunidad_id"]), q(carp), q(nif), q(den), q(figura), q(f["ruta"]),
        q(nota) if nota else "null"))

fuera = []
for carp, f in sorted(filas.items()):
    if f["estado"] != "sin pareja":
        continue
    fuera.append(u"('COMUNIDAD DE MADRID', 'ALCOBENDAS', %s, %s, %s, null, null)" % (
        q(carp), q(os.path.join("MADRID", "1APROVINCIA", "ALCOBENDAS", carp)),
        "true" if f["ruta"] else "false"))

sql = (CAB + u",\n".join(vals) + u";\n"
       + PIE.replace("@@RUTA_VIEJA@@", q(ruta_vieja_valdavia())).replace("@@NIF_VIEJO@@", VIEJA_VALDAVIA[1])
       + PROVISIONAL + u",\n".join(fuera)
       + u"\non conflict (municipio, carpeta) do nothing;\n\ncommit;\n")

destino = os.path.join(RAIZ_REPO, "supabase", "migrations",
                       "20261003100000_alcobendas_cif_y_tarjetas.sql")
io.open(destino, "w", encoding="utf-8").write(sql)
print("escrita:", destino)
print("tarjetas:", len(vals), "| fuera de lista:", len(fuera))
print("caracteres de control raros:", sum(1 for c in sql if ord(c) < 32 and c not in "\n\r\t"))
