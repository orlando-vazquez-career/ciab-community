# Revisión del esquema y RLS — fase 2

**Estado:** propuesta sin aprobar. No ejecutar ninguno de estos SQL ni instalarlos como migración.

## Archivos

- `fase-2-ddl-rls.sql`: tablas, restricciones, funciones, permisos, políticas RLS y catálogo inicial propuestos.
- `fase-2-ddl-rls-correcciones.sql`: reemplaza cuatro políticas de categorías/etiquetas de publicaciones pendientes; integrarlas en el borrador principal antes de aprobarlo.
- `bootstrap-primer-superadmin-local.sql`: paso manual único para una cuenta ya registrada, solo desde `psql` conectado al Supabase local como `postgres`; solicita el correo en la terminal, comprueba que no exista otro superadmin y deja auditoría.

## Alcance propuesto

Incluye perfiles, membresía/roles, categorías, publicaciones, comentarios, votos, reportes, auditoría de moderación, puntos, niveles, insignias y bucket `avatars`. No incluye `social_publications` ni la ejecución del tope global diario de puntos; eso queda para la fase social y la fase de gamificación.

La API no recibe permiso directo para cambiar roles, estados de membresía, estados de moderación ni puntos. Esas transiciones pasan por funciones con validación de rol y auditoría. Las claves de Auth no se replican en `profiles`.

## Convenciones y supuestos por revisar

- PK PostgreSQL: `pk_<tabla>`. El índice de respaldo de una PK comparte el namespace de relaciones con las tablas; no se propone nombrar la constraint literalmente igual a la tabla.
- La cuenta nueva queda `pending/member`; solo noticias exigen fuente en este borrador.
- Un solo voto positivo; no se permite retirarlo/cambiarlo aún.
- Los comentarios se publican inmediatamente; la edición/eliminación por su autor queda pendiente.
- Los avatares serían públicos, hasta 5 MiB, JPEG/PNG/WebP; confirmar esos límites.
- Retención/eliminación de cuentas queda pendiente; las FK no borran el historial en cascada.

## Verificación y gate

El SQL no se ha aplicado, parseado ni probado contra PostgreSQL. Docker CLI/Compose están instalados, pero el motor Docker no estaba iniciado en esta máquina; además, el runtime global no coincide con Node fijado por el proyecto y `pnpm` no está en `PATH`. Después de aprobar el esquema, se consolidará una sola migración y se validará en Supabase local/Docker con pruebas de permitir/denegar antes de integrar identidad y membresía.
