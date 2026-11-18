# Estado actual de CIAB Community

**Última actualización:** 2026-11-18 · **Rama actual:** `feat/identity-membership`, creada desde `dev`; tres commits locales, sin push ni merge a `dev`.
**Estado:** fases 0 y 1 completas; esquema/RLS de fase 2 versionados. Identidad y membresía están implementadas en código en una rama propia, con separación lógica frontend/backend. El código pasa lint, typecheck, build y pruebas locales; Auth, Storage y mutaciones aún no se han probado de extremo a extremo. Supabase está deshabilitado por defecto y la instancia local sigue detenida por el binding público observado en Docker Desktop; no hay conexión remota.

## Alcance aprobado

- Fases 0 y 1: documentos base, instrucciones de agentes, registro de estado y esqueleto web informativo.
- `/acceso` y `/registro` cuentan con formularios y endpoints locales de login/registro; el backend falla cerrado mientras Supabase local no esté habilitado. Los datos no se envían a proyectos remotos.
- El perfil permite editar usuario, nombre visible, biografía y avatar PNG/JPEG/WebP de hasta 5 MiB; la carga valida tipo y firma, usa sesión autenticada y guarda en el bucket público `avatars` bajo la carpeta del titular.
- Fases 2–7 autorizadas para desarrollo local con Supabase desechable. El bootstrap del primer superadmin está preparado como operación manual de un solo uso, pero no se ejecutará sin autorización específica. No se creó ningún superadmin.
- El DDL/RLS se validó en Supabase self-hosted local y desechable con schemas Auth/Storage reales y luego se versionó como migración. No se probó el migration runner de CLI ni la aplicación contra esa base con usuarios Auth reales. No hay conexión remota ni despliegue.
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
- `src/frontend/identity/`: formularios de acceso/registro/perfil (incluida carga de avatar), cierre de sesión, encabezado de miembro y controles de administración de membresías.
- `src/backend/identity/`: validación de entradas, respuestas HTTP sin caché, lectura de identidad y políticas de autorización.
- `src/backend/supabase/` y `src/proxy.ts`: cliente SSR con cookies y renovación de sesión; la configuración solo acepta loopback, clave pública y activación explícita.
- `src/app/api/identity/`: registro, inicio/cierre de sesión; `src/app/auth/callback/`: confirmación de correo.
- `src/app/api/membership/`: edición del propio perfil, carga de avatar y acciones administrativas mediante RPC existentes en la migración; no se usa service role ni se permite autoasignación.
- `src/app/miembro/` y `src/app/admin/membresias/`: consulta de estado, perfil propio y pantalla de gestión con confirmación para suspensión/cambio de rol.
- `src/app/acceso/page.tsx` y `src/app/registro/page.tsx`: formularios conectados a endpoints; el uso exige Supabase local configurado y no implica disponibilidad de una instancia Auth.
- `src/app/layout.tsx`: raíz en español, metadata y enlace para saltar al contenido.
- `src/app/globals.css`: estilos responsive de la portada, acceso/registro, perfil y membresías.
- `AGENTS.md`: bloque administrado por Next.js más reglas del proyecto para alcance, stack, pruebas, ramas, commits y documentación.
- **Configuración local:** `.env.local.example` mantiene el acceso apagado y no incluye claves. Supabase remoto se rechaza incluso si se activa el flag.
- **No implementado:** feed, publicaciones, comentarios persistidos, moderación de contenido, votos, puntos e insignias. No hay integración remota ni despliegue.

## Verificación

- `pnpm install --frozen-lockfile`: pasó con pnpm 12.21.0 y lockfile sin cambios; la CLI de pnpm emitió un aviso de `engines` al detectar Node global 24.16.0.
- `pnpm exec supabase config validate`: válido y completo, sin errores ni advertencias.
- `pnpm peers check`: pasó, sin problemas de peer dependencies.
- En `feat/identity-membership`: `pnpm run lint`, `pnpm run typecheck` y `pnpm run build` pasaron con Node 26.13.1. El build reconoce `/api/membership/avatar` y las rutas de identidad/membresía.
- DDL fase 2: aplicado desde una base vacía al PostgreSQL 17.6 de un stack Supabase self-hosted efímero, en red Docker interna y sin puertos del host publicados para los servicios probados. Se validaron 16/16 tablas públicas con RLS, 27 políticas públicas, 4 políticas de Storage y 80 constraints públicas, todas validadas.
- `tests/database-security/rls-policies.sql`: pasó contra los schemas Auth/Storage reales para usuarios anónimos, pendientes, suspendidos, activos, moderadores y administradores; incluye aislamiento de avatares por carpeta y auditoría de moderación/aprobación. Una prueba RED controlada falló al retirar la política pública de Storage y la matriz volvió a pasar al restaurarla. Fixtures revertidos; no se creó superadmin.
- La validación anterior fue a nivel SQL; no prueba Storage por HTTP ni integra Auth con la aplicación. En el intento posterior del Supabase CLI, los puertos 54321, 54322 y 54324 quedaron publicados en `0.0.0.0` y `::` pese al binding de red configurado. Se detuvo ese proyecto con `--no-backup` y se eliminaron su volumen y red; no se contó el intento como verificación del migration runner. No se conectó un servicio remoto.
- Navegador local: `GET /` respondió 200; tamaños 390 px y 1440 px sin desbordamiento horizontal; enlace al estado comprobado.
- Pruebas locales en `feat/identity-membership`: `test:login-ui` 4/4, `test:identity-api` 4/4, `test:membership-api` 6/6 y `test:identity-unit` 11/11. Cubren validación, origen, denegación segura sin Supabase y firmas/tamaños de avatar; no simulan Auth ni Storage reales.
- Interfaces de acceso/registro revisadas a 390 px y 1440 px, sin desbordamiento horizontal. No se inició ni usó una base de datos para estas interfaces.
- El editor de avatar compila, pero no se pudo revisar visualmente su estado autenticado ni comprobar una subida real porque Supabase local sigue detenido. Un error transitorio de importación en el servidor de desarrollo no volvió a reproducirse: la prueba HTTP de membresía pasó 10 ejecuciones consecutivas y la suite final pasó 6/6.
- El Node global del entorno es 24.16.0, menor que la versión fijada. Los scripts de verificación se ejecutaron con Node 26.13.1 y pnpm 12.21.0 mediante `npm exec`; no se modificó ninguna herramienta global. Para evitar el aviso de `engines` al instalar, usar Node 26.13.1 directamente.
- Sin conexiones remotas, secretos ni despliegues.

## Pendientes de verificación e integración local

1. Asegurar binding solo-local en Docker Desktop antes de iniciar Supabase desechable; reaplicar la migración y verificar el historial del migration runner.
2. Probar Auth, Mailpit, Storage por HTTP, edición de perfil, subida/borrado de avatar, aprobaciones y roles con cuentas locales desechables y validar políticas/RPC. No ejecutar el bootstrap superadmin sin autorización específica.
3. Revisar el editor autenticado a 390 px y 1440 px cuando la instancia local segura esté disponible.
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
- 2026-11-17 — Se creó `feat/login-ui` desde `dev`; se añadió el enlace de acceso y `/acceso` informativa, con controles deshabilitados. No se implementó autenticación ni se usó base de datos.
- 2026-11-17 — Se añadió `/registro` como guía del proceso de membresía pendiente, sin formulario ni captura de datos; `/acceso` enlaza a esa explicación. Cuatro pruebas, lint, typecheck, build y revisión responsive pasaron.
- 2026-11-17 — Se autorizaron las fases 2–7 para desarrollo local y se creó `feat/database-security` desde `dev`. El bootstrap del primer superadmin quedó pendiente de autorización específica; no se ejecutó.
- 2026-11-17 — Se prepararon borradores SQL de esquema/RLS y bootstrap local; se integraron las correcciones de RLS y se validó el candidato primero en PostgreSQL 18.4 y luego en Supabase self-hosted v0.8.4/PostgreSQL 17.6 con Auth/Storage reales. Las matrices pasaron; fixtures y recursos temporales se eliminaron, sin crear superadmin.
- 2026-11-17 — Se decidió no reiniciar Docker Desktop para preservar `ky360-mysql` sin interrupciones. El intento posterior con Supabase CLI publicó puertos en todas las interfaces; el proyecto y su red temporal se detuvieron/eliminaron, sin tocar recursos ajenos. La validación por migration runner queda pendiente hasta tener binding solo-local.
- 2026-11-17 — El usuario autorizó la migración local desechable y el bootstrap one-shot para cuenta existente, sin ejecutarlo. Se fijaron reglas iniciales: comentarios sin edición/borrado por autor; voto positivo único no reversible; fuente obligatoria en noticias y opcional en debates. Sin superadmin, conexión remota ni despliegue.
- 2026-11-17 — Se versionó `supabase/migrations/20261117170000_phase2_schema_rls.sql`; su contenido normalizado coincide con el candidato (SHA-256 `37ad1ac031167fd3473b38c9a262ba66796e43af5fa9d1dbd041601312c697c6`). `supabase config validate` pasó.
- 2026-11-18 — Se integraron localmente `feat/login-ui` y `feat/database-security` en `dev`. Pruebas de login UI (4/4), lint, typecheck, build y validación de configuración Supabase pasaron; `origin/dev` no se actualizó.
- 2026-11-18 — Se implementó registro/login/logout, callback, perfil y administración en `feat/identity-membership`; se añadió carga autenticada de avatar con validación PNG/JPEG/WebP y límite de 5 MiB. Las suites HTTP (4/4, 4/4, 6/6), unitarias (11/11), lint, typecheck y build pasaron. Commits locales por UI/backend/pruebas: `aa8e585`, `6964323`, `0da2842`. Auth/Storage reales siguen pendientes; no se inició Supabase, no se creó superadmin y no se publicó la rama.
