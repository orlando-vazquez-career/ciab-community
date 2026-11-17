# Estado actual de CIAB Community

**Última actualización:** 2026-11-17 · **Rama de trabajo:** `feat/database-security` (creada desde `dev`)
**Estado:** fases 0 y 1 implementadas y verificadas; el usuario autorizó desarrollo local de fases 2–7, con DB desechable y sin conexión remota/producción. El DDL/RLS autorizado está versionado como migración local. La validación por migration runner queda pendiente porque Docker Desktop publicó los puertos en todas las interfaces; no hay stack local activo.

## Alcance aprobado

- Fases 0 y 1: documentos base, instrucciones de agentes, registro de estado y esqueleto web informativo.
- Fases 2–7 autorizadas para desarrollo local con Supabase desechable. El bootstrap se implementará como operación local de un solo uso para una cuenta existente, pero no se ejecutará sin autorización específica posterior. No se creó ningún superadmin.
- Supabase Auth y la migración aún no están integrados en la aplicación. El contenido de la migración coincide con el DDL/RLS que se validó en un Supabase self-hosted local y desechable con schemas Auth/Storage reales; no se probó el flujo HTTP de Storage, el migration runner de CLI ni la integración web. No hay conexión remota ni despliegue.
- Se publicó `dev` en `origin/dev`; no se modificó `main`, sus reglas ni se desplegó la aplicación.

## Decisiones registradas

- **Frontend:** Next.js App Router 16.4.6, React 19.3.1, TypeScript 6.0.3 y Tailwind CSS 4.3.5.
- **Lint y tipos:** ESLint 9.39.5, `eslint-config-next` 16.4.6 y tipos de Node/React fijados en `package.json`.
- **Runtime y gestor:** Node.js 26.13.1 (`.node-version`) y pnpm 12.21.0 (`packageManager`).
- Vercel: destino previsto del MVP; Railway: worker social futuro de fase 2.
- Lectura pública de publicaciones aprobadas; cuentas nuevas pendientes; solo membresías activas publican/comentan/votan.
- Noticias y debates requieren revisión antes de publicarse. Comentarios aparecen inmediatamente y pueden moderarse después.
- El autor no edita/elimina comentarios en el MVP; moderación puede ocultar, eliminar lógicamente o restaurar con auditoría.
- Un voto positivo único por miembro/publicación; no se puede retirar ni cambiar en el MVP y no genera puntos.
- Fuente obligatoria en noticias, opcional en debates; política de afirmaciones factuales sigue pendiente antes del lanzamiento.
- Superadmin es el rol más alto; no existe autoelevación de privilegios.
- Reglas de puntos, límites, ranking, niveles, insignias, categorías y política de fuentes se mantienen en `02-requisitos-funcionales.md`.

### Compatibilidad del toolchain

Se probaron TypeScript 7.0.2 y ESLint 10.15.0, pero el stack resuelto no los admite: `typescript-eslint` 8.72.2 rechaza TypeScript 7.0 y los plugins ESLint instalados tienen peer ranges que terminan en ESLint 9. Se fijaron TypeScript 6.0.3 y ESLint 9.39.5; `pnpm peers check` queda limpio.

## Implementación

- `src/app/page.tsx`: portada informativa, sin registro ni acciones de producto simuladas.
- `src/app/layout.tsx`: raíz en español y metadata.
- `src/app/globals.css`: estilos responsive; la UI deja explícito que la plataforma aún está en preparación.
- `AGENTS.md`: bloque administrado por Next.js más reglas del proyecto para alcance, stack, pruebas, ramas, commits y documentación.
- **Preparación local:** `supabase/config.toml` y una migración versionada están presentes; Auth, membresías y el resto de funciones aún no están integradas en la aplicación.
- **No implementado aún:** autenticación, membresías, feed real, publicaciones, comentarios persistidos, moderación, votos, puntos y conexión de la aplicación a Supabase. No hay integración remota ni despliegue.

## Verificación

- `pnpm install --frozen-lockfile`: pasó con pnpm 12.21.0; lockfile actualizado y reproducible.
- `pnpm exec supabase config validate`: válido y completo, sin errores ni advertencias.
- `pnpm peers check`: pasó, sin problemas de peer dependencies.
- `pnpm run lint`: pasó con Node 26.13.1.
- `pnpm run typecheck`: pasó con Node 26.13.1.
- `pnpm run build`: pasó con Node 26.13.1; `/` y `/_not-found` prerenderizados estáticamente.
- DDL fase 2: aplicado desde una base vacía al PostgreSQL 17.6 de un stack Supabase self-hosted efímero, en red Docker interna y sin puertos del host publicados para los servicios probados. Se validaron 16/16 tablas públicas con RLS, 27 políticas públicas, 4 políticas de Storage y 80 constraints públicas, todas validadas.
- `tests/database-security/rls-policies.sql`: pasó contra los schemas Auth/Storage reales para usuarios anónimos, pendientes, suspendidos, activos, moderadores y administradores; incluye aislamiento de avatares por carpeta y auditoría de moderación/aprobación. Una prueba RED controlada falló al retirar la política pública de Storage y la matriz volvió a pasar al restaurarla. Fixtures revertidos; no se creó superadmin.
- La validación anterior fue a nivel SQL; no prueba Storage por HTTP ni integra Auth con la aplicación. En el intento posterior del Supabase CLI, los puertos 54321, 54322 y 54324 quedaron publicados en `0.0.0.0` y `::` pese al binding de red configurado. Se detuvo ese proyecto con `--no-backup` y se eliminaron su volumen y red; no se contó el intento como verificación del migration runner. No se conectó un servicio remoto.
- Navegador local: `GET /` respondió 200; tamaños 390 px y 1440 px sin desbordamiento horizontal; enlace al estado comprobado.
- El Node global del entorno es 24.16.0, menor que la versión fijada. En esta tarea se usaron Node 26.13.1 y pnpm 12.21.0 aislados mediante `npm exec`; `pnpm install --frozen-lockfile` pasó sin avisos de engine y no se modificó ninguna herramienta global. Para desarrollo normal, instalar Node 26.13.1.
- Sin conexiones remotas, secretos ni despliegues.

## Pendientes antes de integrar seguridad en Supabase

1. Reaplicar la migración versionada y verificar el historial del migration runner en Supabase desechable, después de asegurar binding solo-local en Docker Desktop.
2. Probar Storage por HTTP e integrar Auth desde la aplicación; la validación previa fue SQL/RLS únicamente.
3. Implementar autenticación y membresías en la aplicación; el DDL no crea esos flujos web.
4. Definir privacidad, retención y solicitudes de eliminación antes del lanzamiento.
5. Definir política editorial de fuentes para afirmaciones factuales en debates antes del lanzamiento.
6. No hay conexión a proyecto Supabase remoto autorizada ni configurada; no desplegar a Vercel ni producción.

## Bitácora

- 2026-11-16 — Se inició la rama local `feat/app-foundation` desde `main` para completar definición y esqueleto.
- 2026-11-16 — Se actualizaron requisitos, modelo lógico, plan de ejecución y README; se añadieron reglas CIAB al `AGENTS.md` administrado por Next.js.
- 2026-11-16 — Se creó el scaffold Next.js/Tailwind y la portada informativa; no se añadió backend ni servicio externo.
- 2026-11-16 — Se fijaron versiones compatibles tras comprobar los peer ranges; instalación, peers, lint, tipos, build y revisión responsive pasaron.
- 2026-11-16 — Commits: `a995941` (esqueleto web), `63b4b88` (documentación fase 0) y `5115c52` (cierre y rama `dev`).
- 2026-11-16 — Se publicó `dev` a `origin/dev`; la verificación inicial de `ls-remote` coincidió con `5115c52`. No se publicaron otras ramas.
- 2026-11-17 — Se autorizaron las fases 2 y 3 para desarrollo local y se creó `feat/database-security` desde `dev`. El bootstrap del primer superadmin quedó pendiente de autorización específica; no se ejecutó.
- 2026-11-17 — Se prepararon borradores SQL de esquema/RLS y bootstrap local en `docs/propuestas/`. Antes de la validación local no se ejecutó SQL sobre Supabase ni se inició el stack Docker.
- 2026-11-17 — Tras autorizarse una base desechable, se integraron las cuatro correcciones de RLS y se validó el candidato en PostgreSQL 18.4 con un harness mínimo Auth/Storage. Pasó la matriz RLS y las verificaciones de catálogo; fixtures revertidos, clúster eliminado, sin superadmin. Supabase real y migración permanecen pendientes.
- 2026-11-17 — Se verificó que el ajuste de binding local en Docker Desktop requiere reinicio; se decidió no reiniciar para preservar `ky360-mysql` sin interrupciones. No se cambió la configuración global ni se inició Supabase local.
- 2026-11-17 — Se validó el candidato en Supabase self-hosted efímero v0.8.4/PostgreSQL 17.6. Se corrigió `PGDATA`, se aplicó el DDL como `supabase_admin` y pasó la matriz RLS ampliada con Storage. La primera ejecución como `postgres` falló por falta de permiso `CREATE` en la base y revirtió la transacción. Se eliminaron los recursos scratch; `ky360-mysql` apareció detenido y no se modificó.
- 2026-11-17 — El usuario autorizó desarrollo local de fases 2–7, el DDL/RLS exacto como migración aplicable únicamente en Supabase local desechable, y la implementación del bootstrap local one-shot para cuenta existente, sin ejecutarlo. Se fijaron reglas iniciales: comentarios sin edición/borrado por autor; voto positivo único no reversible; fuente obligatoria en noticias y opcional en debates. Sin superadmin, conexión remota ni despliegue.
- 2026-11-17 — Se versionó `supabase/migrations/20261117170000_phase2_schema_rls.sql`; su contenido normalizado coincide con el candidato (SHA-256 `37ad1ac031167fd3473b38c9a262ba66796e43af5fa9d1dbd041601312c697c6`). `supabase config validate` pasó. Se intentó iniciar el CLI local y se detuvo al detectar puertos publicados en todas las interfaces; `supabase stop --project-id ciab-community-mvp --no-backup` eliminó solo sus recursos. La red de prueba también se quitó. No se reinició Docker ni se tocaron recursos ajenos; la validación por migration runner queda pendiente hasta tener binding solo-local.
