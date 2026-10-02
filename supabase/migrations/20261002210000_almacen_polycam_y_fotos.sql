-- EL ALMACEN DE LOS ESCANEADOS Y LAS FOTOS
--
-- Nombre de Monica: `almacen-polycam-y-fotos`. Con guiones porque es la forma que
-- usan los seis que ya hay -documentos-comerciales, catalogo-venta- y porque el
-- guion bajo no esta garantizado en los nombres de almacen de Supabase.
--
-- SIN APLICAR: la ejecuta ella.
--
-- ============================================================================
-- POR QUE UNO PROPIO Y NO `documentos-comerciales`
-- ============================================================================
--
-- Tres razones, por orden de peso:
--
-- 1. EL PERMISO VA POR ALMACEN. El almacen es la unidad de permiso de los
--    ficheros, igual que en el modelo de Monica la seccion es la unidad de
--    permiso de una pantalla. Si manaña hay que dejar que alguien abra escaneos
--    pero no las hojas de encargo firmadas, con almacenes separados es una linea;
--    mezclados no se puede sin inventar reglas por carpeta.
--
-- 2. SE PUEDE VER Y LIMPIAR. Un .glb son cientos de megas y un PDF cientos de
--    kilos. Mezclados, para saber cuanto pesan los escaneos hay que filtrar por
--    ruta. Y lo que cuesta dinero en Supabase es el espacio.
--
-- 3. SEPARARLO DESPUES ES CARO. Mover ficheros Y reescribir todas las rutas de la
--    tabla. Hacerlo ahora, con cero ficheros dentro, es gratis.
--
-- ============================================================================
-- Y POR QUE SE LLAMA "Y FOTOS"
-- ============================================================================
--
-- Porque el escaneado no viene solo. Monica, 2-oct-2026, despues de hablar con el
-- chico que los hace:
--
--   "ademas envia siempre un paquete de FOTOS, muchas, como 30 por direccion. Lo
--    hace con OTRO movil y otra direccion de correo, y lo envia por WeTransfer...
--    lo vemos en otro sprint, pero es algo a tener en cuenta. glb + fotos llenaran
--    el almacen."
--
-- Y el peso esta ahi, no en el escaneo: 30 fotos de movil son unos 120 MB por
-- direccion, mas que el .glb. El almacen se llama asi porque va a guardar las dos
-- cosas, aunque hoy solo entre una.
--
-- DOS COSAS DEL SPRINT DE LAS FOTOS QUE CONVIENE NO OLVIDAR:
--
--   · LOS ENLACES DE WETRANSFER CADUCAN (siete dias en la version gratuita). Si
--     llega uno y nadie baja el paquete, las fotos se pierden y no hay vuelta. Asi
--     que ahi el buzon tendra que BAJARLO EN CUANTO ENTRE, al contrario que con
--     Polycam, donde guardar el enlace si sirve.
--   · Es otro remitente y otro movil, que vuelve a confirmar que filtrar por
--     remitente no se sostiene.

-- ---------------------------------------------------------------------------
-- El almacen
-- ---------------------------------------------------------------------------
--
-- PRIVADO. Alex abre el escaneo desde la app con un enlace firmado; no hace falta
-- que el fichero sea alcanzable por cualquiera con la URL.
--
-- SIN TOPE DE TAMAÑO (`file_size_limit` nulo = el del proyecto). Poner un tope
-- aqui seria rechazar un escaneo grande sin avisar, y un escaneo rechazado es un
-- escaneo perdido: el correo original acaba borrado tarde o temprano.
--
-- SIN LISTA DE TIPOS PERMITIDOS. Mismo motivo, y ademas no sabemos todos los que
-- van a llegar: hoy .glb, manaña el paquete de fotos, y Polycam exporta en nueve
-- formatos distintos.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('almacen-polycam-y-fotos', 'almacen-polycam-y-fotos', false, null, null)
on conflict (id) do nothing;

-- Lo que debe salir: los siete almacenes, con el nuevo entre ellos.

select name as almacen,
       case when public then 'publico' else 'privado' end as acceso,
       created_at::date as creado,
       (select count(*) from storage.objects o where o.bucket_id = b.id) as ficheros
  from storage.buckets b
 order by created_at;
