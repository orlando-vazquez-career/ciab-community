# Estado actual de CIAB Community

**Última actualización:** 2026-11-16 · **Rama de trabajo:** `dev` (`origin/dev` sincronizada; conserva `feat/app-foundation` local)
**Estado:** fases 0 y 1 implementadas, verificadas y publicadas. La siguiente funcionalidad partirá de `dev`.

## Alcance aprobado

- Fases 0 y 1: documentos base, instrucciones de agentes, registro de estado y esqueleto web informativo.
- No incluye autenticación, API funcional, Supabase, SQL/migraciones, Railway, proyecto Vercel, claves ni despliegue.
- Se publicó `dev` en `origin/dev`; no se modificó `main`, sus reglas ni se desplegó la aplicación.

## Decisiones registradas

- **Frontend:** Next.js App Router 16.4.6, React 19.3.1, TypeScript 6.0.3 y Tailwind CSS 4.3.5.
- **Lint y tipos:** ESLint 9.39.5, `eslint-config-next` 16.4.6 y tipos de Node/React fijados en `package.json`.
- **Runtime y gestor:** Node.js 26.13.1 (`.node-version`) y pnpm 12.21.0 (`packageManager`).
- Vercel: destino previsto del MVP; Railway: worker social futuro de fase 2.
- Lectura pública de publicaciones aprobadas; cuentas nuevas pendientes; solo membresías activas publican/comentan/votan.
- Noticias y debates requieren revisión antes de publicarse. Comentarios aparecen inmediatamente y pueden moderarse después.
- Superadmin es el rol más alto; no existe autoelevación de privilegios.
- Reglas de puntos, límites, ranking, niveles, insignias, categorías y política de fuentes se mantienen en `02-requisitos-funcionales.md`.

### Compatibilidad del toolchain

Se probaron TypeScript 7.0.2 y ESLint 10.15.0, pero el stack resuelto no los admite: `typescript-eslint` 8.72.2 rechaza TypeScript 7.0 y los plugins ESLint instalados tienen peer ranges que terminan en ESLint 9. Se fijaron TypeScript 6.0.3 y ESLint 9.39.5; `pnpm peers check` queda limpio.

## Implementación

- `src/app/page.tsx`: portada informativa, sin registro ni acciones de producto simuladas.
- `src/app/layout.tsx`: raíz en español y metadata.
- `src/app/globals.css`: estilos responsive; la UI deja explícito que la plataforma aún está en preparación.
- `AGENTS.md`: bloque administrado por Next.js más reglas del proyecto para alcance, stack, pruebas, ramas, commits y documentación.
- **No implementado:** autenticación, membresías, feed real, publicaciones, comentarios persistidos, moderación, votos, puntos, Supabase, RLS, Vercel ni Railway.

## Verificación

- `pnpm install --frozen-lockfile`: pasó con pnpm 12.21.0; lockfile actualizado y reproducible.
- `pnpm peers check`: pasó, sin problemas de peer dependencies.
- `pnpm run lint`: pasó con Node 26.13.1.
- `pnpm run typecheck`: pasó con Node 26.13.1.
- `pnpm run build`: pasó con Node 26.13.1; `/` y `/_not-found` prerenderizados estáticamente.
- Navegador local: `GET /` respondió 200; tamaños 390 px y 1440 px sin desbordamiento horizontal; enlace al estado comprobado.
- El Node global del entorno es 24.16.0. La instalación frozen terminó correctamente, pero emitió aviso de `engines`; lint, tipos, build y servidor se ejecutaron con Node 26.13.1 aislado mediante npm, sin cambiar la instalación global. Para desarrollo normal, instalar Node 26.13.1.
- Sin conexiones remotas, secretos ni despliegues.

## Pendientes antes de fase 2

1. Procedimiento y custodio del primer superadmin; cantidad/reemplazo de superadmins.
2. Reglas para edición/eliminación por autor y solicitudes de privacidad.
3. Si debates con afirmaciones factuales requieren siempre una fuente.
4. Aprobar modelo de acceso, DDL y RLS antes de migraciones.
5. Confirmar accesos institucionales de Supabase antes de cualquier integración remota.

## Bitácora

- 2026-11-16 — Se inició la rama local `feat/app-foundation` desde `main` para completar definición y esqueleto.
- 2026-11-16 — Se actualizaron requisitos, modelo lógico, plan de ejecución y README; se añadieron reglas CIAB al `AGENTS.md` administrado por Next.js.
- 2026-11-16 — Se creó el scaffold Next.js/Tailwind y la portada informativa; no se añadió backend ni servicio externo.
- 2026-11-16 — Se fijaron versiones compatibles tras comprobar los peer ranges; instalación, peers, lint, tipos, build y revisión responsive pasaron.
- 2026-11-16 — Commits: `a995941` (esqueleto web), `63b4b88` (documentación fase 0) y `5115c52` (cierre y rama `dev`).
- 2026-11-16 — Se publicó `dev` a `origin/dev`; la verificación inicial de `ls-remote` coincidió con `5115c52`. No se publicaron otras ramas.
