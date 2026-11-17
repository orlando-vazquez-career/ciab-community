# Revisión del esquema y RLS — fase 2

**Estado:** DDL validado en PostgreSQL 18.4 desechable y en Supabase self-hosted v0.8.4/PostgreSQL 17.6 efímero con schemas Auth/Storage reales. El usuario autorizó versionar y aplicar este contenido únicamente en Supabase local desechable; se versionó en `supabase/migrations/20261117170000_phase2_schema_rls.sql`. No se autorizó ningún entorno remoto.

## Archivos

- `fase-2-ddl-rls.sql`: candidato con tablas, restricciones, funciones, permisos, políticas RLS y catálogo inicial; integra las cuatro correcciones de categorías/etiquetas.
- `../supabase/migrations/20261117170000_phase2_schema_rls.sql`: migración local versionada; su contenido coincide con el candidato validado, sin cambios semánticos.
- `fase-2-ddl-rls-correcciones.sql`: correcciones originales retenidas para trazabilidad. Ya están integradas; no ejecutar este archivo por separado.
- `bootstrap-primer-superadmin-local.sql`: operación local manual de un solo uso para una cuenta ya registrada, conectada como `postgres` y auditada. Está preparada pero no ejecutada; requiere autorización específica posterior.
- `tests/database-security/postgres-harness.sql`: stubs mínimos de Auth/Storage, solo para un clúster PostgreSQL vacío, local y desechable bajo Hermes scratch.
- `tests/database-security/rls-policies.sql`: matriz sintética de acceso; todo se revierte dentro de una transacción.

## Alcance propuesto

Incluye perfiles, membresía/roles, categorías, publicaciones, comentarios, votos, reportes, auditoría de moderación, puntos, niveles, insignias y bucket `avatars`. No incluye `social_publications` ni la ejecución del tope global diario de puntos; eso queda para la fase social y la fase de gamificación.

La API no recibe permiso directo para cambiar roles, estados de membresía, estados de moderación ni puntos. Esas transiciones pasan por funciones con validación de rol y auditoría. Las claves de Auth no se replican en `profiles`.

## Convenciones y supuestos por revisar

- PK PostgreSQL: `pk_<tabla>`. El pedido de nombrar la constraint igual que la tabla no funciona en PostgreSQL: la PK crea un índice con ese nombre y colisiona con la relación de la tabla. Se comprobó el error en PostgreSQL 18.4. El formato MySQL de referencia no es ejecutable como DDL de Supabase/PostgreSQL; si se cambia de motor, se debe reescribir y validar el esquema.
- La cuenta nueva queda `pending/member`; solo noticias exigen fuente en este borrador.
- Un solo voto positivo; no se permite retirarlo/cambiarlo aún.
- Los comentarios se publican inmediatamente; el autor no puede editarlos ni eliminarlos en el MVP. Moderación puede ocultarlos/eliminarlos con auditoría.
- Los avatares serían públicos, hasta 5 MiB, JPEG/PNG/WebP; confirmar esos límites.
- Retención/eliminación de cuentas queda pendiente; las FK no borran el historial en cascada.

## Verificación y gate

El candidato se aplicó en una base vacía de un stack Supabase self-hosted v0.8.4 con PostgreSQL 17.6. Auth y Storage inicializaron sus schemas reales; la red Docker era interna y los servicios usados no publicaron puertos al host. El stack y su scratch se eliminaron tras las pruebas.

- DDL ejecutado con `psql -X -v ON_ERROR_STOP=1` como `supabase_admin`: 16 tablas públicas, RLS en las 16, 27 políticas públicas, 4 de Storage y 80 constraints públicas validadas.
- La matriz pasó: lectura anónima solo de publicaciones publicadas; membresías pendientes y suspendidas sin escritura; miembro activo con envío y edición de relaciones propias; bloqueo de no propietarios y categorías inactivas; moderador revisa con auditoría; administrador activa categorías y aprueba membresías con auditoría.
- También pasó la prueba transaccional de Storage: lectura pública del bucket `avatars`, inserción/actualización/borrado limitado al directorio propio y rechazo de rutas de otras cuentas. El borrado SQL de prueba usa la marca temporal que exige el trigger real de Storage; la transacción completa termina en `ROLLBACK`.
- No se probó el rol `superadmin` ni se ejecutó el bootstrap. No quedaron fixtures ni miembros privilegiados; el test terminó con `ROLLBACK`.
- El clúster temporal se detuvo y eliminó; se comprobó puerto cerrado y directorio scratch inexistente.
- Pendiente: validar la API HTTP de Storage y la integración con Auth desde la aplicación. La validación SQL no equivale a un flujo end-to-end.

La migración versionada conserva el contenido validado, pero todavía no se verificó el registro del versionado mediante el migration runner de Supabase CLI. En esta máquina, `supabase start` publicó 54321, 54322 y 54324 en `0.0.0.0` y `::`, incluso usando una red Docker con binding `127.0.0.1`; se detuvo únicamente ese proyecto con `--no-backup` y se eliminaron su volumen y red de prueba. No se reinició Docker Desktop ni se tocaron `ky360-mysql` o el contenedor Wipe-It. Antes de iniciar Supabase local en este equipo hay que habilitar un binding solo-local; hasta entonces no ejecutar `supabase start` aquí. El bootstrap sigue sin ejecutarse y no hay conexión remota.
