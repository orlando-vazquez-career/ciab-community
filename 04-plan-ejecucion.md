# Plan de ejecución — CIAB Community

**Estado:** fases 0 y 1 completadas; fases 2–7 autorizadas para implementación y verificación local con datos desechables. DDL/RLS exacto autorizado como migración local, nunca remota/productiva. No se crea ni ejecuta el primer superadmin. Lanzamiento remoto/producción requiere autorización posterior. `dev` está publicada en `origin/dev`.
**Actualizado:** 2026-11-17

## Objetivo

Entregar un MVP de comunidad tipo blog/foro para la Cámara de Inteligencia Artificial Boliviana: lectura pública, participación de miembros aprobados, publicación de noticias y debates con revisión previa, conversación y gamificación basada en aportes validados.

## Decisiones ya acordadas

- Lectura pública de publicaciones aprobadas.
- Toda cuenta inicia pendiente; publicar, comentar y votar requiere membresía aprobada/activa.
- Existe el rol `superadmin`; los roles privilegiados no se autoasignan.
- Noticias y debates pasan por revisión antes de ser públicos.
- Comentarios se publican sin aprobación previa y pueden ocultarse/eliminarse después.
- Autor sin permisos de editar/eliminar comentarios en el MVP; moderación puede ocultarlos, eliminarlos lógicamente o restaurarlos.
- Voto positivo único por miembro y publicación, no reversible durante el MVP.
- Fuente obligatoria para noticias y opcional para debates; política para afirmaciones factuales queda pendiente antes del lanzamiento.
- Puntos solo por contribuciones validadas; sin puntos por vistas, clics ni votos propios.
- Ranking mensual e histórico, insignias y niveles.
- Redes sociales fuera del MVP; Railway queda para el worker de fase 2.

## Arquitectura objetivo

- **Aplicación:** Next.js App Router 16.4.6, React 19.3.1, TypeScript 6.0.3 y Tailwind CSS 4.3.5.
- **Runtime/paquetes:** Node.js 26.13.1 y pnpm 12.21.0, fijados en el repositorio.
- **Vercel:** hosting principal del sitio; no se crea proyecto ni se despliega en fase 1.
- **Supabase:** Auth, PostgreSQL y Storage; se integra en fase 2 tras aprobar RLS y verificar un binding local seguro.
- **Railway:** solo worker/cron de redes en fase 2, no despliegue alternativo del MVP.

El MVP tiene un único destino de aplicación: Vercel. Railway no forma parte de la verificación de la fase 1. Las versiones exactas y su estado se registran en `docs/estado-aplicacion.md`.

## Fases, entregables y criterios de salida

### Fase 0 — Cerrar decisiones funcionales y documentar

**Trabajo:** registrar reglas aprobadas de membresía, roles, revisión de publicaciones, comentarios, fuentes, categorías, puntos, niveles e insignias; crear instrucciones de agentes y registro vivo.

**Entregable:** README, plan/RF/modelo v1, `AGENTS.md` y `docs/estado-aplicacion.md`.

**Salida:** decisiones base versionadas. La privacidad/retención y la política de fuentes para afirmaciones factuales son gates antes del lanzamiento, no bloquean el desarrollo local de la primera versión.

### Fase 1 — Preparar el proyecto

**Trabajo:** crear la app Next.js/TypeScript/Tailwind, scripts locales de lint/tipos/build, página informativa mínima, versiones fijadas e instrucciones operativas. Sin Auth, datos, secretos ni integraciones.

**Entregable:** app base local con lockfile reproducible.

**Salida verificada:** instalación frozen, lint, typecheck, build y revisión responsive correctos; sin secretos ni conexiones remotas.

### Fase 2 — Base de datos y seguridad

**Trabajo:** versionar el DDL/RLS exacto aprobado en una migración y validarlo únicamente en Supabase local desechable; preparar una operación local de bootstrap de un solo uso para una cuenta existente. No ejecutarla ni crear superadmin. No conectar proyectos remotos.

**Entregable:** migración versionada para desarrollo local, datos sintéticos de prueba y pruebas SQL de autorización. La ejecución solo se permite en un stack desechable que se elimina tras validar.

**Salida:** un visitante puede leer solo lo publicado; miembro pendiente no puede escribir; miembro activo puede enviar contenido a revisión; solo moderadores/admin/superadmin pueden aprobarlo; ningún usuario puede elevar su rol o asignarse puntos. Las pruebas de permitir/denegar pasan.

### Fase 3 — Identidad y membresía

**Trabajo:** registro/inicio de sesión, perfil público, estado `pending/active/suspended`, pantalla de solicitud/estado y panel administrativo para aprobar o suspender miembros.

**Entregable:** ciclo de acceso funcional con roles member/moderator/admin/superadmin; no se crea el primer superadmin automáticamente.

**Salida:** el acceso a acciones protegidas se controla en servidor y BD, no solo ocultando controles en la interfaz.

### Fase 4 — Publicaciones y revisión

**Trabajo:** feed público paginado, orden reciente/popular, filtros por categoría, detalle de noticias/debates, fuentes para noticias, envío a revisión, cola de moderación y aprobación/rechazo.

**Entregable:** ciclo enviar publicación → revisar → publicar; nada pendiente/rechazado es público.

**Salida:** publicación aprobada visible; pendientes, borradores y rechazadas ocultas; cambio sustancial reabre revisión; permisos verificados por RLS y servidor.

### Fase 5 — Comentarios y moderación

**Trabajo:** comentarios inmediatos y respuestas de un nivel, reportes, moderación auditada, ocultar/eliminar/restaurar comentarios y votos positivos únicos no reversibles.

**Entregable:** conversación y ciclo de revisión de reportes conforme a los permisos aprobados.

**Salida:** ninguna cuenta pendiente/suspendida escribe; autores no editan/eliminan comentarios; solo roles de moderación realizan acciones auditadas.

### Fase 6 — Gamificación

**Trabajo:** libro mayor append-only, reglas versionadas, idempotencia, topes de 10 puntos globales y 5 comentarios útiles al día, eventos compensatorios, insignias, niveles y ranking mensual/histórico.

**Entregable:** puntos/reconocimientos auditables asociados a aportes validados.

**Salida:** eventos repetidos no duplican puntos; compensaciones preservan historial; saldos, niveles e insignias coinciden con reglas versionadas.

### Fase 7 — Calidad y lanzamiento local

**Trabajo:** pruebas integrales, RLS por rol, límites antiabuso, validación de URL, accesibilidad, teclado/contraste, responsive 390/1440 px, revisión de dependencias, errores y recuperación local. Preparar instrucciones para clonar y probar el proyecto.

**Entregable:** MVP local clonable y guía de pruebas/correcciones. Preview Vercel, staging institucional, dominio y producción quedan para una autorización separada.

**Salida:** `pnpm lint`, `pnpm typecheck`, `pnpm build`, pruebas unitarias/integrales y recorrido local pasan; sin secretos ni conexiones remotas; la guía limpia/recrea solo recursos desechables del proyecto.

### Fase 8 — Fase 2: difusión social

**Trabajo:** elegir canales, cuentas, reglas editoriales y permisos API; añadir cola/outbox y worker Railway, idempotencia, reintentos y observabilidad.

**Salida:** una publicación aprobada elegible se difunde una vez por canal, registra el resultado y permite reintentar fallos sin duplicar.

## Fuera del MVP

Publicación automática en redes, mensajes privados, notificaciones en tiempo real, moderación automática por IA y app móvil nativa. No se añadirá un segundo proveedor de base de datos ni una cola independiente hasta que exista una necesidad comprobada.

## Dependencias y puntos de aprobación

1. Fases 0 y 1 completadas; fases 2–7 autorizadas para desarrollo/verificación local y desechable.
2. El DDL/RLS exacto está autorizado como migración local; no aplicarlo a Supabase remoto o producción.
3. Preparar bootstrap local one-shot para cuenta existente; no ejecutarlo ni crear superadmin sin autorización específica posterior.
4. Resolver el binding de Supabase local sin reiniciar Docker Desktop mientras `ky360-mysql` esté en uso.
5. Disponibilidad de accesos institucionales y autorización antes de cualquier integración o despliegue remoto.
6. Privacidad/retención y política de fuentes para afirmaciones factuales, antes del lanzamiento.
7. Autorización separada antes de cambios en producción.

No asigno fechas ni esfuerzo calendario todavía: faltan confirmar disponibilidad semanal del equipo, responsables por fase y tiempo de revisión/aprobación.

## Método de ramas y commits

- Una rama por módulo o funcionalidad; `dev` se creó desde el esqueleto verificado y las siguientes funciones partirán de esa rama.
- Commits separados por función/capa: por ejemplo UI, backend, pruebas y documentación no se mezclan si son unidades separables.
- Cada commit explica qué cambió y por qué; documentar verificaciones en el cuerpo del commit.
- Registrar el estado vigente, pruebas y pendientes en `docs/estado-aplicacion.md`.
- Abrir PR de funcionalidades hacia `dev`; publicar hacia `main` mediante PR y revisión requerida. `dev` se publicó con autorización; no se cambiaron reglas remotas ni `main`.

## Referencias técnicas oficiales

- [Next.js — Deploying](https://nextjs.org/docs/app/getting-started/deploying)
- [Next.js — Self-hosting](https://nextjs.org/docs/app/guides/self-hosting)
- [Railway — Deploy a Next.js app](https://docs.railway.com/guides/nextjs)
- [Vercel — Next.js](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [Supabase — Local development workflow and migrations](https://supabase.com/docs/guides/local-development/cli-workflows)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
