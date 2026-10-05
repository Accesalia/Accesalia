-- YA APLICADA el 1-oct-2026 por el MCP. Recuperada del registro el 3-oct para
-- que exista en el repositorio. NO volver a ejecutar.
--
-- OJO AL LEERLA HOY: crea `documento_accesos`, que el 3-oct se renombro a
-- `relacion_documento_accesos`.
--
-- EL BUZON DEL POLYCAM, SEGUNDA VUELTA (Monica, 1-oct-2026).
--
-- El comercial escanea y lo manda por correo: si cabe, el fichero; si no cabe,
-- el enlace. Las dos cosas tienen que entrar.

-- 1 · UN DOCUMENTO PUEDE SER SOLO UN ENLACE.
--
-- documentos ya tenia url_fichero, pero el candado de backend no admitia nada
-- que no estuviera guardado por nosotras. Se añade 'enlace'.
--
-- Y queda dicho que un enlace NO equivale al fichero. Criterio de Monica: "si
-- llega fichero se guarda; si no llega, Alex descarga el fichero y lo guarda a
-- mano. El 80% de las veces lo tiene hecho; para el resto, lo hace el". Nada de
-- descarga automatica: de Drive se podria (el buzon es el destinatario), pero de
-- poly.cam es un visor web y no esta garantizado. Un hueco marcado y visible es
-- mejor que una promesa que falla en silencio.
alter table documentos drop constraint if exists documentos_backend_check;
alter table documentos add constraint documentos_backend_check
  check (backend is null or backend in ('dropbox','supabase','r2','enlace'));

comment on column documentos.backend is
$doc$Donde vive el cuerpo del documento.
  supabase / r2 / dropbox -> esta guardado, y storage_ref dice donde
  enlace                  -> SOLO tenemos la URL en url_fichero, el fichero NO.
Un enlace no vale lo mismo que el fichero: poly.cam es un VISOR y para meter el
escaneo en Revit o en Scene hay que descargarlo de alli; y los enlaces de Drive
que genera Gmail cuando el adjunto pasa de 25 MB dan permiso a QUIEN RECIBIO el
correo -el buzon-, no a quien va a trabajar con el. Por eso backend='enlace' es
un estado incompleto a proposito, para que se vea en pantalla.$doc$;

-- 2 · DE QUE ACCESO ES CADA DOCUMENTO.
--
-- Criterio de Monica: "del acceso, porque ademas si hay mas de una escalera se
-- escanea cada una por separado. Si no lo define, de todas: es vincular un id,
-- no duplicar info: entre por donde entre, encontrare el escaneo".
--
-- Por eso es tabla puente y no columna: UN documento puede valer para VARIOS
-- accesos sin copiarse. Misma forma que opp_accesos.
create table if not exists documento_accesos (
  documento_id  uuid not null references documentos(id) on delete cascade,
  acceso_id     uuid not null references accesos(id) on delete cascade,
  creado_en     timestamptz not null default now(),
  de_donde      text,
  primary key (documento_id, acceso_id)
);

comment on table documento_accesos is
$doc$DE QUE PORTALES es cada documento. Un escaneo del Polycam, un IEE, una
pericial: todos son de un portal concreto, no de "la direccion".

Lo pidio Monica asi: el tecnico no quiere "Genil 5", quiere "Genil 5 A". Y cada
escalera se escanea por separado, asi que normalmente hay un escaneo por acceso.

Cuando el asunto del correo NO dice la escalera -llega "GENIL 5" y hay tres-, el
documento se vincula a TODAS las de esa direccion. No se duplica el fichero: se
vinculan ids. "Entre por donde entre, encontrare el escaneo".$doc$;

create index if not exists documento_accesos_acceso_idx on documento_accesos (acceso_id);
